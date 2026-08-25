import { useState, useEffect, useRef } from 'react'
import { useApp, refreshCloudNow, startLiveSync, stopLiveCloudSync } from '../store/useApp'
import { exportJSON, importJSON } from '../lib/backup'
import { listSnapshots, getSnapshot, storageBackend, saveDoc } from '../lib/db'
import type { Snapshot } from '../store/types'
import { makeCustomModule, CORE_MODULES } from '../domain/schema'
import type { ModuleDef, FieldDef, FieldType } from '../domain/schema'
import { Card, SectionTitle, Button, Field, TextInput, Icon, Modal, Badge, Empty } from '../components/ui/Primitives'
import { Dropdown } from '../components/ui/Dropdown'
import { ICON_NAMES } from '../components/ui/icons.tsx'
import { useT, cloudError } from '../i18n'
import { useFmt } from '../lib/useFmt'
import { desktop, isDesktop } from '../lib/desktop'
import { isMobile, mobilePlatform, mobileDataPath } from '../lib/mobile'
import type { AppInfo } from '../lib/desktop'
import { checkForUpdates, cmpVersion, fmtDate, APP_VERSION } from '../lib/updater'
import type { UpdateRelease, UpdateCheckResult, DownloadProgress } from '../lib/desktop'
import * as cloud from '../lib/cloud'
import { isFirebaseConfigured } from '../lib/firebase'
import {
  readLock, setPasscode, disableLock, setAutoLockMin, setBiometric,
  biometricAvailable, cryptoAvailable,
} from '../lib/lock'
import { getAiKey, setAiKey as storeAiKey, chat as aiChat, AiError } from '../lib/ai'
import { getKey, setKey as setKeySecret } from '../lib/secrets'
import { aiProviderById, AI_PROVIDERS, testAIConnection } from '../ai/providers'
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
  const [showTpl, setShowTpl] = useState(false)

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
            <Dropdown value={s.currency} onChange={v => setSettings({ currency: v })}
              options={['$', '€', '£', '﷼', 'T'].map(o => ({ value: o, label: o }))} />
          </Field>
          <Field label={t('set.focusCount')} help={t('set.focusCountHint')}>
            <Dropdown value={String(s.focusCount)} onChange={v => setSettings({ focusCount: Number(v) })}
              options={['1', '2', '3', '4', '5'].map(o => ({ value: o, label: o }))} />
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
        <div className="grid sm:grid-cols-3 gap-4">
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
        </div>

        {/* پوسته: تیره / روشن / سیستم + افکت شیشه‌ای */}
        <div className="mt-4 pt-4 border-t border-[var(--color-line)] grid sm:grid-cols-2 gap-4">
          <Field label={t('set.theme')} help={t('set.themeHint')}>
            <Toggle
              value={s.theme ?? 'dark'}
              options={[
                { v: 'dark', l: t('set.themeDark') },
                { v: 'light', l: t('set.themeLight') },
                { v: 'auto', l: t('set.themeSystem') },
              ]}
              onChange={v => setSettings({ theme: v as 'dark' | 'light' | 'auto' })}
            />
          </Field>
          <Field label={t('set.glass')} help={t('set.glassHint')}>
            <Toggle
              value={s.glass ? 'on' : 'off'}
              options={[{ v: 'on', l: t('common.yes') }, { v: 'off', l: t('common.no') }]}
              onChange={v => setSettings({ glass: v === 'on' })}
            />
          </Field>
        </div>
      </Card>

      {/* ---------- branding ---------- */}
      <BrandingCard />

      {/* ---------- security ---------- */}
      <SecurityCard />

      {/* ---------- ai ---------- */}
      <AiCard />

      {/* ---------- social ---------- */}
      <SocialCard />

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
      <UpdateCard />

      {/* ---------- modules ---------- */}
      <Card id="modules">
        <SectionTitle icon="Blocks" right={<span className="text-[10.5px] text-[var(--color-dim2)] nums">{t('set.moduleCount', { n: fmt.dg(data.modules.length) })}</span>}>
          {t('set.modules')}
        </SectionTitle>
        <p className="text-[12px] text-[var(--color-dim)] mb-3 leading-relaxed">{t('set.modulesNote')}</p>

        <div className="flex gap-2 mb-4 flex-wrap">
          <TextInput value={newMod} placeholder={t('set.newModuleName')} className="py-1.5 text-[12.5px] flex-1 min-w-[180px]"
            onChange={e => setNewMod(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newMod.trim()) { addModule(makeCustomModule(newMod.trim())); setNewMod(''); setToast(t('set.moduleCreated')) }
            }} />
          <Button size="sm" variant="primary" icon="Plus" disabled={!newMod.trim()}
            onClick={() => { addModule(makeCustomModule(newMod.trim())); setNewMod(''); setToast(t('set.moduleCreated')) }}>
            {t('common.add')}
          </Button>
          <Button size="sm" variant="outline" icon="LayoutGrid" onClick={() => setShowTpl(true)}>
            {t('set.fromTemplate')}
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
      {showTpl && <NewModuleModal open={showTpl} onClose={() => setShowTpl(false)}
        onCreate={m => { addModule(m); setShowTpl(false); setToast(t('set.moduleCreated')) }} />}
    </div>
  )
}

/* ---------- سوییچ چندگزینه‌ای ---------- */
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

/* ---------- کارت همگام‌سازی لحظه‌ای Firebase ---------- */
type CloudState = 'idle' | 'busy'

function CloudCard() {
  const { t, lang } = useT()
  const fmt = useFmt()
  const { data, setSettings, setToast } = useApp()
  const c = data.settings.cloud
  const [user, setUser] = useState<cloud.CloudUser | null>(() => cloud.getCurrentUser())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<CloudState>('idle')
  const [err, setErr] = useState('')
  const configured = isFirebaseConfigured()
  const size = cloud.payloadSize(data)

  useEffect(() => {
    void cloud.initCloudAuth().finally(() => setUser(cloud.getCurrentUser()))
    return cloud.watchCloudUser(setUser)
  }, [])

  const fail = (e: unknown) => {
    const code = e instanceof cloud.CloudError ? e.code : 'unknown'
    setErr(cloudError(lang, code)); setState('idle')
  }
  const signIn = async (create = false) => {
    setErr(''); setState('busy')
    try {
      if (create) await cloud.createEmailAccount(email, password)
      else await cloud.signInWithEmail(email, password)
      setPassword(''); setToast(t(create ? 'set.firebaseAccountCreated' : 'set.firebaseSignedIn')); setState('idle')
    } catch (e) { fail(e) }
  }
  const refresh = async () => {
    setErr(''); setState('busy')
    try {
      const changed = await refreshCloudNow()
      setToast(t(changed ? 'set.cloudPulled' : 'set.cloudUpToDate')); setState('idle')
    } catch (e) { fail(e) }
  }
  const signOut = async () => {
    setErr(''); setState('busy')
    try { await cloud.signOutCloud(); setToast(t('set.firebaseSignedOut')); setState('idle') } catch (e) { fail(e) }
  }

  return <Card>
    <SectionTitle icon={user ? 'CloudCheck' : 'CloudOff'} right={<span className={`text-[10.5px] ${user ? 'text-emerald-400' : 'text-[var(--color-dim2)]'}`}>{user ? t('set.cloudOn') : t('set.cloudOff')}</span>}>{t('set.firebaseTitle')}</SectionTitle>
    <p className="text-[12px] text-[var(--color-dim)] leading-relaxed mb-3">{t('set.firebaseIntro')}</p>
    {!configured ? <div className="rounded-lg border border-amber-500/25 bg-amber-500/[.07] px-3 py-2 text-[11.5px] text-amber-300">{t('set.firebaseNotConfigured')}</div>
      : !user ? <div className="space-y-3 max-w-md">
        <Field label={t('set.firebaseEmail')}><TextInput type="email" value={email} className="ltr" placeholder="name@example.com" onChange={e => setEmail(e.target.value)} /></Field>
        <Field label={t('set.firebasePassword')} help={t('set.firebasePasswordHint')}><TextInput type="password" value={password} className="ltr" onChange={e => setPassword(e.target.value)} /></Field>
        <div className="flex gap-2 flex-wrap"><Button size="sm" variant="primary" icon={state === 'busy' ? 'Loader' : 'LogIn'} disabled={state === 'busy' || !email || !password} onClick={() => void signIn()}>{t('set.firebaseSignIn')}</Button><Button size="sm" variant="outline" icon="UserPlus" disabled={state === 'busy' || !email || !password} onClick={() => void signIn(true)}>{t('set.firebaseCreateAccount')}</Button></div>
      </div>
      : <><div className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] px-3 py-2.5"><div className="w-9 h-9 rounded-full grid place-items-center bg-[var(--color-acc)]/15 text-[var(--color-acc)]"><Icon name="User" size={16} /></div><div className="min-w-0 flex-1"><div className="text-[12.5px] font-medium truncate">{t('set.firebaseAccount')}</div><div className="text-[11px] text-[var(--color-dim2)] truncate ltr">{user.email || '—'}</div></div></div><div className="flex gap-2 flex-wrap mt-4"><Button size="sm" variant="outline" icon="RefreshCw" disabled={state === 'busy'} onClick={() => void refresh()}>{t('set.cloudRefresh')}</Button><Button size="sm" variant="ghost" icon="LogOut" disabled={state === 'busy'} onClick={() => void signOut()}>{t('set.firebaseSignOut')}</Button></div></>}
    {err && <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/[.07] px-3 py-2 text-[11.5px] text-red-300"><Icon name="AlertTriangle" size={13} className="mt-0.5 shrink-0" /><span>{err}</span></div>}
    <div className="mt-4 pt-3 border-t border-[var(--color-line)] grid sm:grid-cols-2 gap-2 text-[11.5px]"><Row label={t('set.cloudLastSync')} value={c.lastSync ? fmt.relTime(c.lastSync) : t('common.never')} /><Row label={t('set.cloudSize')} value={`${fmt.dg((size / 1024).toFixed(1))} KB`} /></div>
    <label className="mt-3 flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-[var(--color-acc)] w-3.5 h-3.5" checked={c.autoSync} onChange={e => setSettings({ cloud: { ...c, autoSync: e.target.checked } })} /><span className="text-[12px]">{t('set.cloudAutoSync')}</span><span className="text-[10.5px] text-[var(--color-dim2)]">— {t('set.firebaseAutoSyncHint')}</span></label>
    <label className="mt-2.5 flex items-center gap-2 cursor-pointer"><input type="checkbox" className="accent-[var(--color-acc)] w-3.5 h-3.5" checked={c.autoPull} onChange={e => { setSettings({ cloud: { ...c, autoPull: e.target.checked } }); if (e.target.checked) startLiveSync(); else stopLiveCloudSync() }} /><span className="text-[12px]">{t('set.cloudAutoPull')}</span><span className="text-[10.5px] text-[var(--color-dim2)]">— {t('set.firebaseLiveHint')}</span></label>
  </Card>
}

/* ---------- برند (نام، لوگو، آیکون) ---------- */
function BrandingCard() {
  const { data, setSettings, setToast, persist } = useApp()
  const { t } = useT()
  const b = data.settings.branding
  const logoRef = useRef<HTMLInputElement>(null)
  const iconRef = useRef<HTMLInputElement>(null)

  const readImage = (file: File, max: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale)
        const c = document.createElement('canvas')
        c.width = w; c.height = h
        c.getContext('2d')!.drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(url)
        resolve(c.toDataURL('image/png'))
      }
      img.onerror = e => { URL.revokeObjectURL(url); reject(e) }
      img.src = url
    })

  const onLogo = async (f?: File) => {
    if (!f) return
    setSettings({ branding: { ...b, logo: await readImage(f, 256) } })
    setToast(t('set.logoUpdated'))
  }
  const onIcon = async (f?: File) => {
    if (!f) return
    setSettings({ branding: { ...b, appIcon: await readImage(f, 512) } })
    setToast(t('set.iconUpdated'))
    void persist()
  }

  return (
    <Card>
      <SectionTitle icon="Palette">{t('set.branding')}</SectionTitle>
      <p className="text-[12px] text-[var(--color-dim)] mb-3 leading-relaxed">{t('set.brandingNote')}</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('set.appName')}>
          <TextInput value={b.appName} onChange={e => setSettings({ branding: { ...b, appName: e.target.value } })} />
        </Field>
        <Field label={t('set.tagline')}>
          <TextInput value={b.tagline ?? ''} onChange={e => setSettings({ branding: { ...b, tagline: e.target.value } })} />
        </Field>
      </div>
      <div className="grid sm:grid-cols-2 gap-4 mt-4">
        <Field label={t('set.logo')} help={t('set.logoHint')}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl overflow-hidden grid place-items-center border border-[var(--color-line2)]"
              style={b.logo ? undefined : { background: 'linear-gradient(135deg, var(--color-acc), #a855f7)' }}>
              {b.logo ? <img src={b.logo} alt="" className="w-full h-full object-cover" /> : <Icon name="Image" size={20} className="text-white" />}
            </div>
            <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/svg+xml" hidden
              onChange={e => void onLogo(e.target.files?.[0])} />
            <Button size="sm" variant="outline" icon="Upload" onClick={() => logoRef.current?.click()}>{t('set.upload')}</Button>
            {b.logo && <Button size="sm" variant="ghost" icon="X" onClick={() => setSettings({ branding: { ...b, logo: undefined } })} />}
          </div>
        </Field>
        <Field label={t('set.appIcon')} help={t('set.appIconHint')}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden grid place-items-center border border-[var(--color-line2)]"
              style={b.appIcon ? undefined : { background: 'linear-gradient(135deg, var(--color-acc), #a855f7)' }}>
              {b.appIcon ? <img src={b.appIcon} alt="" className="w-full h-full object-cover" /> : <Icon name="Image" size={20} className="text-white" />}
            </div>
            <input ref={iconRef} type="file" accept="image/png,image/jpeg" hidden
              onChange={e => void onIcon(e.target.files?.[0])} />
            <Button size="sm" variant="outline" icon="Upload" onClick={() => iconRef.current?.click()}>{t('set.upload')}</Button>
            {b.appIcon && <Button size="sm" variant="ghost" icon="X" onClick={() => setSettings({ branding: { ...b, appIcon: undefined } })} />}
          </div>
        </Field>
      </div>
    </Card>
  )
}

/* ---------- کارت قفل و امنیت ---------- */
function SecurityCard() {
  const { t, lang } = useT()
  const { setToast } = useApp()
  const [cfg, setCfg] = useState(readLock())
  const [edit, setEdit] = useState(false)
  const [code, setCode] = useState('')
  const [currentCode, setCurrentCode] = useState('')
  const [confirmCode, setConfirmCode] = useState('')
  const [hint, setHintInput] = useState(cfg.hint)
  const [autoMin, setAutoMin] = useState(cfg.autoLockMin)
  const [bio, setBio] = useState(cfg.biometric)
  const [bioAvail, setBioAvail] = useState(false)

  const refresh = () => setCfg(readLock())

  useEffect(() => {
    if (!isMobile) return
    void biometricAvailable().then(setBioAvail)
  }, [])

  const save = async () => {
    const clean = code.replace(/[^\d]/g, '')
    if (clean.length < 4) { alert(t('set.passcodeShort')); return }
    if (clean !== confirmCode.replace(/[^\d]/g, '')) { alert(t('set.passcodeMismatch')); return }
    try {
      const res = await setPasscode(clean, { hint: hint.trim(), biometric: bio && bioAvail, current: currentCode })
      if (!res.ok) {
        if (res.error === 'current') alert(lang === 'fa' ? 'رمز فعلی اشتباه است.' : 'Current passcode is wrong.')
        else alert(t('set.passcodeShort'))
        return
      }
      setAutoLockMin(autoMin)
      setBiometric(bio && bioAvail)
      refresh(); setEdit(false); setCode(''); setCurrentCode(''); setConfirmCode('')
      setToast(t('set.passcodeSet'))
    } catch (e) {
      alert(t('common.error') + ': ' + (e as Error).message)
    }
  }

  const remove = () => {
    if (!confirm(t('set.forgotWarn'))) return
    disableLock(); refresh(); setToast(t('set.passcodeRemoved'))
  }

  const autoOpts = [
    { v: '0', l: t('set.autoLock0') },
    { v: '1', l: t('set.autoLock1') },
    { v: '5', l: t('set.autoLock5') },
    { v: '30', l: t('set.autoLock30') },
    { v: '-1', l: t('set.autoLockOpen') },
  ]

  return (
    <Card id="security">
      <SectionTitle icon="Shield"
        right={cfg.enabled && <span className="text-[10.5px] text-emerald-400">{t('set.cloudOn')}</span>}>
        {t('set.security')}
      </SectionTitle>
      <p className="text-[12px] text-[var(--color-dim)] leading-relaxed mb-3">{t('set.securityNote')}</p>

      {!cfg.enabled ? (
        <Button variant="primary" size="sm" icon="KeyRound" onClick={() => setEdit(true)} disabled={!cryptoAvailable()}>
          {t('set.setPasscode')}
        </Button>
      ) : (
        <>
          <div className="flex gap-2 flex-wrap mb-3">
            <Button variant="outline" size="sm" icon="Pencil" onClick={() => { setCurrentCode(''); setHintInput(cfg.hint); setAutoMin(cfg.autoLockMin); setBio(cfg.biometric); setEdit(true) }}>
              {t('set.changePasscode')}
            </Button>
            <Button variant="ghost" size="sm" icon="Trash2" onClick={remove}>{t('set.removePasscode')}</Button>
            <Button variant="outline" size="sm" icon="Key" onClick={() => window.dispatchEvent(new Event('nexus:lock'))}>
              {t('set.lockNow')}
            </Button>
          </div>
          <div className="space-y-3">
            {!!cfg.hint && <Row label={t('set.hint')} value={cfg.hint} />}
            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-[var(--color-dim)]">{t('set.autoLock')}:</span>
              <Dropdown className="w-44" value={String(cfg.autoLockMin)}
                onChange={nv => { setAutoLockMin(Number(nv)); refresh() }}
                options={autoOpts.map(o => ({ value: o.v, label: o.l }))} />
            </div>
            {isMobile && bioAvail && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-[var(--color-acc)] w-3.5 h-3.5" checked={cfg.biometric}
                  onChange={e => { setBiometric(e.target.checked); refresh(); if (e.target.checked) setToast(t('set.biometricOn')) }} />
                <span className="text-[12px]">{t('set.biometric')}</span>
                <span className="text-[10.5px] text-[var(--color-dim2)]">— {t('set.biometricHint')}</span>
              </label>
            )}
          </div>
        </>
      )}

      {!cryptoAvailable() && (
        <p className="text-[11px] text-amber-400/90 mt-2">
          {lang === 'fa' ? 'قفل در این محیط در دسترس نیست (نیاز به https یا نسخه‌ی ویندوز/اندروید دارد).' : 'Locking is unavailable here (needs https or the Windows/Android app).'}
        </p>
      )}

      {edit && (
        <Modal open onClose={() => setEdit(false)} title={cfg.enabled ? t('set.changePasscode') : t('set.setPasscode')}
          footer={<>
            <Button variant="ghost" size="sm" onClick={() => setEdit(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" size="sm" icon="Check" onClick={save}>{t('common.save')}</Button>
          </>}>
          <div className="grid sm:grid-cols-2 gap-3">
            {cfg.enabled && (
              <Field label={lang === 'fa' ? 'رمز فعلی' : 'Current passcode'}>
                <TextInput type="password" inputMode="numeric" value={currentCode} className="ltr"
                  onChange={e => setCurrentCode(e.target.value)} />
              </Field>
            )}
            <Field label={t('set.passcode')}>
              <TextInput type="password" inputMode="numeric" value={code} className="ltr" onChange={e => setCode(e.target.value)} />
            </Field>
            <Field label={t('set.passcodeConfirm')}>
              <TextInput type="password" inputMode="numeric" value={confirmCode} className="ltr" onChange={e => setConfirmCode(e.target.value)} />
            </Field>
          </div>
          <div className="mt-3 space-y-3">
            <Field label={t('set.hint')}>
              <TextInput value={hint} placeholder={t('set.hintPh')} onChange={e => setHintInput(e.target.value)} />
            </Field>
            <Field label={t('set.autoLock')}>
              <Dropdown value={String(autoMin)} onChange={nv => setAutoMin(Number(nv))}
                options={autoOpts.map(o => ({ value: o.v, label: o.l }))} />
            </Field>
            {isMobile && bioAvail && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="accent-[var(--color-acc)] w-3.5 h-3.5" checked={bio} onChange={e => setBio(e.target.checked)} />
                <span className="text-[12px]">{t('set.biometric')}</span>
              </label>
            )}
          </div>
        </Modal>
      )}
    </Card>
  )
}

/* ---------- کارت هوش مصنوعی ---------- */
function AiCard() {
  const { t } = useT()
  const { data, setSettings, setToast } = useApp()
  const ai = data.settings.ai
  const [key, setKey] = useState(getAiKey())
  const [showKey, setShowKey] = useState(false)
  const [baseUrl, setBaseUrl] = useState(ai.baseUrl)
  const [model, setModel] = useState(ai.model)
  const [state, setState] = useState<'idle' | 'busy'>('idle')

  /* کلید سرویس‌های جریان‌های کاری (OpenAI / Gemini / Claude) — در مخزن امن */
  const [wfProvider, setWfProvider] = useState(ai.provider || 'openai')
  const [wfModel, setWfModel] = useState(ai.model || 'gpt-4o-mini')
  const [wfKey, setWfKey] = useState(getKey(aiProviderById(wfProvider as never)?.keyName ?? 'ai_openai') ?? '')
  const [wfShow, setWfShow] = useState(false)
  const [wfState, setWfState] = useState<'idle' | 'busy'>('idle')

  const save = async () => {
    if (!key.trim()) { alert(t('set.aiNeedKey')); return }
    storeAiKey(key.trim())
    setSettings({ ai: { ...ai, baseUrl: baseUrl.trim() || 'https://api.openai.com/v1', model: model.trim() || 'gpt-4o-mini' } })
    setState('busy')
    try {
      await aiChat([{ role: 'user', content: 'Reply with exactly: OK' }], { baseUrl: baseUrl.trim(), model: model.trim() })
      setToast(t('set.aiOk'))
    } catch (e) {
      alert(t('common.error') + ': ' + ((e as Error).message || (e as AiError).code))
    } finally {
      setState('idle')
    }
  }

  const saveWf = async () => {
    const prov = aiProviderById(wfProvider as never)
    if (!wfKey.trim()) { alert(t('set.aiNeedKey')); return }
    setKeySecret(prov?.keyName ?? 'ai_openai', wfKey.trim())
    setSettings({ ai: { ...ai, provider: wfProvider, model: wfModel, enabled: true } })
    setWfState('busy')
    try {
      const r = await testAIConnection(wfProvider as never, wfModel, wfKey.trim())
      if (r.ok) setToast(t('set.aiOk'))
      else alert(t('common.error') + ': ' + r.detail)
    } finally {
      setWfState('idle')
    }
  }

  return (
    <Card id="ai">
      <SectionTitle icon="Bot"
        right={<span className={`text-[10.5px] ${getAiKey() ? 'text-emerald-400' : 'text-[var(--color-dim2)]'}`}>{getAiKey() ? t('set.cloudOn') : t('set.cloudOff')}</span>}>
        {t('set.ai')}
      </SectionTitle>
      <p className="text-[12px] text-[var(--color-dim)] leading-relaxed mb-3">{t('set.aiNote')}</p>

      {/* Agent Runner — OpenAI-compatible */}
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label={t('set.aiKey')} help={t('set.aiKeyHint')}>
          <div className="relative">
            <TextInput type={showKey ? 'text' : 'password'} value={key} placeholder="sk-..." className="ltr pe-9"
              onChange={e => setKey(e.target.value)} />
            <button type="button" onClick={() => setShowKey(v => !v)}
              className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--color-dim2)] hover:text-[var(--color-tx)]">
              <Icon name={showKey ? 'EyeOff' : 'Eye'} size={14} />
            </button>
          </div>
        </Field>
        <Field label={t('set.aiModel')}>
          <TextInput value={model} className="ltr" placeholder="gpt-4o-mini" onChange={e => setModel(e.target.value)} />
        </Field>
      </div>
      <div className="mt-3">
        <Field label={t('set.aiBaseUrl')} help={t('set.aiBaseUrlHint')}>
          <TextInput value={baseUrl} className="ltr" onChange={e => setBaseUrl(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4">
        <Button size="sm" variant="primary" icon={state === 'busy' ? 'Loader' : 'Check'} disabled={state === 'busy'} onClick={save}>
          {t('set.aiSave')}
        </Button>
      </div>

      {/* جریان‌های کاری و تحلیل — OpenAI / Gemini / Claude */}
      <div className="mt-5 pt-4 border-t border-[var(--color-line)]">
        <div className="text-[12px] font-semibold mb-2 flex items-center gap-1.5">
          <Icon name="Workflow" size={13} className="text-[var(--color-acc)]" />
          {t('set.aiWorkflow')}
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label={t('set.aiProvider')}>
            <Dropdown value={wfProvider}
              options={AI_PROVIDERS.map(p => ({ value: p.id, label: p.label }))}
              onChange={v => { setWfProvider(v); setWfModel(aiProviderById(v as never)?.defaultModel ?? wfModel); setWfKey(getKey(aiProviderById(v as never)?.keyName ?? '') ?? '') }} />
          </Field>
          <Field label={t('set.aiModel')}>
            <Dropdown value={wfModel}
              options={aiProviderById(wfProvider as never)?.models.map(m => ({ value: m, label: m })) ?? []}
              onChange={v => setWfModel(v)} />
          </Field>
          <Field label={t('set.aiKey')}>
            <div className="relative">
              <TextInput type={wfShow ? 'text' : 'password'} value={wfKey} placeholder="sk-..." className="ltr pe-9"
                onChange={e => setWfKey(e.target.value)} />
              <button type="button" onClick={() => setWfShow(v => !v)}
                className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--color-dim2)] hover:text-[var(--color-tx)]">
                <Icon name={wfShow ? 'EyeOff' : 'Eye'} size={14} />
              </button>
            </div>
          </Field>
        </div>
        <div className="mt-3">
          <Button size="sm" variant="outline" icon={wfState === 'busy' ? 'Loader' : 'Plug'} disabled={wfState === 'busy'} onClick={saveWf}>
            {t('set.aiTestSave')}
          </Button>
        </div>
      </div>
    </Card>
  )
}

/* ---------- کارت شبکه‌های اجتماعی ---------- */
function SocialCard() {
  const { t } = useT()
  const { data, setSettings, setToast } = useApp()
  const social = data.settings.social
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

  const setKeyField = (k: keyof typeof social.keys, v: string) => {
    setSettings({ social: { ...social, keys: { ...social.keys, [k]: v } } })
  }

  return (
    <Card id="social">
      <SectionTitle icon="Share2"
        right={social.profiles.length > 0 && (
          <span className="text-[10.5px] text-[var(--color-dim2)] nums">{social.profiles.length} {t('social.profiles')}</span>
        )}>
        {t('set.social')}
      </SectionTitle>
      <p className="text-[12px] text-[var(--color-dim)] leading-relaxed mb-3">{t('set.socialNote')}</p>

      <Field label={t('set.socialProxy')} help={t('set.socialProxyHint')}>
        <TextInput value={social.proxyUrl} className="ltr" placeholder="https://your-worker.workers.dev"
          onChange={e => setSettings({ social: { ...social, proxyUrl: e.target.value } })} />
      </Field>

      <div className="mt-4 pt-4 border-t border-[var(--color-line)] grid sm:grid-cols-2 gap-4">
        <Field label={t('social.interval')}>
          <Dropdown value={String(social.intervalMin)}
            options={['0', '5', '15', '30', '60'].map(v => ({ value: v, label: v === '0' ? t('social.onVisible') : v + ' ' + t('social.minutes') }))}
            onChange={v => setSettings({ social: { ...social, intervalMin: Number(v) } })} />
        </Field>
        <Field label={t('social.optionalKeys')} help={t('social.keysHint')}>
          <div className="space-y-2">
            {(['youtube', 'instagram', 'rapidapi'] as const).map(k => (
              <div key={k} className="relative">
                <TextInput type={showKeys[k] ? 'text' : 'password'} value={social.keys[k] ?? ''} className="ltr pe-9 text-[12px]"
                  placeholder={k} onChange={e => { setKeyField(k, e.target.value); setToast(t('social.saved')) }} />
                <button type="button" onClick={() => setShowKeys(s => ({ ...s, [k]: !s[k] }))}
                  className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--color-dim2)]">
                  <Icon name={showKeys[k] ? 'EyeOff' : 'Eye'} size={13} />
                </button>
              </div>
            ))}
          </div>
        </Field>
      </div>

      <label className="mt-3 flex items-center gap-2 cursor-pointer">
        <input type="checkbox" className="accent-[var(--color-acc)] w-3.5 h-3.5" checked={social.autoRefresh}
          onChange={e => setSettings({ social: { ...social, autoRefresh: e.target.checked } })} />
        <span className="text-[12px]">{t('set.socialAutoRefresh')}</span>
      </label>
    </Card>
  )
}

/* ---------- ساخت دپارتمان از قالب ---------- */
interface Tpl {
  icon: string
  key: string
  fa: string
  en: string
  dFa: string
  dEn: string
  fields: FieldDef[]
}

const F = (key: string, label: string, type: FieldType, extra: Partial<FieldDef> = {}): FieldDef =>
  ({ key, label, type, ...extra })

const TEMPLATES: Tpl[] = [
  {
    icon: 'Radio', key: 'podcast', fa: 'پادکست', en: 'Podcast',
    dFa: 'قسمت‌ها، مهمان‌ها و لینک پخش', dEn: 'Episodes, guests and play links',
    fields: [
      F('title', 'Title', 'text', { col: true }),
      F('guest', 'Guest', 'text', { col: true }),
      F('status', 'Status', 'select', { col: true, options: ['Idea', 'Recording', 'Editing', 'Published'] }),
      F('publishDate', 'Publish Date', 'date', { col: true }),
      F('duration', 'Duration (min)', 'number'),
      F('link', 'Link', 'url'),
      F('notes', 'Notes', 'textarea'),
    ],
  },
  {
    icon: 'GraduationCap', key: 'courses', fa: 'دوره آموزشی', en: 'Courses',
    dFa: 'دوره‌ها، دانشجوها و قیمت', dEn: 'Courses, students and pricing',
    fields: [
      F('title', 'Course', 'text', { col: true }),
      F('category', 'Category', 'select', { col: true, options: ['SEO', 'Music', 'Business', 'Marketing', 'Other'] }),
      F('price', 'Price', 'money', { col: true }),
      F('students', 'Students', 'number', { col: true }),
      F('status', 'Status', 'select', { col: true, options: ['Draft', 'Live', 'Paused'] }),
      F('startDate', 'Start Date', 'date', { col: true }),
      F('link', 'Link', 'url'),
      F('notes', 'Notes', 'textarea'),
    ],
  },
  {
    icon: 'ShoppingCart', key: 'inventory', fa: 'انبار / موجودی', en: 'Inventory',
    dFa: 'کالاها، موجودی و قیمت', dEn: 'Items, stock and pricing',
    fields: [
      F('title', 'Item', 'text', { col: true }),
      F('sku', 'SKU', 'text', { col: true }),
      F('category', 'Category', 'select', { col: true, options: ['Merch', 'CD', 'Vinyl', 'Apparel', 'Other'] }),
      F('quantity', 'Quantity', 'number', { col: true }),
      F('price', 'Price', 'money', { col: true }),
      F('status', 'Status', 'select', { col: true, options: ['In Stock', 'Low', 'Out', 'Archived'] }),
      F('notes', 'Notes', 'textarea'),
    ],
  },
  {
    icon: 'Newspaper', key: 'blog', fa: 'مقالات / بلاگ', en: 'Blog',
    dFa: 'مقاله‌ها و تقویم انتشار', dEn: 'Articles and publishing calendar',
    fields: [
      F('title', 'Title', 'text', { col: true }),
      F('category', 'Category', 'select', { col: true, options: ['SEO', 'News', 'Guide', 'Review', 'Other'] }),
      F('status', 'Status', 'select', { col: true, options: ['Draft', 'Review', 'Published'] }),
      F('publishDate', 'Publish Date', 'date', { col: true }),
      F('author', 'Author', 'ref', { refModule: 'team' }),
      F('link', 'Link', 'url'),
      F('body', 'Body', 'textarea'),
    ],
  },
  {
    icon: 'Phone', key: 'leads', fa: 'سرنخ / لید', en: 'Leads',
    dFa: 'سرنخ‌های فروش و پیگیری', dEn: 'Sales leads and follow-ups',
    fields: [
      F('title', 'Name', 'text', { col: true }),
      F('phone', 'Phone', 'text', { col: true }),
      F('source', 'Source', 'select', { col: true, options: ['Instagram', 'Telegram', 'Website', 'Referral', 'Other'] }),
      F('status', 'Status', 'select', { col: true, options: ['New', 'Contacted', 'Qualified', 'Won', 'Lost'] }),
      F('value', 'Value', 'money', { col: true }),
      F('nextContact', 'Next Contact', 'date', { col: true }),
      F('notes', 'Notes', 'textarea'),
    ],
  },
]

function NewModuleModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (m: ModuleDef) => void }) {
  const { t, lang } = useT()
  const [q, setQ] = useState('')
  const L = (fa: string, en: string) => (lang === 'fa' ? fa : en)

  const build = (tpl: Tpl, customName?: string) => {
    const label = customName?.trim() || (lang === 'fa' ? tpl.fa : tpl.en)
    const key = 'm_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now().toString(36)
    const m: ModuleDef = {
      key, label, labelFa: lang === 'fa' ? label : tpl.fa, icon: tpl.icon, group: 'core', custom: true,
      titleField: 'title', defaultView: 'table', views: ['table', 'kanban', 'cards'], groupBy: 'status',
      fields: tpl.fields.map(fd => ({ ...fd })),
    }
    onCreate(m)
  }

  const filtered = TEMPLATES.filter(tp => (tp.fa + ' ' + tp.en).toLowerCase().includes(q.trim().toLowerCase()))

  return (
    <Modal open={open} onClose={onClose} wide title={t('set.templateTitle')}>
      <p className="text-[12px] text-[var(--color-dim)] mb-3">{t('set.templateHint')}</p>
      <TextInput value={q} placeholder={t('common.search')} className="mb-3 py-1.5" onChange={e => setQ(e.target.value)} />
      <div className="grid sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pe-1">
        {filtered.map(tp => (
          <div key={tp.key} className="p-3 rounded-xl border border-[var(--color-line)] hover:border-[var(--color-line2)] transition-colors">
            <div className="flex items-center gap-2 mb-1.5">
              <Icon name={tp.icon} size={15} className="text-[var(--color-acc)]" />
              <span className="text-[13px] font-medium">{L(tp.fa, tp.en)}</span>
            </div>
            <p className="text-[10.5px] text-[var(--color-dim2)] leading-relaxed mb-2.5">{L(tp.dFa, tp.dEn)}</p>
            <div className="flex gap-1.5 flex-wrap">
              {tp.fields.slice(0, 4).map(fd => (
                <span key={fd.key} className="text-[9.5px] px-1.5 py-0.5 rounded bg-white/[.06] text-[var(--color-dim)]">{fd.label}</span>
              ))}
              {tp.fields.length > 4 && <span className="text-[9.5px] text-[var(--color-dim2)] nums">+{tp.fields.length - 4}</span>}
            </div>
            <Button size="sm" variant="primary" icon="Plus" className="mt-2.5" onClick={() => build(tp)}>{t('common.add')}</Button>
          </div>
        ))}
        {!filtered.length && <Empty icon="SearchX" title={t('empty.noResults')} />}
      </div>
    </Modal>
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
          <Dropdown value={group}
            onChange={v => setGroup(v as ModuleDef['group'])}
            options={['core', 'media', 'business', 'ops'].map(o => ({ value: o, label: o }))} />
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
            <Dropdown value={f.type} onChange={v => upd(i, { type: v as FieldType })}
              className="w-32 shrink-0"
              options={FIELD_TYPES.map(ty => ({ value: ty, label: ty }))} />
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

/* ---------- کارت بروزرسانی خودکار ---------- */
function UpdateCard() {
  const { t, lang } = useT()
  const fmt = useFmt()
  const { data, setSettings, setToast } = useApp()
  const s = data.settings
  const auto = s.autoUpdate !== false

  const [current, setCurrent] = useState<string>(APP_VERSION)
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<UpdateCheckResult | null>(null)
  const [netError, setNetError] = useState(false)
  const [dl, setDl] = useState<DownloadProgress | null>(null)
  const [dlBusy, setDlBusy] = useState(false)
  const [doneFile, setDoneFile] = useState<{ path: string; name: string } | null>(null)
  const [pickedTag, setPickedTag] = useState('')

  const releases = result?.releases ?? []
  const latest = releases[0] ?? null
  const hasUpdate = !!(latest && cmpVersion(latest.version, current) > 0)

  /* نسخه‌ی جاری — در دسکتاپ از خود برنامه */
  useEffect(() => {
    if (desktop) void desktop.info().then(i => setCurrent(i.version)).catch(() => {})
  }, [])

  /* رویدادهای آپدیتر: درصد دانلود + دکمه‌ی «بررسی» منو + خبر نسخه‌ی جدید */
  useEffect(() => {
    if (!desktop) return
    return desktop.onUpdate((name, payload) => {
      if (name === 'progress') setDl(payload as DownloadProgress)
      else if (name === 'available') void runCheck(true)
      else if (name === 'checkNow') {
        document.getElementById('update-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        void runCheck()
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  /* بررسی بی‌صدا هنگام باز شدن تنظیمات */
  useEffect(() => { void runCheck(true) /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [])

  async function runCheck(silent = false) {
    if (!silent) setChecking(true)
    setNetError(false)
    try {
      const res = await checkForUpdates(current)
      setResult(res)
      if (!res.ok) setNetError(true)
      // دانلود خودکار وقتی نسخه‌ی جدید هست و کاربر لغو نکرده
      const rel = res.releases?.[0]
      if (res.ok && rel && cmpVersion(rel.version, current) > 0 && desktop && auto && !doneFile) {
        void startDownload(rel)
      }
    } catch {
      setNetError(true)
    } finally {
      setChecking(false)
    }
  }

  /** دانلود یک نسخه — دسکتاپ: استریم با درصد؛ وب: لینک مستقیم */
  async function startDownload(rel: UpdateRelease | null) {
    if (!rel) return
    setDlBusy(true)
    setDoneFile(null)
    try {
      if (desktop) {
        const asset = rel.assets.setup ?? rel.assets.portable
        if (!asset) throw new Error('no asset')
        setDl({ received: 0, total: asset.size, percent: 0 })
        const out = await desktop.updateDownload({ url: asset.url, filename: asset.name, size: asset.size })
        setDoneFile({ path: out.path, name: out.name })
        setDl(p => (p ? { ...p, percent: 100 } : p))
        setToast(t('upd.newToast', { v: rel.version }))
        // نصب‌کننده (Setup) → دکمه‌ی نصب نشان بده؛ پرتابل → فقط دانلود شد
      } else {
        // وب/اندروید: دانلود مستقیم از گیت‌هاب
        const asset = isMobile ? (rel.assets.apk ?? rel.assets.setup) : (rel.assets.setup ?? rel.assets.portable)
        window.open(asset?.url ?? rel.notesUrl, '_blank')
      }
    } catch {
      setNetError(true)
      setDl(null)
    } finally {
      setDlBusy(false)
    }
  }

  async function installNow() {
    if (!desktop || !doneFile) return
    setToast(t('upd.installing'))
    try {
      await desktop.updateInstall(doneFile.path)
    } catch {
      setNetError(true)
    }
  }

  const picked = releases.find(r => r.tag === pickedTag) ?? null
  const downloading = dlBusy || (dl != null && !doneFile)

  return (
    <Card id="update-card">
      <SectionTitle icon="Rocket"
        right={<span className="text-[10.5px] text-[var(--color-dim2)] nums ltr">v{current}</span>}>
        {t('upd.title')}
      </SectionTitle>

      {latest && (
        <div className="space-y-1.5 text-[11.5px] mb-3">
          <Row label={t('upd.latest')} value={`v${latest.version}${latest.publishedAt ? ' · ' + fmtDate(latest.publishedAt, lang) : ''}`} />
          {hasUpdate && (
            <div className="flex items-center gap-2 pt-1">
              <Badge value="Doing" dot />
              <span className="text-[12px] text-[var(--color-tx)]">{t('upd.available')}: v{latest.version}</span>
            </div>
          )}
        </div>
      )}

      {/* وضعیت‌ها */}
      {checking && !result && (
        <p className="text-[12px] text-[var(--color-dim)] mb-3 flex items-center gap-2">
          <Icon name="Loader" size={14} className="animate-spin" /> {t('upd.checking')}
        </p>
      )}
      {netError && (
        <div className="rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5 mb-3">
          <p className="text-[12px] text-red-300 flex items-center gap-2"><Icon name="CloudOff" size={14} /> {t('upd.error')}</p>
          <p className="text-[10.5px] text-[var(--color-dim2)] mt-1 leading-relaxed">{t('upd.errorHint')}</p>
          <Button size="sm" variant="outline" icon="RefreshCw" className="mt-2" onClick={() => void runCheck()}>{t('upd.retry')}</Button>
        </div>
      )}
      {!netError && result?.ok && releases.length === 0 && !checking && (
        <p className="text-[11.5px] text-[var(--color-dim2)] mb-3 leading-relaxed">{t('upd.noReleases')}</p>
      )}
      {!netError && result?.ok && releases.length > 0 && !hasUpdate && !checking && (
        <p className="text-[12px] text-[var(--color-dim)] mb-3 flex items-center gap-2">
          <Icon name="CheckCircle2" size={14} className="text-emerald-400" /> {t('upd.upToDate')}
        </p>
      )}

      {/* دانلود/نصب */}
      {downloading && dl && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-[var(--color-dim)] mb-1.5">
            <span className="flex items-center gap-1.5"><Icon name="CloudDownload" size={13} className="animate-pulse" /> {t('upd.downloading')}</span>
            <span className="nums">{fmt.dg(dl.percent)}%{dl.total ? ` · ${fmt.dg(+(dl.received / 1024 / 1024).toFixed(1))}/${fmt.dg(+(dl.total / 1024 / 1024).toFixed(1))} MB` : ''}</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--color-line)] overflow-hidden">
            <div className="h-full rounded-full bg-[var(--color-acc)] transition-all duration-300" style={{ width: `${dl.percent}%` }} />
          </div>
          {desktop && dlBusy && (
            <Button size="sm" variant="ghost" icon="X" className="mt-2" onClick={() => { void desktop!.updateCancel(); setDl(null); setDlBusy(false) }}>
              {t('upd.cancel')}
            </Button>
          )}
        </div>
      )}
      {doneFile && (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 mb-3">
          <p className="text-[12px] text-emerald-300 flex items-center gap-2">
            <Icon name="CheckCircle2" size={14} /> {t('upd.downloaded')} — <span className="ltr nums">{doneFile.name}</span>
          </p>
          <div className="flex gap-2 flex-wrap mt-2">
            {desktop && /-setup\.exe$/i.test(doneFile.name) ? (
              <Button size="sm" variant="primary" icon="Download" onClick={() => void installNow()}>{t('upd.install')}</Button>
            ) : (
              <span className="text-[10.5px] text-[var(--color-dim2)] self-center">{t('upd.portableNote')}</span>
            )}
            {desktop && <Button size="sm" variant="ghost" icon="FolderOpen" onClick={() => void desktop!.updateOpenFolder()}>{t('upd.folder')}</Button>}
          </div>
        </div>
      )}

      {/* دکمه‌ها */}
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" icon="RefreshCw" disabled={checking} onClick={() => void runCheck()}>
          {t('upd.check')}
        </Button>
        {desktop && hasUpdate && !doneFile && !downloading && (
          <Button size="sm" variant="primary" icon="CloudDownload" onClick={() => void startDownload(latest)}>
            {t('upd.downloadInstall')}
          </Button>
        )}
        {!desktop && latest && (
          <Button size="sm" variant="primary" icon="ExternalLink" onClick={() => void startDownload(latest)}>
            {t('upd.downloadOpen')}
          </Button>
        )}
      </div>
      {!desktop && (
        <p className="text-[10.5px] text-[var(--color-dim2)] mt-2 leading-relaxed">{t('upd.installFirst')}</p>
      )}

      {/* انتخاب هر نسخه */}
      {releases.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[var(--color-line)]">
          <div className="text-[12px] mb-1">{t('upd.anyVersion')}</div>
          <p className="text-[10.5px] text-[var(--color-dim2)] mb-2">{t('upd.anyVersionHint')}</p>
          <div className="flex gap-2 flex-wrap">
            <select value={pickedTag} onChange={e => setPickedTag(e.target.value)}
              className="flex-1 min-w-[160px] rounded-lg border border-[var(--color-line2)] bg-[var(--color-bg)] px-2.5 py-1.5 text-[12px] cursor-pointer">
              <option value="">{t('upd.pick')}</option>
              {releases.map(r => (
                <option key={r.tag} value={r.tag}>v{r.version} — {fmtDate(r.publishedAt, lang)}</option>
              ))}
            </select>
            <Button size="sm" variant="outline" icon="Download" disabled={!picked}
              onClick={() => void startDownload(picked)}>
              {t('upd.get')}
            </Button>
          </div>
        </div>
      )}

      {/* سوییچ بروزرسانی خودکار — فقط دسکتاپ */}
      {desktop && (
        <div className="mt-4 pt-3 border-t border-[var(--color-line)] flex items-center gap-3 flex-wrap">
          <div className="w-40 shrink-0">
            <Toggle
              value={auto ? 'on' : 'off'}
              options={[{ v: 'on', l: t('common.on') }, { v: 'off', l: t('common.off') }]}
              onChange={v => setSettings({ autoUpdate: v === 'on' })}
            />
          </div>
          <span className="text-[10.5px] text-[var(--color-dim2)] flex-1 min-w-[180px] leading-relaxed">
            <span className="text-[var(--color-dim)]">{t('upd.auto')}</span> — {t('upd.autoHint')}
          </span>
        </div>
      )}
    </Card>
  )
}
