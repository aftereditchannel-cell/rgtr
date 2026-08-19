/**
 * قفل برنامه: PIN محلی + قفل خودکار بعد از بی‌کاری.
 * تنظیمات قفل خارج از AppData و در localStorage نگه داشته می‌شود تا
 * وارد بکاپ/همگام‌سازی ابری نشود و روی هر دستگاه جداگانه باشد.
 */

export interface LockConfig {
  /** قفل فعال است فقط اگر رمزی هم تنظیم شده باشد */
  enabled: boolean
  /** هش رمز (hex) — خود رمز هرگز ذخیره نمی‌شود */
  pinHash: string
  /**
   * قفل خودکار:
   *   -1 → فقط هنگام باز شدن برنامه
   *    0 → بلافاصله با رها کردن برنامه
   *    n → بعد از n دقیقه بی‌کاری
   */
  autoLockMin: number
}

const KEY = 'nexus.lock'

export const LOCK_DEFAULTS: LockConfig = { enabled: false, pinHash: '', autoLockMin: 5 }

/** خواندن تنظیمات قفل — همیشه همه‌ی فیلدها را دارد */
export function readLock(): LockConfig {
  if (typeof localStorage === 'undefined') return { ...LOCK_DEFAULTS }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...LOCK_DEFAULTS }
    const v = JSON.parse(raw) as Partial<LockConfig>
    return {
      enabled: !!v.enabled,
      pinHash: typeof v.pinHash === 'string' ? v.pinHash : '',
      autoLockMin: typeof v.autoLockMin === 'number' ? v.autoLockMin : LOCK_DEFAULTS.autoLockMin,
    }
  } catch {
    return { ...LOCK_DEFAULTS }
  }
}

/** ذخیره‌ی تنظیمات قفل */
export function writeLock(cfg: LockConfig): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(cfg))
}

/** حذف کامل قفل */
export function clearLock(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(KEY)
}

/** قفل فعال است؟ (نیاز به فعال‌بودن + وجود رمز) */
export function isLockEnabled(): boolean {
  const c = readLock()
  return c.enabled && !!c.pinHash
}

/* ---------- هش رمز ---------- */

function fnv1a(s: string): string {
  // جایگزین برای محیط‌های بدون crypto.subtle (کشف اثر انگشت کافی است؛ خود رمز سمت کاربر می‌ماند)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return 'f:' + h.toString(16).padStart(8, '0')
}

/** هش SHA-256 رمز به‌صورت hex */
export async function hashPin(pin: string): Promise<string> {
  try {
    const subtle = globalThis.crypto?.subtle
    if (!subtle) return fnv1a(pin)
    const buf = await subtle.digest('SHA-256', new TextEncoder().encode('nexus:' + pin))
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
  } catch {
    return fnv1a(pin)
  }
}

/** درستی رمز واردشده */
export async function verifyPin(pin: string): Promise<boolean> {
  const c = readLock()
  if (!c.pinHash) return false
  return (await hashPin(pin)) === c.pinHash
}
