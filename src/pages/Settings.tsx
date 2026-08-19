import { useState, useEffect, useRef } from 'react'
import { useApp } from '../store/useApp'
import { exportJSON, importJSON } from '../lib/backup'
import { listSnapshots, getSnapshot, storageBackend, saveDoc } from '../lib/db'
import type { Snapshot } from '../store/types'
import { makeCustomModule, CORE_MODULES } from '../domain/schema'
import type { ModuleDef, FieldDef, FieldType } from '../domain/schema'
import { Card, SectionTitle, Button, Field, TextInput, Select, Icon, Modal, Badge, Empty } from '../components/ui/Primitives'
import { ICON_NAMES } from '../components/ui/icons'
import { useT, cloudError } from '../i18n'
import { useFmt } from '../lib/useFmt'
import { desktop, isDesktop } from '../lib/desktop'
import { isMobile, mobilePlatform, mobileDataPath } from '../lib/mobile'
import { readLock, writeLock, clearLock, hashPin, LOCK_DEFAULTS } from '../lib/lock'
import { AI_PROVIDERS, testAIConnection, aiProviderById, type AIProviderId } from '../ai/providers'
import { getKey, setKey, maskKey, secureAvailable } from '../lib/secrets'
import { PROVIDERS } from '../social/registry'
import type { AppInfo } from '../lib/desktop'
import * as cloud from '../lib/cloud'
import type { Lang } from '../store/types'

const ACCENTS = ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#f97316']
const FIELD_TYPES: FieldType[] = ['text', 'textarea', 'number', 'money', 'date', 'select', 'ref', 'url', 'progress', 'checklist', 'tags']

export function Settings() {
  const { data, setSettings, replaceAll, loadSeed, clearAll, addModule, updateModule, removeModule, restoreCoreModules, setToast, persist } = useApp()
  const s = data.settings
  const { t, lang, m: ml, g } = useT()
  const fmt = useFmt()
  const fileRef = useRef<HTMLInputElement>(null)
  const [snaps, setSnaps] = useState<Snapshot[]>([])
  const [newMod, setNewMod] = useState('')
  const [editMod, setEditMod] = useState<ModuleDef | null>(null)

  useEffect(() => { void listSnapshots().then(setSnaps) }, [data])

  const totalRecords = Object.values(data.records).reduce((n, r) => n + r.length, 0)
  const sizeKB = Math.round(JSON.stringify(data).length / 1024)

  const doImport = async (f: File) => {
    try {
      const d = await importJSON(f)
      if (!confirm(t('set.confirmImport'))) return
      await replaceAll(d)
      setToast(t('toast.backupRestored'))
    } catch (e) {
      alert(t('common.error') + ': ' + (e as Error).message)
    }
  }

  const restore = async (id: number) => {
    const snap = await getSnapshot(id)
    if (snap && confirm(t('set.confirmRestore', { d: fmt.relTime(snap.at) }))) {
      await replaceAll(snap.data)
      setToast(t('common.restore'))
    }
  }

  const missingCore = CORE_MODULES.filter(c => !data.modules.some(m => m.key === c.key)).length

  return (
    <div className="anim space-y-5 max-w-4xl">
      <div>
        <h1 className="text-[21px] font-semibold tracking-tight">{t('set.title')}</h1>
        <p className="text-[12px] text-[var(--color-dim2)] mt-1">
          {t('set.storedIn', { b: storageBackend() === 'disk' ? t('set.diskFile') : storageBackend() === 'phone' ? t('set.phoneFile') : storageBackend() })}
          {' · '}<span className="nums">{fmt.dg(totalRecords)}</span> {t('common.records')}
          {' · '}<span className="nums">{fmt.dg(sizeKB)}</span> KB
        </p>
      </div>

      {/* ---------- general ---------- */}
      <Card>
        <SectionTitle icon="User">{t('set.general')}</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label={t('set.yourName')}>
            <TextInput value={s.ownerName} placeholder={t('set.yourNameHint')} onChange={e => setSettings({ ownerName: e.target.value })} />
          </Field>
          <Field label={t('set.orgName')}>
            <TextInput value={s.orgName} onChange={e => setSettings({ orgName: e.target.value })} />
          </Field>
          <Field label={t('set.currency')}>
            <Select options={['$', '€', '£', '﷼', 'T']} value={s.currency} onChange={e => setSettings({ currency: e.target.value })} />
          </Field>
          <Field label={t('set.focusCount')} help={t('set.focusCountHint')}>
            <Select options={['1', '2', '3', '4', '5']} value={String(s.focusCount)} onChange={e => setSettings({ focusCount: Number(e.target.value) })} />
          </Field>
        </div>
        <div className="mt-4">
          <span className="block text-[11px] font-medium text-[var(--color-dim)] mb-2">{t('set.accent')}</span>
          <div className="flex gap-2 flex-wrap">
            {ACCENTS.map(c => (
              <button key={c} onClick={() => setSettings({ accent: c })} aria-label={c}
                className={`w-7 h-7 rounded-lg transition-all ${s.accent === c ? 'scale-110' : 'hover:scale-105'}`}
                style={{ background: c, boxShadow: s.accent === c ? `0 0 0 2px var(--color-panel), 0 0 0 4px ${c}` : undefined }} />
            ))}
          </div>
        </div>
      </Card>

      {/* ---------- language / display ---------- */}
      <Card>
        <SectionTitle icon="Languages">{t('set.appearance')}</SectionTitle>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label={t('set.language')} help={t('set.languageHint')}>
            <Toggle
              value={s.lang}
              options={[{ v: 'fa', l: 'فارسی' }, { v: 'en', l: 'English' }]}
              onChange={v => setSettings({ lang: v as Lang })}
            />
          </Field>
          <Field label={t('set.calendar')} help={t('set.calendarHint')}>
            <Toggle
              value={s.calendar}
              options={[{ v: 'jalali', l: t('set.calJalali') }, { v: 'gregorian', l: t('set.calGregorian') }]}
              onChange={v => setSettings({ calendar: v as 'jalali' | 'gregorian' })}
            />
          </Field>
          <Field label={t('set.digits')}>
            <Toggle
              value={s.digits}
              options={[{ v: 'fa', l: t('set.digitsFa') }, { v: 'latn', l: t('set.digitsEn') }]}
              onChange={v => setSettings({ digits: v as 'fa' | 'latn' })}
            />
          </Field>
          <Field label={t('set.theme')} help={t('set.themeHint')}>
            <Toggle
              value={s.theme}
              options={[{ v: 'auto', l: t('set.themeAuto') }, { v: 'dark', l: t('set.themeDark') }, { v: 'light', l: t('set.themeLight') }]}
              onChange={v => setSettings({ theme: v as 'auto' | 'dark' | 'light' })}
            />
          </Field>
        </div>
      </Card>

      {/* ---------- security ---------- */}
      <SecurityCard onSaved={msg => setToast(msg)} />

      {/* ---------- social platforms ---------- */}
      <SocialCard />

      {/* ---------- AI ---------- */}
      <AICard onSaved={msg => setToast(msg)} />

      {/* ---------- API keys ---------- */}
      <ApiKeysCard onSaved={msg => setToast(msg)} />

      {/* ---------- customization ---------- */}
      <CustomizationCard />

      {/* ---------- cloud ---------- */}
      <CloudCard />

      {/* ---------- backup ---------- */}
      <Card>
        <SectionTitle icon="DatabaseBackup">{t('set.backup')}</SectionTitle>
        <p className="text-[12px] text-[var(--color-dim)] leading-relaxed mb-3">{t('set.backupNote')}</p>
        <div className="flex gap-2 flex-wrap">
          <Button variant="primary" size="sm" icon="Download"
            onClick={async () => { const p = await exportJSON(data); setToast(p ? t('toast.savedTo', { f: p.split(/[\\/]/).pop() ?? '' }) : t('toast.backupDownloaded')) }}>
            {t('set.exportJSON')}
          </Button>
          <Button variant="outline" size="sm" icon="Upload" onClick={() => fileRef.current?.click()}>{t('set.importFile')}</Button>
          <input ref={fileRef} type="file" accept=".json" hidden
            onChange={e => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = '' }} />
        </div>

        {snaps.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[var(--color-line)]">
            <div className="text-[11px] text-[var(--color-dim2)] mb-2">{t('set.snapshots')}</div>
            <div className="space-y-1.5">
              {snaps.map(sn => (
                <div key={sn.id} className="flex items-center gap-3 text-[12px] px-3 py-2 rounded-lg border border-[var(--color-line)]">
                  <Icon name="History" size={13} className="text-[var(--color-dim2)]" />
                  <span className="flex-1">{fmt.relTime(sn.at)}</span>
                  <span className="text-[10.5px] text-[var(--color-dim2)] nums">{fmt.dg(Math.round(sn.size / 1024))} KB</span>
                  <Button size="sm" variant="ghost" onClick={() => sn.id && restore(Number(sn.id))}>{t('common.restore')}</Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ---------- desktop ---------- */}
      <DesktopCard onSaved={async () => { await persist(); await saveDoc(useApp.getState().data); setToast(t('set.savedNow')) }} />

      {/* ---------- modules ---------- */}
      <Card id="modules">
        <SectionTitle icon="Blocks" right={<span className="text-[10.5px] text-[var(--color-dim2)] nums">{t('set.moduleCount', { n: fmt.dg(data.modules.length) })}</span>}>
          {t('set.modules')}
        </SectionTitle>
        <p className="text-[12px] text-[var(--color-dim)] mb-3 leading-relaxed">{t('set.modulesNote')}</p>

        <div className="flex gap-2 mb-4">
          <TextInput value={newMod} placeholder={t('set.newModuleName')} className="py-1.5 text-[12.5px]"
            onChange={e => setNewMod(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newMod.trim()) { addModule(makeCustomModule(newMod.trim())); setNewMod(''); setToast(t('set.moduleCreated')) }
            }} />
          <Button size="sm" variant="primary" icon="Plus" disabled={!newMod.trim()}
            onClick={() => { addModule(makeCustomModule(newMod.trim())); setNewMod(''); setToast(t('set.moduleCreated')) }}>
            {t('common.add')}
          </Button>
        </div>

        <div className="space-y-1.5">
          {data.modules.map(m => {
            const n = (data.records[m.key] ?? []).length
            return (
              <div key={m.key} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[var(--color-line)] hover:border-[var(--color-line2)] transition-colors">
                <Icon name={m.icon} size={14} className="text-[var(--color-dim2)] shrink-0" />
                <span className="text-[12.5px] flex-1 truncate">{ml(m)}</span>
                <span className="text-[10px] text-[var(--color-dim2)] hidden sm:block">{g(m.group)}</span>
                <span className="text-[10.5px] text-[var(--color-dim2)] nums w-8 text-end">{fmt.dg(n)}</span>
                {m.custom && <Badge value="custom" />}
                <Button size="sm" variant="ghost" icon="Settings2" title={t('common.edit')} onClick={() => setEditMod(m)} />
                <Button size="sm" variant="ghost" icon="Trash2" title={t('common.delete')}
                  onClick={() => {
                    if (confirm(t('set.confirmDelMod', { m: ml(m), n: fmt.dg(n) }))) { removeModule(m.key); setToast(t('set.moduleDeleted')) }
                  }} />
              </div>
            )
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-[var(--color-line)] flex items-center gap-3 flex-wrap">
          <Button size="sm" variant="outline" icon="RotateCcw"
            onClick={() => {
              const n = restoreCoreModules()
              setToast(n ? t('set.restoredDefaults', { n: fmt.dg(n) }) : t('set.nothingToRestore'))
            }}>
            {t('set.restoreDefaults')}
          </Button>
          <span className="text-[10.5px] text-[var(--color-dim2)] flex-1 min-w-[180px]">
            {t('set.restoreDefHint')}{missingCore > 0 ? ` (${fmt.dg(missingCore)})` : ''}
          </span>
        </div>
      </Card>

      {/* ---------- future integrations ---------- */}
      <Card>
        <SectionTitle icon="Plug">{t('set.integrations')}</SectionTitle>
        <p className="text-[12px] text-[var(--color-dim)] mb-3">{t('set.integrationsNote')}</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { i: 'Bot', t: 'AI API (Gemini / Groq)', fa: 'پلن رایگان دارند', en: 'have free tiers' },
            { i: 'Workflow', t: 'n8n (self-hosted)', fa: 'روی همین کامپیوتر — کاملاً رایگان', en: 'on this machine — completely free' },
            { i: 'Send', t: 'Telegram Bot', fa: 'رایگان · نیاز به توکن بات', en: 'free · needs a bot token' },
            { i: 'Camera', t: 'Instagram Graph API', fa: 'رایگان · نیاز به تأیید Meta', en: 'free · needs Meta review' },
            { i: 'GitBranch', t: 'GitHub Actions backup', fa: 'رایگان', en: 'free' },
            { i: 'Cloud', t: 'Supabase', fa: 'تا ۵۰۰MB رایگان · بعد از آن پولی', en: 'free up to 500 MB, paid after' },
          ].map(x => (
            <div key={x.t} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-[var(--color-line)] opacity-70">
              <Icon name={x.i} size={14} className="text-[var(--color-dim2)] mt-0.5 shrink-0" />
              <div className="min-w-0">
                <div className="text-[12px] keep-tracking">{x.t}</div>
                <div className="text-[10.5px] text-[var(--color-dim2)]">{lang === 'fa' ? x.fa : x.en}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ---------- danger ---------- */}
      <Card className="border-red-500/20">
        <SectionTitle icon="AlertTriangle">{t('set.danger')}</SectionTitle>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" icon="Sparkles"
            onClick={() => { if (confirm(t('set.confirmSeed'))) { void loadSeed(); setToast(t('set.seedLoaded')) } }}>
            {t('set.loadSeed')}
          </Button>
          <Button variant="danger" size="sm" icon="Trash2"
            onClick={() => { if (confirm(t('set.confirmClear'))) { void clearAll(); setToast(t('set.cleared')) } }}>
            {t('set.clearAll')}
          </Button>
        </div>
      </Card>

      {editMod && <ModuleEditor module={editMod} onClose={() => setEditMod(null)} onSave={p => { updateModule(editMod.key, p); setEditMod(null) }} />}
    </div>
  )
}

/* ---------- سوییچ چندگزینه‌ای ---------- */

/* ---------- Social Platforms: رفتار Refresh + نام‌گذاری ---------- */
function SocialCard() {
  const { t, lang } = useT()
  const s = useApp(x => x.data.settings)
  const setSettings = useApp(x => x.setSettings)
  const [labels, setLabels] = useState<Record<string, string>>(s.custom.platformLabels ?? {})
  return (
    <Card>
      <SectionTitle icon="Share2">{t('set.social')}</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('set.refreshMode')} help={t('set.refreshModeHint')}>
          <Toggle
            value={s.social.refreshMode}
            options={[
              { v: 'manual', l: t('social.mode.manual') },
              { v: 'open', l: t('social.mode.open') },
              { v: '5', l: t('social.mode.5') },
              { v: '15', l: t('social.mode.15') },
            ]}
            onChange={v => setSettings({ social: { ...s.social, refreshMode: v as 'manual' | 'open' | '5' | '15' } })}
          />
        </Field>
      </div>
      <div className="mt-4">
        <span className="block text-[11px] font-medium text-[var(--color-dim)] mb-2">{t('set.platformLabels')}</span>
        <div className="grid sm:grid-cols-2 gap-2">
          {PROVIDERS.map(p => (
            <div key={p.id} className="flex items-center gap-2">
              <span className="text-[11px] w-24 shrink-0">{lang === 'fa' ? p.labelFa : p.label}</span>
              <TextInput value={labels[p.id] ?? ''} placeholder={p.label}
                onChange={e => {
                  const next = { ...labels, [p.id]: e.target.value }
                  setLabels(next)
                  setSettings({ custom: { ...s.custom, platformLabels: next } })
                }} />
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

/* ---------- AI: Provider / Model / Key / Test ---------- */
function AICard({ onSaved }: { onSaved: (msg: string) => void }) {
  const { t } = useT()
  const s = useApp(x => x.data.settings)
  const setSettings = useApp(x => x.setSettings)
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState('')
  const prov = aiProviderById(s.ai.provider) ?? AI_PROVIDERS[0]
  const [draftKey, setDraftKey] = useState('')

  const doTest = async () => {
    setTesting(true); setTestMsg('')
    const key = draftKey || getKey(prov.keyName) || ''
    if (!key) { setTestMsg(t('set.aiNeedKey')); setTesting(false); return }
    const r = await testAIConnection(s.ai.provider, s.ai.model, key)
    setTestMsg((r.ok ? '✔ ' : '✖ ') + r.detail.slice(0, 140))
    setTesting(false)
  }

  return (
    <Card>
      <SectionTitle icon="Bot" right={<span className={`w-1.5 h-1.5 rounded-full ${s.ai.enabled ? 'bg-emerald-500' : 'bg-[var(--color-dim2)]'}`} />}>
        {t('set.ai')}
      </SectionTitle>
      <p className="text-[11.5px] text-[var(--color-dim)] leading-relaxed mb-3">{t('set.aiNote')}</p>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label={t('set.aiProvider')}>
          <Toggle
            value={s.ai.provider}
            options={AI_PROVIDERS.map(p => ({ v: p.id, l: p.id === 'openai' ? 'OpenAI' : p.id === 'gemini' ? 'Gemini' : 'Claude' }))}
            onChange={v => {
              const p = aiProviderById(v as AIProviderId)
              setSettings({ ai: { ...s.ai, provider: v as AIProviderId, model: p?.defaultModel ?? s.ai.model } })
            }}
          />
        </Field>
        <Field label={t('set.aiModel')}>
          <Select options={prov.models} value={s.ai.model} onChange={e => setSettings({ ai: { ...s.ai, model: e.target.value } })} />
        </Field>
        <Field label={t('set.apiKey')} help={maskKey(prov.keyName) || t('set.noKey')}>
          <div className="flex gap-2">
            <TextInput value={draftKey} type="password" placeholder={maskKey(prov.keyName) || '••••••••'}
              onChange={e => setDraftKey(e.target.value)} />
          </div>
        </Field>
      </div>
      <div className="flex items-center gap-2 flex-wrap mt-3">
        <Button size="sm" variant="outline" icon={testing ? 'Loader' : 'Zap'} disabled={testing} onClick={() => void doTest()}>
          {t('set.testConn')}
        </Button>
        <Button size="sm" variant="primary" icon="Save" disabled={!draftKey} onClick={() => {
          setKey(prov.keyName, draftKey); setDraftKey(''); onSaved(t('set.keySaved'))
        }}>{t('common.save')}</Button>
        <Button size="sm" variant={s.ai.enabled ? 'outline' : 'ghost'} icon={s.ai.enabled ? 'Pause' : 'Play'}
          onClick={() => setSettings({ ai: { ...s.ai, enabled: !s.ai.enabled } })}>
          {s.ai.enabled ? t('wf.disable') : t('wf.enable')}
        </Button>
        <span className="text-[10px] text-[var(--color-dim2)] ltr">{prov.docsUrl}</span>
      </div>
      {testMsg && <div className={`mt-2 text-[11px] ${testMsg.startsWith('✔') ? 'text-emerald-500' : 'text-red-400'}`}>{testMsg}</div>}
    </Card>
  )
}

/* ---------- API & Integrations: کلیدهای سرویس‌ها ---------- */
const SERVICE_KEYS: Array<{ name: string; label: string; hint: string }> = [
  { name: 'youtube', label: 'YouTube Data API v3', hint: 'console.cloud.google.com' },
  { name: 'soundcloud', label: 'SoundCloud client_id', hint: 'soundcloud.com/you/apps' },
  { name: 'spotify_client_id', label: 'Spotify Client ID', hint: 'developer.spotify.com/dashboard' },
  { name: 'spotify_client_secret', label: 'Spotify Client Secret', hint: '—' },
  { name: 'instagram_graph_token', label: 'Instagram Graph token (own Business account)', hint: 'developers.facebook.com' },
  { name: 'telegram_bot_token', label: 'Telegram Bot token (optional)', hint: '@BotFather' },
]

function ApiKeysCard({ onSaved }: { onSaved: (msg: string) => void }) {
  const { t } = useT()
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  return (
    <Card>
      <SectionTitle icon="Key">
        {t('set.apiKeys')}
        <span className="ms-2 text-[9.5px] text-emerald-500">{secureAvailable() ? t('set.secureStore') : t('set.browserStore')}</span>
      </SectionTitle>
      <p className="text-[11.5px] text-[var(--color-dim)] leading-relaxed mb-3">{t('set.apiKeysNote')}</p>
      <div className="space-y-2">
        {SERVICE_KEYS.map(k => (
          <div key={k.name} className="flex items-center gap-2 flex-wrap">
            <span className="text-[11.5px] w-56 shrink-0">{k.label}</span>
            <TextInput type="password" className="flex-1 min-w-40" placeholder={maskKey(k.name) || '—'}
              value={drafts[k.name] ?? ''} onChange={e => setDrafts({ ...drafts, [k.name]: e.target.value })} />
            <Button size="sm" variant="primary" icon="Save" disabled={!drafts[k.name]}
              onClick={() => { setKey(k.name, drafts[k.name]); setDrafts({ ...drafts, [k.name]: '' }); onSaved(t('set.keySaved')) }}>
              {t('common.save')}
            </Button>
            {getKey(k.name) && <Button size="sm" variant="ghost" icon="Trash2" onClick={() => { setKey(k.name, ''); onSaved(t('set.keyRemoved')) }} />}
            <span className="text-[9.5px] text-[var(--color-dim2)] w-full sm:w-auto ltr">{k.hint}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ---------- Customization: نام، رنگ دوم، تم ---------- */
function CustomizationCard() {
  const { t } = useT()
  const s = useApp(x => x.data.settings)
  const setSettings = useApp(x => x.setSettings)
  return (
    <Card>
      <SectionTitle icon="Palette">{t('set.customization')}</SectionTitle>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('set.appName')} help={t('set.appNameHint')}>
          <TextInput value={s.custom.appName} onChange={e => setSettings({ custom: { ...s.custom, appName: e.target.value } })}
            placeholder="NEXUS HQ" />
        </Field>
        <Field label={t('set.secondaryColor')}>
          <div className="flex items-center gap-2">
            <input type="color" value={s.custom.secondaryColor} className="w-9 h-8 rounded-lg bg-transparent border border-[var(--color-line2)]"
              onChange={e => setSettings({ custom: { ...s.custom, secondaryColor: e.target.value } })} />
            <span className="text-[11px] nums text-[var(--color-dim)]">{s.custom.secondaryColor}</span>
          </div>
        </Field>
      </div>
      <p className="text-[10px] text-[var(--color-dim2)] mt-3 leading-relaxed">{t('set.brandingNote')}</p>
    </Card>
  )
}

function Toggle({ value, options, onChange }: { value: string; options: { v: string; l: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--color-line2)] p-0.5 bg-[var(--color-bg)] w-full">
      {options.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`flex-1 px-2.5 py-1.5 rounded-[7px] text-[12px] transition-all ${
            value === o.v ? 'bg-[var(--color-acc)] text-white font-medium' : 'text-[var(--color-dim)] hover:text-[var(--color-tx)]'
          }`}>
          {o.l}
        </button>
      ))}
    </div>
  )
}

/* ---------- کارت نسخه‌ی دسکتاپ ---------- */
/** بخش قفل برنامه — PIN محلی + قفل خودکار */
function SecurityCard({ onSaved }: { onSaved: (msg: string) => void }) {
  const { t } = useT()
  const [cfg, setCfg] = useState(() => readLock())
  const [pin, setPin] = useState('')
  const enabled = cfg.enabled && !!cfg.pinHash

  const save = async () => {
    const clean = pin.trim()
    if (!/^\d{4,8}$/.test(clean)) { onSaved(t('set.lockBadPin')); return }
    const pinHash = await hashPin(clean)
    const next = { ...cfg, enabled: true, pinHash }
    writeLock(next)
    setCfg(next)
    setPin('')
    onSaved(t('set.lockSaved'))
  }

  const disable = () => {
    clearLock()
    setCfg({ ...LOCK_DEFAULTS })
    setPin('')
    onSaved(t('set.lockRemoved'))
  }

  const setAuto = (min: number) => {
    const next = { ...cfg, autoLockMin: min }
    writeLock(next)
    setCfg(next)
  }

  const autoOptions = [
    { v: '-1', l: t('set.lockAutoOpen') },
    { v: '0', l: t('set.lockAutoNow') },
    ...[1, 5, 15, 30].map(n => ({ v: String(n), l: t('set.lockAutoMin', { n }) })),
  ]

  return (
    <Card>
      <SectionTitle icon="Lock" right={<span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-[var(--color-dim2)]'}`} />}>
        {t('set.security')}
      </SectionTitle>
      <p className="text-[12px] text-[var(--color-dim)] leading-relaxed mb-3">{t('set.securityNote')}</p>

      <div className="grid sm:grid-cols-2 gap-4 items-start">
        <Field label={t('set.lockPin')}>
          <div className="flex gap-2">
            <TextInput value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))} placeholder="••••" />
            <Button size="sm" variant="primary" icon="KeyRound" onClick={() => void save()}>{t('set.lockSave')}</Button>
          </div>
        </Field>
        <Field label={t('set.lockAuto')}>
          <Toggle value={String(cfg.autoLockMin)} options={autoOptions} onChange={v => setAuto(Number(v))} />
        </Field>
      </div>

      <div className="flex gap-2 flex-wrap mt-3">
        <Button size="sm" variant="outline" icon="Lock" disabled={!enabled}
          onClick={() => window.dispatchEvent(new Event('nexus:lock'))}>{t('set.lockNow')}</Button>
        {enabled && <Button size="sm" variant="ghost" icon="Trash2" onClick={disable}>{t('set.lockDisable')}</Button>}
      </div>
    </Card>
  )
}

function DesktopCard({ onSaved }: { onSaved: () => void }) {
  const { t } = useT()
  const [info, setInfo] = useState<AppInfo | null>(null)

  useEffect(() => { if (desktop) void desktop.info().then(setInfo) }, [])

  // نسخه‌ی اندروید — همان کارت با اطلاعات موبایل
  if (isMobile) {
    return (
      <Card>
        <SectionTitle icon="Smartphone" right={<span className="text-[10.5px] text-[var(--color-dim2)] nums ltr">v1.0.0</span>}>
          {t('set.mobile')}
        </SectionTitle>
        <div className="space-y-1.5 text-[11.5px] mb-3">
          <Row label={t('set.desktopPlatform')} value={`${mobilePlatform} · Capacitor`} />
          <Row label={t('set.dataFile')} value={mobileDataPath()} mono />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="primary" icon="Save" onClick={onSaved}>{t('set.saveNow')}</Button>
        </div>
        <p className="text-[10.5px] text-[var(--color-dim2)] mt-3 leading-relaxed">{t('set.mobileNote')}</p>
      </Card>
    )
  }

  if (!isDesktop) {
    return (
      <Card>
        <SectionTitle icon="Monitor">{t('set.desktop')}</SectionTitle>
        <p className="text-[12px] text-[var(--color-dim)] leading-relaxed">{t('set.desktopWeb')}</p>
      </Card>
    )
  }

  return (
    <Card>
      <SectionTitle icon="Monitor" right={info && <span className="text-[10.5px] text-[var(--color-dim2)] nums ltr">v{info.version}</span>}>
        {t('set.desktop')}
      </SectionTitle>
      {info && (
        <div className="space-y-1.5 text-[11.5px] mb-3">
          <Row label={t('set.desktopPlatform')} value={`${info.platform} · Electron ${info.electron}`} />
          <Row label={t('set.dataFile')} value={info.dataFile} mono />
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="primary" icon="Save" onClick={onSaved}>{t('set.saveNow')}</Button>
        <Button size="sm" variant="outline" icon="FolderOpen" onClick={() => void desktop?.openDataDir()}>{t('set.openDataDir')}</Button>
      </div>
      <p className="text-[10.5px] text-[var(--color-dim2)] mt-3 leading-relaxed">{t('set.shortcuts')}</p>
    </Card>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[var(--color-dim2)] w-24 shrink-0">{label}</span>
      <span className={`text-[var(--color-dim)] break-all ${mono ? 'ltr text-[11px]' : ''}`}>{value}</span>
    </div>
  )
}

/* ---------- راهنمای ساخت توکن ---------- */
const TOKENS_URL = 'https://github.com/settings/tokens'

function TokenHowTo() {
  const { t } = useT()
  const fmt = useFmt()
  const [open, setOpen] = useState(false)
  const steps = ['set.cloudHow1', 'set.cloudHow2', 'set.cloudHow3', 'set.cloudHow4', 'set.cloudHow5', 'set.cloudHow6'] as const

  return (
    <div className="mb-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-bg2)]/50 overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-start hover:bg-white/[.03] transition-colors">
        <Icon name="HelpCircle" size={14} className="text-[var(--color-acc)] shrink-0" />
        <span className="text-[12px] flex-1">{t('set.cloudHowTo')}</span>
        <Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-[var(--color-dim2)]" />
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-[var(--color-line)]">
          <ol className="space-y-2 mt-2">
            {steps.map((k, i) => (
              <li key={k} className="flex gap-2.5">
                <span className="mt-0.5 shrink-0 w-5 h-5 rounded-md bg-[var(--color-acc)]/15 text-[var(--color-acc)] text-[10.5px] font-semibold flex items-center justify-center nums">
                  {fmt.dg(i + 1)}
                </span>
                <span className="text-[11.5px] text-[var(--color-dim)] leading-relaxed">{t(k)}</span>
              </li>
            ))}
          </ol>
          <a href={TOKENS_URL} target="_blank" rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--color-acc)] hover:underline">
            <Icon name="ExternalLink" size={12} />
            {t('set.cloudHowOpen')}
          </a>
        </div>
      )}
    </div>
  )
}

/* ---------- کارت همگام‌سازی ابری ---------- */
type CloudState = 'idle' | 'busy'

function CloudCard() {
  const { t, lang } = useT()
  const fmt = useFmt()
  const { data, setSettings, replaceAll, setToast, persist } = useApp()
  const c = data.settings.cloud
  const [token, setTokenInput] = useState(cloud.getToken())
  const [showToken, setShowToken] = useState(false)
  const [gistId, setGistId] = useState(c.gistId)
  const [state, setState] = useState<CloudState>('idle')
  const [err, setErr] = useState('')

  useEffect(() => { setGistId(c.gistId) }, [c.gistId])

  const connected = !!cloud.getToken() && !!c.gistId
  const size = cloud.payloadSize(data)

  const fail = (e: unknown) => {
    const code = (e as { code?: string }).code
    setErr(code ? cloudError(lang, code) : (e as Error).message)
    setState('idle')
  }

  const connect = async () => {
    if (!token.trim()) { setErr(t('set.cloudNeedToken')); return }
    setErr(''); setState('busy')
    try {
      cloud.setToken(token.trim())
      await cloud.verifyToken()
      const { id, created } = await cloud.ensureGist(gistId.trim(), data)
      setSettings({ cloud: { ...c, gistId: id, lastSync: created ? new Date().toISOString() : c.lastSync } })
      setToast(created ? t('set.cloudOkNew') : t('set.cloudOkExisting'))
      setState('idle')
    } catch (e) { fail(e) }
  }

  const push = async () => {
    setErr(''); setState('busy')
    try {
      await persist()
      const fresh = useApp.getState().data
      const { id } = await cloud.ensureGist(c.gistId, fresh)
      await cloud.pushGist(id, fresh)
      setSettings({ cloud: { ...c, gistId: id, lastSync: new Date().toISOString() } })
      setToast(t('set.cloudPushed'))
      setState('idle')
    } catch (e) { fail(e) }
  }

  const pull = async () => {
    setErr(''); setState('busy')
    try {
      const res = await cloud.pullGist(c.gistId)
      if (!res) { setErr(t('set.cloudNoRemote')); setState('idle'); return }
      if (!confirm(t('set.cloudConfirmPull'))) { setState('idle'); return }
      await replaceAll(res.data as never)
      useApp.getState().setSettings({ cloud: { ...useApp.getState().data.settings.cloud, gistId: c.gistId, lastSync: new Date().toISOString() } })
      setToast(t('set.cloudPulled'))
      setState('idle')
    } catch (e) { fail(e) }
  }

  const disconnect = () => {
    if (!confirm(t('set.cloudConfirmDisconnect'))) return
    cloud.setToken('')
    setTokenInput('')
    setSettings({ cloud: { ...c, gistId: '', lastSync: '' } })
    setToast(t('set.cloudDisconnected'))
  }

  return (
    <Card>
      <SectionTitle icon={connected ? 'CloudCheck' : 'CloudOff'}
        right={
          <span className={`text-[10.5px] ${connected ? 'text-emerald-400' : 'text-[var(--color-dim2)]'}`}>
            {connected ? t('set.cloudOn') : t('set.cloudOff')}
          </span>
        }>
        {t('set.cloud')}
      </SectionTitle>

      <p className="text-[12px] text-[var(--color-dim)] leading-relaxed mb-3">{t('set.cloudIntro')}</p>

      <TokenHowTo />

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('set.cloudToken')} help={t('set.cloudTokenHint')}>
          <div className="relative">
            <TextInput type={showToken ? 'text' : 'password'} value={token} placeholder="ghp_..." className="ltr pe-9"
              onChange={e => setTokenInput(e.target.value)} />
            <button type="button" onClick={() => setShowToken(v => !v)}
              className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--color-dim2)] hover:text-[var(--color-tx)]">
              <Icon name={showToken ? 'EyeOff' : 'Eye'} size={14} />
            </button>
          </div>
        </Field>
        <Field label={t('set.cloudGistId')} help={t('set.cloudGistHint')}>
          <div className="flex gap-2">
            <TextInput value={gistId} placeholder={t('common.optional')} className="ltr flex-1"
              onChange={e => setGistId(e.target.value)} />
            {c.gistId && (
              <Button size="sm" variant="ghost" icon="Copy" title={t('set.cloudCopyId')}
                onClick={() => { void navigator.clipboard?.writeText(c.gistId); setToast(t('set.copied')) }} />
            )}
          </div>
        </Field>
      </div>

      <div className="flex gap-2 flex-wrap mt-4">
        <Button size="sm" variant="primary" icon={state === 'busy' ? 'Loader' : 'KeyRound'} disabled={state === 'busy'} onClick={() => void connect()}>
          {state === 'busy' ? t('set.cloudTesting') : t('set.cloudConnect')}
        </Button>
        <Button size="sm" variant="outline" icon="CloudUpload" disabled={!connected || state === 'busy'} onClick={() => void push()}>
          {t('set.cloudPush')}
        </Button>
        <Button size="sm" variant="outline" icon="CloudDownload" disabled={!connected || state === 'busy'} onClick={() => void pull()}>
          {t('set.cloudPull')}
        </Button>
        {connected && <Button size="sm" variant="ghost" icon="X" onClick={disconnect}>{t('set.cloudDisconnect')}</Button>}
      </div>

      {err && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/[.07] px-3 py-2 text-[11.5px] text-red-300">
          <Icon name="AlertTriangle" size={13} className="mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-[var(--color-line)] grid sm:grid-cols-2 gap-2 text-[11.5px]">
        <Row label={t('set.cloudLastSync')} value={c.lastSync ? fmt.relTime(c.lastSync) : t('common.never')} />
        <Row label={t('set.cloudSize')} value={`${fmt.dg((size / 1024).toFixed(1))} KB`} />
      </div>

      <label className="mt-3 flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="accent-[var(--color-acc)] w-3.5 h-3.5" checked={c.askOnExit}
          onChange={e => setSettings({ cloud: { ...c, askOnExit: e.target.checked } })} />
        <span className="text-[12px]">{t('set.cloudAuto')}</span>
        <span className="text-[10.5px] text-[var(--color-dim2)]">— {t('set.cloudAutoHint')}</span>
      </label>

      <p className="text-[10.5px] text-[var(--color-dim2)] mt-3 leading-relaxed">
        {t('set.cloudPrivacy')} {t('set.cloudLimits')}
      </p>
    </Card>
  )
}

/* ---------- ویرایشگر ماژول ---------- */
function ModuleEditor({ module, onClose, onSave }: { module: ModuleDef; onClose: () => void; onSave: (p: Partial<ModuleDef>) => void }) {
  const { t, m: ml, f: fl } = useT()
  const fmt = useFmt()
  const [label, setLabel] = useState(module.label)
  const [labelFa, setLabelFa] = useState(module.labelFa ?? '')
  const [icon, setIcon] = useState(module.icon)
  const [group, setGroup] = useState(module.group)
  const [fields, setFields] = useState<FieldDef[]>(module.fields)

  const upd = (i: number, p: Partial<FieldDef>) => setFields(fs => fs.map((f, j) => (j === i ? { ...f, ...p } : f)))

  return (
    <Modal open onClose={onClose} wide title={`${t('set.editModule')} — ${ml(module)}`}
      footer={<>
        <Button variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" size="sm" icon="Check"
          onClick={() => onSave({ label, labelFa: labelFa.trim() || undefined, icon, group, fields })}>
          {t('common.save')}
        </Button>
      </>}>
      <div className="grid sm:grid-cols-2 gap-3 mb-3">
        <Field label={t('set.modTitle')}><TextInput value={label} className="ltr" onChange={e => setLabel(e.target.value)} /></Field>
        <Field label={t('set.modTitleFa')}><TextInput value={labelFa} onChange={e => setLabelFa(e.target.value)} /></Field>
        <Field label={t('set.modIcon')} help={t('set.modIconHint')}>
          <>
            <TextInput value={icon} list="icon-list" className="ltr" onChange={e => setIcon(e.target.value)} />
            <datalist id="icon-list">{ICON_NAMES.map(n => <option key={n} value={n} />)}</datalist>
          </>
        </Field>
        <Field label={t('set.modGroup')}>
          <Select options={['core', 'media', 'business', 'ops']} value={group}
            onChange={e => setGroup(e.target.value as ModuleDef['group'])} />
        </Field>
      </div>

      <div className="text-[11px] font-medium text-[var(--color-dim)] mb-2">
        {t('set.fields')} (<span className="nums">{fmt.dg(fields.length)}</span>)
      </div>
      <div className="space-y-1.5 max-h-[38vh] overflow-y-auto pe-1">
        {fields.map((f, i) => (
          <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-[var(--color-line)]">
            <TextInput value={f.label} className="py-1 text-[12px] flex-1 ltr" onChange={e => upd(i, { label: e.target.value })} />
            <TextInput value={f.labelFa ?? ''} placeholder={fl(f)} className="py-1 text-[12px] flex-1"
              onChange={e => upd(i, { labelFa: e.target.value || undefined })} />
            <select value={f.type} onChange={e => upd(i, { type: e.target.value as FieldType })}
              className="rounded-lg bg-[var(--color-bg)] border border-[var(--color-line2)] px-2 py-1 text-[11.5px] cursor-pointer ltr">
              {FIELD_TYPES.map(ty => <option key={ty} value={ty}>{ty}</option>)}
            </select>
            {f.type === 'select' && (
              <TextInput value={(f.options ?? []).join(',')} placeholder="options,csv" className="py-1 text-[11px] w-32 ltr"
                onChange={e => upd(i, { options: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} />
            )}
            <button onClick={() => upd(i, { col: !f.col })} title={t('set.showInTable')}
              className={`p-1 rounded ${f.col ? 'text-[var(--color-acc)]' : 'text-[var(--color-dim2)]'}`}>
              <Icon name="Table2" size={13} />
            </button>
            <button onClick={() => setFields(fs => fs.filter((_, j) => j !== i))} className="p-1 text-[var(--color-dim2)] hover:text-red-400">
              <Icon name="X" size={13} />
            </button>
          </div>
        ))}
        {!fields.length && <Empty icon="Columns3" title={t('module.noFields')} />}
      </div>
      <Button size="sm" variant="ghost" icon="Plus" className="mt-2"
        onClick={() => setFields(fs => [...fs, { key: 'f_' + Date.now().toString(36), label: 'New Field', type: 'text', col: true }])}>
        {t('set.newField')}
      </Button>
    </Modal>
  )
}
