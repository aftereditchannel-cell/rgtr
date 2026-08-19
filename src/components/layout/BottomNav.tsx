import { NavLink } from 'react-router-dom'
import { Icon } from '../ui/Primitives'
import { useT } from '../../i18n'

/**
 * ناوبری پایین — فقط موبایل (lg:hidden).
 * پنج مقصد اصلی در دسترس شست: داشبورد، کارها، پروژه‌ها، مرکز تصمیم، «بیشتر».
 */
const DEST = [
  { to: '/', icon: 'LayoutDashboard', k: 'nav.dashboard', end: true },
  { to: '/m/tasks', icon: 'CheckSquare', k: 'nav.tasks' },
  { to: '/m/projects', icon: 'FolderKanban', k: 'nav.projects' },
  { to: '/decision', icon: 'Target', k: 'nav.decision' },
]

export function BottomNav({ onMore }: { onMore: () => void }) {
  const { t } = useT()
  return (
    <nav className="lg:hidden shrink-0 border-t border-[var(--color-line)] glass-strong"
      style={{ paddingBottom: 'var(--sab)' }}>
      <div className="grid grid-cols-5">
        {DEST.map(d => (
          <NavLink
            key={d.to}
            to={d.to}
            end={d.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 pt-2.5 transition-colors ${
                isActive ? 'text-[var(--color-acc)]' : 'text-[var(--color-dim2)]'
              }`}
          >
            <Icon name={d.icon} size={19} />
            <span className="text-[9.5px] leading-none">{t(d.k)}</span>
          </NavLink>
        ))}
        <button onClick={onMore} className="flex flex-col items-center gap-1 py-2 pt-2.5 text-[var(--color-dim2)]">
          <Icon name="MoreHorizontal" size={19} />
          <span className="text-[9.5px] leading-none">{t('nav.more')}</span>
        </button>
      </div>
    </nav>
  )
}
