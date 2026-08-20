/**
 * بروزرسانی خودکار — بررسی GitHub Releases برای نسخه‌ی جدید
 *
 * چگونه کار می‌کند:
 *   ۱) GitHub Actions با زدن تگ (مثلاً v1.1.1) نسخه‌ی ویندوز و اندروید را می‌سازد
 *      و فایل‌ها را به عنوان Release Assets آپلود می‌کند.
 *   ۲) این ماژول آخرین release را از API گیت‌هاب می‌خواند.
 *   ۳) اگر نسخه‌ی جدیدتر از نسخه‌ی فعلی باشد، لینک دانلود نشان داده می‌شود.
 */

export const REPO_OWNER = 'aftereditchannel-cell'
export const REPO_NAME = 'rgtr'
const API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`
const RELEASES_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`

export interface ReleaseAsset {
  name: string
  size: number
  browser_download_url: string
  content_type: string
}

export interface Release {
  tag_name: string
  name: string | null
  published_at: string
  body: string | null
  assets: ReleaseAsset[]
}

/** نسخه‌ی فعلی برنامه — با نسخه‌ی ساخت هماهنگ می‌شود */
export const CURRENT_VERSION = '1.1.1'

/**
 * تبدیل نسخه‌ی SemVer به آرایه‌ی عددی برای مقایسه
 * "1.1.1" → [1, 1, 1]
 */
function parseVersion(v: string): number[] {
  return v.replace(/^v/i, '').split('.').map(Number)
}

/**
 * مقایسه‌ی دو نسخه
 * @returns 1 اگر a > b، -1 اگر a < b، 0 اگر مساوی
 */
function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}

export type Platform = 'win' | 'android' | 'web'

/** تشخیص پلتفرم فعلی */
export function currentPlatform(): Platform {
  if (typeof window === 'undefined') return 'web'
  if (window.hq) return 'win' // desktop electron
  if (document.body?.classList.contains('is-mobile')) return 'android'
  return 'web'
}

/** پسوند فایل متناسب با پلتفرم */
function assetFilter(p: Platform): (a: ReleaseAsset) => boolean {
  switch (p) {
    case 'win': return a => /Setup\.exe$/i.test(a.name) || /Portable\.exe$/i.test(a.name)
    case 'android': return a => /\.apk$/i.test(a.name)
    case 'web': return () => false // دانلود خودکار برای وب نداریم
  }
}

export interface UpdateInfo {
  /** آیا نسخه‌ی جدیدتری موجود است؟ */
  hasUpdate: boolean
  /** نسخه‌ی جدید */
  latestVersion: string
  /** لینک دانلود برای پلتفرم فعلی */
  downloadUrl: string | null
  /** نام فایل */
  assetName: string | null
  /** تاریخ انتشار */
  publishedAt: string
  /** متن release notes */
  notes: string | null
  /** خطا */
  error: string | null
}

/**
 * بررسی وجود نسخه‌ی جدید از GitHub Releases
 */
export async function checkForUpdate(platform?: Platform): Promise<UpdateInfo> {
  const p = platform ?? currentPlatform()
  const fallback: UpdateInfo = {
    hasUpdate: false,
    latestVersion: CURRENT_VERSION,
    downloadUrl: null,
    assetName: null,
    publishedAt: '',
    notes: null,
    error: null,
  }

  try {
    const res = await fetch(API_URL, {
      headers: { Accept: 'application/vnd.github+json' },
    })

    if (res.status === 404) {
      // هنوز release‌ای منتشر نشده
      return { ...fallback, error: 'no_release' }
    }

    if (!res.ok) {
      return { ...fallback, error: `HTTP ${res.status}` }
    }

    const release: Release = await res.json()
    const latestVersion = release.tag_name.replace(/^v/i, '')

    if (compareVersions(latestVersion, CURRENT_VERSION) <= 0) {
      return {
        ...fallback,
        latestVersion,
        publishedAt: release.published_at,
        notes: release.body,
      }
    }

    // نسخه‌ی جدیدتر پیدا شد
    const filter = assetFilter(p)
    const asset = release.assets.find(filter)

    return {
      hasUpdate: true,
      latestVersion,
      downloadUrl: asset?.browser_download_url ?? null,
      assetName: asset?.name ?? null,
      publishedAt: release.published_at,
      notes: release.body,
      error: null,
    }
  } catch (e) {
    return { ...fallback, error: (e as Error).message }
  }
}

/** لینک صفحه‌ی ریلیزها */
export function releasesPage(): string {
  return RELEASES_URL
}
