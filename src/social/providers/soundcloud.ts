import type { SocialProvider } from '../types'
import { gwJSON } from '../../lib/gateway'
import { t } from '../fmt'

/**
 * SoundCloud
 * ===========
 * API رسمی v2 — نیازمند client_id (ثبت‌نام رایگان خود کاربر).
 * بدون کلید، هیچ داده‌ای نمایش داده نمی‌شود (فقط راهنما).
 */

interface SCUser {
  username?: string
  avatar_url?: string
  permalink_url?: string
  description?: string
  followers_count?: number
  followings_count?: number
  track_count?: number
  public_favorites_count?: number
}

export const soundcloudProvider: SocialProvider = {
  id: 'soundcloud',
  label: 'SoundCloud',
  labelFa: 'ساندکلاد',

  match(input) {
    const s = input.trim()
    let m = s.match(/^https?:\/\/(www\.)?soundcloud\.com\/([^/?#\s]+)/i)
    if (m) return m[2]
    if (/^[a-zA-Z0-9_-]{2,25}$/.test(s) && !s.includes(' ')) return s
    return null
  },

  async fetch(handle, ctx) {
    const clientId = ctx.key('soundcloud')
    if (!clientId) {
      throw new Error('SoundCloud requires your own free client_id (soundcloud.com/you/apps). Add it in Settings ← API & Integrations.')
    }
    const j = await gwJSON<SCUser[]>(
      `https://api-v2.soundcloud.com/users/by-url?url=https://soundcloud.com/${handle}&client_id=${encodeURIComponent(clientId)}`,
    )
    const u = Array.isArray(j) ? j[0] : (j as unknown as SCUser)
    if (!u || !u.username) throw new Error('User not found on SoundCloud')
    return {
      platform: 'soundcloud',
      handle,
      displayName: u.username,
      avatar: u.avatar_url ?? null,
      url: u.permalink_url ?? `https://soundcloud.com/${handle}`,
      bio: u.description?.slice(0, 300) ?? null,
      stats: [
        { key: 'followers', label: 'Followers', value: t(u.followers_count ?? 0) },
        { key: 'following', label: 'Following', value: t(u.followings_count ?? 0) },
        { key: 'tracks', label: 'Tracks', value: t(u.track_count ?? 0) },
        { key: 'likes', label: 'Public likes', value: u.public_favorites_count !== undefined ? t(u.public_favorites_count) : null, unavailable: u.public_favorites_count === undefined },
      ],
      isPublic: true,
      fetchedAt: new Date().toISOString(),
      source: 'SoundCloud API v2 (user key)',
    }
  },
}
