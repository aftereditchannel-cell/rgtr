import type { AppData } from '../store/types'
import { desktop } from './desktop'
import { isNativeAndroid } from './mobile'
import { CloudError, type CloudCode, type CloudUser, type RemoteData } from './cloudTypes'

const SESSION_KEY = 'nexus_hq_google_drive_session'
const MAX_DOCUMENT_BYTES = 900 * 1024
const AUTH_ITERATIONS = 210_000
const encoder = new TextEncoder()
const KNOWN_CODES = new Set<CloudCode>([
  'not_configured', 'not_signed_in', 'bad_email', 'weak_password', 'email_in_use',
  'wrong_password', 'user_not_found', 'too_many_requests', 'network', 'permission',
  'provider_disabled', 'firestore_missing', 'bad_firebase_config', 'too_large', 'unknown',
])

type Session = { scriptUrl: string; token: string; user: CloudUser }
type ScriptResponse = { ok: boolean; code?: string; token?: string; user?: { uid: string; email: string }; data?: unknown; updatedAt?: string }

let scriptUrl = ''
let session: Session | null = readSession()
let initializedFor = ''
const listeners = new Set<(user: CloudUser | null) => void>()

export function normalizeGoogleScriptUrl(value: string): string {
  try {
    const parsed = new URL(String(value ?? '').trim())
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com') return ''
    if (!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(parsed.pathname)) return ''
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch { return '' }
}

function readSession(): Session | null {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Partial<Session> | null
    if (!value?.scriptUrl || !value.token || !value.user?.uid) return null
    const normalized = normalizeGoogleScriptUrl(value.scriptUrl)
    return normalized ? { scriptUrl: normalized, token: value.token, user: value.user as CloudUser } : null
  } catch { return null }
}

function saveSession(next: Session | null) {
  session = next
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next))
    else localStorage.removeItem(SESSION_KEY)
  } catch { /* نشست حافظه‌ای تا بستن برنامه باقی می‌ماند */ }
  emit()
}

function emit() {
  const user = getCurrentUser()
  for (const listener of listeners) listener(user)
}

export function configure(value: string): string {
  let normalized = normalizeGoogleScriptUrl(value)
  if (!normalized && session?.scriptUrl) normalized = session.scriptUrl
  
  if (scriptUrl === normalized) return scriptUrl
  scriptUrl = normalized
  initializedFor = ''
  // token هر Script خصوصی است و هرگز نباید به URL متفاوت ارسال شود.
  if (session && session.scriptUrl !== scriptUrl) {
    session = null
    try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  }
  emit()
  return scriptUrl
}

export function getScriptUrl(): string { return scriptUrl }
export function isReady(): boolean { return !!(scriptUrl && session?.scriptUrl === scriptUrl && session.token) }
export function getCurrentUser(): CloudUser | null { return isReady() ? session!.user : null }
export function watchUser(callback: (user: CloudUser | null) => void): () => void {
  listeners.add(callback)
  callback(getCurrentUser())
  return () => { listeners.delete(callback) }
}

function toUser(value: { uid: string; email: string }): CloudUser {
  return { uid: value.uid, email: value.email, displayName: null, photoURL: null }
}

function mapCode(value: unknown): CloudCode {
  const raw = String(value ?? '')
  if (raw === 'server_error') return 'network'
  const code = raw as CloudCode
  return KNOWN_CODES.has(code) ? code : 'unknown'
}

type TransportResponse = { ok: boolean; status: number; text: string }

async function requestText(url: string, method: 'GET' | 'POST', body?: string): Promise<TransportResponse> {
  // Electron main و Android native HTTP به CORS وابسته نیستند.
  if (desktop) return desktop.driveRequest({ url, method, body })
  if (isNativeAndroid()) {
    const { CapacitorHttp } = await import('@capacitor/core')
    const response = await CapacitorHttp.request({
      url,
      method,
      headers: method === 'POST' ? { 'Content-Type': 'text/plain;charset=utf-8' } : undefined,
      data: method === 'POST' ? body ?? '' : undefined,
      responseType: 'text',
      connectTimeout: 20_000,
      readTimeout: 25_000,
    })
    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      text: typeof response.data === 'string' ? response.data : JSON.stringify(response.data ?? {}),
    }
  }
  const options: RequestInit = {
    method,
    redirect: 'follow',
    cache: 'no-store',
    signal: AbortSignal.timeout(25_000),
  }
  if (method === 'POST') {
    options.headers = { 'Content-Type': 'text/plain;charset=utf-8' }
    options.body = body
  }
  const response = await fetch(url, options)
  return { ok: response.ok, status: response.status, text: await response.text() }
}

/**
 * درخواست text/plain یک CORS simple request است؛ Apps Script از OPTIONS پشتیبانی
 * نمی‌کند. ContentService نیز redirect می‌دهد، پس follow باید روشن بماند.
 */
async function call(action: string, payload: Record<string, unknown> = {}, authenticated = false): Promise<ScriptResponse> {
  if (!scriptUrl) throw new CloudError('not_configured', 'google_script_url_missing')
  if (authenticated && !isReady()) throw new CloudError('not_signed_in')
  try {
    const response = await requestText(scriptUrl, 'POST', JSON.stringify({ action, ...payload, ...(authenticated && session ? { token: session.token } : {}) }))
    const result = JSON.parse(response.text || '{}') as ScriptResponse
    if (!response.ok || !result.ok) {
      const code = mapCode(result.code ?? `http_${response.status}`)
      if (authenticated && code === 'not_signed_in') saveSession(null)
      throw new CloudError(code, String(result.code ?? `http_${response.status}`))
    }
    return result
  } catch (error) {
    if (error instanceof CloudError) throw error
    throw new CloudError('network', String((error as Error)?.message ?? 'network').slice(0, 120))
  }
}

/** رمز اصلی Google ارسال نمی‌شود؛ فقط یک verifier مشتق‌شده از رمز مخصوص NEXUS. */
export async function deriveCredential(email: string, password: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase()
  const salt = encoder.encode(`NEXUS-HQ-DRIVE-AUTH-v1|${normalizedEmail}`)
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: AUTH_ITERATIONS }, material, 256)
  const bytes = new Uint8Array(bits)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

async function authenticate(action: 'register' | 'login', email: string, password: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new CloudError('bad_email')
  if (password.length < 8) throw new CloudError('weak_password')
  const credential = await deriveCredential(normalizedEmail, password)
  const result = await call(action, { email: normalizedEmail, credential })
  if (!result.token || !result.user) throw new CloudError('unknown', 'bad_auth_response')
  saveSession({ scriptUrl, token: result.token, user: toUser(result.user) })
}

export function createAccount(email: string, password: string): Promise<void> { return authenticate('register', email, password) }
export function signIn(email: string, password: string): Promise<void> { return authenticate('login', email, password) }
export async function signOut(): Promise<void> {
  try { if (isReady()) await call('logout', {}, true) } catch { /* خروج محلی قطعی است */ }
  saveSession(null)
}

export async function init(): Promise<void> {
  if (!scriptUrl || initializedFor === scriptUrl) return
  initializedFor = scriptUrl
  if (!session || session.scriptUrl !== scriptUrl) { emit(); return }
  try {
    const result = await call('me', {}, true)
    if (result.user) saveSession({ scriptUrl, token: session.token, user: toUser(result.user) })
  } catch (error) {
    // خطای شبکه نشست را حذف نمی‌کند؛ فقط not_signed_in داخل call پاکش می‌کند.
    if (error instanceof CloudError && error.code !== 'not_signed_in') emit()
  }
}

export async function push(data: AppData): Promise<string> {
  const serialized = JSON.stringify(data)
  if (new Blob([serialized]).size > MAX_DOCUMENT_BYTES) throw new CloudError('too_large')
  const result = await call('save', { version: data.version, data }, true)
  if (!result.updatedAt) throw new CloudError('unknown', 'missing_updated_at')
  return result.updatedAt
}

export async function pull(): Promise<RemoteData> {
  const result = await call('load', {}, true)
  return result.data == null ? null : { data: result.data, updatedAt: result.updatedAt ?? '' }
}

export async function health(value: string): Promise<boolean> {
  const normalized = normalizeGoogleScriptUrl(value)
  if (!normalized) return false
  try {
    const response = await requestText(`${normalized}?action=health`, 'GET')
    const result = JSON.parse(response.text || '{}') as { ok?: boolean; service?: string }
    return response.ok && result.ok === true && result.service === 'nexus-hq-drive'
  } catch { return false }
}

export { AUTH_ITERATIONS }
