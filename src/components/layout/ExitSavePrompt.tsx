import { useEffect, useState } from 'react'
import { useApp } from '../../store/useApp'
import { desktop } from '../../lib/desktop'
import { isMobile, onMobileBack, onMobilePause, mobileExit } from '../../lib/mobile'
import { Modal, Button } from '../ui/Primitives'
import { useT } from '../../i18n'
import * as cloud from '../../lib/cloud'

/**
 * مدیریت خروج از برنامه: در هنگام خروج (دکمه Back اندروید یا بستن دسکتاپ) 
 * دیالوگی برای انتخاب محل ذخیره نشان می‌دهد.
 * در دکمه Home اندروید (Pause)، مستقیماً ذخیره ابری و محلی را در پس‌زمینه صدا می‌زند
 * چون سیستم‌عامل اجازه توقف در Home را نمی‌دهد.
 */
export function ExitSavePrompt() {
  const { t } = useT()
  const [showPrompt, setShowPrompt] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // دسترسی مستقیم به متدهای Store
  const persist = useApp(s => s.persist)
  const triggerCloudPush = useApp(s => s.triggerCloudPush)

  useEffect(() => {
    if (!desktop) return
    const desktopBridge = desktop
    return desktopBridge.onMenu(name => {
      if (name !== 'exit') return
      // اگر وصل نیست مستقیم ببند، وگرنه بپرس
      if (!cloud.isCloudReady()) {
        void (async () => {
          await persist()
          await desktopBridge.exitNow()
        })()
        return
      }
      setShowPrompt(true)
    })
  }, [persist])

  useEffect(() => {
    if (!isMobile) return
    let offBack = () => {}
    let offPause = () => {}

    // هنگام فشردن دکمه Back اندروید
    void onMobileBack(() => {
      if (!cloud.isCloudReady()) {
        void (async () => {
          await persist()
          await mobileExit()
        })()
        return
      }
      setShowPrompt(true)
    }).then(fn => { offBack = fn })

    // هنگام رفتن به پس‌زمینه (مثلاً دکمه Home)
    void onMobilePause(() => { 
      void (async () => {
        await persist()
        if (cloud.isCloudReady()) {
          await triggerCloudPush()
        }
      })()
    }).then(fn => { offPause = fn })

    return () => { offBack(); offPause() }
  }, [persist, triggerCloudPush])

  // برای مرورگر وب
  useEffect(() => {
    if (isMobile || desktop) return
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      void persist()
      if (cloud.isCloudReady()) void triggerCloudPush()
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [persist, triggerCloudPush])

  const handleSaveDrive = async () => {
    setIsSaving(true)
    await persist()
    await triggerCloudPush()
    setIsSaving(false)
    setShowPrompt(false)
    if (desktop) await desktop.exitNow()
    if (isMobile) await mobileExit()
  }

  const handleSaveLocal = async () => {
    setIsSaving(true)
    await persist()
    setIsSaving(false)
    setShowPrompt(false)
    if (desktop) await desktop.exitNow()
    if (isMobile) await mobileExit()
  }

  if (!showPrompt) return null

  return (
    <Modal open onClose={() => { if (!isSaving) setShowPrompt(false) }} title={t('sync.askCloud')}>
      <div className="flex flex-col gap-3">
        <p className="text-[12.5px] text-[var(--color-dim)] leading-relaxed">{t('sync.exitPromptHint')}</p>
        <div className="flex gap-2 mt-2">
           <Button size="sm" variant="primary" className="flex-1" icon={isSaving ? 'Loader' : 'CloudUpload'} disabled={isSaving} onClick={() => void handleSaveDrive()}>
             {t('sync.saveDrive')}
           </Button>
           <Button size="sm" variant="outline" className="flex-1" disabled={isSaving} onClick={() => void handleSaveLocal()}>
             {t('sync.localOnly')}
           </Button>
        </div>
      </div>
    </Modal>
  )
}
