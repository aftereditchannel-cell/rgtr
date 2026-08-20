/**
 * قفل صفحه — PIN ساده + قفل خودکار
 * ذخیره‌سازی: PIN هش‌شده در localStorage (خارج از داده‌ی اصلی تا از بکاپ خارج شود)
 */

import type { AppData } from '../store/types'

/* ---------- تنظیمات ---------- */

export interface LockSettings {
  /** فعال‌بودن قفل */
  enabled: boolean
  /** هش SHA-256 کد ۴ رقمی */
  pinHash: string
  /** مدت بیکاری تا قفل خودکار (دقیقه). -1 = فقط هنگام بازشدن برنامه، 0 = فوری */
  autoLockMin: number
  /** فعال‌بودن اثرانگشت / Face ID */
  biometric: boolean
}

const STORAGE_KEY = 'nexus-hq-lock'

function defaults(): LockSettings {
  return { enabled: false, pinHash: '', autoLockMin: 0, biometric: false }
}

export function readLock(): LockSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults()
    return { ...defaults(), ...JSON.parse(raw) }
  } catch { return defaults() }
}

function writeLock(s: LockSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

export function isLockEnabled(): boolean {
  const s = readLock()
  return s.enabled && !!s.pinHash
}

/* ---------- هش ساده ---------- */
async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/* ---------- عملیات ---------- */

export async function setPin(pin: string): Promise<void> {
  const hash = await sha256(pin)
  writeLock({ ...readLock(), enabled: true, pinHash: hash })
}

export async function verifyPin(pin: string): Promise<boolean> {
  const hash = await sha256(pin)
  return hash === readLock().pinHash
}

export function setAutoLock(min: number) {
  writeLock({ ...readLock(), autoLockMin: min })
}

export function setBiometric(on: boolean) {
  writeLock({ ...readLock(), biometric: on })
}

export function disableLock() {
  writeLock({ ...defaults(), enabled: false, pinHash: '' })
}

export function updateLock(patch: Partial<LockSettings>) {
  writeLock({ ...readLock(), ...patch })
}
