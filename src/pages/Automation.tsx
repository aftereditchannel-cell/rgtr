import { useState } from 'react'
import { useApp } from '../store/useApp'
import { useT } from '../i18n'
import { Card, SectionTitle, Button, Field, TextInput, Select, Icon, Empty } from '../components/ui/Primitives'
import { detectPlatform, type SocialInfo } from '../social/types'
import { providerById } from '../social/registry'
import { getKey } from '../lib/secrets'
import { aiProviderById, aiComplete } from '../ai/providers'
import { uid, nowISO } from '../lib/id'
import type { Workflow } from '../store/types'

/**
 * Automation — جریان‌های کاری: Account → Fetch → AI Analysis → Report
 * اجرای دستی + فاصله‌ی زمانی قابل تنظیم (تا وقتی برنامه باز است).
 */

function NewWorkflowForm({ onDone }: { onDone: () => void }) {
  const { t } = useT()
  const st = useApp()
  const [name, setName] = useState('')
  const [targets, setTargets] = useState('')
  const [interval, setIntervalMin] = useState('0')
  const [ai, setAi] = useState(true)

  const create = () => {
    if (!name.trim() || !targets.trim()) return
    const w: Workflow = {
      id: uid(),
      name: name.trim(),
      enabled: true,
      targets: targets.split(/[\n,]+/).map(s => s.trim()).filter(Boolean).slice(0, 10),
      steps: [{ type: 'fetch' }, { type: 'ai', prompt: 'Analyze these social media stats, highlight growth and risks in 5 short bullets:' }, { type: 'save' }],
      intervalMin: Number(interval) || 0,
      createdAt: nowISO(),
    }
    st.upsertWorkflow(w)
    st.setToast(t('wf.created'))
    onDone()
  }

  return (
    <Card className="anim">
      <SectionTitle icon="PlusCircle">{t('wf.new')}</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('wf.name')}>
          <TextInput value={name} onChange={e => setName(e.target.value)} placeholder={t('wf.nameHint')} />
        </Field>
        <Field label={t('wf.interval')}>
          <Select options={['0', '5', '15', '30', '60']} value={interval} onChange={e => setIntervalMin(e.target.value)} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label={t('wf.targets')} help={t('wf.targetsHint')}>
          <textarea
            value={targets}
            onChange={e => setTargets(e.target.value)}
            rows={3}
            className="w-full rounded-lg bg-[var(--hover)] border border-[var(--color-line2)] px-3 py-2 text-[12.5px] focus:border-[var(--color-acc)] outline-none"
            placeholder={'https://youtube.com/channel/UC…\n@telegram_channel'}
          />
        </Field>
      </div>
      <div className="flex items-center justify-between mt-3">
        <label className="flex items-center gap-2 text-[11.5px] text-[var(--color-dim)] cursor-pointer">
          <input type="checkbox" className="accent-[var(--color-acc)] w-3.5 h-3.5" checked={ai} onChange={e => setAi(e.target.checked)} />
          {t('wf.useAI')}
        </label>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={onDone}>{t('common.cancel')}</Button>
          <Button size="sm" variant="primary" icon="Check" disabled={!name.trim() || !targets.trim()} onClick={create}>{t('wf.create')}</Button>
        </div>
      </div>
    </Card>
  )
}

export function Automation() {
  const { t } = useT()
  const st = useApp()
  const [creating, setCreating] = useState(false)
  const [running, setRunning] = useState('')
  const workflows = st.data.workflows ?? []
  const logs = (st.data.runLogs ?? []).filter(l => l.kind === 'workflow' || l.kind === 'ai')

  async function runWorkflow(w: Workflow) {
    setRunning(w.id)
    const collected: SocialInfo[] = []
    let ok = 0, fail = 0
    for (const target of w.targets) {
      try {
        const det = detectPlatform(target)
        if (!det) { fail++; continue }
        const info = await providerById(det.platform)!.fetch(det.handle, { key: getKey })
        collected.push(info); ok++
        st.upsertSocial(info)
      } catch { fail++ }
    }
    let aiOut = ''
    const aiStep = w.steps.find(s => s.type === 'ai')
    const aiCfg = st.data.settings.ai
    if (aiStep && aiCfg.enabled) {
      const prov = aiProviderById(aiCfg.provider)
      const key = getKey(prov?.keyName ?? '')
      if (prov && key) {
        try {
          const data = collected.map(i => `${i.platform}/${i.handle}: ${i.displayName ?? ''} — ` +
            i.stats.map(s => `${s.label}=${s.value ?? 'n/a'}`).join(', ')).join('\n')
          aiOut = await aiComplete(aiCfg.provider, aiCfg.model, key, `${aiStep.prompt}\n\n${data}`)
        } catch (e) {
          st.pushLog({ kind: 'ai', subject: w.name, ok: false, detail: (e as Error).message.slice(0, 160) })
        }
      }
    }
    st.pushLog({
      kind: 'workflow', subject: w.name, ok: fail === 0 && ok > 0,
      detail: `${ok} fetched, ${fail} failed${aiOut ? ' · AI ✓' : ''}${aiOut ? ' — ' + aiOut.slice(0, 120) : ''}`,
    })
    st.upsertWorkflow({ ...w, lastRunAt: nowISO(), lastStatus: ok > 0 ? (fail ? 'partial' : 'ok') : 'error' })
    setRunning('')
  }

  return (
    <div className="anim space-y-5 max-w-4xl">
      <div>
        <h1 className="text-[21px] font-semibold tracking-tight">{t('wf.title')}</h1>
        <p className="text-[12px] text-[var(--color-dim2)] mt-1">{t('wf.subtitle')}</p>
      </div>

      {creating && <NewWorkflowForm onDone={() => setCreating(false)} />}

      <Card>
        <SectionTitle
          icon="Workflow"
          right={<Button size="sm" variant="primary" icon="Plus" onClick={() => setCreating(true)}>{t('wf.new')}</Button>}
        >
          {t('wf.list')} ({workflows.length})
        </SectionTitle>
        {!workflows.length ? (
          <Empty icon="Workflow" title={t("wf.empty")} />
        ) : (
          <div className="space-y-2">
            {workflows.map(w => (
              <div key={w.id} className="rounded-lg border border-[var(--color-line)] px-3 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium">{w.name}</span>
                  <span className='text-[10px] px-2 py-0.5 rounded-full bg-white/[.05] text-[var(--color-dim)] nums'>{w.intervalMin === 0 ? t('wf.manual') : w.intervalMin + ' min'}</span>
                  {w.lastStatus && (
                    <span className={`text-[10px] ${w.lastStatus === 'ok' ? 'text-emerald-500' : w.lastStatus === 'partial' ? 'text-amber-500' : 'text-red-400'}`}>
                      {t(`wf.status.${w.lastStatus}`)}
                    </span>
                  )}
                  <span className="flex-1" />
                  <Button size="sm" variant={w.enabled ? 'outline' : 'ghost'} icon={w.enabled ? 'Pause' : 'Play'}
                    onClick={() => st.upsertWorkflow({ ...w, enabled: !w.enabled })}>
                    {w.enabled ? t('wf.disable') : t('wf.enable')}
                  </Button>
                  <Button size="sm" variant="primary" icon={running === w.id ? 'Loader' : 'Play'} disabled={running === w.id}
                    onClick={() => void runWorkflow(w)}>
                    {running === w.id ? t('wf.running') : t('wf.run')}
                  </Button>
                  <Button size="sm" variant="ghost" icon="Trash2" onClick={() => st.removeWorkflow(w.id)} />
                </div>
                <div className="text-[10.5px] text-[var(--color-dim2)] mt-1.5 nums" dir="ltr">
                  {w.targets.join(' · ')}
                  {w.lastRunAt && ` — ${t('wf.lastRun')}: ${new Date(w.lastRunAt).toLocaleString()}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon="History">{t('wf.history')}</SectionTitle>
        {logs.length === 0 ? <Empty icon="History" title={t('social.noLogs')} /> : logs.slice(0, 12).map(l => (
          <div key={l.id} className="flex items-start gap-2 text-[11px] py-1.5 border-b border-[var(--color-line)] last:border-0">
            <span className={l.ok ? 'text-emerald-500' : 'text-red-400'}>●</span>
            <span className="text-[var(--color-dim2)] nums shrink-0">{new Date(l.at).toLocaleString()}</span>
            <span className="min-w-0 flex-1">{l.subject} — {l.detail}</span>
          </div>
        ))}
      </Card>

      <p className="text-[10px] text-[var(--color-dim2)] leading-relaxed">
        <Icon name="Info" size={11} className="inline -mt-0.5 me-1" />
        {t('wf.note')}
      </p>
    </div>
  )
}
