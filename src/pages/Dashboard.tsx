import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../store/useApp'
import type { Entity } from '../store/types'
import { overview } from '../domain/analytics'
import { scoreProjects, BAND_META } from '../domain/scoring'
import { buildFocus } from '../domain/focus'
import { Card, SectionTitle, Stat, Button, Badge, Icon, Progress, Empty, TextInput } from '../components/ui/Primitives'
import { todayISO } from '../lib/format'
import { useFmt } from '../lib/useFmt'
import { useT } from '../i18n'
import { RecordForm } from '../components/views/RecordForm'

export function Dashboard() {
  const data = useApp(s => s.data)
  const update = useApp(s => s.update)
  const add = useApp(s => s.add)
  const nav = useNavigate()
  const [quick, setQuick] = useState('')
  const [editing, setEditing] = useState<Entity | null>(null)
  const [showLater, setShowLater] = useState(false)

  const fmt = useFmt()
  const { t, w: wl, lang } = useT()
  /** جمله‌ی دلیل امتیاز، ترجمه‌شده */
  const whyOf = (tags: { k: string; n?: number }[]) =>
    tags.map(x => t('why.' + x.k, x.n !== undefined ? { n: fmt.dg(x.n) } : undefined)).join(' · ')
  const reasonOf = (x: { reasonTop: string | null; reasonDrag: string | null }) =>
    x.reasonDrag
      ? t('dec.reasonBoth', { top: x.reasonTop ? wl(x.reasonTop) : '—', drag: wl(x.reasonDrag) })
      : t('dec.reasonTop', { top: x.reasonTop ? wl(x.reasonTop) : '—' })
  const cur = data.settings.currency
  const o = useMemo(() => overview(data), [data])
  const scored = useMemo(() => scoreProjects(data.records.projects ?? [], data.settings.weights), [data])
  const { focus, later } = useMemo(
    () => buildFocus(data.records.tasks ?? [], data.records.projects ?? [], scored, data.settings.focusCount),
    [data, scored],
  )

  const taskModule = data.modules.find(m => m.key === 'tasks')!
  const hour = new Date().getHours()
  const greet = hour < 5 ? t('dash.night') : hour < 12 ? t('dash.morning') : hour < 18 ? t('dash.noon') : t('dash.evening')
  const topProject = scored[0]

  const addQuick = () => {
    const t = quick.trim()
    if (!t) return
    add('tasks', { title: t, status: 'To Do', priority: 'Medium', deadline: todayISO() })
    setQuick('')
  }

  const complete = (id: string) => update('tasks', id, { status: 'Done' })

  return (
    <div className="anim space-y-5">
      {/* header */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[23px] font-semibold tracking-tight leading-tight">
            {greet}{data.settings.ownerName ? `${lang === 'fa' ? '، ' : ', '}${data.settings.ownerName}` : ''}
          </h1>
          <p className="text-[12.5px] text-[var(--color-dim2)] mt-1">
            {fmt.dateLong(todayISO())}
            {' · '}{fmt.dg(o.activeProjects)} {t('dash.activeProjects')}
            {o.tasksOverdue > 0 && <span className="text-red-400"> · {t('dash.sigOverdue', { n: fmt.dg(o.tasksOverdue) })}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" icon="Search" variant="ghost" title={t('palette.placeholder')}
            onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }); window.dispatchEvent(e) }}>
            <span className="ltr keep-tracking text-[11px]">Ctrl K</span>
          </Button>
          <Button size="sm" variant="primary" icon="Target" onClick={() => nav('/decision')}>{t('dash.decisionCenter')}</Button>
        </div>
      </div>

      {/* ===== TODAY'S FOCUS — قلب سیستم ===== */}
      <Card pad={false} className="overflow-hidden relative grid-bg">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(650px 200px at 12% -10%, var(--color-acc)18, transparent)' }} />
        <div className="relative px-5 pt-4 pb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-acc)] pulse" />
              <h2 className="text-[12px] font-semibold tracking-[.15em] uppercase">{t('dash.focusTitle')}</h2>
              <span className="text-[10.5px] text-[var(--color-dim2)]">{t('dash.focusHint')}</span>
            </div>
            <span className="text-[10.5px] text-[var(--color-dim2)] nums hidden sm:block ltr">{fmt.dg(focus.length)} / {fmt.dg(focus.length + later.length)}</span>
          </div>

          {focus.length === 0 ? (
            <Empty icon="PartyPopper" title={t('dash.focusEmpty')} hint={t('dash.focusEmptyHint')}
              action={<Button size="sm" variant="primary" icon="Plus" onClick={() => nav('/m/tasks')}>{t('dash.newTask')}</Button>} />
          ) : (
            <div className="space-y-2">
              {focus.map((f, i) => (
                <div key={f.task.id}
                  className="group flex items-center gap-3 rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)]/80 backdrop-blur px-3.5 py-3 hover:border-[var(--color-line2)] transition-all">
                  <button onClick={() => complete(f.task.id)} title={t('dash.done')}
                    className="w-5 h-5 rounded-full border-2 border-[var(--color-line2)] hover:border-emerald-500 hover:bg-emerald-500/15 transition-all shrink-0 grid place-items-center">
                    <Icon name="Check" size={11} className="opacity-0 group-hover:opacity-60 text-emerald-400" />
                  </button>
                  <span className="text-[15px] font-semibold text-[var(--color-dim2)] nums w-4 shrink-0">{fmt.dg(i + 1)}</span>
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setEditing(f.task)}>
                    <div className="flex items-center gap-2 flex-wrap">
                      {f.projectName && <span className="text-[10.5px] px-1.5 py-[2px] rounded bg-[var(--color-acc)]/15 text-[var(--color-acc)] font-medium">{f.projectName}</span>}
                      <span className="text-[13.5px] font-medium truncate">{String(f.task.title)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10.5px] text-[var(--color-dim2)]">
                      <span className={f.overdue ? 'text-red-400 font-medium' : ''}>{whyOf(f.whyTags)}</span>
                      {Boolean(f.task.estimate) && <span>· {fmt.dg(String(f.task.estimate))} {t('dash.hours')}</span>}
                    </div>
                  </div>
                  <Badge value={String(f.task.priority ?? '')} />
                </div>
              ))}
            </div>
          )}

          {/* quick add */}
          <div className="mt-3 flex gap-2">
            <TextInput value={quick} onChange={e => setQuick(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addQuick()}
              placeholder={t('dash.quickAdd')} className="py-1.5 text-[12.5px]" />
            <Button size="sm" variant="outline" icon="Plus" onClick={addQuick} />
          </div>

          {later.length > 0 && (
            <div className="mt-3">
              <button onClick={() => setShowLater(v => !v)}
                className="text-[11px] text-[var(--color-dim2)] hover:text-[var(--color-dim)] flex items-center gap-1.5 transition-colors">
                <Icon name={showLater ? 'ChevronDown' : 'ChevronRight'} size={12} />
                {t('dash.later')} ({fmt.dg(later.length)})
              </button>
              {showLater && (
                <div className="mt-2 space-y-1">
                  {later.slice(0, 8).map(l => (
                    <div key={l.task.id} onClick={() => setEditing(l.task)}
                      className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/[.03] cursor-pointer text-[12px] opacity-65 hover:opacity-100 transition-all">
                      <span className="w-1 h-1 rounded-full bg-[var(--color-dim2)]" />
                      <span className="flex-1 truncate">{String(l.task.title)}</span>
                      <span className="text-[10.5px] text-[var(--color-dim2)]">{l.projectName || whyOf(l.whyTags)}</span>
                    </div>
                  ))}
                  {later.length > 8 && (
                    <button onClick={() => nav('/m/tasks')} className="text-[11px] text-[var(--color-acc)] hover:underline px-3 pt-1">
                      {t('dash.allTasks')} ({fmt.dg(later.length)})
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ===== KPI grid ===== */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label={t('dash.kpiProjects')} value={fmt.dg(o.activeProjects)} sub={t('dash.kpiFromTotal', { n: fmt.dg(o.totalProjects) })} icon="FolderKanban" onClick={() => nav('/m/projects')} />
        <Stat label={t('dash.kpiTodayOver')} value={<span className="ltr">{fmt.dg(o.tasksToday)}<span className="text-[var(--color-dim2)] text-[15px]"> / </span><span className={o.tasksOverdue ? 'text-red-400' : ''}>{fmt.dg(o.tasksOverdue)}</span></span>}
          sub={t('dash.kpiDoing', { n: fmt.dg(o.tasksDoing) })} icon="CheckSquare" onClick={() => nav('/m/tasks')} />
        <Stat label={t('dash.kpiProfit')} value={fmt.money(o.profit, cur)} sub={t('dash.kpiIncomeExp', { i: fmt.money(o.income, cur), e: fmt.money(o.expense, cur) })}
          icon="TrendingUp" tone={o.profit >= 0 ? '#22c55e' : '#ef4444'} onClick={() => nav('/m/finance')} />
        <Stat label={t('dash.kpiPending')} value={fmt.money(o.pending, cur)} sub={t('dash.kpiClients', { n: fmt.dg(o.activeClients) })} icon="Clock" tone="#f59e0b" onClick={() => nav('/m/finance')} />
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Stat label={t('dash.kpiReach')} value={fmt.num(o.reach)} sub={t('dash.kpiMedia', { n: fmt.dg(o.mediaCount) })} icon="Radio" onClick={() => nav('/m/media')} />
        <Stat label={t('dash.kpiArtists')} value={fmt.dg(o.artists)} sub={t('dash.kpiSigned', { n: fmt.dg(o.signedArtists) })} icon="Mic2" onClick={() => nav('/m/artists')} />
        <Stat label={t('dash.kpiPipeline')} value={fmt.money(o.pipelineValue, cur)} sub={t('dash.kpiWon', { n: fmt.dg(o.wonClients) })} icon="Users" onClick={() => nav('/m/clients')} />
        <Stat label={t('dash.kpiAutomation')} value={<span className="ltr">{fmt.dg(o.automationsActive)}<span className="text-[var(--color-dim2)] text-[15px]"> / </span>{fmt.dg(o.agentsActive)}</span>}
          sub={o.automationsError ? t('dash.kpiErrors', { n: fmt.dg(o.automationsError) }) : t('dash.kpiNoErrors')} icon="Workflow" tone={o.automationsError ? '#ef4444' : undefined}
          onClick={() => nav('/m/automations')} />
      </div>

      {/* ===== priorities + signals ===== */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle icon="Target" right={<Button size="sm" variant="ghost" icon="ArrowRight" onClick={() => nav('/decision')} />}>
            {t('dash.priorities')}
          </SectionTitle>
          {scored.length === 0 ? <Empty icon="FolderPlus" title={t('dash.noProjects')} /> : (
            <div className="space-y-2">
              {scored.slice(0, 5).map(s => {
                const meta = BAND_META[s.band]
                const p = (data.records.projects ?? []).find(x => x.id === s.id)
                return (
                  <div key={s.id} onClick={() => nav('/m/projects')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-[var(--color-line)] hover:border-[var(--color-line2)] hover:bg-white/[.02] cursor-pointer transition-all">
                    <span className="text-[15px] shrink-0">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium truncate">{s.name}</span>
                        <Badge value={String(p?.status ?? '')} />
                      </div>
                      <div className="text-[10.5px] text-[var(--color-dim2)] mt-0.5 truncate">{reasonOf(s)}</div>
                    </div>
                    <div className="w-20 shrink-0 hidden sm:block"><Progress value={Number(p?.progress) || 0} showLabel={false} height={4} /></div>
                    <span className="text-[15px] font-semibold nums shrink-0 w-8 text-end" style={{ color: meta.color }}>{fmt.dg(s.score)}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle icon="Activity">{t('dash.signals')}</SectionTitle>
          <div className="space-y-2.5">
            <Signal ok={o.tasksOverdue === 0} icon="AlertTriangle"
              text={o.tasksOverdue ? t('dash.sigOverdue', { n: fmt.dg(o.tasksOverdue) }) : t('dash.sigNoOverdue')} onClick={() => nav('/m/tasks')} />
            <Signal ok={o.pending === 0} icon="Wallet"
              text={o.pending ? t('dash.sigPending', { v: fmt.money(o.pending, cur) }) : t('dash.sigSettled')} onClick={() => nav('/m/finance')} />
            <Signal ok={o.automationsError === 0} icon="Workflow"
              text={o.automationsError ? t('dash.sigAutoErr', { n: fmt.dg(o.automationsError) }) : t('dash.sigAutoOk')} onClick={() => nav('/m/automations')} />
            <Signal ok={o.ideasInbox < 5} icon="Lightbulb"
              text={t('dash.sigIdeas', { n: fmt.dg(o.ideasInbox) })} onClick={() => nav('/m/ideas')} />
            <Signal ok={o.contentScheduled > 0} icon="CalendarRange"
              text={t('dash.sigContent', { n: fmt.dg(o.contentScheduled) })} onClick={() => nav('/m/content')} />
            <Signal ok icon="CheckCircle2" text={t('dash.sigDone7d', { n: fmt.dg(o.tasksDone7d) })} onClick={() => nav('/m/tasks')} />
          </div>

          {topProject && (
            <div className="mt-4 pt-3.5 border-t border-[var(--color-line)]">
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-dim2)] mb-1.5">{t('dash.topPriority')}</div>
              <div className="text-[14px] font-semibold">{topProject.name}</div>
              <div className="text-[11px] text-[var(--color-dim2)] mt-0.5">{reasonOf(topProject)}</div>
            </div>
          )}
        </Card>
      </div>

      {/* ===== upcoming content ===== */}
      <Card>
        <SectionTitle icon="CalendarRange" right={<Button size="sm" variant="ghost" icon="ArrowRight" onClick={() => nav('/m/content')} />}>
          {t('dash.upcoming')}
        </SectionTitle>
        {(() => {
          const items = [...(data.records.content ?? [])]
            .filter(c => c.status !== 'Published' && c.publishDate)
            .sort((a, b) => String(a.publishDate).localeCompare(String(b.publishDate)))
            .slice(0, 5)
          if (!items.length) return <Empty icon="CalendarPlus" title={t('dash.nothingSoon')} />
          return (
            <div className="space-y-1.5">
              {items.map(c => (
                <div key={c.id} onClick={() => nav('/m/content')}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[.03] cursor-pointer transition-colors">
                  <Icon name="Play" size={11} className="text-[var(--color-dim2)] shrink-0" />
                  <span className="text-[12.5px] flex-1 truncate">{String(c.title)}</span>
                  <span className="text-[10.5px] text-[var(--color-dim2)] hidden sm:block">{String(c.platform)} · {String(c.type)}</span>
                  <Badge value={String(c.status)} />
                  <span className="text-[10.5px] text-[var(--color-dim2)] nums w-16 text-end">{fmt.relDay(String(c.publishDate))}</span>
                </div>
              ))}
            </div>
          )
        })()}
      </Card>

      <RecordForm module={taskModule} row={editing} open={!!editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function Signal({ ok, icon, text, onClick }: { ok: boolean; icon: string; text: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 text-start group">
      <span className="w-6 h-6 rounded-md grid place-items-center shrink-0 transition-colors"
        style={{ background: ok ? 'rgba(34,197,94,.1)' : 'rgba(245,158,11,.1)' }}>
        <Icon name={icon} size={12} style={{ color: ok ? '#22c55e' : '#f59e0b' }} />
      </span>
      <span className="text-[12px] text-[var(--color-dim)] group-hover:text-[var(--color-tx)] transition-colors flex-1">{text}</span>
    </button>
  )
}
