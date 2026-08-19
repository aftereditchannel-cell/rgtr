import type { FieldDef } from '../../domain/schema'
import type { AppData, Entity } from '../../store/types'
import { Badge, Progress, Icon } from '../ui/Primitives'
import { daysUntil } from '../../lib/format'
import { useFmt } from '../../lib/useFmt'
import { refLabel } from '../../store/useApp'

export function CellValue({ f, row, data, currency }: { f: FieldDef; row: Entity; data: AppData; currency: string }) {
  const fmt = useFmt()
  const v = row[f.key]

  switch (f.type) {
    case 'select':
      return <Badge value={String(v ?? '')} dot />
    case 'money':
      return <span className="nums">{fmt.money(v, currency)}</span>
    case 'number':
      return <span className="nums text-[var(--color-dim)]">{v === '' || v == null ? '—' : fmt.num(v)}</span>
    case 'progress':
      return <Progress value={Number(v) || 0} />
    case 'date': {
      if (!v) return <span className="text-[var(--color-dim2)]">—</span>
      const n = daysUntil(String(v))
      const late = n !== null && n < 0
      return (
        <span className={`nums text-[12px] ${late ? 'text-red-400' : n === 0 ? 'text-amber-400' : 'text-[var(--color-dim)]'}`}>
          {fmt.date(String(v))} <span className="opacity-60">· {fmt.relDay(String(v))}</span>
        </span>
      )
    }
    case 'ref': {
      const label = refLabel(data, f.refModule, v)
      return label
        ? <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-dim)]"><Icon name="Link2" size={11} className="opacity-50" />{label}</span>
        : <span className="text-[var(--color-dim2)]">—</span>
    }
    case 'tags': {
      const arr = Array.isArray(v) ? (v as string[]) : []
      if (!arr.length) return <span className="text-[var(--color-dim2)]">—</span>
      return (
        <span className="flex gap-1 flex-wrap">
          {arr.slice(0, 3).map(t => (
            <span key={t} className="px-1.5 py-[1px] rounded text-[10.5px] bg-white/[.06] text-[var(--color-dim)]">{t}</span>
          ))}
          {arr.length > 3 && <span className="text-[10.5px] text-[var(--color-dim2)] nums">+{fmt.dg(arr.length - 3)}</span>}
        </span>
      )
    }
    case 'checklist': {
      const arr = (Array.isArray(v) ? v : []) as { done: boolean }[]
      if (!arr.length) return <span className="text-[var(--color-dim2)]">—</span>
      const done = arr.filter(x => x.done).length
      return <span className="text-[11.5px] text-[var(--color-dim)] nums ltr">{fmt.dg(done)}/{fmt.dg(arr.length)}</span>
    }
    case 'url': {
      const s = String(v ?? '')
      if (!s) return <span className="text-[var(--color-dim2)]">—</span>
      const href = s.startsWith('http') ? s : s.startsWith('@') ? '' : 'https://' + s
      return href
        ? <a href={href} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
            className="text-[var(--color-acc)] hover:underline text-[12px]">{s}</a>
        : <span className="text-[12px] text-[var(--color-dim)]">{s}</span>
    }
    case 'textarea':
      return <span className="text-[12px] text-[var(--color-dim)] line-clamp-1">{String(v ?? '') || '—'}</span>
    default:
      return <span className="truncate">{String(v ?? '') || <span className="text-[var(--color-dim2)]">—</span>}</span>
  }
}
