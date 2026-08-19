/** جداکننده‌ی هزارگان برای اعداد آماری */
export function t(n: string | number): string {
  const num = typeof n === 'string' ? Number(n) : n
  if (!Number.isFinite(num)) return String(n)
  return num.toLocaleString('en-US')
}
