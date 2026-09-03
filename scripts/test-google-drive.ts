import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { runInNewContext } from 'node:vm'

let failures = 0
function assert(name: string, condition: boolean, extra = '') {
  if (condition) console.log('  ✓', name)
  else { failures++; console.log('  ✗', name, extra) }
}

const storage = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value) },
    removeItem: (key: string) => { storage.delete(key) },
  },
})

const realFetch = globalThis.fetch
let remoteData: unknown = null
let authBody: Record<string, unknown> | null = null
let authenticatedCalls = 0
globalThis.fetch = (async (_input: RequestInfo | URL, init: RequestInit = {}) => {
  if (init.method !== 'POST') return Response.json({ ok: true, service: 'nexus-hq-drive' })
  const body = JSON.parse(String(init.body)) as Record<string, unknown>
  if (body.action === 'register' || body.action === 'login') {
    authBody = body
    return Response.json({ ok: true, token: 'drive-session-token', user: { uid: 'drive-user', email: body.email } })
  }
  if (body.token === 'drive-session-token') authenticatedCalls++
  if (body.action === 'me') return Response.json({ ok: true, user: { uid: 'drive-user', email: 'owner@example.test' } })
  if (body.action === 'save') {
    remoteData = body.data
    return Response.json({ ok: true, updatedAt: '2026-08-27T10:00:00.000Z' })
  }
  if (body.action === 'load') return Response.json({ ok: true, data: remoteData, updatedAt: '2026-08-27T10:00:00.000Z' })
  if (body.action === 'logout') return Response.json({ ok: true })
  return Response.json({ ok: false, code: 'unknown' })
}) as typeof fetch

console.log('GOOGLE DRIVE CLIENT')
const drive = await import('../src/lib/googleDriveCloud')
const validUrl = 'https://script.google.com/macros/s/AKfycb_test-123/exec'
assert('only official /exec Apps Script URLs are accepted', drive.normalizeGoogleScriptUrl(validUrl) === validUrl)
assert('arbitrary hosts are rejected', drive.normalizeGoogleScriptUrl('https://example.com/macros/s/a/exec') === '')
assert('/dev test deployments are rejected', drive.normalizeGoogleScriptUrl('https://script.google.com/macros/s/a/dev') === '')
drive.configure(validUrl)
assert('health check validates NEXUS Drive script', await drive.health(validUrl))
const verifier1 = await drive.deriveCredential('Owner@Example.Test', 'nexus-password')
const verifier2 = await drive.deriveCredential('owner@example.test', 'nexus-password')
assert('same credentials derive the same verifier on both devices', verifier1 === verifier2 && verifier1.length >= 40)
await drive.createAccount('owner@example.test', 'nexus-password')
assert('plain NEXUS password is never sent to Apps Script', authBody?.password === undefined && authBody?.credential === verifier1)
assert('Drive session is stored separately', drive.isReady() && drive.getCurrentUser()?.email === 'owner@example.test')
const appData = { version: 5, modules: [], records: {}, settings: {} } as never
const updatedAt = await drive.push(appData)
assert('full JSON uploads after local save', updatedAt.startsWith('2026-') && authenticatedCalls >= 1)
const pulled = await drive.pull()
assert('manual refresh downloads the same JSON', !!pulled && (pulled.data as { version?: number }).version === 5)
await drive.signOut()
assert('sign out removes only the Drive session', !drive.isReady())
globalThis.fetch = realFetch

console.log('\nAPPS SCRIPT SECURITY CONTRACT')
const script = readFileSync('google-apps-script/Code.gs', 'utf8')
new Function(script)
assert('Apps Script source is valid JavaScript', true)
assert('backup is a real JSON file in Drive', script.includes("NEXUS-HQ-backup.json") && script.includes('DriveApp.createFile'))
assert('script stores verifier hash instead of password', script.includes('CREDENTIAL_HASH') && !script.includes('request.password'))
assert('session tokens are stored only as hashes', script.includes('tokenHash = digest_(token)'))
assert('failed logins are limited', script.includes('MAX_ATTEMPTS = 8'))
assert('script never logs request bodies or secrets', !/Logger\.|console\./.test(script))
assert('Drive download is manual and exposed through load action', script.includes("action === 'load'"))
const electronMain = readFileSync('electron/main.cjs', 'utf8')
const electronPreload = readFileSync('electron/preload.cjs', 'utf8')
assert('Electron bypasses CORS only for official Apps Script URLs', electronMain.includes("target.hostname !== 'script.google.com'") && electronMain.includes("ipcMain.handle('drive:request'"))
assert('Electron preload exposes only the restricted Drive request', electronPreload.includes("driveRequest: (opts) => ipcRenderer.invoke('drive:request'"))

console.log('\nAPPS SCRIPT RUNTIME FLOW')
type GasOutput = { content: string; setMimeType: (type: string) => GasOutput }
const properties = new Map<string, string>()
const files = new Map<string, {
  content: string; updated: Date; trashed: boolean
  setContent: (value: string) => void; setDescription: (_value: string) => void
  getLastUpdated: () => Date; getBlob: () => { getDataAsString: () => string }
  getId: () => string; isTrashed: () => boolean
}>()
let uuidCounter = 0
const makeFile = (content: string) => {
  const id = `file-${++uuidCounter}`
  const file = {
    content, updated: new Date(), trashed: false,
    setContent(value: string) { this.content = value; this.updated = new Date() },
    setDescription(_value: string) {},
    getLastUpdated() { return this.updated },
    getBlob() { return { getDataAsString: () => this.content } },
    getId() { return id },
    isTrashed() { return this.trashed },
  }
  files.set(id, file)
  return file
}
const gasContext: Record<string, unknown> = {
  JSON, Date, Error, Object, Array, String, Number, RegExp,
  MimeType: { PLAIN_TEXT: 'text/plain' },
  ContentService: {
    MimeType: { JSON: 'application/json' },
    createTextOutput(content: string): GasOutput {
      return { content, setMimeType() { return this } }
    },
  },
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (key: string) => properties.get(key) ?? null,
      setProperty: (key: string, value: string) => { properties.set(key, value) },
      deleteProperty: (key: string) => { properties.delete(key) },
      setProperties: (values: Record<string, string>) => { for (const [key, value] of Object.entries(values)) properties.set(key, value) },
    }),
  },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  Utilities: {
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    getUuid: () => `00000000-0000-4000-8000-${String(++uuidCounter).padStart(12, '0')}`,
    computeDigest: (_algorithm: string, value: string) => [...createHash('sha256').update(value).digest()],
    base64EncodeWebSafe: (bytes: number[]) => Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'),
    newBlob: (value: string) => ({ getBytes: () => [...Buffer.from(value)] }),
  },
  DriveApp: {
    createFile: (_name: string, content: string, _mime: string) => makeFile(content),
    getFileById: (id: string) => {
      const file = files.get(id)
      if (!file) throw new Error('missing file')
      return file
    },
  },
}
runInNewContext(script, gasContext)
const doPost = gasContext.doPost as (event: { postData: { contents: string } }) => GasOutput
const post = (body: Record<string, unknown>) => JSON.parse(doPost({ postData: { contents: JSON.stringify(body) } }).content) as Record<string, unknown>
const registered = post({ action: 'register', email: 'owner@example.test', credential: verifier1 })
assert('first NEXUS account registers in Apps Script', registered.ok === true && typeof registered.token === 'string')
assert('second registration is blocked', post({ action: 'register', email: 'owner@example.test', credential: verifier1 }).code === 'email_in_use')
const gasToken = String(registered.token)
assert('Apps Script saves authenticated JSON to Drive', post({ action: 'save', token: gasToken, data: { version: 5, source: 'runtime' } }).ok === true)
const gasLoad = post({ action: 'load', token: gasToken })
assert('Apps Script returns the same JSON on manual load', (gasLoad.data as { source?: string })?.source === 'runtime')
const wrongVerifier = (verifier1.startsWith('A') ? 'B' : 'A') + verifier1.slice(1)
assert('wrong NEXUS password verifier is rejected', post({ action: 'login', email: 'owner@example.test', credential: wrongVerifier }).code === 'wrong_password')
post({ action: 'logout', token: gasToken })
assert('logged-out token cannot read Drive JSON', post({ action: 'load', token: gasToken }).code === 'not_signed_in')

console.log(failures ? `\n❌ GOOGLE DRIVE TEST FAILED — ${failures}` : '\n✅ GOOGLE DRIVE JSON SYNC TESTS PASSED')
process.exit(failures ? 1 : 0)
