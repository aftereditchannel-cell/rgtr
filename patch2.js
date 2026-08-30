const fs = require('fs')
const path = require('path')

// 1. App.tsx (remove modal for pending prompt)
let app = fs.readFileSync(path.join(__dirname, 'src/App.tsx'), 'utf8')
app = app.replace(
/\{useApp\.getState\(\)\.pendingCloudPrompt && \([\s\S]*?\)\}/,
''
)
fs.writeFileSync(path.join(__dirname, 'src/App.tsx'), app)

// 2. dict.ts
let dict = fs.readFileSync(path.join(__dirname, 'src/i18n/dict.ts'), 'utf8')
dict = dict.replace(
/'sync\.askCloud':.*?\n.*?\n.*?\n/,
''
)
dict = dict.replace(
/'set\.cloudPending': \{ fa: 'یک تغییر فقط محلی است و منتظر ارسال ابری است', en: 'One local change is waiting for cloud upload' \}/,
`'set.cloudPending': { fa: 'این محلی سیو شده و منتظر ارسال ابری است', en: 'Saved locally and waiting for cloud upload' }`
)
fs.writeFileSync(path.join(__dirname, 'src/i18n/dict.ts'), dict)

// 3. store/useApp.ts (remove pending prompt vars, put back fast auto sync)
let store = fs.readFileSync(path.join(__dirname, 'src/store/useApp.ts'), 'utf8')
store = store.replace(
/pendingCloudPrompt: boolean\n  setPendingCloudPrompt: \(val: boolean\) => void\n  triggerCloudPush: \(\) => Promise<void>\n/,
''
)
store = store.replace(
/pendingCloudPrompt: false,\n\n    setPendingCloudPrompt: \(val\) => set\(\{ pendingCloudPrompt: val \}\),\n    triggerCloudPush: autoPush,\n/,
''
)
store = store.replace(
/const scheduleCloudPush = \(\) => \{[\s\S]*?\}\n/,
`const scheduleCloudPush = () => {
    if (!cloud.isCloudReady()) return
    if (syncTimer) clearTimeout(syncTimer)
    // اولویت با گوگل درایو است، پس از تاخیر کوتاه مستقیما تلاش می‌کند
    syncTimer = setTimeout(() => { void autoPush() }, 600)
  }
`
)
fs.writeFileSync(path.join(__dirname, 'src/store/useApp.ts'), store)

// 4. googleDriveCloud.ts logic fix
let drv = fs.readFileSync(path.join(__dirname, 'src/lib/googleDriveCloud.ts'), 'utf8')
drv = drv.replace(
/export function configure\(value: string\): string \{[\s\S]*?return scriptUrl\n\}/,
`export function configure(value: string): string {
  let normalized = normalizeGoogleScriptUrl(value)
  if (!normalized && session?.scriptUrl) normalized = session.scriptUrl
  
  if (scriptUrl === normalized) return scriptUrl
  scriptUrl = normalized
  initializedFor = ''
  // token هر Script خصوصی است و هرگز نباید به URL متفاوت ارسال شود.
  if (session && session.scriptUrl !== scriptUrl) {
    session = null
    try { localStorage.removeItem(SESSION_KEY) } catch { /* ignore */ }
  }
  emit()
  return scriptUrl
}`
)
fs.writeFileSync(path.join(__dirname, 'src/lib/googleDriveCloud.ts'), drv)
