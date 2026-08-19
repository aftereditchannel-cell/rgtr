import { useMemo } from 'react'
import { useApp } from '../store/useApp'
import { overview, monthlyFinance, countBy, projectPnL } from '../domain/analytics'
import { Card, SectionTitle, Stat, Empty, Icon } from '../components/ui/Primitives'
import { BarChart, Donut, HBar } from '../components/ui/Charts'
import { useFmt } from '../lib/useFmt'
import { useT } from '../i18n'

export function Analytics() {
  const data = useApp(s => s.data)
  const fmt = useFmt()
  const { t, m: ml } = useT()
  const cur = data.settings.currency

  const o = useMemo(() => overview(data), [data])
  const fin = useMemo(() => monthlyFinance(data, 6), [data])
  const pnl = useMemo(() => projectPnL(data), [data])
  const taskByStatus = useMemo(() => countBy(data.records.tasks ?? [], 'status'), [data])
  const contentByPlatform = useMemo(() => countBy(data.records.content ?? [], 'platform'), [data])
  const clientsByStage = useMemo(() => countBy(data.records.clients ?? [], 'status'), [data])
  const artistsByStatus = useMemo(() => countBy(data.records.artists ?? [], 'status'), [data])

  const media = [...(data.records.media ?? []), ...(data.records.social ?? [])]
    .map(m => ({ label: String(m.name ?? m.account ?? ''), value: Number(m.followers) || 0 }))
    .sort((a, b) => b.value - a.value).slice(0, 6)

  const hasData = (data.records.finance?.length ?? 0) + (data.records.tasks?.length ?? 0) > 0

  return (
    <div className="anim space-y-5">
      <div>
        <h1 className="text-[21px] font-semibold tracking-tight">{t('ana.title')}</h1>
        <p className="text-[12px] text-[var(--color-dim2)] mt-1">{t('ana.localOnly')}</p>
      </div>

      {!hasData ? <Empty icon="BarChart3" title={t('ana.empty')} hint={t('ana.emptyHint')} /> : (
        <>
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <Stat label={t('ana.totalIncome')} value={fmt.money(o.income, cur)} icon="TrendingUp" tone="#22c55e" />
            <Stat label={t('ana.totalExpense')} value={fmt.money(o.expense, cur)} icon="TrendingDown" tone="#ef4444" />
            <Stat label={t('ana.netProfit')} value={fmt.money(o.profit, cur)} icon="Wallet" tone={o.profit >= 0 ? '#22c55e' : '#ef4444'}
              sub={o.income > 0 ? t('ana.margin', { n: fmt.dg(Math.round((o.profit / o.income) * 100)) }) : undefined} />
            <Stat label={t('ana.totalReach')} value={fmt.num(o.reach)} icon="Radio" sub={t('ana.mediaCount', { n: fmt.dg(o.mediaCount) })} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <SectionTitle icon="BarChart3" right={
                <div className="flex items-center gap-3 text-[10.5px]">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-emerald-500" />{t('ana.income')}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm bg-red-500" />{t('ana.expense')}</span>
                </div>
              }>{t('ana.finance6')}</SectionTitle>
              <BarChart data={fin} height={160} />
            </Card>

            <Card>
              <SectionTitle icon="PieChart">{t('ana.tasksByStatus')}</SectionTitle>
              {taskByStatus.length ? <Donut data={taskByStatus} size={118} /> : <Empty icon="CheckSquare" title={t('ana.noTasks')} />}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <SectionTitle icon="Wallet">{t('ana.pnl')}</SectionTitle>
              {pnl.length ? (
                <HBar rows={pnl.slice(0, 6).map(p => ({ label: p.name, value: p.profit, color: p.profit >= 0 ? '#22c55e' : '#ef4444' }))}
                  format={n => fmt.money(n, cur)} />
              ) : <Empty icon="FolderKanban" title={t('ana.noProjects')} />}
            </Card>

            <Card>
              <SectionTitle icon="Radio">{t('ana.topMedia')}</SectionTitle>
              {media.length ? <HBar rows={media} format={n => fmt.num(n)} /> : <Empty icon="Radio" title={t('ana.noMedia')} />}
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <SectionTitle icon="Users">{t('ana.pipeline')}</SectionTitle>
              {clientsByStage.length ? <Donut data={clientsByStage} size={110} /> : <Empty icon="Users" title={t('ana.noClients')} />}
            </Card>
            <Card>
              <SectionTitle icon="Share2">{t('ana.contentByPlat')}</SectionTitle>
              {contentByPlatform.length ? <Donut data={contentByPlatform} size={110} /> : <Empty icon="CalendarRange" title={t('ana.noContent')} />}
            </Card>
            <Card>
              <SectionTitle icon="Mic2">{t('ana.artistsByStatus')}</SectionTitle>
              {artistsByStatus.length ? <Donut data={artistsByStatus} size={110} /> : <Empty icon="Mic2" title={t('ana.noArtists')} />}
            </Card>
          </div>

          <Card>
            <SectionTitle icon="Database">{t('ana.footprint')}</SectionTitle>
            <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
              {data.modules.map(m => {
                const n = (data.records[m.key] ?? []).length
                return (
                  <div key={m.key} className="rounded-lg border border-[var(--color-line)] px-3 py-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon name={m.icon} size={11} className="text-[var(--color-dim2)]" />
                      <span className="text-[10px] text-[var(--color-dim2)] truncate">{ml(m)}</span>
                    </div>
                    <div className="text-[16px] font-semibold nums">{fmt.dg(n)}</div>
                  </div>
                )
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
