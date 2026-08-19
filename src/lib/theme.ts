/**
 * مدیریت تم روشن/تیره/خودکار.
 * تم فقط از طریق ویژگی data-theme روی <html> اعمال می‌شود؛
 * CSS متغیرهای رنگ را برای html[data-theme='light'] بازنویسی می‌کند
 * و حالت پیش‌فرض (بدون ویژگی یا dark) همان تم تیره است.
 */
export type Theme = 'dark' | 'light' | 'auto'

/** تم مؤثر (بعد از حلِ حالت خودکار) را برمی‌گرداند */
function resolve(theme: Theme): 'dark' | 'light' {
  if (theme === 'auto') {
    try {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    } catch {
      return 'dark'
    }
  }
  return theme
}

/**
 * تم را روی سند اعمال می‌کند و تم مؤثر را برمی‌گرداند
 * تا لایه‌های بومی (مثلاً نوار وضعیت اندروید) با آن هماهنگ شوند.
 */
export function applyTheme(theme: Theme): 'dark' | 'light' {
  const effective = resolve(theme)
  const el = document.documentElement
  el.setAttribute('data-theme', effective)
  // هماهنگ‌کردن رنگ اسکرول‌بار و پس‌زمینه‌ی سیستم
  document.body.style.colorScheme = effective
  return effective
}

/**
 * دنبال‌کردن تغییر تمِ سیستم در حالت «خودکار».
 * تابع لغو اشتراک برمی‌گرداند (برای cleanup در useEffect).
 */
export function watchSystemTheme(cb: () => void): () => void {
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => cb()
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
    // fallback برای مرورگرهای خیلی قدیمی
    mq.addListener?.(handler)
    return () => mq.removeListener?.(handler)
  } catch {
    return () => {}
  }
}
