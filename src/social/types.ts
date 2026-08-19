/**
 * معماری Social Analyzer — ماژولار
 * ==================================
 * هر Platform یک Provider مستقل است:
 *   match(urlOrHandle) → شناسایی
 *   fetch(handle, keys) → داده‌ی واقعی از منبع قانونی (API رسمی/عمومی)
 * اگر داده‌ای در دسترس نیست، داده‌ی ساختگی نشان داده نمی‌شود —
 * فیلد unavailable ذکر می‌شود.
 */

export type PlatformId = 'instagram' | 'youtube' | 'telegram' | 'soundcloud' | 'spotify'

export interface StatItem { key: string; label: string; value: string | number | null; unavailable?: boolean }

export interface SocialInfo {
  platform: PlatformId
  handle: string
  displayName: string | null
  avatar: string | null
  url: string
  bio: string | null
  stats: StatItem[]
  isPublic: boolean | null
  fetchedAt: string
  /** منبع داده — برای صداقت نمایش داده می‌شود */
  source: string
  /** اگر کلید API لازم است و موجود نیست */
  needsKey?: string
}

export interface ProviderContext {
  /** کلیدهای کاربر — با getKey از مخزن امن */
  key: (name: string) => string | null
}

export interface SocialProvider {
  id: PlatformId
  label: string
  labelFa: string
  /** الگوی شناسایی URL/هندل */
  match(input: string): string | null  // هندل استخراج‌شده یا null
  /** دریافت اطلاعات — باید پرتاب خطای واضح کند، نه داده‌ی جعلی */
  fetch(handle: string, ctx: ProviderContext): Promise<SocialInfo>
}

/* ---------- تشخیص خودکار Platform از ورودی کاربر ---------- */

export function detectPlatform(input: string): { platform: PlatformId; handle: string } | null {
  const s = input.trim()
  if (!s) return null
  for (const p of PROVIDERS) {
    const h = p.match(s)
    if (h) return { platform: p.id, handle: h }
  }
  return null
}

import { PROVIDERS } from './registry'
