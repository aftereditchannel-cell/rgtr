/**
 * موتور Today's Focus — مهم‌ترین بخش سیستم.
 * از بین همه‌ی کارها، فقط N کار را انتخاب می‌کند. بقیه Later هستند.
 */
import type { Entity } from '../store/types'
import { daysUntil } from '../lib/format'
import type { Scored } from './scoring'

const PRIO_W: Record<string, number> = { Urgent: 40, High: 28, Medium: 14, Low: 5 }
const STATUS_W: Record<string, number> = { Doing: 22, Review: 16, 'To Do': 10, Backlog: 0, Done: -999 }

/** دلیل انتخاب — کلید ترجمه + عدد اختیاری، تا UI بتواند به هر زبانی نمایش دهد */
export interface WhyTag { k: string; n?: number }

export interface FocusItem {
  task: Entity
  score: number
  projectName: string
  /** جمله‌ی انگلیسی (برای اسکریپت‌ها و تست‌ها) */
  why: string
  /** نشانه‌های قابل ترجمه — UI باید از این استفاده کند */
  whyTags: WhyTag[]
  overdue: boolean
}

const WHY_EN: Record<string, (n?: number) => string> = {
  overdue: n => `${n}d overdue`,
  dueToday: () => 'due today',
  dueTomorrow: () => 'due tomorrow',
  dueInDays: n => `due in ${n}d`,
  urgent: () => 'urgent',
  high: () => 'high',
  inProgress: () => 'in progress',
  highValue: () => 'high-value project',
  queued: () => 'queued',
}

export function buildFocus(
  tasks: Entity[],
  projects: Entity[],
  scored: Scored[],
  count = 3,
): { focus: FocusItem[]; later: FocusItem[] } {
  const projName = new Map(projects.map(p => [String(p.id), String(p.name ?? '')]))
  const projScore = new Map(scored.map(s => [s.id, s.score]))

  const items: FocusItem[] = tasks
    .filter(t => t.status !== 'Done')
    .map(t => {
      const d = daysUntil(t.deadline as string)
      let s = 0
      const why: WhyTag[] = []

      s += PRIO_W[String(t.priority)] ?? 10
      if (t.priority === 'Urgent') why.push({ k: 'urgent' })
      else if (t.priority === 'High') why.push({ k: 'high' })

      s += STATUS_W[String(t.status)] ?? 0
      if (t.status === 'Doing') why.push({ k: 'inProgress' })

      if (d !== null) {
        if (d < 0) { s += 45 + Math.min(25, -d * 3); why.unshift({ k: 'overdue', n: -d }) }
        else if (d === 0) { s += 40; why.unshift({ k: 'dueToday' }) }
        else if (d === 1) { s += 26; why.unshift({ k: 'dueTomorrow' }) }
        else if (d <= 3) { s += 16; why.unshift({ k: 'dueInDays', n: d }) }
        else if (d <= 7) s += 7
      }

      // اثر اولویت پروژه (Decision Center) روی کار
      const ps = projScore.get(String(t.project))
      if (ps !== undefined) {
        s += (ps / 100) * 22
        if (ps >= 62) why.push({ k: 'highValue' })
      }

      const tags = why.slice(0, 2)
      if (!tags.length) tags.push({ k: 'queued' })

      return {
        task: t, score: Math.round(s),
        projectName: projName.get(String(t.project)) ?? '',
        why: tags.map(x => WHY_EN[x.k]?.(x.n) ?? x.k).join(' · '),
        whyTags: tags,
        overdue: d !== null && d < 0,
      }
    })
    .sort((a, b) => b.score - a.score)

  return { focus: items.slice(0, count), later: items.slice(count) }
}
