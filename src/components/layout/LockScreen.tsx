import { useEffect, useRef, useState } from 'react'
import { Icon } from '../ui/Primitives'
import { BrandMark } from '../ui/BrandMark'
import { useT } from '../../i18n'
import { verifyPin } from '../../lib/lock'
import { isMobile } from '../../lib/mobile'

type NativeBio = { bioAvailable?: () => boolean; authenticate?: () => void }
const nativeBio = (typeof window !== 'undefined' ? (window as unknown as { NexusNative?: NativeBio }).NexusNative : undefined)
const canNativeBio = (() => {
  try { return !!nativeBio?.bioAvailable?.() } catch { return false }
})()

/**
 * صفحه‌ی قفل — تمام‌صفحه، بالای كل برنامه.
 * ورود با PIN (کیپد لمسی + کیبورد فیزیکی) و در موبایل با اثر انگشت.
 */

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { t, lang } = useT()
  const [pin, setPin] = useState('')
  const [wrong, setWrong] = useState(false)
  const [busy, setBusy] = useState(false)
  const [bio, setBio] = useState(false)
  const done = useRef(false)

  const succeed = () => {
    if (done.current) return
    done.current = true
    onUnlock()
  }

  /* اثر انگشت: پل بومی (اپ کلاسیک اندروید) یا Capacitor */
  useEffect(() => {
    if (!isMobile && !canNativeBio) return
    let off = false
    void (async () => {
      try {
        const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
        const b = await BiometricAuth.checkBiometry()
        const ok = !!(b && (b as { isAvailable?: boolean; available?: boolean }).isAvailable !== undefined
          ? (b as { isAvailable?: boolean }).isAvailable
          : (b as { available?: boolean }).available)
        if (!off && ok) setBio(true)
      } catch { /* بدون افزونه یا بدون مجوز */ }
    })()
    return () => { off = true }
  }, [])

  const tryBio = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (canNativeBio) {
        // درخواست قفل دستگاه (اثر انگشت/PIN سیستم) از پل بومی
        ;(window as unknown as { __nxBioResult?: (ok: boolean) => void }).__nxBioResult = ok => {
          if (ok) succeed()
        }
        nativeBio?.authenticate?.()
      } else {
        const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth')
        await BiometricAuth.authenticate({ reason: t('lock.title') })
        succeed()
      }
    } catch { /* کاربر لغو کرد */ }
    setBusy(false)
  }

  const submit = async (value: string) => {
    if (!value || busy) return
    setBusy(true)
    if (await verifyPin(value)) { succeed(); return }
    setWrong(true)
    setPin('')
    setTimeout(() => setWrong(false), 1600)
    setBusy(false)
  }

  const press = (k: string) => {
    if (busy) return
    if (k === 'del') { setPin(p => p.slice(0, -1)); return }
    setPin(p => (p.length >= 8 ? p : p + k))
  }

  /* کیبورد فیزیکی — دسکتاپ ویندوز */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') press(e.key)
      else if (e.key === 'Backspace') press('del')
      else if (e.key === 'Enter') void submit(pin)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center px-6"
      style={{ background: 'var(--scrim)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
      dir="ltr">
      <div className={`w-full max-w-[300px] flex flex-col items-center gap-4 anim ${wrong ? 'lock-shake' : ''}`}>
        <div className="w-14 h-14 rounded-2xl grid place-items-center border border-[var(--glass-brd2)]"
          style={{ background: 'linear-gradient(150deg, var(--color-panel), var(--color-bg2))' }}>
          <BrandMark size={30} className="text-[var(--color-acc)]" />
        </div>
        <div className="text-center">
          <div className="text-[15px] font-semibold">{t('lock.title')}</div>
          <div className={`text-[11.5px] mt-1 ${wrong ? 'text-red-400' : 'text-[var(--color-dim2)]'}`}>
            {wrong ? t('lock.wrong') : t('lock.enter')}
          </div>
        </div>

        {/* نقطه‌های واردشده */}
        <div className="flex gap-2.5 h-4 items-center" aria-label="pin dots">
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span key={i} className={`w-2 h-2 rounded-full transition-all ${i < pin.length ? 'bg-[var(--color-acc)] scale-110' : 'bg-[var(--track)]'}`} />
          ))}
        </div>

        {/* کیپد */}
        <div className="grid grid-cols-3 gap-2.5 w-full">
          {KEYS.map((k, i) => k === '' ? <span key={i} /> : (
            <button key={i} onClick={() => press(k)} disabled={busy}
              className="h-[52px] rounded-xl glass text-[17px] font-medium active:bg-[var(--hover2)] hover:bg-[var(--hover)] transition-colors disabled:opacity-50">
              {k === 'del' ? <Icon name="Delete" size={19} className="mx-auto" /> : k}
            </button>
          ))}
          <button onClick={() => void submit(pin)} disabled={busy || pin.length < 4}
            className="h-[52px] rounded-xl grid place-items-center text-white transition-transform active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--color-acc)' }} aria-label={t('lock.unlock')}>
            <Icon name="Check" size={20} />
          </button>
        </div>

        {(bio || canNativeBio) && (
          <button onClick={() => void tryBio()} disabled={busy}
            className="flex items-center gap-2 text-[12px] text-[var(--color-dim)] hover:text-[var(--color-tx)] glass rounded-full px-4 py-2 transition-colors">
            <Icon name="Fingerprint" size={16} />
            {t('lock.biometric')}
          </button>
        )}

        <div className="text-[10px] text-[var(--color-dim2)] tracking-wider" dir={lang === 'fa' ? 'rtl' : 'ltr'}>NEXUS HQ</div>
      </div>
    </div>
  )
}
