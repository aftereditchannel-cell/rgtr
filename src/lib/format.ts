import type { Lang } from '../store/types'
import { isoToJalali, jalaliToISO, jalaliMonthLength, JALALI_MONTHS } from './jalali'

export const DAY = 86400000

export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function dateOnly(v?: string | null): string {
  return v ? String(v).slice(0, 10) : ''
}

/** روزهای باقی‌مانده تا تاریخ (منفی = گذشته) */
export function daysUntil(v?: string | null): number | null {
  const d = dateOnly(v)
  if (!d) return null
  const t = Date.parse(d + 'T00:00:00')
  if (Number.isNaN(t)) return null
  const today = Date.parse(todayISO() + 'T00:00:00')
  return Math.round((t - today) / DAY)
}

/* ---------- ارقام ---------- */
const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹']

/** تبدیل ارقام لاتین به فارسی */
export function faDigits(s: string | number): string {
  return String(s).replace(/\d/g, d => FA_DIGITS[Number(d)])
}

/** تنظیمات نمایشی که به توابع قالب‌بندی داده می‌شود */
export interface FmtOpts {
  lang: Lang
  calendar?: 'jalali' | 'gregorian'
  digits?: 'fa' | 'latn'
}

const DEFAULT_FMT: Required<FmtOpts> = { lang: 'fa', calendar: 'jalali', digits: 'fa' }

/** ارقام را بر اساس تنظیمات محلی می‌کند */
export function dg(s: string | number, o?: Partial<FmtOpts>): string {
  const opt = { ...DEFAULT_FMT, ...o }
  return opt.lang === 'fa' && opt.digits === 'fa' ? faDigits(s) : String(s)
}

/* ---------- تاریخ ---------- */

/** نمایش کوتاه تاریخ: ۱۴۰۵/۰۵/۲۶ یا 2026-08-17 */
export function fmtDate(v?: string | null, o?: Partial<FmtOpts>): string {
  const iso = dateOnly(v)
  if (!iso) return '—'
  const opt = { ...DEFAULT_FMT, ...o }
  if (opt.lang === 'fa' && opt.calendar === 'jalali') {
    const j = isoToJalali(iso)
    if (!j) return iso
    return dg(`${j.jy}/${String(j.jm).padStart(2, '0')}/${String(j.jd).padStart(2, '0')}`, opt)
  }
  return iso
}

/** نمایش خوانا: ۲۶ مرداد ۱۴۰۵ یا 17 Aug 2026 */
export function fmtDateLong(v?: string | null, o?: Partial<FmtOpts>): string {
  const iso = dateOnly(v)
  if (!iso) return '—'
  const opt = { ...DEFAULT_FMT, ...o }
  if (opt.lang === 'fa' && opt.calendar === 'jalali') {
    const j = isoToJalali(iso)
    if (!j) return iso
    return `${dg(j.jd, opt)} ${JALALI_MONTHS[j.jm - 1]} ${dg(j.jy, opt)}`
  }
  const t = Date.parse(iso + 'T00:00:00')
  if (Number.isNaN(t)) return iso
  return new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** تاریخ نسبی: امروز / فردا / ۳ روز مانده / ۲ روز گذشته */
export function relDay(v?: string | null, o?: Partial<FmtOpts>): string {
  const n = daysUntil(v)
  if (n === null) return '—'
  const opt = { ...DEFAULT_FMT, ...o }
  if (opt.lang === 'fa') {
    if (n === 0) return 'امروز'
    if (n === 1) return 'فردا'
    if (n === -1) return 'دیروز'
    if (n < 0) return `${dg(-n, opt)} روز گذشته`
    return `${dg(n, opt)} روز مانده`
  }
  if (n === 0) return 'today'
  if (n === 1) return 'tomorrow'
  if (n === -1) return '1d late'
  if (n < 0) return `${-n}d late`
  return `in ${n}d`
}

/** زمان نسبی برای نقاط بازیابی و همگام‌سازی */
export function relTime(iso?: string | null, o?: Partial<FmtOpts>): string {
  if (!iso) return '—'
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return '—'
  const opt = { ...DEFAULT_FMT, ...o }
  const mins = Math.round((Date.now() - t) / 60000)
  const fa = opt.lang === 'fa'
  if (mins < 1) return fa ? 'هم‌اکنون' : 'just now'
  if (mins < 60) return fa ? `${dg(mins, opt)} دقیقه پیش` : `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return fa ? `${dg(hrs, opt)} ساعت پیش` : `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return fa ? `${dg(days, opt)} روز پیش` : `${days}d ago`
  return fmtDate(new Date(t).toISOString(), opt)
}

/* ---------- عدد و پول ---------- */

export function money(n: unknown, cur = '$', o?: Partial<FmtOpts>): string {
  const v = Number(n)
  const opt = { ...DEFAULT_FMT, ...o }
  if (!Number.isFinite(v) || v === 0) return `${cur}${dg(0, opt)}`
  const a = Math.abs(v)
  const s = a >= 1e9 ? (a / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
    : a >= 1e6 ? (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
    : a >= 1e3 ? (a / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
    : String(Math.round(a))
  return `${v < 0 ? '-' : ''}${cur}${dg(s, opt)}`
}

export function num(n: unknown, o?: Partial<FmtOpts>): string {
  const v = Number(n) || 0
  const opt = { ...DEFAULT_FMT, ...o }
  const s = v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
    : v >= 1e3 ? (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
    : String(v)
  return dg(s, opt)
}

/* ---------- ماتریس تقویم ---------- */

/**
 * شبکه‌ی ماه برای نمای تقویم. خروجی همیشه تاریخ ISO میلادی است
 * تا رکوردها بدون تبدیل اضافی مطابقت داده شوند.
 * در حالت شمسی، ماه جلالی و هفته از شنبه شروع می‌شود.
 */
export function monthMatrix(year: number, month: number, o?: Partial<FmtOpts>): (string | null)[][] {
  const opt = { ...DEFAULT_FMT, ...o }
  const cells: (string | null)[] = []

  if (opt.lang === 'fa' && opt.calendar === 'jalali') {
    // year/month اینجا شمسی هستند (month صفرمبنا)
    const jy = year
    const jm = month + 1
    const len = jalaliMonthLength(jy, jm)
    const firstISO = jalaliToISO(jy, jm, 1)
    const dow = new Date(firstISO + 'T00:00:00').getDay() // 0=یکشنبه
    const start = (dow + 1) % 7 // شنبه‌محور
    for (let i = 0; i < start; i++) cells.push(null)
    for (let d = 1; d <= len; d++) cells.push(jalaliToISO(jy, jm, d))
  } else {
    const first = new Date(year, month, 1)
    const start = (first.getDay() + 6) % 7 // Monday-first
    const len = new Date(year, month + 1, 0).getDate()
    for (let i = 0; i < start; i++) cells.push(null)
    for (let d = 1; d <= len; d++)
      cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }

  while (cells.length % 7) cells.push(null)
  const rows: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

/** عنوان ماه در نوار تقویم */
export function monthTitle(year: number, month: number, o?: Partial<FmtOpts>): string {
  const opt = { ...DEFAULT_FMT, ...o }
  if (opt.lang === 'fa' && opt.calendar === 'jalali')
    return `${JALALI_MONTHS[month]} ${dg(year, opt)}`
  return new Date(year, month, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

/** نام روزهای هفته مطابق چیدمان تقویم */
export function weekdayNames(o?: Partial<FmtOpts>): string[] {
  const opt = { ...DEFAULT_FMT, ...o }
  if (opt.lang === 'fa' && opt.calendar === 'jalali') return ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']
  return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
}

/** «امروز» در واحد تقویم جاری — برای مقداردهی اولیه‌ی نمای تقویم */
export function currentYearMonth(o?: Partial<FmtOpts>): { year: number; month: number } {
  const opt = { ...DEFAULT_FMT, ...o }
  const now = new Date()
  if (opt.lang === 'fa' && opt.calendar === 'jalali') {
    const j = isoToJalali(todayISO())!
    return { year: j.jy, month: j.jm - 1 }
  }
  return { year: now.getFullYear(), month: now.getMonth() }
}

/** جابه‌جایی ماه با احترام به تقویم جاری */
export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  let y = year
  let m = month + delta
  while (m < 0) { m += 12; y -= 1 }
  while (m > 11) { m -= 12; y += 1 }
  return { year: y, month: m }
}
