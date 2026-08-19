/**
 * NEXUS HQ — کمک‌تابع‌های بروزرسانی (سمت صفحه)
 *
 * دسکتاپ: همه‌ی شبکه در فرآیند اصلی Electron انجام می‌شود (`desktop.updateCheck`)
 *   → بدون CORS، با تلاش مجدد — دیگر خطای «اتصال برقرار نشد» فایل file:// نمی‌گیریم.
 * وب/اندروید: همین منطق با fetch مرورگر (گیت‌هاب CORS را باز گذاشته) —
 *   برای نمایش نسخه‌ی جدید و لینک دانلود.
 */
import pkg from '../../package.json'
import { desktop } from './desktop'
import type { UpdateCheckResult, UpdateRelease } from './desktop'

export const APP_VERSION: string = pkg.version

/** مخزن انتشار — همان‌جایی که workflow نسخه‌ها را build می‌کند */
export const UPDATE_REPO = 'aftereditchannel-cell/rgtr'

/* ---------------- مقایسه‌ی نسخه ---------------- */

export function parseVer(v: string): { major: number; minor: number; patch: number; pre: string } | null {
  const m = /^v?(\d+)\.(\d+)(?:\.(\d+))?(?:[-.](\w+))?$/.exec(String(v || '').trim())
  if (!m) return null
  return { major: +m[1], minor: +m[2], patch: m[3] ? +m[3] : 0, pre: m[4] ?? '' }
}

/** مثبت = a جدیدتر است */
export function cmpVersion(a: string, b: string): number {
  const va = parseVer(a), vb = parseVer(b)
  if (!va || !vb) return String(a).localeCompare(String(b))
  let d = va.major - vb.major; if (d) return d
  d = va.minor - vb.minor; if (d) return d
  d = va.patch - vb.patch; if (d) return d
  if (!va.pre && vb.pre) return 1
  if (va.pre && !vb.pre) return -1
  return va.pre.localeCompare(vb.pre)
}

/* ---------------- نمایش ---------------- */

export function fmtMB(bytes: number): string {
  if (!bytes) return ''
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

export function fmtDate(iso: string, lang: string): string {
  if (!iso) return ''
  try { return new Date(iso).toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US') } catch { return '' }
}

/* ---------------- بررسی نسخه ---------------- */

type GhAsset = { name: string; browser_download_url: string; size?: number }
type GhRelease = { tag_name: string; name?: string; prerelease?: boolean; published_at?: string; html_url?: string; body?: string; assets?: GhAsset[] }

function normalize(r: GhRelease): UpdateRelease | null {
  if (!r?.tag_name) return null
  const ver = r.tag_name.replace(/^v/, '')
  const pick = (pred: (n: string) => boolean): UpdateRelease['assets']['setup'] => {
    const a = (r.assets ?? []).find(x => pred((x.name ?? '').toLowerCase()))
    return a ? { name: a.name, url: a.browser_download_url, size: a.size ?? 0 } : null
  }
  return {
    tag: r.tag_name,
    version: ver,
    name: r.name || r.tag_name,
    prerelease: !!r.prerelease,
    publishedAt: r.published_at ?? '',
    notesUrl: r.html_url || `https://github.com/${UPDATE_REPO}/releases/tag/${r.tag_name}`,
    notes: (r.body ?? '').slice(0, 4000),
    assets: {
      setup: pick(n => n.endsWith('-setup.exe')),
      portable: pick(n => n.endsWith('portable.exe')),
      apk: pick(n => n.endsWith('.apk')),
      other: [],
    },
  }
}

async function fetchJson(url: string, timeoutMs = 15000): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) throw new Error(`http_${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/** بررسی بروزرسانی — دسکتاپ از IPC، وب از fetch مستقیم */
export async function checkForUpdates(currentVersion: string): Promise<UpdateCheckResult> {
  if (desktop) return desktop.updateCheck()

  // --- وب: API گیت‌هاب (CORS باز) + پشتیبانِ ریدایرکت ---
  try {
    const json = await fetchJson(`https://api.github.com/repos/${UPDATE_REPO}/releases?per_page=30`)
    const releases = (Array.isArray(json) ? (json as GhRelease[]) : [])
      .map(normalize)
      .filter((r): r is UpdateRelease => !!r)
      .sort((a, b) => cmpVersion(b.version, a.version))
    return {
      ok: true, source: 'web', releases,
      current: currentVersion,
      hasUpdate: !!(releases[0] && cmpVersion(releases[0].version, currentVersion) > 0),
    }
  } catch { /* → پشتیبان */ }

  try {
    const res = await fetch(`https://github.com/${UPDATE_REPO}/releases/latest`, { redirect: 'follow' })
    const m = /\/releases\/tag\/(v?[\w.\-]+)$/.exec(res.url || '')
    if (m) {
      const rel = normalize({ tag_name: m[1] })
      if (rel) {
        // الگوی نام فایل ثابت است — لینک مستقیم بساز
        if (!rel.assets.setup && !rel.assets.portable) {
          const base = `https://github.com/${UPDATE_REPO}/releases/download/${rel.tag}`
          rel.assets.setup = { name: `NEXUS-HQ-${rel.version}-Setup.exe`, url: `${base}/NEXUS-HQ-${rel.version}-Setup.exe`, size: 0 }
          rel.assets.portable = { name: `NEXUS-HQ-${rel.version}-Portable.exe`, url: `${base}/NEXUS-HQ-${rel.version}-Portable.exe`, size: 0 }
        }
        return { ok: true, source: 'web', releases: [rel], current: currentVersion, hasUpdate: cmpVersion(rel.version, currentVersion) > 0 }
      }
    }
  } catch { /* → خطا */ }

  return { ok: false, error: 'network' }
}
