import { useEffect, useState } from 'react'
import { useApp } from '../../store/useApp'
import { desktop } from '../../lib/desktop'
import { isMobile, onMobileBack, onMobilePause, mobileExit } from '../../lib/mobile'
import { ensureGist, pushGist, hasToken, CloudError } from '../../lib/cloud'
import { useT, cloudError } from '../../i18n'
import { Button, Icon } from '../ui/Primitives'

type Phase = 'idle' | 'ask' | 'saving' | 'failed'

/**
 * دیالوگ «هنگام خروج ذخیره شود؟»
 *  · ویندوز — وقتی کاربر پنجره را می‌بندد، فرایند اصلی بستن را نگه می‌دارد.
 *  · اندروید — دکمه‌ی back در ریشه‌ی تاریخچه همین دیالوگ را باز می‌کند،
 *    و رفتن برنامه به پس‌زمینه باعث ذخیره‌ی خودکار محلی می‌شود.
 */
export function ExitSavePrompt() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [err, setErr] = useState('')
  const { t, lang } = useT()

  useEffect(() => {
    if (!desktop) return
    return desktop.onMenu(name => {
      if (name !== 'exit') return
      const st = useApp.getState()
      const cloud = st.data.settings.cloud
      // اگر ابر تنظیم نشده یا کاربر پرسش را خاموش کرده، فقط محلی ذخیره کن و برو
      if (!cloud?.askOnExit || !hasToken()) {
        void (async () => {
          await st.persist()
          await desktop!.exitNow()
        })()
        return
      }
      setPhase('ask')
    })
  }, [])

  // اندروید: دکمه‌ی back در ریشه‌ی تاریخچه + ذخیره‌ی خودکار در پس‌زمینه
  useEffect(() => {
    if (!isMobile) return
    let offBack = () => {}
    let offPause = () => {}
    void onMobileBack(() => {
      const st = useApp.getState()
      const cloud = st.data.settings.cloud
      if (!cloud?.askOnExit || !hasToken()) {
        void (async () => { await st.persist(); await mobileExit() })()
        return
      }
      setPhase('ask')
    }).then(fn => { offBack = fn })
    void onMobilePause(() => { void useApp.getState().persist() }).then(fn => { offPause = fn })
    return () => { offBack(); offPause() }
  }, [])

  const saveAndExit = async () => {
    const st = useApp.getState()
    setPhase('saving')
    setErr('')
    try {
      await st.persist()
      const { id, created } = await ensureGist(st.data.settings.cloud.gistId, st.data)
      await pushGist(id, st.data)
      if (created) st.setSettings({ cloud: { ...st.data.settings.cloud, gistId: id } })
      st.setSettings({
        cloud: { ...useApp.getState().data.settings.cloud, gistId: id, lastSync: new Date().toISOString() },
      })
      await useApp.getState().persist()
      await leave()
    } catch (e) {
      const code = e instanceof CloudError ? e.code : 'network'
      setErr(cloudError(lang, code))
      setPhase('failed')
    }
  }

  const leave = async () => {
    if (isMobile) return mobileExit()
    return desktop!.exitNow()
  }

  const justExit = async () => {
    await useApp.getState().persist()
    await leave()
  }

  const cancel = async () => {
    setPhase('idle')
    if (!isMobile) await desktop!.cancelExit()
  }

  if (phase === 'idle') return null

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-4"
      style={{ background: 'rgba(4,5,8,.78)', backdropFilter: 'blur(4px)' }}>
      <div className="anim w-full max-w-md rounded-2xl border border-[var(--color-line2)] bg-[var(--color-bg2)] shadow-2xl overflow-hidden">
        <div className="px-5 py-4 flex items-start gap-3 border-b border-[var(--color-line)]">
          <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 bg-[var(--color-acc)]/12 border border-[var(--color-acc)]/25">
            <Icon name={phase === 'failed' ? 'AlertTriangle' : 'CloudUpload'} size={17}
              className={phase === 'failed' ? 'text-amber-400' : 'text-[var(--color-acc)]'} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold">{t('exit.title')}</h3>
            <p className="text-[12.5px] text-[var(--color-dim)] mt-1 leading-relaxed">
              {phase === 'failed' ? t('exit.failed') : t('exit.question')}
            </p>
            {err && <p className="text-[11.5px] text-amber-400/90 mt-1.5">{err}</p>}
          </div>
        </div>

        <div className="px-5 py-3.5 flex items-center justify-end gap-2">
          {phase === 'saving' ? (
            <span className="text-[12.5px] text-[var(--color-dim)] flex items-center gap-2">
              <Icon name="Loader" size={14} className="animate-spin" />
              {t('exit.saving')}
            </span>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={cancel}>{t('common.cancel')}</Button>
              <Button variant="outline" size="sm" onClick={justExit}>{t('exit.justExit')}</Button>
              {phase === 'ask' && (
                <Button variant="primary" size="sm" icon="CloudUpload" onClick={saveAndExit}>
                  {t('exit.saveExit')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
