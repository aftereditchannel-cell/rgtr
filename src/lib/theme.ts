export type ThemePref = 'auto' | 'dark' | 'light'
export type EffectiveTheme = 'dark' | 'light'

function systemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function paintMeta(eff: EffectiveTheme) {
  const color = eff === 'light' ? '#eef1f7' : '#08090c'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', color)
}

/** اعمال پوسته روی <html data-theme> و برگرداندن پوسته‌ی مؤثر */
export function applyTheme(pref: ThemePref | string | undefined): EffectiveTheme {
  const p: ThemePref = pref === 'light' || pref === 'auto' || pref === 'dark' ? pref : 'dark'
  const eff: EffectiveTheme = p === 'auto' ? systemTheme() : p
  document.documentElement.setAttribute('data-theme', eff)
  paintMeta(eff)
  return eff
}

/** گوش‌دادن به تغییر تم سیستم — فقط وقتی پوسته روی auto است لازم است */
export function watchSystemTheme(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const handler = () => cb()
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
