import { create } from 'zustand'
import type { AppData, Entity, Settings } from './types'
import type { ModuleDef } from '../domain/schema'
import { emptyRecord, CORE_MODULES } from '../domain/schema'
import { seedData, emptyData } from '../domain/seed'
import { loadDoc, saveDoc, pushSnapshot } from '../lib/db'
import { migrate } from '../lib/migrate'
import { uid, nowISO } from '../lib/id'

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

  setSettings: (patch: Partial<Settings>) => void
  replaceAll: (d: AppData) => Promise<void>
  loadSeed: () => Promise<void>
  clearAll: () => Promise<void>
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

export const useApp = create<Store>((set, get) => {
  const touch = () => {
    set({ dirty: true })
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => { void get().persist() }, 400)
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

    setSettings(patch) {
      set(s => ({ data: { ...s.data, settings: { ...s.data.settings, ...patch } } }))
      touch()
    },

    async replaceAll(d) {
      await pushSnapshot(get().data)
      set({ data: d })
      await get().persist()
    },

    async loadSeed() { await get().replaceAll(seedData()) },
    async clearAll() { await get().replaceAll(emptyData()) },
  }
})

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
