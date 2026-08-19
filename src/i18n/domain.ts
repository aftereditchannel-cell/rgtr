/**
 * ترجمه‌ی واژگان دامنه: برچسب فیلدها، مقادیر select و نام گروه‌ها.
 * قاعده‌ی طلایی: مقدارِ ذخیره‌شده همیشه انگلیسی می‌ماند؛ فقط نمایش ترجمه می‌شود.
 * این کار باعث می‌شود تعویض زبان، داده‌ها و منطق امتیازدهی را خراب نکند.
 */

/** برچسب فیلدها (کلید = label انگلیسی در schema) */
export const FIELD_FA: Record<string, string> = {
  'Name': 'نام',
  'Project Name': 'نام پروژه',
  'Title': 'عنوان',
  'Category': 'دسته',
  'Status': 'وضعیت',
  'Priority': 'اولویت',
  'Deadline': 'مهلت',
  'Progress': 'پیشرفت',
  'Budget': 'بودجه',
  'Revenue': 'درآمد',
  'Cost': 'هزینه',
  'Team': 'تیم',
  'KPIs': 'شاخص‌های کلیدی',
  'Links': 'لینک‌ها',
  'Notes': 'یادداشت',
  'Description': 'توضیح',
  'Potential Revenue (1-5)': 'پتانسیل درآمد (۱ تا ۵)',
  'Difficulty (1-5)': 'سختی (۱ تا ۵)',
  'Time Required (1-5)': 'زمان لازم (۱ تا ۵)',
  'Risk (1-5)': 'ریسک (۱ تا ۵)',
  'Urgency (1-5)': 'فوریت (۱ تا ۵)',
  'Strategic Value (1-5)': 'ارزش استراتژیک (۱ تا ۵)',
  'Potential (1-5)': 'پتانسیل (۱ تا ۵)',
  'Project': 'پروژه',
  'Department': 'دپارتمان',
  'Assignee': 'مسئول',
  'Responsible': 'مسئول',
  'Owner': 'مالک',
  'Checklist': 'چک‌لیست',
  'Estimate (h)': 'برآورد (ساعت)',
  'Idea': 'ایده',
  'Lead': 'سرنخ',
  'Goal': 'هدف',
  'Type': 'نوع',
  'Date': 'تاریخ',
  'Amount': 'مبلغ',
  'Account': 'حساب',
  'Client': 'مشتری',
  'Company': 'شرکت',
  'Phone': 'تلفن',
  'Email': 'ایمیل',
  'Service': 'خدمت',
  'Deal Value': 'ارزش معامله',
  'Pipeline': 'مرحله فروش',
  'Last Contact': 'آخرین تماس',
  'Next Contact': 'تماس بعدی',
  'Next Action': 'اقدام بعدی',
  'Contact': 'راه ارتباطی',
  'Instagram': 'اینستاگرام',
  'Telegram': 'تلگرام',
  'YouTube': 'یوتیوب',
  'Website': 'وب‌سایت',
  'URL': 'نشانی',
  'Link': 'لینک',
  'Handle / URL': 'آیدی یا نشانی',
  'Platform': 'پلتفرم',
  'Channel': 'کانال',
  'Media Name': 'نام رسانه',
  'Followers': 'دنبال‌کننده',
  'Growth /mo': 'رشد ماهانه',
  'Engagement %': 'نرخ تعامل ٪',
  'Posts / week': 'پست در هفته',
  'Views': 'بازدید',
  'Streams': 'استریم',
  'Reactor': 'ری‌اکتور',
  'Video / Item': 'ویدیو یا آیتم',
  'Artist': 'آرتیست',
  'Artist Name': 'نام هنری',
  'Real Name': 'نام واقعی',
  'Genre': 'ژانر',
  'Location': 'موقعیت',
  'Label': 'لیبل',
  'Manager': 'مدیر برنامه',
  'Contract': 'قرارداد',
  'Track / Release': 'ترک یا انتشار',
  'Release Date': 'تاریخ انتشار',
  'Content Type': 'نوع محتوا',
  'Caption': 'کپشن',
  'Hashtags': 'هشتگ‌ها',
  'Asset': 'فایل / اثر',
  'Publish Date': 'تاریخ انتشار',
  'Role': 'نقش',
  'Rate': 'دستمزد',
  'Responsibilities': 'مسئولیت‌ها',
  'Input': 'ورودی',
  'Output': 'خروجی',
  'Tools': 'ابزارها',
  'Schedule': 'زمان‌بندی',
  'Automation': 'اتوماسیون',
  'Linked Automation': 'اتوماسیون مرتبط',
  'Agent Name': 'نام ایجنت',
  'Trigger': 'ماشه (شروع‌کننده)',
  'Action': 'عملیات',
  'Actions': 'اقدامات',
  'Frequency': 'تناوب',
  'Last Run': 'آخرین اجرا',
  'Next Run': 'اجرای بعدی',
  'Webhook URL': 'نشانی وب‌هوک',
  'Target Keyword': 'کلیدواژه هدف',
  'Target Location': 'موقعیت هدف',
  'AI Query': 'پرسش هوش مصنوعی',
  'Current Visibility %': 'دیده‌شدن فعلی ٪',
  'Target Visibility %': 'دیده‌شدن هدف ٪',
}

/** مقادیر select — کلید = مقدار انگلیسیِ ذخیره‌شده */
export const VALUE_FA: Record<string, string> = {
  /* وضعیت کار */
  'Backlog': 'در صف', 'To Do': 'برای انجام', 'Doing': 'در حال انجام', 'Review': 'بازبینی', 'Done': 'انجام شد',
  /* اولویت */
  'Urgent': 'فوری', 'High': 'زیاد', 'Medium': 'متوسط', 'Low': 'کم',
  /* وضعیت پروژه */
  'Planning': 'برنامه‌ریزی', 'Active': 'فعال', 'Paused': 'متوقف', 'Archived': 'بایگانی',
  /* پایپ‌لاین */
  'Lead': 'سرنخ', 'Contacted': 'تماس گرفته', 'Negotiation': 'مذاکره', 'Won': 'برنده', 'Lost': 'ازدست‌رفته',
  /* ایده */
  'Inbox': 'صندوق ورودی', 'Research': 'تحقیق', 'Potential': 'پتانسیل‌دار', 'Testing': 'آزمایش', 'Rejected': 'رد شده',
  /* اجرا */
  'Error': 'خطا', 'Draft': 'پیش‌نویس', 'Idle': 'بی‌کار',
  /* محتوا */
  'Idea': 'ایده', 'Scripting': 'نگارش', 'Production': 'تولید', 'Editing': 'تدوین',
  'Scheduled': 'زمان‌بندی‌شده', 'Published': 'منتشر شده',
  /* دسته پروژه */
  'Rap Media': 'رسانه رپ', 'Label': 'لیبل', 'Reaction': 'ری‌اکشن', 'Social': 'شبکه اجتماعی',
  'Design': 'طراحی', 'SEO/GEO': 'سئو / جی‌ئو', 'Education': 'آموزش',
  'Client Work': 'کار مشتری', 'Internal': 'داخلی', 'Other': 'سایر',
  /* مالی */
  'Income': 'درآمد', 'Expense': 'هزینه', 'Paid': 'پرداخت شده', 'Pending': 'در انتظار', 'Overdue': 'عقب‌افتاده',
  'Salary': 'حقوق', 'Equipment': 'تجهیزات', 'Ads': 'تبلیغات', 'Marketing': 'بازاریابی',
  'Sponsorship': 'اسپانسری', 'Consulting': 'مشاوره', 'Product': 'محصول', 'Service': 'خدمات', 'Tools': 'ابزار',
  /* موسیقی */
  'Single': 'تک‌آهنگ', 'EP': 'ای‌پی', 'Album': 'آلبوم', 'Feature': 'فیچرینگ', 'Remix': 'ریمیکس',
  'Cover': 'کاور', 'Demo': 'دمو', 'Recording': 'ضبط', 'Mixing': 'میکس', 'Mastering': 'مسترینگ', 'Released': 'منتشر شده',
  'Rap': 'رپ', 'Hip-Hop': 'هیپ‌هاپ', 'Trap': 'ترپ', 'Drill': 'دریل', 'Pop': 'پاپ', 'R&B': 'آر اند بی', 'Music': 'موسیقی',
  'Signed': 'قرارداد بسته', 'Prospect': 'در دست بررسی', 'In Touch': 'در ارتباط',
  'Collaborating': 'در حال همکاری', 'Inactive': 'غیرفعال',
  /* محتوا و شبکه‌های اجتماعی */
  'Post': 'پست', 'Reel': 'ریلز', 'Story': 'استوری', 'Short': 'شورت', 'Video': 'ویدیو',
  'Article': 'مقاله', 'Content': 'محتوا', 'Visualizer': 'ویژوالایزر',
  /* تیم */
  'Freelance': 'فریلنس', 'Part-time': 'پاره‌وقت', 'Hourly': 'ساعتی', 'Building': 'در حال ساخت', 'Growing': 'در حال رشد',
  /* تناوب */
  'Manual': 'دستی', 'Daily': 'روزانه', 'Weekly': 'هفتگی', 'Monthly': 'ماهانه', 'On Event': 'رویدادی',
  /* سئو */
  'SEO': 'سئو', 'GEO': 'جی‌ئو', 'Local SEO': 'سئو محلی', 'Local': 'محلی', 'AI Visibility': 'دیده‌شدن در هوش مصنوعی',
  'Business': 'کسب‌وکار', 'Tech': 'فنی', 'Social Media': 'شبکه‌های اجتماعی',
}

export const GROUP_FA: Record<string, string> = {
  core: 'هسته',
  media: 'رسانه و موسیقی',
  business: 'کسب‌وکار',
  ops: 'عملیات',
}

/** برچسب معیارهای مرکز تصمیم */
export const WEIGHT_FA: Record<string, string> = {
  potentialRevenue: 'پتانسیل درآمد',
  currentRevenue: 'درآمد فعلی',
  difficulty: 'سختی',
  timeRequired: 'زمان لازم',
  cost: 'هزینه',
  risk: 'ریسک',
  urgency: 'فوریت',
  strategic: 'ارزش استراتژیک',
}

export const WEIGHT_EN: Record<string, string> = {
  potentialRevenue: 'Potential Revenue',
  currentRevenue: 'Current Revenue',
  difficulty: 'Difficulty',
  timeRequired: 'Time Required',
  cost: 'Cost',
  risk: 'Risk',
  urgency: 'Urgency',
  strategic: 'Strategic Value',
}

export const BAND_FA: Record<string, string> = { HIGH: 'اولویت بالا', MEDIUM: 'اولویت متوسط', LOW: 'اولویت پایین' }
export const BAND_EN: Record<string, string> = { HIGH: 'HIGH priority', MEDIUM: 'MEDIUM priority', LOW: 'LOW priority' }
