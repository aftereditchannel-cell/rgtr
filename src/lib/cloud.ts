import type { AppData } from '../store/types'

/**
 * همگام‌سازی ابری رایگان با «GitHub Secret Gist».
 *
 * چرا این روش:
 *   • کاملاً رایگان و بدون کارت اعتباری، بدون سرور و بدون ثبت‌نام اضافه
 *   • Gist محرمانه (secret) است: با لینک مستقیم دیده نمی‌شود و در جستجو نمی‌آید
 *   • API آن CORS باز دارد، پس هم در مرورگر و هم در نسخه‌ی ویندوز مستقیم کار می‌کند
 *   • داده در حساب خودِ کاربر می‌ماند، نه سرور شخص ثالث
 *
 * محدودیت‌هایی که کاربر باید بداند:
 *   • نیاز به یک Personal Access Token با دسترسی «gist»
 *   • حجم عملی هر gist تا حدود ۱۰ مگابایت
 *   • سقف ۵۰۰۰ درخواست در ساعت (برای این کاربرد بسیار فراتر از نیاز)
 *   • Secret یعنی «حدس‌ناپذیر»، نه رمزنگاری‌شده؛ هرکس توکن یا لینک را داشته باشد می‌بیند
 */

const API = 'https://api.github.com'
const FILENAME = 'nexus-hq-data.json'
const TOKEN_KEY = 'nexus_hq_gist_token'
const DESCRIPTION = 'NEXUS HQ — backup (do not delete)'

export type CloudCode = 'bad_token' | 'not_found' | 'network' | 'rate' | 'bad_payload'

export class CloudError extends Error {
  code: CloudCode
  constructor(code: CloudCode) {
    super(code)
    this.code = code
    this.name = 'CloudError'
  }
}

/* ---------- توکن: فقط روی همین دستگاه، بیرون از فایل بکاپ ---------- */

export function getToken(): string {
  try { return localStorage.getItem(TOKEN_KEY) ?? '' } catch { return '' }
}

export function setToken(token: string): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* حالت خصوصی مرورگر */ }
}

export function hasToken(): boolean {
  return !!getToken()
}

/* ---------- درخواست پایه ---------- */

async function req(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken()
  if (!token) throw new CloudError('bad_token')
  let res: Response
  try {
    res = await fetch(API + path, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    })
  } catch {
    throw new CloudError('network')
  }
  if (res.status === 401 || res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining')
    throw new CloudError(remaining === '0' ? 'rate' : 'bad_token')
  }
  if (res.status === 404) throw new CloudError('not_found')
  if (!res.ok) throw new CloudError('network')
  return res
}

interface GistFile { content?: string; truncated?: boolean; raw_url?: string }
interface GistResponse { id: string; updated_at: string; files: Record<string, GistFile> }

/* ---------- عملیات ---------- */

/** بررسی اعتبار توکن؛ نام کاربری گیت‌هاب را برمی‌گرداند */
export async function verifyToken(): Promise<string> {
  const res = await req('/user')
  const j = (await res.json()) as { login?: string }
  return j.login ?? ''
}

/** ساخت gist محرمانه‌ی تازه و برگرداندن شناسه‌ی آن */
export async function createGist(data: AppData): Promise<string> {
  const res = await req('/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: DESCRIPTION,
      public: false,
      files: { [FILENAME]: { content: serialize(data) } },
    }),
  })
  const j = (await res.json()) as GistResponse
  return j.id
}

/** ارسال داده به gist موجود */
export async function pushGist(gistId: string, data: AppData): Promise<string> {
  const res = await req(`/gists/${gistId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      description: DESCRIPTION,
      files: { [FILENAME]: { content: serialize(data) } },
    }),
  })
  const j = (await res.json()) as GistResponse
  return j.updated_at
}

/** دریافت داده از gist — اگر فایل خالی/ناموجود بود null می‌دهد */
export async function pullGist(gistId: string): Promise<{ data: unknown; updatedAt: string } | null> {
  const res = await req(`/gists/${gistId}`)
  const j = (await res.json()) as GistResponse
  const file = j.files?.[FILENAME] ?? Object.values(j.files ?? {})[0]
  if (!file) return null

  let text = file.content ?? ''
  // gist های بزرگ‌تر از ۱ مگابایت بریده می‌شوند و باید از raw_url خوانده شوند
  if (file.truncated && file.raw_url) {
    try {
      const r = await fetch(file.raw_url)
      if (!r.ok) throw new CloudError('network')
      text = await r.text()
    } catch { throw new CloudError('network') }
  }
  if (!text.trim()) return null

  try {
    return { data: JSON.parse(text), updatedAt: j.updated_at }
  } catch {
    throw new CloudError('bad_payload')
  }
}

/** اطمینان از وجود gist: اگر شناسه نبود می‌سازد. خروجی: شناسه و اینکه تازه ساخته شد یا نه */
export async function ensureGist(gistId: string, data: AppData): Promise<{ id: string; created: boolean }> {
  if (gistId) {
    await req(`/gists/${gistId}`) // اگر پیدا نشود CloudError('not_found')
    return { id: gistId, created: false }
  }
  const id = await createGist(data)
  return { id, created: true }
}

/** توکن به همراه داده ذخیره نمی‌شود؛ این تابع نسخه‌ی امن برای ارسال می‌سازد */
function serialize(data: AppData): string {
  return JSON.stringify({ ...data, syncedAt: new Date().toISOString() }, null, 0)
}

/** اندازه‌ی تقریبی داده برای هشدار سقف حجم */
export function payloadSize(data: AppData): number {
  try { return new Blob([serialize(data)]).size } catch { return serialize(data).length }
}
