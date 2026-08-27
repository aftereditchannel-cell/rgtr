import { seedData } from '../src/domain/seed'
import { scoreProjects, DEFAULT_WEIGHTS, BAND_META } from '../src/domain/scoring'
import { buildFocus } from '../src/domain/focus'
import { overview, monthlyFinance, countBy, projectPnL } from '../src/domain/analytics'
import { migrate, validateBackup } from '../src/lib/migrate'
import { CORE_MODULES } from '../src/domain/schema'

const d = seedData()
console.log('modules:', d.modules.length, '| records:', Object.values(d.records).reduce((n,r)=>n+r.length,0))

// every module has an array
for (const m of d.modules) if (!Array.isArray(d.records[m.key])) throw new Error('missing records for ' + m.key)

// every ref field points at an existing module
for (const m of CORE_MODULES) for (const f of m.fields)
  if (f.type === 'ref' && !CORE_MODULES.some(x => x.key === f.refModule)) throw new Error(`${m.key}.${f.key} -> bad ref ${f.refModule}`)

// every ref VALUE resolves
let refs = 0, broken = 0
for (const m of d.modules) for (const row of d.records[m.key]) for (const f of m.fields) {
  if (f.type !== 'ref') continue
  const v = (row as any)[f.key]; if (!v) continue
  refs++
  if (!(d.records[f.refModule!] ?? []).some(r => r.id === v)) { broken++; console.log('BROKEN REF', m.key, row.id, f.key, v) }
}
console.log('refs resolved:', refs - broken, '/', refs)

// select values must be legal options
let bad = 0
for (const m of d.modules) for (const row of d.records[m.key]) for (const f of m.fields) {
  if (f.type !== 'select' || !f.options) continue
  const v = (row as any)[f.key]
  if (v && !f.options.includes(v)) { bad++; console.log('BAD OPTION', m.key, f.key, JSON.stringify(v)) }
}
console.log('bad select values:', bad)

const scored = scoreProjects(d.records.projects as any, DEFAULT_WEIGHTS)
console.log('\nDECISION:')
for (const s of scored) console.log(' ', BAND_META[s.band].icon, s.score.toString().padStart(3), s.band.padEnd(6), s.name)
if (scored.some(s => s.score < 0 || s.score > 100)) throw new Error('score out of range')

const { focus, later } = buildFocus(d.records.tasks as any, d.records.projects as any, scored, 3)
console.log('\nFOCUS:'); focus.forEach(f => console.log('  •', (f.task as any).title, '—', f.why, f.overdue ? '[OVERDUE]' : ''))
console.log('later:', later.length)

const o = overview(d)
console.log('\nOVERVIEW: income', o.income, 'expense', o.expense, 'profit', o.profit, 'pending', o.pending, 'reach', o.reach)
console.log('months:', monthlyFinance(d, 6).map(m => m.label).join(' '))
console.log('tasks by status:', countBy(d.records.tasks as any, 'status').map(x=>`${x.label}:${x.value}`).join(' '))
console.log('pnl:', projectPnL(d).map(p => `${p.name}=${p.profit}`).join(' | '))

// round trip
const back = migrate(JSON.parse(JSON.stringify(d)))
console.log('\nmigrate roundtrip modules:', back.modules.length, 'valid:', validateBackup(back))
const empty = migrate({})
console.log('migrate({}) modules:', empty.modules.length, 'weights ok:', Object.keys(empty.settings.weights).length)

console.log('\n✅ ALL SMOKE CHECKS PASSED')
