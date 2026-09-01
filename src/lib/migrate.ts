import type { AppData, Settings, CloudSyncMeta } from '../store/types'
import { CORE_MODULES } from '../domain/schema'
import { DEFAULT_WEIGHTS } from '../domain/scoring'
import { DEFAULT_PROVIDERS, DEFAULT_AUTOMATIONS } from '../domain/ai'

export const CURRENT_VERSION = 8

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
    provider: 'googleDrive', googleScriptUrl: '', autoSync: true, autoPull: false,
    ...EMPTY_CLOUD_META,
    providerState: { googleDrive: { ...EMPTY_CLOUD_META } },
  },
}

export function migrate(input: unknown): AppData {
  const raw = (input ?? {}) as Partial<AppData>
  let v = Number(raw.version) || 0

  const rawSettings = (raw.settings ?? {}) as Partial<Settings>
  const activeCloudMeta = cloudMeta(rawSettings.cloud)
  const savedProviderState = (rawSettings.cloud as { providerState?: Partial<Record<'firebase' | 'googleDrive', unknown>> } | undefined)?.providerState
  const providerState = {
    googleDrive: v >= 5 ? cloudMeta(savedProviderState?.googleDrive) : { ...activeCloudMeta },
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
      cloud: {
        provider: 'googleDrive',
        googleScriptUrl: typeof (rawSettings.cloud as { googleScriptUrl?: unknown } | undefined)?.googleScriptUrl === 'string'
          ? (rawSettings.cloud as { googleScriptUrl: string }).googleScriptUrl : '',
        ...activeCloudMeta,
        providerState,
        autoSync: rawSettings.cloud?.autoSync !== false,
        autoPull: false,
      },
    },
    modules: Array.isArray(raw.modules) && raw.modules.length ? raw.modules : CORE_MODULES,
    records: (raw.records ?? {}) as AppData['records'],
    removedCore: Array.isArray(raw.removedCore) ? raw.removedCore.filter(k => typeof k === 'string') : [],
    seededAt: typeof raw.seededAt === 'string' ? raw.seededAt : undefined,
  }

  if (v < 1) {
    for (const m of data.modules) if (!Array.isArray(data.records[m.key])) data.records[m.key] = []
    v = 1
  }

  if (v < 2) {
    if (!data.seededAt) data.seededAt = new Date().toISOString()
    v = 2
  }

  if (v < 3) {
    const s = data.settings
    s.branding = { ...s.branding, appName: s.branding?.appName || 'NEXUS HQ' }
    s.social = { ...s.social }
    if (!Array.isArray(data.socialAccounts)) data.socialAccounts = []
    if (!Array.isArray(data.workflows)) data.workflows = []
    if (!Array.isArray(data.runLogs)) data.runLogs = []
    v = 3
  }

  if (v < 5) {
    data.settings.cloud.provider = 'googleDrive'
    data.settings.cloud.googleScriptUrl ||= ''
    v = 5
  }

  // v5 -> v6: Append new fields to existing core modules
  if (v < 6) {
    for (const cm of CORE_MODULES) {
      const existing = data.modules.find(m => m.key === cm.key)
      if (existing) {
        for (const cf of cm.fields) {
          if (!existing.fields.some(ef => ef.key === cf.key)) {
            existing.fields.push(cf)
          }
        }
      }
    }
    v = 6
  }

  // v6 -> v7: Rename releases to labels
  if (v < 7) {
    const rIdx = data.modules.findIndex(m => m.key === 'releases')
    const cmLabels = CORE_MODULES.find(m => m.key === 'labels')
    if (rIdx >= 0 && cmLabels) {
      data.modules[rIdx] = { ...cmLabels }
      data.records['labels'] = data.records['releases'] || []
      delete data.records['releases']
    } else if (cmLabels && !data.modules.some(m => m.key === 'labels')) {
      data.modules.push({ ...cmLabels })
      data.records['labels'] = []
    }
    v = 7
  }

  // v7 -> v8: Update artists.label to be a ref field instead of text
  if (v < 8) {
    const artistsMod = data.modules.find(m => m.key === 'artists')
    if (artistsMod) {
      const labelField = artistsMod.fields.find(f => f.key === 'label')
      if (labelField && labelField.type !== 'ref') {
        labelField.type = 'ref'
        labelField.refModule = 'labels'
      }
    }
    v = 8
  }

  data.settings.cloud.autoPull = false

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