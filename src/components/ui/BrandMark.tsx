import type { CSSProperties } from 'react'
import { Icon } from './Primitives'

/**
 * نشان برند — از آپلود کاربر در تنظیمات (branding.logo) استفاده می‌کند،
 * وگرنه یک آیکون پیش‌فرض Command روی گرادیان می‌گذارد.
 */
export function BrandMark({ size = 24, className = '', style }: { size?: number; className?: string; style?: CSSProperties }) {
  return <Icon name="Command" size={size} className={className} style={style} />
}
