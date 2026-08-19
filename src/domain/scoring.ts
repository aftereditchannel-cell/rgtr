/**
 * Decision Center — امتیازدهی پروژه‌ها.
 * بدون هیچ وابستگی به React، تا در آینده قابل انتقال به بک‌اند باشد.
 */
import type { Entity } from '../store/types'

export interface Weights {
  potentialRevenue: number
  currentRevenue: number
  difficulty: number      // منفی
  timeRequired: number    // منفی
  cost: number            // منفی
  risk: number            // منفی
  urgency: number
  strategic: number
}

export const DEFAULT_WEIGHTS: Weights = {
  potentialRevenue: 25,
  currentRevenue: 15,
  difficulty: 10,
  timeRequired: 8,
  cost: 7,
  risk: 10,
  urgency: 15,
  strategic: 20,
}

export type Band = 'HIGH' | 'MEDIUM' | 'LOW'

export interface Scored {
  id: string
  name: string
  score: number
  band: Band
  parts: { key: keyof Weights; label: string; value: number; contribution: number; negative: boolean }[]
  /** English fallback sentence (used by CLI/scripts). UI should use reasonTop/reasonDrag. */
  reason: string
  /** weight key of the biggest positive driver */
  reasonTop: keyof Weights | null
  /** weight key of the biggest drag, only when it costs more than 2 points */
  reasonDrag: keyof Weights | null
}

const n1to5 = (v: unknown) => {
  const x = Number(v)
  if (!Number.isFinite(x) || x <= 0) return 3
  return Math.min(5, Math.max(1, x))
}

/** درآمد فعلی نسبت به بیشترین درآمد → مقیاس ۱..۵ */
function revenueScale(rev: number, maxRev: number): number {
  if (maxRev <= 0) return 1
  return 1 + 4 * Math.sqrt(Math.max(0, rev) / maxRev)
}

/** هزینه نسبت به بیشترین هزینه → مقیاس ۱..۵ (هرچه بیشتر، بدتر) */
function costScale(cost: number, maxCost: number): number {
  if (maxCost <= 0) return 1
  return 1 + 4 * Math.sqrt(Math.max(0, cost) / maxCost)
}

export function scoreProjects(projects: Entity[], w: Weights = DEFAULT_WEIGHTS): Scored[] {
  const active = projects.filter(p => p.status !== 'Archived')
  const maxRev = Math.max(0, ...active.map(p => Number(p.revenue) || 0))
  const maxCost = Math.max(0, ...active.map(p => Number(p.cost ?? p.budget) || 0))

  const out = active.map(p => {
    const pot = n1to5(p.potentialRevenue)
    const cur = revenueScale(Number(p.revenue) || 0, maxRev)
    const dif = n1to5(p.difficulty)
    const tim = n1to5(p.timeRequired)
    const cos = costScale(Number(p.cost ?? p.budget) || 0, maxCost)
    const rsk = n1to5(p.risk)
    const urg = n1to5(p.urgency)
    const str = n1to5(p.strategic)

    const parts: Scored['parts'] = [
      { key: 'potentialRevenue', label: 'Potential Revenue', value: pot, contribution: (pot / 5) * w.potentialRevenue, negative: false },
      { key: 'currentRevenue', label: 'Current Revenue', value: cur, contribution: (cur / 5) * w.currentRevenue, negative: false },
      { key: 'urgency', label: 'Urgency', value: urg, contribution: (urg / 5) * w.urgency, negative: false },
      { key: 'strategic', label: 'Strategic Value', value: str, contribution: (str / 5) * w.strategic, negative: false },
      { key: 'difficulty', label: 'Difficulty', value: dif, contribution: -((dif - 1) / 4) * w.difficulty, negative: true },
      { key: 'timeRequired', label: 'Time Required', value: tim, contribution: -((tim - 1) / 4) * w.timeRequired, negative: true },
      { key: 'cost', label: 'Cost', value: cos, contribution: -((cos - 1) / 4) * w.cost, negative: true },
      { key: 'risk', label: 'Risk', value: rsk, contribution: -((rsk - 1) / 4) * w.risk, negative: true },
    ]

    const raw = parts.reduce((s, x) => s + x.contribution, 0)
    const maxPos = w.potentialRevenue + w.currentRevenue + w.urgency + w.strategic
    const score = Math.round(Math.max(0, Math.min(100, (raw / maxPos) * 100)))

    const top = [...parts].filter(x => !x.negative).sort((a, b) => b.contribution - a.contribution)[0]
    const drag = [...parts].filter(x => x.negative).sort((a, b) => a.contribution - b.contribution)[0]
    const dragging = drag && drag.contribution < -2 ? drag : null
    const reason = `driven by ${top?.label ?? '—'}${dragging ? `, held back by ${dragging.label}` : ''}`

    return {
      id: String(p.id), name: String(p[/* title */ 'name'] ?? 'Untitled'),
      score, band: (score >= 62 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW') as Band,
      parts, reason, reasonTop: top?.key ?? null, reasonDrag: dragging?.key ?? null,
    }
  })

  return out.sort((a, b) => b.score - a.score)
}

export const BAND_META: Record<Band, { icon: string; label: string; color: string; bg: string }> = {
  HIGH: { icon: '🔥', label: 'HIGH PRIORITY', color: '#f97316', bg: 'rgba(249,115,22,.12)' },
  MEDIUM: { icon: '🟡', label: 'MEDIUM PRIORITY', color: '#eab308', bg: 'rgba(234,179,8,.1)' },
  LOW: { icon: '⚪', label: 'LOW PRIORITY', color: '#94a3b8', bg: 'rgba(148,163,184,.09)' },
}
