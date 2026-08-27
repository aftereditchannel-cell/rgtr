import type { AppData, Settings, CloudSyncMeta } from '../store/types'
import { CORE_MODULES } from '../domain/schema'
import { DEFAULT_WEIGHTS } from '../domain/scoring'
import { DEFAULT_PROVIDERS, DEFAULT_AUTOMATIONS } from '../domain/ai'

export const CURRENT_VERSION = 5

const EMPTY_CLOUD_META: CloudSyncMeta = { lastSync: '', lastLocalChange: '', pendingSync: false, lastSyncError: '' }

function cloudMeta(value: unknown): CloudSyncMeta {
  const raw = (value ?? {}) as Partial<CloudSyncMeta>
  return {
    lastSync: typeof raw.lastSync === 'string' ? raw.lastSync : '',
    lastLocalChange: typeof raw.lastLocalChange === 'string' ? raw.lastLocalChange : '',
    pendingSync: raw.pendingSync === true,
    lastSyncError: typeof raw.lastSyncError === 'string' ? raw.lastSyncError : '',
  }
}

export const DEFAULT_SETTINGS: Settings = {
  ownerName: '',
  orgName: 'NEXUS HQ',
  currency: '$',
  accent: '#6366f1',
  focusCount: 3,
  theme: 'dark',
  glass: true,
  lang: 'fa',
  calendar: 'jalali',
  digits: 'fa',
  weights: DEFAULT_WEIGHTS,
  branding: { appName: 'NEXUS HQ' },
  social: { profiles: [], autoRefresh: true, intervalMin: 0, keys: {}, proxyUrl: '' },
  ai: {
    providers: DEFAULT_PROVIDERS,
    automations: DEFAULT_AUTOMATIONS,
    provider: 'openai',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    enabled: true,
  },
  cloud: {
    provider: 'firebase', cloudflareUrl: '', autoSync: true, autoPull: true,
    ...EMPTY_CLOUD_META,
    providerState: { firebase: { ...EMPTY_CLOUD_META }, cloudflare: { ...EMPTY_CLOUD_META } },
  },
}

/**
 * migration پله‌ای: هر بکاپ قدیمی همیشه قابل import می‌ماند.
 * برای نسخه‌های بعدی فقط یک case اضافه کنید.
 */
export function migrate(input: unknown): AppData {
  const raw = (input ?? {}) as Partial<AppData>
  let v = Number(raw.version) || 0

  const rawSettings = (raw.settings ?? {}) as Partial<Settings>
  const activeCloudMeta = cloudMeta(rawSettings.cloud)
  const savedProviderState = (rawSettings.cloud as { providerState?: Partial<Record<'firebase' | 'cloudflare', unknown>> } | undefined)?.providerState
  const providerState = v >= 5 ? {
    firebase: cloudMeta(savedProviderState?.firebase),
    cloudflare: cloudMeta(savedProviderState?.cloudflare),
  } : {
    firebase: { ...activeCloudMeta },
    cloudflare: { ...EMPTY_CLOUD_META },
  }
  const data: AppData = {
    version: CURRENT_VERSION,
    settings: {
      ...DEFAULT_SETTINGS,
      ...rawSettings,
      weights: { ...DEFAULT_WEIGHTS, ...rawSettings.weights },
      ai: {
        ...DEFAULT_SETTINGS.ai,
        ...rawSettings.ai,
        providers: Array.isArray((rawSettings.ai as { providers?: unknown })?.providers)
          ? (rawSettings.ai as { providers: typeof DEFAULT_PROVIDERS }).providers
          : DEFAULT_PROVIDERS,
        automations: Array.isArray((rawSettings.ai as { automations?: unknown })?.automations)
          ? (rawSettings.ai as { automations: typeof DEFAULT_AUTOMATIONS }).automations
          : DEFAULT_AUTOMATIONS,
      },
      social: { ...DEFAULT_SETTINGS.social, ...rawSettings.social },
      branding: { ...DEFAULT_SETTINGS.branding, ...rawSettings.branding },
      // Gist token/id هرگز وارد داده‌ی Firebase یا بکاپ جدید نمی‌شود.
      cloud: {
        provider: rawSettings.cloud?.provider === 'cloudflare' ? 'cloudflare' : 'firebase',
        cloudflareUrl: typeof (rawSettings.cloud as { cloudflareUrl?: unknown } | undefined)?.cloudflareUrl === 'string'
          ? (rawSettings.cloud as { cloudflareUrl: string }).cloudflareUrl : '',
        ...activeCloudMeta,
        providerState,
        autoSync: rawSettings.cloud?.autoSync !== false,
        autoPull: rawSettings.cloud?.autoPull !== false,
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
  // تا ماژول‌های پیش‌فرضِ عمداً حذف‌شده دوباره برنگردند.
  if (v < 2) {
    if (!data.seededAt) data.seededAt = new Date().toISOString()
    v = 2
  }

  // v2 → v3 : برند، مرکز شبکه‌های اجتماعی، AI/اتوماسیون و جریان‌های کاری اضافه شد
  if (v < 3) {
    const s = data.settings
    s.branding = { ...s.branding, appName: s.branding?.appName || 'NEXUS HQ' }
    s.social = {
      ...s.social,
      autoRefresh: s.social?.autoRefresh ?? true,
      intervalMin: s.social?.intervalMin ?? 0,
      keys: s.social?.keys ?? {},
      proxyUrl: s.social?.proxyUrl ?? '',
      profiles: Array.isArray(s.social?.profiles) ? s.social.profiles : [],
    }
    s.ai = {
      ...s.ai,
      providers: DEFAULT_PROVIDERS,
      automations: DEFAULT_AUTOMATIONS,
      provider: 'openai',
      model: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
      enabled: true,
    }
    if (!Array.isArray(data.socialAccounts)) data.socialAccounts = []
    if (!Array.isArray(data.workflows)) data.workflows = []
    if (!Array.isArray(data.runLogs)) data.runLogs = []
    v = 3
  }

  // v3/v4 → v5: سرویس Cloudflare اختیاری اضافه شد؛ Firebase انتخاب پیش‌فرض
  // باقی می‌ماند تا هیچ نصب یا بکاپ قدیمی رفتار متفاوتی پیدا نکند.
  if (v < 5) {
    data.settings.cloud.provider = 'firebase'
    data.settings.cloud.cloudflareUrl ||= ''
    v = 5
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
