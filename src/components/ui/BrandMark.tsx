import { Icon } from './Primitives'

/**
 * نشان برند NEXUS HQ — مربع گرادیانی با آیکون فرمان.
 * در صفحه‌ی بارگذاری، صفحه‌ی قفل و هر جای دیگری که برند لازم است.
 */
export function BrandMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  const box = Math.round(size * 1.65)
  return (
    <div
      className={`grid place-items-center rounded-[30%] ${className}`}
      style={{
        width: box,
        height: box,
        background: 'linear-gradient(135deg, var(--color-acc), #a855f7)',
        boxShadow: '0 6px 22px -8px var(--color-acc)',
      }}
    >
      <Icon name="Command" size={size} className="text-white" />
    </div>
  )
}
