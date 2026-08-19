import { useState } from 'react'
import type { ModuleDef } from '../../domain/schema'
import type { AppData, Entity } from '../../store/types'
import { CellValue } from './CellValue'
import { Icon, Empty } from '../ui/Primitives'
import { useT } from '../../i18n'

export function TableView({ module, rows, data, currency, onOpen }: {
  module: ModuleDef; rows: Entity[]; data: AppData; currency: string; onOpen: (r: Entity) => void
}) {
  const { t, f: fl } = useT()
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const cols = module.fields.filter(f => f.col)
  const shown = cols.length ? cols : module.fields.slice(0, 6)

  const sorted = sort
    ? [...rows].sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key]
        const an = Number(av), bn = Number(bv)
        if (Number.isFinite(an) && Number.isFinite(bn) && av !== '' && bv !== '') return (an - bn) * sort.dir
        return String(av ?? '').localeCompare(String(bv ?? '')) * sort.dir
      })
    : rows

  if (!rows.length) return <Empty icon="Table" title={t('module.emptyTitle')} hint={t('module.emptyHint')} />

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-line)]">
      <table className="w-full text-[12.5px] border-collapse min-w-[640px]">
        <thead>
          <tr className="bg-[var(--color-bg2)]">
            {shown.map(f => (
              <th key={f.key}
                onClick={() => setSort(s => (s?.key === f.key ? { key: f.key, dir: s.dir === 1 ? -1 : 1 } : { key: f.key, dir: 1 }))}
                className="text-start font-medium text-[10.5px] uppercase tracking-wider text-[var(--color-dim2)] px-3 py-2.5 cursor-pointer hover:text-[var(--color-dim)] select-none whitespace-nowrap border-b border-[var(--color-line)]">
                <span className="inline-flex items-center gap-1">
                  {fl(f)}
                  {sort?.key === f.key && <Icon name={sort.dir === 1 ? 'ChevronUp' : 'ChevronDown'} size={11} />}
                </span>
              </th>
            ))}
            <th className="w-9 border-b border-[var(--color-line)]" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.id} onClick={() => onOpen(r)}
              className="border-b border-[var(--color-line)] last:border-0 hover:bg-white/[.025] cursor-pointer transition-colors">
              {shown.map((f, i) => (
                <td key={f.key} className={`px-3 py-2.5 align-middle ${i === 0 ? 'font-medium text-[var(--color-tx)] max-w-[240px]' : ''}`}>
                  <CellValue f={f} row={r} data={data} currency={currency} />
                </td>
              ))}
              <td className="px-2 text-[var(--color-dim2)]"><Icon name="ChevronRight" size={13} className="flip-rtl" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
