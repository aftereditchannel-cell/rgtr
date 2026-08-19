const AB = 'abcdefghijklmnopqrstuvwxyz0123456789'

export function uid(prefix = ''): string {
  let s = ''
  const buf = new Uint8Array(12)
  ;(globalThis.crypto ?? ({} as Crypto)).getRandomValues?.(buf)
  for (let i = 0; i < 12; i++) s += AB[(buf[i] || Math.floor(Math.random() * 256)) % AB.length]
  return prefix ? `${prefix}_${s}` : s
}

export const nowISO = () => new Date().toISOString()
