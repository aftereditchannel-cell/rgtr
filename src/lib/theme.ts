/**
 * سیستم پوسته: تیره / روشن / همراه سیستم.
 * پوسته روی <html data-theme="..."> اعمال می‌شود و همه‌ی رنگ‌ها از
 * متغیرهای CSS می‌آیند (index.css). مقدار «همراه سیستم» از
 * prefers-color-scheme پیروی می‌کند و با تغییر سیستم لحظه‌ای عوض می‌شود.
 */

export type ThemeChoice = 'dark' | 'light' | 'auto'

const LIGHT_BG = '#eef1f7'
const DARK_BG = '#08090c'

export function systemPrefersLight(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: light)').matches
}

/** پوسته‌ی واقعی — حالت auto به پیش‌فرض سیستم تبدیل می‌شود */
export function effectiveTheme(t: ThemeChoice): 'dark' | 'light' {
  if (t === 'auto') return systemPrefersLight() ? 'light' : 'dark'
  return t
}

/** اعمال پوسته روی سند؛ پوسته‌ی مؤثر را برمی‌گرداند تا StatusBar هم هماهنگ شود */
export function applyTheme(t: ThemeChoice): 'dark' | 'light' {
  const eff = effectiveTheme(t)
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', eff)
    document.documentElement.style.colorScheme = eff
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = eff === 'dark' ? DARK_BG : LIGHT_BG
  }
  return eff
}

/** شنیدن تغییر پوسته‌ی سیستم (فقط در حالت auto مصرف‌کننده دارد) */
export function watchSystemTheme(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const handler = (e: MediaQueryListEvent) => { if (e.matches !== undefined) cb() }
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
