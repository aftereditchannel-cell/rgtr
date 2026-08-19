/**
 * سیستم پوسته: تیره / روشن / سیستم.
 * فقط data-theme را روی <html> ست می‌کند؛ همه‌ی رنگ‌ها در index.css از متغیرهای CSS می‌آیند.
 * حالت «سیستم» از تنظیم ویندوز/اندروید پیروی می‌کند.
 */

export type ThemeMode = 'dark' | 'light' | 'auto'

/** پوسته را اعمال می‌کند و پوسته‌ی مؤثر (dark|light) را برمی‌گرداند */
export function applyTheme(mode: ThemeMode): 'dark' | 'light' {
  const eff: 'dark' | 'light' = mode === 'auto'
    ? (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : mode
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', eff)
  }
  return eff
}

/** نظارت بر تغییر پوسته‌ی سیستم (فقط وقتی mode=auto لازم است). تابع لغو اشتراک برمی‌گرداند. */
export function watchSystemTheme(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia?.('(prefers-color-scheme: light)')
  if (!mq || !mq.addEventListener) return () => {}
  const h = () => cb()
  mq.addEventListener('change', h)
  return () => mq.removeEventListener('change', h)
}

/** حالت «شیشه‌ای» را روشن/خاموش می‌کند — CSS با data-glass سطوح را شفاف‌تر می‌کند */
export function applyGlass(on: boolean): void {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  if (on) el.setAttribute('data-glass', '1')
  else el.removeAttribute('data-glass')
}
