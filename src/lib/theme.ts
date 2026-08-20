/**
 * مدیریت پوسته — اعمال تم تیره/روشن و پیروی از تنظیم سیستم‌عامل
 */

export type ThemeName = 'dark' | 'light' | 'auto'

/**
 * پوسته را اعمال می‌کند و مقدار نهایی (dark / light) را برمی‌گرداند
 * تا بتوانیم نوار وضعیت موبایل را هم هماهنگ کنیم.
 */
export function applyTheme(name: ThemeName): 'dark' | 'light' {
  const el = document.documentElement
  if (name === 'auto') {
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    el.removeAttribute('data-theme')
    return prefersDark ? 'dark' : 'light'
  }
  el.setAttribute('data-theme', name)
  return name
}

/**
 * تغییرات تم سیستم‌عامل را رصد می‌کند (فقط در حالت auto).
 * تابع لغو اشتراک برمی‌گرداند.
 */
export function watchSystemTheme(cb: () => void): () => void {
  const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
  if (!mq) return () => {}
  const h = () => cb()
  mq.addEventListener('change', h)
  return () => mq.removeEventListener('change', h)
}
