#!/usr/bin/env python3
"""NEXUS HQ Native — بسته‌بندی APK اندروید کاملاً Native (بدون WebView/وب)."""
import os
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(HERE, '..', '..'))

# استفاده مجدد از سازنده‌ی AXML/ARSC (بدون اجرای main)
_mk_src = open(os.path.join(ROOT, 'build-apk', 'make_apk.py')).read()
_mk_src = _mk_src.replace("if __name__ == '__main__':\n    main()", "")
mk = {'__file__': os.path.join(ROOT, 'build-apk', 'make_apk.py')}
exec(compile(_mk_src, 'make_apk.py', 'exec'), mk)

Attr = mk['Attr']
Node = mk['Node']
TYPE_STRING = mk['TYPE_STRING']
TYPE_INT_DEC = mk['TYPE_INT_DEC']
TYPE_BOOLEAN = mk['TYPE_BOOLEAN']
TYPE_REFERENCE = mk['TYPE_REFERENCE']
build_axml = mk['build_axml']
build_arsc = mk['build_arsc']

PACKAGE = 'app.nexushq.nat'
LABEL = 'NEXUS HQ Native'
THEME_MATERIAL = 0x01030264  # android:style/Theme.Material (تیره)
ICON_RES = 0x7F010000


def build_manifest() -> bytes:
    root = Node('manifest', [
        Attr('package', PACKAGE, TYPE_STRING, ns=None),
        Attr('versionCode', 1, TYPE_INT_DEC),
        Attr('versionName', '1.0.0', TYPE_STRING),
    ], [
        Node('uses-sdk', [
            Attr('minSdkVersion', 24, TYPE_INT_DEC),
            Attr('targetSdkVersion', 29, TYPE_INT_DEC),
        ]),
        # هیچ مجوزی لازم نیست — کاملاً آفلاین و Native
        Node('application', [
            Attr('label', LABEL, TYPE_STRING),
            Attr('icon', ICON_RES, TYPE_REFERENCE),
            Attr('theme', THEME_MATERIAL, TYPE_REFERENCE),
            Attr('allowBackup', True, TYPE_BOOLEAN),
            Attr('hardwareAccelerated', True, TYPE_BOOLEAN),
        ], [
            Node('activity', [
                Attr('name', PACKAGE + '.MainActivity', TYPE_STRING),
                Attr('exported', True, TYPE_BOOLEAN),
            ], [
                Node('intent-filter', [], [
                    Node('action', [Attr('name', 'android.intent.action.MAIN', TYPE_STRING)]),
                    Node('category', [Attr('name', 'android.intent.category.LAUNCHER', TYPE_STRING)]),
                ]),
            ]),
        ]),
    ])
    return build_axml(root)


def main():
    manifest = build_manifest()
    arsc = build_arsc()
    out = os.path.join(HERE, 'native-unsigned.apk')
    icons = os.path.join(ROOT, 'electron', 'icons')
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('AndroidManifest.xml', manifest)
        z.write(os.path.join(HERE, 'classes.dex'), 'classes.dex')
        # آیکون در همه‌ی تراکم‌ها (واقعی، از آیکون‌های ریپو)
        z.write(os.path.join(icons, '48x48.png'), 'res/mipmap-mdpi/ic_launcher.png')
        z.write(os.path.join(icons, '64x64.png'), 'res/mipmap-hdpi/ic_launcher.png')
        z.write(os.path.join(icons, '128x128.png'), 'res/mipmap-xhdpi/ic_launcher.png')
        z.write(os.path.join(icons, '256x256.png'), 'res/mipmap-xxhdpi/ic_launcher.png')
        z.write(os.path.join(icons, '512x512.png'), 'res/mipmap-xxxhdpi/ic_launcher.png')
        # فونت فارسی وزیرمتن
        z.write(os.path.join(HERE, 'assets', 'fonts', 'Vazirmatn-Regular.ttf'), 'assets/fonts/Vazirmatn-Regular.ttf')
        z.write(os.path.join(HERE, 'assets', 'fonts', 'Vazirmatn-Bold.ttf'), 'assets/fonts/Vazirmatn-Bold.ttf')
        z.writestr('resources.arsc', arsc)
    print(f'native-unsigned.apk: {os.path.getsize(out)} bytes')


if __name__ == '__main__':
    main()
