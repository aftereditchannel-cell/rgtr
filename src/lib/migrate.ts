import type { AppData, Settings } from '../store/types'
import { CORE_MODULES } from '../domain/schema'
import { DEFAULT_WEIGHTS } from '../domain/scoring'

export const CURRENT_VERSION = 2

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
  // تا ماژول‌های پیش‌فرضِ عمداً حذف‌شده دوباره برنگردند.
  if (v < 2) {
    if (!data.seededAt) data.seededAt = new Date().toISOString()
    v = 2
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
