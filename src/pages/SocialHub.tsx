import { useEffect, useRef, useState } from 'react'
import { useApp } from '../store/useApp'
import { Card, SectionTitle, Button, Field, TextInput, Icon, Empty } from '../components/ui/Primitives'
import { PlatformIcon } from '../components/ui/icons.tsx'
import { useT } from '../i18n'
import { useFmt } from '../lib/useFmt'
import { fetchProfileCached, detectPlatform, type SocialProfile } from '../domain/social'

export function SocialHub() {
  const { data, setSocial, upsertProfile, removeProfile, setToast } = useApp()
  const soc = data.settings.social
  const { t, lang } = useT()
  const fmt = useFmt()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState<Set<string>>(new Set())
  const [detail, setDetail] = useState<SocialProfile | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const profileIds = soc.profiles.map(p => p.id).join('|')

  // رفرش خودکار هنگام ورود به صفحه و هر بار که برنامه دوباره foreground می‌شود.
  // فقط پروفایل‌های پشتیبانی‌شده/قابل‌دسترسی آپدیت می‌شوند؛ هر منبع خطای خودش را روی کارت نشان می‌دهد.
  useEffect(() => {
    if (!soc.autoRefresh || !profileIds) return
    let cancelled = false
    const run = async () => {
      const profiles = useApp.getState().data.settings.social.profiles
      for (const profile of profiles) {
        if (cancelled) return
        setRefreshing(s => new Set(s).add(profile.id))
        try {
          const p = await fetchProfileCached(profile.url, { keys: useApp.getState().data.settings.social.keys })
          if (!cancelled) upsertProfile(p)
        } finally {
          if (!cancelled) setRefreshing(s => { const n = new Set(s); n.delete(profile.id); return n })
        }
      }
    }
    void run()
    const onVis = () => { if (document.visibilityState === 'visible') void run() }
    const onRefresh = () => { void run() }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('nexus:refresh-social', onRefresh)
    const timer = soc.intervalMin > 0 ? setInterval(() => { void run() }, soc.intervalMin * 60_000) : undefined
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVis); window.removeEventListener('nexus:refresh-social', onRefresh); if (timer) clearInterval(timer) }
  }, [soc.autoRefresh, soc.intervalMin, profileIds, upsertProfile])

  const add = async () => {
    const v = input.trim()
    if (!v) return
    setBusy(true)
    try {
      const { platform, url, handle } = detectPlatform(v)
      const p = await fetchProfileCached(v, { keys: soc.keys })
      upsertProfile(p)
      setInput('')
      setToast(p.error ? `${platform} — ${t('social.fetchFail')}: ${p.error}` : t('social.added', { h: handle || url }))
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  const refreshOne = async (p: SocialProfile) => {
    setRefreshing(s => new Set(s).add(p.id))
    try {
      const fresh = await fetchProfileCached(p.url, { keys: soc.keys })
      upsertProfile(fresh)
    } finally {
      setRefreshing(s => { const n = new Set(s); n.delete(p.id); return n })
    }
  }

  const refreshAll = async () => {
    for (const p of soc.profiles) await refreshOne(p)
    setToast(t('social.refreshed'))
  }

  return (
    <div className="anim space-y-5 max-w-5xl">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[21px] font-semibold tracking-tight flex items-center gap-2">
            <Icon name="Share2" size={20} className="text-[var(--color-acc)]" /> {t('social.title')}
          </h1>
          <p className="text-[12px] text-[var(--color-dim2)] mt-1">{t('social.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" icon="RefreshCw" disabled={!soc.profiles.length || refreshing.size > 0}
            onClick={() => void refreshAll()}>{t('social.refreshAll')}</Button>
        </div>
      </div>

      <Card>
        <SectionTitle icon="Link2">{t('social.addLink')}</SectionTitle>
        <div className="flex gap-2 flex-col sm:flex-row">
          <TextInput
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void add() }}
            placeholder={lang === 'fa'
              ? 'آیدی اینستاگرام، لینک کانال تلگرام، یوتیوب، ساندکلاد، اسپاتیفای...'
              : 'Instagram handle, Telegram/YouTube/SoundCloud/Spotify URL...'}
            className="flex-1 ltr"
          />
          <Button variant="primary" size="md" icon={busy ? 'Loader' : 'Plus'} disabled={busy || !input.trim()}
            onClick={() => void add()}>{t('social.fetch')}</Button>
        </div>
        <p className="text-[10.5px] text-[var(--color-dim2)] mt-2 leading-relaxed">{t('social.hint')}</p>
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        {soc.profiles.length === 0 && (
          <Card className="sm:col-span-2">
            <Empty icon="Inbox" title={t('social.empty')} hint={t('social.emptyHint')} />
          </Card>
        )}
        {soc.profiles.map(p => (
          <ProfileCard key={p.id} p={p}
            loading={refreshing.has(p.id)}
            fmt={fmt}
            t={t}
            onOpen={() => setDetail(p)}
            onRefresh={() => void refreshOne(p)}
            onRemove={() => { if (confirm(t('social.confirmRemove'))) removeProfile(p.id) }}
          />
        ))}
      </div>

      <Card>
        <SectionTitle icon="Settings2">{t('social.settings')}</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="accent-[var(--color-acc)] w-4 h-4"
              checked={soc.autoRefresh} onChange={e => setSocial({ autoRefresh: e.target.checked })} />
            <span className="text-[12.5px]">{t('social.autoRefresh')}</span>
          </label>
          <Field label={t('social.interval')}>
            <select value={String(soc.intervalMin)}
              onChange={e => setSocial({ intervalMin: Number(e.target.value) })}
              className="w-full rounded-lg bg-[var(--color-bg)] border border-[var(--color-line2)] px-3 py-2 text-[13px] cursor-pointer">
              <option value="0">{t('social.onVisible')}</option>
              <option value="5">5 {t('social.minutes')}</option>
              <option value="15">15 {t('social.minutes')}</option>
              <option value="30">30 {t('social.minutes')}</option>
              <option value="60">60 {t('social.minutes')}</option>
            </select>
          </Field>
        </div>
        <details className="mt-3">
          <summary className="text-[11.5px] text-[var(--color-dim)] cursor-pointer list-none flex items-center gap-1.5">
            <Icon name="KeyRound" size={13} /> {t('social.optionalKeys')}
          </summary>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            <Field label="YouTube Data API key">
              <TextInput value={soc.keys.youtube ?? ''} onChange={e => setSocial({ keys: { ...soc.keys, youtube: e.target.value } })}
                placeholder="AIza..." className="ltr" />
            </Field>
            <Field label="RapidAPI key (Instagram)">
              <TextInput value={soc.keys.rapidapi ?? ''} onChange={e => setSocial({ keys: { ...soc.keys, rapidapi: e.target.value } })}
                placeholder="..." className="ltr" />
            </Field>
          </div>
          <p className="text-[10.5px] text-[var(--color-dim2)] mt-2">{t('social.keysHint')}</p>
        </details>
      </Card>

      {detail && <ProfileDetail p={detail} onClose={() => setDetail(null)} fmt={fmt} t={t} />}
    </div>
  )
}

function ProfileCard({ p, loading, fmt, t, onOpen, onRefresh, onRemove }: {
  p: SocialProfile; loading: boolean; fmt: ReturnType<typeof useFmt>
  t: (k: string, v?: any) => string; onOpen: () => void; onRefresh: () => void; onRemove: () => void
}) {
  const metric = p.followers ?? p.views
  const metricLabel =
    p.platform === 'YouTube' ? 'social.subscribers'
      : p.platform === 'Telegram' ? 'social.members'
      : p.platform === 'Spotify' ? 'social.listeners'
      : p.platform === 'SoundCloud' ? 'social.followers'
      : p.platform === 'Instagram' ? 'social.followers'
      : 'social.metric'
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 hover:border-[var(--color-line2)] transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-white/[.04] border border-[var(--color-line2)] shrink-0 grid place-items-center">
          {p.avatar
            ? <img src={p.avatar} alt="" className="w-full h-full object-cover" loading="lazy" />
            : <PlatformIcon platform={p.platform} size={22} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <PlatformIcon platform={p.platform} size={13} className="text-[var(--color-dim2)]" />
            <span className="text-[10.5px] uppercase tracking-wider text-[var(--color-dim2)]">{p.platform}</span>
            {p.verified && <Icon name="CheckCircle2" size={12} className="text-sky-400" />}
          </div>
          <button onClick={onOpen} className="text-[13.5px] font-semibold truncate block max-w-full hover:text-[var(--color-acc)] transition-colors ltr text-start">
            @{p.handle}
          </button>
          <div className="text-[12px] truncate text-[var(--color-dim)]">{p.title || '—'}</div>
        </div>
        {loading && <Icon name="Loader" size={15} className="text-[var(--color-dim2)] animate-spin" />}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-[22px] font-bold nums leading-none" style={{ color: 'var(--color-acc)' }}>
          {metric != null ? fmt.dg(metric.toLocaleString('en-US')) : '—'}
        </span>
        <span className="text-[11px] text-[var(--color-dim2)]">{t(metricLabel)}</span>
      </div>

      <div className="mt-3 pt-3 border-t border-[var(--color-line)] flex items-center justify-between">
        <span className="text-[10px] text-[var(--color-dim2)]">
          {p.error ? <span className="text-red-400">⚠ {p.error}</span> : t('social.updated', { t: fmt.relTime(p.fetchedAt) })}
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" icon="ExternalLink" onClick={() => window.open(p.url, '_blank', 'noreferrer')} />
          <Button size="sm" variant="ghost" icon="RefreshCw" disabled={loading} onClick={onRefresh} />
          <Button size="sm" variant="ghost" icon="Trash2" onClick={onRemove} />
        </div>
      </div>
    </div>
  )
}

function ProfileDetail({ p, onClose, fmt, t }: { p: SocialProfile; onClose: () => void; fmt: ReturnType<typeof useFmt>; t: (k: string, v?: any) => string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ background: 'rgba(4,5,8,.72)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="anim w-full max-w-lg rounded-2xl border border-[var(--color-line2)] bg-[var(--color-bg2)] shadow-2xl my-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--color-line)]">
          <h3 className="text-[14px] font-semibold flex items-center gap-2">
            <PlatformIcon platform={p.platform} size={16} /> {p.platform} · @{p.handle}
          </h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-white/5 text-[var(--color-dim2)]"><Icon name="X" size={17} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-white/[.04] border border-[var(--color-line2)] grid place-items-center">
              {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : <PlatformIcon platform={p.platform} size={28} />}
            </div>
            <div className="min-w-0">
              <div className="text-[16px] font-semibold">{p.title || p.handle}</div>
              {p.bio && <p className="text-[12px] text-[var(--color-dim)] mt-1 line-clamp-3">{p.bio}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
            <Metric label={t('social.followers')} value={p.followers} fmt={fmt} />
            {p.platform === 'Instagram' && <Metric label={t('social.following')} value={p.following} fmt={fmt} />}
            {p.platform === 'Instagram' && <Metric label={t('social.posts')} value={p.posts} fmt={fmt} />}
            {p.platform === 'YouTube' && <Metric label={t('social.videos')} value={p.posts} fmt={fmt} />}
            {p.platform === 'YouTube' && <Metric label={t('social.views')} value={p.views} fmt={fmt} />}
          </div>
          <a href={p.url} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-acc)] hover:underline ltr">
            <Icon name="ExternalLink" size={12} /> {p.url}
          </a>
          <div className="text-[10.5px] text-[var(--color-dim2)] pt-2 border-t border-[var(--color-line)]">
            {t('social.source')}: {p.source ?? '—'} · {t('social.updated', { t: fmt.relTime(p.fetchedAt) })}
          </div>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, fmt }: { label: string; value?: number; fmt: ReturnType<typeof useFmt> }) {
  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-panel)] py-2">
      <div className="text-[17px] font-semibold nums">{value != null ? fmt.dg(value.toLocaleString('en-US')) : '—'}</div>
      <div className="text-[10.5px] text-[var(--color-dim2)] mt-0.5">{label}</div>
    </div>
  )
}
