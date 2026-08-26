import { readFileSync } from 'node:fs'

let failures = 0
function assert(name: string, condition: boolean, extra = '') {
  if (condition) console.log('  ✓', name)
  else { failures++; console.log('  ✗', name, extra) }
}

console.log('CLIENT URL REWRITE')
const calls: Array<{ url: string; init?: RequestInit }> = []
const xhrCalls: string[] = []
const realFetch = globalThis.fetch
const realXhr = globalThis.XMLHttpRequest
class FakeXMLHttpRequest {
  open(_method: string, url: string | URL) { xhrCalls.push(String(url)) }
}
Object.defineProperty(globalThis, 'XMLHttpRequest', { value: FakeXMLHttpRequest, configurable: true, writable: true })
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  calls.push({ url: typeof input === 'string' || input instanceof URL ? String(input) : input.url, init })
  return new Response(JSON.stringify({ ok: true, project: 'nexus-hq-c42cd' }), {
    status: 200, headers: { 'content-type': 'application/json' },
  })
}) as typeof fetch

const relayClient = await import('../src/lib/firebaseRelay')
relayClient.setFirebaseRelayUrl('https://relay.example.workers.dev/')
relayClient.installFirebaseRelay()
await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=public')
await fetch('https://example.com/unchanged')
new XMLHttpRequest().open('POST', 'https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?database=project')
assert('Firebase Auth URL is routed through the private relay', calls[0]?.url === 'https://relay.example.workers.dev/firebase/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=public', calls[0]?.url)
assert('Firestore XHR/WebChannel URL is also routed', xhrCalls[0] === 'https://relay.example.workers.dev/firebase/firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?database=project', xhrCalls[0])
assert('unrelated network traffic is never proxied', calls[1]?.url === 'https://example.com/unchanged', calls[1]?.url)
assert('invalid/non-HTTPS relay URL is rejected', !relayClient.isValidFirebaseRelayUrl('http://public-proxy.example'))

console.log('\nWORKER ALLOWLIST')
const { handleRequest } = await import('../cloudflare/firebase-relay/worker.js')
const upstreamCalls: Array<{ url: string; init: RequestInit }> = []
const upstream = async (url: string | URL | Request, init?: RequestInit) => {
  upstreamCalls.push({ url: String(url), init: init ?? {} })
  return new Response('{"upstream":true}', {
    status: 200,
    headers: { 'content-type': 'application/json', 'x-http-session-id': 'session-test' },
  })
}

const health = await handleRequest(new Request('https://relay.example/health'), upstream)
const healthBody = await health.json() as { ok?: boolean; project?: string }
assert('health endpoint identifies the expected Firebase project', healthBody.ok === true && healthBody.project === 'nexus-hq-c42cd')

const badHost = await handleRequest(new Request('https://relay.example/firebase/evil.example/steal'), upstream)
assert('arbitrary proxy targets are blocked', badHost.status === 404)

const wrongProject = await handleRequest(new Request('https://relay.example/firebase/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=wrong', { method: 'POST' }), upstream)
assert('Auth calls for another API key are blocked', wrongProject.status === 403)

const auth = await handleRequest(new Request('https://relay.example/firebase/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyByoWZR-6Gna7LerhD2UEMKiP-HbTmLt0Y', {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: 'https://localhost' },
  body: JSON.stringify({ email: 'redacted@example.test', password: 'not-a-real-password' }),
}), upstream)
assert('allowed Auth request is forwarded', auth.status === 200 && upstreamCalls.length === 1)
assert('client Origin/IP headers are not forwarded to Firebase', !(upstreamCalls[0]?.init.headers as Headers)?.has('origin'))

const noToken = await handleRequest(new Request('https://relay.example/firebase/firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?database=projects%2Fnexus-hq-c42cd%2Fdatabases%2F(default)', { method: 'POST' }), upstream)
assert('Firestore request without Firebase ID token is blocked', noToken.status === 401)

const firestore = await handleRequest(new Request('https://relay.example/firebase/firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel?database=projects%2Fnexus-hq-c42cd%2Fdatabases%2F(default)', {
  method: 'POST', headers: { authorization: 'Bearer test-token-that-is-long-enough' }, body: 'webchannel',
}), upstream)
assert('authenticated Firestore WebChannel is forwarded', firestore.status === 200 && upstreamCalls.length === 2)
assert('WebChannel session header survives the relay', firestore.headers.get('x-http-session-id') === 'session-test')
assert('relay responses are never cached', firestore.headers.get('cache-control')?.includes('no-store') === true)

const workerSource = readFileSync('cloudflare/firebase-relay/worker.js', 'utf8')
assert('worker contains no console logging of passwords/tokens/data', !workerSource.includes('console.'))

globalThis.fetch = realFetch
Object.defineProperty(globalThis, 'XMLHttpRequest', { value: realXhr, configurable: true, writable: true })
console.log(failures ? `\n❌ RELAY TEST FAILED — ${failures}` : '\n✅ FIREBASE RELAY SECURITY TESTS PASSED')
process.exit(failures ? 1 : 0)
