import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../store/useApp'
import { Icon } from '../ui/Primitives'
import { useT } from '../../i18n'

interface Cmd { id: string; label: string; sub: string; icon: string; run: () => void }

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const nav = useNavigate()
  const data = useApp(s => s.data)
  const { t, m: ml } = useT()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(o => !o) }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30) } }, [open])

  const cmds: Cmd[] = useMemo(() => {
    const list: Cmd[] = [
      { id: 'dash', label: t('nav.dashboard'), sub: t('palette.home'), icon: 'LayoutDashboard', run: () => nav('/') },
      { id: 'dec', label: t('nav.decision'), sub: t('palette.prioritize'), icon: 'Target', run: () => nav('/decision') },
      { id: 'ana', label: t('nav.analytics'), sub: t('palette.stats'), icon: 'BarChart3', run: () => nav('/analytics') },
      { id: 'set', label: t('nav.settings'), sub: t('palette.setBackup'), icon: 'Settings', run: () => nav('/settings') },
    ]
    for (const m of data.modules) {
      list.push({ id: 'm' + m.key, label: ml(m), sub: t('palette.module'), icon: m.icon, run: () => nav(`/m/${m.key}`) })
    }
    // رکوردها
    for (const m of data.modules) {
      for (const r of (data.records[m.key] ?? []).slice(0, 60)) {
        const title = String(r[m.titleField] ?? '')
        if (title) list.push({ id: m.key + r.id, label: title, sub: ml(m), icon: m.icon, run: () => nav(`/m/${m.key}`) })
      }
    }
    return list
  }, [data, nav, t, ml])

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return cmds.slice(0, 9)
    return cmds.filter(c => (c.label + ' ' + c.sub).toLowerCase().includes(s)).slice(0, 9)
  }, [q, cmds])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[14vh] px-4"
      style={{ background: 'rgba(4,5,8,.7)', backdropFilter: 'blur(4px)' }} onClick={() => setOpen(false)}>
      <div className="anim w-full max-w-lg rounded-2xl border border-[var(--color-line2)] bg-[var(--color-bg2)] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[var(--color-line)]">
          <Icon name="Search" size={16} className="text-[var(--color-dim2)]" />
          <input ref={inputRef} value={q} placeholder={t('palette.placeholder')}
            onChange={e => { setQ(e.target.value); setSel(0) }}
            onKeyDown={e => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
              if (e.key === 'Enter' && results[sel]) { results[sel].run(); setOpen(false) }
            }}
            className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[var(--color-dim2)]" />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[.06] text-[var(--color-dim2)]">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto py-1.5">
          {results.map((c, i) => (
            <button key={c.id} onClick={() => { c.run(); setOpen(false) }} onMouseEnter={() => setSel(i)}
              className={`w-full flex items-center gap-3 px-4 py-2 text-start transition-colors ${i === sel ? 'bg-white/[.06]' : ''}`}>
              <Icon name={c.icon} size={15} className="text-[var(--color-dim2)] shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] truncate">{c.label}</span>
                <span className="block text-[10.5px] text-[var(--color-dim2)] truncate">{c.sub}</span>
              </span>
              {i === sel && <Icon name="CornerDownLeft" size={12} className="text-[var(--color-dim2)]" />}
            </button>
          ))}
          {!results.length && <div className="px-4 py-7 text-center text-[12.5px] text-[var(--color-dim2)]">{t('palette.empty')}</div>}
        </div>
      </div>
    </div>
  )
}
