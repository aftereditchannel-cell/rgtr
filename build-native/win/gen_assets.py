#!/usr/bin/env python3
"""تولید assets.cpp — همه‌ی فایل‌های dist + WebView2Loader.dll به‌صورت آرایه‌ی بایت داخل EXE."""
import os, sys

ROOT = os.path.normpath(os.path.join(os.path.dirname(__file__), '..', '..'))
DIST = os.path.join(ROOT, 'dist')
LOADER = os.path.join(os.path.dirname(__file__), 'WebView2Loader.dll')
OUT = os.path.join(os.path.dirname(__file__), 'assets.cpp')

VERSION = '1.0.0'

files = []  # (نام نسبی در پوشه‌ی وب, مسیر کامل)
for root, dirs, names in os.walk(DIST):
    dirs.sort()
    for n in sorted(names):
        full = os.path.join(root, n)
        rel = os.path.relpath(full, DIST).replace(os.sep, '/')
        files.append(('web/' + rel, full))
files.sort()

def c_bytes(data: bytes) -> str:
    # به‌صورت رشته‌ی hex فشرده — کامپایلر به آرایه تبدیل می‌کند
    return ','.join(str(b) for b in data)

parts = ['// AUTO-GENERATED — فایل‌های تعبیه‌شده در اجرایی', '#include <stddef.h>', '',
         'struct EmbeddedFile { const char* path; const unsigned char* data; size_t size; };', '']

arr_names = []
for i, (rel, full) in enumerate(files):
    an = f'asset_{i}'
    arr_names.append(an)
    with open(full, 'rb') as f:
        data = f.read()
    parts.append(f'static const unsigned char {an}[] = {{{c_bytes(data)}}}; // {rel} ({len(data)} B)')
    print(f'embedded: {rel} ({len(data)} B)')

with open(LOADER, 'rb') as f:
    loader = f.read()
parts.append(f'static const unsigned char loader_dll[] = {{{c_bytes(loader)}}}; // WebView2Loader.dll ({len(loader)} B)')

parts.append('')
parts.append(f'extern const char* EMBEDDED_VERSION = "{VERSION}";')
parts.append('extern const EmbeddedFile EMBEDDED_FILES[] = {')
for an, (rel, _) in zip(arr_names, files):
    parts.append(f'  {{"{rel}", {an}, sizeof({an})}},')
parts.append('};')
parts.append(f'extern const size_t EMBEDDED_FILES_COUNT = {len(files)};')
parts.append(f'extern const unsigned char* EMBEDDED_LOADER = loader_dll;')
parts.append(f'extern const size_t EMBEDDED_LOADER_SIZE = sizeof(loader_dll);')

with open(OUT, 'w') as f:
    f.write('\n'.join(parts) + '\n')
print(f'assets.cpp: {len(files)} web files + loader, total cpp size {os.path.getsize(OUT)//1024} KB')

_hpp = '''// AUTO-GENERATED
#pragma once
struct EmbeddedFile { const char* path; const unsigned char* data; size_t size; };
extern const char* EMBEDDED_VERSION;
extern const EmbeddedFile EMBEDDED_FILES[];
extern const size_t EMBEDDED_FILES_COUNT;
extern const unsigned char* EMBEDDED_LOADER;
extern const size_t EMBEDDED_LOADER_SIZE;
'''
with open(os.path.join(os.path.dirname(__file__), 'assets.hpp'), 'w') as f:
    f.write(_hpp)
print('assets.hpp written')

