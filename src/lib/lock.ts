/**
 * قفل برنامه با PIN (و در اندروید با اثر انگشت).
 *
 * تنظیمات قفل — مثل توکن ابری — عمداً بیرون از فایل بکاپ و داده‌ی همگام‌شده
 * نگه داشته می‌شوند: قفل یک ویژگیِ همین دستگاه است، نه داده‌ی کاری کاربر.
 * PIN به‌صورت هش (SHA-256 با salt ثابت برنامه) ذخیره می‌شود، نه متن خام.
 */

export interface LockSettings {
  /** قفل فعال است؟ */
  enabled: boolean
  /** هش PIN (هگز SHA-256 یا fnv_ در حالت غیر امن) */
  pinHash: string
  /**
   * قفل خودکار:
   *   -1  → فقط هنگام باز شدن برنامه
   *    0  → بلافاصله هنگام برگشت از پس‌زمینه
   *    N  → پس از N دقیقه بی‌کاری
   */
  autoLockMin: number
  /** باز کردن با اثر انگشت (فقط اندروید) */
  biometric: boolean
}

const LS_KEY = 'nexus_hq_lock'
const SALT = 'nexus-hq::v1::'

export const DEFAULT_LOCK: LockSettings = {
  enabled: false,
  pinHash: '',
  autoLockMin: -1,
  biometric: false,
}

export function readLock(): LockSettings {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { ...DEFAULT_LOCK }
    const parsed = JSON.parse(raw) as Partial<LockSettings>
    return {
      ...DEFAULT_LOCK,
      ...parsed,
      autoLockMin: typeof parsed.autoLockMin === 'number' ? parsed.autoLockMin : DEFAULT_LOCK.autoLockMin,
      biometric: parsed.biometric === true,
      enabled: parsed.enabled === true,
    }
  } catch {
    return { ...DEFAULT_LOCK }
  }
}

/** آیا قفل (با PIN معتبر) برقرار است؟ */
export function isLockEnabled(): boolean {
  const l = readLock()
  return l.enabled && !!l.pinHash
}

function writeLock(l: LockSettings): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(l))
  } catch {
    /* حالت خصوصی مرورگر */
  }
}

/* ---------- هش PIN ---------- */

async function hashPin(pin: string): Promise<string> {
  try {
    const data = new TextEncoder().encode(SALT + pin)
    const buf = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    // زمینه‌ی غیر امن یا نبودن WebCrypto → هش ساده (غیر رمزنگاری، فقط برای ناشناختگی)
    let h = 0x811c9dc5
    for (let i = 0; i < pin.length; i++) {
      h ^= pin.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
    return 'fnv_' + (h >>> 0).toString(16)
  }
}

/* ---------- عملیات ---------- */

/** تنظیم/تغییر PIN و روشن‌کردن قفل */
export async function setLockPin(pin: string, autoLockMin: number, biometric: boolean): Promise<void> {
  writeLock({ enabled: true, pinHash: await hashPin(pin), autoLockMin, biometric })
}

/** فقط تغییر زمان قفل خودکار / گزینه‌ی اثر انگشت (بدون تغییر PIN) */
export function setLockOptions(autoLockMin: number, biometric: boolean): void {
  const l = readLock()
  writeLock({ ...l, autoLockMin, biometric })
}

/** خاموش‌کردن کامل قفل */
export function disableLock(): void {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    /* ignore */
  }
}

/** بررسی PIN واردشده */
export async function verifyPin(pin: string): Promise<boolean> {
  const l = readLock()
  if (!l.enabled || !l.pinHash) return true
  const h = await hashPin(pin)
  return h === l.pinHash
}
