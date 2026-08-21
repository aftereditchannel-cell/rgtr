/**
 * قفل برنامه — رمز عبور ۴ تا ۶ رقمی.
 *
 * رمز هرگز به‌صورت متن ساده ذخیره نمی‌شود:
 * با PBKDF2 (SHA-256 · ۲۱۰٬۰۰۰ تکرار · نمک ۱۶ بایتی) به هش ۲۵۶ بیتی تبدیل
 * می‌شود و فقط همین هش + نمک در localStorage می‌ماند. همین داده‌ی ذخیره‌شده
 * روی اندروید، ویندوز و مرورگر کار می‌کند.
 *
 * «اثر انگشت» فقط یک میان‌بر برای باز کردن است؛ هش رمز همیشه وجود دارد
 * و اگر اثر انگشت در دسترس نبود، همان رمز کار می‌کند.
 */

export interface LockConfig {
  enabled: boolean
  /** نمک PBKDF2 — base64 */
  salt: string
  /** هش رمز — base64 (PBKDF2-SHA256, 210000 iter, 256 bit) */
  hash: string
  /**
   * قفل خودکار (دقیقه):
   *  -1 = فقط هنگام باز شدن برنامه
   *   0 = همیشه (به‌محض ورود قفل است)
   *  >0 = بعد از n دقیقه بی‌کاری
   */
  autoLockMin: number
  /** میان‌بر اثر انگشت (اندروید) */
  biometric: boolean
  /** راهنمای یادآوری رمز */
  hint: string
  /** تعداد تلاش‌های اشتباه پشت‌سرهم */
  fails: number
  /** تا این لحظه (epoch ms) ورود قفل است — بعد از ۵ تلاش اشتباه */
  lockedUntil: number
}

const KEY = 'nexus_hq_lock'
export const LOCK_EVENT = 'nexus:lock'
export const MAX_ATTEMPTS = 5
export const COOLDOWN_MS = 30_000

const DEFAULT_LOCK: LockConfig = {
  enabled: false,
  salt: '',
  hash: '',
  autoLockMin: 5,
  biometric: false,
  hint: '',
  fails: 0,
  lockedUntil: 0,
}

/* ---------- ذخیره‌سازی ---------- */

export function readLock(): LockConfig {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_LOCK }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_LOCK }
    const p = JSON.parse(raw) as Partial<LockConfig>
    return {
      ...DEFAULT_LOCK,
      ...p,
      autoLockMin: typeof p.autoLockMin === 'number' ? p.autoLockMin : DEFAULT_LOCK.autoLockMin,
    }
  } catch {
    return { ...DEFAULT_LOCK }
  }
}

function writeLock(patch: Partial<LockConfig>): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...readLock(), ...patch }))
  } catch { /* حافظه در دسترس نیست — قفل بی‌اثر */ }
}

export function isLockEnabled(): boolean {
  return readLock().enabled
}

/** قفل واقعاً فعال است (رمز دارد) یا فقط تنظیماتِ نیمه‌کاره است */
export function hasPasscode(): boolean {
  const c = readLock()
  return c.enabled && !!c.salt && !!c.hash
}

/* ---------- رمزنگاری (WebCrypto — در Electron و Android WebView در دسترس است) ---------- */

const ITERATIONS = 210_000
const KEY_BITS = 256

async function pbkdf2(salt: Uint8Array<ArrayBuffer>, pass: string): Promise<Uint8Array<ArrayBuffer>> {
  const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    km,
    KEY_BITS,
  )
  return new Uint8Array(bits)
}

const b64enc = (u: Uint8Array) => btoa(String.fromCharCode(...u))
const b64dec = (s: string) => {
  const bin = atob(s)
  const u = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
  return u
}

/** اعداد فارسی/عربی → لاتین، تا هر دو صفحه‌کلید و عددهای نمایشی کار کنند */
export function normalizeDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/\D/g, '')
}

function validCode(code: string): boolean {
  const n = normalizeDigits(code)
  return n.length >= 4 && n.length <= 6
}

/* ---------- عملیات ---------- */

/** تنظیم/تغییر رمز. در صورت داشتن رمز قبلی، برای تغییر باید درست وارد شود. */
export async function setPasscode(
  code: string,
  opts: { hint?: string; biometric?: boolean; current?: string } = {},
): Promise<{ ok: true } | { ok: false; error: 'current' | 'short' | 'format' }> {
  const cfg = readLock()
  const n = normalizeDigits(code)
  if (!validCode(n)) return { ok: false, error: 'short' }
  if (!/^\d+$/.test(n)) return { ok: false, error: 'format' }

  if (cfg.enabled && cfg.hash) {
    const cur = normalizeDigits(opts.current ?? '')
    if (!cur || !(await verifyPasscode(cur))) return { ok: false, error: 'current' }
  }

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await pbkdf2(salt, n)
  writeLock({
    enabled: true,
    salt: b64enc(salt),
    hash: b64enc(hash),
    hint: (opts.hint ?? '').trim().slice(0, 80),
    biometric: opts.biometric ?? cfg.biometric,
    fails: 0,
    lockedUntil: 0,
  })
  return { ok: true }
}

/** بررسی رمز — تلاش‌های اشتباه را می‌شمارد و بعد از ۵ بار قفل موقت می‌کند */
export async function verifyPasscode(code: string): Promise<boolean> {
  const cfg = readLock()
  if (!cfg.enabled || !cfg.salt || !cfg.hash) return true
  const now = Date.now()
  if (cfg.lockedUntil > now) return false

  const n = normalizeDigits(code)
  const hash = await pbkdf2(b64dec(cfg.salt), n)
  const ok = b64enc(hash) === cfg.hash

  if (ok) {
    writeLock({ fails: 0, lockedUntil: 0 })
    return true
  }
  const fails = cfg.fails + 1
  writeLock({ fails, lockedUntil: fails >= MAX_ATTEMPTS ? now + COOLDOWN_MS : 0 })
  return false
}

/** چند ثانیه تا پایان قفل موقت مانده (۰ = باز است) */
export function cooldownRemaining(): number {
  const c = readLock()
  return Math.max(0, Math.ceil((c.lockedUntil - Date.now()) / 1000))
}

/** چند تلاش اشتباه مانده تا قفل موقت */
export function attemptsLeft(): number {
  const c = readLock()
  return c.lockedUntil > Date.now() ? 0 : Math.max(0, MAX_ATTEMPTS - c.fails)
}

export function disableLock(): void {
  writeLock({ ...DEFAULT_LOCK, enabled: false })
}

export function setAutoLock(min: number): void {
  writeLock({ autoLockMin: min })
}

/** نام سازگار با نسخه‌های قبلی — معادل setAutoLock */
export function setAutoLockMin(min: number): void {
  writeLock({ autoLockMin: min })
}

/** راهنمای یادآوری رمز روی صفحه‌ی قفل */
export function setHint(hint: string): void {
  writeLock({ hint: (hint ?? '').trim().slice(0, 80) })
}

export function setBiometric(on: boolean): void {
  writeLock({ biometric: on })
}

/** آیا WebCrypto در دسترس است؟ (برای تنظیم رمز لازم است) */
export function cryptoAvailable(): boolean {
  try {
    return typeof crypto !== 'undefined' && !!crypto.subtle
  } catch {
    return false
  }
}

/** نام سازگار — معادل isBiometricAvailable */
export function biometricAvailable(): Promise<boolean> {
  return isBiometricAvailable()
}

/** نام سازگار — معادل tryBiometricUnlock */
export function biometricAuth(reason?: string): Promise<boolean> {
  return tryBiometricUnlock(reason)
}

/** رویداد قفل فوری — App شنونده‌ی همین رویداد است */
export function lockNow(): void {
  // window.Event برای محیط‌های تست (jsdom) که Event سراسری با DOM یکی نیست
  const Ctor = typeof window !== 'undefined' && window.Event ? window.Event : Event
  window.dispatchEvent(new Ctor(LOCK_EVENT))
}

/* ---------- اثر انگشت (فقط اندروید) ---------- */

async function biometricPlugin() {
  const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
  return BiometricAuth
}

/** آیا اثر انگشت روی این دستگاه قابل استفاده است؟ (اندروید با سنسور) */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const Bio = await biometricPlugin()
    const res = await Bio.checkBiometry()
    return !!res?.isAvailable
  } catch {
    return false // مرورگر / ویندوز / پلاگین ثبت‌نشده
  }
}

/** تلاش ورود با اثر انگشت — true یعنی کاربر تأیید شد */
export async function tryBiometricUnlock(reason?: string): Promise<boolean> {
  try {
    const Bio = await biometricPlugin()
    await Bio.authenticate({ reason: reason ?? 'NEXUS HQ' })
    return true
  } catch {
    return false
  }
}
