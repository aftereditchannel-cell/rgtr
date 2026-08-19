import { useState } from 'react'
import { Icon } from '../ui/Primitives'
import { verifyPin } from '../../lib/lock'
import { useT } from '../../i18n'

/** صفحه‌ی قفل — پین عددی. بیومتریک هنوز در UI ساده نگه داشته شده. */
export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useT()
  const [pin, setPin] = useState('')
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)

  const press = (d: string) => {
    if (busy) return
    setErr(false)
    const next = (pin + d).slice(0, 8)
    setPin(next)
    if (next.length >= 4) {
      setBusy(true)
      verifyPin(next).then(ok => {
        if (ok) onUnlock()
        else {
          setErr(true)
          setPin('')
          setTimeout(() => setErr(false), 600)
        }
        setBusy(false)
      })
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--color-bg)] grid place-items-center anim">
      <div className="w-full max-w-[300px] flex flex-col items-center gap-6 px-6">
        <div className="w-14 h-14 rounded-2xl grid place-items-center border border-[var(--color-line2)]"
          style={{ background: 'linear-gradient(150deg,#16181f,#0b0d12)' }}>
          <Icon name="Lock" size={26} className="text-[var(--color-acc)]" />
        </div>
        <div className="text-center">
          <div className="text-[15px] font-semibold">{t('lock.title')}</div>
          <div className="text-[11.5px] text-[var(--color-dim2)] mt-1">{t('lock.subtitle')}</div>
        </div>

        <div className="flex gap-2 h-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <span key={i}
              className={`w-2.5 h-2.5 rounded-full border transition-all ${
                err ? 'border-red-400 bg-red-400'
                  : i < pin.length ? 'border-[var(--color-acc)] bg-[var(--color-acc)]'
                  : 'border-[var(--color-line2)]'
              }`} />
          ))}
        </div>

        <div className="grid grid-cols-3 gap-3 w-full">
          {['1','2','3','4','5','6','7','8','9','','0','del'].map((d, i) =>
            d === '' ? <span key={i} /> : (
              <button key={i} onClick={() => d === 'del' ? setPin(p => p.slice(0,-1)) : press(d)}
                className="h-14 rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] active:scale-95 transition-transform text-xl font-medium nums">
                {d === 'del' ? <Icon name="Delete" size={20} className="mx-auto text-[var(--color-dim)]" /> : d}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
