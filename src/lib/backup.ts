import type { AppData } from '../store/types'
import { migrate, validateBackup } from './migrate'
import { desktop } from './desktop'
import { isMobile, mobileSaveAndShare, mobilePickFile } from './mobile'

export function download(filename: string, text: string, mime = 'application/json') {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * خروجی بکاپ.
 * دسکتاپ → دیالوگ بومی «ذخیره در…»، مسیر فایل برگردانده می‌شود.
 * مرورگر → دانلود معمولی، null برگردانده می‌شود.
 */
export async function exportJSON(data: AppData): Promise<string | null> {
  const d = new Date().toISOString().slice(0, 10)
  const name = `nexus-hq-backup-${d}.json`
  if (desktop) {
    const res = await desktop.exportBackup(data)
    return res.ok && res.path ? res.path : null
  }
  if (isMobile) {
    return await mobileSaveAndShare(name, JSON.stringify(data, null, 2), 'NEXUS HQ backup')
  }
  download(name, JSON.stringify(data, null, 2))
  return null
}

export async function exportModuleCSV(
  name: string,
  rows: Record<string, unknown>[],
  cols: string[],
): Promise<string | null> {
  const esc = (v: unknown) => {
    const s = v == null ? '' : Array.isArray(v) ? v.join('; ') : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n')
  // BOM لازم است تا اکسل فارسی را درست نشان دهد
  const text = '\uFEFF' + csv
  const file = `${name}-${new Date().toISOString().slice(0, 10)}.csv`

  if (desktop) {
    const res = await desktop.saveText(file, text, [{ name: 'CSV', extensions: ['csv'] }])
    return res.ok && res.path ? res.path : null
  }
  if (isMobile) {
    return await mobileSaveAndShare(file, text, name)
  }
  download(file, text, 'text/csv;charset=utf-8')
  return null
}

/** اعتبارسنجی + migration مشترک بین همه‌ی مسیرهای ورودی */
function parseBackup(obj: unknown): AppData {
  const v = validateBackup(obj)
  if (!v.ok) throw new Error(v.error)
  return migrate(obj)
}

/** بازیابی با دیالوگ بومی — فقط دسکتاپ. اگر کاربر لغو کند null برمی‌گردد. */
export async function importViaDialog(): Promise<AppData | null> {
  if (isMobile) {
    const f = await mobilePickFile()
    if (!f) return null
    return await importJSON(f)
  }
  if (!desktop) return null
  const res = await desktop.importBackup()
  if (!res.ok || !res.data) return null
  return parseBackup(res.data)
}

export function importJSON(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onerror = () => reject(new Error('خواندن فایل ناموفق بود / Could not read the file'))
    fr.onload = () => {
      try {
        resolve(parseBackup(JSON.parse(String(fr.result))))
      } catch (e) {
        reject(new Error((e as Error).message))
      }
    }
    fr.readAsText(file)
  })
}
