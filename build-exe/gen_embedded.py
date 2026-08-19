#!/usr/bin/env python3
"""ساخت build-exe/embedded.ts — همه‌ی فایل‌های dist را به‌صورت import تعبیه می‌کند."""
import os, sys, json

DIST = os.path.join(os.path.dirname(__file__), '..', 'dist')
OUT = os.path.join(os.path.dirname(__file__), 'embedded.ts')

def JSONSTR(s):
    return json.dumps(s)

files = []
for root, dirs, names in os.walk(DIST):
    dirs.sort()
    for n in sorted(names):
        full = os.path.join(root, n)
        rel = '/' + os.path.relpath(full, DIST).replace(os.sep, '/')
        files.append((rel, full))

# index.html باید اول باشد تا embeddedIndexHtml درست باشد
files.sort(key=lambda x: (x[0] != '/index.html', x[0]))

lines = ['// AUTO-GENERATED — فایل‌های تعبیه‌شده در اجرایی ویندوز', '// import با لودر «file» باعث تعبیه‌ی کامل فایل در EXE می‌شود', '']
imports = []
entries = []
for i, (rel, full) in enumerate(files):
    rel_js = full.replace(os.sep, '/')
    lines.append(f'import f{i} from "../dist{rel}" with {{ type: "file" }}')
    imports.append(f'f{i}')
    entries.append(f'  {JSONSTR(rel)}: f{i},')

def JSONSTR(s):
    import json
    return json.dumps(s)

lines.append('')
lines.append('export const embeddedIndexHtml = f0')
lines.append('export const embedded: Record<string, string> = {')
lines.extend(entries)
lines.append('}')

with open(OUT, 'w') as f:
    f.write('\n'.join(lines) + '\n')

print(f'embedded.ts: {len(files)} files')
# index.html باید اول باشد
assert files[0][0] == '/index.html', 'index.html must be first'
