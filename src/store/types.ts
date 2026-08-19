import type { ModuleDef } from '../domain/schema'
import type { Weights } from '../domain/scoring'
import type { SocialProfile } from '../domain/social'
import type { AIProvider, AutomationTask } from '../domain/ai'

export interface Entity {
  id: string
  createdAt: string
  updatedAt: string
  [k: string]: unknown
}

export type Lang = 'fa' | 'en'

/** شخصی‌سازی برند — نام، لوگو و رنگ قابل تغییر کامل */
export interface Branding {
  appName: string
  /** data URL لوگوی آپلودی (پیش‌نمایش در سایدبار) */
  logo?: string
  /** data URL آیکون بزرگ برای تولید آیکون اپ */
  appIcon?: string
  tagline?: string
}

export type Theme = 'dark' | 'light' | 'auto'

/** کلیدهای API اختیاری برای واکش شبکه‌های اجتماعی */
export interface SocialKeys {
  youtube?: string
  instagram?: string
  rapidapi?: string
}

export interface SocialState {
  profiles: SocialProfile[]
  /** رفرش خودکار هنگام باز شدن صفحه */
  autoRefresh: boolean
  /** بازه‌ی رفرش خودکار (دقیقه) — 0 یعنی فقط هنگام ورود به صفحه */
  intervalMin: number
  keys: SocialKeys
}

export interface AIState {
  providers: AIProvider[]
  automations: AutomationTask[]
}

/** تنظیمات همگام‌سازی ابری — توکن اینجا ذخیره نمی‌شود (جدا و خارج از بکاپ) */
export interface CloudSettings {
  provider: 'gist'
  gistId: string
  /** آخرین همگام‌سازی موفق (ISO) */
  lastSync: string
  /** هنگام خروج از برنامه بپرسد */
  askOnExit: boolean
}

export interface Settings {
  ownerName: string
  orgName: string
  currency: string
  accent: string
  focusCount: number
  weights: Weights
  theme: Theme
  /** زبان رابط کاربری — پیش‌فرض فارسی */
  lang: Lang
  /** شخصی‌سازی نام/لوگو */
  branding: Branding
  /** تقویم نمایشی: شمسی یا میلادی (ذخیره‌سازی همیشه میلادی است) */
  calendar: 'jalali' | 'gregorian'
  /** ارقام فارسی یا لاتین */
  digits: 'fa' | 'latn'
  cloud: CloudSettings
  social: SocialState
  ai: AIState
}

export interface AppData {
  version: number
  settings: Settings
  modules: ModuleDef[]
  records: Record<string, Entity[]>
  /**
   * کلید ماژول‌های پیش‌فرضی که کاربر عمداً حذف کرده است.
   * migrate از روی این فهرست جلوی برگشتن دوباره‌ی آن‌ها را می‌گیرد.
   */
  removedCore?: string[]
  /** زمان اولین seed — وجودش یعنی دیگر نباید داده‌ی نمونه ساخته شود */
  seededAt?: string
}

export interface Snapshot {
  id?: number
  at: string
  size: number
  data: AppData
}
