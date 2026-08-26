# Relay اختصاصی Firebase برای NEXUS HQ

این Worker برای دستگاه‌هایی است که اتصال مستقیم Firebase روی شبکه آن‌ها در دسترس نیست.

## امنیت

- این یک پراکسی عمومی نیست؛ فقط سه میزبان ضروری Firebase پذیرفته می‌شوند.
- فقط پروژه `nexus-hq-c42cd` اجازه عبور دارد.
- Firestore بدون Firebase ID Token رد می‌شود و Rules اصلی همچنان اجرا می‌شوند.
- رمز، توکن و داده در Worker ذخیره یا لاگ نمی‌شود.
- هیچ Service Account، کلید خصوصی یا Secret لازم نیست.
- Firebase Web API Key موجود در فایل عمومی و محرمانه نیست.

## استقرار از داشبورد Cloudflare

1. در Cloudflare وارد **Workers & Pages** شوید.
2. **Create application** و سپس **Import a repository** را انتخاب کنید.
3. مخزن `aftereditchannel-cell/rgtr` و شاخه حاوی آخرین تغییرات را انتخاب کنید.
4. Root directory را روی `cloudflare/firebase-relay` بگذارید.
5. دستور Build لازم نیست و Deploy command برابر `npx wrangler deploy` است.
6. پس از Deploy، آدرس HTTPS ساخته‌شده (مثلاً `https://nexus-hq-firebase-relay.<account>.workers.dev`) را کپی کنید.
7. در هر دو دستگاه وارد NEXUS HQ → تنظیمات → همگام‌سازی شوید، آدرس را در بخش «اتصال امن بدون VPN» قرار دهید و «تست و اتصال» را بزنید.

برای پایداری بیشتر می‌توانید در Cloudflare یک Custom Domain متعلق به خودتان به همین Worker وصل کنید. آدرس Relay عمومی است و Secret محسوب نمی‌شود؛ ولی توکن Cloudflare یا رمز حساب را هرگز در برنامه یا مخزن قرار ندهید.
