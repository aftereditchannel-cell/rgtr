import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/useApp'
import { scoreProjects, BAND_META, DEFAULT_WEIGHTS } from '../domain/scoring'
import type { Weights } from '../domain/scoring'
import { Card, SectionTitle, Button, Badge, Icon, Progress, Empty } from '../components/ui/Primitives'
import { useFmt } from '../lib/useFmt'
import { useT } from '../i18n'
import { RecordForm } from '../components/views/RecordForm'
import type { Entity } from '../store/types'

/** ترتیب نمایش وزن‌ها؛ برچسب از دیکشنری دامنه می‌آید */
const W_ORDER: (keyof Weights)[] = [
  'potentialRevenue', 'currentRevenue', 'urgency', 'strategic',
  'difficulty', 'timeRequired', 'cost', 'risk',
]
const W_NEGATIVE = new Set<keyof Weights>(['difficulty', 'timeRequired', 'cost', 'risk'])

export function DecisionCenter() {
  const data = useApp(s => s.data)
  const setSettings = useApp(s => s.setSettings)
  const nav = useNavigate()
  const [openWeights, setOpenWeights] = useState(false)
  const [editing, setEditing] = useState<Entity | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fmt = useFmt()
  const { t, w: wl, band: bandLabel } = useT()
  const cur = data.settings.currency
  const w = data.settings.weights
  const projects = data.records.projects ?? []
  const scored = useMemo(() => scoreProjects(projects, w), [projects, w])
  const projModule = data.modules.find(m => m.key === 'projects')!

  const bands = { HIGH: scored.filter(s => s.band === 'HIGH'), MEDIUM: scored.filter(s => s.band === 'MEDIUM'), LOW: scored.filter(s => s.band === 'LOW') }
  const setW = (k: keyof Weights, v: number) => setSettings({ weights: { ...w, [k]: v } })

  /** جمله‌ی «چرا این امتیاز» به زبان جاری */
  const reasonOf = (s: { reasonTop: keyof Weights | null; reasonDrag: keyof Weights | null }) => {
    const top = s.reasonTop ? wl(s.reasonTop) : '—'
    return s.reasonDrag
      ? t('dec.reasonBoth', { top, drag: wl(s.reasonDrag) })
      : t('dec.reasonTop', { top })
  }

  return (
    <div className="anim space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight">{t('dec.title')}</h1>
          <p className="text-[12px] text-[var(--color-dim2)] mt-1 max-w-xl">{t('dec.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon="SlidersHorizontal" onClick={() => setOpenWeights(v => !v)}>{t('dec.weights')}</Button>
          <Button size="sm" variant="outline" icon="FolderKanban" onClick={() => nav('/m/projects')}>{t('dec.projects')}</Button>
        </div>
      </div>

      {openWeights && (
        <Card className="anim">
          <SectionTitle icon="SlidersHorizontal" right={
            <Button size="sm" variant="ghost" icon="RotateCcw" onClick={() => setSettings({ weights: DEFAULT_WEIGHTS })}>{t('dec.reset')}</Button>
          }>{t('dec.tuneWeights')}</SectionTitle>
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {W_ORDER.map(k => (
              <div key={k}>
                <div className="flex justify-between text-[11.5px] mb-1">
                  <span className="text-[var(--color-dim)]">
                    {W_NEGATIVE.has(k) ? t('dec.negSuffix', { n: wl(k) }) : wl(k)}
                  </span>
                  <span className="nums text-[var(--color-tx)]">{fmt.dg(w[k])}</span>
                </div>
                <input type="range" min={0} max={40} value={w[k]} onChange={e => setW(k, Number(e.target.value))}
                  className="w-full accent-[var(--color-acc)]" />
              </div>
            ))}
          </div>
          <p className="text-[10.5px] text-[var(--color-dim2)] mt-3">
            {t('dec.weightsNote')}
          </p>
        </Card>
      )}

      {!scored.length ? (
        <Empty icon="Target" title={t('dec.empty')}
          action={<Button size="sm" variant="primary" icon="Plus" onClick={() => nav('/m/projects')}>{t('dec.newProject')}</Button>} />
      ) : (
        <>
          {/* banner: what to work on */}
          <Card className="relative overflow-hidden grid-bg">
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'radial-gradient(560px 180px at 8% -20%, rgba(249,115,22,.12), transparent)' }} />
            <div className="relative flex items-center gap-4 flex-wrap">
              <span className="text-[34px] leading-none">{BAND_META[scored[0].band].icon}</span>
              <div className="flex-1 min-w-[200px]">
                <div className="text-[10px] uppercase tracking-[.15em] text-[var(--color-dim2)] mb-1">{t('dec.workOnThis')}</div>
                <div className="text-[20px] font-semibold leading-tight">{scored[0].name}</div>
                <div className="text-[12px] text-[var(--color-dim)] mt-1">{reasonOf(scored[0])}</div>
              </div>
              <div className="text-end">
                <div className="text-[30px] font-bold nums leading-none" style={{ color: BAND_META[scored[0].band].color }}>{fmt.dg(scored[0].score)}</div>
                <div className="text-[10px] text-[var(--color-dim2)] mt-1">{t('dec.scoreOf100')}</div>
              </div>
            </div>
          </Card>

          {/* bands */}
          {(['HIGH', 'MEDIUM', 'LOW'] as const).map(band => {
            const list = bands[band]
            if (!list.length) return null
            const meta = BAND_META[band]
            return (
              <div key={band}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-[13px]">{meta.icon}</span>
                  <h2 className="text-[11.5px] font-semibold tracking-[.13em] uppercase" style={{ color: meta.color }}>{bandLabel(band)}</h2>
                  <span className="text-[10.5px] text-[var(--color-dim2)] nums">{fmt.dg(list.length)}</span>
                  <div className="flex-1 h-px" style={{ background: meta.color + '20' }} />
                </div>
                <div className="space-y-2">
                  {list.map(s => {
                    const p = projects.find(x => x.id === s.id)!
                    const isOpen = expanded === s.id
                    return (
                      <Card key={s.id} pad={false} className="overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[.02] transition-colors"
                          onClick={() => setExpanded(isOpen ? null : s.id)}>
                          <div className="w-9 h-9 rounded-lg grid place-items-center shrink-0 text-[13px] font-bold nums"
                            style={{ background: meta.bg, color: meta.color }}>{fmt.dg(s.score)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[14px] font-medium">{s.name}</span>
                              <Badge value={String(p.status ?? '')} />
                              {p.category ? <span className="text-[10.5px] text-[var(--color-dim2)]">{String(p.category)}</span> : null}
                            </div>
                            <div className="text-[11px] text-[var(--color-dim2)] mt-0.5">{reasonOf(s)}</div>
                          </div>
                          <div className="hidden md:flex items-center gap-4 shrink-0">
                            <div className="text-end">
                              <div className="text-[11.5px] nums text-emerald-400">{fmt.money(p.revenue, cur)}</div>
                              <div className="text-[9.5px] text-[var(--color-dim2)]">{t('dec.revenue')}</div>
                            </div>
                            <div className="w-20"><Progress value={Number(p.progress) || 0} showLabel={false} height={4} /></div>
                          </div>
                          <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-[var(--color-dim2)] shrink-0" />
                        </div>

                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 border-t border-[var(--color-line)] anim">
                            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 mt-3">
                              {s.parts.map(part => (
                                <div key={part.key}>
                                  <div className="flex justify-between text-[11px] mb-1">
                                    <span className="text-[var(--color-dim)]">{wl(part.key)}</span>
                                    <span className="nums ltr" style={{ color: part.negative ? '#ef4444' : '#22c55e' }}>
                                      {part.contribution >= 0 ? '+' : '−'}{fmt.dg(Math.abs(part.contribution).toFixed(1))}
                                    </span>
                                  </div>
                                  <div className="h-1 rounded-full bg-white/[.05] overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500"
                                      style={{
                                        width: `${Math.min(100, (Math.abs(part.contribution) / 25) * 100)}%`,
                                        background: part.negative ? '#ef4444' : '#22c55e',
                                      }} />
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button size="sm" variant="outline" icon="Pencil" onClick={() => setEditing(p)}>{t('dec.editInputs')}</Button>
                              <Button size="sm" variant="ghost" icon="CheckSquare" onClick={() => nav('/m/tasks')}>{t('dec.projectTasks')}</Button>
                            </div>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}

          <Card>
            <SectionTitle icon="Info">{t('dec.howTo')}</SectionTitle>
            <ul className="text-[12px] text-[var(--color-dim)] space-y-1.5 leading-relaxed">
              <li>🔥 <b className="text-[var(--color-tx)]">{bandLabel('HIGH')}</b> — {t('dec.howHigh')}</li>
              <li>🟡 <b className="text-[var(--color-tx)]">{bandLabel('MEDIUM')}</b> — {t('dec.howMedium')}</li>
              <li>⚪ <b className="text-[var(--color-tx)]">{bandLabel('LOW')}</b> — {t('dec.howLow')}</li>
              <li className="pt-1.5 text-[var(--color-dim2)]">{t('dec.howNote')}</li>
            </ul>
          </Card>
        </>
      )}

      <RecordForm module={projModule} row={editing} open={!!editing} onClose={() => setEditing(null)} />
    </div>
  )
}
