/**
 * NEXUS HQ — سرور تک‌فایلی ویندوز
 * با Bun به یک EXE مستقل کامپایل می‌شود؛ همه‌ی فایل‌های برنامه (dist/)
 * داخل خود EXE تعبیه شده‌اند — بدون نصب، بدون اینترنت، بدون وابستگی.
 *
 * ساخت:  bun build build-exe/server.ts --compile --target=bun-windows-x64 --outfile release/NEXUS-HQ-...exe
 */
import { serve } from 'bun'
import { embedded, embeddedIndexHtml } from './embedded'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
}

const mimeOf = (p: string) => MIME[p.slice(p.lastIndexOf('.')).toLowerCase()] ?? 'application/octet-stream'

// پورت آزاد پیدا می‌کنیم (8765 تا 8780) تا تداخل با برنامه‌های دیگر پیش نیاید
async function listen() {
  for (let port = 8765; port <= 8780; port++) {
    try {
      return serve({
        port,
        hostname: '127.0.0.1',
        idleTimeout: 255,
        fetch(req) {
          const url = new URL(req.url)
          let path = decodeURIComponent(url.pathname)
          if (path === '/' || path === '') path = '/index.html'
          // SPA: هر مسیر ناشناخته → index.html (روتینگ برنامه hash-based است)
          const known = embedded[path]
          const file = known ?? embeddedIndexHtml
          const ctype = known ? mimeOf(path) : MIME['.html']
          return new Response(Bun.file(file), {
            headers: { 'content-type': ctype, 'cache-control': 'no-store' },
          })
        },
      })
    } catch { /* پورت اشغال است — بعدی */ }
  }
  throw new Error('no free port in 8765..8780')
}

const server = await listen()
const url = `http://127.0.0.1:${server.port}/`

console.log('┌──────────────────────────────────────────────────┐')
console.log('│  NEXUS HQ — Personal Business Operating System   │')
console.log('│  Persian/English · local-first · offline         │')
console.log('└──────────────────────────────────────────────────┘')
console.log()
console.log(`  ▶ App:  ${url}`)
console.log('  ▶ داده‌ها در همین کامپیوتر ذخیره می‌شوند (مرورگر شما)')
console.log('  ▶ این پنجره را باز نگه دارید؛ برای خروج ببندید.')
console.log('  ▶ Keep this window open. Closing it stops the app.')
console.log()

// باز کردن مرورگر پیش‌فرض
try {
  if (process.platform === 'win32') Bun.spawnSync(['cmd', ['/c', 'start', '', url], { cwd: '.' }])
  else if (process.platform === 'darwin') Bun.spawnSync(['open', [url]])
  else Bun.spawnSync(['xdg-open', [url]])
} catch { /* کاربر خودش آدرس را باز کند */ }

// برای همیشه روشن
setInterval(() => {}, 1 << 30)
