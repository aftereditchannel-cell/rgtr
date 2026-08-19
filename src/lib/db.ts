import Dexie, { type Table } from 'dexie'
import type { AppData, Snapshot } from '../store/types'
import { desktop } from './desktop'
import { isMobile, mobileLoad, mobileSave, mobileSnapPush, mobileSnapList, mobileSnapGet } from './mobile'

/**
 * لایه‌ی ذخیره‌سازی — یک API، سه پشتیبان:
 *   ۱. فایل JSON روی دیسک   → داخل نسخه‌ی ویندوز (بهترین حالت)
 *   ۲. فایل JSON در حافظه‌ی گوشی → داخل نسخه‌ی اندروید
 *   ۳. IndexedDB (Dexie)     → در مرورگر
 *   ۴. localStorage          → اگر IndexedDB در دسترس نباشد (حالت خصوصی)
 *
 * هیچ صفحه‌ای نمی‌داند کدام فعال است؛ به همین دلیل نسخه‌ی وب و ویندوز
 * از یک کد ساخته می‌شوند.
 */
class HQDB extends Dexie {
  doc!: Table<{ key: string; data: AppData }, string>
  snapshots!: Table<Snapshot, number>
  constructor() {
    super('nexus_hq')
    this.version(1).stores({ doc: 'key', snapshots: '++id, at' })
  }
}

const db = new HQDB()
const LS_KEY = 'nexus_hq_doc'
let idbOK = true

export async function loadDoc(): Promise<AppData | null> {
  if (desktop) {
    try { return await desktop.load() } catch { return null }
  }
  if (isMobile) {
    try { return await mobileLoad() } catch { return null }
  }
  try {
    const row = await db.doc.get('main')
    if (row?.data) return row.data
  } catch { idbOK = false }
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as AppData) : null
  } catch { return null }
}

export async function saveDoc(data: AppData): Promise<void> {
  if (desktop) {
    try { await desktop.save(data) } catch { /* ignore */ }
    return
  }
  if (isMobile) {
    try { await mobileSave(data) } catch { /* ignore */ }
    return
  }
  if (idbOK) {
    try { await db.doc.put({ key: 'main', data }); return } catch { idbOK = false }
  }
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)) } catch { /* quota */ }
}

/** نقطه‌ی بازیابی — روی دیسک تا ۲۰ نسخه، در مرورگر ۵ نسخه */
export async function pushSnapshot(data: AppData): Promise<void> {
  if (desktop) {
    try { await desktop.snapPush(data) } catch { /* ignore */ }
    return
  }
  if (isMobile) {
    try { await mobileSnapPush(data) } catch { /* ignore */ }
    return
  }
  if (!idbOK) return
  try {
    await db.snapshots.add({ at: new Date().toISOString(), size: JSON.stringify(data).length, data })
    const all = await db.snapshots.orderBy('at').toArray()
    if (all.length > 5) await db.snapshots.bulkDelete(all.slice(0, all.length - 5).map(s => s.id!))
  } catch { /* ignore */ }
}

export async function listSnapshots(): Promise<Snapshot[]> {
  if (desktop) {
    try {
      const metas = await desktop.snapList()
      // روی دیسک، محتوای اسنپ‌شات تنبل خوانده می‌شود؛ اینجا فقط متادیتا لازم است.
      return metas.map(m => ({ id: m.id as unknown as number, at: m.at, size: m.size, data: null as unknown as AppData }))
    } catch { return [] }
  }
  if (isMobile) {
    try {
      const metas = await mobileSnapList()
      return metas.map(m => ({ id: m.id as unknown as number, at: m.at, size: m.size, data: null as unknown as AppData }))
    } catch { return [] }
  }
  if (!idbOK) return []
  try { return (await db.snapshots.orderBy('at').reverse().toArray()) } catch { return [] }
}

export async function getSnapshot(id: number | string): Promise<Snapshot | undefined> {
  if (desktop) {
    try {
      const data = await desktop.snapGet(String(id))
      if (!data) return undefined
      return { id: id as unknown as number, at: '', size: 0, data }
    } catch { return undefined }
  }
  if (isMobile) {
    try {
      const data = await mobileSnapGet(String(id))
      if (!data) return undefined
      return { id: id as unknown as number, at: '', size: 0, data }
    } catch { return undefined }
  }
  try { return await db.snapshots.get(id as number) } catch { return undefined }
}

export async function wipeAll(): Promise<void> {
  // در دسکتاپ فایل داده پاک نمی‌شود؛ استور خودش داده‌ی خالی را می‌نویسد.
  if (desktop || isMobile) return
  try { await db.doc.clear(); await db.snapshots.clear() } catch { /* ignore */ }
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}

/** شناسه‌ی محل ذخیره‌سازی — ترجمه در لایه‌ی UI انجام می‌شود */
export const storageBackend = (): 'disk' | 'phone' | 'IndexedDB' | 'localStorage' =>
  desktop ? 'disk' : isMobile ? 'phone' : idbOK ? 'IndexedDB' : 'localStorage'
