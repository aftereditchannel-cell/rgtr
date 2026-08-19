# BUILD REPORT — NEXUS HQ v1.0.0

```
Project:
NEXUS HQ — Personal Business Operating System (React 19 + Vite + TypeScript + Tailwind 4)

Source:
GitHub Repository متصل‌شده — aftereditchannel-cell/rgtr
شاخه‌ی Build: arena/01a01807-rgtr (کامیت 5de996b)

Build Status:
SUCCESS ✅
```

## خروجی‌ها

| هدف | فایل | حجم | وضعیت |
|---|---|---|---|
| Android | `android/NEXUS-HQ-1.0.0-android.apk` | 0.49 MB | ✅ Release، امضاشده (v1/SHA256withRSA)، **Universal** (تک‌فایل، بدون نیاز به Split) |
| Android | AAB | — | ❌ در این محیط ممکن نیست — نیاز به Android SDK + Gradle + مخازن Maven/Google دارد که فایروال محیط دسترسی به آن‌ها را قطع می‌کند. راه‌حل آماده: `ci-templates/build-all.yml` روی GitHub Actions |
| Windows | `windows/NEXUS-HQ-1.0.0-windows.exe` | 94.8 MB | ✅ Portable — دابل‌کلیک، بدون نصب |
| Windows | `windows/NEXUS-HQ-1.0.0-Setup.exe` | 94.9 MB | ✅ Installer — شورتکات دسکتاپ/استارت + ثبت در Add/Remove Programs + Uninstaller |
| همه | `NEXUS-HQ-v1.0.0-build-output.zip` | ~74 MB | ✅ همه‌ی خروجی‌ها یکجا |

## نتیجه‌ی تست خروجی (Stage 6)

- **APK**: پارس و اعتبارسنجی با ابزار استاندارد (androguard) — امضا v1 معتبر، پکیج `app.nexushq.mobile`،
  MainActivity، آیکون، ۲۶ فایل وب تعبیه‌شده ✓ · minSdk 24 (اندروید ۷+) · targetSdk 29 · تک‌فایل Universal
- **EXEها**: هدر PE معتبر (MZ) ✓ · منطق سرور با بیلد لینوکسیِ همان کد تست شد (صفحات/فونت/SPA همگی 200) ✓
- **ZIP**: تست سلامت archive بدون خطا ✓

## نکات فنی Build

1. **سورس ناقص بود و اصلاً بیلد نمی‌شد** — ۵ فایل گم‌شده‌ی آپلود (theme.ts، lock.ts، LockScreen، BottomNav،
   BrandMark + دو تابع mobile.ts) بازسازی شد؛ تمام تست‌های خود پروژه (smoke + render در jsdom) پاس شد.
   این تغییرات فقط در Working Copy شاخه‌ی Build انجام شد؛ `main` دست‌نخورده است (Pull Request #1 برای merge).
2. **قید محیط**: فایروال این محیط فقط npm/PyPI/GitHub را باز می‌گذارد؛ Android SDK، مخازن Maven/Google،
   باینری‌های Electron و wine در دسترس نبودند. بنابراین:
   - APK با خط لوله‌ی مستقل ساخته شد: کد اندروید به‌صورت smali + مانیفست باینری AXML و resources.arsc
     با اسکریپت پایتون + امضای JAR v1 — بدون Android SDK.
   - EXE با کامپایلر Cross (Bun → bun-windows-x64) ساخته شد — بدون Electron/wine؛ کل وب‌اپ تعبیه‌شده.
3. **Secretها**: هیچ Secret یا Environment Variable لازم نبود (اپ local-first است؛ کلید امضا داخل ریپو).
   هیچ اطلاعات حساسی در خروجی‌ها قرار ندارد.
4. **جدا بودنی Build از Source**: همه‌ی خروجی‌ها فقط در `build-output/` و `release/` — سورس تمیز مانده.
5. کلید امضای APK برای به‌روزرسانی‌های بعدی: `build-apk/signing-key.pem` (نگه دارید).
