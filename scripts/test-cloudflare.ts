import { readFileSync } from 'node:fs'
import { hashPassword, verifyPassword, randomToken, sha256, PASSWORD_ITERATIONS } from '../cloudflare/nexus-cloud/crypto.js'

let failures = 0
function assert(name: string, condition: boolean, extra = '') {
  if (condition) console.log('  ✓', name)
  else { failures++; console.log('  ✗', name, extra) }
}

console.log('CLOUDFLARE AUTH CRYPTO')
const secured = await hashPassword('correct horse battery staple')
assert('password uses PBKDF2 with 210,000 iterations', secured.iterations === PASSWORD_ITERATIONS && PASSWORD_ITERATIONS === 210_000)
assert('correct password verifies', await verifyPassword('correct horse battery staple', secured))
assert('wrong password is rejected', !(await verifyPassword('wrong password', secured)))
const tokenA = randomToken(), tokenB = randomToken()
assert('session tokens are random and URL-safe', tokenA.length >= 40 && tokenA !== tokenB && /^[\w-]+$/.test(tokenA))
assert('only a one-way token hash needs storage', (await sha256(tokenA)) !== tokenA)

console.log('\nCLOUDFLARE CLIENT')
const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value) },
    removeItem: (key: string) => { memory.delete(key) },
  },
})
const realFetch = globalThis.fetch
let storedData: unknown = null
let sawAuthorization = false
globalThis.fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url)
  const method = init.method ?? 'GET'
  const headers = new Headers(init.headers)
  if (headers.get('Authorization') === 'Bearer test-session-token') sawAuthorization = true
  if (url.pathname === '/health') return Response.json({ ok: true, service: 'nexus-hq-cloud' })
  if (url.pathname === '/auth/register' && method === 'POST') {
    return Response.json({ ok: true, token: 'test-session-token', user: { uid: 'u1', email: 'owner@example.test' } })
  }
  if (url.pathname === '/me' && sawAuthorization) return Response.json({ ok: true, user: { uid: 'u1', email: 'owner@example.test' } })
  if (url.pathname === '/data' && method === 'PUT' && sawAuthorization) {
    storedData = (JSON.parse(String(init.body)) as { data: unknown }).data
    return Response.json({ ok: true, updatedAt: '2026-08-27T00:00:00.000Z' })
  }
  if (url.pathname === '/data' && method === 'GET' && sawAuthorization) {
    return Response.json({ ok: true, data: storedData, updatedAt: '2026-08-27T00:00:00.000Z' })
  }
  if (url.pathname === '/auth/logout') return Response.json({ ok: true })
  return Response.json({ ok: false, code: 'not_found' }, { status: 404 })
}) as typeof fetch

const client = await import('../src/lib/cloudflareCloud')
assert('only HTTPS endpoint is accepted', client.normalizeCloudflareUrl('http://example.com') === '')
client.configure('https://nexus.example.workers.dev/')
assert('health check recognizes only NEXUS Cloud', await client.health('https://nexus.example.workers.dev'))
await client.createAccount('owner@example.test', 'password123')
assert('new Cloudflare account creates a local session', client.isReady() && client.getCurrentUser()?.email === 'owner@example.test')
const updatedAt = await client.push({ version: 5, modules: [], records: {}, settings: {} } as never)
assert('local document uploads with authenticated request', sawAuthorization && updatedAt.startsWith('2026-'))
const remote = await client.pull()
assert('same document downloads from Cloudflare', !!remote && (remote.data as { version?: number }).version === 5)
await client.signOut()
assert('sign out removes only Cloudflare session', !client.isReady() && client.getCurrentUser() === null)
globalThis.fetch = realFetch

console.log('\nWORKER SECURITY CONTRACT')
const worker = readFileSync('cloudflare/nexus-cloud/worker.js', 'utf8')
const config = readFileSync('cloudflare/nexus-cloud/wrangler.jsonc', 'utf8')
assert('Durable Object SQLite migration is configured', config.includes('new_sqlite_classes') && config.includes('NexusCloud'))
assert('accounts, sessions and app data use separate tables', ['users', 'sessions', 'app_data', 'auth_attempts'].every(table => worker.includes(`TABLE IF NOT EXISTS ${table}`)))
assert('login attempts are rate-limited', worker.includes('MAX_ATTEMPTS = 8') && worker.includes('too_many_requests'))
assert('user data is selected by authenticated user id', worker.includes('WHERE user_id = ?'))
assert('worker never logs passwords, tokens or app data', !worker.includes('console.'))

console.log(failures ? `\n❌ CLOUDFLARE TEST FAILED — ${failures}` : '\n✅ CLOUDFLARE BACKEND & CLIENT TESTS PASSED')
process.exit(failures ? 1 : 0)
