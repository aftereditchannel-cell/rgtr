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
  theme: 'dark' | 'light'
  /** زبان رابط کاربری — پیش‌فرض فارسی */
  lang: Lang
  /** تقویم نمایشی: شمسی یا میلادی (ذخیره‌سازی همیشه میلادی است) */
  calendar: 'jalali' | 'gregorian'
  /** ارقام فارسی یا لاتین */
  digits: 'fa' | 'latn'
  cloud: CloudSettings
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
