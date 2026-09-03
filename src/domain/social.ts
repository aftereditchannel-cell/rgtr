/**
 * دامنه‌ی ماژول شبکه‌های اجتماعی:
 * - شناسایی پلتفرم از روی لینک
 * - واکشی اطلاعات (فالوور، مشترک، بازدید...) از سرویس‌های بدون نیاز به کلید
 * - چندین پراکسی/منبع برای هر پلتفرم تا پایداری بالا بماند
 *
 * همه‌ی درخواست‌ها CORS-friendly هستند یا از پراکسی‌های عمومی رد می‌شوند.
 * کاربر می‌تواند در صورت تمایل کلید API اختیاری هم بدهد.
 */

export type Platform = 'Instagram' | 'YouTube' | 'Telegram' | 'SoundCloud' | 'Spotify' | 'Generic'

export interface SocialProfile {
  id: string
  platform: Platform
  /** نام کاربری یا شناسه‌ی کانال */
  handle: string
  /** نام نمایشی */
  title: string
  /** بیو/توضیحات */
  bio?: string
  /** آدرس عکس پروفایل */
  avatar?: string
  /** معیار اصلی: فالوور / مشترک / دنبال‌کننده */
  followers?: number
  /** معیار ثانویه بر اساس پلتفرم */
  following?: number
  posts?: number
  views?: number
  likes?: number
  /** لینک اصلی */
  url: string
  /** تایید شده؟ */
  verified?: boolean
  /** آخرین به‌روزرسانی موفق */
  fetchedAt: string
  /** منبعی که داده از آن آمد */
  source?: string
  /** اگر شکست خورد */
  error?: string
}

export interface FetchOptions {
  /** کلیدهای اختیاری که کاربر در تنظیمات می‌گذارد */
  keys?: {
    youtube?: string
    instagram?: string
    rapidapi?: string
  }
  /** سیگنال لغو */
  signal?: AbortSignal
}

const GENERIC_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

async function fetchText(url: string, opts: RequestInit = {}): Promise<string> {
  const res = await fetch(url, {
    ...opts,
    headers: {
      'User-Agent': GENERIC_UA,
      Accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
      ...opts.headers,
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.text()
}

/** چند پراکسی‌ی CORS عمومی — به ترتیب تلاش می‌شوند */
const CORS_PROXIES = [
  (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u: string) => `https://thingproxy.freeboard.io/fetch/${u}`,
]

async function fetchThroughProxies(url: string, init?: RequestInit): Promise<string> {
  for (const p of CORS_PROXIES) {
    try {
      return await fetchText(p(url), init)
    } catch {
      // پروکسی بعدی
    }
  }
  // آخرین تلاش مستقیم
  return await fetchText(url, init)
}

/** r.jina.ai یک reader رایگان است که HTML را به متن/Markdown تمیز تبدیل می‌کند */
async function jinaReader(url: string): Promise<string> {
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers: { 'User-Agent': GENERIC_UA, Accept: 'text/plain,text/markdown' },
  })
  if (!res.ok) throw new Error(`jina HTTP ${res.status}`)
  return await res.text()
}

/* ---------- شناسایی پلتفرم ---------- */
export function detectPlatform(input: string): { platform: Platform; url: string; handle: string } {
  const raw = input.trim()

  // ورودی صرفاً «@handle» بدون دامنه → اینستاگرام فرض می‌شود
  if (/^@?[A-Za-z0-9._]{2,30}$/.test(raw) && !raw.includes('.')) {
    const handle = raw.replace(/^@/, '')
    return { platform: 'Instagram', url: `https://www.instagram.com/${handle}/`, handle }
  }

  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  let u: URL
  try {
    u = new URL(withProto)
  } catch {
    return { platform: 'Generic', url: withProto, handle: raw }
  }
  const host = u.hostname.replace(/^www\./, '').toLowerCase()
  const path = u.pathname.replace(/\/+$/, '')

  if (host.includes('instagram.com')) {
    const handle = path.split('/').filter(Boolean)[0] ?? ''
    return { platform: 'Instagram', url: `https://www.instagram.com/${handle}/`, handle }
  }
  if (host.includes('youtube.com') || host.includes('youtu.be')) {
    let handle = ''
    if (host.includes('youtu.be')) handle = u.pathname.slice(1)
    else if (path.startsWith('/@')) handle = path.slice(2)
    else if (path.startsWith('/channel/')) handle = path.split('/')[2] ?? ''
    else if (path.startsWith('/c/')) handle = path.split('/')[2] ?? ''
    else if (path.startsWith('/user/')) handle = path.split('/')[2] ?? ''
    return { platform: 'YouTube', url: u.toString(), handle: handle || path }
  }
  if (host.includes('t.me') || host.includes('telegram.me') || host.includes('telegram.org')) {
    const handle = path.split('/').filter(Boolean)[0] ?? ''
    return { platform: 'Telegram', url: `https://t.me/${handle}`, handle }
  }
  if (host.includes('soundcloud.com')) {
    const parts = path.split('/').filter(Boolean)
    const handle = parts[0] ?? ''
    return { platform: 'SoundCloud', url: `https://soundcloud.com/${handle}`, handle }
  }
  if (host.includes('spotify.com') || host.includes('open.spotify.com')) {
    const parts = path.split('/').filter(Boolean)
    const type = parts[0] ?? 'artist'
    const id = parts[1] ?? ''
    return { platform: 'Spotify', url: `https://open.spotify.com/${type}/${id}`, handle: id }
  }
  return { platform: 'Generic', url: u.toString(), handle: u.hostname }
}

/* ---------- ابزارهای پارس ---------- */
function num(s: string | undefined | null): number | undefined {
  if (!s) return undefined
  const t = s.replace(/[^0-9,.kKmMbB]/g, '').trim().toLowerCase()
  if (!t) return undefined
  const m = t.match(/^([\d.,]+)\s*([kmb])?$/)
  if (!m) {
    const plain = Number(t.replace(/,/g, ''))
    return Number.isFinite(plain) ? plain : undefined
  }
  let n = Number(m[1].replace(/,/g, ''))
  if (m[2] === 'k') n *= 1_000
  else if (m[2] === 'm') n *= 1_000_000
  else if (m[2] === 'b') n *= 1_000_000_000
  return Math.round(n)
}

function metaContent(html: string, names: string[]): string | undefined {
  for (const n of names) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${n}["'][^>]+content=["']([^"']*)["']`,
      'i',
    )
    const m = html.match(re)
    if (m) return m[1]
    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${n}["']`,
      'i',
    )
    const m2 = html.match(re2)
    if (m2) return m2[1]
  }
  return undefined
}

function jsonLdGraph(html: string): any[] {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  const out: any[] = []
  for (const b of blocks) {
    try {
      const j = JSON.parse(b[1])
      if (Array.isArray(j)) out.push(...j)
      else if (Array.isArray(j['@graph'])) out.push(...j['@graph'])
      else out.push(j)
    } catch { /* ignore */ }
  }
  return out
}

/* ---------- واکش مخصوص هر پلتفرم ---------- */

async function fetchInstagram(handle: string, url: string, _opt: FetchOptions): Promise<Partial<SocialProfile>> {
  // ابتدا oEmbed-style و صفحه‌ی عمومی با پراکسی
  const html = await fetchThroughProxies(url)
  const ogTitle = metaContent(html, ['og:title'])
  const ogDesc = metaContent(html, ['og:description'])
  const ogImg = metaContent(html, ['og:image'])
  const title = (ogTitle ?? handle).replace(/\s*\u2022.*$/, '').replace(/\s*\(@.+\).*$/, '').trim() || handle
  // توضیحات اینستاگرام معمولاً شامل «N Followers, ...» است
  const followers = num((ogDesc ?? '').match(/([\d.,]+\s*[KMB]?)\s+Followers/i)?.[1])
  const following = num((ogDesc ?? '').match(/([\d.,]+\s*[KMB]?)\s+Following/i)?.[1])
  const posts = num((ogDesc ?? '').match(/([\d.,]+\s*[KMB]?)\s+Posts/i)?.[1])
  const bio = ogDesc ? ogDesc.replace(/\s*-\s*See.*photos.*/i, '').trim() : undefined
  return {
    handle, title, bio, avatar: ogImg, followers, following, posts, url,
    source: 'instagram.com (public metadata)',
  }
}

async function fetchYouTube(handle: string, url: string, opt: FetchOptions): Promise<Partial<SocialProfile>> {
  if (opt.keys?.youtube) {
    try {
      // resolve channel via search if needed — fallback below handles non-ID handles
      const channelId = handle.startsWith('UC') ? handle : undefined
      if (channelId) {
        const api = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelId}&key=${opt.keys.youtube}`
        const j = await (await fetch(api)).json()
        const it = j?.items?.[0]
        if (it) {
          return {
            handle: it.snippet.customUrl ?? channelId,
            title: it.snippet.title,
            bio: it.snippet.description,
            avatar: it.snippet.thumbnails?.high?.url,
            followers: Number(it.statistics?.subscriberCount),
            views: Number(it.statistics?.viewCount),
            posts: Number(it.statistics?.videoCount),
            source: 'YouTube Data API v3',
          }
        }
      }
    } catch { /* به روش بدون کلید می‌رویم */ }
  }
  // oEmbed برای عنوان/آواتار
  let title = handle, avatar: string | undefined
  try {
    const oeUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
    const oe = await (await fetch(oeUrl)).json()
    title = oe.title ?? title
    avatar = oe.thumbnail_url ?? avatar
  } catch { /* ignore */ }
  // صفحه‌ی کانال برای تعداد مشترک
  const html = await fetchThroughProxies(url)
  const followers = num((html.match(/"subscriberCountText":\{"simpleText":"([^"]+)"/)?.[1])
    ?? (html.match(/"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/)?.[1]))
  const views = num(html.match(/"viewCountText":"([\d,]+)"/)?.[1])
  return { handle, title, avatar, followers, views, url, source: 'youtube.com (public)' }
}

async function fetchTelegram(handle: string, url: string, _opt: FetchOptions): Promise<Partial<SocialProfile>> {
  // t.me/<handle> صفحه‌ای با متا تگ‌ها و sometimes شمارش اعضا
  let html = ''
  let fromJina = false
  try {
    html = await fetchText(`https://t.me/${handle}`)
  } catch {
    html = await jinaReader(`https://t.me/${handle}`)
    fromJina = true
  }
  const title = metaContent(html, ['og:title', 'twitter:title']) ?? handle
  const desc = metaContent(html, ['og:description', 'description', 'twitter:description'])
  const avatar = metaContent(html, ['og:image', 'twitter:image'])
  // الگوهای تعداد اعضا: «1 234 subscribers» / «1.2M members»
  const followers = num(
    (desc ?? '').match(/([\d.,\s]+\s*[KMBkmb]?)\s+(?:subscribers|members)/i)?.[1]
    ?? html.match(/>([\d.,\s]+\s*[KMBkmb]?)\s+members?</i)?.[1],
  )
  const verified = /<i[^>]*tgme_page_verified/i.test(html) || /verified_badge/i.test(html)
  return {
    handle, title, bio: desc?.slice(0, 300), avatar, followers, verified, url,
    source: fromJina ? 't.me (via jina.ai)' : 't.me (public)',
  }
}

async function fetchSoundCloud(handle: string, url: string, _opt: FetchOptions): Promise<Partial<SocialProfile>> {
  const html = await fetchThroughProxies(url)
  const graph = jsonLdGraph(html)
  const person = graph.find(x => x && (x['@type'] === 'MusicGroup' || x['@type'] === 'Person')) ?? {}
  const title =
    metaContent(html, ['og:title'])?.replace(/\u00b7.*$/, '').trim()
    ?? person.name
    ?? handle
  const bio = metaContent(html, ['og:description']) ?? person.description
  const avatar = metaContent(html, ['og:image']) ?? person.image
  const followers = num(html.match(/(\d[\d.,]*)\s+Followers/i)?.[1])
  return { handle, title, bio, avatar, followers, url, source: 'soundcloud.com (public)' }
}

async function fetchSpotify(handle: string, url: string, _opt: FetchOptions): Promise<Partial<SocialProfile>> {
  // Spotify page is heavily JS-rendered — use r.jina.ai
  const md = await jinaReader(url)
  const title =
    md.match(/Title:\s*(.+)/i)?.[1]?.trim()
    ?? md.match(/^#\s+(.+)$/m)?.[1]?.trim()
    ?? handle
  const followers = num(
    md.match(/([\d.,]+\s*[KMB]?)\s+(?:monthly listeners|listeners|followers)/i)?.[1],
  )
  const bio = md.match(/Description:\s*(.+)/i)?.[1]?.trim().slice(0, 300)
  return { handle, title, bio, followers, url, source: 'open.spotify.com (via jina.ai)' }
}

async function fetchGeneric(url: string, handle: string, _opt: FetchOptions): Promise<Partial<SocialProfile>> {
  try {
    const html = await fetchThroughProxies(url)
    const title = metaContent(html, ['og:title', 'twitter:title'])
      ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
      ?? handle
    const desc = metaContent(html, ['og:description', 'description', 'twitter:description'])
    const avatar = metaContent(html, ['og:image', 'twitter:image'])
    return { handle, title: title.trim(), bio: desc?.slice(0, 300), avatar, url, source: 'generic (meta tags)' }
  } catch {
    return { handle, title: handle, url, source: 'generic' }
  }
}

const FETCHERS: Record<Platform, (h: string, u: string, o: FetchOptions) => Promise<Partial<SocialProfile>>> = {
  Instagram: fetchInstagram,
  YouTube: fetchYouTube,
  Telegram: fetchTelegram,
  SoundCloud: fetchSoundCloud,
  Spotify: fetchSpotify,
  Generic: fetchGeneric,
}

/** واکشی یک پروفایل از لینک/آیدی */
export async function fetchProfile(input: string, opt: FetchOptions = {}): Promise<SocialProfile> {
  const { platform, url, handle } = detectPlatform(input)
  const base: SocialProfile = {
    id: `${platform.toLowerCase()}:${handle}`,
    platform, handle, title: handle, url,
    fetchedAt: new Date().toISOString(),
  }
  try {
    const data = await FETCHERS[platform](handle, url, opt)
    return { ...base, ...data, id: base.id, platform, url: data.url ?? url, fetchedAt: new Date().toISOString() }
  } catch (e) {
    return { ...base, error: (e as Error).message, fetchedAt: new Date().toISOString() }
  }
}

/* ---------- کش موقت در حافظه برای رفرش ---------- */
const cache = new Map<string, { at: number; p: SocialProfile }>()
const CACHE_MS = 30_000

export async function fetchProfileCached(input: string, opt: FetchOptions = {}): Promise<SocialProfile> {
  const key = input.trim().toLowerCase()
  const c = cache.get(key)
  if (c && Date.now() - c.at < CACHE_MS && !opt.signal) return c.p
  const p = await fetchProfile(input, opt)
  if (!p.error) cache.set(key, { at: Date.now(), p })
  return p
}
