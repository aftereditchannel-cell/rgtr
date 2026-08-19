# NEXUS HQ v1.1.0 — Native Apps (ویندوز + اندروید) + Social Analyzer + AI

> این نسخه‌ها اپلیکیشن‌های **واقعی و مستقل** هستند — نه Web/PWA/مرورگر.
> بدون سرور · بدون localhost · بدون Node/Python/Fluter · تمام وابستگی‌ها داخل بسته

| فایل | حجم | توضیح |
|---|---|---|
| `NEXUS-HQ-Setup.exe` | ۱.۹ MB | 🪟 **نصب‌کننده Native** — شورتکات دسکتاپ/استارت + Add/Remove Programs + Uninstaller |
| `NEXUS-HQ.exe` | ۱.۵ MB | 🪟 **اپ مستقل** (Portable) — همان برنامه بدون نصب؛ از فلش هم اجرا می‌شود |
| `NEXUS-HQ-1.0.0-android.apk` | ۰.۵ MB | 📱 **اپ اندروید** — نصب مستقیم روی اندروید ۷+ |
| `NEXUS-HQ-v1.1.0-native.zip` | ~۲ MB | همه‌ی خروجی‌ها یکجا |
| `SHA256.txt` | — | صحت‌سنجی |

درستی فایل‌ها: `SHA256.txt`

---

## 🪟 ویندوز — چطور کار می‌کند؟

- **پنجره‌ی بومی ویندوز** (Win32) با موتور **WebView2** (همان موتور کروم، تعبیه‌شده در خود ویندوز).
  مرورگر باز نمی‌شود؛ پنجره‌ی مستقل برنامه با نوار عنوان تیره و آیکون اختصاصی است.
- فایل‌های برنامه داخل خود EXE تعبیه شده‌اند و به `%LOCALAPPDATA%\NEXUS-HQ` استخراج می‌شوند؛
  با «میزبان مجازی» (`https://app.nexushq.mobile` ← پوشه‌ی محلی) سرو می‌شوند — **هیچ سوکت و سروری باز نمی‌شود**.
- تنها پیش‌نیاز: **WebView2 Runtime** که به‌صورت پیش‌فرض روی ویندوز ۱۰/۱۱ نصب است.
- داده‌های برنامه (IndexedDB) در `%LOCALAPPDATA%\NEXUS-HQ\userdata` پایدار ذخیره می‌شود.

### نصب
1. `NEXUS-HQ-Setup.exe` را اجرا کنید → More info ← Run anyway (هشدار SmartScreen به‌خاطر نبود امضای مایکروسافت)
2. نصب برای کاربر فعلی — بدون Administrator
3. شورتکات دسکتاپ/استارت ساخته می‌شود، در Settings ← Apps ثبت می‌شود، `Uninstall NEXUS HQ` در منوی استارت
4. حذف: Settings ← Apps ← NEXUS HQ ← Uninstall

### بدون نصب (Portable)
`NEXUS-HQ.exe` را هرجا خواستید کپی و اجرا کنید — حتی از فلش. همه‌چیز داخل خودش است.

## 📱 اندروید
1. APK را به گوشی ببرید → باز کنید → اجازه‌ی «منابع ناشناس» (بار اول)
2. برنامه آیکون خودش را دارد، آفلاین کامل است و داده‌ها در حافظه‌ی خصوصی برنامه می‌ماند
3. پشتیبان‌گیری: تنظیمات ← خروجی JSON

---

## معماری فنی (خلاصه)

| لایه | ویندوز | اندروید |
|---|---|---|
| پنجره/Activity | Win32 Native (C++) | android.app.Activity (smali) |
| موتور UI | WebView2 (Edge/Chromium داخلی ویندوز) | Android System WebView |
| منبع برنامه | Virtual Host → پوشه‌ی محلی (بدون سرور) | shouldInterceptRequest → assets (بدون سرور) |
| بسته‌بندی | Zig cross-compiler → PE x64 | AXML/ARSC دست‌ساز + امضای v1 |
| نصب‌کننده | C++ Native (شورتکات COM + رجیستری) | خود APK |

- سورس کامل و تکرارپذیر: پوشه‌های `build-native/win/` و `build-apk/` در همین ریپو
- کلید امضای اندروید: `build-apk/signing-key.pem` — برای به‌روزرسانی‌های بعدی نگه دارید
- **AAB**: در این محیط ممکن نیست (نیازمند Android SDK/Gradle) — ورک‌فلو آماده: `ci-templates/build-all.yml`


---

# 🆕 v1.1.0 — Social Analyzer + AI + Automation

## Social Media Analyzer
- ورودی: `@username` یا URL — تشخیص خودکار Platform
- Providerهای ماژولار: **YouTube · Telegram · SoundCloud · Spotify · Instagram**
- فقط منابع قانونی: YouTube RSS عمومی/Data API، پیش‌نمایش رسمی t.me، کلیدهای خودِ کاربر برای SoundCloud/Spotify/Graph API
- **داده‌ی جعلی ندارد** — هر چیزی در دسترس نباشد صریحاً «در دسترس نیست» می‌شود
- Refresh: دستی / هنگام باز شدن / هر ۵ یا ۱۵ دقیقه (از تنظیمات)

## AI Automation
- Providerها: **OpenAI · Gemini · Claude** (کلید خودتان — بدون ادعای رایگان)
- Test Connection واقعی، انتخاب مدل، فعال/غیرفعال
- Workflow: Fetch → AI Analysis → Report + تاریخچه و لاگ

## دروازه‌ی شبکه‌ی بومی (بدون CORS)
- ویندوز: WinHTTP داخل خود EXE — اندروید: HttpURLConnection داخل خود APK
- دامنه‌ی داخلی `api.nexushq.mobile` — **هیچ localhost/127.0.0.1 در باینری‌ها نیست** (بررسی شد)

## مخزن امن کلیدها
- ویندوز: **DPAPI** (رمزنگاری سطح‌کاربر ویندوز) — اندروید: حافظه‌ی خصوصی برنامه (SharedPreferences)
- کلیدها هرگز وارد Export/بکاپ/لاگ نمی‌شوند و در UI ماسک می‌شوند

## شخصی‌سازی
- نام برنامه (عنوان پنجره‌ی واقعی از طریق پل بومی تغییر می‌کند) · رنگ دوم · تغییر نام Platformها · Dark/Light/Auto
