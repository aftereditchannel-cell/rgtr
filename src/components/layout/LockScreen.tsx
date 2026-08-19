import { useEffect, useRef, useState } from 'react'
import { BrandMark } from '../ui/BrandMark'
import { Icon } from '../ui/Primitives'
import { readLock, verifyPasscode, biometricAuth, biometricAvailable, canAttempt, cooldownSeconds } from '../../lib/lock'
import { isMobile } from '../../lib/mobile'
import { useT } from '../../i18n'

const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

/**
 * صفحه‌ی قفل — مثل تلگرام: شماره‌گیر، نقطه‌های پرشونده، لرزش هنگام رمز اشتباه.
 * روی گوشی اگر اثر انگشت/چهره فعال باشد دکمه‌ی بیومتریک هم نشان داده می‌شود.
 */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useT()
  const [code, setCode] = useState('')
  const [shake, setShake] = useState(false)
  const [err, setErr] = useState('')
  const [cooldown, setCooldown] = useState(cooldownSeconds())
  const [bio, setBio] = useState(false)
  const [bioPrompted, setBioPrompted] = useState(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const cfg = readLock()
  const useBio = cfg.biometric && isMobile

  // شمارش معکوس دوره‌ی تأخیر پلکانی
  useEffect(() => {
    timer.current = setInterval(() => setCooldown(cooldownSeconds()), 1000)
    return () => { if (timer.current) clearInterval(timer.current) }
  }, [])

  // بررسی پشتیبانی بیومتریک + درخواست خودکار یک‌بار
  useEffect(() => {
    if (!useBio) return
    void biometricAvailable().then(ok => {
      setBio(ok)
      if (ok && !bioPrompted) {
        setBioPrompted(true)
        void tryBio()
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tryBio = async () => {
    if (!canAttempt()) return
    const ok = await biometricAuth(t('lock.bioReason'))
    if (ok) onUnlock()
  }

  const tap = (d: number) => {
    if (!canAttempt()) return
    setErr('')
    setCode(c => (c.length >= 6 ? c : c + String(d)))
  }

  const back = () => setCode(c => c.slice(0, -1))

  const submit = async () => {
    if (!canAttempt() || code.length < 4) return
    const ok = await verifyPasscode(code)
    if (ok) {
      onUnlock()
      return
    }
    setShake(true)
    setTimeout(() => setShake(false), 450)
    setErr(t('lock.wrong'))
    setCode('')
    setCooldown(cooldownSeconds())
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(160deg, #0b0d13, #07080c)' }}>
      {/* هاله */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:
          'radial-gradient(40rem 40rem at 50% -10%, rgba(99,102,241,.16), transparent 60%),' +
          'radial-gradient(34rem 34rem at 50% 110%, rgba(168,85,247,.12), transparent 60%)',
      }} />

      <div className={`relative flex flex-col items-center w-full max-w-xs ${shake ? 'lock-shake' : ''}`}>
        <div className="w-14 h-14 rounded-2xl grid place-items-center border border-[var(--glass-brd2)]"
          style={{ background: 'linear-gradient(150deg, #16181f, #0b0d12)' }}>
          <BrandMark size={30} />
        </div>

        <div className="mt-5 flex items-center gap-3 h-3.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className={`w-2.5 h-2.5 rounded-full transition-all ${i < code.length ? 'bg-[#FFC800] scale-100' : 'bg-white/15'}`} />
          ))}
        </div>

        {cfg.hint && !err && (
          <div className="mt-4 text-[12.5px] text-[#8b93a7] flex items-center gap-1.5">
            <Icon name="Info" size={13} className="opacity-70" />
            {cfg.hint}
          </div>
        )}
        {err && <div className="mt-4 text-[12.5px] text-red-400">{err}</div>}
        {cooldown > 0 && (
          <div className="mt-4 text-[12.5px] text-amber-400 nums">{t('lock.cooldown', { s: cooldown })}</div>
        )}

        {/* شماره‌گیر */}
        <div className="grid grid-cols-3 gap-3 mt-8 w-full">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
            <button key={d} onClick={() => tap(d)} disabled={cooldown > 0}
              className="aspect-square rounded-2xl glass grid place-items-center text-[22px] font-medium text-[#e8eaf0] active:bg-white/[.12] transition-colors disabled:opacity-40">
              {FA[d]}
            </button>
          ))}
          <div />
          <button onClick={() => tap(0)} disabled={cooldown > 0}
            className="aspect-square rounded-2xl glass grid place-items-center text-[22px] font-medium text-[#e8eaf0] active:bg-white/[.12] transition-colors disabled:opacity-40">
            {FA[0]}
          </button>
          <button onClick={back} aria-label="backspace"
            className="aspect-square rounded-2xl grid place-items-center text-[#8b93a7] hover:text-[#e8eaf0] active:bg-white/[.08] transition-colors">
            <Icon name="CornerDownLeft" size={20} />
          </button>
        </div>

        {/* اقدام‌ها */}
        <div className="mt-7 flex items-center gap-3 w-full justify-center">
          {bio && (
            <button onClick={tryBio} title={t('lock.bio')}
              className="w-12 h-12 rounded-2xl glass grid place-items-center text-[#FFC800] active:bg-white/[.12] transition-colors">
              <Icon name="Fingerprint" size={22} />
            </button>
          )}
          <button onClick={submit} disabled={code.length < 4 || cooldown > 0}
            className="flex-1 max-w-[200px] py-3 rounded-xl bg-[var(--color-acc)] text-white text-[14px] font-medium disabled:opacity-40 shadow-[0_2px_18px_-4px_var(--color-acc)] transition-all">
            {t('lock.unlock')}
          </button>
        </div>
      </div>
    </div>
  )
}
