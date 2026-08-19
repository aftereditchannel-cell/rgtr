#!/usr/bin/env python3
"""
ساخت آیکون برنامه از لوگوی موج زرد (AfterEdit / NEXUS).

لوگو همان موجی است که در src/components/ui/BrandMark.tsx تعریف شده؛
این اسکریپت آن را مستقیم می‌کشد (بدون نیاز به فایل ورودی) و همه‌ی خروجی‌ها را می‌سازد:

  electron/icons/icon.png + سایزهای ۱۶..۵۱۲ + icon.ico   (ویندوز)
  android/app/src/main/res/mipmap-*/ic_launcher*.png      (اندروید، legacy)
  android/app/src/main/res/mipmap-anydpi-v26/*.xml        (اندروید، adaptive)
  android/app/src/main/res/drawable*/splash.png           (صفحه‌ی شروع)
  public/favicon.png · public/icon-192/512.png · apple-touch-icon.png  (وب)

اجرا:  python3 scripts/make-icons.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = (8, 9, 12)          # --color-bg برنامه
GOLD = (255, 200, 0, 255)

# میله‌های موج — دقیقاً همان مختصات viewBox=684x889 در BrandMark
BARS = [
    (0, 368.3, 36, 36), (0, 484.7, 36, 36),
    (54, 321.4, 36, 90.9), (54, 476.7, 36, 90.9),
    (108, 257.1, 36, 139), (108, 493, 36, 139),
    (162, 192.8, 36, 187.1), (162, 509.1, 36, 187.1),
    (216, 128.5, 36, 235.2), (216, 525.3, 36, 235.2),
    (270, 64.3, 36, 283.3), (270, 541.4, 36, 283.3),
    (324, 0, 36, 331.4), (324, 557.6, 36, 331.4),
    (378, 64.3, 36, 283.3), (378, 541.4, 36, 283.3),
    (432, 128.5, 36, 235.2), (432, 525.3, 36, 235.2),
    (486, 192.8, 36, 187.1), (486, 509.1, 36, 187.1),
    (540, 257.1, 36, 139), (540, 493, 36, 139),
    (594, 321.4, 36, 90.9), (594, 476.7, 36, 90.9),
    (648, 368.3, 36, 36), (648, 484.7, 36, 36),
]

VW, VH = 684.0, 889.0


def wave(size: int) -> Image.Image:
    """موج زرد را در یک تصویر شفاف مربعی به ضلع size می‌کشد."""
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    s = size / VW  # مقیاس
    # نسبت ابعاد موج 684:889 است؛ موج را در مرکز مربع با حفظ نسبت می‌نشانیم
    h_px = int(round(VH * s))
    off = (size - h_px) // 2
    for (x, y, w, h) in BARS:
        r = int(round(18 * s))
        d.rounded_rectangle(
            [x * s, off + y * s, (x + w) * s, off + (y + h) * s],
            radius=r, fill=GOLD)
    return img


def rounded_mask(size: int, radius_ratio: float) -> Image.Image:
    m = Image.new('L', (size * 4, size * 4), 0)
    d = ImageDraw.Draw(m)
    r = int(size * 4 * radius_ratio)
    d.rounded_rectangle([0, 0, size * 4 - 1, size * 4 - 1], radius=r, fill=255)
    return m.resize((size, size), Image.LANCZOS)


def tile(size: int, inset: float = 0.58, radius: float = 0.22, square: bool = False) -> Image.Image:
    """کاشی نهایی: پس‌زمینه‌ی تیره‌ی گرد + موج زرد در وسط."""
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    plate = Image.new('RGBA', (size, size), BG + (255,))
    if not square:
        plate.putalpha(rounded_mask(size, radius))
    canvas.alpha_composite(plate)

    mark_px = int(size * inset)
    mark = wave(mark_px)
    # موج باید «مربع» نباشد؛ ارتفاع واقعی‌اش کمتر است. برش به کادر واقعی موج.
    bbox = mark.getchannel('A').getbbox()
    if bbox:
        mark = mark.crop(bbox)
        w, h = mark.size
        side = max(w, h)
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(mark, ((side - w) // 2, (side - h) // 2), mark)
        mark = sq.resize((int(size * 0.78), int(size * 0.78)), Image.LANCZOS)

    off = ((size - mark.size[0]) // 2, (size - mark.size[1]) // 2)
    if size >= 96:
        glow = mark.filter(ImageFilter.GaussianBlur(size * 0.035))
        ga = glow.split()
        ga = list(ga)
        ga[3] = ga[3].point(lambda v: int(v * 0.38))
        glow = Image.merge('RGBA', ga)
        canvas.alpha_composite(glow, off)
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
for s in [16, 24, 32, 48, 64, 128, 256, 512]:
    ins = 0.72 if s <= 32 else 0.66 if s < 96 else 0.58
    save(tile(s, inset=ins, radius=0.22 if s >= 48 else 0.18),
         os.path.join(eic, f'icon-{s}.png'))
master.save(os.path.join(eic, 'icon.ico'), format='ICO',
            sizes=[(s, s) for s in [16, 24, 32, 48, 64, 128, 256]])
print('   electron/icons/icon.ico')

# ---------- اندروید ----------
print('android:')
res = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
DPI = {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}
for d, px in DPI.items():
    ins = 0.70 if px < 96 else 0.62
    save(tile(px, inset=ins, radius=0.20), os.path.join(res, f'mipmap-{d}', 'ic_launcher.png'))
    save(tile(px, inset=ins * 0.9, radius=0.5), os.path.join(res, f'mipmap-{d}', 'ic_launcher_round.png'))
    # foreground آداپتیو: ناحیه‌ی امن ۶۶٪؛ موج کوچک‌تر روی پس‌زمینه شفاف
    fg_px = int(px * 108 / 48)
    fg = Image.new('RGBA', (fg_px, fg_px), (0, 0, 0, 0))
    mk = wave(int(fg_px * 0.42))
    bbox = mk.getchannel('A').getbbox()
    if bbox:
        mk = mk.crop(bbox)
        w, h = mk.size
        side = max(w, h)
        sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
        sq.paste(mk, ((side - w) // 2, (side - h) // 2), mk)
        mk = sq.resize((int(fg_px * 0.62), int(fg_px * 0.62)), Image.LANCZOS)
    fg.alpha_composite(mk, ((fg_px - mk.size[0]) // 2, (fg_px - mk.size[1]) // 2))
    save(fg, os.path.join(res, f'mipmap-{d}', 'ic_launcher_foreground.png'))

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
mk = wave(480)
bbox = mk.getchannel('A').getbbox()
if bbox:
    mk = mk.crop(bbox)
    w, h = mk.size
    side = max(w, h)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    sq.paste(mk, ((side - w) // 2, (side - h) // 2), mk)
    mk = sq.resize((420, 420), Image.LANCZOS)
splash.alpha_composite(mk, ((1080 - mk.size[0]) // 2, (1920 - mk.size[1]) // 2))
save(splash, os.path.join(res, 'drawable', 'splash.png'))
save(splash, os.path.join(res, 'drawable-port-xxxhdpi', 'splash.png'))

# ---------- وب ----------
print('web:')
pub = os.path.join(ROOT, 'public')
save(tile(512), os.path.join(pub, 'icon-512.png'))
save(tile(192), os.path.join(pub, 'icon-192.png'))
save(tile(180, radius=0.0, square=True), os.path.join(pub, 'apple-touch-icon.png'))
save(tile(64), os.path.join(pub, 'favicon.png'))
print('DONE')
