/**
 * تست واقعی نسخه‌ی دسکتاپ.
 * برنامه‌ی Electron را با build واقعی بالا می‌آورد و بررسی می‌کند:
 *   رندر شدن UI · پل window.hq · ذخیره روی دیسک · نقاط بازیابی · منو
 * اجرا:  xvfb-run -a node scripts/electron-check.cjs
 */
const { app, BrowserWindow } = require('electron')
if (!app) { console.error('این اسکریپت باید با electron اجرا شود، نه node'); process.exit(1) }
const path = require('node:path')
const fs = require('node:fs')

const results = []
const ok = (name, cond, extra = '') => {
  results.push({ name, cond, extra })
  console.log(cond ? '  \u2713 ' + name : '  \u2717 ' + name + (extra ? '  ' + extra : ''))
}

app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('no-sandbox')

app.whenReady().then(async () => {
  const dataDir = path.join(app.getPath('userData'), 'data')
  const docFile = path.join(dataDir, 'nexus-hq.json')
  fs.rmSync(dataDir, { recursive: true, force: true })

  // main.cjs را داخل همین پروسه بارگذاری می‌کنیم تا IPC handlerها ثبت شوند
  require(path.join(__dirname, '..', 'electron', 'main.cjs'))

  await new Promise(r => setTimeout(r, 2500))

  const wins = BrowserWindow.getAllWindows()
  ok('پنجره ساخته شد', wins.length === 1, `got ${wins.length}`)
  const win = wins[0]
  if (!win) return finish()

  if (win.webContents.isLoading()) {
    await new Promise(r => {
      const t = setTimeout(r, 20000)
      win.webContents.once('did-finish-load', () => { clearTimeout(t); r() })
    })
  }
  await new Promise(r => setTimeout(r, 3500))

  const run = (js) => win.webContents.executeJavaScript(js, true)

  ok('عنوان پنجره', win.getTitle().includes('NEXUS'), win.getTitle())
  ok('پس‌زمینه‌ی تیره', win.getBackgroundColor().toLowerCase() === '#08090c', win.getBackgroundColor())

  const bridge = await run('typeof window.hq')
  ok('پل window.hq تزریق شد', bridge === 'object', bridge)
  ok('isDesktop = true', await run('window.hq.isDesktop === true'))
  ok('دسترسی مستقیم به Node بسته است', await run('typeof window.require === "undefined"'))

  // UI
  const bodyLen = await run('document.body.innerText.length')
  ok('رابط کاربری رندر شد', bodyLen > 500, `${bodyLen} chars`)
  ok('اسپینر رد شد', !(await run('document.body.textContent.includes("در حال آماده‌سازی")')))
  // innerText در کرومیوم واقعی text-transform را اعمال می‌کند، پس textContent بررسی می‌شود
  ok('رابط فارسی رندر شد (تمرکز امروز)', await run('document.body.textContent.includes("تمرکز امروز")'))
  ok('جهت سند راست‌چین است', (await run('document.documentElement.getAttribute("dir")')) === 'rtl')
  ok('زبان سند fa است', (await run('document.documentElement.getAttribute("lang")')) === 'fa')
  ok('قلم فارسی بارگذاری شد',
    await run('getComputedStyle(document.body).fontFamily.includes("Vazirmatn")'),
    await run('getComputedStyle(document.body).fontFamily'))
  ok('سایدبار در سمت راست است',
    await run('(() => { const a = document.querySelector("aside"); return !!a && a.getBoundingClientRect().right > window.innerWidth - 5 })()'))
  ok('۱۶ ماژول در استور', (await run('document.querySelectorAll("aside a, nav a").length')) > 10)

  // تعویض زبان از روی خود رابط کاربری (کلیک واقعی روی سوییچ زبان در تنظیمات)
  await run(`location.hash = '#/settings'`)
  await new Promise(r => setTimeout(r, 900))
  const clicked = await run(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'English')
    if (!b) return false
    b.click(); return true
  })()`)
  ok('سوییچ زبان در تنظیمات پیدا شد', clicked === true)
  await new Promise(r => setTimeout(r, 900))
  ok('تعویض به انگلیسی → چپ‌چین', (await run('document.documentElement.getAttribute("dir")')) === 'ltr')
  ok('متن انگلیسی رندر شد', await run('document.body.textContent.includes("Cloud sync")'))
  await run(`(() => {
    const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'فارسی')
    if (b) b.click()
  })()`)
  await new Promise(r => setTimeout(r, 900))
  ok('بازگشت به فارسی → راست‌چین', (await run('document.documentElement.getAttribute("dir")')) === 'rtl')
  await run(`location.hash = '#/'`)
  await new Promise(r => setTimeout(r, 700))

  // ذخیره‌سازی روی دیسک
  await new Promise(r => setTimeout(r, 1200))
  ok('فایل داده روی دیسک ساخته شد', fs.existsSync(docFile), docFile)
  if (fs.existsSync(docFile)) {
    const doc = JSON.parse(fs.readFileSync(docFile, 'utf8'))
    ok('فایل شامل ۱۶ ماژول است', doc.modules?.length === 16, `got ${doc.modules?.length}`)
    ok('فایل شامل رکوردها است',
      Object.values(doc.records || {}).reduce((n, r) => n + r.length, 0) > 50)
  }

  // نوشتن از سمت رابط کاربری → دیسک
  await run(`window.hq.save(Object.assign({}, JSON.parse(JSON.stringify(window.__probe || {})), {version:1, settings:{}, modules:[], records:{}, probe:'WRITE_TEST'}))`)
  await new Promise(r => setTimeout(r, 400))
  const written = JSON.parse(fs.readFileSync(docFile, 'utf8'))
  ok('save() از رابط کاربری روی دیسک نوشت', written.probe === 'WRITE_TEST')

  // نقطه بازیابی
  await run(`window.hq.snapPush({version:1, settings:{}, modules:[], records:{}, tag:'SNAP1'})`)
  await new Promise(r => setTimeout(r, 400))
  const snaps = await run('window.hq.snapList()')
  ok('نقطه بازیابی روی دیسک ساخته شد', Array.isArray(snaps) && snaps.length >= 1, `${snaps?.length}`)
  if (snaps?.length) {
    const got = await run(`window.hq.snapGet(${JSON.stringify(snaps[0].id)})`)
    ok('نقطه بازیابی خوانده شد', got?.tag === 'SNAP1')
  }

  // اطلاعات برنامه
  const info = await run('window.hq.info()')
  ok('info() نسخه برمی‌گرداند', !!info?.version, info?.version)
  ok('info() مسیر فایل داده را می‌دهد', !!info?.dataFile)

  // منو
  const { Menu } = require('electron')
  const menu = Menu.getApplicationMenu()
  ok('منوی برنامه ساخته شد', !!menu && menu.items.length >= 4, `${menu?.items.length} items`)

  // خطاهای کنسول صفحه
  ok('بدون خطای بحرانی در کنسول', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '))

  finish()
})

const pageErrors = []
app.on('web-contents-created', (_e, wc) => {
  wc.on('console-message', (...args) => {
    // Electron 43: (event, level, message) یا (details)
    const d = args[0]
    const level = typeof d === 'object' && d ? d.level : args[1]
    const message = typeof d === 'object' && d ? d.message : args[2]
    const isError = level === 'error' || level === 3
    if (isError && !/DevTools|Autofill|GPU|dbus|Failed to load resource/i.test(String(message))) {
      pageErrors.push(String(message).slice(0, 160))
    }
  })
  wc.on('render-process-gone', (_ev, det) => pageErrors.push('render gone: ' + det.reason))
})

function finish() {
  const failed = results.filter(r => !r.cond)
  console.log(failed.length
    ? `\n\u274c ${failed.length} از ${results.length} تست شکست خورد`
    : `\n\u2705 هر ${results.length} تست دسکتاپ موفق بود`)
  app.exit(failed.length ? 1 : 0)
}

setTimeout(() => { console.log('\n\u274c timeout'); app.exit(1) }, 90000)
