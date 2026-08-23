/**
 * NEXUS HQ — Updater (فرآیند اصلی Electron)
 *
 * چرا این‌جا و نه داخل صفحه؟
 *   ۱. در نسخه‌ی بسته‌بندی‌شده صفحه از file:// بارگذاری می‌شود؛ fetch مستقیم از
 *      صفحه با CORS/سروشب‌های شبکه گیر می‌کند — همان خطای «اتصال برقرار نشد».
 *      این‌جا در فرآیند اصلی (Node) دانلود می‌کنیم: بدون CORS، پایدارتر.
 *   ۲. دانلود استریمی با نمایش درصد پیشرفت، امکان لغو، و نوشتن اتمیک.
 *
 * منبع نسخه‌ها: GitHub Releases همین مخزن.
 *   • مسیر عادی:  api.github.com  (لیست کامل + یادداشت نسخه + حجم فایل‌ها)
 *   • مسیر پشتیبان: اگر API محدود/قطع بود، از ریدایرکت
 *       github.com/<repo>/releases/latest  تگِ آخرین نسخه را می‌خوانیم و چون الگوی
 *       نام فایل‌ها (NEXUS-HQ-<ver>-Setup.exe) ثابت است، لینک مستقیم می‌سازیم.
 *
 * این ماژول «خالص» است: وابستگی‌ها (fetch، مسیرها، ارسال رویداد) تزریق می‌شوند تا
 * بدون اجرای Electron هم بتوان تستش کرد (scripts/test-updater.cjs).
 */

'use strict'

const HTTPS_API = 'https://api.github.com'
const HTTPS_GH = 'https://github.com'

/* ---------------- ابزارها ---------------- */

/** v1.2.10 > v1.2.9 > v1.2 > v1.2-alpha */
function parseVer(v) {
  const m = /^v?(\d+)\.(\d+)(?:\.(\d+))?(?:[-.](\w+))?$/.exec(String(v || '').trim())
  if (!m) return null
  return { major: +m[1], minor: +m[2], patch: m[3] ? +m[3] : 0, pre: m[4] || '' }
}

/** مثبت = a جدیدتر است */
function cmpVersion(a, b) {
  const va = parseVer(a), vb = parseVer(b)
  if (!va || !vb) return String(a).localeCompare(String(b))
  const seg = (x, y) => (x - y)
  let d = seg(va.major, vb.major); if (d) return d
  d = seg(va.minor, vb.minor); if (d) return d
  d = seg(va.patch, vb.patch); if (d) return d
  // نسخه‌ی بدون پسوند > نسخه‌ی آلفا/بتا
  if (!va.pre && vb.pre) return 1
  if (va.pre && !vb.pre) return -1
  return va.pre.localeCompare(vb.pre)
}

/** نام فایل امن بساز — جلوگیری از path traversal */
function safeName(name) {
  return String(name || '').replace(/[^\w.\-() ]+/g, '_').slice(0, 120)
}

/** fetch با timeout و تلاش مجدد — مشکل «اتصال برقرار نشد» را با ۳ تلاش و فاصله جبران می‌کند */
async function fetchRetry(fetchImpl, url, opts = {}, { tries = 3, timeoutMs = 20000, signal } = {}) {
  let lastErr = null
  for (let i = 0; i < tries; i++) {
    const ctrl = new AbortController()
    const onOuterAbort = () => ctrl.abort()
    signal?.addEventListener('abort', onOuterAbort, { once: true })
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetchImpl(url, { ...opts, signal: ctrl.signal })
      return res
    } catch (e) {
      if (signal?.aborted) throw e
      lastErr = e
      // شبکه‌ی ناپایدار: صبر و تلاش دوباره
      await new Promise(r => setTimeout(r, 900 * (i + 1)))
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onOuterAbort)
    }
  }
  throw lastErr || new Error('network')
}

/* ---------------- نرمال‌سازی پاسخ GitHub ---------------- */

/** از میان asset های یک release، نصب‌کننده و پرتابل را جدا کن */
function pickAssets(assets, _repo) {
  const out = { setup: null, portable: null, apk: null, other: [] }
  for (const a of assets || []) {
    const n = (a.name || '').toLowerCase()
    if (n.endsWith('.blockmap') || n.endsWith('.txt') || n.endsWith('.yml')) continue
    if (n.endsWith('-setup.exe') && !out.setup) out.setup = { name: a.name, url: a.browser_download_url, size: a.size || 0 }
    else if (n.endsWith('portable.exe') && !out.portable) out.portable = { name: a.name, url: a.browser_download_url, size: a.size || 0 }
    else if (n.endsWith('.apk') && !out.apk) out.apk = { name: a.name, url: a.browser_download_url, size: a.size || 0 }
    else out.other.push({ name: a.name, url: a.browser_download_url, size: a.size || 0 })
  }
  return out
}

function normalizeRelease(r, repo) {
  if (!r || !r.tag_name) return null
  const assets = pickAssets(r.assets, repo)
  // اگر asset ای نبود (یا API خلاصه برگرداند)، لینک مستقیم با الگوی ثابت بساز
  const ver = String(r.tag_name).replace(/^v/, '')
  if (!assets.setup && !assets.portable) {
    const base = `${HTTPS_GH}/${repo}/releases/download/${r.tag_name}`
    assets.setup = { name: `NEXUS-HQ-${ver}-Setup.exe`, url: `${base}/NEXUS-HQ-${ver}-Setup.exe`, size: 0 }
    assets.portable = { name: `NEXUS-HQ-${ver}-Portable.exe`, url: `${base}/NEXUS-HQ-${ver}-Portable.exe`, size: 0 }
  }
  return {
    tag: r.tag_name,
    version: ver,
    name: r.name || r.tag_name,
    prerelease: !!r.prerelease,
    publishedAt: r.published_at || '',
    notesUrl: r.html_url || `${HTTPS_GH}/${repo}/releases/tag/${r.tag_name}`,
    notes: (r.body || '').slice(0, 4000),
    assets,
  }
}

/* ---------------- سازنده‌ی آپدیتر ---------------- */

/**
 * @param {{ repo: string, fetchImpl: Function, downloadDir: string,
 *           fs: typeof import('node:fs'), path: typeof import('node:path'),
 *           ensureDir: (p: string) => Promise<void> }} deps
 */
function createUpdater(deps) {
  const { repo, fetchImpl, downloadDir, fs, path, ensureDir } = deps
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'NEXUS-HQ-Updater',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  let current = null // آخرین download فعال برای لغو

  /** بررسی نسخه‌ها — مسیر اصلی: API؛ مسیر پشتیبان: ریدایرکت صفحه‌ی releases/latest */
  async function check(currentVersion, outerSignal) {
    // --- مسیر ۱: API (کامل‌ترین) ---
    try {
      const res = await fetchRetry(fetchImpl, `${HTTPS_API}/repos/${repo}/releases?per_page=30`,
        { headers, redirect: 'follow' }, { signal: outerSignal })
      if (res.ok) {
        const json = await res.json()
        const releases = (Array.isArray(json) ? json : [])
          .map(r => normalizeRelease(r, repo))
          .filter(Boolean)
          .filter(r => !r.prerelease || true) // پیش‌نشرها هم در لیست «هر نسخه» هستند
          .sort((a, b) => cmpVersion(b.version, a.version))
        if (releases.length) return { ok: true, source: 'api', releases }
        // لیست خالی یعنی هنوز هیچ release ای منتشر نشده — معتبر است
        return { ok: true, source: 'api', releases: [] }
      }
      // 403/429 = rate limit → مسیر پشتیبان
    } catch { /* → مسیر پشتیبان */ }

    // --- مسیر ۲: تگ آخرین release از روی ریدایرکت ---
    try {
      const res = await fetchRetry(fetchImpl, `${HTTPS_GH}/${repo}/releases/latest`,
        { headers: { 'User-Agent': 'NEXUS-HQ-Updater' }, redirect: 'follow' }, { signal: outerSignal })
      // بعد از follow، res.url باید .../tag/vX.Y.Z باشد
      const m = /\/releases\/tag\/(v?[\w.]+)$/.exec(res.url || '')
      if (m) {
        const tag = m[1]
        const rel = normalizeRelease({ tag_name: tag, name: tag, assets: [] }, repo)
        return { ok: true, source: 'redirect', releases: [rel] }
      }
    } catch { /* → خطای شبکه */ }

    return { ok: false, error: 'network' }
  }

  /** دانلود استریمی با درصد پیشرفت. خروجی: مسیر فایل کامل. */
  async function download({ url, filename, expectedSize }, onProgress, outerSignal) {
    if (current) throw new Error('busy')
    await ensureDir(downloadDir)

    const finalName = safeName(filename || 'NEXUS-HQ-Setup.exe')
    const finalPath = path.join(downloadDir, finalName)
    const partPath = finalPath + '.part'

    const ctrl = new AbortController()
    current = ctrl
    const onOuterAbort = () => ctrl.abort()
    outerSignal?.addEventListener('abort', onOuterAbort, { once: true })

    try {
      const res = await fetchRetry(fetchImpl, url, { redirect: 'follow' }, { tries: 3, timeoutMs: 30000, signal: ctrl.signal })
      if (!res.ok) throw new Error(`http_${res.status}`)

      const total = expectedSize || +(res.headers.get('content-length') || 0)
      let received = 0
      let lastSent = 0
      const body = res.body
      const out = fs.createWriteStream(partPath)

      // body استریم وب است؛ به Node stream تبدیل و pipe می‌کنیم
      const { Readable } = require('node:stream')
      const nodeStream = body && typeof body.getReader === 'function'
        ? Readable.fromWeb(body)
        : body // اگر Node stream باشد

      // لغو در میانه‌ی دانلود: هم استریم وب را قطع کن هم استریم Node را
      ctrl.signal.addEventListener('abort', () => {
        try { body?.cancel?.()?.catch(() => {}) } catch { /* ignore */ }
        nodeStream.destroy(new Error('download_cancelled'))
      }, { once: true })

      await new Promise((resolve, reject) => {
        nodeStream.on('data', (chunk) => {
          received += chunk.length
          const now = Date.now()
          if (now - lastSent > 200) { // هر ۲۰۰ms گزارش بده
            lastSent = now
            onProgress?.({ received, total, percent: total ? Math.floor(received / total * 100) : 0 })
          }
        })
        nodeStream.on('error', reject)
        out.on('error', reject)
        out.on('finish', resolve)
        nodeStream.pipe(out)
      })

      onProgress?.({ received, total: total || received, percent: 100 })
      await fs.promises.rename(partPath, finalPath) // اتمیک: یا کامل یا هیچ
      return { ok: true, path: finalPath, size: received, name: finalName }
    } catch (e) {
      await fs.promises.unlink(partPath).catch(() => {}) // فایل نصفه را پاک کن
      throw e
    } finally {
      outerSignal?.removeEventListener('abort', onOuterAbort)
      current = null
    }
  }

  /** لغو دانلود جاری */
  function cancel() {
    if (current) { current.abort(); current = null; return true }
    return false
  }

  return { check, download, cancel, cmpVersion }
}

module.exports = { createUpdater, cmpVersion, parseVer, normalizeRelease, pickAssets, safeName, fetchRetry }
