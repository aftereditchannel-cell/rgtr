import { useCallback } from 'react'
import { useApp } from '../store/useApp'
import { UI, CLOUD_ERR, type Lang } from './dict'
import { FIELD_FA, VALUE_FA, GROUP_FA, WEIGHT_FA, WEIGHT_EN, BAND_FA, BAND_EN } from './domain'
import type { FieldDef, ModuleDef } from '../domain/schema'

export type { Lang }
export { UI }

/** جایگذاری {name} در متن */
function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m))
}

export function tr(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const pair = UI[key]
  if (!pair) return key
  return interpolate(pair[lang] ?? pair.en, vars)
}

/** برچسب ماژول با توجه به زبان */
export function moduleLabel(lang: Lang, m: Pick<ModuleDef, 'label' | 'labelFa'>): string {
  return lang === 'fa' ? (m.labelFa || m.label) : m.label
}

/** برچسب فیلد: labelFa سفارشی → دیکشنری → انگلیسی */
export function fieldLabel(lang: Lang, f: Pick<FieldDef, 'label' | 'labelFa'>): string {
  if (lang !== 'fa') return f.label
  return f.labelFa || FIELD_FA[f.label] || f.label
}

/** نمایش مقدار select — مقدار ذخیره‌شده انگلیسی باقی می‌ماند */
export function optionLabel(lang: Lang, v: unknown): string {
  const s = String(v ?? '')
  if (lang !== 'fa' || !s) return s
  return VALUE_FA[s] || s
}

export function groupLabel(lang: Lang, g: string): string {
  if (lang === 'fa') return GROUP_FA[g] || g
  return ({ core: 'Core', media: 'Media & Music', business: 'Business', ops: 'Operations' })[g] || g
}

export function weightLabel(lang: Lang, k: string): string {
  return lang === 'fa' ? (WEIGHT_FA[k] || k) : (WEIGHT_EN[k] || k)
}

export function bandLabel(lang: Lang, b: string): string {
  return lang === 'fa' ? (BAND_FA[b] || b) : (BAND_EN[b] || b)
}

export function cloudError(lang: Lang, code: string): string {
  const p = CLOUD_ERR[code]
  return p ? p[lang] : code
}

export interface T {
  lang: Lang
  rtl: boolean
  t: (key: string, vars?: Record<string, string | number>) => string
  m: (m: Pick<ModuleDef, 'label' | 'labelFa'>) => string
  f: (f: Pick<FieldDef, 'label' | 'labelFa'>) => string
  o: (v: unknown) => string
  g: (g: string) => string
  w: (k: string) => string
  band: (b: string) => string
}

/** هوک اصلی ترجمه — در همه‌ی کامپوننت‌ها استفاده می‌شود */
export function useT(): T {
  const lang = useApp(s => s.data.settings.lang) ?? 'fa'
  const t = useCallback((key: string, vars?: Record<string, string | number>) => tr(lang, key, vars), [lang])
  const m = useCallback((mod: Pick<ModuleDef, 'label' | 'labelFa'>) => moduleLabel(lang, mod), [lang])
  const f = useCallback((fd: Pick<FieldDef, 'label' | 'labelFa'>) => fieldLabel(lang, fd), [lang])
  const o = useCallback((v: unknown) => optionLabel(lang, v), [lang])
  const g = useCallback((gr: string) => groupLabel(lang, gr), [lang])
  const w = useCallback((k: string) => weightLabel(lang, k), [lang])
  const band = useCallback((b: string) => bandLabel(lang, b), [lang])
  return { lang, rtl: lang === 'fa', t, m, f, o, g, w, band }
}
