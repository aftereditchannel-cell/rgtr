import { useState } from 'react'
import type { ModuleDef } from '../../domain/schema'
import type { AppData, Entity } from '../../store/types'
import { useApp } from '../../store/useApp'
import { Badge, Icon, badgeColor } from '../ui/Primitives'
import { daysUntil } from '../../lib/format'
import { useFmt } from '../../lib/useFmt'
import { useT } from '../../i18n'
import { refLabel } from '../../store/useApp'

export function KanbanView({ module, rows, data, currency, onOpen }: {
  module: ModuleDef; rows: Entity[]; data: AppData; currency: string; onOpen: (r: Entity) => void
}) {
  const { update, add } = useApp()
  const fmt = useFmt()
  const { t, o: ol } = useT()
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<string | null>(null)

  const gb = module.groupBy ?? 'status'
  const field = module.fields.find(f => f.key === gb)
  const cols = field?.options ?? [...new Set(rows.map(r => String(r[gb] ?? '—')))]

  const drop = (col: string) => {
    if (dragId) update(module.key, dragId, { [gb]: col })
    setDragId(null); setOverCol(null)
  }

  // فیلدهای فرعی برای نمایش روی کارت
  const meta = module.fields.filter(f => ['priority', 'deadline', 'publishDate', 'releaseDate', 'nextContact'].includes(f.key))
  const refF = module.fields.find(f => f.type === 'ref')
  const moneyF = module.fields.find(f => f.type === 'money')

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1">
      {cols.map(col => {
        const items = rows.filter(r => String(r[gb] ?? '') === col)
        const c = badgeColor(col)
        return (
          <div key={col}
            onDragOver={e => { e.preventDefault(); setOverCol(col) }}
            onDragLeave={() => setOverCol(c => (c === col ? null : c))}
            onDrop={() => drop(col)}
            className={`shrink-0 w-[268px] rounded-xl border border-[var(--color-line)] bg-[var(--color-bg2)]/60 flex flex-col max-h-[calc(100vh-215px)] ${overCol === col ? 'drag-over' : ''}`}>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-line)] sticky top-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />
                <span className="text-[12px] font-medium truncate">{ol(col)}</span>
                <span className="text-[10.5px] text-[var(--color-dim2)] nums">{fmt.dg(items.length)}</span>
              </div>
              <button onClick={() => add(module.key, { [gb]: col })}
                className="text-[var(--color-dim2)] hover:text-[var(--color-tx)] p-0.5 rounded hover:bg-white/5">
                <Icon name="Plus" size={13} />
              </button>
            </div>
            <div className="p-2 space-y-2 overflow-y-auto flex-1">
              {items.map(r => {
                const late = daysUntil(String(r.deadline ?? r.publishDate ?? '')) 
                return (
                  <div key={r.id} draggable
                    onDragStart={() => setDragId(r.id)}
                    onDragEnd={() => { setDragId(null); setOverCol(null) }}
                    onClick={() => onOpen(r)}
                    className={`rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] p-2.5 cursor-pointer hover:border-[var(--color-line2)] transition-all ${dragId === r.id ? 'dragging' : ''}`}>
                    <p className="text-[12.5px] font-medium leading-snug mb-1.5 line-clamp-2">
                      {String(r[module.titleField] ?? '') || t('common.untitled')}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {meta.map(f => {
                        const v = r[f.key]
                        if (!v) return null
                        if (f.type === 'select') return <Badge key={f.key} value={String(v)} />
                        const n = daysUntil(String(v))
                        return (
                          <span key={f.key}
                            className={`text-[10.5px] inline-flex items-center gap-1 ${n !== null && n < 0 ? 'text-red-400' : n === 0 ? 'text-amber-400' : 'text-[var(--color-dim2)]'}`}>
                            <Icon name="Calendar" size={10} />{fmt.relDay(String(v))}
                          </span>
                        )
                      })}
                      {moneyF && Number(r[moneyF.key]) > 0 && (
                        <span className="text-[10.5px] text-emerald-400/90 nums">{fmt.money(r[moneyF.key], currency)}</span>
                      )}
                    </div>
                    {refF && refLabel(data, refF.refModule, r[refF.key]) && (
                      <div className="mt-1.5 pt-1.5 border-t border-[var(--color-line)] text-[10.5px] text-[var(--color-dim2)] truncate">
                        {refLabel(data, refF.refModule, r[refF.key])}
                      </div>
                    )}
                    {late !== null && late < 0 && <div className="mt-1 h-[2px] rounded bg-red-500/50" />}
                  </div>
                )
              })}
              {!items.length && <div className="text-[11px] text-[var(--color-dim2)] text-center py-5">{t('kanban.empty')}</div>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
