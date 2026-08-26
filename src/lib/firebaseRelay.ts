/**
 * مسیر اختیاری و اختصاصی Firebase از راه Cloudflare Worker.
 *
 * چرا patch در سطح fetch/XHR است؟ Firebase Auth و Firestore هر دو چند endpoint
 * مختلف دارند. بازنویسی شفاف URL باعث می‌شود خود SDK رسمی همچنان نشست، refresh
 * token، قواعد Firestore و serialization را مدیریت کند و هیچ رمز/توکنی در کد ما
 * ثبت یا لاگ نشود.
 *
 * Relay فقط وقتی URL اختصاصی کاربر در تنظیمات ثبت شده فعال است. بدون آن، رفتار
 * مستقیم Firebase دست‌نخورده باقی می‌ماند.
 */

const STORAGE_KEY = 'nexus_hq_firebase_relay'
const FIREBASE_HOSTS = new Set([
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firestore.googleapis.com',
])

let activeRelay = readStoredRelay()
let installed = false

function normalizeRelay(value: string): string {
  const raw = String(value ?? '').trim().replace(/\/+$/, '')
  if (!raw) return ''
  try {
    const url = new URL(raw)
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) return ''
    // آدرس باید فقط origin و path پایه باشد؛ query/hash برای endpoint مناسب نیست.
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/+$/, '')
  } catch {
    return ''
  }
}

function readStoredRelay(): string {
  try { return normalizeRelay(localStorage.getItem(STORAGE_KEY) ?? '') } catch { return '' }
}

/** URL عمومی است و secret نیست؛ فقط روی همان دستگاه برای شروع زودهنگام SDK نگه‌داری می‌شود. */
export function setFirebaseRelayUrl(value: string): string {
  activeRelay = normalizeRelay(value)
  try {
    if (activeRelay) localStorage.setItem(STORAGE_KEY, activeRelay)
    else localStorage.removeItem(STORAGE_KEY)
  } catch { /* فایل تنظیمات برنامه همچنان منبع اصلی است */ }
  return activeRelay
}

export function getFirebaseRelayUrl(): string {
  return activeRelay
}

export function isValidFirebaseRelayUrl(value: string): boolean {
  return !!normalizeRelay(value)
}

function rewriteFirebaseUrl(raw: string): string {
  if (!activeRelay) return raw
  try {
    const target = new URL(raw)
    if (!FIREBASE_HOSTS.has(target.hostname)) return raw
    return `${activeRelay}/firebase/${target.hostname}${target.pathname}${target.search}`
  } catch {
    return raw
  }
}

/** یک‌بار و پیش از اولین درخواست Firebase نصب می‌شود. */
export function installFirebaseRelay(): void {
  if (installed || typeof globalThis === 'undefined') return
  installed = true

  if (typeof globalThis.fetch === 'function') {
    const originalFetch = globalThis.fetch.bind(globalThis)
    globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === 'string' || input instanceof URL) {
        return originalFetch(rewriteFirebaseUrl(String(input)), init)
      }
      const rewritten = rewriteFirebaseUrl(input.url)
      return originalFetch(rewritten === input.url ? input : new Request(rewritten, input), init)
    }) as typeof globalThis.fetch
  }

  // Firestore WebChannel بسته به WebView/Chromium ممکن است XHR را به‌جای fetch برگزیند.
  if (typeof XMLHttpRequest !== 'undefined') {
    const originalOpen = XMLHttpRequest.prototype.open
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      async = true,
      username?: string | null,
      password?: string | null,
    ) {
      Reflect.apply(originalOpen, this, [method, rewriteFirebaseUrl(String(url)), async, username, password])
    } as typeof XMLHttpRequest.prototype.open
  }
}

export type RelayHealth = { ok: boolean; project?: string; error?: string }

export async function testFirebaseRelay(value: string): Promise<RelayHealth> {
  const relay = normalizeRelay(value)
  if (!relay) return { ok: false, error: 'invalid_url' }
  try {
    const response = await fetch(`${relay}/health`, {
      method: 'GET',
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
    const body = await response.json().catch(() => ({})) as RelayHealth
    if (!response.ok || body.ok !== true) return { ok: false, error: `http_${response.status}` }
    return body
  } catch (error) {
    return { ok: false, error: String((error as Error)?.message ?? 'network').slice(0, 120) }
  }
}
