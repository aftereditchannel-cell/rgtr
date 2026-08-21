/**
 * سیستم پوسته: تیره / روشن / همراه سیستم.
 * پوسته روی <html data-theme="..."> اعمال می‌شود و همه‌ی رنگ‌ها از
 * متغیرهای CSS می‌آیند (index.css). مقدار «همراه سیستم» از
 * prefers-color-scheme پیروی می‌کند و با تغییر سیستم لحظه‌ای عوض می‌شود.
 */

export type ThemeMode = 'dark' | 'light' | 'auto'

const LIGHT_BG = '#eef1f7'
const DARK_BG = '#08090c'

/** آیا سیستم‌عامل پوسته‌ی روشن می‌خواهد؟ */
export function systemPrefersLight(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: light)').matches
}

/** پوسته‌ی واقعی — حالت auto به پیش‌فرض سیستم تبدیل می‌شود */
export function effectiveTheme(t: ThemeMode): 'dark' | 'light' {
  if (t === 'auto') return systemPrefersLight() ? 'light' : 'dark'
  return t
}

/** پوسته را اعمال می‌کند و پوسته‌ی مؤثر (dark|light) را برمی‌گرداند */
export function applyTheme(mode: ThemeMode): 'dark' | 'light' {
  const eff = effectiveTheme(mode)
  if (typeof document !== 'undefined') {
    const el = document.documentElement
    el.setAttribute('data-theme', eff)
    el.style.colorScheme = eff
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (meta) meta.content = eff === 'dark' ? DARK_BG : LIGHT_BG
  }
  return eff
}

/** نظارت بر تغییر پوسته‌ی سیستم (فقط وقتی mode=auto لازم است). تابع لغو اشتراک برمی‌گرداند. */
export function watchSystemTheme(cb: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const handler = (e: MediaQueryListEvent) => { if (e.matches !== undefined) cb() }
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}

/** حالت «شیشه‌ای» را روشن/خاموش می‌کند — CSS با data-glass سطوح را شفاف‌تر می‌کند */
export function applyGlass(on: boolean): void {
  if (typeof document === 'undefined') return
  const el = document.documentElement
  if (on) el.setAttribute('data-glass', '1')
  else el.removeAttribute('data-glass')
}
