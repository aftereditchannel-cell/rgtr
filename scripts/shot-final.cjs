const { app, BrowserWindow } = require('electron')
const path = require('node:path'); const fs = require('node:fs')
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox')
const OUT = path.join(__dirname,'..','docs','screens')
app.whenReady().then(async () => {
  fs.rmSync(path.join(app.getPath('userData'),'data'),{recursive:true,force:true})
  require(path.join(__dirname,'..','electron','main.cjs'))
  await new Promise(r=>setTimeout(r,3000))
  const win = BrowserWindow.getAllWindows()[0]
  if (win.webContents.isLoading()) await new Promise(r=>win.webContents.once('did-finish-load',r))
  win.setMinimumSize(320,400)
  const run = js => win.webContents.executeJavaScript(js,true)
  const wait = ms => new Promise(r=>setTimeout(r,ms))
  const snap = f => win.webContents.capturePage().then(i=>fs.writeFileSync(path.join(OUT,f),i.toPNG()))

  win.setSize(1440,900)
  for (const [h,f] of [['#/','f-d-dashboard.png'],['#/m/projects','f-d-projects.png'],['#/decision','f-d-decision.png'],['#/analytics','f-d-analytics.png']]) {
    await run(`location.hash='${h}'`); await wait(1500); await snap(f)
  }
  // تم روشن
  await run(`document.documentElement.setAttribute('data-theme','light'); location.hash='#/'`); await wait(1400)
  await snap('f-d-dashboard-light.png')
  await run(`location.hash='#/m/tasks'`); await wait(1300); await snap('f-d-tasks-light.png')
  await run(`document.documentElement.setAttribute('data-theme','dark'); true`)

  // موبایل
  await run(`document.body.classList.add('is-mobile'); true`)
  win.setSize(412,915)
  for (const [h,f] of [['#/','f-m-dashboard.png'],['#/m/tasks','f-m-tasks.png'],['#/settings','f-m-settings.png']]) {
    await run(`location.hash='${h}'`); await wait(1400); await snap(f)
  }
  // منوی کشویی موبایل
  await run(`location.hash='#/'`); await wait(1000)
  await run(`document.querySelector('.lg\\\\:hidden button')?.click(); true`); await wait(800)
  await snap('f-m-menu.png')
  console.log('done')
  app.exit(0)
})
setTimeout(()=>app.exit(1),120000)
