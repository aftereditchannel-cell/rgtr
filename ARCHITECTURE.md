# NEXUS HQ — معماری سیستم

> Business Operating System شخصی · Local-first · 100% رایگان · بدون بک‌اند

---

## ۱. تحلیل ایده (صادقانه)

**نقطه قوت ایده:** مشکل شما واقعی است و درست تشخیص داده‌اید — مشکل «کمبود ابزار» نیست، «پراکندگی + نبود تمرکز» است.

**بزرگ‌ترین ریسک پروژه:** خودِ همین سیستم می‌تواند تبدیل به پروژه بیست‌ویکم شما شود. سیستمی که ۲۰ ماژول دارد و پر کردنش ۴۰ ساعت وقت می‌برد، بعد از دو هفته رها می‌شود. این تجربه‌ی تقریباً همه‌ی کسانی است که Notion را از صفر می‌سازند.

**بنابراین تصمیم طراحی کلیدی:**
- همه‌ی ۲۰ ماژول ساخته می‌شوند (چون خواسته‌اید و هزینه‌ی ساختشان با موتور schema-driven تقریباً صفر است)
- ولی **قلب سیستم** فقط ۳ صفحه است: `Dashboard (Today's Focus)`، `Decision Center`، `Tasks`
- بقیه ماژول‌ها «انبار داده» هستند، نه جایی که هر روز باید بروید

اگر روزی فقط ۳۰ ثانیه وقت داشته باشید، Dashboard باید بگوید: **امروز این ۳ کار.** بقیه سیستم فقط پشتیبان این جمله است.

**واقع‌بینی درباره‌ی AI Agents و Automation:** در نسخه‌ی اول اینها *رجیستری و کنترل‌پنل* هستند (تعریف، وضعیت، لاگ اجرا، زمان‌بندی)، نه اجراکننده. اجرای واقعی نیاز به کلید API (پولی) یا n8n خودمیزبان دارد. معماری طوری چیده شده که فردا با نوشتن یک adapter، همین رجیستری واقعاً اجرا شود — بدون بازنویسی UI.

---

## ۲. معماری پیشنهادی

```
┌─────────────────────────────────────────────────┐
│  UI Layer — React 19 + Tailwind v4              │
│  Pages (custom) + Schema-driven Module Engine   │
├─────────────────────────────────────────────────┤
│  Domain Layer — selectors / scoring / focus     │
│  (بدون وابستگی به UI و بدون وابستگی به storage) │
├─────────────────────────────────────────────────┤
│  State — Zustand (single in-memory store)       │
├─────────────────────────────────────────────────┤
│  Persistence — IndexedDB (Dexie) + autosave     │
│  fallback: localStorage · export/import: JSON   │
├─────────────────────────────────────────────────┤
│  Future Adapters (اختیاری، غیرفعال در v1)       │
│  FileSystemAPI · n8n · Telegram · AI API · Sync │
└─────────────────────────────────────────────────┘
```

**ایده‌ی کلیدی معماری: Schema-Driven Module Engine**

به‌جای نوشتن ۲۰ صفحه CRUD تکراری، هر ماژول فقط یک «تعریف» است:

```ts
{ key:'artists', label:'Artists', icon:'Mic2',
  fields:[ {key:'name',type:'text'}, {key:'status',type:'select',options:[...]} ],
  views:['table','kanban','cards'], groupBy:'status' }
```

و یک موتور مشترک، جدول + فرم + فیلتر + جستجو + Kanban + Drag&Drop را می‌سازد.

**نتیجه:** اضافه کردن دپارتمان جدید = چند خط JSON (یا حتی از داخل خود UI در صفحه Settings ← Module Builder، بدون کدنویسی).

---

## ۳. Tech Stack (بررسی هزینه، تک‌به‌تک)

| لایه | انتخاب | لایسنس | هزینه |
|---|---|---|---|
| Build | Vite 8 | MIT | رایگان |
| UI | React 19 | MIT | رایگان |
| Language | TypeScript | Apache-2.0 | رایگان |
| Styling | Tailwind CSS v4 | MIT | رایگان |
| State | Zustand | MIT | رایگان |
| Storage | Dexie (IndexedDB) | Apache-2.0 | رایگان |
| Router | React Router (Hash mode) | MIT | رایگان |
| Icons | lucide-react | ISC | رایگان |
| Charts | **SVG دست‌ساز** (بدون کتابخانه) | — | رایگان |
| Hosting | GitHub Pages | — | رایگان |

**تصمیم‌های آگاهانه:**
- ❌ **Next.js نه** — نیاز به سرور برای بخش‌های جالبش دارد؛ برای local-first اضافه‌بار است
- ❌ **Supabase/Firebase نه** — رایگان شروع می‌شوند ولی داده را روی سرور دیگری می‌برند (خلاف شرط مالکیت داده)
- ✅ **Electron برای نسخه‌ی ویندوز (v1.0)** — در ابتدا رد شده بود، اما چون هدف «برنامه‌ی واقعی روی کامپیوتر خودم» بود، اضافه شد. یک لایه‌ی **افزودنی** است: پوشه‌ی `electron/` + سه فایل در `src/lib/`. کد وب حتی یک خط تغییر نکرد و بدون Electron دقیقاً مثل قبل کار می‌کند. سود اصلی: داده به‌جای IndexedDB داخل یک **فایل JSON واقعی** روی دیسک می‌نشیند (پاک‌شدن کش مرورگر دیگر خطرناک نیست). هزینه: حجم ~۱۰۰MB برای هر خروجی
- ❌ **Tauri نه** — خروجی خیلی سبک‌تری می‌دهد (~۱۰MB) ولی برای build نیاز به Rust + WebView2 دارد و از لینوکس نمی‌شود بدون دردسر برای ویندوز build گرفت. اگر بعداً حجم مهم شد، همین معماری بدون تغییر UI به Tauri منتقل می‌شود (فقط `src/lib/desktop.ts` عوض می‌شود)
- ❌ **Recharts/Chart.js نه** — ۱۵۰KB برای ۴ نمودار ساده؛ SVG خام کافی است
- ✅ **Hash Router** — چون GitHub Pages برای BrowserRouter نیاز به 404.html hack دارد

### چه چیزی واقعاً رایگان است
اجرای محلی · GitHub (repo عمومی/خصوصی) · GitHub Pages · GitHub Actions (۲۰۰۰ دقیقه/ماه) · Cloudflare Pages / Netlify / Vercel (پلن رایگان) · ذخیره‌سازی IndexedDB · PWA و نصب روی دسکتاپ · n8n self-hosted روی همین کامپیوتر

### چه چیزی در آینده هزینه دارد
| مورد | هزینه تقریبی |
|---|---|
| API واقعی AI (OpenAI/Claude/Gemini) | مصرفی — Gemini/Groq پلن رایگان محدود دارند |
| Instagram Graph API | رایگان ولی نیاز به بررسی Meta و اکانت Business |
| دامنه اختصاصی | ~۱۰ دلار/سال (اختیاری، `.github.io` رایگان است) |
| Cloud Sync چندکاربره | Supabase تا ۵۰۰MB رایگان، بعدش ~۲۵ دلار/ماه |
| n8n Cloud | ~۲۰ یورو/ماه — **ولی self-hosted روی PC خودتان کاملاً رایگان** |

---

## ۴. Data Model

همه چیز در یک سند JSON واحد نگهداری می‌شود (`AppData`) که در IndexedDB ذخیره و به‌صورت اتمیک export/import می‌شود.

```ts
AppData {
  version: number              // نسخه‌ی فعلی: 2
  settings: {
    accent, ownerName, orgName, currency, focusCount, weights, theme,
    lang: 'fa' | 'en'                      // پیش‌فرض fa
    calendar: 'jalali' | 'gregorian'       // فقط نمایش
    digits: 'fa' | 'latn'
    cloud: { provider: 'gist', gistId, lastSync, askOnExit }
  }
  modules:  ModuleDef[]        // تعریف ماژول‌ها (قابل ویرایش/حذف توسط کاربر)
  records:  Record<moduleKey, Entity[]>
  removedCore?: string[]       // ماژول‌های پیش‌فرضی که کاربر عمداً حذف کرده
  seededAt?: string            // وجودش یعنی داده‌ی نمونه دیگر ساخته نمی‌شود
}

Entity {
  id: string            // nanoid محلی
  createdAt / updatedAt: ISO
  ...fields             // مطابق schema ماژول
}
```

**ماژول‌های پیش‌فرض (۱۶ عدد) + ۴ صفحه‌ی اختصاصی:**
`projects` · `tasks` · `ideas` · `departments` · `media` · `artists` · `releases` · `reaction` · `social` · `content` · `clients` · `finance` · `seo` · `team` · `agents` · `automations`

صفحه‌های اختصاصی (ماژول نیستند): **Dashboard** · **Decision Center** · **Analytics** · **Settings**. قراردادها داخل ماژول `clients` و `releases` مدیریت می‌شوند.

**رابطه‌ها:** با فیلد نوع `ref` (ذخیره‌ی `id`) — مثلاً `task.project → projects.id`. بدون JOIN، فقط lookup در حافظه. برای حجم داده‌ی شما (حداکثر چند ده‌هزار رکورد) کاملاً سریع است.

**Migration:** فیلد `version` + توابع migration پله‌ای در `lib/migrate.ts` تا backupهای قدیمی همیشه import شوند.
`v1 → v2` تنظیمات زبان/تقویم/ارقام/ابر را با مقدار پیش‌فرض اضافه می‌کند و به `removedCore` احترام می‌گذارد
(یعنی ماژول پیش‌فرضی که حذف کرده‌اید هنگام مهاجرت دوباره برنمی‌گردد).

**حذف‌پذیری کامل:** هیچ ماژول یا رکوردی built-in-و-قفل نیست. `removeModule()` روی ماژول‌های پیش‌فرض هم کار می‌کند
و کلید آن را در `removedCore` ثبت می‌کند؛ `restoreCoreModules()` راه برگشت است.

**قرارداد زبان در داده:** مقادیر `select` (مثل `Doing`، `Won`، `Urgent`) و برچسب انگلیسی فیلدها **همیشه** به انگلیسی
ذخیره می‌شوند. ترجمه فقط در لایه‌ی نمایش (`i18n/`) اتفاق می‌افتد. نتیجه: تعویض زبان هیچ‌وقت داده را migrate نمی‌کند
و فایل بکاپ بین دو زبان قابل تبادل است. تاریخ‌ها هم همیشه **ISO میلادی** ذخیره می‌شوند؛ جلالی فقط یک لایه‌ی نمایشی است.

---

## ۵. Folder Structure

```
hq/
├── src/
│   ├── main.tsx · App.tsx
│   ├── lib/          db · backup · id · format · jalali · useFmt · migrate · cloud · desktop
│   ├── i18n/         dict.ts (کلیدهای UI) · domain.ts (برچسب دامنه) · index.ts (useT)
│   ├── assets/fonts/ Vazirmatn ×4 woff2   ← جاسازی‌شده، بدون CDN
│   ├── domain/       schema.ts · seed.ts · scoring.ts · focus.ts · analytics.ts
│   ├── store/        useApp.ts            ← تنها منبع حقیقت
│   ├── components/   ui/* · layout/* · views/* (Table/Kanban/Calendar/Cards)
│   └── pages/        Dashboard · Decision · Analytics · Settings · Module (generic)
├── electron/         main.cjs · preload.cjs · icons/     ← لایه‌ی نسخه‌ی ویندوز
├── scripts/          smoke.ts · render.tsx · electron-check.cjs · shot.cjs   ← تست‌ها
├── .github/workflows/ deploy.yml (Pages) · release-windows.yml (ساخت exe)
├── electron-builder.yml
└── ARCHITECTURE.md · README.md
```

**قانون طلایی:** `domain/` هیچ import از React ندارد → منطق کسب‌وکار قابل تست و قابل انتقال به بک‌اند آینده است.

---

## ۶. Local چیست، Cloud-ready چیست

| بخش | v1 | آینده |
|---|---|---|
| همه‌ی داده‌ها | 🟢 فایل JSON روی دیسک (ویندوز) / IndexedDB (مرورگر) | Supabase/Postgres |
| Backup | 🟢 دانلود JSON | auto-sync به Git |
| AI Agents | 🟢 رجیستری + لاگ دستی | adapter → OpenAI/Gemini |
| Automations | 🟢 رجیستری + Run دستی | webhook → n8n محلی |
| Analytics | 🟢 محاسبه از داده‌ی خودتان | import از Instagram/YouTube API |
| Auth | ⚪ ندارد (تک‌کاربره) | Supabase Auth |

نقاط اتصال آینده از الان به‌صورت interface خالی در `lib/adapters/` رزرو شده‌اند.

---

## ۷. Backup چگونه کار می‌کند
1. **دستی:** Settings ← Export → فایل `nexus-hq-YYYY-MM-DD.json`
2. **خودکار:** نقاط بازیابی — در نسخه‌ی ویندوز تا **۲۰ فایل** داخل `snapshots/` روی دیسک، در مرورگر ۵ نسخه داخل IndexedDB
3. **Import:** فایل JSON → اعتبارسنجی → migration → جایگزینی
4. **توصیه:** فایل export را داخل همان repo گیت‌هاب بگذارید → نسخه‌بندی رایگان و تاریخچه‌ی کامل

### ۷.۱ لایه‌ی ذخیره‌سازی (سه پشتیبان، یک API)
`src/lib/db.ts` یک رابط واحد می‌دهد و در زمان اجرا تصمیم می‌گیرد کجا بنویسد:

| اولویت | پشتیبان | کِی فعال می‌شود |
|---|---|---|
| ۱ | **فایل روی دیسک** از طریق `window.hq` | داخل نسخه‌ی ویندوز |
| ۲ | **IndexedDB** (Dexie) | در مرورگر |
| ۳ | **localStorage** | اگر IndexedDB در دسترس نباشد |

هیچ صفحه‌ای نمی‌داند کدام فعال است. به همین دلیل هم نسخه‌ی وب و هم نسخه‌ی ویندوز از یک کد ساخته می‌شوند.

### ۷.۲ امنیت نسخه‌ی دسکتاپ
`contextIsolation: true` · `nodeIntegration: false` · `sandbox` فعال · تنها یک `preload` با لیست محدود و مشخصی از توابع.
رندرر هیچ دسترسی مستقیمی به Node ندارد؛ فقط می‌تواند همان چند عمل تعریف‌شده (خواندن/نوشتن داده، بکاپ، اسنپ‌شات) را درخواست کند.
نوشتن روی دیسک **atomic** است (نوشتن در فایل موقت + rename)، پس قطع برق وسط ذخیره فایل را خراب نمی‌کند.
اگر فایل داده خراب باشد، به‌جای پاک‌شدن با نام `corrupt-<timestamp>.json` کنار گذاشته می‌شود.

---

## ۸. GitHub + Deploy

```bash
git init && git add . && git commit -m "init"
gh repo create nexus-hq --private --source=.
git push -u origin main
npm run build          # خروجی در dist/
```

**آیا GitHub Pages کافی است؟** بله، کاملاً — چون اپ ۱۰۰٪ کلاینت‌ساید است و داده در مرورگر خودتان می‌ماند.
⚠️ نکته‌ی مهم: داده روی `username.github.io` ذخیره می‌شود (origin مرورگر)، که با داده‌ی `localhost` یکی **نیست**. یا فقط یکی را انتخاب کنید، یا با Export/Import بین آن دو جابه‌جا شوید.

`vite.config.ts` با `base: './'` تنظیم شده تا هم روی Pages و هم با باز کردن مستقیم فایل کار کند.

**گزینه‌ی بهتر از GitHub Pages:** **Cloudflare Pages** — رایگان، سریع‌تر در ایران، و از repo خصوصی هم build می‌کند (Pages رایگان فقط از repo عمومی deploy می‌کند مگر با Actions).

**امن‌ترین گزینه:** اصلاً deploy نکنید. `npm run dev` روی کامپیوتر خودتان + backup در گیت. داده هرگز از دستگاه خارج نمی‌شود.

---

## ۹. فلسفه‌ی UI
دارک عمیق (#08090C) · شیشه‌ای محدود · یک رنگ تاکیدی · تایپوگرافی فشرده · انیمیشن‌های ۱۵۰ms · بدون شلوغی.
Dashboard از بالا به پایین: **Focus → Signals → Numbers**. هرگز برعکس.

---

## ۱۰. لایه‌ی دوزبانه و راست‌چینی

سه لایه‌ی مستقل، هیچ‌کدام به داده دست نمی‌زنند:

| لایه | فایل | مسئولیت |
|---|---|---|
| رشته‌های UI | `i18n/dict.ts` | ~۲۵۰ کلید، هر کدام یک جفت `{fa, en}` — هر دو زبان کنار هم تا از قلم نیفتند |
| برچسب دامنه | `i18n/domain.ts` | ترجمه‌ی نام فیلدها، مقادیر `select`، گروه‌ها، وزن‌ها و باندهای امتیاز |
| قالب‌بندی | `lib/format.ts` + `lib/jalali.ts` | تاریخ، عدد، پول، ماتریس تقویم — همه با `{lang, calendar, digits}` |

**نقاط ورود در کامپوننت‌ها:**
```ts
const { t, m, f, o, g, lang, rtl } = useT()   // t('dash.focusTitle') · m(module) · f(field) · o(selectValue)
const fmt = useFmt()                          // fmt.date() · fmt.money() · fmt.dg() — متصل به تنظیمات
```

**RTL چگونه پیاده شده:**
- `<html dir>` و `<html lang>` از روی تنظیمات در `Shell` ست می‌شوند (تنها جای دستکاری DOM)
- کل CSS با **logical properties** نوشته شده: `ms-` / `me-` / `start-` / `end-` / `border-e` — نه `left`/`right`
  (یک codemod روی کل `src/` هر `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right` را تبدیل کرد)
- `.ltr` → جزیره‌ی چپ‌چین با `unicode-bidi: isolate` برای اعداد، پول، توکن، مسیر فایل
- `.nums` → `tabular-nums` تا ستون اعداد نلرزد
- `.flip-rtl` → آیکون‌های جهت‌دار (chevron) در فارسی قرینه می‌شوند
- `letter-spacing` در RTL صفر می‌شود (فاصله‌ی حروف خط فارسی را می‌گسلد)، مگر با `.keep-tracking`

**تقویم جلالی:** پیاده‌سازی مستقل در `lib/jalali.ts` (بدون کتابخانه). صحتش در برابر
`Intl.DateTimeFormat('fa-IR-u-ca-persian')` برای کل بازه‌ی ۱۹۹۰–۲۰۴۵ (۲۰٬۴۵۴ روز) تست شد: **صفر اختلاف**.
`monthMatrix` در حالت شمسی هفته را از **شنبه** شروع می‌کند و همیشه سلول‌ها را به‌صورت ISO میلادی برمی‌گرداند،
پس منطق drag & drop تقویم اصلاً از تغییر تقویم خبردار نمی‌شود.

---

## ۱۱. همگام‌سازی ابری (GitHub Gist)

**چرا Gist؟** گزینه‌ها بررسی شدند: Supabase (رایگان تا ۵۰۰MB ولی پروژه‌ی غیرفعال pause می‌شود و کارت می‌خواهد)،
Firebase (سهمیه‌ی روزانه + کارت)، Deta/Fly (تعطیل یا محدود). GitHub Gist تنها گزینه‌ای بود که هم رایگانِ دائمی است،
هم سرور نمی‌خواهد، هم `api.github.com` هدر `access-control-allow-origin: *` می‌دهد یعنی مستقیم از رندرر قابل صداست.

```
lib/cloud.ts
  getToken / setToken            ← localStorage، عمداً خارج از AppData و فایل بکاپ
  verifyToken                    ← GET /user
  ensureGist(id, data)           ← اگر id نبود بساز
  pushGist / pullGist            ← PATCH / GET  (فایل truncated از raw_url خوانده می‌شود)
  payloadSize                    ← هشدار سقف حجم
  CloudError.code                ← bad_token | not_found | network | rate | bad_payload
```

**جریان خروج از برنامه (نسخه‌ی ویندوز):**
```
close event → main.cjs preventDefault() (یک‌بار) → ارسال 'menu:exit' به رندرر → watchdog ۱۵ ثانیه‌ای
   رندرر: ExitSavePrompt
     اگر askOnExit خاموش یا توکنی نیست → persist() → hq.exitNow()
     وگرنه مودال: ذخیره و خروج | خروج بدون ذخیره | انصراف
       ذخیره و خروج → persist → ensureGist → pushGist → ثبت lastSync → persist → exitNow
       انصراف → hq.cancelExit()
```
watchdog تضمین می‌کند که حتی اگر رندرر هنگ کند، پنجره بسته می‌شود.

---
