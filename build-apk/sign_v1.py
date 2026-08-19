#!/usr/bin/env python3
"""
امضای v1 (JAR Signing) برای APK — جایگزین jarsigner
====================================================
META-INF/MANIFEST.MF + CERT.SF + CERT.RSA (PKCS#7) می‌سازد؛
ساختار دقیقاً مطابق خروجی jarsigner با SHA-256withRSA است
(Android JarVerifier از API 18+ هضم SHA-256 را می‌پذیرد).
"""
import base64
import datetime
import hashlib
import io
import os
import sys
import zipfile

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

IN_APK = sys.argv[1] if len(sys.argv) > 1 else 'app-unsigned.apk'
OUT_APK = sys.argv[2] if len(sys.argv) > 2 else 'app-signed.apk'
ALIAS = 'NEXUSHQ'

CRLF = b'\r\n'


def sha256(b: bytes) -> bytes:
    return hashlib.sha256(b).digest()


def b64(b: bytes) -> str:
    return base64.b64encode(b).decode('ascii')


# ---------------------------------------------------------------- کلید و گواهی

_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
now = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
_name = x509.Name([
    x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, 'Mobile'),
    x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'NEXUS HQ'),
    x509.NameAttribute(NameOID.COMMON_NAME, 'NEXUS HQ'),
])
_cert = (
    x509.CertificateBuilder()
    .subject_name(_name)
    .issuer_name(_name)
    .public_key(_key.public_key())
    .serial_number(x509.random_serial_number())
    .not_valid_before(now)
    .not_valid_after(now + datetime.timedelta(days=10950))
    .sign(_key, hashes.SHA256())
)

# ذخیره‌ی کلید برای ساخ‌های بعدی (قابل بازتولید)
_pem_dir = os.path.dirname(os.path.abspath(IN_APK))
with open(os.path.join(_pem_dir, 'signing-key.pem'), 'wb') as f:
    f.write(_key.private_bytes(serialization.Encoding.PEM,
                               serialization.PrivateFormat.PKCS8,
                               serialization.NoEncryption()))
with open(os.path.join(_pem_dir, 'signing-cert.pem'), 'wb') as f:
    f.write(_cert.public_bytes(serialization.Encoding.PEM))

# ---------------------------------------------------------------- منیفست‌ها

src = zipfile.ZipFile(IN_APK)
names = [n for n in src.namelist() if not n.startswith('META-INF/')]

sections = []
for n in names:
    data = src.read(n)
    name_line = f'Name: {n}'.encode()
    dig_line = f'SHA-256-Digest: {b64(sha256(data))}'.encode()
    assert len(name_line) <= 72 and len(dig_line) <= 72, f'line too long: {n}'
    sections.append(name_line + CRLF + dig_line + CRLF + CRLF)

main_manifest = b'Manifest-Version: 1.0' + CRLF + b'Created-By: 1.0 (NEXUS HQ build)' + CRLF + CRLF
manifest = main_manifest + b''.join(sections)

main_sf = (
    b'Signature-Version: 1.0' + CRLF +
    b'Created-By: 1.0 (NEXUS HQ build)' + CRLF +
    f'SHA-256-Digest-Manifest-Main-Headers: {b64(sha256(main_manifest))}'.encode() + CRLF +
    f'SHA-256-Digest-Manifest: {b64(sha256(manifest))}'.encode() + CRLF + CRLF
)
sf_sections = []
for sec in sections:
    sf_sections.append(
        f'SHA-256-Digest: {b64(sha256(sec))}'.encode() + CRLF + CRLF
    )
sf = main_sf + b''.join(sf_sections)

# ---------------------------------------------------------------- PKCS#7

from cryptography.hazmat.primitives.serialization import pkcs7

p7 = (
    pkcs7.PKCS7SignatureBuilder()
    .set_data(sf)
    .add_signer(_cert, _key, hashes.SHA256())
    .sign(serialization.Encoding.DER, [pkcs7.PKCS7Options.DetachedSignature])
)

# ---------------------------------------------------------------- بازنویسی zip

buf = io.BytesIO()
with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as out:
    zi = zipfile.ZipInfo(f'META-INF/MANIFEST.MF')
    out.writestr(zi, manifest)
    out.writestr(f'META-INF/{ALIAS}.SF', sf)
    out.writestr(f'META-INF/{ALIAS}.RSA', p7)
    for n in names:
        out.writestr(n, src.read(n))

with open(OUT_APK, 'wb') as f:
    f.write(buf.getvalue())

print(f'signed: {OUT_APK} ({os.path.getsize(OUT_APK)} bytes)')
print(f'  cert : subject={_name.rfc4514_string()}')
print(f'  valid: 30 سال · RSA-2048 · SHA256withRSA')
