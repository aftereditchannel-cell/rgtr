const fs = require('fs')
const path = require('path')

// 1. CellValue.tsx -> Add linkifier regex
let cell = fs.readFileSync(path.join(__dirname, 'src/components/views/CellValue.tsx'), 'utf8')

// Replace default fallback text renderer
const textBlock = `const text = String(v ?? '')
      if (!text) return <span className="text-[var(--color-dim2)]">—</span>
      // فیلدهای تلفن (یا عددی که شکل تلفن دارد) در Android تماس می‌گیرند و در Windows شماره‌گیر پیش‌فرض را باز می‌کنند.
      const phone = f.key.toLowerCase().includes('phone') || f.label.toLowerCase().includes('phone')
      const normalized = text.replace(/[\\s().-]/g, '')
      if (phone && /^\\+?[0-9]{7,15}$/.test(normalized)) {
        return <a href={\`tel:\${normalized}\`} onClick={e => e.stopPropagation()} className="inline-flex items-center gap-1 text-[var(--color-acc)] hover:underline ltr"><Icon name="Phone" size={12} />{text}</a>
      }
      // لینک‌هایی که در فیلد متنی وارد شده‌اند نیز بدون نیاز به تعیین نوع فیلد clickable هستند.
      const urlMatch = text.match(/^(https?:\\/\\/[^\\s]+|(?:www\\.)[^\\s]+)$/i)
      if (urlMatch) {
        const href = text.startsWith('http') ? text : \`https://\${text}\`
        return <a href={href} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="truncate block text-[var(--color-acc)] hover:underline ltr">{text}</a>
      }
      return <span className="truncate">{text}</span>`

const linkifyBlock = `const text = String(v ?? '')
      if (!text) return <span className="text-[var(--color-dim2)]">—</span>
      return <LinkifyText text={text} className="truncate" />`

const textareaBlock = `return <span className="text-[12px] text-[var(--color-dim)] line-clamp-1">{String(v ?? '') || '—'}</span>`
const textareaLinkify = `return <LinkifyText text={String(v ?? '') || '—'} className="text-[12px] text-[var(--color-dim)] line-clamp-1" />`

cell = cell.replace(textBlock, linkifyBlock)
cell = cell.replace(textareaBlock, textareaLinkify)

const newCode = `import { refLabel } from '../../store/useApp'

function LinkifyText({ text, className = '' }: { text: string; className?: string }) {
  if (text === '—' || !text) return <span className={className}>{text}</span>
  // تشخیص آدرس‌ها و شماره تلفن‌ها (مثل 0912... یا +98912...)
  const regex = /(https?:\\/\\/[^\\s()]+?(?=[.,!?:;]*(?:[\\s()\\[\\]]|$))|09\\d{9}|\\+\\d{10,14})/g
  const parts = text.split(regex)
  const matches = text.match(regex) || []
  
  if (matches.length === 0) return <span className={className}>{text}</span>

  const result = []
  for (let i = 0; i < parts.length; i++) {
    if (parts[i]) result.push(<span key={\`t-\${i}\`}>{parts[i]}</span>)
    if (matches[i]) {
       const m = matches[i]
       if (m.startsWith('http')) {
         result.push(<a key={\`m-\${i}\`} href={m} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[var(--color-acc)] hover:underline ltr inline-block">{m}</a>)
       } else {
         const norm = m.replace(/[\\s-]/g, '')
         result.push(<a key={\`m-\${i}\`} href={\`tel:\${norm}\`} onClick={e => e.stopPropagation()} className="text-[var(--color-acc)] hover:underline ltr inline-block" dir="ltr">{m}</a>)
       }
    }
  }
  return <span className={className}>{result}</span>
}

export function CellValue`

cell = cell.replace("import { refLabel } from '../../store/useApp'\n\nexport function CellValue", newCode)
fs.writeFileSync(path.join(__dirname, 'src/components/views/CellValue.tsx'), cell)

// 2. social.ts public proxy scraper logic
let social = fs.readFileSync(path.join(__dirname, 'src/lib/social.ts'), 'utf8')

const fetchLogic = `async function viaPublicProxy(url: string): Promise<SocialProfile | null> {
  const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(url)
  try {
    const res = await fetch(proxyUrl)
    if (!res.ok) return null
    const json = await res.json()
    const html = json.contents
    if (!html) return null

    const extract = (pattern: RegExp) => (html.match(pattern) || [])[1]?.trim() || ''
    const num = (pattern: RegExp) => {
      const match = (html.match(pattern) || [])[1]
      if (!match) return null
      const n = Number(match.replace(/[^\\d]/g, ''))
      return Number.isFinite(n) ? n : null
    }

    const title = extract(/<meta\\s+property="og:title"\\s+content="([^"]+)"/i)
    const desc = extract(/<meta\\s+property="og:description"\\s+content="([^"]+)"/i)

    let followers = null
    let name = title
    
    // Telegram
    if (url.includes('t.me')) {
      followers = num(/class="tgme_page_extra"[^>]*>([0-9\\sA-Za-z.,]+)(subscribers|members)/i)
      name = title || extract(/<div class="tgme_page_title".*?>\\s*<span[^>]*>(.*?)<\\/span>/i)
    }
    // YouTube
    else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      followers = num(/"subscriberCountText":\\{"accessibility":\\{"accessibilityData":\\{"label":"([^"]+) subscribers"/i) 
                  || num(/"subscriberCountText":\\{"simpleText":"([^"]+) subscribers"/i)
    }
    // Instagram (might fail due to login wall, but if works:)
    else if (url.includes('instagram.com')) {
      followers = num(/content="([0-9.,KMBkm]+)\\s+Followers/i)
      name = extract(/content=".*?See Instagram photos and videos from\\s+([^"]+)\\s+\\(@/i) || title
    }
    // SoundCloud
    else if (url.includes('soundcloud.com')) {
      followers = num(/"followers_count":\\s*(\\d+)/i)
    }
    // Spotify
    else if (url.includes('spotify.com')) {
      followers = num(/"followers":\\s*(?:\\{[^\\}]*"total":\\s*)?(\\d+)/i) || num(/followerCount":\\s*(\\d+)/i)
      name = title || extract(/<meta property="og:title" content="([^"]+)"/i)
    }

    return {
      name: name.replace(/\\s*-.*$/, ''), // clean up suffixes like " - YouTube"
      bio: desc,
      followers,
      following: null,
      posts: null,
      url,
      source: 'public proxy',
    }
  } catch {
    return null
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
}`

social = social.replace(/\/\*\*\n \* تلاش برای خواندن پروفایل[\s\S]*?return o\n\}/, fetchLogic)
fs.writeFileSync(path.join(__dirname, 'src/lib/social.ts'), social)
