# گزارش کامل بررسی و ادغام شاخه‌ها — نسخه‌ی final

**تاریخ:** ۲۰۲۶-۰۸-۲۱ — **شاخه‌ی ساخته‌شده:** `final` (و `arena/01a021b9-rgtr` هم‌تراز آن)
**وضعیت:** ✅ build بدون خطا · ✅ ۳۷ تست اجرا/رندر/اسموک · ✅ ۱۸ تست آپدیتر · ✅ ۰ خطای lint

---

## ۱) نقشه‌ی شاخه‌ها و آنچه هر کدام دارد

همه‌ی شاخه‌ها از یک نقطه‌ی مشترک (`9d7d208` = main) منشعب شده‌اند و هر کدام بخشی از قابلیت‌ها را ساخته‌اند:

| شاخه | ویژگی‌های اختصاصی |
|---|---|
| **main** (پایه) | اپ پایه (داشبورد، ماژول‌ها، تحلیل، تصمیم) — **اما شکسته**: `App.tsx` به ۵ فایلی که وجود نداشتند import می‌کرد (BottomNav، BrandMark، LockScreen، lib/theme، lib/lock) |
| **01a017f6** | مرکز شبکه‌های اجتماعی (`SocialHub` + `domain/social.ts`)، صفحه‌ی Automation (چت+تسک+کلید)، برند شخصی (نام/لوگو/آیکون)، `apply-branding.cjs`، `build-all.sh/cmd`، `FEATURES.fa.md` |
| **01a01807** | تحلیل‌گر اجتماعی ماژولار (`src/social/` با provider برای ۵ پلتفرم)، دروازه‌ی شبکه‌ی بومی (`gateway.ts`)، مخزن امن کلیدها (`secrets.ts`)، جریان‌های کاری (Workflows)، KPIهای جدید داشبورد، ذخیره‌ی ابری هنگام خروج، **نسخه‌ی بومی Win32** (`native-app/`)، اسکریپت‌های build بومی، `ci-templates` — **اما**: در `RecordForm` پسرفت داشت (حذف Dropdown سفارشی و «پر کردن خودکار») و **همگام‌سازی خودکار ابری را حذف کرده بود** |
| **01a018fe** | تشخیص WebView اندروید (`appassets.androidplatform.net`) → کروم بومی گوشی، قفل PBKDF2 با salt/hint/تلاش، مودال‌های واکنش‌گرا |
| **01a019c7** | همگام‌سازی خودکار Gist (`lib/sync.ts`)، پل بیومتریک (`lib/biometric.ts`)، اصلاح auto-lock «بلافاصله در بازگشت»، **ثبت واقعی پلاگین بیومتریک در اندروید** (gradle + manifest) |
| **01a01a3f** | کامپوننت Dropdown سفارشی (رفع منوی تمام‌صفحه‌ی اندروید)، Agent Runner (چت واقعی AI برای هر ایجنت)، صفحه‌ی راهنما (Help/tour)، قفل PBKDF2، قالب دپارتمان |
| **01a01b49** | کامل‌ترین پایه‌ی وب: اجتماع 01a01a3f + **بروزرسانی خودکار کامل** (الکترون IPC + دانلود با پیشرفت + نصب) + `test-updater.cjs` + رفع‌های Settings + تست render سازگار با Node 21+ |
| **01a01eac** | نسخه‌ی 1.1.1، کارت بررسی بروزرسانی، قفل بازطراحی‌شده، workflows گیت‌هاب (در کامیت آخر حذف شده بودند — «نیاز به افزودن دستی») |
| **01a01f05** | **بهترین پیاده‌سازی قفل**: PBKDF2 (۲۱۰k تکرار)، ۵ تلاش → ۳۰ ثانیه قفل موقت، شمارنده‌ی معکوس، یادآور رمز، ساعت زنده، لرزش، کلید فیزیکی، `LOCK_EVENT`؛ شیشه و چیدمان موبایل بازسازی‌شده؛ **امضای امن اندروید** (حذف رمز هاردکدشده، `keystore.properties` + env)؛ `lock-check.tsx` |

---

## ۲) چه چیزی از کدام شاخه به final رفت

### از 01a01b49 (پایه‌ی ادغام — کامل‌ترین)
استور و تایپ‌ها، صفحه‌ی تنظیمات پایه، بروزرسانی خودکار (`lib/updater.ts` + `electron/updater.cjs` + پل `desktop.ts`)، Agent Runner، Dropdown سفارشی، صفحه‌ی راهنما، تست‌ها، رفع‌های Settings، همگام‌سازی ابری `autoPull`/`autoPush`.

### از 01a01a3f (از طریق b49)
قفل PBKDF2، پوسته‌ی شیشه‌ای، لوگوی موج، قالب‌های دپارتمان، `lib/ai.ts` و `lib/social.ts`.

### از 01a01f05
- `lib/lock.ts` جدید (۲۳۰ خط: cooldown، attemptsLeft، normalizeDigits، LOCK_EVENT) + `LockScreen.tsx` جدید (۲۵۰ خط)
- منطق هوشمند قفل در `App.tsx` (idleLock جدا از resumeLock — «همیشه» فقط در بازگشت از پس‌زمینه قفل می‌کند، نه وسط کار)
- افکت `shakeX` در CSS، `keystore.properties.example`، `scripts/lock-check.tsx`
- `android/app/build.gradle` — **حذف رمز هاردکدشده‌ی `nexushq2026`** و خواندن رمز از `keystore.properties`/env؛ فایل `nexus-hq.jks` از مخزن حذف شد

### از 01a018fe
- تشخیص WebView اندروید در `mobile.ts` (`appassets.androidplatform.net` + UA `wv`)
- قفل PBKDF2 (salt + hint + تلاش) — در lock نهایی ادغام شد
- همگام‌سازی `onMobileResume` هم‌زمان (غیر async)

### از 01a019c7
- `lib/sync.ts` (ارسال debounced بعد از هر تغییر + دریافت هنگام بازگشت)
- `lib/biometric.ts`
- **ثبت واقعی پلاگین بیومتریک در اندروید**: `capacitor.build.gradle` + `capacitor.plugins.json` + مجوزهای `USE_BIOMETRIC/USE_FINGERPRINT` در Manifest

### از 01a017f6
- `pages/SocialHub.tsx` + `domain/social.ts` (۶ پلتفرم + Generic + پراکسی + کلیدهای اختیاری)
- `domain/ai.ts` (۴ ارائه‌دهنده‌ی رایگان + تسک‌های اتوماسیون)
- کارت برند در تنظیمات (نام/لوگو/آیکون) + `scripts/apply-branding.cjs` + `build-all.*`
- `FEATURES.fa.md`

### از 01a01807
- معماری Social Analyzer (`src/social/` — instagram/youtube/telegram/soundcloud/spotify + registry)
- `lib/gateway.ts` (دروازه‌ی بومی بدون CORS) + `lib/secrets.ts` (مخزن امن کلیدها)
- جریان‌های کاری (Workflows) + لاگ اجرا (RunLog) در استور
- KPIهای جدید داشبورد (حساب‌های اجتماعی / وضعیت AI / اتوماسیون‌ها)
- ذخیره‌ی ابری هنگام خروج/مخفی‌شدن در وب (ExitSavePrompt)
- `native-app/` (منبع Win32 C++ و اندروید smali — بدون باینری) + `build-exe/` + `ci-templates/build-all.yml`
- کارت «AI برای جریان‌های کاری» در تنظیمات (OpenAI/Gemini/Claude + تست اتصال)

### از 01a01eac
- نسخه به `1.2.0` ارتقا یافت (android versionCode 4)
- Workflowهای `release-windows.yml` + `release-android.yml` — به‌دلیل نداشتن مجوز `workflows` توکن، در `ci-templates/` نگه داشته شدند تا با کپی دستی فعال شوند

---

## ۳) مشکلات پیدا و رفع‌شده (در هر دو نسخه)

| # | مشکل | کجا بود | رفع در final |
|---|---|---|---|
| ۱ | **`main` اصلاً build نمی‌شد** — ۵ import شکسته در `App.tsx` | main و 01a021b9 | همه‌ی فایل‌های گم‌شده ساخته/ادغام شدند |
| ۲ | **پلاگین بیومتریک اندروید ثبت نشده بود** در حالی که کد JS از آن استفاده می‌کرد (اثر انگشت در 01a01a3f/b49 کار نمی‌کرد) | 01a01a3f, 01a01b49 | ثبت gradle + plugins.json + مجوزهای Manifest از 01a019c7 |
| ۳ | **رمز امضای اندروید هاردکدشده** (`nexushq2026` در build.gradle) — هر کسی می‌توانست با جک‌سازی امضای جعلی بسازد | 01a01b49 و همه‌ی شاخه‌های قبل از 01f05 | خواندن از `keystore.properties`/env + حذف jks از مخزن |
| ۴ | **حذف همگام‌سازی خودکار ابری در 01a01807** (کد `scheduleCloudPush` حذف شده بود) | 01a01807 | حفظ شد و با ذخیره‌ی هنگام خروج ترکیب شد |
| ۵ | **پسرفت RecordForm در 01a01807** — حذف Dropdown سفارشی (بازگشت منوی تمام‌صفحه‌ی اندروید) و حذف «پر کردن خودکار» پروفایل | 01a01807 | نسخه‌ی کامل (b49) در final نگه داشته شد |
| ۶ | **تغییر رمز بی‌صدا شکست می‌خورد** — API جدید `setPasscode` نیاز به رمز فعلی داشت ولی UI آن را نمی‌گرفت | ادغام lock جدید | فیلد «رمز فعلی» به مودال اضافه شد + پیام خطای واضح |
| ۷ | **دو پیاده‌سازی متفاوت از `settings.ai` و `settings.social`** در شاخه‌ها (تداخل تایپ) | 017f6 / 01807 / b49 | تایپ واحد `AIState`/`SocialState` با نگاشت کامل (v3 migration) |
| ۸ | **JSX در فایل `.ts`** — `icons.ts` با PlatformIcon خطای syntax می‌داد | 017f6 | بازنام‌گذاری به `icons.tsx` + آپدیت importها (مثل خود 017f6) |
| ۹ | **کلیدهای i18n ناقص** — هر شاخه فقط کلیدهای خودش را داشت | همه | دیکشنری یکپارچه: **۵۹۵ کلید fa/en** بدون تکرار |
| ۱۰ | **اتصال ابری هنگام بستن مرورگر** گم شده بود | 01807 داشت، بقیه نداشتند | `pagehide`/`visibilitychange` در ExitSavePrompt |
| ۱۱ | **دستورات باینری‌های ۳۷۶ مگابایتی** در release/build-* | 01a01807 | فایل‌های باینری (exe/apk/zip) وارد نشدند — فقط سورس و اسکریپت‌ها؛ خروجی‌ها با `build-*` بازتولید می‌شوند |

---

## ۴) ساختار نهایی `src/` (اجتماع کامل)

```
src/
├─ ai/providers.ts            ← 01807: OpenAI/Gemini/Claude + تست اتصال (از طریق gateway)
├─ domain/ai.ts               ← 017f6: چت + تسک‌های اتوماسیون + ۴ ارائه‌دهنده‌ی رایگان
├─ domain/social.ts           ← 017f6: واکشی پروفایل ۶ پلتفرم + پراکسی
├─ social/ (۸ فایل)           ← 01807: معماری Provider برای ۵ پلتفرم
├─ pages/
│  ├─ SocialHub.tsx           ← 017f6: مرکز شبکه‌های اجتماعی
│  ├─ Social.tsx              ← 01807: تحلیل‌گر حساب‌ها
│  ├─ Automation.tsx          ← ادغام 017f6+01807: چت / تسک‌ها / جریان‌های کاری / کلیدها
│  ├─ Help.tsx                ← 01a3f/b49: تور و راهنما
│  └─ Settings.tsx            ← ادغام: برند + قفل + AI + اجتماعی + ابر + بروزرسانی
├─ components/views/AgentRunner.tsx   ← b49
├─ components/ui/Dropdown.tsx         ← 01a3f/b49
├─ components/ui/icons.tsx            ← + Delete/LockOpen + BrandIcons/PlatformIcon
├─ lib/ lock.ts (جدید) · sync.ts · biometric.ts · gateway.ts · secrets.ts · updater.ts · ai.ts · social.ts
├─ store/ types.ts · useApp.ts        ← اجتماع کامل (providers/automations/workflows/logs/profiles)
└─ i18n/dict.ts                       ← ۵۹۵ کلید یکپارچه
```

**ضمائم:** `native-app/` (Win32 C++ + Android smali) · `build-exe/` · `ci-templates/` (build-all + ۲ workflow) · `scripts/` (apply-branding، lock-check، test-updater، check-imports، build-all) · `FEATURES.fa.md`

---

## ۵) تأیید کیفیت (همه روی `final` اجرا شد)

| آزمون | نتیجه |
|---|---|
| `npx tsc -b` (کامپایل تایپ‌اسکریپت) | ✅ ۰ خطا |
| `npm run build` (vite production) | ✅ ساخته شد |
| `npm run smoke` (اسموک داده/محاسبات) | ✅ ALL PASSED |
| `npm run render` (رندر واقعی jsdom: ۱۶ ماژول + ۷ صفحه + قفل + workflow) | ✅ ALL PASSED (۰ خطای کنسول) |
| `node scripts/test-updater.cjs` | ✅ 18 passed |
| `npm run lint` (oxlint) | ✅ 0 errors (۱۴ هشدار سبک) |
| بررسی یکپارچگی import همه‌ی فایل‌ها | ✅ ۰ import شکسته |
| اجرای زنده در مرورگر (dev server) | ✅ 200 پاسخ می‌دهد |

---

## ۶) نکته‌ها

- **باینری‌های آماده** (Setup.exe، APK و zip در `release/` و `build-output/` شاخه‌ی 01a01807) عمداً وارد `final` نشدند چون ۳۷۶ مگابایت حجم داشتند و با اسکریپت‌های `build-*`/workflowها بازتولید می‌شوند.
- **workflowهای انتشار** به‌خاطر محدودیت مجوز توکن گیت‌هاب در `ci-templates/` گذاشته شدند؛ برای فعال‌سازی: کپی در `.github/workflows/` و push — یا از گیت‌هاب با مجوز workflows.
- نسخه‌ی `final` = **v1.2.0** در package.json / electron-builder.yml / android build.gradle.
- هر دو شاخه‌ی `final` و `arena/01a021b9-rgtr` به origin فرستاده شدند و به یک کامیت یکسان (`813ee18`) اشاره می‌کنند؛ تاریخچه شامل یک کامیت merge با ۹ والد (main + ۸ شاخه) است.
