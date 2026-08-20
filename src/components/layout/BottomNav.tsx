import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Primitives'
import { useT } from '../../i18n'

/**
 * نوار ناوبری پایین — فقط موبایل/اندروید.
 * به‌جای حالت کشویی، چهار صفحه‌ی اصلی همیشه در دسترس‌اند و «بیشتر» سایدبار را باز می‌کند.
 */
const ITEMS = [
  { to: '/', icon: 'LayoutDashboard', k: 'nav.dashboard' },
  { to: '/decision', icon: 'Target', k: 'nav.decision' },
  { to: '/analytics', icon: 'BarChart3', k: 'nav.analytics' },
  { to: '/settings', icon: 'Settings', k: 'nav.settings' },
]

export function BottomNav({ onMore }: { onMore: () => void }) {
  const { t } = useT()

  // توست‌ها بالای این نوار بنشینند (App.tsx از --toast-lift استفاده می‌کند)
  useEffect(() => {
    document.documentElement.style.setProperty('--toast-lift', 'calc(var(--tabbar-h) + var(--sab))')
    return () => { document.documentElement.style.removeProperty('--toast-lift') }
  }, [])

  const cls = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 flex-1 min-w-0 rounded-lg transition-colors duration-150 select-none ${
      active ? 'text-[var(--color-acc)]' : 'text-[var(--color-dim2)] active:text-[var(--color-tx)]'
    }`

  return (
    <nav
      aria-label="bottom-nav"
      className="lg:hidden shrink-0 flex items-stretch gap-1 px-2 border-t border-[var(--glass-brd)]"
      style={{
        height: 'calc(var(--tabbar-h) + var(--sab))',
        paddingBottom: 'var(--sab)',
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'blur(22px) saturate(160%)',
        WebkitBackdropFilter: 'blur(22px) saturate(160%)',
      }}>
      {ITEMS.map(i => (
        <NavLink
          key={i.to}
          to={i.to}
          end={i.to === '/'}
          className={({ isActive }) => cls(isActive)}
          aria-label={t(i.k)}>
          {({ isActive }) => (
            <>
              <Icon name={i.icon} size={19} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[9.5px] leading-none">{t(i.k)}</span>
            </>
          )}
        </NavLink>
      ))}
      <button
        type="button"
        onClick={onMore}
        aria-label={t('nav.more')}
        className={`${cls(false)} cursor-pointer`}>
        <Icon name="MoreHorizontal" size={19} />
        <span className="text-[9.5px] leading-none">{t('nav.more')}</span>
      </button>
    </nav>
  )
}
