import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Primitives'
import { useT } from '../../i18n'

/**
 * ناوبری پایین — فقط موبایل.
 * چهار مقصد ثابت + دکمه‌ی «بیشتر» که سایدبار را باز می‌کند.
 * در جریان سند (غیر از fixed) قرار دارد تا محتوا زیرش پنهان نشود؛
 * ارتفاعش با --toast-lift به اعلان‌ها اعلام می‌شود (index.css).
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
    <nav className="lg:hidden shrink-0 glass-strong border-t border-[var(--glass-brd)] pb-safe" aria-label="bottom nav">
      <div className="grid grid-cols-5 max-w-md mx-auto px-1 pt-1.5 pb-1">
        {ITEMS.map(i => (
          <NavLink key={i.to} to={i.to} end={i.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 rounded-lg transition-colors ${isActive ? 'text-[var(--color-acc)]' : 'text-[var(--color-dim)]'}`
            }>
            {({ isActive }) => (
              <>
                <Icon name={i.icon} size={19} className="shrink-0" style={{ color: isActive ? 'var(--color-acc)' : undefined }} />
                <span className="text-[9.5px] leading-none truncate max-w-full px-0.5">{t(i.k)}</span>
              </>
            )}
          </NavLink>
        ))}
        <button onClick={onMore} aria-label={t('nav.more')}
          className="flex flex-col items-center gap-1 py-1 rounded-lg text-[var(--color-dim)] active:bg-[var(--hover)] transition-colors">
          <Icon name="Menu" size={19} className="shrink-0" />
          <span className="text-[9.5px] leading-none">{t('nav.more')}</span>
        </button>
      </div>
    </nav>
  )
}
