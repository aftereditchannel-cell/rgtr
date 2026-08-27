# NEXUS Cloud — بک‌اند رایگان Cloudflare

این سرویس **جای Firebase را حذف نمی‌کند**. بعد از استقرار، در تنظیمات NEXUS HQ می‌توان بین Firebase و Cloudflare جابه‌جا شد. حساب و نشست هر سرویس جداست.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/aftereditchannel-cell/rgtr/tree/arena/01a03263-rgtr/cloudflare/nexus-cloud)

دکمه بالا سریع‌ترین راه است: GitHub و Cloudflare را تأیید کنید و Deploy را بزنید. اگر سرویس Deploy خودکار مسیر شاخه را تشخیص نداد، مراحل دستی پایین را انجام دهید.

## امکانات و امنیت

- ثبت‌نام و ورود با ایمیل و رمز
- هش رمز با PBKDF2-SHA256، نمک تصادفی و ۲۱۰٬۰۰۰ تکرار
- token تصادفی؛ فقط هش token در دیتابیس ذخیره می‌شود
- محدودیت ۸ تلاش ناموفق در ۱۵ دقیقه
- جداسازی کامل اطلاعات بر اساس شناسه کاربر
- حداکثر داده هر کاربر ۹۰۰ KiB
- عدم ثبت رمز، token یا داده در log
- ذخیره SQLite داخل Durable Object روی پلن رایگان Cloudflare

## استقرار

1. در Cloudflare وارد **Workers & Pages** شوید.
2. **Create application → Import a repository** را بزنید.
3. مخزن `aftereditchannel-cell/rgtr` و شاخه حاوی آخرین تغییرات را انتخاب کنید.
4. Root directory را `cloudflare/nexus-cloud` قرار دهید.
5. Build command را `npm install` و Deploy command را `npm run deploy` بگذارید.
6. Cloudflare با تنظیمات `wrangler.jsonc` فضای SQLite را خودکار می‌سازد.
7. آدرس عمومی HTTPS مثل `https://nexus-hq-cloud.<account>.workers.dev` را کپی کنید.
8. در برنامه: **تنظیمات → همگام‌سازی → Cloudflare → آدرس سرور → تست و ذخیره**.

هیچ API Token، رمز Cloudflare یا کلید خصوصی را داخل برنامه، GitHub یا چت قرار ندهید. برای استفاده پایدارتر می‌توانید یک Custom Domain متعلق به خودتان را در Cloudflare به Worker متصل کنید.
