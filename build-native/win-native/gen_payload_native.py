#!/usr/bin/env python3
"""تولید payload.cpp — NEXUS-HQ.exe و icon.ico داخل نصب‌کننده."""
import os

HERE = os.path.dirname(__file__)
APP = os.path.join(HERE, 'NEXUS-HQ-Native.exe')
ICO = os.path.normpath(os.path.join(HERE, '..', '..', 'electron', 'icons', 'icon.ico'))
OUT = os.path.join(HERE, 'payload_native.cpp')

def c_bytes(data: bytes) -> str:
    return ','.join(str(b) for b in data)

parts = ['// AUTO-GENERATED — فایل‌های داخل نصب‌کننده', '#include <stddef.h>', '',
         'struct PayloadFile { const wchar_t* name; const unsigned char* data; size_t size; };', '']

with open(APP, 'rb') as f:
    app = f.read()
parts.append(f'static const unsigned char p_app[] = {{{c_bytes(app)}}};')
print(f'NEXUS-HQ.exe: {len(app)} B')

with open(ICO, 'rb') as f:
    ico = f.read()
parts.append(f'static const unsigned char p_ico[] = {{{c_bytes(ico)}}};')
print(f'icon.ico: {len(ico)} B')

parts.append('extern const PayloadFile PAYLOAD[] = {')
parts.append('  {L"NEXUS-HQ.exe", p_app, sizeof(p_app)},')
parts.append('  {L"icon.ico", p_ico, sizeof(p_ico)},')
parts.append('};')
parts.append('extern const size_t PAYLOAD_COUNT = 2;')

with open(OUT, 'w') as f:
    f.write('\n'.join(parts) + '\n')

hpp = '''// AUTO-GENERATED
#pragma once
#include <stddef.h>
struct PayloadFile { const wchar_t* name; const unsigned char* data; size_t size; };
extern const PayloadFile PAYLOAD[];
extern const size_t PAYLOAD_COUNT;
'''
with open(os.path.join(HERE, 'payload_native.hpp'), 'w') as f:
    f.write(_hpp if False else hpp)
print('payload_native.cpp/hpp written,', os.path.getsize(OUT) // 1024, 'KB')
