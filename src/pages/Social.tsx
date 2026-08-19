import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../store/useApp'
import { useT, tr } from '../i18n'
import { Card, SectionTitle, Button, TextInput, Icon, Empty } from '../components/ui/Primitives'
import { detectPlatform, type SocialInfo, type PlatformId } from '../social/types'
import { providerById, platformLabel, PROVIDERS } from '../social/registry'
import { getKey } from '../lib/secrets'
import { nativeGatewayAvailable } from '../lib/gateway'

/**
 * Social Analyzer — جست‌وجوی حساب‌های شبکه‌های اجتماعی
 * فقط داده‌ی واقعی از منابع قانونی؛ بدون داده‌ی ساختگی.
 */

function StatGrid({ info }: { info: SocialInfo }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
      {info.stats.map(s => (
        <div key={s.key} className="rounded-lg border border-[var(--color-line)] px-3 py-2">
          <div className="text-[10px] text-[var(--color-dim2)] uppercase tracking-wider">{s.label}</div>
          <div className={`text-[14px] font-medium mt-0.5 nums ${s.unavailable || s.value === null ? 'text-[var(--color-dim2)]' : ''}`}>
            {s.unavailable || s.value === null ? tr('fa', 'social.notAvailable') : String(s.value).slice(0, 120)}
          </div>
        </div>
      ))}
    </div>
  )
}

function InfoCard({ info, onSave }: { info: SocialInfo; onSave: () => void }) {
  const { t, lang } = useT()
  return (
    <Card className="anim">
      <div className="flex items-start gap-3">
        {info.avatar ? (
          <img src={info.avatar} alt="" className="w-12 h-12 rounded-full border border-[var(--color-line)] object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full grid place-items-center bg-[var(--hover)] border border-[var(--color-line)]">
            <Icon name="User" size={20} className="text-[var(--color-dim)]" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14.5px] font-semibold truncate">{info.displayName || info.handle}</span>
            <span className='text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-acc)]/15 text-[var(--color-acc)]'>{platformLabel(info.platform, lang, useApp.getState().data.settings.custom.platformLabels)}</span>
            {info.isPublic === false && <span className="text-[10px] text-amber-500">Private?</span>}
          </div>
          <div className="text-[11px] text-[var(--color-dim2)] nums mt-0.5">
            {info.handle} · {new Date(info.fetchedAt).toLocaleString()}
          </div>
          {info.bio && <p className="text-[11.5px] text-[var(--color-dim)] mt-2 line-clamp-3">{info.bio}</p>}
          <div className="flex items-center gap-3 mt-2 text-[10.5px] text-[var(--color-dim2)]">
            <a href={info.url} target="_blank" rel="noreferrer" className="hover:text-[var(--color-acc)] flex items-center gap-1 ltr:direction-ltr">
              <Icon name="ExternalLink" size={11} /> {info.url}
            </a>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button size="sm" variant="primary" icon="Check" onClick={onSave}>{t('social.save')}</Button>
        </div>
      </div>
      <StatGrid info={info} />
      <div className="mt-3 text-[10px] text-[var(--color-dim2)]">source: {info.source}</div>
    </Card>
  )
}

export function Social() {
  const { t, lang } = useT()
  const st = useApp()
  const [input, setInput] = useState('')
  const [platformOverride, setPlatformOverride] = useState<PlatformId | ''>('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<SocialInfo | null>(null)
  const [error, setError] = useState('')
  const accounts = st.data.socialAccounts ?? []
  const labels = st.data.settings.custom.platformLabels
  const refreshMode = st.data.settings.social.refreshMode
  const lastRefreshRef = useRef('')

  const analyze = useCallback(async (raw?: string) => {
    const q = (raw ?? input).trim()
    if (!q || busy) return
    setBusy(true); setError(''); setResult(null)
    try {
      const det = detectPlatform(q)
      const pid = platformOverride || det?.platform
      if (!pid) { setError(t('social.unknownPlatform')); setBusy(false); return }
      const handle = det?.handle ?? providerById(pid)!.match(q) ?? q.replace(/^@/, '')
      const info = await providerById(pid)!.fetch(handle, { key: getKey })
      setResult(info)
      st.pushLog({ kind: 'social', subject: `${pid}/${handle}`, ok: true, detail: `fetched via ${info.source}` })
    } catch (e) {
      const msg = (e as Error).message
      setError(msg)
      st.pushLog({ kind: 'social', subject: q.slice(0, 60), ok: false, detail: msg.slice(0, 200) })
    }
    setBusy(false)
  }, [input, platformOverride, busy, st, t])

  const refreshAll = useCallback(async () => {
    for (const acc of accounts.slice(0, 12)) {
      try {
        const info = await providerById(acc.platform)!.fetch(acc.handle, { key: getKey })
        st.upsertSocial(info)
      } catch (e) {
        st.pushLog({ kind: 'social', subject: acc.handle, ok: false, detail: (e as Error).message.slice(0, 160) })
      }
    }
    lastRefreshRef.current = new Date().toISOString()
  }, [accounts, st])

  /* Refresh هنگام باز شدن صفحه (اگر در تنظیمات فعال باشد) */
  useEffect(() => {
    if (refreshMode === 'open' && accounts.length && !lastRefreshRef.current) void refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshMode])

  /* Auto-Refresh دوره‌ای */
  useEffect(() => {
    if (refreshMode !== '5' && refreshMode !== '15') return
    const min = Number(refreshMode)
    const id = setInterval(() => { void refreshAll() }, min * 60_000)
    return () => clearInterval(id)
  }, [refreshMode, refreshAll])

  return (
    <div className="anim space-y-5 max-w-4xl">
      <div>
        <h1 className="text-[21px] font-semibold tracking-tight">{t('social.title')}</h1>
        <p className="text-[12px] text-[var(--color-dim2)] mt-1">{t('social.subtitle')}</p>
      </div>

      <Card>
        <SectionTitle icon="Search">{t('social.analyze')}</SectionTitle>
        <div className="flex flex-col sm:flex-row gap-2">
          <TextInput
            value={input}
            placeholder={t('social.placeholder')}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void analyze() }}
          />
          <Button variant="primary" icon={busy ? 'Loader' : 'Search'} disabled={busy || !input.trim()} onClick={() => void analyze()}>
            {busy ? t('social.fetching') : t('social.analyzeBtn')}
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap mt-3">
          {PROVIDERS.map(p => (
            <button key={p.id} onClick={() => setPlatformOverride(platformOverride === p.id ? '' : p.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] border transition-colors ${platformOverride === p.id ? 'border-[var(--color-acc)] text-[var(--color-acc)] bg-[var(--color-acc)]/10' : 'border-[var(--color-line)] text-[var(--color-dim)] hover:border-[var(--color-line2)]'}`}>
              {lang === 'fa' ? p.labelFa : p.label}
            </button>
          ))}
        </div>
        {!nativeGatewayAvailable() && (
          <p className="text-[10.5px] text-amber-500/90 mt-3">{t('social.browserNote')}</p>
        )}
        {error && (
          <div className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-[11.5px] text-red-400 leading-relaxed">
            {error}
          </div>
        )}
      </Card>

      {result && <InfoCard info={result} onSave={() => { st.upsertSocial(result); st.setToast(t('social.saved')) }} />}

      <Card>
        <SectionTitle
          icon="Users"
          right={
            <div className="flex items-center gap-2">
              <span className="text-[10.5px] text-[var(--color-dim2)]">{t('social.refreshMode')}: {t(`social.mode.${refreshMode}`)}</span>
              <Button size="sm" variant="outline" icon="RefreshCw" disabled={!accounts.length || busy} onClick={() => void refreshAll()}>
                {t('social.refreshAll')}
              </Button>
            </div>
          }
        >
          {t('social.saved')} ({accounts.length})
        </SectionTitle>
        {accounts.length === 0 ? (
          <Empty icon="Users" title={t('social.empty')} />
        ) : (
          <div className="space-y-2">
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-line)] px-3 py-2.5">
                {acc.info.avatar ? (
                  <img src={acc.info.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-[var(--color-line)]" />
                ) : (
                  <div className="w-9 h-9 rounded-full grid place-items-center bg-[var(--hover)]"><Icon name="User" size={16} className="text-[var(--color-dim)]" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium truncate">{acc.info.displayName || acc.handle}</div>
                  <div className="text-[10.5px] text-[var(--color-dim2)] nums">
                    {platformLabel(acc.platform, lang, labels)} · {acc.handle} · {new Date(acc.info.fetchedAt).toLocaleDateString()}
                  </div>
                </div>
                <Button size="sm" variant="ghost" icon="RefreshCw" onClick={() => { setInput(acc.handle); void analyze(`${acc.handle}`) }} />
                <Button size="sm" variant="ghost" icon="Trash2" onClick={() => st.removeSocial(acc.id)} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle icon="Activity">{t('social.logs')}</SectionTitle>
        {(st.data.runLogs ?? []).slice(0, 8).map(l => (
          <div key={l.id} className="flex items-start gap-2 text-[11px] py-1 border-b border-[var(--color-line)] last:border-0">
            <span className={l.ok ? 'text-emerald-500' : 'text-red-400'}>●</span>
            <span className="text-[var(--color-dim2)] nums shrink-0">{new Date(l.at).toLocaleTimeString()}</span>
            <span className="min-w-0 flex-1 truncate">{l.subject} — {l.detail}</span>
          </div>
        ))}
        {!(st.data.runLogs ?? []).length && <Empty icon="Activity" title={t('social.noLogs')} />}
      </Card>
    </div>
  )
}
