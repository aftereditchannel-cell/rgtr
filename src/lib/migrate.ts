import type { AppData, Settings } from '../store/types'
import { CORE_MODULES } from '../domain/schema'
import { DEFAULT_WEIGHTS } from '../domain/scoring'
import { DEFAULT_PROVIDERS, DEFAULT_AUTOMATIONS } from '../domain/ai'

export const CURRENT_VERSION = 3

export const DEFAULT_SETTINGS: Settings = {
  ownerName: '',
  orgName: 'NEXUS HQ',
  currency: '$',
  accent: '#6366f1',
  focusCount: 3,
  theme: 'dark',
  lang: 'fa',
  calendar: 'jalali',
  digits: 'fa',
  weights: DEFAULT_WEIGHTS,
  cloud: { provider: 'gist', gistId: '', lastSync: '', askOnExit: true },
  branding: { appName: 'NEXUS HQ', tagline: 'Command Center' },
  social: {
    profiles: [],
    autoRefresh: true,
    intervalMin: 0,
    keys: {},
  },
  ai: {
    providers: DEFAULT_PROVIDERS.map(p => ({ ...p })),
    automations: DEFAULT_AUTOMATIONS.map(a => ({ ...a, history: [] })),
  },
}

/**
 * ادغام ارائه‌دهنده‌های پیش‌فرض با تنظیمات ذخیره‌شده:
 * کلیدهای کاربر حفظ می‌شود، و اگر پیش‌فرض‌ها عوض شده باشند به‌روز می‌شوند.
 */
function mergeProviders(def: import('../domain/ai').AIProvider[], saved: unknown) {
  const savedList = Array.isArray(saved) ? (saved as import('../domain/ai').AIProvider[]) : []
  const byId = new Map(savedList.map(p => [p.id, p]))
  const merged = def.map(p => ({ ...p, ...(byId.get(p.id) ?? {}) }))
  // ارائه‌دهنده‌های کاملاً سفارشی کاربر که در لیست پیش‌فرض نیستند
  for (const p of savedList) if (!def.some(d => d.id === p.id)) merged.push(p)
  return merged
}

/**
 * migration پله‌ای: هر بکاپ قدیمی همیشه قابل import می‌ماند.
 * برای نسخه‌های بعدی فقط یک case اضافه کنید.
 */
export function migrate(input: unknown): AppData {
  const raw = (input ?? {}) as Partial<AppData>
  let v = Number(raw.version) || 0

  const rawSettings = (raw.settings ?? {}) as Partial<Settings>
  const data: AppData = {
    version: CURRENT_VERSION,
    settings: {
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      weights: { ...DEFAULT_WEIGHTS, ...(rawSettings.weights ?? {}) },
      cloud: { ...DEFAULT_SETTINGS.cloud, ...(rawSettings.cloud ?? {}) },
      branding: { ...DEFAULT_SETTINGS.branding, ...(rawSettings.branding ?? {}) },
      social: {
        ...DEFAULT_SETTINGS.social,
        ...(rawSettings.social ?? {}),
        keys: { ...DEFAULT_SETTINGS.social.keys, ...((rawSettings.social as any)?.keys ?? {}) },
        profiles: Array.isArray((rawSettings.social as any)?.profiles)
          ? (rawSettings.social as any).profiles
          : DEFAULT_SETTINGS.social.profiles,
      },
      ai: {
        ...DEFAULT_SETTINGS.ai,
        ...(rawSettings.ai ?? {}),
        // ارائه‌دهنده‌های پیش‌فرض را با کلیدهای ذخیره‌شده‌ی کاربر ادغام کن
        providers: mergeProviders(
          DEFAULT_SETTINGS.ai.providers,
          (rawSettings.ai as any)?.providers,
        ),
        automations: Array.isArray((rawSettings.ai as any)?.automations)
          ? (rawSettings.ai as any).automations
          : DEFAULT_SETTINGS.ai.automations,
      },
    },
    modules: Array.isArray(raw.modules) && raw.modules.length ? raw.modules : CORE_MODULES,
    records: (raw.records ?? {}) as AppData['records'],
    removedCore: Array.isArray(raw.removedCore) ? raw.removedCore.filter(k => typeof k === 'string') : [],
    seededAt: typeof raw.seededAt === 'string' ? raw.seededAt : undefined,
  }

  // v0 → v1 : اطمینان از وجود آرایه برای هر ماژول
  if (v < 1) {
    for (const m of data.modules) if (!Array.isArray(data.records[m.key])) data.records[m.key] = []
    v = 1
  }

  // v1 → v2 : زبان/تقویم/ابر اضافه شد؛ داده‌ی قدیمی «seed شده» فرض می‌شود
  if (v < 2) {
    if (!data.seededAt) data.seededAt = new Date().toISOString()
    v = 2
  }

  // v2 → v3 : شبکه‌های اجتماعی، هوش مصنوعی و شخصی‌سازی برند اضافه شد
  if (v < 3) {
    v = 3
  }

  // ماژول‌های هسته‌ای جدید فقط وقتی اضافه می‌شوند که کاربر آن‌ها را حذف نکرده باشد.
  const removed = new Set(data.removedCore ?? [])
  const have = new Set(data.modules.map(m => m.key))
  for (const cm of CORE_MODULES) {
    if (!have.has(cm.key) && !removed.has(cm.key)) data.modules.push(cm)
  }
  for (const m of data.modules) if (!Array.isArray(data.records[m.key])) data.records[m.key] = []

  data.version = CURRENT_VERSION
  return data
}

export function validateBackup(obj: unknown): { ok: boolean; error?: string } {
  if (!obj || typeof obj !== 'object') return { ok: false, error: 'فایل JSON معتبر نیست / Invalid JSON file' }
  const o = obj as Record<string, unknown>
  if (!o.records || typeof o.records !== 'object') return { ok: false, error: 'کلید records پیدا نشد / Missing “records” key' }
  return { ok: true }
}
