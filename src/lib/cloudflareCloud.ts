import type { AppData } from '../store/types'
import { CloudError, type CloudCode, type CloudUser, type RemoteData } from './cloudTypes'

const SESSION_KEY = 'nexus_hq_cloudflare_session'
const MAX_DOCUMENT_BYTES = 900 * 1024
const KNOWN_CODES = new Set<CloudCode>([
  'not_configured', 'not_signed_in', 'bad_email', 'weak_password', 'email_in_use',
  'wrong_password', 'user_not_found', 'too_many_requests', 'network', 'permission',
  'provider_disabled', 'firestore_missing', 'bad_firebase_config', 'too_large', 'unknown',
])

type Session = { apiUrl: string; token: string; user: CloudUser }
type ApiError = { ok?: false; code?: string; error?: string; detail?: string }
type AuthResponse = { ok: true; token: string; user: { uid: string; email: string } }

let apiUrl = ''
let session: Session | null = readSession()
let initializedFor = ''
const listeners = new Set<(user: CloudUser | null) => void>()

export function normalizeCloudflareUrl(value: string): string {
  const raw = String(value ?? '').trim().replace(/\/+$/, '')
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'
    if (parsed.protocol !== 'https:' && !(local && parsed.protocol === 'http:')) return ''
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function readSession(): Session | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Partial<Session> | null
    if (!value?.apiUrl || !value.token || !value.user?.uid) return null
    return { apiUrl: normalizeCloudflareUrl(value.apiUrl), token: value.token, user: value.user as CloudUser }
  } catch { return null }
}

function saveSession(next: Session | null) {
  session = next
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    else localStorage.removeItem(SESSION_KEY)
  } catch { /* نشست حافظه‌ای تا زمان بستن برنامه همچنان کار می‌کند */ }
  emit()
}

function emit() {
  const user = getCurrentUser()
  for (const listener of listeners) listener(user)
}

export function configure(url: string): string {
  const normalized = normalizeCloudflareUrl(url)
  if (apiUrl === normalized) return apiUrl
  apiUrl = normalized
  initializedFor = ''
  // token هر Worker فقط به همان Worker تعلق دارد؛ هرگز به URL دیگری ارسال نمی‌شود.
  if (session && session.apiUrl !== apiUrl) {
    session = null
    try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  }
  emit()
  return apiUrl
}

export function getApiUrl(): string { return apiUrl }
export function isConfigured(): boolean { return !!apiUrl }
export function getCurrentUser(): CloudUser | null {
  return session && session.apiUrl === apiUrl ? session.user : null
}
export function isReady(): boolean { return !!(apiUrl && session?.apiUrl === apiUrl && session.token) }

export function watchUser(callback: (user: CloudUser | null) => void): () => void {
  listeners.add(callback)
  callback(getCurrentUser())
  return () => { listeners.delete(callback) }
}

function mapApiCode(value: unknown, status: number): CloudCode {
  const code = String(value ?? '') as CloudCode
  if (KNOWN_CODES.has(code)) return code
  if (status === 401) return 'not_signed_in'
  if (status === 403) return 'permission'
  if (status === 413) return 'too_large'
  if (status === 429) return 'too_many_requests'
  if (status >= 500) return 'network'
  return 'unknown'
}

async function request<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
  if (!apiUrl) throw new CloudError('not_configured', 'cloudflare_url_missing')
  if (authenticated && !isReady()) throw new CloudError('not_signed_in')
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (authenticated && session) headers.set('Authorization', `Bearer ${session.token}`)

  try {
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers,
      cache: 'no-store',
      signal: init.signal ?? AbortSignal.timeout(20_000),
    })
    const text = await response.text()
    const body = (text ? JSON.parse(text) : {}) as T & ApiError
    if (!response.ok) {
      const code = mapApiCode(body.code ?? body.error, response.status)
      if (authenticated && response.status === 401) saveSession(null)
      throw new CloudError(code, String(body.code ?? body.error ?? `http_${response.status}`))
    }
    return body
  } catch (error) {
    if (error instanceof CloudError) throw error
    throw new CloudError('network', String((error as Error)?.message ?? 'network').slice(0, 120))
  }
}

export async function init(): Promise<void> {
  if (!apiUrl || initializedFor === apiUrl) return
  initializedFor = apiUrl
  if (!session || session.apiUrl !== apiUrl) { emit(); return }
  // آفلاین بودن نباید نشست یا داده محلی را حذف کند. فقط پاسخ صریح 401 نشست را پاک می‌کند.
  try {
    const result = await request<{ ok: true; user: { uid: string; email: string } }>('/me', {}, true)
    saveSession({ apiUrl, token: session.token, user: toCloudUser(result.user) })
  } catch (error) {
    if (error instanceof CloudError && error.code !== 'not_signed_in') emit()
  }
}

function toCloudUser(user: { uid: string; email: string }): CloudUser {
  return { uid: user.uid, email: user.email, displayName: null, photoURL: null }
}

async function authenticate(path: '/auth/login' | '/auth/register', email: string, password: string): Promise<void> {
  const result = await request<AuthResponse>(path, {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  })
  saveSession({ apiUrl, token: result.token, user: toCloudUser(result.user) })
}

export function signIn(email: string, password: string): Promise<void> {
  return authenticate('/auth/login', email, password)
}
export function createAccount(email: string, password: string): Promise<void> {
  return authenticate('/auth/register', email, password)
}
export async function signOut(): Promise<void> {
  try { if (isReady()) await request('/auth/logout', { method: 'POST' }, true) } catch { /* خروج محلی حتماً انجام می‌شود */ }
  saveSession(null)
}

export async function push(data: AppData): Promise<string> {
  const payload = JSON.stringify(data)
  if (new Blob([payload]).size > MAX_DOCUMENT_BYTES) throw new CloudError('too_large')
  const result = await request<{ ok: true; updatedAt: string }>('/data', {
    method: 'PUT',
    body: JSON.stringify({ version: data.version, data }),
  }, true)
  return result.updatedAt
}

export async function pull(): Promise<RemoteData> {
  const result = await request<{ ok: true; data: unknown | null; updatedAt: string }>('/data', {}, true)
  return result.data == null ? null : { data: result.data, updatedAt: result.updatedAt }
}

export async function health(value: string): Promise<boolean> {
  const normalized = normalizeCloudflareUrl(value)
  if (!normalized) return false
  try {
    const response = await fetch(`${normalized}/health`, { cache: 'no-store', signal: AbortSignal.timeout(12_000) })
    const body = await response.json() as { ok?: boolean; service?: string }
    return response.ok && body.ok === true && body.service === 'nexus-hq-cloud'
  } catch { return false }
}
