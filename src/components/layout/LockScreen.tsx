import { useEffect, useRef, useState } from 'react'
import { BrandMark } from '../ui/BrandMark'
import { Icon } from '../ui/Primitives'
import { verifyPin, readLock } from '../../lib/lock'
import { biometricAvailable, biometricVerify } from '../../lib/biometric'
import { useT } from '../../i18n'

const MAX_PIN = 6

/**
 * صفحه‌ی قفل — روی کل برنامه می‌نشیند و تا احراز هویت باز نمی‌شود.
 * در اندروید دکمه‌ی اثر انگشت (اگر فعال و در دسترس باشد) نشان داده می‌شود؛
 * همیشه ورود با PIN به‌عنوان جایگزین وجود دارد.
 */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useT()
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const [bio, setBio] = useState(false)
  const lastTap = useRef(0)

  // بررسی در دسترس‌بودن اثر انگشت
  useEffect(() => {
    let alive = true
    if (readLock().biometric) {
      void biometricAvailable().then(v => { if (alive) setBio(v) })
    }
    return () => { alive = false }
  }, [])

  // در صورت نبودن اثر انگشت، فوکوس برای کیبورد فیزیکی (دسکتاپ)
  useEffect(() => {
    if (bio) return
    const box = document.getElementById('lock-keypad')
    box?.focus()
  }, [bio])

  const success = () => {
    setErr(false)
    setBusy(false)
    setPin('')
    onUnlock()
  }

  const tryPin = async (value: string) => {
    if (busy || value.length < 4) return
    setBusy(true)
    const ok = await verifyPin(value)
    if (ok) success()
    else {
      setErr(true)
      setPin('')
      setBusy(false)
    }
  }

  const press = (d: string) => {
    if (busy) return
    setErr(false)
    setPin(p => (p.length >= MAX_PIN ? p : p + d))
  }

  const backspace = () => {
    if (busy) return
    setPin(p => p.slice(0, -1))
  }

  const bioUnlock = async () => {
    if (busy) return
    const now = Date.now()
    if (now - lastTap.current < 800) return // جلوگیری از دابل‌تپ
    lastTap.current = now
    setBusy(true)
    const ok = await biometricVerify(t('lock.bioReason'))
    if (ok) success()
    else setBusy(false)
  }

  // کیبورد فیزیکی (در ویندوز / وب)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') backspace()
      else if (e.key === 'Enter') void tryPin(pin)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, busy])

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'x', '0', 'b']

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6 pb-safe"
      style={{
        background:
          'radial-gradient(60rem 40rem at 50% -10%, var(--aura1), transparent 60%), radial-gradient(40rem 30rem at 50% 110%, var(--aura2), transparent 60%), var(--color-bg)',
      }}
    >
      <div className="flex flex-col items-center w-full max-w-[300px] anim">
        <BrandMark size={26} className="mb-5" />

        <h1 className="text-[16px] font-semibold mb-1">{t('lock.title')}</h1>
        <p className="text-[12px] text-[var(--color-dim2)] mb-7 text-center">{t('lock.hint')}</p>

        {/* دکمه‌ی اثر انگشت */}
        {bio && (
          <button
            type="button"
            onClick={() => void bioUnlock()}
            disabled={busy}
            aria-label={t('lock.bioBtn')}
            className="w-16 h-16 rounded-full grid place-items-center mb-7 border border-[var(--color-acc)]/40 bg-[var(--color-acc)]/12 text-[var(--color-acc)] transition-all active:scale-95 hover:bg-[var(--color-acc)]/20 disabled:opacity-50"
            style={{ boxShadow: '0 0 0 8px color-mix(in srgb, var(--color-acc) 8%, transparent)' }}
          >
            <Icon name={busy ? 'Loader' : 'Fingerprint'} size={26} className={busy ? 'animate-spin' : ''} />
          </button>
        )}

        {/* نقطه‌های PIN */}
        <div className="flex items-center gap-3 mb-7" dir="ltr">
          {Array.from({ length: MAX_PIN }).map((_, i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full transition-all duration-150 ${
                i < pin.length
                  ? 'bg-[var(--color-acc)] scale-110'
                  : 'bg-[var(--color-line2)]'
              }`}
            />
          ))}
        </div>

        {err && (
          <p className="text-[11.5px] text-red-400 mb-3 -mt-4 anim">{t('lock.wrong')}</p>
        )}

        {/* صفحه‌کلید عددی */}
        <div id="lock-keypad" tabIndex={-1} className="grid grid-cols-3 gap-3 w-full outline-none" dir="ltr">
          {keys.map(k => (
            <button
              key={k}
              type="button"
              onClick={() => (k === 'b' ? backspace() : k === 'x' ? undefined : press(k))}
              disabled={busy}
              className={`h-14 rounded-2xl grid place-items-center text-[20px] font-medium transition-all active:scale-95 border ${
                k === 'x'
                  ? 'border-transparent pointer-events-none'
                  : 'border-[var(--color-line2)] bg-white/[.03] hover:bg-white/[.07] text-[var(--color-tx)]'
              }`}
            >
              {k === 'b' ? <Icon name="Delete" size={20} className="text-[var(--color-dim)]" /> : k === 'x' ? null : <span className="nums">{k}</span>}
            </button>
          ))}
        </div>

        {pin.length >= 4 && (
          <button
            type="button"
            onClick={() => void tryPin(pin)}
            disabled={busy}
            className="mt-6 w-full py-2.5 rounded-xl bg-[var(--color-acc)] text-white text-[13px] font-medium flex items-center justify-center gap-1.5 active:scale-[.99] disabled:opacity-50"
          >
            {busy ? <Icon name="Loader" size={14} className="animate-spin" /> : <Icon name="Unlock" size={14} />}
            {t('lock.unlock')}
          </button>
        )}

        {bio && (
          <button type="button" onClick={bioUnlock} className="mt-3 text-[11px] text-[var(--color-dim2)] hover:text-[var(--color-dim)]">
            {t('lock.usePin')}
          </button>
        )}
      </div>
    </div>
  )
}
