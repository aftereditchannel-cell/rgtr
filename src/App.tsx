import { useCallback, useEffect, useRef, useState } from 'react'
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useApp } from './store/useApp'
import { Sidebar } from './components/layout/Sidebar'
import { BottomNav } from './components/layout/BottomNav'
import { CommandPalette } from './components/layout/CommandPalette'
import { Dashboard } from './pages/Dashboard'
import { DecisionCenter } from './pages/DecisionCenter'
import { Analytics } from './pages/Analytics'
import { Settings } from './pages/Settings'
import { ModulePage } from './pages/ModulePage'
import { Help } from './pages/Help'
import { SocialHub } from './pages/SocialHub'
import { Automation } from './pages/Automation'
import { Button, Icon, Modal } from './components/ui/Primitives'
import { BrandMark } from './components/ui/BrandMark'
import { desktop } from './lib/desktop'
import { exportJSON, importViaDialog } from './lib/backup'
import { useT, tr, cloudError } from './i18n'
import { ExitSavePrompt } from './components/layout/ExitSavePrompt'
import { LockScreen } from './components/layout/LockScreen'
import { applyTheme, applyGlass, watchSystemTheme } from './lib/theme'
import { isLockEnabled, readLock, LOCK_EVENT } from './lib/lock'
import { isMobile, syncMobileChrome, onMobileResume } from './lib/mobile'
import { autoPullIfEnabled, refreshCloudNow, retryPendingCloudSync } from './store/useApp'
import { configureCloudProvider, initCloudAuth, mapCloudError, watchCloudUser } from './lib/cloud'
import { fetchProfileCached } from './domain/social'

/** پل منوی بومی ویندوز → روتر و اکشن‌های برنامه */
function DesktopMenuBridge() {
  const nav = useNavigate()
  useEffect(() => {
    if (!desktop) return
    // خبر نسخه‌ی جدید که آپدیترِ پس‌زمینه پیدا کرد → toast + رفتن به تنظیمات
    const unSubUpdate = desktop.onUpdate((name, payload) => {
      if (name !== 'available') return
      const st = useApp.getState()
      const lang = st.data.settings.lang ?? 'fa'
      const v = (payload as { version?: string } | undefined)?.version ?? ''
      st.setToast(tr(lang, 'upd.foundToast', { v }))
    })
    return () => { unSubUpdate() }
  }, [])
  useEffect(() => {
    if (!desktop) return
    return desktop.onMenu(async (name, payload) => {
      const st = useApp.getState()
      const lang = st.data.settings.lang ?? 'fa'
      if (name === 'navigate' && payload) nav(payload)
      else if (name === 'palette') {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
      } else if (name === 'lock') {
        window.dispatchEvent(new Event(LOCK_EVENT))
      } else if (name === 'export') {
        const path = await exportJSON(st.data)
        if (path) st.setToast(tr(lang, 'toast.savedTo', { f: path.split(/[\\/]/).pop() ?? '' }))
      } else if (name === 'import') {
        try {
          const d = await importViaDialog()
          if (!d) return
          if (await desktop!.confirm({
            message: tr(lang, 'toast.replaceData'),
            detail: tr(lang, 'toast.autoSnapshot'),
          })) {
            await st.replaceAll(d)
            st.setToast(tr(lang, 'toast.backupRestored'))
          }
        } catch (e) { alert(tr(lang, 'common.error') + ': ' + (e as Error).message) }
      }
    })
  }, [nav])
  return null
}

function Shell() {
  const [navOpen, setNavOpen] = useState(false)
  const [syncFailure, setSyncFailure] = useState<{ code: string; detail?: string } | null>(null)
  const toast = useApp(s => s.toast)
  const accent = useApp(s => s.data.settings.accent)
  const appName = useApp(s => s.data.settings.branding?.appName ?? 'NEXUS HQ')
  const { lang, rtl, t } = useT()
  const pullStart = useRef<number | null>(null)
  const refresh = () => {
    // یک Refresh دستی، پروفایل‌های اجتماعی صفحه‌ی فعلی را هم تازه می‌کند.
    window.dispatchEvent(new Event('nexus:refresh-social'))
    void refreshCloudNow().then(changed => {
      useApp.getState().setToast(t(changed ? 'set.cloudPulled' : 'set.cloudUpToDate'))
    }).catch(error => {
      const cloudErr = mapCloudError(error)
      const detail = cloudErr.detail ? ` — ${t('sync.errorCode')}: ${cloudErr.detail}` : ''
      useApp.getState().setToast(`${t('sync.failed')}: ${cloudError(lang, cloudErr.code)}${detail}`)
    })
  }

  useEffect(() => {
    const onFailure = (event: Event) => setSyncFailure((event as CustomEvent<{ code: string; detail?: string }>).detail)
    window.addEventListener('nexus:cloud-sync-failed', onFailure)
    return () => window.removeEventListener('nexus:cloud-sync-failed', onFailure)
  }, [])

  // وقتی اینترنت برگردد، فقط داده‌ای که قبلاً با وضعیت «فقط محلی» مانده دوباره ارسال می‌شود.
  useEffect(() => {
    const retryWhenOnline = () => {
      if (!useApp.getState().data.settings.cloud.pendingSync) return
      void retryPendingCloudSync().then(() => useApp.getState().setToast(t('set.cloudPushed'))).catch(() => { /* دیالوگ pending هنوز در تنظیمات باقی می‌ماند */ })
    }
    window.addEventListener('online', retryWhenOnline)
    return () => window.removeEventListener('online', retryWhenOnline)
  }, [t])

  const retryPending = () => {
    void retryPendingCloudSync().then(() => {
      setSyncFailure(null)
      useApp.getState().setToast(t('set.cloudPushed'))
    }).catch(error => {
      const cloudErr = mapCloudError(error)
      setSyncFailure(cloudErr)
    })
  }

  useEffect(() => {
    document.documentElement.style.setProperty('--color-acc', accent)
  }, [accent])

  // جهت و زبان کل سند با تنظیمات همگام می‌شود
  useEffect(() => {
    const el = document.documentElement
    el.setAttribute('dir', rtl ? 'rtl' : 'ltr')
    el.setAttribute('lang', lang)
  }, [lang, rtl])

  // نام برنامه روی عنوان پنجره
  useEffect(() => {
    document.title = appName
  }, [appName])

  return (
    /* h-dvh به‌جای h-full: نوار آدرس متغیر مرورگر موبایل نباید ته صفحه را ببرد زیر خط */
    <div className="flex h-full max-h-[100dvh]">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* نوار بالای موبایل */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-2.5 glass-strong border-b border-[var(--glass-brd)] shrink-0"
          style={{ paddingTop: 'calc(0.625rem + var(--sat))' }}>
          <button onClick={() => setNavOpen(true)} className="text-[var(--color-dim)] p-1.5 -m-1 rounded-lg active:bg-[var(--hover)]" aria-label="menu">
            <Icon name="Menu" size={19} />
          </button>
          <span className="text-[13px] font-semibold flex-1 truncate">{appName}</span>
          <button onClick={refresh} className="text-[var(--color-dim)] p-1.5 -m-1 rounded-lg active:bg-[var(--hover)]" aria-label={t('set.cloudRefresh')} title={t('set.cloudRefresh')}>
            <Icon name="RefreshCw" size={17} />
          </button>
        </div>

        <main className="flex-1 scroll-y" onTouchStart={e => { if (e.currentTarget.scrollTop <= 0) pullStart.current = e.touches[0]?.clientY ?? null }} onTouchEnd={e => {
          const start = pullStart.current; pullStart.current = null
          if (start !== null && e.currentTarget.scrollTop <= 0 && (e.changedTouches[0]?.clientY ?? start) - start > 70) refresh()
        }}>
          <div className="max-w-[1400px] mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/decision" element={<DecisionCenter />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/social" element={<SocialHub />} />
              <Route path="/automation" element={<Automation />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help" element={<Help />} />
              <Route path="/m/:key" element={<ModulePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>

        {/* ناوبری پایین — فقط موبایل */}
        <BottomNav onMore={() => setNavOpen(true)} />
      </div>

      <DesktopMenuBridge />
      <CommandPalette />
      <ExitSavePrompt />

      {syncFailure && <Modal open onClose={() => setSyncFailure(null)} title={t('sync.localSavedTitle')}
        footer={<><Button size="sm" variant="ghost" onClick={() => setSyncFailure(null)}>{t('sync.keepLocal')}</Button><Button size="sm" variant="primary" icon="RefreshCw" onClick={retryPending}>{t('sync.retry')}</Button></>}>
        <div className="space-y-2 text-[12.5px] leading-relaxed">
          <p>{t('sync.localSavedBody')}</p>
          <p className="text-red-400">{cloudError(lang, syncFailure.code)}{syncFailure.detail ? ` — ${t('sync.errorCode')}: ${syncFailure.detail}` : ''}</p>
          <p className="text-[11px] text-[var(--color-dim2)]">{t('sync.localSavedHint')}</p>
        </div>
      </Modal>}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 z-[70] anim px-3 w-full max-w-sm"
          style={{ bottom: 'calc(1.25rem + var(--sab) + var(--toast-lift, 0px))' }}>
          <div className="flex items-center gap-2 rounded-xl glass-strong px-4 py-2.5 shadow-2xl">
            <Icon name="CheckCircle2" size={15} className="text-emerald-500 shrink-0" />
            <span className="text-[12.5px] min-w-0">{toast}</span>
          </div>
        </div>
      )}
    </div>
  )
}

/** انتخاب پوسته + قفل، بیرون از روتر تا کل برنامه را در بر بگیرد */
function Root() {
  const theme = useApp(s => s.data.settings.theme) ?? 'dark'
  const glass = useApp(s => s.data.settings.glass) ?? true
  const [locked, setLocked] = useState(() => isLockEnabled())
  const lastActive = useRef(Date.now())

  // اعمال پوسته + پیروی از تنظیم سیستم در حالت auto + افکت شیشه‌ای
  useEffect(() => {
    const eff = applyTheme(theme)
    if (isMobile) void syncMobileChrome(eff)
    if (theme !== 'auto') return
    return watchSystemTheme(() => {
      const e2 = applyTheme('auto')
      if (isMobile) void syncMobileChrome(e2)
    })
  }, [theme])

  useEffect(() => { applyGlass(glass) }, [glass])

  // فقط یک‌بار در شروع برنامه از ابر بررسی می‌کنیم؛ بعد از آن Refresh دستی است.
  useEffect(() => { void autoPullIfEnabled() }, [])

  // قفل خودکار: پس از بی‌کاری، یا وقتی برنامه از پس‌زمینه برمی‌گردد
  useEffect(() => {
    if (locked || !isLockEnabled()) return
    const mark = () => { lastActive.current = Date.now() }
    const evts = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    for (const e of evts) window.addEventListener(e, mark, { passive: true })

    // بی‌کاری: فقط وقتی دقیقه‌ی قفل تعیین شده باشد
    const idleLock = () => {
      const mins = readLock().autoLockMin
      if (mins < 0) return false // «فقط هنگام باز شدن برنامه»
      if (mins === 0) return false // «همیشه» وسط کار مزاحم نمی‌شود
      return Date.now() - lastActive.current >= mins * 60_000
    }
    // بازگشت از پس‌زمینه: «همیشه» یعنی با هر برگشتن قفل شود
    const resumeLock = () => {
      const mins = readLock().autoLockMin
      if (mins < 0) return false // «فقط هنگام باز شدن برنامه»
      if (mins === 0) return true
      return Date.now() - lastActive.current >= mins * 60_000
    }
    const tick = setInterval(() => { if (idleLock()) setLocked(true) }, 20_000)

    // رفتن به پس‌زمینه (تعویض برنامه در اندروید / کوچک کردن پنجره)
    const onHide = () => { if (document.visibilityState === 'hidden') lastActive.current = Date.now() }
    document.addEventListener('visibilitychange', onHide)
    const offResume = onMobileResume(() => { if (resumeLock()) setLocked(true) })

    return () => {
      for (const e of evts) window.removeEventListener(e, mark)
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onHide)
      offResume()
    }
  }, [locked])

  // درخواست قفل فوری از صفحه‌ی تنظیمات و منوی ویندوز
  useEffect(() => {
    const h = () => setLocked(true)
    window.addEventListener(LOCK_EVENT, h)
    return () => window.removeEventListener(LOCK_EVENT, h)
  }, [])

  const unlock = useCallback(() => { lastActive.current = Date.now(); setLocked(false) }, [])

  return (
    <>
      <HashRouter><Shell /></HashRouter>
      {locked && <LockScreen onUnlock={unlock} />}
    </>
  )
}

export default function App() {
  const init = useApp(s => s.init)
  const ready = useApp(s => s.ready)
  const lang = useApp(s => s.data.settings.lang) ?? 'fa'
  const cloudProvider = useApp(s => s.data.settings.cloud.provider)
  const cloudflareUrl = useApp(s => s.data.settings.cloud.cloudflareUrl)

  useEffect(() => { void init() }, [init])
  useEffect(() => {
    if (ready) configureCloudProvider(cloudProvider, cloudflareUrl)
  }, [cloudProvider, cloudflareUrl, ready])

  // آمار شبکه‌های اجتماعیِ قابل‌دسترسی هنگام ورود به اپ تازه می‌شود؛ خطای هر پلتفرم
  // فقط روی همان کارت ثبت می‌شود و هرگز مانع بازشدن برنامه نیست.
  useEffect(() => {
    if (!ready) return
    const social = useApp.getState().data.settings.social
    if (!social.autoRefresh || !social.profiles.length) return
    void Promise.all(social.profiles.map(async profile => {
      try {
        const fresh = await fetchProfileCached(profile.url, { keys: useApp.getState().data.settings.social.keys })
        useApp.getState().upsertProfile(fresh)
      } catch { /* provider خودش خطای قابل‌نمایش ذخیره می‌کند */ }
    }))
  }, [ready])

  // احراز هویت سرویس انتخاب‌شده مستقل از ذخیره محلی آماده می‌شود؛ Firebase
  // و Cloudflare نشست‌های جدا دارند و جابه‌جایی یکی، حساب دیگری را حذف نمی‌کند.
  useEffect(() => {
    void initCloudAuth()
    return watchCloudUser(user => { if (user) void autoPullIfEnabled() })
  }, [])

  // پوسته را پیش از آماده شدن داده هم اعمال می‌کنیم تا صفحه‌ی بارگذاری سفید/سیاه نپرد
  useEffect(() => { applyTheme(useApp.getState().data.settings.theme ?? 'dark') }, [])

  // ذخیره‌ی نهایی هنگام بستن صفحه
  useEffect(() => {
    const h = () => { void useApp.getState().persist() }
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [])

  if (!ready) {
    return (
      <div className="h-full grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-11 h-11 rounded-2xl grid place-items-center animate-pulse border border-[var(--glass-brd2)]"
            style={{ background: 'linear-gradient(150deg, #16181f, #0b0d12)' }}>
            <BrandMark size={24} />
          </div>
          <span className="text-[11.5px] text-[var(--color-dim2)] tracking-wider">{tr(lang, 'app.loading')}</span>
        </div>
      </div>
    )
  }

  return <Root />
}
