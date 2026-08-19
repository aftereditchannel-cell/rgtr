import { useState, useRef, useEffect } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { ICONS } from './icons'
import { useT } from '../../i18n'
import { useFmt } from '../../lib/useFmt'

/* ---------- Icon ---------- */
export function Icon({ name, size = 16, className = '', style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  const C = ICONS[name] ?? ICONS.Circle
  return <C size={size} className={className} style={style} />
}

/* ---------- Card ---------- */
export function Card({ children, className = '', pad = true, style, id }: { children: ReactNode; className?: string; pad?: boolean; style?: CSSProperties; id?: string }) {
  return (
    <div style={style} id={id}
      className={`rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] ${pad ? 'p-4' : ''} ${className}`}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, right, icon }: { children: ReactNode; right?: ReactNode; icon?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        {icon && <Icon name={icon} size={15} className="text-[var(--color-dim2)]" />}
        <h2 className="text-[12px] font-semibold tracking-[.14em] uppercase text-[var(--color-dim)]">{children}</h2>
      </div>
      {right}
    </div>
  )
}

/* ---------- Button ---------- */
type BtnProps = {
  children?: ReactNode
  onClick?: (e: React.MouseEvent) => void
  variant?: 'primary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md'
  icon?: string
  className?: string
  title?: string
  type?: 'button' | 'submit'
  disabled?: boolean
}
export function Button({ children, onClick, variant = 'outline', size = 'md', icon, className = '', title, type = 'button', disabled }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none'
  const sizes = { sm: 'text-[11.5px] px-2.5 py-1.5', md: 'text-[13px] px-3.5 py-2' }
  const variants = {
    primary: 'bg-[var(--color-acc)] text-white hover:brightness-115 shadow-[0_2px_12px_-4px_var(--color-acc)]',
    outline: 'border border-[var(--color-line2)] text-[var(--color-tx)] hover:bg-white/[.04] hover:border-[var(--color-dim2)]',
    ghost: 'text-[var(--color-dim)] hover:text-[var(--color-tx)] hover:bg-white/[.05]',
    danger: 'border border-red-500/30 text-red-400 hover:bg-red-500/10',
  }
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {icon && <Icon name={icon} size={size === 'sm' ? 13 : 15} />}
      {children}
    </button>
  )
}

/* ---------- Badge ---------- */
const PALETTE: Record<string, string> = {
  // status-ish
  Active: '#22c55e', Done: '#22c55e', Won: '#22c55e', Paid: '#22c55e', Published: '#22c55e', Released: '#22c55e', Signed: '#22c55e', Collaborating: '#22c55e',
  Doing: '#6366f1', 'In Touch': '#6366f1', Negotiation: '#6366f1', Scheduled: '#6366f1', Growing: '#22d3ee', Testing: '#22d3ee', Contacted: '#6366f1',
  Review: '#a855f7', Mixing: '#a855f7', Editing: '#a855f7', Research: '#a855f7', Production: '#a855f7', Recording: '#a855f7', Scripting: '#a855f7', Mastering: '#a855f7',
  'To Do': '#94a3b8', Backlog: '#64748b', Inbox: '#eab308', Idea: '#eab308', Lead: '#eab308', Demo: '#64748b', Planning: '#eab308', Prospect: '#eab308', Potential: '#22d3ee',
  Paused: '#f59e0b', Pending: '#f59e0b', 'Part-time': '#f59e0b', Building: '#f59e0b', Draft: '#64748b', Manual: '#64748b',
  Error: '#ef4444', Lost: '#ef4444', Overdue: '#ef4444', Rejected: '#ef4444', Urgent: '#ef4444',
  Archived: '#475569', Inactive: '#475569', Idle: '#475569',
  High: '#f97316', Medium: '#eab308', Low: '#64748b',
  Income: '#22c55e', Expense: '#ef4444',
  Freelance: '#22d3ee',
}
export function badgeColor(v: string): string { return PALETTE[v] ?? '#6b7280' }

export function Badge({ value, dot = false, className = '' }: { value: string; dot?: boolean; className?: string }) {
  const { o } = useT()
  if (!value) return <span className="text-[var(--color-dim2)]">—</span>
  const c = badgeColor(value)
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-[3px] text-[11px] font-medium whitespace-nowrap ${className}`}
      style={{ color: c, background: c + '18', border: `1px solid ${c}2e` }}>
      {dot && <span className="w-1.5 h-1.5 rounded-full" style={{ background: c }} />}
      {o(value)}
    </span>
  )
}

/* ---------- Progress ---------- */
export function Progress({ value, color, showLabel = true, height = 5 }: { value: number; color?: string; showLabel?: boolean; height?: number }) {
  const fmt = useFmt()
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  const c = color ?? (v >= 80 ? '#22c55e' : v >= 40 ? 'var(--color-acc)' : '#f59e0b')
  return (
    <div className="flex items-center gap-2 min-w-[70px]">
      <div className="flex-1 rounded-full bg-white/[.07] overflow-hidden" style={{ height }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${v}%`, background: c }} />
      </div>
      {showLabel && <span className="text-[10.5px] nums text-[var(--color-dim)] w-8 text-end">{fmt.dg(Math.round(v))}%</span>}
    </div>
  )
}

/* ---------- Empty ---------- */
export function Empty({ icon = 'Inbox', title, hint, action }: { icon?: string; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-11 h-11 rounded-xl grid place-items-center bg-white/[.04] border border-[var(--color-line)] mb-3">
        <Icon name={icon} size={19} className="text-[var(--color-dim2)]" />
      </div>
      <p className="text-[13.5px] text-[var(--color-dim)]">{title}</p>
      {hint && <p className="text-[12px] text-[var(--color-dim2)] mt-1 max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, wide = false, footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:p-8"
      style={{ background: 'rgba(4,5,8,.72)', backdropFilter: 'blur(4px)', paddingBottom: 'max(0.75rem, var(--sab))' }}
      onClick={onClose}>
      <div className={`anim w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-2xl border border-[var(--color-line2)] bg-[var(--color-bg2)] shadow-2xl my-auto flex flex-col max-h-[calc(100dvh-1.5rem)]`}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-line)] shrink-0">
          <h3 className="text-[14px] font-semibold">{title}</h3>
          <button onClick={onClose} className="text-[var(--color-dim2)] hover:text-[var(--color-tx)] transition-colors p-1 rounded-md hover:bg-white/5">
            <Icon name="X" size={17} />
          </button>
        </div>
        <div className="px-5 py-4 overflow-y-auto min-h-0 overscroll-contain">{children}</div>
        {footer && <div className="px-5 py-3.5 border-t border-[var(--color-line)] flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  )
}

/* ---------- Inputs ---------- */
const inputCls = 'w-full rounded-lg bg-[var(--color-bg)] border border-[var(--color-line2)] px-3 py-2 text-[13px] text-[var(--color-tx)] placeholder:text-[var(--color-dim2)] focus:border-[var(--color-acc)] transition-colors'

export function TextInput(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={`${inputCls} ${p.className ?? ''}`} />
}
export function TextArea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={`${inputCls} resize-y min-h-[76px] leading-relaxed ${p.className ?? ''}`} />
}
/**
 * Dropdown سفارشی — جایگزین <select> بومی
 * رفتار یکسان در WebView2 (ویندوز) و WebView اندروید:
 * باز/بسته با کلیک، بستن با کلیک بیرون/Esc، انتخاب با کلیک،
 * همیشه روی بقیه‌ی عناصر (z-50) و بدون خروج از صفحه.
 */
export function Select({ options, value, onChange, className = '', disabled }: {
  options: string[]
  value: string
  onChange: (e: { target: { value: string } }) => void
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [hi, setHi] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = options.find(o => o === value) ?? ''
  const label = (o: string) => (o === '' ? '—' : o)

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" disabled={disabled} onClick={() => setOpen(o => !o)}
        className={`${inputCls} cursor-pointer flex items-center justify-between gap-2 text-start w-full ${disabled ? 'opacity-50' : ''}`}
        aria-haspopup="listbox" aria-expanded={open}>
        <span className="truncate">{label(current)}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <div role="listbox" className="absolute z-50 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto rounded-lg glass-strong shadow-2xl py-1 anim">
          {options.map((o, i) => (
            <button key={o} type="button" role="option" aria-selected={o === value}
              onMouseEnter={() => setHi(i)}
              onClick={() => { onChange({ target: { value: o } }); setOpen(false) }}
              className={`w-full text-start px-3 py-2 text-[12px] transition-colors ${
                o === value
                  ? 'text-[var(--color-acc)] font-medium'
                  : i === hi ? 'bg-[var(--hover)] text-[var(--color-tx)]' : 'text-[var(--color-dim)]'
              }`}>
              {label(o)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
export function Field({ label, children, help }: { label: string; children: ReactNode; help?: string }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-medium text-[var(--color-dim)] mb-1.5">{label}</span>
      {children}
      {help && <span className="block text-[10.5px] text-[var(--color-dim2)] mt-1">{help}</span>}
    </label>
  )
}

/* ---------- Stat ---------- */
export function Stat({ label, value, sub, icon, tone, onClick }: {
  label: string; value: ReactNode; sub?: string; icon?: string; tone?: string; onClick?: () => void
}) {
  return (
    <div onClick={onClick}
      className={`rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3.5 transition-all duration-150 ${onClick ? 'cursor-pointer hover:border-[var(--color-line2)] hover:bg-white/[.02]' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10.5px] font-medium tracking-wider uppercase text-[var(--color-dim2)]">{label}</span>
        {icon && <Icon name={icon} size={14} style={{ color: tone ?? 'var(--color-dim2)' }} />}
      </div>
      <div className="text-[22px] font-semibold leading-none nums" style={tone ? { color: tone } : undefined}>{value}</div>
      {sub && <div className="text-[11px] text-[var(--color-dim2)] mt-1.5">{sub}</div>}
    </div>
  )
}
