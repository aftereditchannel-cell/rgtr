#!/usr/bin/env python3
"""
ساخت آیکون برنامه از لوگوی کاربر.

لوگو روی پس‌زمینه‌ی مشکی و بدون کانال آلفا است، پس نمی‌شود مستقیم استفاده کرد:
اول موج زرد را «کلید» می‌کنیم (آلفا از روشنایی)، بعد روی پس‌زمینه‌ی
مخصوص هر پلتفرم می‌نشانیم.

خروجی‌ها:
  electron/icons/icon.png + سایزهای ۱۶..۵۱۲ + icon.ico   (ویندوز)
  android/app/src/main/res/mipmap-*/ic_launcher*.png      (اندروید، legacy)
  android/app/src/main/res/mipmap-anydpi-v26/*.xml        (اندروید، adaptive)
  android/app/src/main/res/drawable/splash.png            (صفحه‌ی شروع)
  public/favicon.png, public/apple-touch-icon.png         (وب)
"""
import os
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = '/home/user/uploads/AfterEdit_Profile_Logo_Diamond.png'
BG = (8, 9, 12)  # همان --color-bg برنامه


def keyed_mark(size: int) -> Image.Image:
    """موج زرد را با آلفای نرم از پس‌زمینه‌ی مشکی جدا می‌کند."""
    im = Image.open(SRC).convert('RGB')
    a = np.asarray(im).astype(np.float32) / 255.0
    # روشنایی = آلفا. پس‌زمینه دقیقاً مشکی است، پس این کلید تمیز درمی‌آید.
    lum = a.max(axis=2)
    # کمی کشش کنتراست تا لبه‌ها نرم ولی بدون هاله بمانند
    alpha = np.clip((lum - 0.06) / 0.80, 0, 1)
    # رنگ را به زرد اشباع لوگو نرمال می‌کنیم تا لبه‌ها خاکستری نشوند
    safe = np.maximum(lum, 1e-6)[..., None]
    rgb = np.clip(a / safe, 0, 1)
    out = np.dstack([rgb, alpha[..., None]])
    img = Image.fromarray((out * 255).astype(np.uint8), 'RGBA')

    # برش به کادر واقعیِ موج تا آیکون در سایزهای کوچک گم نشود
    bbox = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    img = img.crop(bbox)
    # مربعی‌کردن
    w, h = img.size
    side = max(w, h)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(img, ((side - w) // 2, (side - h) // 2), img)
    return sq.resize((size, size), Image.LANCZOS)


def rounded_mask(size: int, radius_ratio: float) -> Image.Image:
    m = Image.new('L', (size * 4, size * 4), 0)
    d = ImageDraw.Draw(m)
    r = int(size * 4 * radius_ratio)
    d.rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=r, fill=255)
    return m.resize((size, size), Image.LANCZOS)


def tile(size: int, inset: float = 0.62, radius: float = 0.22, bg=BG, square=False) -> Image.Image:
    """کاشی نهایی: پس‌زمینه‌ی تیره‌ی گرد + موج زرد در وسط."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    plate = Image.new('RGBA', (size, size), bg + (255,))
    # کمی عمق: گرادیان ملایم از بالا
    grad = np.linspace(1.16, 0.92, size, dtype=np.float32)[:, None, None]
    pa = np.asarray(plate).astype(np.float32)
    pa[..., :3] = np.clip(pa[..., :3] * grad + 6 * grad, 0, 255)
    plate = Image.fromarray(pa.astype(np.uint8), 'RGBA')
    if not square:
        plate.putalpha(rounded_mask(size, radius))
    canvas.alpha_composite(plate)

    mark_px = int(size * inset)
    mark = keyed_mark(mark_px)
    off = ((size - mark_px) // 2, (size - mark_px) // 2)
    # درخشش ملایم پشت موج — حس «فوتوریستیک» بدون شلوغی.
    # زیر ۹۶px میله‌های موج نازک‌اند و هاله آن‌ها را گِل‌آلود می‌کند، پس حذف می‌شود.
    if size >= 96:
        glow = mark.copy().filter(ImageFilter.GaussianBlur(size * 0.035))
        ga = np.asarray(glow).astype(np.float32)
        ga[..., 3] *= 0.38
        canvas.alpha_composite(Image.fromarray(ga.astype(np.uint8), 'RGBA'), off)
    canvas.alpha_composite(mark, off)
    return canvas


def save(img: Image.Image, path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'PNG')
    print('  ', os.path.relpath(path, ROOT), img.size)


# ---------- ویندوز / الکترون ----------
print('electron:')
eic = os.path.join(ROOT, 'electron', 'icons')
master = tile(1024)
save(master, os.path.join(eic, 'icon.png'))
sizes = [16, 24, 32, 48, 64, 128, 256, 512]
for s in sizes:
    # در سایزهای ریز، موج را بزرگ‌تر می‌کنیم وگرنه در نوار وظیفه دیده نمی‌شود
    save(tile(s, inset=0.72 if s <= 32 else 0.66 if s < 96 else 0.62,
              radius=0.22 if s >= 48 else 0.18),
         os.path.join(eic, f'icon-{s}.png'))
# ICO چندسایزی
ico = os.path.join(eic, 'icon.ico')
master.save(ico, format='ICO', sizes=[(s, s) for s in [16, 24, 32, 48, 64, 128, 256]])
print('   electron/icons/icon.ico')

# ---------- اندروید ----------
print('android:')
res = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
# legacy launcher (مربع + گرد)
DPI = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
for d, px in DPI.items():
    ins = 0.70 if px < 96 else 0.64
    save(tile(px, inset=ins, radius=0.20), os.path.join(res, f'mipmap-{d}', 'ic_launcher.png'))
    circ = tile(px, inset=ins * 0.92, radius=0.5)
    save(circ, os.path.join(res, f'mipmap-{d}', 'ic_launcher_round.png'))
    # foreground آداپتیو: ۷۲/۱۰۸ ناحیه‌ی امن ⇒ موج کوچک‌تر، پس‌زمینه شفاف
    fg_px = int(px * 108 / 48)
    fg = Image.new('RGBA', (fg_px, fg_px), (0, 0, 0, 0))
    m_px = int(fg_px * 0.44)
    mk = keyed_mark(m_px)
    fg.alpha_composite(mk, ((fg_px - m_px) // 2, (fg_px - m_px) // 2))
    save(fg, os.path.join(res, f'mipmap-{d}', 'ic_launcher_foreground.png'))

# پس‌زمینه‌ی آداپتیو به‌صورت رنگ ساده
os.makedirs(os.path.join(res, 'mipmap-anydpi-v26'), exist_ok=True)
adaptive = '''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
'''
for name in ('ic_launcher.xml', 'ic_launcher_round.xml'):
    with open(os.path.join(res, 'mipmap-anydpi-v26', name), 'w', encoding='utf-8') as f:
        f.write(adaptive)
    print('   res/mipmap-anydpi-v26/' + name)

# صفحه‌ی شروع
splash = Image.new('RGBA', (1080, 1920), BG + (255,))
mk = keyed_mark(420)
splash.alpha_composite(mk, ((1080 - 420) // 2, (1920 - 420) // 2))
save(splash.convert('RGB').convert('RGBA'), os.path.join(res, 'drawable', 'splash.png'))
save(splash.convert('RGB').convert('RGBA'), os.path.join(res, 'drawable-port-xxxhdpi', 'splash.png'))

# ---------- وب ----------
print('web:')
pub = os.path.join(ROOT, 'public')
save(tile(512), os.path.join(pub, 'icon-512.png'))
save(tile(192), os.path.join(pub, 'icon-192.png'))
save(tile(180, radius=0.0, square=True), os.path.join(pub, 'apple-touch-icon.png'))
save(tile(64), os.path.join(pub, 'favicon.png'))
print('DONE')
