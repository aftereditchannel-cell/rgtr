/**
 * مخزن امن API Keyها
 * ====================
 * اولویت: انبار بومیِ هر پلتفرم (در ویندوز DPAPI با رمزنگاری ویندوز،
 * در اندروید حافظه‌ی خصوصی برنامه). اگر برنامه در مرورگر اجرا شود،
 * fallback به localStorage (بدون ادعای امنیت سرورمحور).
 *
 * کلیدها هرگز داخل AppData/بکاپ/Export قرار نمی‌گیرند و در UI ماسک می‌شوند.
 */

type NativeKeyStore = {
  get(name: string): string | null
  set(name: string, value: string): boolean
  delete(name: string): boolean
}

declare global {
  interface Window { NexusKeyStore?: NativeKeyStore }
}

const LS = 'nexus.apikeys'
type Keys = Record<string, string>

function readLocal(): Keys {
  try { return JSON.parse(localStorage.getItem(LS) ?? '{}') as Keys } catch { return {} }
}
function writeLocal(k: Keys) { localStorage.setItem(LS, JSON.stringify(k)) }

export function secureAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.NexusKeyStore
}

export function getKey(name: string): string | null {
  const native = window.NexusKeyStore
  if (native) {
    try { return native.get(name) || null } catch { /* */ }
  }
  return readLocal()[name] ?? null
}

export function setKey(name: string, value: string): void {
  const native = window.NexusKeyStore
  if (native) {
    try {
      native.set(name, value)
      return
    } catch { /* */ }
  }
  const k = readLocal()
  if (value) k[name] = value; else delete k[name]
  writeLocal(k)
}

export function deleteKey(name: string): void {
  const native = window.NexusKeyStore
  if (native) {
    try { native.delete(name) } catch { /* */ }
  }
  const k = readLocal()
  delete k[name]
  writeLocal(k)
}

export function listKeyNames(): string[] {
  return Array.from(new Set(Object.keys(readLocal())))
}

/** نمایش ماسک‌شده برای UI — هرگز کلید کامل را نشان نده */
export function maskKey(name: string): string {
  const v = getKey(name)
  if (!v) return ''
  if (v.length <= 8) return '••••'
  return v.slice(0, 4) + '••••' + v.slice(-4)
}
