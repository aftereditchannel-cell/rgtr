import type { AppData, Entity } from '../store/types'
import { CORE_MODULES } from './schema'
import { CURRENT_VERSION, DEFAULT_SETTINGS } from '../lib/migrate'
import { uid, nowISO } from '../lib/id'
import { todayISO } from '../lib/format'

const d = (offset: number) => {
  const t = new Date()
  t.setDate(t.getDate() + offset)
  return t.toISOString().slice(0, 10)
}

const E = (o: Record<string, unknown>): Entity => ({
  id: String(o.id ?? uid()), createdAt: nowISO(), updatedAt: nowISO(), ...o,
} as Entity)

/** داده‌ی نمونه‌ی معنادار — از Settings با یک کلیک پاک می‌شود */
export function seedData(): AppData {
  const P = {
    khazar: 'p_khazar', school: 'p_school', label: 'p_label',
    reaction: 'p_reaction', agency: 'p_agency',
  }
  const T = { me: 't_me', ed: 't_ed', des: 't_des' }
  const A = { a1: 'a_1', a2: 'a_2', a3: 'a_3' }
  const D = { media: 'd_media', label: 'd_label', mkt: 'd_mkt', prod: 'd_prod' }

  const records: Record<string, Entity[]> = {
    departments: [
      E({ id: D.media, name: 'Rap Media', lead: T.me, status: 'Active', goal: 'رشد اکوسیستم رسانه‌ای رپ فارسی تا ۵۰۰K مخاطب' }),
      E({ id: D.label, name: 'Label', lead: T.me, status: 'Building', goal: 'امضای ۵ آرتیست و انتشار ۱۲ ترک' }),
      E({ id: D.mkt, name: 'Marketing / SEO', lead: T.me, status: 'Active', goal: 'درآمد پایدار ماهانه از خدمات دیجیتال' }),
      E({ id: D.prod, name: 'Production / Design', lead: T.des, status: 'Active', goal: 'کاور، ویژوالایزر و محتوای تصویری' }),
    ],
    team: [
      E({ id: T.me, name: 'You', role: 'Founder / CEO', department: D.media, status: 'Active', contact: '—' }),
      E({ id: T.ed, name: 'Editor', role: 'Video Editor', department: D.prod, status: 'Freelance', contact: '@editor', rate: 200 }),
      E({ id: T.des, name: 'Designer', role: 'Cover & Visual', department: D.prod, status: 'Part-time', contact: '@designer', rate: 300 }),
    ],
    projects: [
      E({
        id: P.school, name: 'Vocational School', category: 'Education', status: 'Active', priority: 'Urgent',
        deadline: d(12), progress: 35, budget: 3000, revenue: 1800, cost: 400,
        team: ['You'], kpi: 'رتبه ۱ گوگل برای ۵ کلمه کلیدی محلی · دیده‌شدن در پاسخ ChatGPT · ۲۰ لید در ماه',
        notes: 'مشتری واقعی و پرداخت‌کننده — سریع‌ترین مسیر به درآمد.',
        potentialRevenue: 4, difficulty: 2, timeRequired: 2, risk: 1, urgency: 5, strategic: 4,
      }),
      E({
        id: P.khazar, name: 'RAP KHAZAR', category: 'Rap Media', status: 'Active', priority: 'High',
        deadline: d(30), progress: 60, budget: 500, revenue: 900, cost: 250,
        team: ['You', 'Editor'], kpi: 'رشد فالوور · نرخ تعامل · ۳ ریل در هفته',
        notes: 'ستون فقرات برند شخصی و اکوسیستم رسانه‌ای.',
        potentialRevenue: 4, difficulty: 3, timeRequired: 4, risk: 2, urgency: 3, strategic: 5,
      }),
      E({
        id: P.agency, name: 'Digital Marketing Services', category: 'Client Work', status: 'Active', priority: 'High',
        deadline: d(45), progress: 25, budget: 1000, revenue: 2400, cost: 600,
        team: ['You'], kpi: '۳ مشتری فعال · MRR ۱۵۰۰ دلار',
        potentialRevenue: 5, difficulty: 3, timeRequired: 3, risk: 2, urgency: 4, strategic: 4,
      }),
      E({
        id: P.label, name: 'Music Label', category: 'Label', status: 'Planning', priority: 'Medium',
        deadline: d(90), progress: 15, budget: 5000, revenue: 300, cost: 1200,
        team: ['You'], kpi: '۵ آرتیست امضا شده · ۱۲ ریلیز در سال',
        notes: 'پتانسیل بالا ولی بازگشت سرمایه کند. فعلاً کم‌شعله.',
        potentialRevenue: 5, difficulty: 5, timeRequired: 5, risk: 4, urgency: 2, strategic: 5,
      }),
      E({
        id: P.reaction, name: 'Reaction Channel', category: 'Reaction', status: 'Active', priority: 'Medium',
        deadline: d(21), progress: 45, budget: 300, revenue: 150, cost: 180,
        team: ['You', 'Editor'], kpi: '۲ ویدیو در هفته · ۱۰K بازدید',
        potentialRevenue: 3, difficulty: 2, timeRequired: 3, risk: 2, urgency: 3, strategic: 3,
      }),
    ],
    tasks: [
      E({ title: 'سئوی صفحه خدمات آموزشگاه', status: 'Doing', priority: 'Urgent', deadline: d(0), project: P.school, department: D.mkt, person: T.me, estimate: 3, checklist: [{ t: 'تحقیق کلمات کلیدی', done: true }, { t: 'بازنویسی متن', done: false }, { t: 'متا تگ‌ها', done: false }] }),
      E({ title: 'انتشار ریل هفتگی RAP KHAZAR', status: 'To Do', priority: 'High', deadline: d(0), project: P.khazar, department: D.media, person: T.me, estimate: 1 }),
      E({ title: 'تماس با Artist X برای قرارداد', status: 'To Do', priority: 'High', deadline: d(1), project: P.label, department: D.label, person: T.me, estimate: 1 }),
      E({ title: 'ارسال گزارش ماهانه به مشتری', status: 'Review', priority: 'Medium', deadline: d(-2), project: P.agency, person: T.me, estimate: 2 }),
      E({ title: 'ضبط ری‌اکشن قسمت ۱۲', status: 'To Do', priority: 'Medium', deadline: d(3), project: P.reaction, person: T.ed, estimate: 4 }),
      E({ title: 'طراحی کاور ترک جدید', status: 'Doing', priority: 'Medium', deadline: d(4), project: P.label, person: T.des, estimate: 5 }),
      E({ title: 'راه‌اندازی Google Business Profile', status: 'Backlog', priority: 'High', deadline: d(7), project: P.school, person: T.me, estimate: 2 }),
      E({ title: 'بازنویسی بایو پیج‌های اینستاگرام', status: 'Backlog', priority: 'Low', project: P.khazar, person: T.me, estimate: 1 }),
      E({ title: 'تنظیم اتوماسیون گزارش هفتگی', status: 'Backlog', priority: 'Low', deadline: d(14), person: T.me, estimate: 3 }),
      E({ title: 'جمع‌آوری ۵۰ آرتیست جدید', status: 'To Do', priority: 'Medium', deadline: d(10), project: P.label, person: T.me, estimate: 6 }),
      E({ title: 'مذاکره با اسپانسر', status: 'Done', priority: 'High', deadline: d(-5), project: P.khazar, person: T.me }),
    ],
    artists: [
      E({ id: A.a1, artistName: 'Artist X', name: '—', instagram: '@artistx', genre: 'Rap', location: 'Tehran', status: 'In Touch', manager: T.me, lastContact: d(-4), nextAction: 'ارسال پیش‌نویس قرارداد' }),
      E({ id: A.a2, artistName: 'Artist Y', name: '—', instagram: '@artisty', genre: 'Trap', location: 'Rasht', status: 'Collaborating', manager: T.me, lastContact: d(-1), nextAction: 'هماهنگی برای فیچر' }),
      E({ id: A.a3, artistName: 'Artist Z', name: '—', instagram: '@artistz', genre: 'Drill', location: 'Mashhad', status: 'Prospect', lastContact: d(-20), nextAction: 'بررسی پیج و اولین پیام' }),
    ],
    media: [
      E({ name: 'RAP KHAZAR — Instagram', platform: 'Instagram', handle: '@rapkhazar', followers: 42000, growth: 1800, status: 'Growing', project: P.khazar, manager: T.me }),
      E({ name: 'RAP KHAZAR — Telegram', platform: 'Telegram', handle: 't.me/rapkhazar', followers: 12500, growth: 400, status: 'Active', project: P.khazar, manager: T.me }),
      E({ name: 'RAP KHAZAR — YouTube', platform: 'YouTube', handle: 'youtube.com/@rapkhazar', followers: 6800, growth: 300, status: 'Growing', project: P.khazar }),
      E({ name: 'Reaction Channel', platform: 'YouTube', handle: 'youtube.com/@reaction', followers: 3100, growth: 250, status: 'Growing', project: P.reaction }),
    ],
    social: [
      E({ account: '@rapkhazar', platform: 'Instagram', url: 'instagram.com/rapkhazar', followers: 42000, engagement: 4.2, postsPerWeek: 5, owner: T.me, project: P.khazar, status: 'Growing' }),
      E({ account: '@vocational.school', platform: 'Instagram', url: '', followers: 2400, engagement: 2.1, postsPerWeek: 3, owner: T.me, project: P.school, status: 'Active' }),
    ],
    content: [
      E({ title: 'ریل معرفی آرتیست هفته', platform: 'Instagram', type: 'Reel', status: 'Scheduled', publishDate: d(0), person: T.me, project: P.khazar, hashtags: ['rap', 'persianrap'] }),
      E({ title: 'استوری نظرسنجی ترک برتر', platform: 'Instagram', type: 'Story', status: 'Idea', publishDate: d(1), person: T.me, project: P.khazar }),
      E({ title: 'ویدیو ری‌اکشن قسمت ۱۲', platform: 'YouTube', type: 'Video', status: 'Production', publishDate: d(3), person: T.ed, project: P.reaction }),
      E({ title: 'مقاله: بهترین آموزشگاه فنی حرفه‌ای', platform: 'Website', type: 'Article', status: 'Scripting', publishDate: d(5), person: T.me, project: P.school }),
      E({ title: 'کاور ترک جدید Artist Y', platform: 'Instagram', type: 'Cover', status: 'Production', publishDate: d(6), person: T.des, project: P.label }),
    ],
    releases: [
      E({ title: 'Track One', artist: A.a2, type: 'Single', status: 'Mixing', releaseDate: d(20), revenue: 0, cost: 350, streams: 0 }),
      E({ title: 'Feature — Night Drive', artist: A.a1, type: 'Feature', status: 'Scheduled', releaseDate: d(9), revenue: 300, cost: 120, streams: 0 }),
    ],
    reaction: [
      E({ title: 'ری‌اکشن به آلبوم جدید', channel: 'Reaction Channel', reactor: 'You', status: 'Editing', publishDate: d(2), views: 0 }),
      E({ title: 'ری‌اکشن به بتل هفته', channel: 'Reaction Channel', reactor: 'You', status: 'Idea', publishDate: d(8), views: 0 }),
    ],
    clients: [
      E({ name: 'آموزشگاه فنی و حرفه‌ای', company: 'Vocational School', status: 'Won', service: 'SEO', value: 1800, phone: '—', lastContact: d(-3), nextContact: d(4), notes: 'قرارداد سه‌ماهه سئو و جی‌ئو' }),
      E({ name: 'برند پوشاک', company: 'Streetwear Co', status: 'Negotiation', service: 'Social Media', value: 900, lastContact: d(-6), nextContact: d(1) }),
      E({ name: 'استودیو موسیقی', company: 'Studio 7', status: 'Contacted', service: 'Design', value: 400, lastContact: d(-10), nextContact: d(2) }),
      E({ name: 'کافه محلی', company: '—', status: 'Lead', service: 'Local SEO', value: 350, nextContact: d(5) }),
    ],
    finance: [
      E({ title: 'پیش‌پرداخت آموزشگاه', kind: 'Income', amount: 900, date: d(-25), project: P.school, category: 'Service', status: 'Paid' }),
      E({ title: 'قسط دوم آموزشگاه', kind: 'Income', amount: 900, date: d(6), project: P.school, category: 'Service', status: 'Pending' }),
      E({ title: 'اسپانسر پست اینستاگرام', kind: 'Income', amount: 450, date: d(-12), project: P.khazar, category: 'Sponsorship', status: 'Paid' }),
      E({ title: 'خدمات دیجیتال مارکتینگ', kind: 'Income', amount: 1200, date: d(-40), project: P.agency, category: 'Service', status: 'Paid' }),
      E({ title: 'دستمزد تدوینگر', kind: 'Expense', amount: 200, date: d(-8), project: P.reaction, category: 'Salary', status: 'Paid' }),
      E({ title: 'دستمزد طراح', kind: 'Expense', amount: 300, date: d(-15), project: P.label, category: 'Salary', status: 'Paid' }),
      E({ title: 'ابزارها و اشتراک‌ها', kind: 'Expense', amount: 60, date: d(-5), category: 'Tools', status: 'Paid' }),
      E({ title: 'تبلیغات اینستاگرام', kind: 'Expense', amount: 150, date: d(-20), project: P.khazar, category: 'Ads', status: 'Paid' }),
    ],
    seo: [
      E({ website: 'vocational-school.ir', kind: 'SEO', keyword: 'آموزشگاه فنی و حرفه‌ای', location: 'تهران', current: 40, target: 90, actions: 'بهینه‌سازی صفحه خدمات · ساخت ۱۰ بک‌لینک محلی' }),
      E({ website: 'vocational-school.ir', kind: 'GEO', keyword: '—', location: '—', aiQuery: 'بهترین آموزشگاه فنی و حرفه‌ای در تهران کدام است؟', current: 10, target: 70, actions: 'ثبت در دایرکتوری‌ها · تولید محتوای مرجع · اسکیما' }),
      E({ website: 'vocational-school.ir', kind: 'Local SEO', keyword: 'آموزشگاه نزدیک من', location: 'تهران', current: 25, target: 80, actions: 'Google Business Profile · نظرات مشتریان' }),
    ],
    agents: [
      E({ name: 'AI Artist Scout', role: 'کشف آرتیست', status: 'Draft', schedule: 'Weekly', description: 'پیدا کردن آرتیست‌های جدید، بررسی پیج‌ها و دسته‌بندی آن‌ها', responsibilities: 'جستجوی هشتگ‌ها\nبررسی کیفیت پیج\nثبت در دیتابیس آرتیست‌ها\nپیشنهاد آرتیست مناسب', input: 'هشتگ‌ها، ژانر، شهر', output: 'لیست آرتیست + امتیاز', tools: ['Instagram', 'Sheets'] }),
      E({ name: 'AI Content Manager', role: 'مدیر محتوا', status: 'Draft', schedule: 'Daily', description: 'برنامه‌ریزی و پیشنهاد محتوای روزانه', input: 'تقویم محتوا', output: 'ایده + کپشن', tools: ['LLM'] }),
      E({ name: 'AI SEO Manager', role: 'مدیر سئو', status: 'Draft', schedule: 'Weekly', description: 'رصد رتبه و پیشنهاد اقدام', input: 'کلمات کلیدی', output: 'گزارش + تسک', tools: ['Search Console'] }),
      E({ name: 'AI GEO Manager', role: 'دیده‌شدن در AI', status: 'Draft', schedule: 'Weekly', description: 'بررسی اینکه در پاسخ مدل‌های زبانی ظاهر می‌شویم یا نه', input: 'پرسش‌های هدف', output: 'گزارش visibility', tools: ['LLM'] }),
      E({ name: 'AI Copywriter', role: 'کپی‌رایتر', status: 'Draft', schedule: 'Manual', description: 'نوشتن کپشن، متن تبلیغ و بیو', tools: ['LLM'] }),
      E({ name: 'AI Data Analyst', role: 'تحلیلگر داده', status: 'Draft', schedule: 'Weekly', description: 'تحلیل عملکرد رسانه‌ها و پروژه‌ها', tools: ['LLM'] }),
    ],
    automations: [
      E({ name: 'گزارش هفتگی عملکرد', trigger: 'هر شنبه ساعت ۹', action: 'ساخت گزارش و ارسال به تلگرام', frequency: 'Weekly', status: 'Draft', platform: 'n8n', nextRun: d(3) }),
      E({ name: 'یادآوری کارهای عقب‌افتاده', trigger: 'روزانه ساعت ۸', action: 'ارسال لیست تسک‌های overdue', frequency: 'Daily', status: 'Draft', platform: 'Local', nextRun: d(1) }),
      E({ name: 'بکاپ خودکار داده', trigger: 'هر جمعه', action: 'خروجی JSON و آپلود در گیت‌هاب', frequency: 'Weekly', status: 'Draft', platform: 'Local', nextRun: d(2) }),
    ],
    ideas: [
      E({ idea: 'پادکست هفتگی تحلیل رپ فارسی', category: 'Content', status: 'Potential', potential: 4, difficulty: 3, cost: 200, priority: 'Medium' }),
      E({ idea: 'فروش پکیج کاور آرت آماده', category: 'Product', status: 'Research', potential: 3, difficulty: 2, cost: 50, priority: 'Low' }),
      E({ idea: 'دوره آموزش سئو برای کسب‌وکار محلی', category: 'Business', status: 'Inbox', potential: 5, difficulty: 3, cost: 100, priority: 'High' }),
      E({ idea: 'اپلیکیشن کشف آرتیست', category: 'Tech', status: 'Inbox', potential: 4, difficulty: 5, cost: 0, priority: 'Low' }),
      E({ idea: 'همکاری با برندها برای کمپین رپ', category: 'Marketing', status: 'Testing', potential: 5, difficulty: 3, cost: 0, priority: 'High' }),
    ],
  }

  const modules = CORE_MODULES
  for (const m of modules) if (!records[m.key]) records[m.key] = []

  return {
    version: CURRENT_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    modules,
    records,
    removedCore: [],
    seededAt: new Date().toISOString(),
  }
}

export function emptyData(): AppData {
  const records: Record<string, Entity[]> = {}
  for (const m of CORE_MODULES) records[m.key] = []
  return {
    version: CURRENT_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    modules: CORE_MODULES,
    records,
    removedCore: [],
    seededAt: new Date().toISOString(),
  }
}

export const TODAY = todayISO()
