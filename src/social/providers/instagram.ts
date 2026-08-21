import type { SocialProvider } from '../types'

/**
 * Instagram
 * ==========
 * صداقت کامل: اینستاگرام برای داده‌های پروفایل دیگران «هیچ API عمومی» ارائه نمی‌دهد؛
 * Instagram Graph API فقط برای اکانت‌های Business متصل خودِ کاربر است و
 * oEmbed هم توکن می‌خواهد. بنابراین این Adapter عمداً داده برنمی‌گرداند —
 * نه اسکرپ غیرقانونی، نه داده‌ی ساختگی. اگر کاربر Graph API Token داشته باشد،
 * آمار اکانت Business خودش قابل دریافت است (مسیر رسمی).
 */

import { gwJSON } from '../../lib/gateway'

interface IGMe {
  username?: string
  name?: string
  followers_count?: number
  media_count?: number
  profile_picture_url?: string
}

export const instagramProvider: SocialProvider = {
  id: 'instagram',
  label: 'Instagram',
  labelFa: 'اینستاگرام',

  match(input) {
    const s = input.trim()
    let m = s.match(/^https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9._]{1,30})\/?$/i)
    if (m) return m[2]
    m = s.match(/^@([a-zA-Z0-9._]{1,30})$/)
    if (m) return m[1]
    if (/^[a-zA-Z0-9._]{1,30}$/.test(s) && !s.includes(' ')) return s
    return null
  },

  async fetch(handle, ctx) {
    const token = ctx.key('instagram_graph_token')
    if (!token) {
      // پیام صادقانه — داده‌ی جعلی نه
      throw new Error(
        'Instagram offers no public profile API. Legal options: (1) your own Business account via Instagram Graph API token in Settings ← API, (2) official Instagram app. No fake data is shown.',
      )
    }
    // مسیر رسمی Graph API — مخصوص اکانت Business خود کاربر
    const j = await gwJSON<IGMe>(`https://graph.instagram.com/v21.0/me?fields=username,name,followers_count,media_count,profile_picture_url&access_token=${encodeURIComponent(token)}`)
    return {
      platform: 'instagram',
      handle: j.username ?? handle,
      displayName: j.name ?? j.username ?? null,
      avatar: j.profile_picture_url ?? null,
      url: `https://instagram.com/${j.username ?? handle}`,
      bio: 'Own business account (Graph API)',
      stats: [
        { key: 'followers', label: 'Followers', value: j.followers_count ?? null, unavailable: j.followers_count === undefined },
        { key: 'posts', label: 'Posts', value: j.media_count ?? null, unavailable: j.media_count === undefined },
      ],
      isPublic: true,
      fetchedAt: new Date().toISOString(),
      source: 'Instagram Graph API (own account)',
    }
  },
}
