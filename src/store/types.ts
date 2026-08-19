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
  /** ذخیره‌ی خودکار روی ابر بعد از هر تغییر (debounced) */
  autoSync: boolean
  /** دریافت خودکار از ابر هنگام باز شدن/بازگشت برنامه */
  autoPull: boolean
}

/** تنظیمات هوش مصنوعی — کلید API جدا (در localStorage) ذخیره می‌شود */
export interface AiSettings {
  provider: 'openai'
  /** آدرس پایه‌ی API (OpenAI یا سازگار با آن، مثل Groq/LocalAI) */
  baseUrl: string
  /** نام مدل پیش‌فرض */
  model: string
}

/** تنظیمات تشخیص خودکار داده‌ی شبکه‌های اجتماعی */
export interface SocialSettings {
  /** آدرس واسط (proxy) اختیاری برای خواندن پروفایل‌های عمومی — بدون آن تلاش مستقیم می‌شود */
  proxyUrl: string
  /** آیا هنگام باز شدن صفحه‌ی ماژول، فالوورها خودکار تازه شوند */
  autoRefresh: boolean
}

export interface Settings {
  ownerName: string
  orgName: string
  currency: string
  accent: string
  focusCount: number
  weights: Weights
  theme: 'dark' | 'light' | 'auto'
  /** پوسته‌ی شیشه‌ای (شفافیت بیشتر سطوح) */
  glass: boolean
  /** زبان رابط کاربری — پیش‌فرض فارسی */
  lang: Lang
  /** تقویم نمایشی: شمسی یا میلادی (ذخیره‌سازی همیشه میلادی است) */
  calendar: 'jalali' | 'gregorian'
  /** ارقام فارسی یا لاتین */
  digits: 'fa' | 'latn'
  /** بررسی و دانلود خودکار بروزرسانی (پیش‌فرض روشن) */
  autoUpdate?: boolean
  ai: AiSettings
  social: SocialSettings
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
