import type { AppData } from '../store/types'

/**
 * پل تایپ‌دار به نسخه‌ی دسکتاپ (Electron).
 * اگر برنامه داخل مرورگر باز شده باشد، `desktop` برابر null است
 * و همه‌ی مسیرها به‌صورت خودکار به IndexedDB برمی‌گردند.
 */

export type SnapMeta = { id: string; at: string; size: number }

export type AppInfo = {
  version: string
  platform: string
  electron: string
  chrome: string
  node: string
  dataFile: string
  dataDir: string
}

export type SaveFilter = { name: string; extensions: string[] }

export interface DesktopAPI {
  isDesktop: true

  load(): Promise<AppData | null>
  save(data: AppData): Promise<void>

  snapPush(data: AppData): Promise<void>
  snapList(): Promise<SnapMeta[]>
  snapGet(id: string): Promise<AppData | null>

  exportBackup(data: AppData): Promise<{ ok: boolean; path?: string }>
  importBackup(): Promise<{ ok: boolean; data?: unknown; path?: string }>
  saveText(name: string, text: string, filters?: SaveFilter[]): Promise<{ ok: boolean; path?: string }>

  info(): Promise<AppInfo>
  openDataDir(): Promise<void>
  confirm(opts: { title?: string; message: string; detail?: string }): Promise<boolean>

  /** پس از تصمیم کاربر در دیالوگ خروج، بستن واقعی پنجره */
  exitNow(): Promise<void>
  /** لغو خروج و بازگشت به برنامه */
  cancelExit(): Promise<void>

  /** اشتراک در رویدادهای منوی بومی. تابع لغو اشتراک برمی‌گرداند. */
  onMenu(handler: (name: string, payload?: string) => void): () => void
}

declare global {
  interface Window {
    hq?: DesktopAPI
  }
}

export const desktop: DesktopAPI | null =
  typeof window !== 'undefined' && window.hq ? window.hq : null

export const isDesktop = !!desktop

/**
 * تأییدگرفتن از کاربر — در دسکتاپ دیالوگ بومی ویندوز، در مرورگر confirm معمولی.
 */
export async function ask(message: string, detail?: string): Promise<boolean> {
  if (desktop) return desktop.confirm({ message, detail })
  return window.confirm(detail ? `${message}\n\n${detail}` : message)
}
