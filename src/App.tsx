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
import { Icon } from './components/ui/Primitives'
import { BrandMark } from './components/ui/BrandMark'
import { desktop } from './lib/desktop'
import { exportJSON, importViaDialog } from './lib/backup'
import { useT, tr } from './i18n'
import { ExitSavePrompt } from './components/layout/ExitSavePrompt'
import { LockScreen } from './components/layout/LockScreen'
import { applyTheme, watchSystemTheme } from './lib/theme'
import { isLockEnabled, readLock } from './lib/lock'
import { isMobile, syncMobileChrome, onMobileResume } from './lib/mobile'

/** پل منوی بومی ویندوز → روتر و اکشن‌های برنامه */
function DesktopMenuBridge() {
  const nav = useNavigate()
  useEffect(() => {
    if (!desktop) return
    return desktop.onMenu(async (name, payload) => {
      const st = useApp.getState()
      const lang = st.data.settings.lang ?? 'fa'
      if (name === 'navigate' && payload) nav(payload)
      else if (name === 'palette') {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }))
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
  const toast = useApp(s => s.toast)
  const accent = useApp(s => s.data.settings.accent)
  const { lang, rtl } = useT()

  useEffect(() => {
    document.documentElement.style.setProperty('--color-acc', accent)
  }, [accent])

  // جهت و زبان کل سند با تنظیمات همگام می‌شود
  useEffect(() => {
    const el = document.documentElement
    el.setAttribute('dir', rtl ? 'rtl' : 'ltr')
    el.setAttribute('lang', lang)
  }, [lang, rtl])

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
          <span className="text-[13px] font-semibold flex-1 truncate">NEXUS HQ</span>
        </div>

        <main className="flex-1 scroll-y">
          <div className="max-w-[1400px] mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/decision" element={<DecisionCenter />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<Settings />} />
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
  const [locked, setLocked] = useState(() => isLockEnabled())
  const lastActive = useRef(Date.now())

  // اعمال پوسته + پیروی از تنظیم سیستم در حالت auto
  useEffect(() => {
    const eff = applyTheme(theme)
    if (isMobile) void syncMobileChrome(eff)
    if (theme !== 'auto') return
    return watchSystemTheme(() => {
      const e2 = applyTheme('auto')
      if (isMobile) void syncMobileChrome(e2)
    })
  }, [theme])

  // قفل خودکار: پس از بی‌کاری، یا وقتی برنامه از پس‌زمینه برمی‌گردد
  useEffect(() => {
    if (locked || !isLockEnabled()) return
    const mark = () => { lastActive.current = Date.now() }
    const evts = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    for (const e of evts) window.addEventListener(e, mark, { passive: true })

    const shouldLock = () => {
      const mins = readLock().autoLockMin
      if (mins < 0) return false // «فقط هنگام باز شدن برنامه»
      if (mins === 0) return true
      return Date.now() - lastActive.current >= mins * 60_000
    }
    const tick = setInterval(() => { if (shouldLock()) setLocked(true) }, 20_000)

    // رفتن به پس‌زمینه (تعویض برنامه در اندروید / کوچک کردن پنجره)
    const onHide = () => { if (document.visibilityState === 'hidden') lastActive.current = Date.now() }
    document.addEventListener('visibilitychange', onHide)
    const offResume = onMobileResume(() => { if (shouldLock()) setLocked(true) })

    return () => {
      for (const e of evts) window.removeEventListener(e, mark)
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onHide)
      offResume()
    }
  }, [locked])

  // درخواست قفل فوری از صفحه‌ی تنظیمات
  useEffect(() => {
    const h = () => setLocked(true)
    window.addEventListener('nexus:lock', h)
    return () => window.removeEventListener('nexus:lock', h)
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

  useEffect(() => { void init() }, [init])

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
