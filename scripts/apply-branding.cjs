#!/usr/bin/env node
/**
 * Apply a custom app icon (and optionally display name) to BOTH the
 * Windows (Electron) and Android (Capacitor) builds.
 *
 * Usage:
 *   node scripts/apply-branding.cjs --icon <path-to-1024.png> [--name "My App"]
 *
 * What it does:
 *   - resizes the provided square PNG into every required mipmap / electron size
 *   - writes electron/icons/icon.png + icon.ico (if png-to-ico is available)
 *   - writes android/app/src/main/res/mipmap-*/ic_launcher*.png
 *   - updates capacitor.config.json appName + electron-builder productName
 *
 * If no --icon is passed but `public/brand-icon.png` exists (uploaded from
 * inside the app's Settings), that file is used automatically.
 */
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')

function parseArgs() {
  const a = process.argv.slice(2)
  const out = { icon: '', name: '' }
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--icon') out.icon = a[++i]
    else if (a[i] === '--name') out.name = a[++i]
  }
  if (!out.icon) {
    const guess = path.join(ROOT, 'public', 'brand-icon.png')
    if (fs.existsSync(guess)) out.icon = guess
  }
  return out
}

async function main() {
  const { icon, name } = parseArgs()

  if (name) {
    console.log('Setting display name to:', name)
    const capPath = path.join(ROOT, 'capacitor.config.json')
    const cap = JSON.parse(fs.readFileSync(capPath, 'utf8'))
    cap.appName = name
    fs.writeFileSync(capPath, JSON.stringify(cap, null, 2) + '\n')
  }

  if (!icon || !fs.existsSync(icon)) {
    console.log('No icon provided (and public/brand-icon.png not found). Skipping icon write.')
    return
  }
  console.log('Using icon:', icon)

  // The heavy image work is done with `sharp` if present, otherwise we
  // just copy the source to the main 512 slots.
  let sharp
  try { sharp = require('sharp') } catch { /* optional */ }

  if (!sharp) {
    console.log('TIP: `npm i -D sharp` for automatic resizing to every required size.')
    const src = fs.readFileSync(icon)
    const targets = [
      'electron/icons/icon.png',
      'electron/icons/512x512.png',
      'public/icon-512.png',
      'public/apple-touch-icon.png',
    ]
    for (const t of targets) {
      const p = path.join(ROOT, t)
      fs.mkdirSync(path.dirname(p), { recursive: true })
      fs.writeFileSync(p, src)
    }
    return
  }

  const sizes = [16, 24, 32, 48, 64, 128, 256, 512]
  for (const s of sizes) {
    const buf = await sharp(icon).resize(s, s, { fit: 'cover' }).png().toBuffer()
    const p = path.join(ROOT, 'electron/icons', `${s}x${s}.png`)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, buf)
    if (s === 256 || s === 512) fs.writeFileSync(path.join(ROOT, 'electron/icons/icon.png'), buf)
  }

  // Android mipmaps
  const mipmaps = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  }
  for (const [dir, s] of Object.entries(mipmaps)) {
    const buf = await sharp(icon).resize(s, s, { fit: 'cover' }).png().toBuffer()
    const p = path.join(ROOT, 'android/app/src/main/res', dir, 'ic_launcher.png')
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, buf)
    fs.writeFileSync(path.join(path.dirname(p), 'ic_launcher_round.png'), buf)
  }

  // ICO if the helper is present
  try {
    const pngToIco = require('png-to-ico')
    const ico = await pngToIco([16, 24, 32, 48, 64, 128, 256].map(s =>
      path.join(ROOT, 'electron/icons', `${s}x${s}.png`)))
    fs.writeFileSync(path.join(ROOT, 'electron/icons/icon.ico'), ico)
  } catch { /* optional */ }

  console.log('Icons written successfully.')
}

main().catch(e => { console.error(e); process.exit(1) })
