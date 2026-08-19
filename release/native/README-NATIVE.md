# NEXUS HQ Native Edition v1.1 — ۱۰۰٪ Native، صفر وب

| فایل | حجم | توضیح |
|---|---|---|
| `NEXUS-HQ-Native-Setup.exe` | ۰.۸ MB | 🪟 نصب‌کننده — شورتکات دسکتاپ/استارت + Uninstaller + بدون Administrator |
| `NEXUS-HQ-Native.exe` | ۰.۴ MB | 🪟 اپ مستقل Win32 خالص (C++ / GDI) — بدون WebView، بدون .NET، بدون Runtime |
| `NEXUS-HQ-Native-1.0.0-android.apk` | ۲۸ KB | 📱 اپ اندروید Java خالص (LinearLayout/ListView) — **صفر مجوز، صفر WebView، صفر اینترنت** |

## معماری (هم‌کلاس با Telegram Desktop)
- **ویندوز**: C++ خالص + Win32/GDI — UI کاملاً Owner-Drawn، تم تیره، راست‌چین (WS_EX_LAYOUTRTL)، فونت Segoe UI فارسی، ذخیره در `%LOCALAPPDATA%\NEXUS-HQ-Native\tasks.db`
- **اندروید**: Java خالص (smali→dex) — تم Material تیره، ذخیره در SharedPreferences
- **تأیید باینری**: در هیچ‌کدام WebView/http/localhost وجود ندارد (بایت‌به‌بایت بررسی شد)

## امکانات این نسخه (هسته‌ی Native — v1.0)
- افزودن تسک با عنوان و اولویت (پایین/متوسط/بالا)
- تیک‌زدن انجام‌شده (کلیک) · حذف (راست‌کلیک در ویندوز / لمس-نگه‌داشته در اندروید)
- داشبورد آماری زنده: کل / انجام‌شده / در انتظار
- ذخیره‌سازی خودکار روی همان دستگاه

> نکته‌ی صادقانه: این نسخه، هسته‌ی Native برنامه است (مدیریت تسک + داشبورد).
> نسخه‌ی کامل NEXUS HQ (۱۶ ماژول + Social Analyzer + AI) در همین پوشه‌ی بالاتر با معماری
> WebView بسته‌بندی‌شده موجود است. هر دو روی دستگاه کنار هم نصب می‌شوند.
