import type { ModuleDef } from '../domain/schema'
import type { Weights } from '../domain/scoring'

export interface Entity {
  id: string
  createdAt: string
  updatedAt: string
  [k: string]: unknown
}

export type Lang = 'fa' | 'en'

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
  /** پوسته — auto یعنی همراه با سیستم */
  theme: 'auto' | 'dark' | 'light'
  /** زبان رابط کاربری — پیش‌فرض فارسی */
  lang: Lang
  /** تقویم نمایشی: شمسی یا میلادی (ذخیره‌سازی همیشه میلادی است) */
  calendar: 'jalali' | 'gregorian'
  /** ارقام فارسی یا لاتین */
  digits: 'fa' | 'latn'
  cloud: CloudSettings
  /** پیکربندی AI (کلیدها جدا و امن نگه داشته می‌شوند) */
  ai: AISettings
  /** شخصی‌سازی ظاهر و نام برنامه */
  custom: Customization
  /** رفتار Refresh اطلاعات شبکه‌های اجتماعی */
  social: SocialSettings
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
  /* ---------- Social Analyzer & Automation ---------- */
  socialAccounts?: SocialAccount[]
  workflows?: Workflow[]
  runLogs?: RunLog[]
}

export interface Snapshot {
  id?: number
  at: string
  size: number
  data: AppData
}

/* ---------- Social Analyzer & Automation (v1.1) ---------- */

import type { PlatformId } from '../social/types'
import type { AIProviderId } from '../ai/providers'

export interface SocialAccount {
  id: string
  platform: PlatformId
  handle: string
  /** آخرین اطلاعات موفق — همان ساختاری که Provider داده */
  info: import('../social/types').SocialInfo
  addedAt: string
}

export interface WorkflowStep {
  /** fetch | ai | save */
  type: 'fetch' | 'ai' | 'save'
  prompt?: string
}

export interface Workflow {
  id: string
  name: string
  enabled: boolean
  /** ورودی‌های شبکه‌ی اجتماعی (URL یا @handle) */
  targets: string[]
  steps: WorkflowStep[]
  /** دقیقه بین اجراهای خودکار — 0 = دستی */
  intervalMin: number
  lastRunAt?: string
  lastStatus?: 'ok' | 'error' | 'partial'
  createdAt: string
}

export interface RunLog {
  id: string
  at: string
  kind: 'social' | 'workflow' | 'ai' | 'api'
  subject: string
  ok: boolean
  detail: string
}

export interface AISettings {
  provider: AIProviderId
  model: string
  enabled: boolean
}

export interface Customization {
  /** نام نمایشی برنامه — روی عنوان پنجره و هدر اعمال می‌شود */
  appName: string
  /** رنگ دوم (Secondary) — #RRGGBB */
  secondaryColor: string
  /** تغییر برچسب Platformها در UI */
  platformLabels: Record<string, string>
  /** تم شیشه‌ای (Acrylic) */
  glass: boolean
}

export interface SocialSettings {
  /** manual | open | 5 | 15 (دقیقه) */
  refreshMode: 'manual' | 'open' | '5' | '15'
}
