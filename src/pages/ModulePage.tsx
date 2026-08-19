import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useApp } from '../store/useApp'
import type { Entity } from '../store/types'
import type { ViewKind } from '../domain/schema'
import { TableView } from '../components/views/TableView'
import { KanbanView } from '../components/views/KanbanView'
import { CardsView } from '../components/views/CardsView'
import { CalendarView } from '../components/views/CalendarView'
import { RecordForm } from '../components/views/RecordForm'
import { Button, Icon, TextInput, Empty } from '../components/ui/Primitives'
import { exportModuleCSV } from '../lib/backup'
import { useT } from '../i18n'
import { useFmt } from '../lib/useFmt'

const VIEW_ICON: Record<ViewKind, string> = { table: 'Table2', kanban: 'Columns3', cards: 'LayoutGrid', calendar: 'Calendar' }
const VIEW_KEY: Record<ViewKind, string> = { table: 'view.table', kanban: 'view.kanban', cards: 'view.cards', calendar: 'view.calendar' }

export function ModulePage() {
  const { key = '' } = useParams()
  const data = useApp(s => s.data)
  const { t, m: ml, f: fl, o: ol } = useT()
  const fmt = useFmt()
  const module = data.modules.find(m => m.key === key)
  const rows = data.records[key] ?? []

  const [view, setView] = useState<ViewKind | null>(null)
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<Entity | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const filterable = useMemo(
    () => module?.fields.filter(f => f.type === 'select' && (f.options?.length ?? 0) > 1).slice(0, 3) ?? [],
    [module],
  )

  const filtered = useMemo(() => {
    let r = rows
    const s = q.trim().toLowerCase()
    if (s) r = r.filter(row => Object.entries(row).some(([k, v]) =>
      k !== 'id' && (Array.isArray(v) ? v.join(' ') : String(v ?? '')).toLowerCase().includes(s)))
    for (const [k, v] of Object.entries(filters)) if (v) r = r.filter(row => String(row[k] ?? '') === v)
    return r
  }, [rows, q, filters])

  if (!module) return <Empty icon="SearchX" title={t('module.notFound')} hint={`${t('module.key')}: ${key}`} />

  const v: ViewKind = view ?? module.defaultView
  const open = (r: Entity) => { setEditing(r); setFormOpen(true) }
  const create = () => { setEditing(null); setFormOpen(true) }
  const activeFilters = Object.values(filters).filter(Boolean).length

  return (
    <div className="anim">
      {/* header */}
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg grid place-items-center bg-[var(--color-acc)]/12 border border-[var(--color-acc)]/25 shrink-0">
            <Icon name={module.icon} size={17} style={{ color: 'var(--color-acc)' }} />
          </div>
          <div>
            <h1 className="text-[19px] font-semibold leading-tight">{ml(module)}</h1>
            <p className="text-[11.5px] text-[var(--color-dim2)] mt-0.5">
              {filtered.length === rows.length
                ? t('module.countAll', { n: fmt.dg(filtered.length) })
                : t('module.countFiltered', { n: fmt.dg(filtered.length), total: fmt.dg(rows.length) })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" icon="Download" title={t('module.exportCSV')}
            onClick={() => void exportModuleCSV(module.key, filtered, module.fields.map(f => f.key))} />
          <Button size="sm" variant="primary" icon="Plus" onClick={create}>{t('module.newRecord')}</Button>
        </div>
      </div>

      {/* toolbar */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Icon name="Search" size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--color-dim2)]" />
          <TextInput value={q} onChange={e => setQ(e.target.value)} placeholder={t('common.search')} className="ps-8 py-1.5 text-[12.5px]" />
        </div>

        {filterable.map(f => (
          <select key={f.key} value={filters[f.key] ?? ''} onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}
            className="rounded-lg bg-[var(--color-bg)] border border-[var(--color-line2)] px-2.5 py-1.5 text-[12px] cursor-pointer hover:border-[var(--color-dim2)] transition-colors">
            <option value="">{t('module.filterAll', { f: fl(f) })}</option>
            {f.options?.map(o => <option key={o} value={o}>{ol(o)}</option>)}
          </select>
        ))}

        {(activeFilters > 0 || q) && (
          <Button size="sm" variant="ghost" icon="X" onClick={() => { setFilters({}); setQ('') }}>{t('common.clear')}</Button>
        )}

        <div className="ms-auto flex items-center gap-0.5 rounded-lg border border-[var(--color-line)] p-0.5">
          {module.views.map(vk => (
            <button key={vk} onClick={() => setView(vk)} title={t(VIEW_KEY[vk])}
              className={`px-2 py-1.5 rounded-md text-[11.5px] flex items-center gap-1.5 transition-all ${v === vk ? 'bg-white/[.08] text-[var(--color-tx)]' : 'text-[var(--color-dim2)] hover:text-[var(--color-dim)]'}`}>
              <Icon name={VIEW_ICON[vk]} size={13} />
              <span className="hidden md:inline">{t(VIEW_KEY[vk])}</span>
            </button>
          ))}
        </div>
      </div>

      {/* view */}
      {v === 'table' && <TableView module={module} rows={filtered} data={data} currency={data.settings.currency} onOpen={open} />}
      {v === 'kanban' && <KanbanView module={module} rows={filtered} data={data} currency={data.settings.currency} onOpen={open} />}
      {v === 'cards' && <CardsView module={module} rows={filtered} data={data} currency={data.settings.currency} onOpen={open} />}
      {v === 'calendar' && <CalendarView module={module} rows={filtered} onOpen={open} />}

      <RecordForm module={module} row={editing} open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
