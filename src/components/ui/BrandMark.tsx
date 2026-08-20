import { useId } from 'react'

/**
 * نشان NEXUS HQ — یک مربع گرادیانی با حرف N.
 * همه‌جا (بارگذاری، قفل، سایدبار) از همین کامپوننت استفاده می‌شود تا برند یکی باشد.
 */
export function BrandMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  const id = useId().replace(/[:]/g, '')
  const gid = `bm-grad-${id}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-acc)" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="7" fill={`url(#${gid})`} />
      <path
        d="M7.5 17V7l9 10V7"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".95"
      />
    </svg>
  )
}
