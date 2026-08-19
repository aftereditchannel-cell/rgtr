import { useState, useEffect } from 'react'
import type { ModuleDef } from '../../domain/schema'
import type { Entity } from '../../store/types'
import { useApp } from '../../store/useApp'
import { todayISO } from '../../lib/format'
import { useFmt } from '../../lib/useFmt'
import { useT } from '../../i18n'
import { Icon, Button, badgeColor } from '../ui/Primitives'

export function CalendarView({ module, rows, onOpen }: {
  module: ModuleDef; rows: Entity[]; onOpen: (r: Entity) => void
}) {
  const { update, add } = useApp()
  const fmt = useFmt()
  const { t, lang } = useT()
  const cal = fmt.opts.calendar

  // year/month در واحد تقویم فعال است (شمسی یا میلادی)
  const [cur, setCur] = useState(() => fmt.currentYearMonth())
  const [dragId, setDragId] = useState<string | null>(null)
  const [overDay, setOverDay] = useState<string | null>(null)

  // با تعویض تقویم/زبان، ماه جاری را در واحد جدید بازتنظیم کن
  useEffect(() => { setCur(fmt.currentYearMonth()) }, [lang, cal]) // eslint-disable-line react-hooks/exhaustive-deps

  const df = module.dateField ?? 'date'
  const matrix = fmt.monthMatrix(cur.year, cur.month)
  const today = todayISO()
  const weekdays = fmt.weekdayNames()

  const byDay = new Map<string, Entity[]>()
  for (const r of rows) {
    const d = String(r[df] ?? '').slice(0, 10)
    if (!d) continue
    if (!byDay.has(d)) byDay.set(d, [])
    byDay.get(d)!.push(r)
  }

  const move = (delta: number) => setCur(c => fmt.shiftMonth(c.year, c.month, delta))

  /** شماره‌ی روز در تقویم فعال (نه لزوماً روز میلادی) */
  const dayNum = (iso: string, idx: number, weekIdx: number): string => {
    if (cal === 'jalali' && fmt.opts.lang === 'fa') {
      // سلول‌ها به ترتیب روزهای ماه شمسی چیده شده‌اند
      const flatIndex = weekIdx * 7 + idx
      const offset = matrix.flat().findIndex(x => x !== null)
      return fmt.dg(flatIndex - offset + 1)
    }
    return fmt.dg(Number(iso.slice(8)))
  }

  const undated = rows.filter(r => !String(r[df] ?? '').slice(0, 10))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="ghost" icon="ChevronRight" onClick={() => move(-1)} className="flip-rtl" />
          <span className="text-[13px] font-medium min-w-[140px] text-center">{fmt.monthTitle(cur.year, cur.month)}</span>
          <Button size="sm" variant="ghost" icon="ChevronLeft" onClick={() => move(1)} className="flip-rtl" />
          <Button size="sm" variant="ghost" onClick={() => setCur(fmt.currentYearMonth())}>{t('cal.today')}</Button>
        </div>
        <span className="text-[11px] text-[var(--color-dim2)] hidden sm:block">{t('cal.dragHint')}</span>
      </div>

      <div className="grid grid-cols-7 gap-px rounded-xl overflow-hidden border border-[var(--color-line)] bg-[var(--color-line)]">
        {weekdays.map(d => (
          <div key={d} className="bg-[var(--color-bg2)] text-[10px] tracking-wider text-[var(--color-dim2)] text-center py-2 font-medium">{d}</div>
        ))}
        {matrix.map((week, wi) => week.map((day, i) => {
          const items = day ? byDay.get(day) ?? [] : []
          const isToday = day === today
          return (
            <div key={`${wi}-${i}`}
              onDragOver={e => { if (day) { e.preventDefault(); setOverDay(day) } }}
              onDragLeave={() => setOverDay(d => (d === day ? null : d))}
              onDrop={() => { if (day && dragId) update(module.key, dragId, { [df]: day }); setDragId(null); setOverDay(null) }}
              onDoubleClick={() => day && add(module.key, { [df]: day })}
              className={`min-h-[92px] p-1.5 bg-[var(--color-panel)] ${!day ? 'opacity-30' : ''} ${overDay === day ? 'drag-over' : ''} ${isToday ? 'bg-[var(--color-acc)]/[.07]' : ''}`}>
              {day && (
                <div className={`text-[10.5px] mb-1 nums ${isToday ? 'text-[var(--color-acc)] font-semibold' : 'text-[var(--color-dim2)]'}`}>
                  {dayNum(day, i, wi)}
                </div>
              )}
              <div className="space-y-1">
                {items.slice(0, 3).map(r => {
                  const c = badgeColor(String(r.status ?? ''))
                  return (
                    <div key={r.id} draggable
                      onDragStart={() => setDragId(r.id)}
                      onDragEnd={() => { setDragId(null); setOverDay(null) }}
                      onClick={() => onOpen(r)}
                      className={`text-[10.5px] px-1.5 py-1 rounded cursor-pointer truncate leading-tight hover:brightness-125 transition-all ${dragId === r.id ? 'dragging' : ''}`}
                      style={{ background: c + '20', color: c, borderInlineStartWidth: 2, borderInlineStartStyle: 'solid', borderInlineStartColor: c }}
                      title={String(r[module.titleField] ?? '')}>
                      {String(r[module.titleField] ?? t('common.untitled'))}
                    </div>
                  )
                })}
                {items.length > 3 && (
                  <div className="text-[9.5px] text-[var(--color-dim2)] ps-1">
                    {t('cal.more', { n: fmt.dg(items.length - 3) })}
                  </div>
                )}
              </div>
            </div>
          )
        }))}
      </div>

      {undated.length > 0 && (
        <div className="mt-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
          <div className="text-[11px] text-[var(--color-dim2)] mb-2 flex items-center gap-1.5">
            <Icon name="CalendarOff" size={12} /> {t('cal.undated')} ({fmt.dg(undated.length)})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {undated.map(r => (
              <span key={r.id} draggable onDragStart={() => setDragId(r.id)} onClick={() => onOpen(r)}
                className="text-[11px] px-2 py-1 rounded-md bg-white/[.05] hover:bg-white/[.09] cursor-pointer">
                {String(r[module.titleField] ?? t('common.untitled'))}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
