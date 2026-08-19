import type { SocialProvider } from '../types'
import { gwFetch, gwJSON } from '../../lib/gateway'
import { t } from '../fmt'

/**
 * Spotify (Artist)
 * =================
 * مسیر رسمی: Client Credentials (client_id + client_secret از داشبورد رایگان Spotify).
 * بدون کلید → فقط راهنما. داده‌ی جعلی ندارد.
 */

interface TokenResp { access_token?: string; error?: string }
interface ArtistResp {
  name?: string
  images?: Array<{ url: string }>
  followers?: { total?: number }
  popularity?: number
  genres?: string[]
  external_urls?: { spotify?: string }
}

export const spotifyProvider: SocialProvider = {
  id: 'spotify',
  label: 'Spotify',
  labelFa: 'اسپاتیفای',

  match(input) {
    const s = input.trim()
    let m = s.match(/^https?:\/\/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/i)
    if (m) return m[1]
    m = s.match(/^spotify:artist:([a-zA-Z0-9]+)/)
    if (m) return m[1]
    return null
  },

  async fetch(artistId, ctx) {
    const cid = ctx.key('spotify_client_id')
    const csec = ctx.key('spotify_client_secret')
    if (!cid || !csec) {
      throw new Error('Spotify needs your free API keys (developer.spotify.com/dashboard). Add them in Settings ← API & Integrations.')
    }
    // توکن رسمی Client Credentials
    const tokRes = await gwFetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: 'Basic ' + btoa(`${cid}:${csec}`),
      },
      body: 'grant_type=client_credentials',
    })
    const tok = JSON.parse(tokRes.body) as TokenResp
    if (!tok.access_token) throw new Error('Spotify auth failed — check client id/secret')

    const a = await gwJSON<ArtistResp>(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { Authorization: 'Bearer ' + tok.access_token },
    })
    return {
      platform: 'spotify',
      handle: artistId,
      displayName: a.name ?? null,
      avatar: a.images?.[0]?.url ?? null,
      url: a.external_urls?.spotify ?? `https://open.spotify.com/artist/${artistId}`,
      bio: a.genres?.join(', ') ?? null,
      stats: [
        { key: 'followers', label: 'Followers', value: a.followers?.total !== undefined ? t(a.followers.total) : null, unavailable: a.followers === undefined },
        { key: 'popularity', label: 'Popularity', value: a.popularity ?? null, unavailable: a.popularity === undefined },
        { key: 'genres', label: 'Genres', value: a.genres?.join(', ') ?? null },
      ],
      isPublic: true,
      fetchedAt: new Date().toISOString(),
      source: 'Spotify Web API (user keys)',
    }
  },
}
