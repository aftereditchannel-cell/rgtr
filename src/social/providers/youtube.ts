import type { SocialProvider } from '../types'
import { gwJSON, gwText } from '../../lib/gateway'
import { t } from '../fmt'

/**
 * YouTube
 * ========
 * دو مسیر قانونی:
 *  ۱) بدون کلید — فید RSS عمومی رسمی (youtube.com/feeds) ← نام کانال + آخرین ویدیوها + شناسه
 *  ۲) با کلید YouTube Data API v3 کاربر ← Subscribers/Views/Video count کامل
 * داده‌ی جعلی نشان داده نمی‌شود؛ آمار بدون کلید «در دسترس نیست» علامت می‌خورد.
 */

interface YTChannelsResponse {
  items?: Array<{
    id: string
    snippet?: { title?: string; description?: string; thumbnails?: Record<string, { url?: string }> }
    statistics?: { subscriberCount?: string; videoCount?: string; viewCount?: string; hiddenSubscriberCount?: boolean }
  }>
}

function stat(key: string, label: string, v: string | number | null | undefined, unavailableIfMissing = true) {
  if (v === undefined || v === null || v === '') return { key, label, value: null, unavailable: unavailableIfMissing }
  return { key, label, value: typeof v === 'string' ? t(v) : v }
}

export const youtubeProvider: SocialProvider = {
  id: 'youtube',
  label: 'YouTube',
  labelFa: 'یوتیوب',

  match(input) {
    const s = input.trim()
    // https://youtube.com/channel/UCxxx | /c/name | /@handle | /user/name
    let m = s.match(/^https?:\/\/(www\.|m\.)?youtube\.com\/channel\/([^/?#\s]+)/i)
    if (m) return m[2]
    m = s.match(/^https?:\/\/(www\.|m\.)?youtube\.com\/@([^/?#\s]+)/i)
    if (m) return '@' + m[2]
    m = s.match(/^https?:\/\/(www\.|m\.)?youtube\.com\/(c|user)\/([^/?#\s]+)/i)
    if (m) return '@' + m[3]
    m = s.match(/^https?:\/\/youtu\.be\/([^/?#\s]+)/i)
    if (m) return m[1]
    if (/^@[\w.-]{3,}$/.test(s) && s.length <= 40) return s
    return null
  },

  async fetch(handle, ctx) {
    const apiKey = ctx.key('youtube')
    const channelId = handle.startsWith('UC') && handle.length === 24 ? handle : null

    // --- مسیر ۲: Data API (کامل‌ترین آمار) ---
    if (apiKey && (channelId || handle.startsWith('@'))) {
      try {
        const q = new URLSearchParams({ part: 'snippet,statistics', key: apiKey })
        if (channelId) q.set('id', channelId)
        else q.set('forHandle', handle.replace('@', ''))
        const j = await gwJSON<YTChannelsResponse>(`https://www.googleapis.com/youtube/v3/channels?${q}`)
        const item = j.items?.[0]
        if (item) {
          return {
            platform: 'youtube',
            handle: channelId ?? handle,
            displayName: item.snippet?.title ?? null,
            avatar: item.snippet?.thumbnails?.default?.url ?? null,
            url: `https://youtube.com/channel/${item.id}`,
            bio: item.snippet?.description?.slice(0, 300) ?? null,
            stats: [
              stat('subs', 'Subscribers', item.statistics?.hiddenSubscriberCount ? null : t(item.statistics?.subscriberCount ?? '')),
              stat('videos', 'Videos', t(item.statistics?.videoCount ?? '')),
              stat('views', 'Total views', t(item.statistics?.viewCount ?? '')),
            ],
            isPublic: true,
            fetchedAt: new Date().toISOString(),
            source: 'YouTube Data API v3',
          }
        }
      } catch { /* افتادیم روی RSS */ }
    }

    // --- مسیر ۱: RSS عمومی رسمی (بدون کلید) ---
    if (channelId) {
      const xml = await gwText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`)
      const title = xml.match(/<author>.*?<name>([^<]+)<\/name>/s)?.[1] ?? null
      const vids = Array.from(xml.matchAll(/<entry>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<published>([^<]+)<\/published>/g)).slice(0, 5)
      return {
        platform: 'youtube',
        handle,
        displayName: title,
        avatar: null,
        url: `https://youtube.com/channel/${channelId}`,
        bio: null,
        stats: [
          stat('subs', 'Subscribers', null),
          stat('videos', 'Videos', null),
          stat('views', 'Total views', null),
          { key: 'recent', label: 'Latest videos', value: vids.map(v => v[1]).join(' · ') || null },
        ],
        isPublic: true,
        fetchedAt: new Date().toISOString(),
        source: 'YouTube public RSS feed',
        needsKey: apiKey ? undefined : 'youtube',
      }
    }

    throw new Error(
      apiKey
        ? 'Channel not found via Data API — paste the /channel/UC… URL for exact match'
        : 'Without a YouTube API key only /channel/UC… URLs are supported (RSS). Add a key in Settings ← API for full stats.',
    )
  },
}
