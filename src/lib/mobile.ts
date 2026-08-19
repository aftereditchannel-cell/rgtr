import type { AppData } from '../store/types'

/**
 * پل تایپ‌دار به نسخه‌ی موبایل (Capacitor / Android).
 * اگر برنامه در مرورگر یا دسکتاپ باز شده باشد، `isMobile` برابر false است
 * و همه‌ی مسیرها به رفتار قبلی (IndexedDB + دانلود مرورگر) برمی‌گردند.
 *
 * همه‌ی importها تنبل (lazy) هستند تا باندل وب سنگین‌تر نشود.
 */

type CapGlobal = {
  Capacitor?: {
    isNativePlatform?: () => boolean
    getPlatform?: () => string
  }
}

function cap(): CapGlobal['Capacitor'] | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as CapGlobal).Capacitor
}

export const isMobile: boolean = (() => {
  const c = cap()
  return !!c?.isNativePlatform?.()
})()

export const mobilePlatform: string = cap()?.getPlatform?.() ?? 'web'
export const isAndroid = mobilePlatform === 'android'

/* ---------- ذخیره‌سازی روی حافظه‌ی داخلی گوشی ---------- */

const DATA_FILE = 'nexus-hq.json'
const SNAP_DIR = 'snapshots'
const MAX_SNAPS = 20

/** Directory.Data = فضای خصوصی برنامه؛ با حذف برنامه پاک می‌شود ولی نیاز به مجوز ندارد */
async function fs() {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem')
  return { Filesystem, Directory, Encoding }
}

export async function mobileLoad(): Promise<AppData | null> {
  if (!isMobile) return null
  try {
    const { Filesystem, Directory, Encoding } = await fs()
    const res = await Filesystem.readFile({
      path: DATA_FILE,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    return JSON.parse(String(res.data)) as AppData
  } catch {
    return null // اولین اجرا — هنوز فایلی نیست
  }
}

export async function mobileSave(data: AppData): Promise<void> {
  if (!isMobile) return
  const { Filesystem, Directory, Encoding } = await fs()
  await Filesystem.writeFile({
    path: DATA_FILE,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    data: JSON.stringify(data),
  })
}

export type SnapMeta = { id: string; at: string; size: number }

export async function mobileSnapPush(data: AppData): Promise<void> {
  if (!isMobile) return
  const { Filesystem, Directory, Encoding } = await fs()
  const id = new Date().toISOString().replace(/[:.]/g, '-')
  try {
    await Filesystem.mkdir({ path: SNAP_DIR, directory: Directory.Data, recursive: true })
  } catch { /* از قبل هست */ }
  await Filesystem.writeFile({
    path: `${SNAP_DIR}/${id}.json`,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    data: JSON.stringify(data),
  })
  // هرس نگه‌داشتن ۲۰ تای آخر
  try {
    const list = await Filesystem.readdir({ path: SNAP_DIR, directory: Directory.Data })
    const files = list.files.map(f => (typeof f === 'string' ? f : f.name)).sort()
    for (const old of files.slice(0, Math.max(0, files.length - MAX_SNAPS))) {
      await Filesystem.deleteFile({ path: `${SNAP_DIR}/${old}`, directory: Directory.Data })
    }
  } catch { /* بی‌اهمیت */ }
}

export async function mobileSnapList(): Promise<SnapMeta[]> {
  if (!isMobile) return []
  try {
    const { Filesystem, Directory } = await fs()
    const list = await Filesystem.readdir({ path: SNAP_DIR, directory: Directory.Data })
    return list.files
      .map(f => (typeof f === 'string' ? { name: f, size: 0, mtime: 0 } : f))
      .filter(f => f.name.endsWith('.json'))
      .map(f => ({
        id: f.name.replace(/\.json$/, ''),
        at: f.name.replace(/\.json$/, '').replace(/-(\d\d)-(\d\d)-(\d\d\d)Z?$/, ':$1:$2.$3Z'),
        size: f.size ?? 0,
      }))
      .sort((a, b) => (a.id < b.id ? 1 : -1))
  } catch {
    return []
  }
}

export async function mobileSnapGet(id: string): Promise<AppData | null> {
  if (!isMobile) return null
  try {
    const { Filesystem, Directory, Encoding } = await fs()
    const res = await Filesystem.readFile({
      path: `${SNAP_DIR}/${id}.json`,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    })
    return JSON.parse(String(res.data)) as AppData
  } catch {
    return null
  }
}

/* ---------- خروجی/اشتراک فایل ---------- */

/**
 * روی اندروید «دانلود» معنی ندارد؛ فایل را در Documents می‌نویسیم و
 * برگه‌ی اشتراک‌گذاری سیستم را باز می‌کنیم تا کاربر در تلگرام/درایو/... ذخیره کند.
 * مسیر فایل برگردانده می‌شود.
 */
export async function mobileSaveAndShare(
  filename: string,
  text: string,
  title: string,
): Promise<string | null> {
  if (!isMobile) return null
  const { Filesystem, Directory, Encoding } = await fs()
  const { Share } = await import('@capacitor/share')

  const res = await Filesystem.writeFile({
    path: filename,
    directory: Directory.Documents,
    encoding: Encoding.UTF8,
    data: text,
    recursive: true,
  })

  try {
    await Share.share({ title, url: res.uri, dialogTitle: title })
  } catch {
    // کاربر برگه‌ی اشتراک را بست — فایل به‌هرحال ذخیره شده
  }
  return res.uri
}

/** انتخاب فایل بکاپ از حافظه‌ی گوشی — از input معمولی استفاده می‌کنیم که در WebView کار می‌کند */
export function mobilePickFile(): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}

/* ---------- چرخه‌ی حیات برنامه ---------- */

/**
 * روی اندروید «بستن برنامه» با دکمه‌ی back اتفاق می‌افتد.
 * این تابع دکمه‌ی back را می‌گیرد: اگر تاریخچه‌ای هست برمی‌گردد،
 * وگرنه handler را صدا می‌زند تا دیالوگ ذخیره نشان داده شود.
 */
export async function onMobileBack(handler: () => void): Promise<() => void> {
  if (!isMobile) return () => {}
  const { App } = await import('@capacitor/app')
  const sub = await App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back()
    else handler()
  })
  return () => void sub.remove()
}

/** ذخیره‌ی خودکار وقتی برنامه به پس‌زمینه می‌رود (کاربر گوشی را می‌بندد) */
export async function onMobilePause(handler: () => void): Promise<() => void> {
  if (!isMobile) return () => {}
  const { App } = await import('@capacitor/app')
  const sub = await App.addListener('pause', handler)
  return () => void sub.remove()
}

/** بستن واقعی برنامه */
export async function mobileExit(): Promise<void> {
  if (!isMobile) return
  const { App } = await import('@capacitor/app')
  await App.exitApp()
}

/** مسیر پوشه‌ی داده برای نمایش در تنظیمات */
export function mobileDataPath(): string {
  return `Android/data/app.nexushq.mobile/files/${DATA_FILE}`
}

/* ---------- ظاهر بومی ---------- */

/**
 * نوار وضعیت را با تم تیره‌ی برنامه هماهنگ می‌کند و
 * splash را بعد از آماده‌شدن رابط پنهان می‌کند.
 */
export async function initMobileChrome(): Promise<void> {
  if (!isMobile) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Dark })
    if (isAndroid) await StatusBar.setBackgroundColor({ color: '#08090c' })
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch { /* بعضی دستگاه‌ها پشتیبانی نمی‌کنند */ }
}
