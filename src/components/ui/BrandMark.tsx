import { Icon } from './Primitives'

export function BrandMark({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`grid place-items-center ${className}`}
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, var(--color-acc), #a855f7)',
        borderRadius: size * 0.28,
      }}>
      <Icon name="Command" size={Math.round(size * 0.52)} className="text-white" />
    </div>
  )
}
