/**
 * دروازه‌ی شبکه‌ی بومی
 * =====================
 * درخواست‌های HTTP از لایه‌ی وب از طریق «پروکسی بومی» انجام می‌شوند:
 *   https://api.nexushq.mobile/proxy?url=<encoded>
 * — در ویندوز با WinHTTP (رخداد WebResourceRequested در WebView2) و
 * — در اندروید با HttpURLConnection (shouldInterceptRequest)
 * پاسخ می‌دهند؛ بنابراین محدودیت CORS مرورگرها اعمال نمی‌شود و برنامه
 * مثل هر اپ دسکتاپ/موبایل واقعی مستقیماً به APIهای عمومی رسمی وصل می‌شود.
 *
 * در مرورگر (بدون پل بومی) مستقیم fetch می‌کنیم و خطای CORS را شفاف گزارش می‌دهیم.
 */

const API_HOST = 'api.nexushq.mobile'

export function nativeGatewayAvailable(): boolean {
  return typeof window !== 'undefined' &&
    !!window.NexusKeyStore /* پل بومی فقط در اپ‌های بسته‌بندی‌شده ثبت می‌شود */
}

export interface GwResponse {
  ok: boolean
  status: number
  body: string
}

/** GET/POST از طریق دروازه‌ی بومی (فقط http/https مجاز است) */
export async function gwFetch(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<GwResponse> {
  if (nativeGatewayAvailable()) {
    const q = new URLSearchParams({ url })
    if (init?.method) q.set('method', init.method)
    if (init?.body) q.set('body', init.body)
    if (init?.headers) {
      const h = Object.entries(init.headers).map(([k, v]) => `${k}: ${v}`).join('~~')
      q.set('h', h)
    }
    const r = await fetch(`https://${API_HOST}/proxy?${q.toString()}`)
    const body = await r.text()
    return { ok: r.ok, status: r.status, body }
  }
  // مرورگر: تلاش مستقیم — ممکن است CORS اجازه ندهد
  const r2 = await fetch(url, {
    method: init?.method ?? 'GET',
    headers: init?.headers,
    body: init?.body,
  })
  return { ok: r2.ok, status: r2.status, body: await r2.text() }
}

export async function gwJSON<T>(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<T> {
  const r = await gwFetch(url, init)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return JSON.parse(r.body) as T
}

export async function gwText(url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }): Promise<string> {
  const r = await gwFetch(url, init)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.body
}
