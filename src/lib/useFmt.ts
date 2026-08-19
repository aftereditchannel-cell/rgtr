import { useMemo } from 'react'
import { useApp } from '../store/useApp'
import * as F from './format'
import type { FmtOpts } from './format'

/**
 * قالب‌بندی متصل به تنظیمات کاربر.
 * به‌جای پاس‌دادن {lang, calendar, digits} در هر فراخوانی،
 * یک‌بار اینجا bind می‌شود: const fmt = useFmt(); fmt.date(x)
 */
export interface Fmt {
  opts: Required<FmtOpts>
  /** واحد پول فعلی از تنظیمات */
  currency: string
  dg: (s: string | number) => string
  date: (v?: string | null) => string
  dateLong: (v?: string | null) => string
  relDay: (v?: string | null) => string
  relTime: (v?: string | null) => string
  money: (n: unknown, cur?: string) => string
  num: (n: unknown) => string
  monthMatrix: (year: number, month: number) => (string | null)[][]
  monthTitle: (year: number, month: number) => string
  weekdayNames: () => string[]
  currentYearMonth: () => { year: number; month: number }
  shiftMonth: (year: number, month: number, delta: number) => { year: number; month: number }
}

export function useFmt(): Fmt {
  const lang = useApp(s => s.data.settings.lang) ?? 'fa'
  const calendar = useApp(s => s.data.settings.calendar) ?? 'jalali'
  const digits = useApp(s => s.data.settings.digits) ?? 'fa'
  const currency = useApp(s => s.data.settings.currency) ?? '$'

  return useMemo(() => {
    const o: Required<FmtOpts> = { lang, calendar, digits }
    return {
      opts: o,
      currency,
      dg: s => F.dg(s, o),
      date: v => F.fmtDate(v, o),
      dateLong: v => F.fmtDateLong(v, o),
      relDay: v => F.relDay(v, o),
      relTime: v => F.relTime(v, o),
      money: (n, cur) => F.money(n, cur ?? currency, o),
      num: n => F.num(n, o),
      monthMatrix: (y, m) => F.monthMatrix(y, m, o),
      monthTitle: (y, m) => F.monthTitle(y, m, o),
      weekdayNames: () => F.weekdayNames(o),
      currentYearMonth: () => F.currentYearMonth(o),
      shiftMonth: (y, m, d) => F.shiftMonth(y, m, d),
    }
  }, [lang, calendar, digits, currency])
}
