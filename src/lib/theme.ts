/**
 * پوسته‌ی رنگی برنامه: تیره، روشن یا «همراه سیستم».
 * اعمال پوسته فقط با یک ویژگی `data-theme` روی <html> انجام می‌شود و
 * همه‌ی رنگ‌ها از متغیرهای CSS در index.css می‌آیند.
 */

export type ThemeMode = 'auto' | 'dark' | 'light'
/** پوسته‌ی مؤثر پس از حل شدن auto — چیزی که واقعاً دیده می‌شود */
export type EffectiveTheme = 'dark' | 'light'

/** سیستم تیره است؟ (در محیط‌های بدون matchMedia پیش‌فرض تیره) */
function systemPrefersDark(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return true
  }
}

/** حل کردن پوسته‌ی تنظیم‌شده به پوسته‌ی مؤثر */
export function resolveTheme(mode: ThemeMode | undefined | null): EffectiveTheme {
  if (mode === 'light') return 'light'
  if (mode === 'dark') return 'dark'
  return systemPrefersDark() ? 'dark' : 'light'
}

/**
 * اعمال پوسته روی سند + همگام‌کردن رنگ نوار آدرس مرورگر موبایل.
 * پوسته‌ی مؤثر را برمی‌گرداند (برای هماهنگ‌کردن نوار وضعیت اندروید).
 */
export function applyTheme(mode: ThemeMode | undefined | null): EffectiveTheme {
  const eff = resolveTheme(mode)
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', eff)
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', eff === 'dark' ? '#08090c' : '#eef1f7')
  }
  return eff
}

/**
 * گوش دادن به تغییر پوسته‌ی سیستم (برای حالت auto).
 * تابع لغو را برمی‌گرداند.
 */
export function watchSystemTheme(cb: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const h = () => cb()
  // Safari قدیمی فقط addListener دارد
  if (typeof mq.addEventListener === 'function') {
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }
  mq.addListener(h)
  return () => mq.removeListener(h)
}
