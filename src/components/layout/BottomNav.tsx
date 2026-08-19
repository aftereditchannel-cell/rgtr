import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Primitives'
import { useT } from '../../i18n'

/**
 * ناوبری پایین — فقط موبایل.
 * چهار مقصد اصلی + دکمه‌ی «بیشتر» که سایدبار را باز می‌کند.
 */
const ITEMS = [
  { to: '/', icon: 'LayoutDashboard', k: 'nav.dashboard' },
  { to: '/decision', icon: 'Target', k: 'nav.decision' },
  { to: '/analytics', icon: 'BarChart3', k: 'nav.analytics' },
  { to: '/settings', icon: 'Settings', k: 'nav.settings' },
]

export function BottomNav({ onMore }: { onMore: () => void }) {
  const { t } = useT()
  return (
    <nav
      className="lg:hidden shrink-0 glass-strong border-t border-[var(--glass-brd)] grid grid-cols-5"
      style={{ paddingBottom: 'var(--sab)' }}
    >
      {ITEMS.map(i => (
        <NavLink
          key={i.to}
          to={i.to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 py-2 min-h-[calc(var(--tabbar-h,58px))] transition-colors ${
              isActive ? 'text-[var(--color-acc)]' : 'text-[var(--color-dim2)]'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <Icon name={i.icon} size={19} className={isActive ? 'text-[var(--color-acc)]' : 'text-[var(--color-dim2)]'} />
              <span className="text-[9.5px] leading-none">{t(i.k)}</span>
            </>
          )}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={onMore}
        aria-label={t('nav.more')}
        className="flex flex-col items-center justify-center gap-0.5 py-2 text-[var(--color-dim2)] active:text-[var(--color-tx)]"
      >
        <Icon name="Menu" size={19} />
        <span className="text-[9.5px] leading-none">{t('nav.more')}</span>
      </button>
    </nav>
  )
}
