import { useEffect, useRef, useState } from 'react'
import { Icon } from './Primitives'

/**
 * منوی کشویی سفارشی — جایگزین <select> بومی.
 *
 * روی اندروید (WebView) منوی بومی <select> تمام‌صفحه باز می‌شود و تجربه را می‌شکند.
 * این کامپوننت یک لیست داخل خود برنامه باز می‌کند که در هر دو پلتفرم یکسان و
 * داخل صفحه باقی می‌ماند. برای لیست‌های طولانی اسکرول دارد.
 */

export interface DropOption {
  value: string
  label: string
  /** رنگ/بادج اختیاری برای آیتم‌ها */
  tone?: string
}

export function Dropdown({
  options,
  value,
  onChange,
  placeholder = '—',
  className = '',
  align = 'start',
}: {
  options: DropOption[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  align?: 'start' | 'end'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = options.find(o => o.value === value)

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-line2)] px-3 py-2 text-[13px] text-start transition-colors focus:border-[var(--color-acc)] hover:border-[var(--color-dim2)]"
      >
        <span className="flex-1 truncate">{current ? current.label : <span className="text-[var(--color-dim2)]">{placeholder}</span>}</span>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-[var(--color-dim2)] shrink-0" />
      </button>

      {open && (
        <div
          className={`absolute z-[55] mt-1 min-w-full w-max max-w-[260px] rounded-xl border border-[var(--color-line2)] bg-[var(--color-panel)] shadow-2xl anim ${
            align === 'end' ? 'end-0' : 'start-0'
          }`}
          style={{ backdropFilter: 'blur(14px)' }}
        >
          <div className="max-h-[46vh] overflow-y-auto py-1">
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-start text-[12.5px] transition-colors hover:bg-white/[.06] ${
                  o.value === value ? 'text-[var(--color-acc)] font-medium' : 'text-[var(--color-tx)]'
                }`}
              >
                {o.tone && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: o.tone }} />}
                <span className="flex-1 truncate">{o.label}</span>
                {o.value === value && <Icon name="Check" size={13} />}
              </button>
            ))}
            {!options.length && (
              <div className="px-3 py-4 text-center text-[12px] text-[var(--color-dim2)]">—</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
