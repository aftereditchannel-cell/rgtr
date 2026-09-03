/**
 * تشخیص خودکار داده‌ی شبکه‌های اجتماعی (فالوور، بیو، نام و…).
 *
 * محدودیت صادقانه: اینستاگرام/تیک‌تاک API عمومیِ بدون‌کلید ندارند و صفحه‌هایشان
 * CORS را روی مرورگر می‌بندند. بنابراین این ماژول دو راه دارد:
 *   ۱. واسط (proxy) شخصی: کاربر یک آدرس می‌دهد که پروفایل را می‌خواند و JSON برمی‌گرداند.
 *      (مثلاً یک Cloudflare Worker رایگان — قالبش در راهنمای برنامه آمده است.)
 *   ۲. oEmbed برای پلتفرم‌هایی که endpoint باز دارند (YouTube، Instagram پست عمومی).
 * هر داده‌ای که برگردد فقط «پیشنهاد» است؛ کاربر همیشه می‌تواند بعداً ویرایش کند.
 */

export interface SocialProfile {
  name: string
  bio: string
  followers: number | null
  following: number | null
  posts: number | null
  url: string
  /** منبع داده — برای نمایش به کاربر */
  source: string
}

/** تبدیل handle/url خام به آدرس کامل */
export function normalizeProfileUrl(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('@')) return `https://www.instagram.com/${s.slice(1)}/`
  if (/^t\.me\//i.test(s)) return `https://${s}`
  if (/^youtube\.com|^youtu\.be/i.test(s)) return `https://${s}`
  // فرض: handle اینستاگرام
  return `https://www.instagram.com/${s.replace(/^@/, '')}/`
}

const O = {
  instagram: (u: string) => `https://api.instagram.com/oembed?url=${encodeURIComponent(u)}`,
  youtube: (u: string) => `https://www.youtube.com/oembed?url=${encodeURIComponent(u)}&format=json`,
  tiktok: (u: string) => `https://www.tiktok.com/oembed?url=${encodeURIComponent(u)}`,
}

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

/** تلاش مستقیم از طریق oEmbed (پلتفرم‌های دارای endpoint باز) */
async function viaOembed(url: string): Promise<SocialProfile | null> {
  const h = hostOf(url)
  const ep = h.includes('instagram') ? O.instagram(url)
    : h.includes('youtube') || h.includes('youtu.be') ? O.youtube(url)
    : h.includes('tiktok') ? O.tiktok(url)
    : null
  if (!ep) return null
  try {
    const res = await fetch(ep)
    if (!res.ok) return null
    const j = (await res.json()) as { title?: string; author_name?: string }
    return {
      name: j.author_name ?? '',
      bio: '',
      followers: null,
      following: null,
      posts: null,
      url,
      source: 'oEmbed',
    }
  } catch {
    return null
  }
}

/** تلاش از طریق واسط شخصی کاربر */
async function viaProxy(url: string, proxyUrl: string): Promise<SocialProfile | null> {
  const base = proxyUrl.replace(/\/+$/, '')
  const sep = base.includes('?') ? '&' : '?'
  try {
    const res = await fetch(`${base}${sep}url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    const j = (await res.json()) as Partial<SocialProfile> & Record<string, unknown>
    const num = (v: unknown) => {
      const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''))
      return Number.isFinite(n) ? n : null
    }
    return {
      name: String(j.name ?? j.author_name ?? j.full_name ?? ''),
      bio: String(j.bio ?? j.biography ?? j.description ?? ''),
      followers: num(j.followers ?? j.follower_count ?? j.followers_count),
      following: num(j.following ?? j.following_count),
      posts: num(j.posts ?? j.media_count ?? j.post_count),
      url,
      source: 'proxy',
    }
  } catch {
    return null
  }
}

async function viaPublicProxy(url: string): Promise<SocialProfile | null> {
  // A list of public CORS proxies to try one by one until success
  const proxies = [
    (u: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://cors-anywhere.herokuapp.com/${u}` // Note: this requires temporary opt-in but might work in some network setups
  ]

  let html = ''
  
  for (const p of proxies) {
    try {
      const res = await fetch(p(url))
      if (!res.ok) continue
      
      // allorigins returns JSON with contents field, others return raw text
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const json = await res.json()
        html = json.contents || ''
      } else {
        html = await res.text()
      }
      
      if (html) break
    } catch {
      continue
    }
  }

  if (!html) return null

  const extract = (pattern: RegExp) => (html.match(pattern) || [])[1]?.trim() || ''
  const num = (pattern: RegExp) => {
    const match = (html.match(pattern) || [])[1]
    if (!match) return null
    // Instagram uses formats like "12.5M", "10K", we need to handle multipliers
    let nStr = match.replace(/,/g, '').trim().toLowerCase()
    let multiplier = 1
    if (nStr.endsWith('k')) { multiplier = 1000; nStr = nStr.replace('k', '') }
    else if (nStr.endsWith('m')) { multiplier = 1000000; nStr = nStr.replace('m', '') }
    else if (nStr.endsWith('b')) { multiplier = 1000000000; nStr = nStr.replace('b', '') }
    
    const n = Number(nStr)
    return Number.isFinite(n) ? Math.round(n * multiplier) : null
  }

  const title = extract(/<meta\s+property="og:title"\s+content="([^"]+)"/i)
  const desc = extract(/<meta\s+property="og:description"\s+content="([^"]+)"/i)

  let followers = null
  let name = title
  
  if (url.includes('t.me')) {
    followers = num(/class="tgme_page_extra"[^>]*>([0-9\sA-Za-z.,kmb]+)(?:subscribers|members)/i)
    name = title || extract(/<div class="tgme_page_title".*?>\s*<span[^>]*>(.*?)<\/span>/i)
  }
  else if (url.includes('youtube.com') || url.includes('youtu.be')) {
    followers = num(/"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+) subscribers"/i) 
                || num(/"subscriberCountText":\{"simpleText":"([^"]+) subscribers"/i)
                || num(/"subscriberCountText":\s*"([0-9.,KMBkmb]+)/i)
  }
  else if (url.includes('instagram.com')) {
    followers = num(/content="([0-9.,KMBkmb]+)\s+Followers/i)
    name = extract(/content=".*?See Instagram photos and videos from\s+([^"]+)\s+\(@/i) || title
  }
  else if (url.includes('soundcloud.com')) {
    followers = num(/"followers_count":\s*(\d+)/i)
  }
  else if (url.includes('spotify.com')) {
    followers = num(/"followers":\s*(?:\{[^\}]*"total":\s*)?(\d+)/i) || num(/followerCount":\s*(\d+)/i)
    name = title || extract(/<meta property="og:title" content="([^"]+)"/i)
  }

  return {
    name: name.replace(/\s*-.*$/, ''), 
    bio: desc,
    followers,
    following: null,
    posts: null,
    url,
    source: 'public proxy',
  }
}

/**
 * تلاش برای خواندن پروفایل. هرگز throw نمی‌کند؛ در صورت شکست، null.
 */
export async function fetchSocialProfile(
  raw: string,
  proxyUrl = '',
): Promise<SocialProfile | null> {
  const url = normalizeProfileUrl(raw)
  if (!url) return null
  if (proxyUrl) {
    const p = await viaProxy(url, proxyUrl)
    if (p) return p
  }
  const o = await viaOembed(url)
  if (o) {
    // try to augment oEmbed with follower count using public proxy
    const aug = await viaPublicProxy(url)
    if (aug && aug.followers) o.followers = aug.followers
    return o
  }
  // fallback to public proxy
  const p = await viaPublicProxy(url)
  return p
}

/** قالب Worker واسط برای راهنمای کاربر — به‌صورت رشته */
export const PROXY_WORKER_TEMPLATE = `// Cloudflare Worker — واسط خواندن پروفایل‌های عمومی
// این کد را روی workers.cloudflare.com بگذارید و آدرسش را در برنامه وارد کنید.
export default {
  async fetch(request) {
    const url = new URL(request.url).searchParams.get('url')
    if (!url) return new Response(JSON.stringify({ error: 'missing url' }), { status: 400 })
    // این‌جا پروفایل را بخوانید؛ نمونه: برداشت متادیتای صفحه با HTMLRewriter یا یک API بالادستی.
    // پاسخ باید JSON باشد: { name, bio, followers, following, posts }
    return new Response(JSON.stringify({ name: '', bio: '', followers: null, following: null, posts: null }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    })
  },
}`
