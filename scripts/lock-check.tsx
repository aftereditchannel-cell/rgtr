/**
 * بررسی کامل قفل در jsdom — بدون نیاز به نمایشگر/الکترون.
 *   npm run lock:check
 *
 * همان سناریوی scripts/probe-lock.cjs (که روی ویندوز/الکترون اجرا می‌شود)
 * ولی اینجا فقط با jsdom: رمزنگاری، شمارش تلاش، قفل موقت، و رندر صفحه‌ی قفل.
 */
import 'fake-indexeddb/auto'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/', pretendToBeVisual: true,
})
const g = globalThis as Record<string, unknown>
g.window = dom.window; g.document = dom.window.document
Object.defineProperty(g, 'navigator', { value: dom.window.navigator, configurable: true })
Object.defineProperty(g, 'localStorage', { value: dom.window.localStorage, configurable: true })
g.HTMLElement = dom.window.HTMLElement; g.Element = dom.window.Element; g.Node = dom.window.Node
g.getComputedStyle = dom.window.getComputedStyle
g.requestAnimationFrame = (f: FrameRequestCallback) => setTimeout(() => f(0), 0)
g.cancelAnimationFrame = (h: number) => clearTimeout(h)
g.IS_REACT_ACT_ENVIRONMENT = true

const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { act } = await import('react')
const App = (await import('../src/App')).default
const {
  setPasscode, verifyPasscode, isLockEnabled,
  readLock, disableLock, attemptsLeft, cooldownRemaining,
} = await import('../src/lib/lock')

let fails = 0
const assert = (name: string, cond: boolean, extra = '') => {
  if (cond) console.log('  ✓', name)
  else { fails++; console.log('  ✗', name, extra) }
}

const tick = () => new Promise(r => setTimeout(r, 60))

console.log('CORE — hashing & attempts')
await act(async () => { localStorage.clear() })
{
  const r = await setPasscode('1234', { hint: 'سال تولد' })
  assert('setPasscode ok', r.ok)
  assert('lock enabled', isLockEnabled())
  const c = readLock()
  assert('hash+ salt stored', !!c.hash && !!c.salt)
  assert('passcode is not plaintext', c.hash !== '1234' && !JSON.stringify(c).includes('1234'))
  assert('hint kept', c.hint === 'سال تولد')

  assert('wrong passcode rejected', (await verifyPasscode('9999')) === false)
  assert('attempts counted (4 left)', attemptsLeft() === 4)
  assert('persian digits accepted', (await verifyPasscode('۱۲۳۴')) === true)
  assert('attempts reset after success', attemptsLeft() === 5)
  assert('latin digits accepted', (await verifyPasscode('1234')) === true)

  for (let i = 0; i < 5; i++) await verifyPasscode('0000')
  assert('cooldown after 5 fails', cooldownRemaining() > 0)
  assert('blocked during cooldown', (await verifyPasscode('1234')) === false)
  assert('no attempts left during cooldown', attemptsLeft() === 0)

  disableLock()
  assert('disableLock turns off', !isLockEnabled())
}

console.log('\nUI — lock screen flow')
await act(async () => {
  localStorage.clear()
  await setPasscode('1234', { hint: 'سال تولد' })
})

const root = createRoot(document.getElementById('root')!)
await act(async () => { root.render(React.createElement(App)); await tick() })
await act(async () => { await tick(); await tick() })

const lockEl = () => document.querySelector<HTMLElement>('.z-\\[100\\]')
{
  assert('lock screen rendered on boot', !!lockEl())
  const el = lockEl()!
  assert('numpad buttons >= 11', el.querySelectorAll('button').length >= 11,
    `got ${el.querySelectorAll('button').length}`)
  assert('hint shown', el.textContent?.includes('سال تولد') ?? false)
  assert('unlock button present', /باز کردن/.test(el.textContent ?? ''))
}

const tap = async (digits: string) => {
  for (const d of digits) {
    const el = lockEl()
    const b = el && [...el.querySelectorAll('button')].find(x => x.textContent?.trim() === d)
    await act(async () => { b?.click(); await tick() })
  }
}
const pressUnlock = async () => {
  const el = lockEl()
  const b = el && [...el.querySelectorAll('button')].find(x => /باز کردن|Unlock/.test(x.textContent ?? ''))
  await act(async () => { b?.click(); await tick() })
}

await tap('۹۹۹۹')
await pressUnlock()
await act(async () => { await tick(); await tick() })
assert('wrong passcode keeps screen', !!lockEl())
assert('error message shown', /تلاش باقی مانده/.test(document.body.textContent ?? ''))

await tap('۱۲۳۴')
await pressUnlock()
await act(async () => { await tick(); await tick() })
assert('correct passcode unlocks', !lockEl())

console.log('\nSETTINGS — security card')
await act(async () => { dom.window.location.hash = '#/settings'; await tick(); await tick() })
{
  const t = document.body.textContent ?? ''
  assert('security card heading', /قفل و امنیت/.test(t))
  assert('active state shown', /فعال/.test(t))
  assert('change / lock-now actions', /تغییر رمز عبور/.test(t) && /قفل کردن الان/.test(t))
  assert('auto-lock select present', [...document.querySelectorAll('select')].some(s => /بعد از|همیشه|فقط هنگام/.test(s.textContent ?? '')))

  // «قفل کردن الان» باید فوراً صفحه‌ی قفل را بیاورد
  const lockBtn = [...document.querySelectorAll('button')].find(b => /قفل کردن الان/.test(b.textContent ?? ''))
  await act(async () => { lockBtn?.click(); await tick(); await tick() })
  assert('lock-now opens lock screen', !!lockEl())
  assert('passcode still required', (document.body.textContent ?? '').includes('سال تولد'))
}

console.log(fails ? `\n❌ ${fails} FAILED` : '\n✅ ALL LOCK CHECKS PASSED')
process.exit(fails ? 1 : 0)
