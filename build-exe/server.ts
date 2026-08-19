/**
 * NEXUS HQ — نصب‌کننده + برنامه (دو در یک)
 * ==========================================
 * با Bun به یک EXE مستقل ویندوزی کامپایل می‌شود؛ کل وب‌اپ داخل خودش است.
 *
 * رفتار:
 *   - بار اول (بدون مارکر .nexus-serve کنار EXE) → «نصب»:
 *       کپی به %LOCALAPPDATA%\NEXUS HQ، شورتکات دسکتاپ و منوی استارت،
 *       ثبت در Add/Remove Programs، Uninstaller، آیکون اختصاصی.
 *   - بعد از نصب (یا آرگومان serve، یا مارکر) → اجرای برنامه:
 *       سرور محلی 127.0.0.1 و باز شدن مرورگر — کاملاً آفلاین.
 *
 * ساخت:
 *   bun build build-exe/server.ts --compile --target=bun-windows-x64 \
 *       --outfile release/NEXUS-HQ-1.0.0-Setup.exe
 */
import { serve } from 'bun'
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { embedded, embeddedIndexHtml } from './embedded'
import iconIco from '../electron/icons/icon.ico' with { type: 'file' }

const VERSION = '1.0.0'
const APP_NAME = 'NEXUS HQ'
const EXE_NAME = 'NEXUS-HQ.exe'
const MARKER = '.nexus-serve'

const isWindows = process.platform === 'win32'
const exeDir = dirname(process.execPath)
const markerPath = join(exeDir, MARKER)
const serveFlag = process.argv[2] === 'serve'
const shouldServe = serveFlag || existsSync(markerPath) || !isWindows

/* ============================================================ اجرای برنامه */

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
}

const mimeOf = (p: string) => MIME[p.slice(p.lastIndexOf('.')).toLowerCase()] ?? 'application/octet-stream'

async function runApp() {
  // پورت آزاد پیدا می‌کنیم تا تداخل با برنامه‌های دیگر پیش نیاید
  let server: ReturnType<typeof serve> | undefined
  for (let port = 8765; port <= 8780; port++) {
    try {
      server = serve({
        port,
        hostname: '127.0.0.1',
        idleTimeout: 255,
        fetch(req) {
          const url = new URL(req.url)
          let path = decodeURIComponent(url.pathname)
          if (path === '/' || path === '') path = '/index.html'
          const known = embedded[path]
          const file = known ?? embeddedIndexHtml
          const ctype = known ? mimeOf(path) : MIME['.html']
          return new Response(Bun.file(file), {
            headers: { 'content-type': ctype, 'cache-control': 'no-store' },
          })
        },
      })
      break
    } catch { /* پورت اشغال است — بعدی */ }
  }
  if (!server) throw new Error('no free port in 8765..8780')
  const url = `http://127.0.0.1:${server.port}/`

  console.log('┌──────────────────────────────────────────────────┐')
  console.log(`│  ${APP_NAME} — Personal Business Operating System   │`)
  console.log('│  Persian/English · local-first · offline         │')
  console.log('└──────────────────────────────────────────────────┘')
  console.log()
  console.log(`  ▶ App:  ${url}`)
  console.log('  ▶ داده‌ها در همین کامپیوتر ذخیره می‌شوند (مرورگر شما)')
  console.log('  ▶ این پنجره را باز نگه دارید؛ برای خروج ببندید.')
  console.log('  ▶ Keep this window open. Closing it stops the app.')
  console.log()

  try {
    if (isWindows) {
      Bun.spawnSync({ cmd: ['cmd', '/c', 'start', '', url], cwd: exeDir, stdout: 'ignore', stderr: 'ignore' })
    } else if (process.platform === 'darwin') {
      Bun.spawnSync({ cmd: ['open', url], stdout: 'ignore', stderr: 'ignore' })
    } else {
      Bun.spawnSync({ cmd: ['xdg-open', url], stdout: 'ignore', stderr: 'ignore' })
    }
  } catch { /* کاربر خودش آدرس را باز کند */ }

  setInterval(() => {}, 1 << 30) // برای همیشه روشن
}

/* ============================================================ نصب برنامه */

const b64ps = (s: string) => Buffer.from(s, 'utf16le').toString('base64')

function runPS(script: string): { ok: boolean; out: string } {
  const r = Bun.spawnSync({
    cmd: ['powershell', '-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', b64ps(script)],
    cwd: exeDir,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  return { ok: r.exitCode === 0, out: new TextDecoder().decode(r.stdout ?? new Uint8Array()) }
}

async function install() {
  const local = process.env.LOCALAPPDATA ?? join(process.env.USERPROFILE ?? exeDir, 'AppData', 'Local')
  const appDir = join(local, APP_NAME)
  const appExe = join(appDir, EXE_NAME)

  console.log()
  console.log(`  ${APP_NAME} v${VERSION} — Installer`)
  console.log('  ────────────────────────────────────────────────')
  console.log(`  ▶ Install dir : ${appDir}`)
  console.log('  ▶ Shortcuts   : Desktop + Start Menu')
  console.log('  ▶ Uninstaller : Add/Remove Programs (no admin needed)')
  console.log()

  try {
    mkdirSync(appDir, { recursive: true })

    // ۱) خود برنامه — همان EXE، این‌بار به‌عنوان نصب‌شده
    console.log('  [1/4] Copying application ...')
    copyFileSync(process.execPath, appExe)

    // ۲) آیکون و مارکر (بعد از این، اجرای مستقیم = برنامه)
    console.log('  [2/4] Icons & data ...')
    writeFileSync(join(appDir, 'icon.ico'), Buffer.from(await Bun.file(iconIco).arrayBuffer()))
    writeFileSync(join(appDir, MARKER), 'v' + VERSION)

    // ۳) Uninstaller
    console.log('  [3/4] Uninstaller ...')
    writeFileSync(
      join(appDir, 'uninstall.ps1'),
      [
        `Add-Type -AssemblyName System.Windows.Forms`,
        `$r = [System.Windows.Forms.MessageBox]::Show('NEXUS HQ حذف شود؟', 'NEXUS HQ', 'YesNo', 'Warning')`,
        `if ($r -ne [System.Windows.Forms.DialogResult]::Yes) { exit }`,
        `Remove-Item 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\NEXUS HQ' -Recurse -Force -ErrorAction SilentlyContinue`,
        `Remove-Item (Join-Path ([Environment]::GetFolderPath('Desktop')) 'NEXUS HQ.lnk') -Force -ErrorAction SilentlyContinue`,
        `$p = [Environment]::GetFolderPath('Programs')`,
        `Remove-Item (Join-Path $p 'NEXUS HQ.lnk') -Force -ErrorAction SilentlyContinue`,
        `Remove-Item (Join-Path $p 'NEXUS HQ') -Recurse -Force -ErrorAction SilentlyContinue`,
        `$dir = ${JSON.stringify(appDir)}`,
        `Start-Process cmd -ArgumentList '/c',('ping 127.0.0.1 -n 3 >nul & rmdir /s /q "' + $dir + '"') -WindowStyle Hidden`,
      ].join('\r\n'),
    )
    writeFileSync(join(appDir, 'uninstall.cmd'), `@echo off\r\npowershell -NoProfile -STA -ExecutionPolicy Bypass -File "${join(appDir, 'uninstall.ps1')}"\r\n`)

    // ۴) شورتکات‌ها + ثبت در ویندوز
    console.log('  [4/4] Shortcuts & registration ...')
    const reg = runPS(
      [
        `$ErrorActionPreference = 'Stop'`,
        `$app = ${JSON.stringify(appExe)}`,
        `$dir = ${JSON.stringify(appDir)}`,
        `$icon = Join-Path $dir 'icon.ico'`,
        `$ws = New-Object -ComObject WScript.Shell`,
        `$desktop = [Environment]::GetFolderPath('Desktop')`,
        `$startDir = Join-Path ([Environment]::GetFolderPath('Programs')) 'NEXUS HQ'`,
        `New-Item -ItemType Directory -Force -Path $startDir | Out-Null`,
        `foreach ($lp in @((Join-Path $desktop 'NEXUS HQ.lnk'), (Join-Path $startDir 'NEXUS HQ.lnk'))) {`,
        `  $lnk = $ws.CreateShortcut($lp)`,
        `  $lnk.TargetPath = $app`,
        `  $lnk.WorkingDirectory = $dir`,
        `  if (Test-Path $icon) { $lnk.IconLocation = $icon }`,
        `  $lnk.Description = 'NEXUS HQ'`,
        `  $lnk.Save()`,
        `}`,
        `$k = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\NEXUS HQ'`,
        `New-Item -Path $k -Force | Out-Null`,
        `Set-ItemProperty $k 'DisplayName' 'NEXUS HQ'`,
        `Set-ItemProperty $k 'DisplayVersion' '${VERSION}'`,
        `Set-ItemProperty $k 'Publisher' 'NEXUS HQ'`,
        `Set-ItemProperty $k 'InstallLocation' $dir`,
        `Set-ItemProperty $k 'DisplayIcon' $icon`,
        `Set-ItemProperty $k 'UninstallString' ('"' + (Join-Path $dir 'uninstall.cmd') + '"')`,
        `Set-ItemProperty $k 'NoModify' 1`,
        `Set-ItemProperty $k 'NoRepair' 1`,
        `Write-Output 'REG-OK'`,
      ].join('\n'),
    )
    if (!reg.ok || !reg.out.includes('REG-OK')) console.log('  ! registration warning (shortcuts may still work)')

    console.log()
    console.log('  ✔ نصب کامل شد — Install complete.')
    console.log(`  ▶ NEXUS HQ از دسکتاپ یا منوی استارت اجرا می‌شود.`)
    console.log(`  ▶ حذف: Settings ← Apps ← NEXUS HQ ← Uninstall`)
    console.log()

    // اجرای برنامه؟ (جعبه‌ی گفت‌وگوی ویندوزی)
    const ask = runPS(
      [
        `Add-Type -AssemblyName System.Windows.Forms`,
        `$r = [System.Windows.Forms.MessageBox]::Show('نصب NEXUS HQ کامل شد.' + [char]10 + 'برنامه اجرا شود؟', 'NEXUS HQ', 'YesNo', 'Information')`,
        `Write-Output ([int]$r)`,
      ].join('\n'),
    )
    if (ask.out.trim() === '6') {
      Bun.spawn({ cmd: [appExe], cwd: appDir, stdout: 'ignore', stdin: 'ignore', stderr: 'ignore' })
      console.log('  ▶ Launching NEXUS HQ ...')
    }
    process.exit(0)
  } catch (e) {
    console.log()
    console.log('  ✖ Install failed:', (e as Error).message)
    console.log('    (اگر برنامه در حال اجراست، آن را ببندید و دوباره تلاش کنید)')
    runPS(
      `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('Install failed: ` +
        `${(e as Error).message.replace(/'/g, '')}` +
        `', 'NEXUS HQ', 'OK', 'Error') | Out-Null`,
    )
    process.exit(1)
  }
}

/* ============================================================ شروع */

if (shouldServe) {
  await runApp()
} else {
  await install()
}
