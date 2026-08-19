import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Icon } from '../ui/Primitives'
import { BrandMark } from '../ui/BrandMark'
import { useT } from '../../i18n'
import { useFmt } from '../../lib/useFmt'
import { isLockEnabled, readLock, verifyPasscode, normalizePin } from '../../lib/lock'

const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { t, lang } = useT()
  const fmt = useFmt()
  const [pin, setPin] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [hint] = useState(() => readLock().hint)
  const [until, setUntil] = useState(() => readLock().lockedUntil)

  useEffect(() => {
    if (!isLockEnabled()) onUnlock()
  }, [onUnlock])

  useEffect(() => {
    if (!until) return
    const id = setInterval(() => {
      if (Date.now() >= until) { setUntil(0); setErr('') }
    }, 250)
    return () => clearInterval(id)
  }, [until])

  const lockedOut = until > Date.now()

  const submit = useCallback(async (value: string) => {
    const clean = normalizePin(value)
    if (clean.length < 4 || busy || lockedOut) return
    setBusy(true)
    setErr('')
    try {
      const ok = await verifyPasscode(clean)
      if (ok) { setPin(''); onUnlock(); return }
      const next = readLock()
      setUntil(next.lockedUntil)
      setErr(t('lock.wrong'))
      setPin('')
    } finally {
      setBusy(false)
    }
  }, [busy, lockedOut, onUnlock, t])

  const push = (d: string) => {
    if (lockedOut || busy) return
    setErr('')
    setPin(p => {
      const next = (p + d).slice(0, 8)
      return next
    })
  }

  const back = () => { if (!busy) { setErr(''); setPin(p => p.slice(0, -1)) } }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Enter') { e.preventDefault(); void submit(pin); return }
      if (e.key === 'Backspace') { e.preventDefault(); back(); return }
      const n = normalizePin(e.key)
      if (n.length === 1) { e.preventDefault(); push(n) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [pin, submit])

  const digit = (n: number) => fmt.dg(n)

  return (
    <div className="z-[100] fixed inset-0 flex flex-col items-center justify-center px-5"
      style={{ background: 'var(--color-bg)', paddingTop: 'var(--sat)', paddingBottom: 'var(--sab)' }}>
      <div className="w-full max-w-[320px] flex flex-col items-center min-h-0">
        <div className="w-12 h-12 rounded-2xl grid place-items-center mb-4 border border-[var(--glass-brd2)]"
          style={{ background: 'linear-gradient(150deg, var(--color-bg2), var(--color-bg))' }}>
          <BrandMark size={26} />
        </div>
        <div className="flex items-center gap-1.5 text-[var(--color-dim)] mb-1">
          <Icon name="Lock" size={14} />
          <h1 className="text-[15px] font-semibold text-[var(--color-tx)]">{t('lock.title')}</h1>
        </div>
        <p className="text-[12px] text-[var(--color-dim2)] mb-5 text-center">{t('lock.enter')}</p>

        <div className="flex items-center justify-center gap-2 h-8 mb-2" aria-hidden>
          {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
            <span key={i}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i < pin.length ? 'bg-[var(--color-acc)]' : 'bg-[var(--color-line2)]'
              }`} />
          ))}
        </div>

        <div className="h-5 mb-3 text-center">
          {lockedOut && <span className="text-[11.5px] text-amber-400">{t('lock.wait')}</span>}
          {!lockedOut && err && <span className="text-[11.5px] text-red-400">{err}</span>}
          {!lockedOut && !err && hint && (
            <span className="text-[11.5px] text-[var(--color-dim2)]">{t('lock.hintLabel')}: {hint}</span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 w-full max-w-[260px] mb-3">
          {KEYS.map(n => (
            <KeyBtn key={n} label={digit(n)} disabled={lockedOut || busy} onClick={() => push(String(n))} />
          ))}
          <KeyBtn label="" disabled={lockedOut || busy} onClick={back} ariaLabel={t('lock.clear')}>
            <Icon name="Delete" size={18} />
          </KeyBtn>
          <KeyBtn label={digit(0)} disabled={lockedOut || busy} onClick={() => push('0')} />
          <button type="button" disabled={lockedOut || busy || pin.length < 4}
            onClick={() => void submit(pin)}
            className="rounded-xl h-12 grid place-items-center text-[13px] font-medium bg-[var(--color-acc)] text-white disabled:opacity-40">
            {t('lock.unlock')}
          </button>
        </div>
        <p className="text-[10.5px] text-[var(--color-dim2)]" dir={lang === 'fa' ? 'rtl' : 'ltr'}>NEXUS HQ</p>
      </div>
    </div>
  )
}

function KeyBtn({ label, onClick, disabled, children, ariaLabel }: {
  label: string; onClick: () => void; disabled?: boolean; children?: ReactNode; ariaLabel?: string
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-label={ariaLabel}
      className="rounded-xl h-12 grid place-items-center text-[18px] font-medium nums
        bg-[var(--color-panel)] border border-[var(--color-line)] text-[var(--color-tx)]
        hover:bg-[var(--hover)] active:scale-[.97] transition-all disabled:opacity-40">
      {children ?? label}
    </button>
  )
}
