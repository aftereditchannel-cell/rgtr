import { useState } from 'react'
import { useApp } from '../../store/useApp'
import { Modal, Button, Field, TextArea, Icon, Empty } from '../ui/Primitives'
import { Dropdown } from '../ui/Dropdown'
import { runAgent, getAiKey, AiError } from '../../lib/ai'
import { useT } from '../../i18n'

/**
 * اجرای واقعی یک ایجنت با API هوش مصنوعی (OpenAI یا سازگار).
 * از صفحه‌ی «AI Agents» باز می‌شود. بدون کلید، راهنمای وارد کردن آن را نشان می‌دهد.
 */
export function AgentRunner({ onClose }: { onClose: () => void }) {
  const { t } = useT()
  const data = useApp(s => s.data)
  const ai = data.settings.ai
  const agents = data.records['agents'] ?? []

  const [agentId, setAgentId] = useState('')
  const [input, setInput] = useState('')
  const [out, setOut] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const agent = agents.find(a => a.id === agentId)
  const hasKey = !!getAiKey()

  const run = async () => {
    if (!agent || !input.trim()) return
    setBusy(true); setErr(''); setOut('')
    try {
      const res = await runAgent(
        { baseUrl: ai.baseUrl, model: ai.model },
        {
          name: String(agent.name ?? ''),
          role: String(agent.role ?? ''),
          description: String(agent.description ?? ''),
          responsibilities: String(agent.responsibilities ?? ''),
        },
        input,
      )
      setOut(res || '—')
    } catch (e) {
      const code = (e as AiError).code
      setErr(code === 'no_key' ? t('agent.needKey') : (e as Error).message || code)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={onClose} wide title={`${t('agent.run')} — ${agent ? String(agent.name) : ''}`}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>{t('common.close')}</Button>
          <Button variant="primary" size="sm" icon={busy ? 'Loader' : 'Play'}
            disabled={busy || !agent || !input.trim() || !hasKey} onClick={run}>
            {t('agent.run')}
          </Button>
        </>
      }>
      {!hasKey && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/[.07] px-3 py-2 text-[11.5px] text-amber-300">
          <Icon name="AlertTriangle" size={13} className="mt-0.5 shrink-0" />
          <span>{t('agent.needKey')}</span>
        </div>
      )}

      {!agents.length ? (
        <Empty icon="Bot" title={t('agent.noAgents')} />
      ) : (
        <div className="space-y-3">
          <Field label={t('agent.select')}>
            <Dropdown
              value={agentId}
              onChange={setAgentId}
              options={agents.map(a => ({ value: String(a.id), label: `${a.name}${a.role ? ' — ' + a.role : ''}` }))}
            />
          </Field>
          {agent && String(agent.description ?? '') && (
            <p className="text-[11px] text-[var(--color-dim2)] leading-relaxed">{String(agent.description)}</p>
          )}
          <Field label={t('agent.input')}>
            <TextArea value={input} onChange={e => setInput(e.target.value)} className="min-h-[80px]" />
          </Field>
          {err && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/[.07] px-3 py-2 text-[11.5px] text-red-300">
              <Icon name="AlertTriangle" size={13} className="mt-0.5 shrink-0" />
              <span className="break-all">{err}</span>
            </div>
          )}
          {out && (
            <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] p-3">
              <div className="text-[10.5px] font-medium text-[var(--color-dim2)] mb-1.5">{t('agent.output')}</div>
              <div className="text-[12.5px] leading-relaxed whitespace-pre-wrap">{out}</div>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
