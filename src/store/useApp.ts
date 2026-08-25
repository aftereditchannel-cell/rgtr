import { create } from 'zustand'
import type { AppData, Entity, Settings, SocialAccount, Workflow, RunLog, SocialState } from './types'
import type { ModuleDef } from '../domain/schema'
import type { AIProvider, AutomationTask } from '../domain/ai'
import type { SocialProfile } from '../domain/social'
import type { SocialInfo } from '../social/types'
import { emptyRecord, CORE_MODULES } from '../domain/schema'
import { seedData, emptyData } from '../domain/seed'
import { loadDoc, saveDoc, pushSnapshot } from '../lib/db'
import { migrate } from '../lib/migrate'
import { uid, nowISO } from '../lib/id'
import * as cloud from '../lib/cloud'
import { cloudError, tr } from '../i18n'

interface Store {
  data: AppData
  ready: boolean
  dirty: boolean
  toast: string | null

  init: () => Promise<void>
  persist: () => Promise<void>
  setToast: (t: string | null) => void

  add: (moduleKey: string, patch?: Record<string, unknown>) => string
  update: (moduleKey: string, id: string, patch: Record<string, unknown>) => void
  remove: (moduleKey: string, id: string) => void
  duplicate: (moduleKey: string, id: string) => void
  reorder: (moduleKey: string, id: string, targetGroup: string, groupBy: string) => void

  addModule: (m: ModuleDef) => void
  updateModule: (key: string, patch: Partial<ModuleDef>) => void
  removeModule: (key: string) => void
  /** ماژول‌های پیش‌فرضِ حذف‌شده را برمی‌گرداند و تعدادشان را می‌دهد */
  restoreCoreModules: () => number

  /* ---------- AI / اتوماسیون ---------- */
  upsertProvider: (p: AIProvider) => void
  removeProvider: (id: string) => void
  addAutomation: (a: AutomationTask) => void
  updateAutomation: (id: string, patch: Partial<AutomationTask>) => void
  removeAutomation: (id: string) => void

  /* ---------- Social Hub (مرکز شبکه‌های اجتماعی) ---------- */
  setSocial: (patch: Partial<SocialState>) => void
  upsertProfile: (p: SocialProfile) => void
  removeProfile: (id: string) => void

  /* ---------- Social Analyzer & Automation ---------- */
  upsertSocial: (info: SocialInfo) => void
  removeSocial: (id: string) => void
  getSocial: () => SocialAccount[]
  upsertWorkflow: (w: Workflow) => void
  removeWorkflow: (id: string) => void
  getWorkflows: () => Workflow[]
  pushLog: (l: Omit<RunLog, 'id' | 'at'>) => void
  getLogs: () => RunLog[]

  setSettings: (patch: Partial<Settings>) => void
  replaceAll: (d: AppData) => Promise<void>
  loadSeed: () => Promise<void>
  clearAll: () => Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null
let syncTimer: ReturnType<typeof setTimeout> | null = null
let pushInFlight = false
let stopLiveSync: (() => void) | null = null

export const useApp = create<Store>((set, get) => {
  /** ذخیره‌ی خودکار Firebase بعد از هر تغییر؛ ذخیره‌ی محلی همیشه اول انجام می‌شود. */
  const scheduleCloudPush = () => {
    const c = get().data.settings.cloud
    if (!c.autoSync || !cloud.isCloudReady()) return
    if (syncTimer) clearTimeout(syncTimer)
    // هر ویرایش سریع را در یک ارسال جمع می‌کنیم تا هم حس لحظه‌ای داشته باشد و هم Firestore بی‌دلیل هزینه نسازد.
    syncTimer = setTimeout(() => { void autoPush() }, 900)
  }

  const autoPush = async () => {
    if (pushInFlight) return
    pushInFlight = true
    await get().persist()
    const lang = get().data.settings.lang ?? 'fa'
    try {
      const updatedAt = await cloud.pushCloudData(get().data)
      // مستقیم با set تا sync دوباره زمان‌بندی و حلقه ایجاد نکند.
      set(s => ({ data: { ...s.data, settings: { ...s.data.settings, cloud: { ...s.data.settings.cloud, lastSync: updatedAt } } } }))
      get().setToast(tr(lang, 'set.cloudPushed'))
    } catch (error) {
      const cloudErr = cloud.mapCloudError(error)
      const detail = cloudErr.detail ? ` — ${tr(lang, 'sync.errorCode')}: ${cloudErr.detail}` : ''
      get().setToast(`${tr(lang, 'sync.failed')}: ${cloudError(lang, cloudErr.code)}${detail}`)
    } finally { pushInFlight = false }
  }

  const touch = () => {
    // زمان تغییر محلی جدا از lastSync است؛ auto-pull فقط داده‌ای را جایگزین می‌کند
    // که واقعاً از آخرین ویرایش این دستگاه جدیدتر باشد.
    const changedAt = new Date().toISOString()
    set(s => ({ dirty: true, data: { ...s.data, settings: { ...s.data.settings, cloud: { ...s.data.settings.cloud, lastLocalChange: changedAt } } } }))
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => { void get().persist() }, 400)
    scheduleCloudPush()
  }

  return {
    data: emptyData(),
    ready: false,
    dirty: false,
    toast: null,

    async init() {
      const stored = await loadDoc()
      // seededAt تضمین می‌کند داده‌ی نمونه فقط یک‌بار در عمر نصب ساخته شود؛
      // اگر کاربر همه‌چیز را پاک کند، دوباره برنمی‌گردد.
      const data = stored ? migrate(stored) : seedData()
      set({ data, ready: true })
      if (!stored) await saveDoc(data)
    },

    async persist() {
      const { data } = get()
      await saveDoc(data)
      set({ dirty: false })
    },

    setToast: (t) => {
      set({ toast: t })
      if (t) setTimeout(() => { if (get().toast === t) set({ toast: null }) }, 2600)
    },

    add(moduleKey, patch = {}) {
      const id = uid()
      const m = get().data.modules.find(x => x.key === moduleKey)
      const base = m ? emptyRecord(m) : {}
      const row: Entity = { ...base, ...patch, id, createdAt: nowISO(), updatedAt: nowISO() } as Entity
      set(s => ({
        data: { ...s.data, records: { ...s.data.records, [moduleKey]: [row, ...(s.data.records[moduleKey] ?? [])] } },
      }))
      touch()
      return id
    },

    update(moduleKey, id, patch) {
      set(s => ({
        data: {
          ...s.data,
          records: {
            ...s.data.records,
            [moduleKey]: (s.data.records[moduleKey] ?? []).map(r =>
              r.id === id ? { ...r, ...patch, updatedAt: nowISO() } : r),
          },
        },
      }))
      touch()
    },

    remove(moduleKey, id) {
      set(s => ({
        data: {
          ...s.data,
          records: { ...s.data.records, [moduleKey]: (s.data.records[moduleKey] ?? []).filter(r => r.id !== id) },
        },
      }))
      touch()
    },

    duplicate(moduleKey, id) {
      const src = (get().data.records[moduleKey] ?? []).find(r => r.id === id)
      if (!src) return
      get().add(moduleKey, { ...src, id: undefined })
    },

    reorder(moduleKey, id, targetGroup, groupBy) {
      get().update(moduleKey, id, { [groupBy]: targetGroup })
    },

    addModule(m) {
      set(s => ({
        data: { ...s.data, modules: [...s.data.modules, m], records: { ...s.data.records, [m.key]: [] } },
      }))
      touch()
    },

    updateModule(key, patch) {
      set(s => ({ data: { ...s.data, modules: s.data.modules.map(m => (m.key === key ? { ...m, ...patch } : m)) } }))
      touch()
    },

    removeModule(key) {
      set(s => {
        const records = { ...s.data.records }
        delete records[key]
        // اگر ماژول پیش‌فرض بود، علامت بزن تا migrate دوباره برش نگرداند
        const isCore = CORE_MODULES.some(m => m.key === key)
        const removedCore = isCore
          ? Array.from(new Set([...(s.data.removedCore ?? []), key]))
          : (s.data.removedCore ?? [])
        return {
          data: { ...s.data, modules: s.data.modules.filter(m => m.key !== key), records, removedCore },
        }
      })
      touch()
    },

    restoreCoreModules() {
      const s = get().data
      const have = new Set(s.modules.map(m => m.key))
      const missing = CORE_MODULES.filter(m => !have.has(m.key))
      if (!missing.length) return 0
      set(st => {
        const records = { ...st.data.records }
        for (const m of missing) if (!Array.isArray(records[m.key])) records[m.key] = []
        return {
          data: { ...st.data, modules: [...st.data.modules, ...missing], records, removedCore: [] },
        }
      })
      touch()
      return missing.length
    },

    /* ---------- AI / اتوماسیون ---------- */

    upsertProvider(p) {
      set(s => {
        const list = s.data.settings.ai.providers
        const next = list.some(x => x.id === p.id) ? list.map(x => x.id === p.id ? p : x) : [...list, p]
        return { data: { ...s.data, settings: { ...s.data.settings, ai: { ...s.data.settings.ai, providers: next } } } }
      })
      touch()
    },

    removeProvider(id) {
      set(s => ({
        data: {
          ...s.data,
          settings: {
            ...s.data.settings,
            ai: { ...s.data.settings.ai, providers: s.data.settings.ai.providers.filter(p => p.id !== id) },
          },
        },
      }))
      touch()
    },

    addAutomation(a) {
      set(s => ({
        data: {
          ...s.data,
          settings: {
            ...s.data.settings,
            ai: { ...s.data.settings.ai, automations: [a, ...s.data.settings.ai.automations] },
          },
        },
      }))
      touch()
    },

    updateAutomation(id, patch) {
      set(s => ({
        data: {
          ...s.data,
          settings: {
            ...s.data.settings,
            ai: {
              ...s.data.settings.ai,
              automations: s.data.settings.ai.automations.map(a => a.id === id ? { ...a, ...patch } : a),
            },
          },
        },
      }))
      touch()
    },

    removeAutomation(id) {
      set(s => ({
        data: {
          ...s.data,
          settings: {
            ...s.data.settings,
            ai: { ...s.data.settings.ai, automations: s.data.settings.ai.automations.filter(a => a.id !== id) },
          },
        },
      }))
      touch()
    },

    /* ---------- Social Hub (مرکز شبکه‌های اجتماعی) ---------- */

    setSocial(patch) {
      set(s => ({ data: { ...s.data, settings: { ...s.data.settings, social: { ...s.data.settings.social, ...patch } } } }))
      touch()
    },

    upsertProfile(p) {
      set(s => {
        const list = s.data.settings.social.profiles
        const next = list.some(x => x.id === p.id) ? list.map(x => x.id === p.id ? p : x) : [p, ...list]
        return {
          data: {
            ...s.data,
            settings: { ...s.data.settings, social: { ...s.data.settings.social, profiles: next.slice(0, 200) } },
          },
        }
      })
      touch()
    },

    removeProfile(id) {
      set(s => ({
        data: {
          ...s.data,
          settings: {
            ...s.data.settings,
            social: { ...s.data.settings.social, profiles: s.data.settings.social.profiles.filter(p => p.id !== id) },
          },
        },
      }))
      touch()
    },

    /* ---------- Social Analyzer & Automation ---------- */

    upsertSocial(info) {
      set(s => {
        const list = s.data.socialAccounts ?? []
        const existing = list.find(a => a.platform === info.platform && a.handle.toLowerCase() === info.handle.toLowerCase())
        const acc: SocialAccount = existing
          ? { ...existing, info }
          : { id: uid(), platform: info.platform, handle: info.handle, info, addedAt: nowISO() }
        const next = existing ? list.map(a => a.id === acc.id ? acc : a) : [acc, ...list]
        return { data: { ...s.data, socialAccounts: next.slice(0, 200) } }
      })
      touch()
    },

    removeSocial(id) {
      set(s => ({ data: { ...s.data, socialAccounts: (s.data.socialAccounts ?? []).filter(a => a.id !== id) } }))
      touch()
    },

    getSocial() { return get().data.socialAccounts ?? [] },

    upsertWorkflow(w) {
      set(s => {
        const list = s.data.workflows ?? []
        const next = list.some(x => x.id === w.id) ? list.map(x => x.id === w.id ? w : x) : [w, ...list]
        return { data: { ...s.data, workflows: next } }
      })
      touch()
    },

    removeWorkflow(id) {
      set(s => ({ data: { ...s.data, workflows: (s.data.workflows ?? []).filter(w => w.id !== id) } }))
      touch()
    },

    getWorkflows() { return get().data.workflows ?? [] },

    pushLog(l) {
      set(s => ({
        data: {
          ...s.data,
          runLogs: [{ id: uid(), at: nowISO(), ...l }, ...(s.data.runLogs ?? [])].slice(0, 300),
        },
      }))
      touch()
    },

    getLogs() { return get().data.runLogs ?? [] },

    setSettings(patch) {
      set(s => ({ data: { ...s.data, settings: { ...s.data.settings, ...patch } } }))
      touch()
    },

    async replaceAll(d) {
      // هر داده‌ی ورودی (بکاپ، نقطه‌ی بازیابی یا Gist) باید قبل از ورود به state
      // migrate شود. در غیر این صورت یک Gist ساخته‌شده با نسخه‌ی قدیمی‌تر ممکن
      // است تنظیمات یا آرایه‌های جدید را نداشته باشد و WebView اندروید هنگام render
      // با صفحه‌ی خالی/کرش مواجه شود.
      const restored = migrate(d)
      await pushSnapshot(get().data)
      set({ data: restored })
      await get().persist()
    },

    async loadSeed() { await get().replaceAll(seedData()) },
    async clearAll() { await get().replaceAll(emptyData()) },
  }
})

/** داده‌ی جدید Firestore را فقط وقتی اعمال می‌کند که از آخرین تغییر محلی جدیدتر باشد. */
async function applyRemote(res: cloud.RemoteData): Promise<boolean> {
  if (!res || pushInFlight) return false
  const st = useApp.getState()
  const c = st.data.settings.cloud
  const remoteT = Date.parse(res.updatedAt) || 0
  const localT = Math.max(Date.parse(c.lastSync) || 0, Date.parse(c.lastLocalChange) || 0)
  if (remoteT <= localT) return false
  await st.replaceAll(migrate(res.data))
  useApp.setState(s => ({ data: { ...s.data, settings: { ...s.data.settings, cloud: { ...s.data.settings.cloud, lastSync: res.updatedAt } } } }))
  return true
}

/** دریافت دستی یا pull-to-refresh. */
export async function refreshCloudNow(): Promise<boolean> {
  if (!cloud.isCloudReady()) throw new cloud.CloudError('not_signed_in')
  return applyRemote(await cloud.pullCloudData())
}

/** شنونده‌ی لحظه‌ای Firestore؛ تغییر دستگاه دیگر بدون polling به‌طور خودکار اعمال می‌شود. */
export function startLiveSync(): void {
  stopLiveSync?.()
  if (!cloud.isCloudReady() || !useApp.getState().data.settings.cloud.autoPull) return
  stopLiveSync = cloud.watchCloudData(res => {
    void applyRemote(res).then(changed => {
      if (changed) {
        const st = useApp.getState()
        st.setToast(tr(st.data.settings.lang ?? 'fa', 'set.cloudPulled'))
      }
    })
  }, error => {
    const st = useApp.getState()
    st.setToast(`${tr(st.data.settings.lang ?? 'fa', 'sync.failed')}: ${cloudError(st.data.settings.lang ?? 'fa', error.code)}`)
  })
}

export function stopLiveCloudSync(): void {
  stopLiveSync?.(); stopLiveSync = null
}

/** دریافت خودکار Firebase در شروع/بازگشت. */
export async function autoPullIfEnabled(): Promise<void> {
  const st = useApp.getState()
  if (!st.data.settings.cloud.autoPull || !cloud.isCloudReady()) return
  try { await refreshCloudNow() } catch { /* آفلاین بودن نباید برنامه را متوقف کند */ }
}

/* ---------- selectors ---------- */
export const useRows = (key: string): Entity[] => useApp(s => s.data.records[key] ?? [])
export const useModule = (key: string) => useApp(s => s.data.modules.find(m => m.key === key))
export const useModules = () => useApp(s => s.data.modules)
export const useSettings = () => useApp(s => s.data.settings)

/** نام نمایشی یک رکورد ارجاعی */
export function refLabel(data: AppData, moduleKey: string | undefined, id: unknown): string {
  if (!moduleKey || !id) return ''
  const m = data.modules.find(x => x.key === moduleKey)
  const row = (data.records[moduleKey] ?? []).find(r => r.id === id)
  if (!row || !m) return ''
  return String(row[m.titleField] ?? '')
}
