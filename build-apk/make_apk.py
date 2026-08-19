#!/usr/bin/env python3
"""
NEXUS HQ — ساخت APK بدون Android SDK
=====================================
AndroidManifest.xml (AXML باینری) و resources.arsc (مینیمال) را دستی می‌سازد،
dist وب را در assets/public قرار می‌دهد و با classes.dex بسته‌بندی می‌کند.
امضا (v1/JAR) با keytool+jarsigner در گام بعدی انجام می‌شود.

فرمت‌ها بر اساس مستندات رسمی ResChunk (frameworks/base/libs/androidfw):
  RES_XML_TYPE=0x0003, RES_STRING_POOL_TYPE=0x0001, RES_TABLE_TYPE=0x0002
  RES_TABLE_PACKAGE_TYPE=0x0200, RES_TABLE_TYPE_TYPE=0x0201, RES_TABLE_TYPE_SPEC_TYPE=0x0202
  RES_XML_START_NAMESPACE=0x0100, RES_XML_END_NAMESPACE=0x0101,
  RES_XML_START_ELEMENT=0x0102, RES_XML_END_ELEMENT=0x0103
"""
import os
import struct
import zipfile

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..'))
DIST = os.path.join(ROOT, 'dist')
SMALI_DEX = os.path.join(os.path.dirname(__file__), 'classes.dex')
OUT_APK = os.path.join(os.path.dirname(__file__), 'app-unsigned.apk')

PACKAGE = 'app.nexushq.mobile'
VERSION_CODE = 1
VERSION_NAME = '1.0.0'
MIN_SDK = 24
TARGET_SDK = 29  # زیر ۳۰ → الزام v2-signature و resources.arsc بدون فشرده‌سازی برداشته می‌شود
LABEL = 'NEXUS HQ'
ICON_RES = 0x7F010000  # package=0x7F, type=mipmap(1), entry=ic_launcher(0)
STATUS_DARK = 0xFF08090C

# ---------------------------------------------------------------- string pool

def build_string_pool(strings: list[str], utf8=True) -> bytes:
    """RES_STRING_POOL_TYPE با کدبندی UTF-8 (پرچم 0x100)"""
    count = len(strings)
    enc = []

    def utf8_len(n: int) -> bytes:
        if n < 0x80:
            return bytes([n])
        return bytes([0x80 | (n >> 8), n & 0xFF])

    for s in strings:
        b = s.encode('utf-8')
        enc.append(utf8_len(len(s)) + utf8_len(len(b)) + b + b'\x00')
    data = b''.join(enc)

    header_size = 28  # 8 chunk + 4 count + 4 styleCount + 4 flags + 4 stringsStart + 4 stylesStart
    offsets = []
    off = 0
    for e in enc:
        offsets.append(off)
        off += len(e)
    offsets_end = header_size + 4 * count
    strings_start = offsets_end
    while (strings_start - 0) % 4 != 0:  # هم‌ترازی داده‌ی رشته‌ها — از ابتدای chunk
        strings_start += 1
    total = strings_start + len(data)
    if total % 4:
        total += 4 - (total % 4)

    out = struct.pack('<HHIIIIII', 0x0001, header_size, total, count, 0,
                      0x100 if utf8 else 0, strings_start, 0)
    out += b''.join(struct.pack('<I', o) for o in offsets)
    out += b'\x00' * (strings_start - offsets_end)
    out += data
    out += b'\x00' * (total - strings_start - len(data))
    return out


# ---------------------------------------------------------------------- AXML

TYPE_REFERENCE = 0x01
TYPE_STRING = 0x03
TYPE_INT_DEC = 0x10
TYPE_INT_HEX = 0x11
TYPE_BOOLEAN = 0x12

ANDROID_NS = 'http://schemas.android.com/apk/res/android'

class Attr:
    def __init__(self, name, value, dtype, ns=ANDROID_NS):
        self.name, self.value, self.dtype, self.ns = name, value, dtype, ns

class Node:
    def __init__(self, name, attrs=None, children=None, text_ns=False):
        self.name = name
        self.attrs = attrs or []
        self.children = children or []

A = Attr

def build_axml(root: Node, extra_ns: list[str] | None = None) -> bytes:
    """ساخت AndroidManifest باینری (RES_XML_TYPE)"""
    strings: list[str] = []
    index: dict[str, int] = {}

    def sid(s: str) -> int:
        if s not in index:
            index[s] = len(strings)
            strings.append(s)
        return index[s]

    sid(ANDROID_NS)  # uri namespace اول
    sid('android')  # پیشوند namespace
    chunks: list[bytes] = []
    line = 1

    def emit(node: Node):
        nonlocal line
        line += 1
        # start tag
        attr_count = len(node.attrs)
        hdr = struct.pack('<HHIIIIIHHHHHH', 0x0102, 16, 36 + 20 * attr_count, line, 0xFFFFFFFF,
                          0xFFFFFFFF, sid(node.name),
                          0x14, 0x14, attr_count, 0, 0, 0)
        # ↑ فیلدها: type,headerSize,size,line,comment,ns,name,attrStart,attrSize,attrCount,idIdx,classIdx,styleIdx
        body = b''
        for a in node.attrs:
            if a.dtype == TYPE_STRING:
                raw = sid(a.value)
                data = raw
            elif a.dtype == TYPE_REFERENCE:
                raw = -1
                data = a.value
            elif a.dtype == TYPE_INT_HEX:
                raw = -1
                data = a.value
            elif a.dtype == TYPE_BOOLEAN:
                raw = -1
                data = 1 if a.value else 0
            else:  # INT_DEC
                raw = -1
                data = a.value
            body += struct.pack('<iii', sid(a.ns) if a.ns else -1, sid(a.name), raw)
            body += struct.pack('<HBBI', 8, 0, a.dtype, data & 0xFFFFFFFF)
        chunks.append(hdr + body)
        for c in node.children:
            emit(c)
        line += 1
        chunks.append(struct.pack('<HHIIIII', 0x0103, 16, 24, line, 0xFFFFFFFF, 0xFFFFFFFF, sid(node.name)))

    emit(root)

    pool = build_string_pool(strings)
    ns_start = struct.pack('<HHIIIII', 0x0100, 16, 24, 1, 0xFFFFFFFF, sid('android'), sid(ANDROID_NS))
    ns_end = struct.pack('<HHIIIII', 0x0101, 16, 24, 1, 0xFFFFFFFF, sid('android'), sid(ANDROID_NS))

    body = pool + ns_start + b''.join(chunks) + ns_end
    total = 8 + len(body)
    header = struct.pack('<HHI', 0x0003, 8, total)
    return header + body


# ---------------------------------------------------------------------- ARSC

def build_arsc() -> bytes:
    """
    جدول مینیمال: یک package، یک نوع (mipmap)، یک entry (ic_launcher)
    که به فایل PNG اشاره می‌کند. برچسب برنامه رشته‌ی خام در مانیفست است.
    """
    value_string = 'res/mipmap-xxxhdpi/ic_launcher.png'
    type_name = 'mipmap'
    key_name = 'ic_launcher'

    global_pool = build_string_pool([value_string])

    type_pool = build_string_pool([type_name])
    key_pool = build_string_pool([key_name])

    # --- TYPE_SPEC (0x0202): id=1, entryCount=1, flags=0
    spec = struct.pack('<HHIBBHI', 0x0202, 20, 20, 1, 0, 0, 1) + struct.pack('<I', 0)
    # struct: type,headerSize,size,id,res0,res1,entryCount → BBh جاگذاری res0(1B),res1(2B signed)

    # --- TYPE (0x0201): id=1, entryCount=1, config density=640 (xxxhdpi)
    # config: size=64 همه صفر بجز density@offset14
    cfg = bytearray(64)
    struct.pack_into('<I', cfg, 0, 64)
    struct.pack_into('<H', cfg, 14, 640)
    header_size = 20 + 64
    entries_start = header_size + 4  # یک offset آرایه
    entry = struct.pack('<HHI', 8, 0, 0)              # size,flags(0=ساده),key=0
    entry += struct.pack('<HBBI', 8, 0, TYPE_STRING, 0)  # Res_value: string#0
    tsize = entries_start + len(entry)
    tchunk = struct.pack('<HHIBBhIII', 0x0201, header_size, tsize, 1, 0, 0, 1,
                         entries_start, 0)  # آخری: res1-pad صفر → در واقع config.size جای جدا
    # ↑ بازسازی دقیق‌تر پایین
    tchunk = struct.pack('<HHIBBH', 0x0201, header_size, tsize, 1, 0, 0)
    tchunk += struct.pack('<II', 1, entries_start)
    tchunk += bytes(cfg)
    tchunk += struct.pack('<I', 0)  # entryOffset[0] = 0
    tchunk += entry

    type_strings_off = 288
    key_strings_off = type_strings_off + len(type_pool)
    pkg_size = key_strings_off + len(key_pool) + len(spec) + len(tchunk)
    pkg = struct.pack('<HHI', 0x0200, 288, pkg_size)
    pkg += struct.pack('<I', 0x7F)
    pkg += PACKAGE.encode('utf-16-le') + b'\x00' * (256 - 2 * len(PACKAGE))
    pkg += struct.pack('<IIII', type_strings_off, 1, key_strings_off, 1)
    pkg += b'\x00' * (288 - 284)  # padding تا 288 (مطابق خروجی aapt)
    pkg += type_pool + key_pool + spec + tchunk

    total = 12 + len(global_pool) + len(pkg)
    out = struct.pack('<HHII', 0x0002, 12, total, 1)
    out += global_pool + pkg
    return out


# ------------------------------------------------------------------ manifest

def build_manifest() -> bytes:
    root = Node('manifest', [
        Attr('package', PACKAGE, TYPE_STRING, ns=None),
        Attr('versionCode', VERSION_CODE, TYPE_INT_DEC),
        Attr('versionName', VERSION_NAME, TYPE_STRING),
    ], [
        Node('uses-sdk', [
            Attr('minSdkVersion', MIN_SDK, TYPE_INT_DEC),
            Attr('targetSdkVersion', TARGET_SDK, TYPE_INT_DEC),
        ]),
        Node('uses-permission', [
            Attr('name', 'android.permission.INTERNET', TYPE_STRING),
        ]),
        Node('application', [
            Attr('label', LABEL, TYPE_STRING),
            Attr('icon', ICON_RES, TYPE_REFERENCE),
            Attr('allowBackup', True, TYPE_BOOLEAN),
            Attr('hardwareAccelerated', True, TYPE_BOOLEAN),
            Attr('usesCleartextTraffic', False, TYPE_BOOLEAN),
        ], [
            Node('activity', [
                Attr('name', PACKAGE + '.MainActivity', TYPE_STRING),
                Attr('exported', True, TYPE_BOOLEAN),
                # orientation|screenSize|screenLayout|keyboardHidden|uiMode|density
                Attr('configChanges', 0x17A0, TYPE_INT_HEX),
                Attr('windowSoftInputMode', 0x10, TYPE_INT_HEX),  # adjustResize
            ], [
                Node('intent-filter', [], [
                    Node('action', [Attr('name', 'android.intent.action.MAIN', TYPE_STRING)]),
                    Node('category', [Attr('name', 'android.intent.category.LAUNCHER', TYPE_STRING)]),
                ]),
            ]),
        ]),
    ])
    return build_axml(root)


# -------------------------------------------------------------------- pack

def main():
    manifest = build_manifest()
    arsc = build_arsc()
    with open(os.path.join(os.path.dirname(__file__), 'AndroidManifest.xml.bin'), 'wb') as f:
        f.write(manifest)
    with open(os.path.join(os.path.dirname(__file__), 'resources.arsc'), 'wb') as f:
        f.write(arsc)

    icon_src = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res',
                            'mipmap-xxxhdpi', 'ic_launcher.png')
    with zipfile.ZipFile(OUT_APK, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('AndroidManifest.xml', manifest)
        z.write(SMALI_DEX, 'classes.dex')
        z.write(icon_src, 'res/mipmap-xxxhdpi/ic_launcher.png')
        z.writestr('resources.arsc', arsc)
        for root_dir, dirs, names in os.walk(DIST):
            dirs.sort()
            for n in sorted(names):
                full = os.path.join(root_dir, n)
                rel = os.path.relpath(full, DIST).replace(os.sep, '/')
                z.write(full, 'assets/public/' + rel)

    size = os.path.getsize(OUT_APK)
    print(f'app-unsigned.apk: {size} bytes')
    with zipfile.ZipFile(OUT_APK) as z:
        names = z.namelist()
        print(f'  entries: {len(names)}')
        print('  manifest:', len(z.read("AndroidManifest.xml")), 'B',
              '| arsc:', len(z.read("resources.arsc")), 'B',
              '| dex:', len(z.read("classes.dex")), 'B')


if __name__ == '__main__':
    main()
