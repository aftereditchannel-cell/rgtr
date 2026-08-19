/** قفل برنامه — رمز فقط روی همین دستگاه در localStorage می‌ماند و وارد بکاپ نمی‌شود. */

export const LOCK_KEY = 'nexus_hq_lock'
const ITERATIONS = 210_000

export interface LockState {
  enabled: boolean
  salt: string
  hash: string
  /** −۱ فقط هنگام باز شدن · ۰ فوری وقتی برنامه می‌رود پس‌زمینه · >۰ دقیقه بی‌کاری */
  autoLockMin: number
  biometric: boolean
  hint: string
  fails: number
  lockedUntil: number
}

const EMPTY: LockState = {
  enabled: false,
  salt: '',
  hash: '',
  autoLockMin: -1,
  biometric: false,
  hint: '',
  fails: 0,
  lockedUntil: 0,
}

function b64(buf: ArrayBuffer | Uint8Array): string {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]!)
  return btoa(s)
}

function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0))
}

/** ارقام فارسی/عربی را به لاتین تبدیل و غیررقم‌ها را حذف می‌کند */
export function normalizePin(pin: string): string {
  const fa = '۰۱۲۳۴۵۶۷۸۹'
  const ar = '٠١٢٣٤٥٦٧٨٩'
  return String(pin).replace(/[۰-۹٠-٩]/g, c => {
    const i = fa.indexOf(c)
    if (i >= 0) return String(i)
    const j = ar.indexOf(c)
    return j >= 0 ? String(j) : c
  }).replace(/\D/g, '')
}

async function derive(pin: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits'])
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
}

export function readLock(): LockState {
  try {
    const raw = localStorage.getItem(LOCK_KEY)
    if (!raw) return { ...EMPTY }
    return { ...EMPTY, ...JSON.parse(raw) as Partial<LockState> }
  } catch {
    return { ...EMPTY }
  }
}

export function writeLock(state: LockState): void {
  localStorage.setItem(LOCK_KEY, JSON.stringify(state))
}

export function isLockEnabled(): boolean {
  const s = readLock()
  return !!(s.enabled && s.hash && s.salt)
}

export function updateLock(patch: Partial<LockState>): void {
  writeLock({ ...readLock(), ...patch })
}

export async function setPasscode(pin: string, hint = ''): Promise<void> {
  const clean = normalizePin(pin)
  if (clean.length < 4) throw new Error('short')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const bits = await derive(clean, salt)
  const prev = readLock()
  writeLock({
    ...prev,
    enabled: true,
    salt: b64(salt),
    hash: b64(bits),
    hint: hint.trim(),
    fails: 0,
    lockedUntil: 0,
  })
}

export function clearLock(): void {
  localStorage.removeItem(LOCK_KEY)
}

export async function verifyPasscode(pin: string): Promise<boolean> {
  const s = readLock()
  if (!s.enabled || !s.hash || !s.salt) return false
  if (s.lockedUntil && Date.now() < s.lockedUntil) return false
  const bits = await derive(normalizePin(pin), fromB64(s.salt))
  const ok = b64(bits) === s.hash
  if (ok) {
    writeLock({ ...s, fails: 0, lockedUntil: 0 })
    return true
  }
  const fails = (s.fails || 0) + 1
  writeLock({
    ...s,
    fails,
    lockedUntil: fails >= 5 ? Date.now() + 30_000 : 0,
  })
  return false
}

export function requestLock(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event('nexus:lock'))
}
