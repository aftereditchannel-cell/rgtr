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

export const useApp = create<Store>((set, get) => {
  /** ذخیره‌ی خودکار روی ابر (Gist) بعد از هر تغییر — اگر autoSync روشن و توکن موجود باشد */
  const scheduleCloudPush = () => {
    const c = get().data.settings.cloud
    if (!c.autoSync || !cloud.hasToken()) return
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => { void autoPush() }, 3000)
  }

  const autoPush = async () => {
    const st = get()
    await st.persist()
    const fresh = get().data
    try {
      const { id } = await cloud.ensureGist(fresh.settings.cloud.gistId, fresh)
      await cloud.pushGist(id, fresh)
      // مستقیم با set (نه setSettings) تا دوباره touch نشود و حلقه‌ی بی‌پایان نسازد
      set(s => ({
        data: { ...s.data, settings: { ...s.data.settings, cloud: { ...s.data.settings.cloud, gistId: id, lastSync: new Date().toISOString() } } },
      }))
    } catch { /* بی‌صدا — دفعه‌ی بعد دوباره تلاش می‌شود */ }
  }

  const touch = () => {
    set({ dirty: true })
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

/**
 * دریافت خودکار از ابر هنگام باز شدن/بازگشت برنامه — فقط اگر remote جدیدتر باشد
 * (last-write-wins بر اساس updated_at گیت‌هاب).
 */
export async function autoPullIfEnabled(): Promise<void> {
  const st = useApp.getState()
  const c = st.data.settings.cloud
  if (!c.autoPull || !c.gistId || !cloud.hasToken()) return
  try {
    const res = await cloud.pullGist(c.gistId)
    if (!res) return
    const remoteT = new Date(res.updatedAt).getTime()
    const localT = c.lastSync ? new Date(c.lastSync).getTime() : 0
    if (Number.isFinite(remoteT) && remoteT > localT) {
      // دریافت خودکار نیز باید افزایشی باشد؛ نسخه‌ی ابر نباید رکورد یا ماژول
      // محلیِ جدیدی را که هنوز push نشده پاک کند.
      await st.replaceAll(cloud.mergeCloudData(st.data, res.data))
      useApp.getState().setSettings({ cloud: { ...useApp.getState().data.settings.cloud, lastSync: res.updatedAt } })
    }
  } catch { /* بی‌صدا */ }
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
