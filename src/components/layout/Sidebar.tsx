import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useApp } from '../../store/useApp'
import type { ModuleDef } from '../../domain/schema'
import { Icon } from '../ui/Primitives'
import { useT } from '../../i18n'

const FIXED_TOP = [
  { to: '/', icon: 'LayoutDashboard', k: 'nav.dashboard' },
  { to: '/decision', icon: 'Target', k: 'nav.decision' },
  { to: '/analytics', icon: 'BarChart3', k: 'nav.analytics' },
]

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const modules = useApp(s => s.data.modules)
  const org = useApp(s => s.data.settings.orgName)
  const dirty = useApp(s => s.dirty)
  const nav = useNavigate()
  const { t, m: ml, g: gl, lang, rtl } = useT()
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const groups = ['core', 'media', 'business', 'ops'] as const
  const byGroup = (g: string) => modules.filter(m => m.group === g)

  const link = (to: string, icon: string, label: string, alt?: string) => (
    <NavLink key={to} to={to} onClick={onClose}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] transition-all duration-150 group ${
          isActive ? 'bg-[var(--color-acc)]/13 text-[var(--color-tx)] font-medium' : 'text-[var(--color-dim)] hover:text-[var(--color-tx)] hover:bg-white/[.04]'
        }`}>
      {({ isActive }) => (
        <>
          <Icon name={icon} size={15} className="shrink-0" style={{ color: isActive ? 'var(--color-acc)' : undefined }} />
          <span className="truncate flex-1">{label}</span>
          {alt && alt !== label && <span className="text-[10px] text-[var(--color-dim2)] opacity-0 group-hover:opacity-100 transition-opacity hidden xl:block">{alt}</span>}
        </>
      )}
    </NavLink>
  )

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />}
      {/* در دسکتاپ همیشه ثابت است؛ در موبایل از لبه‌ی درست (چپ در LTR، راست در RTL) بیرون می‌رود */}
      <aside className={`fixed lg:static inset-y-0 start-0 z-40 w-[228px] shrink-0 border-e border-[var(--color-line)] bg-[var(--color-bg2)] flex flex-col transition-transform duration-200 ${
        open ? 'translate-x-0' : rtl ? 'max-lg:translate-x-full' : 'max-lg:-translate-x-full'
      }`}>
        {/* brand */}
        <div className="px-3.5 py-3.5 border-b border-[var(--color-line)] flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--color-acc), #a855f7)' }}>
            <Icon name="Command" size={15} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold tracking-tight truncate">{org || 'NEXUS HQ'}</div>
            <div className="text-[9.5px] text-[var(--color-dim2)] tracking-wider uppercase flex items-center gap-1">
              <span className={`w-1 h-1 rounded-full ${dirty ? 'bg-amber-400 pulse' : 'bg-emerald-500'}`} />
              {dirty ? t('nav.saving') : t('nav.synced')}
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-[var(--color-dim2)] p-1"><Icon name="X" size={16} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2.5 space-y-3">
          <div className="space-y-0.5">
            {FIXED_TOP.map(i => link(i.to, i.icon, t(i.k)))}
          </div>

          {groups.map(g => {
            const mods = byGroup(g)
            if (!mods.length) return null
            const isCol = collapsed[g]
            return (
              <div key={g}>
                <button onClick={() => setCollapsed(c => ({ ...c, [g]: !c[g] }))}
                  className="w-full flex items-center justify-between px-2.5 mb-1 text-[9.5px] font-semibold tracking-[.13em] uppercase text-[var(--color-dim2)] hover:text-[var(--color-dim)] transition-colors">
                  {gl(g)}
                  <Icon name={isCol ? 'ChevronRight' : 'ChevronDown'} size={11} />
                </button>
                {!isCol && (
                  <div className="space-y-0.5">
                    {/* در حالت فارسی، نام اصلی انگلیسی ماژول هنگام hover نشان داده می‌شود */}
                    {mods.map((m: ModuleDef) => link(`/m/${m.key}`, m.icon, ml(m), lang === 'fa' ? m.label : undefined))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="px-2 py-2 border-t border-[var(--color-line)] space-y-0.5">
          <button onClick={() => { nav('/settings#modules'); onClose() }}
            className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[12.5px] text-[var(--color-dim2)] hover:text-[var(--color-tx)] hover:bg-white/[.04] transition-all">
            <Icon name="PlusCircle" size={15} /> {t('nav.newModule')}
          </button>
          {link('/settings', 'Settings', t('nav.settings'))}
        </div>
      </aside>
    </>
  )
}
