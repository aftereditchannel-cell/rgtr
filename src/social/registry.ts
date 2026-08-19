import type { SocialProvider, PlatformId } from './types'
import { instagramProvider } from './providers/instagram'
import { youtubeProvider } from './providers/youtube'
import { telegramProvider } from './providers/telegram'
import { soundcloudProvider } from './providers/soundcloud'
import { spotifyProvider } from './providers/spotify'

/** رجیستری Providerها — افزودن Platform جدید = افزودن یک فایل به این لیست */
export const PROVIDERS: SocialProvider[] = [
  youtubeProvider,
  telegramProvider,
  soundcloudProvider,
  spotifyProvider,
  instagramProvider,
]

export function providerById(id: PlatformId): SocialProvider | undefined {
  return PROVIDERS.find(p => p.id === id)
}

export function platformLabel(id: PlatformId, lang: string, overrides?: Record<string, string>): string {
  if (overrides?.[id]) return overrides[id]
  const p = providerById(id)
  return (lang === 'fa' ? p?.labelFa : p?.label) ?? id
}
