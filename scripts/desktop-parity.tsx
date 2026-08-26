/**
 * تست برابری رابط ویندوز با رابط مشترک Android/Web.
 *
 * پل Electron پیش از import شدن برنامه تزریق می‌شود؛ بنابراین App دقیقاً در حالت
 * دسکتاپ رندر می‌شود و تنظیمات، Firebase، مودال‌ها، فیلدها و تقویم بررسی می‌شوند.
 */
import 'fake-indexeddb/auto'
import { JSDOM } from 'jsdom'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  // پل mock شده‌ی Electron حالت دسکتاپ را فعال می‌کند؛ یک origin معتبر هم
  // localStorage موردنیاز قفل و Firebase را در jsdom در دسترس نگه می‌دارد.
  url: 'https://nexus.local/',
  pretendToBeVisual: true,
})

const g = globalThis as Record<string, unknown>
const def = (key: string, value: unknown) => {
  try { Object.defineProperty(g, key, { value, configurable: true, writable: true }) } catch { /* Node قدیمی */ }
}
def('window', dom.window)
def('document', dom.window.document)
def('navigator', dom.window.navigator)
def('HTMLElement', dom.window.HTMLElement)
def('Element', dom.window.Element)
def('Node', dom.window.Node)
def('getComputedStyle', dom.window.getComputedStyle)
def('localStorage', dom.window.localStorage)
def('sessionStorage', dom.window.sessionStorage)
g.requestAnimationFrame = (fn: FrameRequestCallback) => setTimeout(() => fn(0), 0)
g.cancelAnimationFrame = (handle: number) => clearTimeout(handle)
g.IS_REACT_ACT_ENVIRONMENT = true

let savedDocument: unknown = null
const noSubscription = () => () => {}
Object.defineProperty(dom.window, 'hq', {
  configurable: true,
  value: {
    isDesktop: true,
    load: async () => null,
    save: async (data: unknown) => { savedDocument = data },
    snapPush: async () => {},
    snapList: async () => [],
    snapGet: async () => null,
    exportBackup: async () => ({ ok: true, path: 'C:\\Users\\Test\\Documents\\nexus-backup.json' }),
    importBackup: async () => ({ ok: false }),
    saveText: async () => ({ ok: true, path: 'C:\\Users\\Test\\Documents\\export.txt' }),
    info: async () => ({
      version: '1.2.0', platform: 'win32', electron: '43.4.0', chrome: '144.0.0', node: '22.0.0',
      dataFile: 'C:\\Users\\Test\\AppData\\Roaming\\NexusHQ\\data\\nexus-hq.json',
      dataDir: 'C:\\Users\\Test\\AppData\\Roaming\\NexusHQ\\data',
    }),
    openDataDir: async () => {},
    confirm: async () => true,
    updateCheck: async () => ({ ok: true, source: 'api', releases: [] }),
    updateDownload: async () => ({ ok: true, path: '', size: 0, name: '' }),
    updateCancel: async () => true,
    updateInstall: async () => ({ ok: true, launched: true }),
    updateOpenFolder: async () => {},
    onUpdate: noSubscription,
    exitNow: async () => {},
    cancelExit: async () => {},
    onMenu: noSubscription,
  },
})

const errors: string[] = []
const originalError = console.error
console.error = (...args: unknown[]) => {
  const line = args.map(String).join(' ')
  errors.push(line)
  originalError(...args)
}
dom.window.addEventListener('error', event => errors.push('window.error: ' + event.message))

const React = (await import('react')).default
const { createRoot } = await import('react-dom/client')
const { act } = await import('react')
const App = (await import('../src/App')).default
const { useApp } = await import('../src/store/useApp')
const { storageBackend } = await import('../src/lib/db')
const { isDesktop } = await import('../src/lib/desktop')

const root = createRoot(document.getElementById('root')!)
const tick = (ms = 70) => new Promise(resolve => setTimeout(resolve, ms))
const settle = async () => { await tick(); await tick() }

await act(async () => { root.render(React.createElement(App)); await settle() })
await act(async () => { await settle() })

let failures = 0
function assert(name: string, condition: boolean, extra = '') {
  if (condition) console.log('  ✓', name)
  else { failures++; console.log('  ✗', name, extra) }
}

const bodyText = () => document.body.textContent ?? ''
const buttons = () => [...document.querySelectorAll('button')]
const exactButton = (label: string) => buttons().find(button => button.textContent?.trim() === label)
const click = async (element: Element | undefined) => {
  await act(async () => {
    if (element instanceof dom.window.HTMLElement) element.click()
    await settle()
  })
}
const go = async (hash: string) => {
  await act(async () => { dom.window.location.hash = hash; await settle() })
}
const visibleText = (value: string) => [...document.querySelectorAll('h1,h2,h3,span,p,button')]
  .some(element => element.textContent?.trim() === value && !element.closest('.hidden'))
const visibleTextIncludes = (value: string) => [...document.querySelectorAll('h1,h2,h3,span,p,button')]
  .some(element => element.textContent?.includes(value) && !element.closest('.hidden'))

console.log('WINDOWS RUNTIME')
assert('Electron bridge is active', isDesktop)
assert('Windows uses the disk backend', storageBackend() === 'disk', storageBackend())
assert('shared app data loaded', useApp.getState().ready && useApp.getState().data.modules.length === 16)
assert('NEXUS logo rendered', !!document.querySelector('svg[aria-label="NEXUS HQ"]'))
assert('all module/page links rendered', document.querySelectorAll('aside a').length >= 16)

console.log('\nSETTINGS PARITY')
await go('#/settings')
const tabs = ['همگام‌سازی', 'ظاهر و حساب', 'API و اتصال‌ها', 'داده و بکاپ', 'سیستم و نسخه']
for (const tab of tabs) assert(`settings tab: ${tab}`, !!exactButton(tab))
assert('sync is the first active tab', exactButton('همگام‌سازی')?.className.includes('bg-[var(--color-acc)]') === true)
assert('Firebase email field exists', !!document.querySelector('input[type="email"]'))
assert('Firebase password field exists', !!document.querySelector('input[type="password"]'))
assert('email sign-in action exists', !!exactButton('ورود'))
assert('email account creation exists', !!exactButton('ساخت حساب'))

await click(exactButton('ظاهر و حساب'))
assert('appearance/branding section opens', visibleText('نام برنامه'))
assert('Jalali/Gregorian calendar setting exists', visibleText('تقویم'))
assert('logo upload controls exist', visibleTextIncludes('لوگو'))

await click(exactButton('API و اتصال‌ها'))
assert('API and AI section opens', visibleTextIncludes('هوش مصنوعی'))

await click(exactButton('داده و بکاپ'))
assert('data and backup section opens', visibleText('پشتیبان‌گیری و بازیابی'))

await click(exactButton('سیستم و نسخه'))
assert('Windows system section opens', visibleText('نسخه‌ی دسکتاپ (ویندوز)'))
assert('Electron runtime information appears', bodyText().includes('Electron 43.4.0'))
assert('Windows data path appears', bodyText().includes('nexus-hq.json'))

console.log('\nFIELDS, DIALOGS & CALENDAR')
await go('#/m/clients')
assert('CRM page opens in desktop mode', bodyText().includes('مشتری‌ها'))
await click(exactButton('رکورد جدید'))
let dialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')]
const recordDialog = dialogs[0]
assert('record dialog opens', dialogs.length === 1)
assert('dialog is portaled directly to document.body', recordDialog?.parentElement === document.body)
assert('dialog is fixed to the viewport', recordDialog?.className.includes('fixed inset-0') === true)
assert('dialog has viewport-safe max height', recordDialog?.firstElementChild?.className.includes('max-h-[calc(100dvh-1.5rem)]') === true)
assert('all CRM fields are present', (recordDialog?.querySelectorAll('label').length ?? 0) >= 11)
assert('phone field uses the Windows telephone input', !!recordDialog?.querySelector('input[type="tel"]'))

const dateTrigger = [...(recordDialog?.querySelectorAll('button') ?? [])]
  .find(button => button.textContent?.includes('انتخاب تاریخ'))
assert('custom date picker trigger exists', !!dateTrigger)
await click(dateTrigger)
dialogs = [...document.querySelectorAll<HTMLElement>('[role="dialog"]')]
const calendarDialog = dialogs.at(-1)
assert('custom calendar dialog opens above the record form', dialogs.length === 2)
assert('calendar is also portaled to body', calendarDialog?.parentElement === document.body)
assert('calendar contains weekday headings', (calendarDialog?.querySelectorAll('.grid-cols-7').length ?? 0) >= 2)
const firstDay = calendarDialog?.querySelector<HTMLElement>('button.h-9')
assert('calendar contains selectable date cells', !!firstDay)
await click(firstDay ?? undefined)
assert('choosing a date closes only the calendar', document.querySelectorAll('[role="dialog"]').length === 1)

console.log('\nLOCAL-FIRST DESKTOP SAVE')
await act(async () => { await useApp.getState().persist(); await settle() })
const saved = savedDocument as { modules?: unknown[] } | null
assert('desktop save writes through the Electron disk bridge', (saved?.modules?.length ?? 0) === 16)

const realErrors = errors.filter(error => !/not wrapped in act|useLayoutEffect does nothing|Warning: ReactDOM/.test(error))
console.log('\nCONSOLE ERRORS:', realErrors.length)
realErrors.slice(0, 8).forEach(error => console.log('   !', error.slice(0, 200)))

const bad = failures + realErrors.length
console.log(bad
  ? `\n❌ DESKTOP PARITY FAILED — ${failures} assertion(s), ${realErrors.length} console error(s)`
  : '\n✅ WINDOWS / SHARED UI PARITY PASSED')
process.exit(bad ? 1 : 0)
