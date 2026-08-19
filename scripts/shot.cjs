const { app, BrowserWindow } = require('electron')
const path = require('node:path'); const fs = require('node:fs')
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox')
app.whenReady().then(async () => {
  // داده‌ی قبلی تست‌ها پاک شود تا seed واقعی نمایش داده شود
  fs.rmSync(path.join(app.getPath('userData'), 'data'), { recursive: true, force: true })
  require(path.join(__dirname, '..', 'electron', 'main.cjs'))
  await new Promise(r => setTimeout(r, 3000))
  const win = BrowserWindow.getAllWindows()[0]
  if (win.webContents.isLoading()) await new Promise(r => win.webContents.once('did-finish-load', r))
  win.setSize(1440, 900)
  await new Promise(r => setTimeout(r, 3000))
  const run = js => win.webContents.executeJavaScript(js, true)
  const shots = [
    ['#/', 'shot-dashboard-fa.png'],
    ['#/m/tasks', 'shot-tasks-fa.png'],
    ['#/decision', 'shot-decision-fa.png'],
    ['#/settings', 'shot-settings-fa.png'],
  ]
  for (const [hash, file] of shots) {
    await run(`location.hash='${hash}'`)
    await new Promise(r => setTimeout(r, 1400))
    const img = await win.webContents.capturePage()
    fs.writeFileSync(path.join(__dirname, '..', file), img.toPNG())
    console.log('wrote', file)
  }
  // انگلیسی
  await run(`location.hash='#/settings'`); await new Promise(r => setTimeout(r, 1000))
  await run(`[...document.querySelectorAll('button')].find(x=>x.textContent.trim()==='English')?.click()`)
  await new Promise(r => setTimeout(r, 1200))
  await run(`location.hash='#/'`); await new Promise(r => setTimeout(r, 1400))
  fs.writeFileSync(path.join(__dirname, '..', 'shot-dashboard-en.png'), (await win.webContents.capturePage()).toPNG())
  console.log('wrote shot-dashboard-en.png')
  app.exit(0)
})
setTimeout(() => app.exit(1), 90000)
