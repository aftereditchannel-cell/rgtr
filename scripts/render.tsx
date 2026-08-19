/**
 * تست رندر واقعی در jsdom — با استور واقعی، IndexedDB واقعی (fake-indexeddb) و کلیک.
 * npm run render
 */
import 'fake-indexeddb/auto'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost/', pretendToBeVisual: true,
})
const g = globalThis as Record<string, unknown>
g.window = dom.window; g.document = dom.window.document; g.navigator = dom.window.navigator
g.HTMLElement = dom.window.HTMLElement; g.Element = dom.window.Element; g.Node = dom.window.Node
g.getComputedStyle = dom.window.getComputedStyle; g.requestAnimationFrame = (f: FrameRequestCallback) => setTimeout(() => f(0), 0)
g.cancelAnimationFrame = (h: number) => clearTimeout(h)
g.IS_REACT_ACT_ENVIRONMENT = true

const errors: string[] = []
const origErr = console.error
console.error = (...a: unknown[]) => { errors.push(a.map(String).join(' ')); origErr(...a) }
dom.window.addEventListener('error', (e: ErrorEvent) => errors.push('window.error: ' + e.message))

const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { act } = await import('react')
const App = (await import('../src/App')).default
const { useApp } = await import('../src/store/useApp')

const root = createRoot(document.getElementById('root')!)
const tick = () => new Promise(r => setTimeout(r, 60))

await act(async () => { root.render(React.createElement(App)); await tick() })
await act(async () => { await tick(); await tick() })

const text = () => document.body.textContent ?? ''
const html = () => document.getElementById('root')!.innerHTML

let fails = 0
function assert(name: string, cond: boolean, extra = '') {
  if (cond) console.log('  ✓', name)
  else { fails++; console.log('  ✗', name, extra) }
}

console.log('BOOT')
const st = useApp.getState()
assert('store ready', st.ready)
assert('16 modules seeded', st.data.modules.length === 16, `got ${st.data.modules.length}`)
assert('records loaded', Object.values(st.data.records).reduce((n, r) => n + r.length, 0) > 50)
assert('no loading spinner', !text().includes('Loading workspace'))
assert('default language is Persian', st.data.settings.lang === 'fa')
assert('document dir is rtl', document.documentElement.getAttribute('dir') === 'rtl')

console.log('\nROUTES')
async function go(hash: string, label: string, mustContain: string[]) {
  await act(async () => { dom.window.location.hash = hash; await tick(); await tick() })
  const t = text()
  const missing = mustContain.filter(m => !t.includes(m))
  assert(`${label} (${hash})`, missing.length === 0 && html().length > 1500,
    missing.length ? `missing: ${missing.join(', ')}` : `only ${html().length} chars`)
}

// ---- فارسی (پیش‌فرض) ----
await go('#/', 'Dashboard fa', ['تمرکز امروز', 'بعداً'])
await go('#/decision', 'Decision fa', ['اولویت بالا'])
await go('#/analytics', 'Analytics fa', ['مجموع درآمد', 'سود خالص'])
await go('#/settings', 'Settings fa', ['تنظیمات', 'JSON', 'همگام‌سازی ابری'])
for (const m of st.data.modules) await go('#/m/' + m.key, m.label.padEnd(14), [])

// ---- انگلیسی ----
console.log('\nI18N — switch to English')
await act(async () => { useApp.getState().setSettings({ lang: 'en', calendar: 'gregorian', digits: 'latn' }); await tick(); await tick() })
assert('document dir is ltr', document.documentElement.getAttribute('dir') === 'ltr')
await go('#/', 'Dashboard en', ["Today's Focus", 'Later'])
await go('#/decision', 'Decision en', ['HIGH priority'])
await go('#/analytics', 'Analytics en', ['Total Income', 'Net Profit'])
await go('#/settings', 'Settings en', ['Settings', 'Cloud sync'])
{
  // «فارسی»، «۱۲۳» و ریال، برچسب‌های عمدی سوییچ زبان/ارقام و واحد پول هستند
  const leak = text().replace(/فارسی|﷼|[۰-۹]/g, '').match(/[\u0600-\u06FF][\u0600-\u06FF\s]{0,40}/g) ?? []
  assert('no Persian leakage in English mode', leak.length === 0, leak.slice(0, 6).join(' | '))
}
await act(async () => { useApp.getState().setSettings({ lang: 'fa', calendar: 'jalali', digits: 'fa' }); await tick(); await tick() })
assert('back to Persian', document.documentElement.getAttribute('dir') === 'rtl')

// ---- حذف و بازگرداندن ماژول‌های پیش‌فرض ----
console.log('\nCORE MODULE DELETE / RESTORE')
await act(async () => { useApp.getState().removeModule('seo'); await tick() })
assert('core module deletable', useApp.getState().data.modules.length === 15)
assert('removedCore recorded', (useApp.getState().data.removedCore ?? []).includes('seo'))
await act(async () => { useApp.getState().restoreCoreModules(); await tick() })
assert('core modules restorable', useApp.getState().data.modules.length === 16)
assert('removedCore cleared', (useApp.getState().data.removedCore ?? []).length === 0)

console.log('\nINTERACTION')
await go('#/m/tasks', 'tasks', [])
const before = useApp.getState().data.records.tasks.length
await act(async () => {
  useApp.getState().add('tasks', { title: 'TEST TASK ZZZ', status: 'To Do', priority: 'High' })
  await tick()
})
assert('add() creates record', useApp.getState().data.records.tasks.length === before + 1)
await act(async () => { await tick(); await tick() })
assert('new record appears in DOM', text().includes('TEST TASK ZZZ'))

const id = useApp.getState().data.records.tasks.find(t => t.title === 'TEST TASK ZZZ')!.id
await act(async () => { useApp.getState().update('tasks', id, { status: 'Done' }); await tick() })
assert('update() persists', useApp.getState().data.records.tasks.find(t => t.id === id)!.status === 'Done')
await act(async () => { useApp.getState().remove('tasks', id); await tick() })
assert('remove() works', useApp.getState().data.records.tasks.length === before)

await act(async () => {
  const { makeCustomModule } = await import('../src/domain/schema')
  useApp.getState().addModule(makeCustomModule('Podcast Test'))
  await tick()
})
assert('runtime module creation', useApp.getState().data.modules.length === 17)
await go('#/m/m_podcast_test', 'custom module route', [])
await act(async () => { useApp.getState().removeModule('m_podcast_test'); await tick() })
assert('module deletion', useApp.getState().data.modules.length === 16)

console.log('\nPERSISTENCE')
await act(async () => { await useApp.getState().persist(); await tick() })
const { loadDoc } = await import('../src/lib/db')
const saved = await loadDoc()
assert('doc written to IndexedDB', !!saved && (saved as { modules: unknown[] }).modules.length === 16)

const real = errors.filter(e => !/not wrapped in act|useLayoutEffect does nothing on the server|Warning: ReactDOM/.test(e))
console.log('\nCONSOLE ERRORS:', real.length)
real.slice(0, 8).forEach(e => console.log('   !', e.slice(0, 200)))

const bad = fails + real.length
console.log(bad ? `\n❌ ${fails} assertion(s) failed, ${real.length} console error(s)` : '\n✅ ALL RUNTIME CHECKS PASSED')
process.exit(bad ? 1 : 0)
