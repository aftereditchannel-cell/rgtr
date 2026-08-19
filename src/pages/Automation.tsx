import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/useApp'
import { Card, SectionTitle, Button, Field, TextInput, TextArea, Icon, Modal, Empty } from '../components/ui/Primitives'
import { useT } from '../i18n'
import { chat, runAutomation, type AIProvider, type AutomationTask, type ChatMessage } from '../domain/ai'
import { uid } from '../lib/id'

type Tab = 'chat' | 'tasks' | 'keys'

export function Automation() {
  const { t } = useT()
  const [tab, setTab] = useState<Tab>('chat')

  return (
    <div className="anim space-y-5 max-w-5xl">
      <div>
        <h1 className="text-[21px] font-semibold tracking-tight flex items-center gap-2">
          <Icon name="Bot" size={20} className="text-[var(--color-acc)]" /> {t('ai.title')}
        </h1>
        <p className="text-[12px] text-[var(--color-dim2)] mt-1">{t('ai.subtitle')}</p>
      </div>

      <div className="inline-flex rounded-lg border border-[var(--color-line2)] p-0.5 bg-[var(--color-bg)]">
        {([
          ['chat', 'MessageSquare', t('ai.chatTab')],
          ['tasks', 'Workflow', t('ai.tasksTab')],
          ['keys', 'KeyRound', t('ai.keysTab')],
        ] as const).map(([k, ic, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] transition-all ${
              tab === k ? 'bg-[var(--color-acc)] text-white' : 'text-[var(--color-dim)] hover:text-[var(--color-tx)]'
            }`}>
            <Icon name={ic} size={13} /> {label}
          </button>
        ))}
      </div>

      {tab === 'chat' && <ChatPanel />}
      {tab === 'tasks' && <TasksPanel />}
      {tab === 'keys' && <KeysPanel />}
    </div>
  )
}

/* ---------------- چت آزاد با AI ---------------- */
function ChatPanel() {
  const { data, setToast } = useApp()
  const { t, lang } = useT()
  const providers = data.settings.ai.providers
  const active = providers.filter(p => p.enabled && p.key)
  const [pid, setPid] = useState(active[0]?.id ?? providers[0]?.id ?? '')
  const [model, setModel] = useState(providers.find(p => p.id === pid)?.model ?? '')
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'You are NEXUS AI, a concise, helpful assistant embedded in a productivity app. Reply in the user\'s language.' },
    { role: 'assistant', content: t('ai.greeting') },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const p = providers.find(x => x.id === pid)
    if (p) setModel(p.model)
  }, [pid]) // eslint-disable-line

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  if (!active.length) {
    return <Card><Empty icon="KeyRound" title={t('ai.noKey')} hint={t('ai.noKeyHint')} /></Card>
  }

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return
    const provider = providers.find(p => p.id === pid)
    if (!provider) return
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(next); setInput(''); setBusy(true)
    try {
      const out = await chat(provider, next, { model: model || provider.model })
      setMessages([...next, { role: 'assistant', content: out }])
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `⚠ ${(e as Error).message}` }])
      setToast((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card pad={false}>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--color-line)]">
        <select value={pid} onChange={e => setPid(e.target.value)}
          className="rounded-lg bg-[var(--color-bg)] border border-[var(--color-line2)] px-2.5 py-1.5 text-[12px] cursor-pointer">
          {providers.filter(p => p.key).map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <TextInput value={model} onChange={e => setModel(e.target.value)} placeholder="model"
          className="flex-1 py-1.5 text-[12px] ltr" />
        <Button size="sm" variant="ghost" icon="Trash2" title={t('ai.clear')}
          onClick={() => setMessages([messages[0], messages[1]])} />
      </div>

      <div ref={scrollRef} className="h-[55vh] overflow-y-auto p-4 space-y-3">
        {messages.filter(m => m.role !== 'system').map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 border ${
              m.role === 'user' ? 'bg-[var(--color-acc)]/15 border-[var(--color-acc)]/30' : 'bg-white/[.04] border-[var(--color-line)]'
            }`}>
              <Icon name={m.role === 'user' ? 'User' : 'Bot'} size={15} className={m.role === 'user' ? 'text-[var(--color-acc)]' : 'text-[var(--color-dim)]'} />
            </div>
            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-[var(--color-acc)] text-white rounded-tr-sm'
                : 'bg-[var(--color-bg)] border border-[var(--color-line)] rounded-tl-sm'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex gap-2.5">
            <div className="w-8 h-8 rounded-lg grid place-items-center bg-white/[.04] border border-[var(--color-line)]">
              <Icon name="Bot" size={15} className="text-[var(--color-dim)]" />
            </div>
            <div className="rounded-2xl bg-[var(--color-bg)] border border-[var(--color-line)] px-4 py-3 flex gap-1">
              {[0, 1, 2].map(i => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--color-dim2)] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-3 border-t border-[var(--color-line)] flex gap-2">
        <TextInput value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
          placeholder={lang === 'fa' ? 'پیام شما...' : 'Message...'} className="flex-1" autoFocus />
        <Button variant="primary" icon={busy ? 'Loader' : 'Send'} disabled={busy || !input.trim()} onClick={() => void send()}>
          {t('ai.send')}
        </Button>
      </div>
    </Card>
  )
}

/* ---------------- تسک‌های اتوماسیون ---------------- */
function TasksPanel() {
  const { data, addAutomation, updateAutomation, removeAutomation, setToast } = useApp()
  const { t, lang } = useT()
  const tasks = data.settings.ai.automations
  const providers = data.settings.ai.providers
  const [running, setRunning] = useState<string | null>(null)
  const [edit, setEdit] = useState<AutomationTask | null>(null)

  const run = async (task: AutomationTask) => {
    const input = prompt(lang === 'fa' ? 'ورودی این تسک:' : 'Input for this task:')
    if (!input) return
    setRunning(task.id)
    try {
      const { output, model } = await runAutomation(task, providers, input)
      updateAutomation(task.id, {
        history: [{ at: new Date().toISOString(), input, output, model }, ...task.history].slice(0, 10),
      })
      setToast(t('ai.taskDone'))
    } catch (e) {
      setToast((e as Error).message)
    } finally {
      setRunning(null)
    }
  }

  const create = () => {
    const a: AutomationTask = {
      id: uid(), name: lang === 'fa' ? 'تسک جدید' : 'New task',
      prompt: 'درباره‌ی این ورودی کاری انجام بده:\n\n{input}',
      providerId: providers.find(p => p.enabled && p.key)?.id ?? providers[0]?.id ?? '',
      createdAt: new Date().toISOString(),
      history: [],
    }
    addAutomation(a); setEdit(a)
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-[12px] text-[var(--color-dim)]">{t('ai.tasksHint')}</p>
        <Button size="sm" variant="primary" icon="Plus" onClick={create}>{t('ai.newTask')}</Button>
      </div>

      {tasks.length === 0 && <Card><Empty icon="Workflow" title={t('ai.noTasks')} /></Card>}

      {tasks.map(task => (
        <Card key={task.id}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg grid place-items-center bg-[var(--color-acc)]/10 border border-[var(--color-acc)]/25 shrink-0">
              <Icon name="Wand2" size={16} className="text-[var(--color-acc)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold">{task.name}</div>
              <p className="text-[11.5px] text-[var(--color-dim)] mt-0.5 line-clamp-1">{task.prompt}</p>
              {task.history[0] && (
                <div className="mt-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-bg)] p-2.5">
                  <div className="text-[10px] text-[var(--color-dim2)] mb-1">{t('ai.lastRun')} · {task.history[0].model}</div>
                  <div className="text-[12px] whitespace-pre-wrap text-[var(--color-dim)] line-clamp-3">{task.history[0].output}</div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button size="sm" variant="primary" icon={running === task.id ? 'Loader' : 'Play'} disabled={running !== null}
                onClick={() => void run(task)}>{t('ai.run')}</Button>
              <Button size="sm" variant="ghost" icon="Settings2" onClick={() => setEdit(task)} />
              <Button size="sm" variant="ghost" icon="Trash2"
                onClick={() => { if (confirm(t('ai.confirmDel'))) removeAutomation(task.id) }} />
            </div>
          </div>
        </Card>
      ))}

      {edit && (
        <TaskEditor task={edit} onClose={() => setEdit(null)}
          onSave={p => { updateAutomation(edit.id, p); setEdit(null) }} providers={providers} />
      )}
    </div>
  )
}

function TaskEditor({ task, onClose, onSave, providers }: {
  task: AutomationTask; onClose: () => void
  onSave: (p: Partial<AutomationTask>) => void; providers: AIProvider[]
}) {
  const { t } = useT()
  const [name, setName] = useState(task.name)
  const [prompt, setPrompt] = useState(task.prompt)
  const [providerId, setProviderId] = useState(task.providerId)
  const [model, setModel] = useState(task.model ?? '')

  return (
    <Modal open onClose={onClose} wide title={t('ai.editTask')}
      footer={<>
        <Button variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" size="sm" icon="Check"
          onClick={() => onSave({ name, prompt, providerId, model })}>{t('common.save')}</Button>
      </>}>
      <div className="space-y-3">
        <Field label={t('ai.taskName')}><TextInput value={name} onChange={e => setName(e.target.value)} /></Field>
        <Field label={t('ai.provider')}>
          <select value={providerId} onChange={e => setProviderId(e.target.value)}
            className="w-full rounded-lg bg-[var(--color-bg)] border border-[var(--color-line2)] px-3 py-2 text-[13px] cursor-pointer">
            {providers.map(p => <option key={p.id} value={p.id}>{p.label}{p.key ? '' : ' (' + t('ai.noKeySet') + ')'}</option>)}
          </select>
        </Field>
        <Field label={t('ai.modelOverride')}><TextInput value={model} onChange={e => setModel(e.target.value)} placeholder={providers.find(p => p.id === providerId)?.model} className="ltr" /></Field>
        <Field label={t('ai.prompt')} help={t('ai.promptHint')}>
          <TextArea rows={6} value={prompt} onChange={e => setPrompt(e.target.value)} className="ltr text-start" dir="ltr" />
        </Field>
      </div>
    </Modal>
  )
}

/* ---------------- مدیریت کلیدها ---------------- */
function KeysPanel() {
  const { data, upsertProvider, removeProvider, setToast } = useApp()
  const { t } = useT()
  const providers = data.settings.ai.providers
  const [show, setShow] = useState<Record<string, boolean>>({})
  const [adding, setAdding] = useState(false)
  const [newP, setNewP] = useState<AIProvider>({
    id: 'custom-' + Date.now().toString(36), label: '', baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini', key: '', enabled: true,
  })

  const set = (id: string, patch: Partial<AIProvider>) => {
    const p = providers.find(x => x.id === id)
    if (p) upsertProvider({ ...p, ...patch })
  }

  const test = async (p: AIProvider) => {
    if (!p.key) { setToast(t('ai.needKey')); return }
    try {
      await chat(p, [{ role: 'user', content: 'Reply with the single word OK.' }])
      setToast(t('ai.keyWorks'))
    } catch (e) {
      setToast(`${t('ai.keyFail')}: ${(e as Error).message}`)
    }
  }

  return (
    <div className="space-y-3">
      <Card>
        <SectionTitle icon="Info">{t('ai.aboutKeys')}</SectionTitle>
        <p className="text-[12px] text-[var(--color-dim)] leading-relaxed">{t('ai.aboutKeysText')}</p>
      </Card>

      {providers.map(p => (
        <Card key={p.id}>
          <div className="flex items-center gap-3 mb-3">
            <Icon name="Server" size={16} className="text-[var(--color-acc)]" />
            <span className="text-[13.5px] font-semibold flex-1">{p.label}</span>
            <label className="flex items-center gap-1.5 cursor-pointer text-[11.5px] text-[var(--color-dim)]">
              <input type="checkbox" className="accent-[var(--color-acc)] w-3.5 h-3.5" checked={p.enabled}
                onChange={e => set(p.id, { enabled: e.target.checked })} />
              {t('ai.enabled')}
            </label>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t('ai.baseUrl')}>
              <TextInput value={p.baseUrl} onChange={e => set(p.id, { baseUrl: e.target.value })} className="ltr" />
            </Field>
            <Field label={t('ai.model')}>
              <TextInput value={p.model} onChange={e => set(p.id, { model: e.target.value })} className="ltr" />
            </Field>
            <Field label={t('ai.apiKey')}>
              <div className="relative">
                <TextInput type={show[p.id] ? 'text' : 'password'} value={p.key}
                  onChange={e => set(p.id, { key: e.target.value })} placeholder="sk-..." className="ltr pe-9" />
                <button type="button" onClick={() => setShow(s => ({ ...s, [p.id]: !s[p.id] }))}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--color-dim2)]">
                  <Icon name={show[p.id] ? 'EyeOff' : 'Eye'} size={14} />
                </button>
              </div>
            </Field>
            <div className="flex items-end gap-2">
              <Button size="sm" variant="outline" icon="Plug" onClick={() => void test(p)}>{t('ai.test')}</Button>
              {p.signupUrl && (
                <a href={p.signupUrl} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11.5px] text-[var(--color-acc)] hover:underline px-1">
                  <Icon name="ExternalLink" size={12} /> {t('ai.getKey')}
                </a>
              )}
              {!['groq', 'openrouter', 'gemini', 'together'].includes(p.id) && (
                <Button size="sm" variant="ghost" icon="Trash2"
                  onClick={() => { if (confirm(t('ai.confirmDel'))) removeProvider(p.id) }} />
              )}
            </div>
          </div>
        </Card>
      ))}

      {adding ? (
        <Card>
          <SectionTitle icon="Plus">{t('ai.customProvider')}</SectionTitle>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label={t('ai.name')}><TextInput value={newP.label} onChange={e => setNewP({ ...newP, label: e.target.value })} /></Field>
            <Field label={t('ai.baseUrl')}><TextInput value={newP.baseUrl} onChange={e => setNewP({ ...newP, baseUrl: e.target.value })} className="ltr" /></Field>
            <Field label={t('ai.model')}><TextInput value={newP.model} onChange={e => setNewP({ ...newP, model: e.target.value })} className="ltr" /></Field>
            <Field label={t('ai.apiKey')}><TextInput value={newP.key} onChange={e => setNewP({ ...newP, key: e.target.value })} className="ltr" /></Field>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" variant="primary" icon="Check" disabled={!newP.label || !newP.baseUrl}
              onClick={() => { upsertProvider(newP); setAdding(false); setToast(t('ai.providerSaved')) }}>
              {t('common.save')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>{t('common.cancel')}</Button>
          </div>
        </Card>
      ) : (
        <Button variant="outline" size="sm" icon="Plus" onClick={() => setAdding(true)}>{t('ai.addProvider')}</Button>
      )}
    </div>
  )
}
