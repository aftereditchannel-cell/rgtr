// اسکرین‌شات در ابعاد گوشی — بررسی چیدمان نسخه‌ی اندروید
const { app, BrowserWindow } = require('electron')
const path = require('node:path'); const fs = require('node:fs')
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox')

const W = 412, H = 915 // Pixel 7 در dp

app.whenReady().then(async () => {
  fs.rmSync(path.join(app.getPath('userData'), 'data'), { recursive: true, force: true })
  require(path.join(__dirname, '..', 'electron', 'main.cjs'))
  await new Promise(r => setTimeout(r, 3000))
  const win = BrowserWindow.getAllWindows()[0]
  if (win.webContents.isLoading()) await new Promise(r => win.webContents.once('did-finish-load', r))
  win.setMinimumSize(320, 480)   // main.cjs حداقل 900 می‌گذارد
  win.setSize(W, H)
  await new Promise(r => setTimeout(r, 2500))
  const run = js => win.webContents.executeJavaScript(js, true)

  // شبیه‌سازی حالت موبایل: همان کلاسی که main.tsx روی اندروید اضافه می‌کند
  await run(`document.body.classList.add('is-mobile'); true`)
  await new Promise(r => setTimeout(r, 600))

  const out = path.join(__dirname, '..', 'docs', 'screens')
  fs.mkdirSync(out, { recursive: true })

  const shots = [
    ['#/', 'm-dashboard.png', 1600],
    ['#/m/tasks', 'm-tasks.png', 1600],
    ['#/m/projects', 'm-projects.png', 1600],
    ['#/settings', 'm-settings.png', 1600],
  ]
  for (const [hash, file, wait] of shots) {
    await run(`location.hash='${hash}'`)
    await new Promise(r => setTimeout(r, wait))
    const img = await win.webContents.capturePage()
    fs.writeFileSync(path.join(out, file), img.toPNG())
    console.log('wrote', file)
  }

  // منوی کشویی (سایدبار موبایل)
  await run(`location.hash='#/'`); await new Promise(r => setTimeout(r, 1200))
  await run(`document.querySelector('.lg\\\\:hidden button')?.click(); true`)
  await new Promise(r => setTimeout(r, 900))
  fs.writeFileSync(path.join(out, 'm-menu.png'), (await win.webContents.capturePage()).toPNG())
  console.log('wrote m-menu.png')

  // گزارش سرریز افقی — مهم‌ترین ایراد چیدمان موبایل
  const report = await run(`(() => {
    const vw = document.documentElement.clientWidth
    const bad = [...document.querySelectorAll('*')]
      .filter(e => e.getBoundingClientRect().width > vw + 2)
      .slice(0, 12)
      .map(e => e.tagName + '.' + (typeof e.className === 'string' ? e.className.slice(0, 60) : '') + ' w=' + Math.round(e.getBoundingClientRect().width))
    return { vw, scrollW: document.documentElement.scrollWidth, overflow: bad }
  })()`)
  console.log('LAYOUT', JSON.stringify(report, null, 1))

  app.exit(0)
})
setTimeout(() => app.exit(1), 90000)
