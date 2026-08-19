/**
 * قفل برنامه — رمز عبور (PBKDF2) + اثر انگشت/چهره (فقط روی موبایل).
 *
 * رمز هرگز به‌صورت متن ذخیره نمی‌شود: با PBKDF2 (۲۱۰٬۰۰۰ تکرار، SHA-256)
 * هش می‌شود و salt جداگانه ذخیره می‌شود. این قفل فقط جلوی باز کردن رابط را
 * می‌گیرد؛ فایل داده روی دیسک رمزنگاری نمی‌شود.
 *
 * تنظیمات قفل خارج از AppData و فایل بکاپ (localStorage) نگه‌داری می‌شود،
 * چون رمز دستگاه شخصی است و نباید بین دستگاه‌ها sync شود.
 */

export interface LockConfig {
  enabled: boolean
  /** salt پایه۶۴ */
  salt: string
  /** هش ۲۵۶ بیتی پایه۶۴ */
  hash: string
  /** دقیقه‌های بی‌کاری برای قفل خودکار: -1 = فقط هنگام باز شدن، 0 = بلافاصله */
  autoLockMin: number
  /** آیا باز کردن با اثر انگشت/چهره فعال است (فقط موبایل) */
  biometric: boolean
  /** یادآور اختیاری روی صفحه‌ی قفل */
  hint: string
  /** تعداد تلاش‌های ناموفق متوالی */
  fails: number
  /** مهر زمانی که تا آن لحظه ورود قفل است (تأخیر پلکانی بعد از حدس زیاد) */
  lockedUntil: number
}

const KEY = 'nexus_hq_lock'
const ITER = 210_000

export const DEFAULT_LOCK: LockConfig = {
  enabled: false,
  salt: '',
  hash: '',
  autoLockMin: 5,
  biometric: false,
  hint: '',
  fails: 0,
  lockedUntil: 0,
}

export function readLock(): LockConfig {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_LOCK }
    return { ...DEFAULT_LOCK, ...(JSON.parse(raw) as Partial<LockConfig>) }
  } catch {
    return { ...DEFAULT_LOCK }
  }
}

export function writeLock(cfg: LockConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cfg))
  } catch {
    /* حالت خصوصی مرورگر */
  }
}

export const isLockEnabled = (): boolean => readLock().enabled

/* ---------- ابزارهای رمزنگاری ---------- */

const b64 = (buf: ArrayBuffer): string =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
const unb64 = (s: string): Uint8Array =>
  Uint8Array.from(atob(s), c => c.charCodeAt(0))

async function derive(code: string, saltB64: string): Promise<string> {
  const enc = new TextEncoder()
  const km = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: unb64(saltB64) as unknown as BufferSource, iterations: ITER, hash: 'SHA-256' },
    km,
    256,
  )
  return b64(bits)
}

function randomSalt(): string {
  const a = new Uint8Array(16)
  crypto.getRandomValues(a)
  return b64(a.buffer as ArrayBuffer)
}

/** آیا crypto.subtle در دسترس است (https / localhost / file) */
export function cryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle
}

/* ---------- عملیات قفل ---------- */

/** تنظیم/تغییر رمز. حداقل ۴ رقم (فقط رقم). */
export async function setPasscode(code: string): Promise<void> {
  const clean = code.replace(/[^\d]/g, '')
  if (clean.length < 4) throw new Error('PASSCODE_TOO_SHORT')
  const salt = randomSalt()
  const hash = await derive(clean, salt)
  writeLock({ ...readLock(), enabled: true, salt, hash, fails: 0, lockedUntil: 0 })
}

/** غیرفعال‌کردن قفل (رمز را پاک می‌کند) */
export function disableLock(): void {
  writeLock({ ...DEFAULT_LOCK })
}

export function setHint(hint: string): void {
  writeLock({ ...readLock(), hint })
}

export function setAutoLockMin(min: number): void {
  writeLock({ ...readLock(), autoLockMin: min })
}

export function setBiometric(on: boolean): void {
  writeLock({ ...readLock(), biometric: on })
}

/** آیا فعلاً می‌شود رمز زد یا در دوره‌ی تأخیر پلکانی هستیم؟ */
export function canAttempt(): boolean {
  return Date.now() >= readLock().lockedUntil
}

/** ثانیه‌های باقی‌مانده تا پایان تأخیر پلکانی */
export function cooldownSeconds(): number {
  return Math.max(0, Math.ceil((readLock().lockedUntil - Date.now()) / 1000))
}

/**
 * بررسی رمز. بعد از ۵ تلاش ناموفق، تأخیر پلکانی (هر تلاش اضافه ۱۰ ثانیه‌ی بیشتر)
 * فعال می‌شود تا حدس زدن سخت شود.
 */
export async function verifyPasscode(code: string): Promise<boolean> {
  const cfg = readLock()
  const clean = code.replace(/[^\d]/g, '')
  const ok = cfg.hash && (await derive(clean, cfg.salt)) === cfg.hash
  if (ok) {
    writeLock({ ...cfg, fails: 0, lockedUntil: 0 })
    return true
  }
  const fails = cfg.fails + 1
  // تأخیر پلکانی: از تلاش ششم، هر تلاش ناموفق ۱۰ ثانیه تأخیر اضافه می‌کند
  const extra = fails > 5 ? (fails - 5) * 10_000 : 0
  writeLock({ ...cfg, fails, lockedUntil: extra ? Date.now() + extra : 0 })
  return false
}

/* ---------- بیومتریک (فقط موبایل) ---------- */

export async function biometricAvailable(): Promise<boolean> {
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    const r = await BiometricAuth.checkBiometry()
    return r.isAvailable
  } catch {
    return false
  }
}

/** درخواست اثر انگشت/چهره. true یعنی تأیید شد. */
export async function biometricAuth(reason: string): Promise<boolean> {
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
    await BiometricAuth.authenticate({ reason, cancelTitle: 'انصراف', allowDeviceCredential: true })
    return true
  } catch {
    return false
  }
}
