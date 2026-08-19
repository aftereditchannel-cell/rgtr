import type { ModuleDef } from '../../domain/schema'
import type { AppData, Entity } from '../../store/types'
import { Badge, Progress, Icon, Empty } from '../ui/Primitives'
import { useFmt } from '../../lib/useFmt'
import { useT } from '../../i18n'
import { refLabel } from '../../store/useApp'

export function CardsView({ module, rows, data, currency, onOpen }: {
  module: ModuleDef; rows: Entity[]; data: AppData; currency: string; onOpen: (r: Entity) => void
}) {
  const fmt = useFmt()
  const { t, f: fl, o: ol } = useT()
  if (!rows.length) return <Empty icon="LayoutGrid" title={t('empty.noRecords')} />

  const statusF = module.fields.find(f => f.key === 'status')
  const progF = module.fields.find(f => f.type === 'progress')
  const dateF = module.fields.find(f => f.type === 'date')
  const moneyFs = module.fields.filter(f => f.type === 'money').slice(0, 2)
  const descF = module.fields.find(f => ['notes', 'description', 'goal', 'role', 'desc'].includes(f.key))
  const numFs = module.fields.filter(f => f.type === 'number' && !f.key.match(/^(potential|difficulty|timeRequired|risk|urgency|strategic)/)).slice(0, 2)
  const secondary = module.fields.filter(f => ['category', 'platform', 'role', 'genre', 'type', 'kind', 'service', 'schedule'].includes(f.key)).slice(0, 2)

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map(r => (
        <div key={r.id} onClick={() => onOpen(r)}
          className="anim rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 cursor-pointer hover:border-[var(--color-line2)] hover:bg-white/[.015] transition-all group">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-[14px] font-semibold leading-tight line-clamp-2">{String(r[module.titleField] ?? '') || t('common.untitled')}</h3>
            <Icon name="ArrowUpRight" size={14} className="text-[var(--color-dim2)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {statusF && r.status ? <Badge value={String(r.status)} dot /> : null}
            {secondary.map(f => r[f.key] ? (
              <span key={f.key} className="px-1.5 py-[3px] rounded text-[10.5px] bg-white/[.05] text-[var(--color-dim)]">{ol(r[f.key])}</span>
            ) : null)}
          </div>

          {descF && r[descF.key] ? (
            <p className="text-[11.5px] text-[var(--color-dim2)] leading-relaxed line-clamp-2 mb-3">{String(r[descF.key])}</p>
          ) : null}

          {progF ? <div className="mb-3"><Progress value={Number(r[progF.key]) || 0} /></div> : null}

          <div className="flex items-center justify-between gap-2 text-[11px] pt-2.5 border-t border-[var(--color-line)]">
            <div className="flex items-center gap-3 min-w-0">
              {moneyFs.map(f => Number(r[f.key]) ? (
                <span key={f.key} className="nums" style={{ color: f.key === 'revenue' ? '#22c55e' : 'var(--color-dim)' }}>
                  {fmt.money(r[f.key], currency)}
                </span>
              ) : null)}
              {numFs.map(f => Number(r[f.key]) ? (
                <span key={f.key} className="nums text-[var(--color-dim)] flex items-center gap-1">
                  <Icon name="Users" size={10} />{fmt.num(r[f.key])}
                </span>
              ) : null)}
            </div>
            {dateF && r[dateF.key] ? (
              <span className="text-[var(--color-dim2)] shrink-0 flex items-center gap-1">
                <Icon name="Calendar" size={10} />{fmt.relDay(String(r[dateF.key]))}
              </span>
            ) : null}
          </div>

          {module.fields.filter(f => f.type === 'ref').slice(0, 1).map(f => {
            const l = refLabel(data, f.refModule, r[f.key])
            return l ? <div key={f.key} className="mt-2 text-[10.5px] text-[var(--color-dim2)] truncate">{fl(f)}: {l}</div> : null
          })}
        </div>
      ))}
    </div>
  )
}
