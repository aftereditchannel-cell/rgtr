import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Primitives'
import { useT } from '../../i18n'

const ITEMS = [
  { to: '/', icon: 'LayoutDashboard', k: 'nav.dashboard' },
  { to: '/decision', icon: 'Target', k: 'nav.decision' },
  { to: '/analytics', icon: 'BarChart3', k: 'nav.analytics' },
  { to: '/social', icon: 'Share2', k: 'nav.social' },
  { to: '/automation', icon: 'Workflow', k: 'nav.automation' },
]

/** ناوبری پایین صفحه — فقط موبایل */
export function BottomNav({ onMore }: { onMore: () => void }) {
  const { t } = useT()
  return (
    <nav
      className="lg:hidden shrink-0 glass-strong border-t border-[var(--glass-brd)] grid grid-cols-6 z-30"
      style={{ paddingBottom: 'var(--sab, 0px)' }}>
      {ITEMS.map(i => (
        <NavLink key={i.to} to={i.to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-2 text-[10px] ${
              isActive ? 'text-[var(--color-acc)]' : 'text-[var(--color-dim2)]'
            }`}>
          {({ isActive }) => (
            <>
              <Icon name={i.icon} size={19} style={isActive ? { color: 'var(--color-acc)' } : undefined} />
              <span className="truncate max-w-full px-1">{t(i.k)}</span>
            </>
          )}
        </NavLink>
      ))}
      <button onClick={onMore} className="flex flex-col items-center gap-0.5 py-2 text-[10px] text-[var(--color-dim2)]">
        <Icon name="Menu" size={19} />
        <span>{t('nav.more')}</span>
      </button>
    </nav>
  )
}
