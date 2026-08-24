import { useEffect } from 'react'
import { useApp } from '../../store/useApp'
import { desktop } from '../../lib/desktop'
import { isMobile, onMobileBack, onMobilePause, mobileExit } from '../../lib/mobile'

/**
 * ذخیره‌سازی محلی هنگام خروج مستقل از وضعیت ابر باقی می‌ماند.
 * همگام‌سازی Firebase debounce دارد و نباید بسته‌شدن برنامه را معطل کند.
 */
export function ExitSavePrompt() {
  useEffect(() => {
    if (!desktop) return
    const desktopBridge = desktop
    return desktopBridge.onMenu(name => {
      if (name !== 'exit') return
      void (async () => {
        await useApp.getState().persist()
        await desktopBridge.exitNow()
      })()
    })
  }, [])

  useEffect(() => {
    if (!isMobile) return
    let offBack = () => {}
    let offPause = () => {}
    void onMobileBack(() => {
      void (async () => {
        await useApp.getState().persist()
        await mobileExit()
      })()
    }).then(fn => { offBack = fn })
    void onMobilePause(() => { void useApp.getState().persist() }).then(fn => { offPause = fn })
    return () => { offBack(); offPause() }
  }, [])

  return null
}
