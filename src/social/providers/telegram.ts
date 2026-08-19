import type { SocialProvider } from '../types'
import { gwText } from '../../lib/gateway'

/**
 * Telegram
 * =========
 * منبع: صفحه‌ی پیش‌نمایش عمومی رسمی t.me (همان که تلگرام برای وب منتشر می‌کند).
 * بدون لاگین، بدون ربات، بدون دور زدن محدودیت — فقط متای og: عمومی.
 * تعداد اعضا فقط در صفحات عمومی قابل مشاهده است؛ اگر نبود «در دسترس نیست».
 */

function decode(s: string): string {
  return s
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .trim()
}

export const telegramProvider: SocialProvider = {
  id: 'telegram',
  label: 'Telegram',
  labelFa: 'تلگرام',

  match(input) {
    const s = input.trim()
    let m = s.match(/^https?:\/\/(t|telegram)\.me\/(s\/)?([^/?#\s]+)/i)
    if (m) return m[3]
    m = s.match(/^@([a-zA-Z][\w]{3,31})$/)
    if (m) return m[1]
    if (/^[a-zA-Z][\w]{3,31}$/.test(s) && !s.includes(' ')) return s
    return null
  },

  async fetch(handle) {
    const html = await gwText(`https://t.me/${handle}`)
    if (/>\s*If you have <strong>Telegram<\/strong>/.test(html) === false && !html.includes('tgme_page_')) {
      throw new Error('Channel/user not found on t.me')
    }
    const name = html.match(/<div class="tgme_page_title"[^>]*>\s*<span dir="auto">([^<]+)<\/span>/)?.[1]
      ?? html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? null
    const desc = html.match(/<div class="tgme_page_description[^"]*"[^>]*>([\s\S]*?)<\/div>/)?.[1]
      ?? html.match(/<meta property="og:description" content="([^"]*)"/)?.[1] ?? null
    const members = html.match(/<div class="tgme_page_extra"[^>]*>([\s\S]*?)<\/div>/)?.[1]
    const avatar = html.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? null
    const cleanMembers = members ? decode(members.replace(/<[^>]+>/g, '')) : null

    return {
      platform: 'telegram',
      handle,
      displayName: name ? decode(name) : null,
      avatar,
      url: `https://t.me/${handle}`,
      bio: desc ? decode(desc.replace(/<[^>]+>/g, '')) : null,
      stats: [
        { key: 'members', label: 'Subscribers', value: cleanMembers, unavailable: !cleanMembers },
        { key: 'type', label: 'Type', value: /channel/.test(html) ? 'Channel' : 'User/Bot preview' },
      ],
      isPublic: !!cleanMembers,
      fetchedAt: new Date().toISOString(),
      source: 't.me public preview (official)',
    }
  },
}
