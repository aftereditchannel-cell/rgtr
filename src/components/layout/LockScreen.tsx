import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrandMark } from '../ui/BrandMark'
import { Icon } from '../ui/Primitives'
import { useT } from '../../i18n'
import { useFmt } from '../../lib/useFmt'
import {
  readLock,
  verifyPasscode,
  normalizeDigits,
  cooldownRemaining,
  attemptsLeft,
  isBiometricAvailable,
  tryBiometricUnlock,
} from '../../lib/lock'
import { isMobile } from '../../lib/mobile'

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back']

/**
 * صفحه‌ی قفل — تمام‌صفحه (z-100)، شیشه‌ای، با صفحه‌کلید عددی.
 *  · ورود با رمز ۴ تا ۶ رقمی
 *  · ۵ تلاش اشتباه → ۳۰ ثانیه قفل موقت
 *  · میان‌بر اثر انگشت روی اندروید
 *  · کلیدهای فیزیکی ۰-۹ / Backspace / Enter هم کار می‌کنند
 */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useT()
  const fmt = useFmt()
  const cfg = readLock()

  const [entered, setEntered] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(cooldownRemaining())
  const [shake, setShake] = useState(0)
  const [bioOk, setBioOk] = useState(false)
  const [autoBioTried, setAutoBioTried] = useState(false)
  const [clock, setClock] = useState(() => new Date())

  // ساعت زنده
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 20_000)
    return () => clearInterval(t)
  }, [])

  // شمارش معکوس قفل موقت
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => {
      const r = cooldownRemaining()
      setCooldown(r)
      if (r <= 0) { setErr(''); setEntered('') }
    }, 500)
    return () => clearInterval(t)
  }, [cooldown])

  // اثر انگشت — فقط وقتی در تنظیمات فعال باشد و سنسور در دسترس باشد
  useEffect(() => {
    if (!cfg.biometric) return
    let alive = true
    void isBiometricAvailable().then(ok => { if (alive) setBioOk(ok) })
    return () => { alive = false }
  }, [cfg.biometric])

  const tryUnlock = useCallback(async (raw: string) => {
    const n = normalizeDigits(raw)
    if (!n || busy) return
    setBusy(true)
    setErr('')
    const ok = await verifyPasscode(n)
    setBusy(false)
    if (ok) { onUnlock(); return }
    setEntered('')
    setShake(s => s + 1)
    const r = cooldownRemaining()
    if (r > 0) { setCooldown(r); setErr(t('lock.cooldown', { s: fmt.dg(r) })) }
    else {
      const left = attemptsLeft()
      setErr(left <= 0 ? t('lock.tooMany') : t('lock.wrong', { n: fmt.dg(left) }))
    }
  }, [busy, onUnlock, t, fmt])

  const press = useCallback((k: string) => {
    if (busy || cooldown > 0) return
    setErr('')
    if (k === 'back') { setEntered(e => e.slice(0, -1)); return }
    if (k === 'enter') { void tryUnlock(entered); return }
    if (entered.length >= 6) return
    const next = entered + k
    setEntered(next)
    // پس از ۴ تا ۶ رقم، خودکار تلاش می‌کند
    if (next.length >= 4) void tryUnlock(next)
  }, [busy, cooldown, entered, tryUnlock])

  // صفحه‌کلید فیزیکی
  useEffect(() => {
    const h = (ev: KeyboardEvent) => {
      if (ev.key === 'Backspace') { press('back'); return }
      if (ev.key === 'Enter') { press('enter'); return }
      const d = normalizeDigits(ev.key)
      if (d.length === 1) press(d)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [press])

  const bio = useCallback(async () => {
    if (busy) return
    setBusy(true)
    const ok = await tryBiometricUnlock(t('lock.fingerprintReason'))
    setBusy(false)
    if (ok) onUnlock()
  }, [busy, onUnlock, t])

  // وقتی کاربر اثر انگشت را فعال کرده، با بازشدن صفحه قفل منتظر کلیک اضافه
  // نمی‌مانیم و پنجره بومی Android را خودکار نشان می‌دهیم. در صورت لغو، دکمه
  // اثر انگشت و رمز عددی همچنان در دسترس می‌مانند.
  useEffect(() => {
    if (!bioOk || autoBioTried) return
    setAutoBioTried(true)
    const timer = setTimeout(() => { void bio() }, 250)
    return () => clearTimeout(timer)
  }, [autoBioTried, bio, bioOk])

  const timeStr = useMemo(() => {
    const h = String(clock.getHours()).padStart(2, '0')
    const m = String(clock.getMinutes()).padStart(2, '0')
    return fmt.dg(`${h}:${m}`)
  }, [clock, fmt])

  const autoLockLabel = useMemo(() => {
    if (cfg.autoLockMin < 0) return t('set.autoLockNever')
    if (cfg.autoLockMin === 0) return t('set.autoLockAlways')
    return t('set.autoLockMin', { n: fmt.dg(cfg.autoLockMin) })
  }, [cfg.autoLockMin, t, fmt])

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto"
      style={{
        background: 'var(--scrim)',
        backdropFilter: isMobile ? 'blur(8px)' : 'blur(14px) saturate(130%)',
        WebkitBackdropFilter: isMobile ? 'blur(8px)' : 'blur(14px) saturate(130%)',
      }}>
      {/* هاله‌ی رنگی پشت شیشه — همان هاله‌ی بدنه، روی قفل هم */}
      <div className="pointer-events-none fixed inset-0" aria-hidden="true" style={{
        background:
          'radial-gradient(46rem 46rem at 12% -6%, var(--aura1), transparent 62%),' +
          'radial-gradient(38rem 38rem at 92% 8%, var(--aura2), transparent 60%),' +
          'radial-gradient(42rem 42rem at 74% 104%, var(--aura3), transparent 62%)',
      }} />

      <div className="relative min-h-full flex items-center justify-center p-4 sm:p-6">
        <div
          className="glass glass-sheen w-full max-w-[340px] rounded-3xl p-5 sm:p-6"
          style={{ boxShadow: 'var(--glass-shadow)' }}>
          {/* سربرگ */}
          <div className="flex items-center gap-2.5 mb-5">
            <BrandMark size={30} />
            <div className="min-w-0">
              <div className="text-[14px] font-semibold tracking-tight leading-tight">NEXUS HQ</div>
              <div className="text-[10px] text-[var(--color-dim2)] leading-tight mt-0.5">{autoLockLabel}</div>
            </div>
            <div className="ms-auto text-end">
              <div className="text-[22px] font-semibold nums leading-none">{timeStr}</div>
              <div className="text-[9.5px] text-[var(--color-dim2)] mt-1">{fmt.dateLong(clock.toISOString())}</div>
            </div>
          </div>

          {/* راهنما / پیام خطا */}
          <div className="min-h-[42px] flex items-center justify-center text-center mb-3">
            {err ? (
              <span className="text-[12px] text-red-400 flex items-center gap-1.5 anim" role="alert">
                <Icon name="AlertTriangle" size={13} className="shrink-0" />
                {err}
              </span>
            ) : (
              <span className="text-[12px] text-[var(--color-dim)]">
                {cfg.hint
                  ? <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-white/[.05] border border-[var(--glass-brd)]">
                      <Icon name="HelpCircle" size={12} className="text-[var(--color-dim2)] shrink-0" />
                      {cfg.hint}
                    </span>
                  : t('lock.enterPasscode')}
              </span>
            )}
          </div>

          {/* نقطه‌های رمز */}
          <div key={shake} className={`flex items-center justify-center gap-2.5 mb-5 h-4 ${err ? 'anim-shake' : ''}`} aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <span
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-150 ${
                  i < entered.length
                    ? 'bg-[var(--color-acc)] scale-110 shadow-[0_0_10px_-2px_var(--color-acc)]'
                    : 'bg-white/[.12] border border-white/[.08]'
                }`}
              />
            ))}
          </div>

          {/* صفحه‌کلید عددی */}
          <div className="grid grid-cols-3 gap-2 mb-4" role="group" aria-label="numpad">
            {KEYS.map(k => {
              if (k === '') return <span key="spacer" />
              if (k === 'back') {
                return (
                  <button
                    key={k}
                    type="button"
                    aria-label={t('lock.delete')}
                    disabled={busy || cooldown > 0 || !entered}
                    onClick={() => press('back')}
                    className="h-12 rounded-xl grid place-items-center text-[var(--color-dim)] hover:bg-white/[.06] active:scale-95 transition-all disabled:opacity-30">
                    <Icon name="Delete" size={19} />
                  </button>
                )
              }
              return (
                <button
                  key={k}
                  type="button"
                  disabled={busy || cooldown > 0}
                  onClick={() => press(k)}
                  className="h-12 rounded-xl text-[19px] font-semibold nums bg-white/[.05] border border-[var(--glass-brd)] hover:bg-white/[.09] active:scale-95 active:bg-[var(--color-acc)]/25 transition-all disabled:opacity-35">
                  {fmt.dg(k)}
                </button>
              )
            })}
          </div>

          {/* ورود / اثر انگشت */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => press('enter')}
              disabled={busy || cooldown > 0 || !entered}
              className="flex-1 h-11 rounded-xl inline-flex items-center justify-center gap-2 text-[13px] font-semibold bg-[var(--color-acc)] text-white hover:brightness-115 active:scale-[.98] transition-all disabled:opacity-35 disabled:pointer-events-none shadow-[0_2px_16px_-6px_var(--color-acc)]">
              {busy
                ? <Icon name="Loader" size={15} className="animate-spin" />
                : <Icon name="LockOpen" size={15} />}
              {t('lock.unlock')}
            </button>
            {bioOk && (
              <button
                type="button"
                onClick={() => void bio()}
                disabled={busy}
                title={t('lock.useFingerprint')}
                aria-label={t('lock.useFingerprint')}
                className="w-11 h-11 shrink-0 rounded-xl grid place-items-center border border-[var(--glass-brd)] bg-white/[.05] text-[var(--color-dim)] hover:text-[var(--color-tx)] hover:bg-white/[.09] active:scale-95 transition-all disabled:opacity-35">
                {busy ? <Icon name="Loader" size={17} className="animate-spin" /> : <Icon name="Fingerprint" size={18} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
