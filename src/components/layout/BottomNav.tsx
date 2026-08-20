import { NavLink, useNavigate } from 'react-router-dom'
import { Icon } from '../ui/Primitives'
import { useT } from '../../i18n'

const TABS = [
  { to: '/', icon: 'LayoutDashboard', k: 'nav.dashboard' },
  { to: '/decision', icon: 'Target', k: 'nav.decision' },
  { to: '/analytics', icon: 'BarChart3', k: 'nav.analytics' },
  { to: '/settings', icon: 'Settings', k: 'nav.settings' },
]

export function BottomNav({ onMore }: { onMore: () => void }) {
  const { t } = useT()
  return (
    <nav className="lg:hidden shrink-0 border-t border-[var(--color-line)] bg-[var(--color-bg2)]/95 backdrop-blur-md flex items-stretch"
      style={{ paddingBottom: 'var(--sab)' }}>
      {TABS.map(tab => (
        <NavLink key={tab.to} to={tab.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors ${isActive ? 'text-[var(--color-acc)]' : 'text-[var(--color-dim2)]'}`}>
          <Icon name={tab.icon} size={18} />
          <span className="text-[9.5px] font-medium">{t(tab.k)}</span>
        </NavLink>
      ))}
      <button onClick={onMore}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[var(--color-dim2)]">
        <Icon name="Menu" size={18} />
        <span className="text-[9.5px] font-medium">{t('nav.dashboard')}</span>
      </button>
    </nav>
  )
}
