/** نمودارهای SVG دست‌ساز — بدون هیچ کتابخانه‌ی خارجی (سبک و رایگان) */
import { useFmt } from '../../lib/useFmt'
import { useT } from '../../i18n'

export function BarChart({ data, height = 150, colors }: {
  data: { label: string; income: number; expense: number }[]
  height?: number
  colors?: [string, string]
}) {
  const { rtl } = useT()
  const [c1, c2] = colors ?? ['#22c55e', '#ef4444']
  const ordered = rtl ? [...data].reverse() : data
  const max = Math.max(1, ...data.flatMap(d => [d.income, d.expense]))
  const bw = 100 / Math.max(1, data.length)
  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
        {[0.25, 0.5, 0.75].map(g => (
          <line key={g} x1="0" x2="100" y1={height * g} y2={height * g} stroke="rgba(255,255,255,.05)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        {ordered.map((d, i) => {
          const x = i * bw
          const hi = (d.income / max) * (height - 16)
          const he = (d.expense / max) * (height - 16)
          const w = bw * 0.3
          return (
            <g key={i}>
              <rect x={x + bw * 0.16} y={height - hi} width={w} height={hi} fill={c1} rx="0.7" opacity=".9" />
              <rect x={x + bw * 0.52} y={height - he} width={w} height={he} fill={c2} rx="0.7" opacity=".9" />
            </g>
          )
        })}
      </svg>
      <div className="flex mt-1.5">
        {ordered.map((d, i) => (
          <div key={i} className="text-[10px] text-[var(--color-dim2)] text-center" style={{ width: `${bw}%` }}>{d.label}</div>
        ))}
      </div>
    </div>
  )
}

export function Donut({ data, size = 128, thickness = 15 }: {
  data: { label: string; value: number; color?: string }[]
  size?: number
  thickness?: number
}) {
  const fmt = useFmt()
  const { t } = useT()
  const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#a855f7', '#22d3ee', '#ef4444', '#94a3b8', '#ec4899']
  const total = data.reduce((s, d) => s + d.value, 0) || 1
  const r = (size - thickness) / 2
  const cx = size / 2
  const C = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width={size} height={size} className="shrink-0">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total
          const el = <circle key={i} cx={cx} cy={cx} r={r} fill="none"
            stroke={d.color ?? COLORS[i % COLORS.length]} strokeWidth={thickness}
            strokeDasharray={`${frac * C} ${C}`} strokeDashoffset={-acc * C}
            transform={`rotate(-90 ${cx} ${cx})`} strokeLinecap="butt" />
          acc += frac
          return el
        })}
        <text x={cx} y={cx - 2} textAnchor="middle" fill="var(--color-tx)" fontSize="19" fontWeight="600">{fmt.dg(total)}</text>
        <text x={cx} y={cx + 13} textAnchor="middle" fill="var(--color-dim2)" fontSize="9">{t('chart.total')}</text>
      </svg>
      <div className="space-y-1.5 min-w-[110px]">
        {data.slice(0, 7).map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-[11.5px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color ?? COLORS[i % COLORS.length] }} />
            <span className="text-[var(--color-dim)] flex-1 truncate">{d.label}</span>
            <span className="nums text-[var(--color-tx)]">{fmt.dg(d.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Sparkline({ points, color = '#6366f1', height = 40 }: { points: number[]; color?: string; height?: number }) {
  if (!points.length) return null
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const range = max - min || 1
  const d = points.map((p, i) => `${(i / Math.max(1, points.length - 1)) * 100},${height - ((p - min) / range) * (height - 4) - 2}`).join(' ')
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <polyline points={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  )
}

export function HBar({ rows, format }: { rows: { label: string; value: number; color?: string }[]; format?: (n: number) => string }) {
  const fmt = useFmt()
  const max = Math.max(1, ...rows.map(r => Math.abs(r.value)))
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div key={i}>
          <div className="flex justify-between text-[11.5px] mb-1">
            <span className="text-[var(--color-dim)] truncate pe-2">{r.label}</span>
            <span className="nums shrink-0" style={{ color: r.color ?? 'var(--color-tx)' }}>
              {format ? format(r.value) : fmt.dg(r.value)}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[.05] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(Math.abs(r.value) / max) * 100}%`, background: r.color ?? 'var(--color-acc)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
