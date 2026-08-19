/**
 * تم برنامه — تاریک / روشن / خودکار.
 * در حالت خودکار، رنگ‌ها با تنظیم سیستم‌عامل هماهنگ می‌شوند.
 */
export type Theme = 'dark' | 'light' | 'auto'

export function applyTheme(theme: Theme): 'dark' | 'light' {
  const effective: 'dark' | 'light' =
    theme === 'auto'
      ? (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches
          ? 'light'
          : 'dark')
      : theme
  const root = document.documentElement
  root.classList.toggle('theme-light', effective === 'light')
  root.classList.toggle('theme-dark', effective === 'dark')
  root.style.colorScheme = effective
  return effective
}

export function watchSystemTheme(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => cb()
  mq.addEventListener?.('change', handler)
  return () => mq.removeEventListener?.('change', handler)
}
