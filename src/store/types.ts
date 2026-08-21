import type { ModuleDef } from '../domain/schema'
import type { Weights } from '../domain/scoring'
import type { SocialProfile } from '../domain/social'
import type { AIProvider, AutomationTask } from '../domain/ai'
import type { PlatformId } from '../social/types'

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
  /** رنگ دوم (Secondary) — #RRGGBB */
  secondaryColor?: string
  /** تغییر برچسب پلتفرم‌ها در UI */
  platformLabels?: Record<string, string>
}

export type Theme = 'dark' | 'light' | 'auto'

/** کلیدهای API اختیاری برای واکشی شبکه‌های اجتماعی */
export interface SocialKeys {
  youtube?: string
  instagram?: string
  rapidapi?: string
}

/** وضعیت مرکز شبکه‌های اجتماعی (Social Hub) */
export interface SocialState {
  profiles: SocialProfile[]
  /** رفرش خودکار هنگام باز شدن صفحه */
  autoRefresh: boolean
  /** بازه‌ی رفرش خودکار (دقیقه) — 0 یعنی فقط هنگام ورود به صفحه */
  intervalMin: number
  keys: SocialKeys
  /** آدرس واسط (proxy) اختیاری برای خواندن پروفایل‌های عمومی ماژول‌ها */
  proxyUrl: string
}

/** وضعیت هوش مصنوعی و اتوماسیون — اجتماع همه‌ی نسخه‌ها */
export interface AIState {
  /** ارائه‌دهنده‌های چت (Groq / OpenRouter / Gemini / Together / سفارشی) */
  providers: AIProvider[]
  /** تسک‌های اتوماسیون قالبی */
  automations: AutomationTask[]
  /** ارائه‌دهنده‌ی AI برای جریان‌های کاری و Agent Runner */
  provider: 'openai' | 'gemini' | 'anthropic' | string
  /** نام مدل پیش‌فرض برای Agent Runner / workflows */
  model: string
  /** آدرس پایه‌ی API (OpenAI یا سازگار با آن، مثل Groq/LocalAI) */
  baseUrl: string
  /** فعال بودن AI در جریان‌های کاری */
  enabled: boolean
}

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

/** تنظیمات هوش مصنوعی Agent Runner — کلید API جدا (در localStorage) ذخیره می‌شود */
export interface AiSettings {
  provider: 'openai'
  /** آدرس پایه‌ی API (OpenAI یا سازگار با آن، مثل Groq/LocalAI) */
  baseUrl: string
  /** نام مدل پیش‌فرض */
  model: string
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
  /** شخصی‌سازی برند */
  branding: Branding
  /** وضعیت مرکز شبکه‌های اجتماعی */
  social: SocialState
  /** وضعیت هوش مصنوعی و اتوماسیون */
  ai: AIState
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
