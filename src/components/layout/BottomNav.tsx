import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Primitives'
import { useT } from '../../i18n'

const ITEMS = [
  { to: '/', icon: 'LayoutDashboard', k: 'nav.dashboard' },
  { to: '/decision', icon: 'Target', k: 'nav.decision' },
  { to: '/analytics', icon: 'BarChart3', k: 'nav.analytics' },
] as const

export function BottomNav({ onMore }: { onMore: () => void }) {
  const { t } = useT()
  return (
    <nav aria-label={t('nav.more')}
      className="lg:hidden shrink-0 glass-strong border-t border-[var(--glass-brd)]"
      style={{ paddingBottom: 'var(--sab)' }}>
      <div className="flex items-stretch h-[var(--tabbar-h)]">
        {ITEMS.map(i => (
          <NavLink key={i.to} to={i.to}
            className={({ isActive }) =>
              `flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] transition-colors ${
                isActive ? 'text-[var(--color-acc)]' : 'text-[var(--color-dim2)]'
              }`}>
            <Icon name={i.icon} size={18} />
            <span className="truncate max-w-full">{t(i.k)}</span>
          </NavLink>
        ))}
        <button type="button" onClick={onMore}
          className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 px-1 text-[10px] text-[var(--color-dim2)]">
          <Icon name="Menu" size={18} />
          <span className="truncate max-w-full">{t('nav.more')}</span>
        </button>
      </div>
    </nav>
  )
}
