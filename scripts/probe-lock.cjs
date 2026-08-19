/** بررسی صفحه‌ی قفل و کارت امنیت در تنظیمات، در تم تیره و روشن */
const { app, BrowserWindow } = require('electron')
const path = require('node:path'); const fs = require('node:fs')
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox')
const OUT = path.join(__dirname, '..', 'docs', 'screens')
let fails = 0
const check = (n, ok, x = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`); if (!ok) fails++ }

app.whenReady().then(async () => {
  fs.rmSync(path.join(app.getPath('userData'), 'data'), { recursive: true, force: true })
  require(path.join(__dirname, '..', 'electron', 'main.cjs'))
  await new Promise(r => setTimeout(r, 3000))
  const win = BrowserWindow.getAllWindows()[0]
  if (win.webContents.isLoading()) await new Promise(r => win.webContents.once('did-finish-load', r))
  win.setMinimumSize(320, 400)
  const run = js => win.webContents.executeJavaScript(js, true)
  const wait = ms => new Promise(r => setTimeout(r, ms))
  const snap = f => win.webContents.capturePage().then(i => fs.writeFileSync(path.join(OUT, f), i.toPNG()))

  /* --- کارت امنیت در تنظیمات --- */
  win.setSize(1280, 860)
  await run(`location.hash='#/settings'`); await wait(1600)
  check('settings: security card exists', await run(`!!document.body.textContent.match(/قفل و امنیت|Lock & Security/)`))
  // اسکرول تا کارت قفل
  await run(`(() => {
    const el = [...document.querySelectorAll('h2,h3,div')].find(e => /قفل و امنیت|Lock & Security/.test(e.textContent) && e.children.length < 4)
    el?.scrollIntoView({ block: 'center' }); return true
  })()`)
  await wait(700)
  await snap('v-d-security.png')

  // فعال‌سازی رمز از طریق UI
  await run(`[...document.querySelectorAll('button')].find(b => /تعیین رمز عبور|Set a passcode/.test(b.textContent))?.click(); true`)
  await wait(800)
  check('lock: set-passcode dialog opens', await run(`!!document.querySelector('[role=dialog]')`))
  await snap('v-d-lock-dialog.png')
  await run(`document.querySelector('[role=dialog] button[aria-label=close]')?.click(); true`)
  await wait(400)

  /* --- صفحه‌ی قفل: رمز را مستقیم می‌سازیم و رویداد قفل می‌فرستیم --- */
  await run(`(async () => {
    const enc = new TextEncoder()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const km = await crypto.subtle.importKey('raw', enc.encode('1234'), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits({ name:'PBKDF2', salt, iterations:210000, hash:'SHA-256' }, km, 256)
    const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b)))
    localStorage.setItem('nexus_hq_lock', JSON.stringify({
      enabled:true, salt:b64(salt), hash:b64(bits), autoLockMin:5,
      biometric:false, hint:'سال تولد', fails:0, lockedUntil:0 }))
    return true
  })()`)
  await wait(300)
  await run(`window.dispatchEvent(new Event('nexus:lock')); true`)
  await wait(900)

  const lockInfo = () => run(`(() => {
    const el = document.querySelector('.z-\\\\[100\\\\]')
    if (!el) return null
    const keys = [...el.querySelectorAll('button')]
    const r = el.getBoundingClientRect()
    return {
      covers: r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1,
      buttons: keys.length,
      hasHint: /سال تولد/.test(el.textContent),
      overflowX: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2,
    }
  })()`)
  let li = await lockInfo()
  check('lock screen: covers viewport (desktop)', li && li.covers, JSON.stringify(li))
  check('lock screen: numpad rendered', li && li.buttons >= 11, `buttons=${li && li.buttons}`)
  check('lock screen: hint shown', li && li.hasHint)
  await snap('v-d-lock.png')

  // موبایل
  await run(`document.body.classList.add('is-mobile'); true`)
  win.setSize(412, 915); await wait(800)
  li = await lockInfo()
  check('lock screen: fits phone', li && li.covers && li.overflowX, JSON.stringify(li))
  await snap('v-m-lock.png')

  // تم روشن
  await run(`document.documentElement.setAttribute('data-theme','light'); true`); await wait(600)
  await snap('v-m-lock-light.png')

  // ورود رمز اشتباه سپس درست
  await run(`document.documentElement.setAttribute('data-theme','dark'); true`); await wait(300)
  const tapDigits = async s => {
    for (const d of s) {
      await run(`(() => {
        const el = document.querySelector('.z-\\\\[100\\\\]')
        const b = [...el.querySelectorAll('button')].find(x => x.textContent.trim() === '${d}')
        b?.click(); return !!b
      })()`)
      await wait(120)
    }
  }
  await tapDigits('۹۹۹۹')
  await run(`(() => { const el=document.querySelector('.z-\\\\[100\\\\]');
    [...el.querySelectorAll('button')].find(b => /باز کردن|Unlock/.test(b.textContent))?.click(); return true })()`)
  await wait(1200)
  check('lock: wrong passcode keeps screen', await run(`!!document.querySelector('.z-\\\\[100\\\\]')`))
  await snap('v-m-lock-error.png')

  await tapDigits('۱۲۳۴')
  await run(`(() => { const el=document.querySelector('.z-\\\\[100\\\\]');
    [...el.querySelectorAll('button')].find(b => /باز کردن|Unlock/.test(b.textContent))?.click(); return true })()`)
  await wait(1500)
  check('lock: correct passcode unlocks', await run(`!document.querySelector('.z-\\\\[100\\\\]')`))
  await snap('v-m-after-unlock.png')

  await run(`localStorage.removeItem('nexus_hq_lock'); true`)
  console.log(fails ? `\n${fails} FAILED` : '\nALL LOCK CHECKS PASSED')
  app.exit(fails ? 1 : 0)
})
setTimeout(() => { console.log('TIMEOUT'); app.exit(1) }, 120000)
