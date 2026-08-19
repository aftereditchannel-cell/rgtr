import type { AppData, Entity } from '../store/types'
import { daysUntil, todayISO } from '../lib/format'

export interface Overview {
  activeProjects: number
  totalProjects: number
  tasksToday: number
  tasksOverdue: number
  tasksDoing: number
  tasksDone7d: number
  growingProjects: number
  income: number
  expense: number
  profit: number
  pending: number
  activeClients: number
  wonClients: number
  pipelineValue: number
  artists: number
  signedArtists: number
  mediaCount: number
  reach: number
  automationsActive: number
  automationsError: number
  agentsActive: number
  ideasInbox: number
  contentScheduled: number
}

const R = (d: AppData, k: string): Entity[] => d.records[k] ?? []

export function overview(d: AppData): Overview {
  const projects = R(d, 'projects')
  const tasks = R(d, 'tasks')
  const fin = R(d, 'finance')
  const clients = R(d, 'clients')
  const artists = R(d, 'artists')
  const media = R(d, 'media')
  const social = R(d, 'social')
  const autos = R(d, 'automations')
  const agents = R(d, 'agents')
  const ideas = R(d, 'ideas')
  const content = R(d, 'content')
  const today = todayISO()

  const income = fin.filter(x => x.kind === 'Income' && x.status === 'Paid').reduce((s, x) => s + (Number(x.amount) || 0), 0)
  const expense = fin.filter(x => x.kind === 'Expense').reduce((s, x) => s + (Number(x.amount) || 0), 0)
  const pending = fin.filter(x => x.kind === 'Income' && x.status !== 'Paid').reduce((s, x) => s + (Number(x.amount) || 0), 0)

  return {
    activeProjects: projects.filter(p => p.status === 'Active').length,
    totalProjects: projects.filter(p => p.status !== 'Archived').length,
    tasksToday: tasks.filter(t => t.status !== 'Done' && String(t.deadline ?? '').slice(0, 10) === today).length,
    tasksOverdue: tasks.filter(t => { const n = daysUntil(t.deadline as string); return t.status !== 'Done' && n !== null && n < 0 }).length,
    tasksDoing: tasks.filter(t => t.status === 'Doing').length,
    tasksDone7d: tasks.filter(t => t.status === 'Done' && Date.parse(String(t.updatedAt)) > Date.now() - 7 * 864e5).length,
    growingProjects: projects.filter(p => (Number(p.progress) || 0) > 0 && (Number(p.progress) || 0) < 100 && p.status === 'Active').length,
    income, expense, profit: income - expense, pending,
    activeClients: clients.filter(c => c.status === 'Won' || c.status === 'Negotiation').length,
    wonClients: clients.filter(c => c.status === 'Won').length,
    pipelineValue: clients.filter(c => c.status !== 'Lost' && c.status !== 'Won').reduce((s, c) => s + (Number(c.value) || 0), 0),
    artists: artists.length,
    signedArtists: artists.filter(a => a.status === 'Signed' || a.status === 'Collaborating').length,
    mediaCount: media.length,
    reach: media.reduce((s, m) => s + (Number(m.followers) || 0), 0) + social.reduce((s, m) => s + (Number(m.followers) || 0), 0),
    automationsActive: autos.filter(a => a.status === 'Active').length,
    automationsError: autos.filter(a => a.status === 'Error').length,
    agentsActive: agents.filter(a => a.status === 'Active').length,
    ideasInbox: ideas.filter(i => i.status === 'Inbox').length,
    contentScheduled: content.filter(c => c.status === 'Scheduled').length,
  }
}

/** درآمد/هزینه ماهانه برای نمودار */
export function monthlyFinance(d: AppData, months = 6) {
  const now = new Date()
  const out: { label: string; income: number; expense: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`
    const rows = R(d, 'finance').filter(x => String(x.date ?? '').slice(0, 7) === key)
    out.push({
      label: dt.toLocaleString('en', { month: 'short' }),
      income: rows.filter(x => x.kind === 'Income').reduce((s, x) => s + (Number(x.amount) || 0), 0),
      expense: rows.filter(x => x.kind === 'Expense').reduce((s, x) => s + (Number(x.amount) || 0), 0),
    })
  }
  return out
}

export function countBy(rows: Entity[], key: string): { label: string; value: number }[] {
  const m = new Map<string, number>()
  for (const r of rows) {
    const k = String(r[key] ?? '—') || '—'
    m.set(k, (m.get(k) ?? 0) + 1)
  }
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)
}

/** درآمد و هزینه به تفکیک پروژه */
export function projectPnL(d: AppData) {
  const projects = R(d, 'projects')
  const fin = R(d, 'finance')
  return projects.map(p => {
    const rows = fin.filter(x => x.project === p.id)
    const inc = rows.filter(x => x.kind === 'Income').reduce((s, x) => s + (Number(x.amount) || 0), 0) || Number(p.revenue) || 0
    const exp = rows.filter(x => x.kind === 'Expense').reduce((s, x) => s + (Number(x.amount) || 0), 0) || Number(p.cost) || 0
    return { id: String(p.id), name: String(p.name), income: inc, expense: exp, profit: inc - exp }
  }).sort((a, b) => b.profit - a.profit)
}
