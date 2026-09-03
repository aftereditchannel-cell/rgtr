/**
 * NEXUS HQ — Electron main process
 * فرآیند اصلی: پنجره، منو، ذخیره‌سازی روی دیسک، بکاپ خودکار.
 *
 * تفاوت کلیدی با نسخه‌ی وب: داده در IndexedDB مرورگر نیست،
 * بلکه در یک فایل JSON واقعی کنار برنامه است:
 *   %APPDATA%\NexusHQ\data\nexus-hq.json
 */
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, nativeTheme, net } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const { createUpdater, cmpVersion } = require('./updater.cjs')
const { spawn } = require('node:child_process')

// مخزن انتشار نسخه‌ها — با متغیر محیطی می‌شود عوض کرد (برای تست)
const UPDATE_REPO = process.env.NEXUS_UPDATE_REPO || 'aftereditchannel-cell/rgtr'

// NEXUS_PROD=1 اجازه می‌دهد نسخه‌ی build شده بدون بسته‌بندی هم تست شود
const isDev = !app.isPackaged && process.env.NEXUS_PROD !== '1'
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173'

/* ---------------- مسیرهای داده ---------------- */
const DATA_DIR = path.join(app.getPath('documents'), 'NexusHQ')
const DOC_FILE = path.join(DATA_DIR, 'nexus-hq.json')
const TMP_FILE = path.join(DATA_DIR, 'nexus-hq.json.tmp')
const SNAP_DIR = path.join(DATA_DIR, 'snapshots')
const WIN_FILE = path.join(app.getPath('userData'), 'window-state.json')
const UPDATE_DIR = path.join(app.getPath('userData'), 'updates')
const UPDATE_STATE_FILE = path.join(app.getPath('userData'), 'update-state.json')
const MAX_SNAPSHOTS = 20

fs.mkdirSync(DATA_DIR, { recursive: true })
fs.mkdirSync(SNAP_DIR, { recursive: true })

/* ---------------- نوشتن اتمیک ----------------
 * اول در فایل موقت می‌نویسیم، بعد rename می‌کنیم.
 * اگر وسط نوشتن برق برود، فایل اصلی سالم می‌ماند. */
async function atomicWrite(file, text) {
  await fsp.writeFile(TMP_FILE, text, 'utf8')
  await fsp.rename(TMP_FILE, file)
}

/* ---------------- وضعیت پنجره ---------------- */
function loadWindowState() {
  try {
    const s = JSON.parse(fs.readFileSync(WIN_FILE, 'utf8'))
    if (s && Number.isFinite(s.width) && Number.isFinite(s.height)) return s
  } catch { /* first run */ }
  return { width: 1440, height: 900, maximized: true }
}

function saveWindowState(win) {
  if (!win || win.isDestroyed()) return
  try {
    const b = win.getNormalBounds()
    fs.writeFileSync(WIN_FILE, JSON.stringify({ ...b, maximized: win.isMaximized() }), 'utf8')
  } catch { /* ignore */ }
}

/* ---------------- پنجره‌ی اصلی ---------------- */
let mainWindow = null
/**
 * جریان خروج: پنجره بلافاصله بسته نمی‌شود.
 * ابتدا به صفحه خبر می‌دهیم تا از کاربر بپرسد «روی ابر ذخیره شود؟».
 * صفحه پس از تصمیم کاربر، app:exitNow را صدا می‌زند.
 */
let allowClose = false
let exitAsked = false

function createWindow() {
  const st = loadWindowState()

  mainWindow = new BrowserWindow({
    width: st.width,
    height: st.height,
    x: st.x,
    y: st.y,
    minWidth: 900,
    minHeight: 600,
    show: false,
    backgroundColor: '#08090c',
    title: 'NEXUS HQ',
    icon: path.join(__dirname, 'icons', 'icon.png'),
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,      // امنیت: صفحه به Node دسترسی مستقیم ندارد
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  })

  if (st.maximized) mainWindow.maximize()

  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (isDev) {
    mainWindow.loadURL(DEV_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  // لینک‌های خارجی در مرورگر پیش‌فرض باز شوند، نه داخل برنامه
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  // جلوگیری از ناوبری به دامنه‌ی خارجی داخل پنجره
  mainWindow.webContents.on('will-navigate', (e, url) => {
    const ok = isDev ? url.startsWith(DEV_URL) : url.startsWith('file://')
    if (!ok) { e.preventDefault(); shell.openExternal(url) }
  })

  mainWindow.on('close', (e) => {
    saveWindowState(mainWindow)
    if (allowClose || exitAsked) return
    // یک بار جلوی بستن را می‌گیریم تا صفحه بتواند بپرسد
    e.preventDefault()
    exitAsked = true
    mainWindow.webContents.send('menu:exit')
    // اگر صفحه پاسخ نداد (خطای اسکریپت)، برنامه قفل نشود
    setTimeout(() => {
      if (!allowClose && mainWindow && !mainWindow.isDestroyed()) {
        allowClose = true
        mainWindow.close()
      }
    }, 15000)
  })
  mainWindow.on('closed', () => { mainWindow = null })
}

/* ---------------- منوی برنامه ---------------- */
function buildMenu() {
  const send = (ch) => () => mainWindow?.webContents.send(ch)

  const template = [
    {
      label: 'پرونده',
      submenu: [
        { label: 'خروجی بکاپ JSON…', accelerator: 'CmdOrCtrl+S', click: send('menu:export') },
        { label: 'بازیابی از فایل…', accelerator: 'CmdOrCtrl+O', click: send('menu:import') },
        { type: 'separator' },
        { label: 'باز کردن پوشه‌ی داده‌ها', click: () => shell.openPath(DATA_DIR) },
        { type: 'separator' },
        { role: 'quit', label: 'خروج' },
      ],
    },
    {
      label: 'ویرایش',
      submenu: [
        { role: 'undo', label: 'واگرد' }, { role: 'redo', label: 'ازنو' }, { type: 'separator' },
        { role: 'cut', label: 'برش' }, { role: 'copy', label: 'کپی' },
        { role: 'paste', label: 'چسباندن' }, { role: 'selectAll', label: 'انتخاب همه' },
      ],
    },
    {
      label: 'رفتن',
      submenu: [
        { label: 'داشبورد', accelerator: 'CmdOrCtrl+1', click: () => go('/') },
        { label: 'مرکز تصمیم', accelerator: 'CmdOrCtrl+2', click: () => go('/decision') },
        { label: 'تحلیل‌ها', accelerator: 'CmdOrCtrl+3', click: () => go('/analytics') },
        { label: 'شبکه‌های اجتماعی', accelerator: 'CmdOrCtrl+5', click: () => go('/social') },
        { label: 'هوش مصنوعی و اتوماسیون', accelerator: 'CmdOrCtrl+6', click: () => go('/automation') },
        { label: 'کارها', accelerator: 'CmdOrCtrl+4', click: () => go('/m/tasks') },
        { label: 'تنظیمات', accelerator: 'CmdOrCtrl+,', click: () => go('/settings') },
        { type: 'separator' },
        { label: 'قفل فوری', accelerator: 'CmdOrCtrl+L', click: send('menu:lock') },
        { type: 'separator' },
        { label: 'جستجوی سریع (Command Palette)', accelerator: 'CmdOrCtrl+K', click: send('menu:palette') },
      ],
    },
    {
      label: 'نمایش',
      submenu: [
        { role: 'reload', label: 'بارگذاری مجدد' },
        { role: 'resetZoom', label: 'اندازه‌ی عادی' },
        { role: 'zoomIn', label: 'بزرگ‌نمایی' },
        { role: 'zoomOut', label: 'کوچک‌نمایی' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'تمام‌صفحه' },
        { role: 'toggleDevTools', label: 'ابزار توسعه‌دهنده' },
      ],
    },
    {
      label: 'راهنما',
      submenu: [
        {
          label: 'درباره‌ی NEXUS HQ',
          click: () => dialog.showMessageBox(mainWindow, {
            type: 'info',
            title: 'درباره',
            message: 'NEXUS HQ',
            detail:
              `نسخه ${app.getVersion()}\n\n` +
              'مرکز فرماندهی شخصی — کاملاً آفلاین.\n' +
              'هیچ داده‌ای از این کامپیوتر خارج نمی‌شود.\n\n' +
              `محل داده‌ها:\n${DOC_FILE}`,
            buttons: ['باشه'],
          }),
        },
        { label: 'پوشه‌ی نقاط بازیابی', click: () => shell.openPath(SNAP_DIR) },
        { type: 'separator' },
        {
          label: 'بررسی بروزرسانی…',
          click: () => {
            go('/settings')
            mainWindow?.webContents.send('menu:updateCheck')
          },
        },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function go(route) {
  mainWindow?.webContents.send('menu:navigate', route)
}

/* ---------------- IPC: ذخیره‌سازی ---------------- */
ipcMain.handle('store:load', async () => {
  try {
    const txt = await fsp.readFile(DOC_FILE, 'utf8')
    return JSON.parse(txt)
  } catch (e) {
    if (e.code === 'ENOENT') return null          // اولین اجرا
    // فایل خراب است → کنار بگذار تا از دست نرود
    try {
      const bad = path.join(DATA_DIR, `corrupt-${Date.now()}.json`)
      await fsp.rename(DOC_FILE, bad)
      console.error('فایل داده خراب بود، منتقل شد به', bad)
    } catch { /* ignore */ }
    return null
  }
})

ipcMain.handle('store:save', async (_e, data) => {
  await atomicWrite(DOC_FILE, JSON.stringify(data))
  return true
})

/* ---------------- IPC: نقاط بازیابی روی دیسک ---------------- */
ipcMain.handle('snap:push', async (_e, data) => {
  const txt = JSON.stringify(data)
  const at = new Date().toISOString()
  const file = path.join(SNAP_DIR, `snap-${at.replace(/[:.]/g, '-')}.json`)
  await fsp.writeFile(file, txt, 'utf8')

  const files = (await fsp.readdir(SNAP_DIR)).filter(f => f.startsWith('snap-')).sort()
  for (const f of files.slice(0, Math.max(0, files.length - MAX_SNAPSHOTS))) {
    await fsp.unlink(path.join(SNAP_DIR, f)).catch(() => {})
  }
  return true
})

ipcMain.handle('snap:list', async () => {
  const files = (await fsp.readdir(SNAP_DIR)).filter(f => f.startsWith('snap-')).sort().reverse()
  const out = []
  for (const f of files) {
    try {
      const s = await fsp.stat(path.join(SNAP_DIR, f))
      out.push({ id: f, at: s.mtime.toISOString(), size: s.size })
    } catch { /* ignore */ }
  }
  return out
})

ipcMain.handle('snap:get', async (_e, id) => {
  if (!/^snap-[\w-]+\.json$/.test(id)) throw new Error('نام فایل نامعتبر')
  const txt = await fsp.readFile(path.join(SNAP_DIR, id), 'utf8')
  return JSON.parse(txt)
})

/* ---------------- IPC: بکاپ و بازیابی با دیالوگ ویندوز ---------------- */
ipcMain.handle('backup:export', async (_e, data) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(app.getPath('documents'), 'NexusHQ', 'Backups')
  fs.mkdirSync(backupDir, { recursive: true })
  
  const filePath = path.join(backupDir, `nexus-hq-backup-${stamp}.json`)
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8')
  return { ok: true, path: filePath }
})

ipcMain.handle('backup:import', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'انتخاب فایل بکاپ',
    properties: ['openFile'],
    filters: [{ name: 'NEXUS HQ Backup', extensions: ['json'] }],
  })
  if (canceled || !filePaths?.length) return { ok: false }
  const txt = await fsp.readFile(filePaths[0], 'utf8')
  return { ok: true, data: JSON.parse(txt), path: filePaths[0] }
})

ipcMain.handle('file:saveText', async (_e, { name, text }) => {
  const exportDir = path.join(app.getPath('documents'), 'NexusHQ', 'Exports')
  fs.mkdirSync(exportDir, { recursive: true })
  
  const filePath = path.join(exportDir, name.replace(/[:\/*?"<>|]/g, '-'))
  await fsp.writeFile(filePath, text, 'utf8')
  return { ok: true, path: filePath }
})

/** Google Apps Script در ContentService redirect و محدودیت CORS دارد. این پل فقط
 * URL رسمی /exec را می‌پذیرد و اجازه تبدیل‌شدن به پراکسی عمومی/SSRF نمی‌دهد. */
ipcMain.handle('drive:request', async (_e, { url, method, body }) => {
  let target
  try { target = new URL(String(url || '')) } catch { throw new Error('bad Google Script URL') }
  if (target.protocol !== 'https:' || target.hostname !== 'script.google.com' ||
      !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(target.pathname)) {
    throw new Error('forbidden Google Script URL')
  }
  const verb = method === 'GET' ? 'GET' : 'POST'
  const textBody = typeof body === 'string' ? body : ''
  if (Buffer.byteLength(textBody, 'utf8') > 1024 * 1024) throw new Error('Drive request too large')
  const response = await net.fetch(target.toString(), {
    method: verb,
    redirect: 'follow',
    headers: verb === 'POST' ? { 'Content-Type': 'text/plain;charset=utf-8' } : undefined,
    body: verb === 'POST' ? textBody : undefined,
  })
  return { ok: response.ok, status: response.status, text: await response.text() }
})

/* ---------------- IPC: اطلاعات و ابزار ---------------- */
ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  electron: process.versions.electron,
  chrome: process.versions.chrome,
  node: process.versions.node,
  dataFile: DOC_FILE,
  dataDir: DATA_DIR,
}))

ipcMain.handle('app:openDataDir', () => shell.openPath(DATA_DIR))

/** صفحه تصمیم کاربر را گرفت؛ حالا واقعاً ببند */
ipcMain.handle('app:exitNow', () => {
  allowClose = true
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close()
})

ipcMain.handle('app:cancelExit', () => { exitAsked = false })

/* ---------------- IPC: بروزرسانی خودکار ----------------
 * همه‌ی کارهای شبکه این‌جا در فرآیند اصلی انجام می‌شود (بدون CORS).
 * صفحه فقط نتیجه و درصد پیشرفت را می‌بیند.
 */
const updater = createUpdater({
  repo: UPDATE_REPO,
  fetchImpl: (u, o) => net.fetch(u, o),
  downloadDir: UPDATE_DIR,
  fs, path,
  ensureDir: async (p) => fs.mkdirSync(p, { recursive: true }),
})

let lastCheckResult = null

ipcMain.handle('update:check', async () => {
  const res = await updater.check(app.getVersion())
  if (res.ok) {
    const latest = res.releases[0] || null
    lastCheckResult = {
      ...res,
      current: app.getVersion(),
      hasUpdate: !!(latest && cmpVersion(latest.version, app.getVersion()) > 0),
    }
  }
  return lastCheckResult ?? res
})

ipcMain.handle('update:download', async (_e, { url, filename, size }) => {
  if (typeof url !== 'string' || !url.startsWith('https://')) throw new Error('bad url')
  if (typeof filename !== 'string' || !filename) throw new Error('bad filename')
  return updater.download(
    { url, filename, expectedSize: size || 0 },
    (p) => mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.send('update:progress', p),
  )
})

ipcMain.handle('update:cancel', () => updater.cancel())

/** نصب: نصب‌کننده را جدا از برنامه اجرا می‌کنیم و بعد برنامه را می‌بندیم */
ipcMain.handle('update:install', async (_e, filePath) => {
  const full = path.resolve(String(filePath || ''))
  // امنیت: فقط فایل‌های داخل پوشه‌ی updates خودمان
  if (!full.startsWith(path.resolve(UPDATE_DIR))) throw new Error('forbidden path')
  await fsp.access(full).catch(() => { throw new Error('file missing') })

  const isSetup = /-setup\.exe$/i.test(full)
  if (process.platform === 'win32' && isSetup) {
    // NSIS ویزارد نصب را نشان می‌دهد؛ باید برنامه‌ی فعلی بسته باشد تا فایل‌ها جایگزین شوند
    spawn(full, [], { detached: true, stdio: 'ignore' }).unref()
    allowClose = true
    setTimeout(() => app.quit(), 400)
    return { ok: true, launched: true }
  }
  // پرتابل یا پلتفرم دیگر: پوشه را باز می‌کنیم تا کاربر خودش جابجا کند
  shell.showItemInFolder(full)
  return { ok: true, launched: false }
})

ipcMain.handle('update:openFolder', () => shell.openPath(UPDATE_DIR))

/* --------- بررسی خودکار در شروع (حداکثر هر ۲۴ ساعت یک‌بار) --------- */
async function autoCheckOnLaunch() {
  try {
    const st = JSON.parse(fs.readFileSync(UPDATE_STATE_FILE, 'utf8'))
    if (Date.now() - (st.lastAutoCheck || 0) < 24 * 3600 * 1000) return
  } catch { /* اولین بار */ }
  try { fs.writeFileSync(UPDATE_STATE_FILE, JSON.stringify({ lastAutoCheck: Date.now() })) } catch { /* ignore */ }

  const res = await updater.check(app.getVersion())
  if (!res.ok) return
  const latest = res.releases[0]
  if (latest && cmpVersion(latest.version, app.getVersion()) > 0) {
    lastCheckResult = { ...res, current: app.getVersion(), hasUpdate: true }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('update:available', {
        version: latest.version, tag: latest.tag, notesUrl: latest.notesUrl,
      })
    }
  }
}
ipcMain.handle('app:confirm', async (_e, { title, message, detail }) => {
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning', title: title || 'تأیید', message, detail,
    buttons: ['بله', 'انصراف'], defaultId: 1, cancelId: 1, noLink: true,
  })
  return response === 0
})

/* ---------------- چرخه‌ی حیات ---------------- */
// فقط یک نسخه از برنامه اجرا شود (وگرنه دو نسخه روی یک فایل می‌نویسند)
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    nativeTheme.themeSource = 'dark'
    createWindow()
    buildMenu()
    // چند ثانیه بعد از باز شدن، بی‌صدا دنبال نسخه‌ی جدید بگرد
    setTimeout(() => autoCheckOnLaunch().catch(() => {}), 5000)
    app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow() })
  })

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
}
