/**
 * قفل امنیتی برنامه.
 * پین با هش یک‌طرفه (SHA-256) در همان دیتابیس محلی ذخیره می‌شود؛
 * هیچ داده‌ای بیرون نمی‌رود. اگر WebCrypto در دسترس نبود (مرورگر خیلی قدیمی)
 * به یک هش ساده‌ی محلی برمی‌گردد تا قابلیت از بین نرود.
 */

export interface LockConfig {
  enabled: boolean
  /** SHA-256 hash پین (۶ رقم) */
  hash: string
  /** -1 = فقط هنگام باز شدن برنامه، 0 = فوراً، n = پس از n دقیقه بی‌کاری */
  autoLockMin: number
  /** استفاده از بیومتریک (اثر انگشت/چهره) در صورت پشتیبانی دستگاه */
  biometric: boolean
}

const KEY = 'nexus-hq-lock'

const DEFAULT: LockConfig = { enabled: false, hash: '', autoLockMin: 5, biometric: false }

export function readLock(): LockConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT }
    return { ...DEFAULT, ...(JSON.parse(raw) as Partial<LockConfig>) }
  } catch {
    return { ...DEFAULT }
  }
}

export function writeLock(patch: Partial<LockConfig>): LockConfig {
  const next = { ...readLock(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function isLockEnabled(): boolean {
  return readLock().enabled && !!readLock().hash
}

export async function hashPin(pin: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const data = new TextEncoder().encode('nexus::' + pin)
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  }
  // fallback — هرگز برای احراز هویت واقعی رویش حساب نکنید
  let h = 0
  for (let i = 0; i < pin.length; i++) h = (h << 5) - h + pin.charCodeAt(i) | 0
  return 'fb-' + (h >>> 0).toString(16)
}

export async function verifyPin(pin: string): Promise<boolean> {
  const cfg = readLock()
  if (!cfg.hash) return false
  return (await hashPin(pin)) === cfg.hash
}
