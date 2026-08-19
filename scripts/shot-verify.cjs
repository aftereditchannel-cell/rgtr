/**
 * بررسی چیدمان پس از بازطراحی:
 *  ۱. فرم‌های بلند در ابعاد گوشی و لپ‌تاپ بریده نشوند (footer دیده شود)
 *  ۲. سرریز افقی نداشته باشیم
 *  ۳. تم روشن و تیره هر دو رندر شوند
 *  ۴. نوار پایین موبایل حضور داشته باشد
 */
const { app, BrowserWindow } = require('electron')
const path = require('node:path'); const fs = require('node:fs')
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox')

const OUT = path.join(__dirname, '..', 'docs', 'screens')
let fails = 0
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`)
  if (!ok) fails++
}

app.whenReady().then(async () => {
  fs.rmSync(path.join(app.getPath('userData'), 'data'), { recursive: true, force: true })
  require(path.join(__dirname, '..', 'electron', 'main.cjs'))
  await new Promise(r => setTimeout(r, 3000))
  const win = BrowserWindow.getAllWindows()[0]
  if (win.webContents.isLoading()) await new Promise(r => win.webContents.once('did-finish-load', r))
  win.setMinimumSize(320, 400)
  const run = js => win.webContents.executeJavaScript(js, true)
  const wait = ms => new Promise(r => setTimeout(r, ms))
  fs.mkdirSync(OUT, { recursive: true })
  const snap = f => win.webContents.capturePage().then(i => fs.writeFileSync(path.join(OUT, f), i.toPNG()))

  const overflow = () => run(`(() => {
    const vw = document.documentElement.clientWidth
    return [...document.querySelectorAll('*')]
      .filter(e => e.getBoundingClientRect().width > vw + 2)
      .slice(0, 6)
      .map(e => e.tagName + '.' + (typeof e.className === 'string' ? e.className.slice(0,40) : ''))
  })()`)

  /* ---------- سناریوی گوشی ---------- */
  await run(`document.body.classList.add('is-mobile'); true`)
  win.setSize(412, 915)
  await run(`location.hash='#/'`); await wait(1500)

  check('mobile: no horizontal overflow', (await overflow()).length === 0, JSON.stringify(await overflow()))
  check('mobile: bottom nav visible', await run(`!!document.querySelector('nav[aria-label]') &&
    document.querySelector('nav[aria-label]').getBoundingClientRect().height > 40`))
  await snap('v-m-dashboard.png')

  // فرم بلند: ماژول projects بیشترین تعداد فیلد را دارد
  await run(`location.hash='#/m/projects'`); await wait(1400)
  await run(`[...document.querySelectorAll('button')].find(b => /رکورد جدید|New record/.test(b.textContent))?.click(); true`)
  await wait(900)
  const formInfo = () => run(`(() => {
    const dlg = document.querySelector('[role=dialog]')
    if (!dlg) return null
    const r = dlg.getBoundingClientRect()
    const btns = [...dlg.querySelectorAll('button')]
    const saveBtn = btns[btns.length - 1]
    const sr = saveBtn.getBoundingClientRect()
    const scroller = dlg.querySelector('.scroll-y')
    return {
      top: Math.round(r.top), bottom: Math.round(r.bottom),
      vh: window.innerHeight,
      saveVisible: sr.bottom <= window.innerHeight + 1 && sr.top >= -1,
      fitsViewport: r.top >= -1 && r.bottom <= window.innerHeight + 1,
      scrollable: scroller ? scroller.scrollHeight > scroller.clientHeight : false,
      fields: dlg.querySelectorAll('label').length,
    }
  })()`)
  let fi = await formInfo()
  check('mobile: form modal fits viewport', fi && fi.fitsViewport, JSON.stringify(fi))
  check('mobile: save button reachable', fi && fi.saveVisible)
  check('mobile: form body scrolls internally', fi && fi.scrollable)
  await snap('v-m-form.png')

  /* ---------- گوشی کوتاه (بدترین حالت) ---------- */
  win.setSize(360, 640)
  await wait(700)
  fi = await formInfo()
  check('small phone 360x640: form fits', fi && fi.fitsViewport, JSON.stringify(fi))
  check('small phone: save reachable', fi && fi.saveVisible)
  await snap('v-m-form-small.png')

  /* ---------- تم روشن ---------- */
  await run(`(() => {
    const s = JSON.parse(localStorage.getItem('nexus_hq_doc') || '{}')
    return true
  })()`)
  await run(`document.documentElement.setAttribute('data-theme','light'); true`)
  await wait(600)
  await snap('v-m-light.png')
  const lightBg = await run(`getComputedStyle(document.body).backgroundColor`)
  check('light theme applies', lightBg.includes('238') || lightBg.includes('eef'), lightBg)
  await run(`document.documentElement.setAttribute('data-theme','dark'); true`)

  /* ---------- دسکتاپ ---------- */
  await run(`document.body.classList.remove('is-mobile'); true`)
  win.setSize(1280, 800)
  await wait(900)
  fi = await formInfo()
  check('desktop 1280x800: form fits', fi && fi.fitsViewport, JSON.stringify(fi))
  await snap('v-d-form.png')

  // ارتفاع کم دسکتاپ — همان چیزی که در اسکرین‌شات کاربر بریده بود
  win.setSize(1366, 600)
  await wait(700)
  fi = await formInfo()
  check('short desktop 1366x600: form fits', fi && fi.fitsViewport, JSON.stringify(fi))
  check('short desktop: save reachable', fi && fi.saveVisible)
  await snap('v-d-form-short.png')

  await run(`document.querySelector('[role=dialog] button[aria-label=close]')?.click(); true`)
  await wait(500)
  win.setSize(1280, 800)
  await wait(400)
  check('desktop: no horizontal overflow', (await overflow()).length === 0)
  check('desktop: bottom nav hidden', await run(`(() => {
    const n = document.querySelector('nav[aria-label]')
    return !n || n.getBoundingClientRect().height === 0
  })()`))
  await snap('v-d-dashboard.png')

  console.log(fails ? `\n${fails} CHECK(S) FAILED` : '\nALL LAYOUT CHECKS PASSED')
  app.exit(fails ? 1 : 0)
})
setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 120000)
