/**
 * همگام‌سازی خودکار با GitHub Gist.
 *
 * وقتی «همگام‌سازی خودکار» روشن است و توکن + شناسه‌ی Gist تنظیم شده:
 *   • بعد از هر تغییر محلی (با چند ثانیه تأخیر) داده‌ها بی‌صدا روی Gist نوشته می‌شوند.
 *   • هنگام باز شدن برنامه، آخرین نسخه‌ی ابری بررسی می‌شود و اگر جدیدتر بود،
 *     همین دستگاه با آن به‌روز می‌شود (یک نقطه بازیابی هم ساخته می‌شود).
 *
 * به این ترتیب «هر تغییری روی گیت ذخیره می‌شود» و «روی هر دستگاه/اکانتی که
 * بیایید، تغییرات برمی‌گردد».
 */
import { useApp } from '../store/useApp'
import type { AppData } from '../store/types'
import { migrate } from './migrate'
import { hasToken, pullGist, ensureGist, pushGist } from './cloud'

let pushTimer: ReturnType<typeof setTimeout> | null = null
let inFlight = false

/** بدون touch() — فقط متادیتای ابر را به‌روز می‌کند تا حلقه‌ی همگام‌سازی درست نشود */
function setCloudMeta(patch: { gistId?: string; lastSync?: string }): void {
  useApp.setState(s => ({
    data: {
      ...s.data,
      settings: { ...s.data.settings, cloud: { ...s.data.settings.cloud, ...patch } },
    },
  }))
}

function isReady(): boolean {
  const c = useApp.getState().data.settings.cloud
  return !!c.autoSync && hasToken() && !!c.gistId
}

/**
 * ارسال خودکار را با تأخیر زمان‌بندی می‌کند.
 * از App بعد از هر persist (بازگشت dirty به false) صدا زده می‌شود.
 */
export function scheduleAutoPush(): void {
  if (!isReady()) return
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => { void runAutoPush() }, 3500)
}

async function runAutoPush(): Promise<void> {
  if (inFlight || !isReady()) return
  const st = useApp.getState()
  const c = st.data.settings.cloud
  inFlight = true
  try {
    // داده‌ی درون حافظه از قبل روی دیسک ذخیره شده؛ فقط به ابر می‌فرستیم
    const fresh: AppData = useApp.getState().data
    const { id, created } = await ensureGist(c.gistId, fresh)
    await pushGist(id, fresh)
    const meta: { gistId?: string; lastSync: string } = { lastSync: new Date().toISOString() }
    if (created) meta.gistId = id
    setCloudMeta(meta)
  } catch {
    /* بی‌صدا — آفلاین بودن نباید مزاحم کاربر شود */
  } finally {
    inFlight = false
  }
}

/**
 * هنگام باز شدن برنامه: اگر نسخه‌ی ابری جدیدتر از آخرین همگام‌سازی این دستگاه
 * باشد، آن را اعمال می‌کند (تغییراتِ دستگاه دیگر برمی‌گردد).
 */
export async function autoPullOnStart(): Promise<void> {
  if (!isReady()) return
  const c = useApp.getState().data.settings.cloud
  try {
    const remote = await pullGist(c.gistId)
    if (!remote) return
    // اگر این دستگاه خودش آخرین‌بار نوشته، چیزی برای کشیدن نیست
    if (c.lastSync && remote.updatedAt && remote.updatedAt <= c.lastSync) return
    const st = useApp.getState()
    await st.replaceAll(migrate(remote.data) as AppData)
    setCloudMeta({ gistId: c.gistId, lastSync: new Date().toISOString() })
  } catch {
    /* بی‌صدا */
  }
}
