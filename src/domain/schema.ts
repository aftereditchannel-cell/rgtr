/**
 * Schema-driven module engine.
 * هر ماژول فقط یک تعریف داده است؛ جدول/فرم/کانبان/تقویم/فیلتر خودکار ساخته می‌شود.
 * افزودن دپارتمان جدید = افزودن یک ModuleDef (از UI هم ممکن است).
 */

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'money' | 'date'
  | 'select' | 'multiselect' | 'ref' | 'url' | 'progress' | 'checklist' | 'tags'

export interface FieldDef {
  key: string
  label: string
  /** برچسب فارسی سفارشی؛ اگر نباشد از دیکشنری i18n خوانده می‌شود */
  labelFa?: string
  type: FieldType
  options?: string[]
  refModule?: string
  /** نمایش در جدول به‌صورت پیش‌فرض */
  col?: boolean
  placeholder?: string
  /** راهنمای فارسی زیر فیلد */
  help?: string
  /** راهنمای انگلیسی — اگر نبود از help استفاده می‌شود */
  helpEn?: string
}

export type ViewKind = 'table' | 'kanban' | 'cards' | 'calendar'

export interface ModuleDef {
  key: string
  label: string
  labelFa?: string
  icon: string
  group: 'core' | 'business' | 'media' | 'ops'
  desc?: string
  fields: FieldDef[]
  views: ViewKind[]
  defaultView: ViewKind
  groupBy?: string          // ستون کانبان
  dateField?: string        // فیلد تقویم
  titleField: string
  custom?: boolean          // ساخته‌شده توسط کاربر
}

/* ---------- گزینه‌های مشترک ---------- */
export const STATUS_TASK = ['Backlog', 'To Do', 'Doing', 'Review', 'Done']
export const PRIORITY = ['Urgent', 'High', 'Medium', 'Low']
export const PROJ_STATUS = ['Planning', 'Active', 'Paused', 'Done', 'Archived']
export const PIPELINE = ['Lead', 'Contacted', 'Negotiation', 'Won', 'Lost']
export const IDEA_STATUS = ['Inbox', 'Research', 'Potential', 'Testing', 'Active', 'Rejected', 'Archived']
export const RUN_STATUS = ['Active', 'Paused', 'Error', 'Draft']
export const PLATFORMS = ['Instagram', 'Telegram', 'YouTube', 'TikTok', 'X', 'Spotify', 'Website']
export const CONTENT_STATUS = ['Idea', 'Scripting', 'Production', 'Editing', 'Scheduled', 'Published']

const f = (key: string, label: string, type: FieldType, extra: Partial<FieldDef> = {}): FieldDef =>
  ({ key, label, type, ...extra })

/* ---------- ماژول‌های پیش‌فرض ---------- */
export const CORE_MODULES: ModuleDef[] = [
  {
    key: 'projects', label: 'Projects', labelFa: 'پروژه‌ها', icon: 'FolderKanban', group: 'core',
    desc: 'همه‌ی پروژه‌ها با امتیاز اولویت، بودجه و پیشرفت',
    titleField: 'name', defaultView: 'cards', views: ['cards', 'table', 'kanban'], groupBy: 'status', dateField: 'deadline',
    fields: [
      f('name', 'Project Name', 'text', { col: true }),
      f('category', 'Category', 'select', { col: true, options: ['Rap Media', 'Label', 'Reaction', 'Social', 'Design', 'SEO/GEO', 'Education', 'Client Work', 'Internal', 'Other'] }),
      f('status', 'Status', 'select', { col: true, options: PROJ_STATUS }),
      f('priority', 'Priority', 'select', { col: true, options: PRIORITY }),
      f('deadline', 'Deadline', 'date', { col: true }),
      f('progress', 'Progress', 'progress', { col: true }),
      f('budget', 'Budget', 'money'),
      f('revenue', 'Revenue', 'money', { col: true }),
      f('cost', 'Cost', 'money'),
      f('team', 'Team', 'tags', { help: 'نام‌ها را با کاما جدا کنید', helpEn: 'Separate names with commas' }),
      f('kpi', 'KPIs', 'textarea'),
      f('links', 'Links', 'textarea', { help: 'هر لینک در یک خط', helpEn: 'One link per line' }),
      f('notes', 'Notes', 'textarea'),
      // ورودی‌های Decision Center (۱=کم، ۵=زیاد)
      f('potentialRevenue', 'Potential Revenue (1-5)', 'number', { help: 'پتانسیل درآمد', helpEn: 'Revenue potential' }),
      f('difficulty', 'Difficulty (1-5)', 'number'),
      f('timeRequired', 'Time Required (1-5)', 'number'),
      f('risk', 'Risk (1-5)', 'number'),
      f('urgency', 'Urgency (1-5)', 'number'),
      f('strategic', 'Strategic Value (1-5)', 'number'),
    ],
  },
  {
    key: 'tasks', label: 'Tasks', labelFa: 'کارها', icon: 'CheckSquare', group: 'core',
    desc: 'کانبان مرکزی کارها',
    titleField: 'title', defaultView: 'kanban', views: ['kanban', 'table', 'calendar'], groupBy: 'status', dateField: 'deadline',
    fields: [
      f('title', 'Title', 'text', { col: true }),
      f('status', 'Status', 'select', { col: true, options: STATUS_TASK }),
      f('priority', 'Priority', 'select', { col: true, options: PRIORITY }),
      f('deadline', 'Deadline', 'date', { col: true }),
      f('project', 'Project', 'ref', { col: true, refModule: 'projects' }),
      f('department', 'Department', 'ref', { refModule: 'departments' }),
      f('person', 'Assignee', 'ref', { col: true, refModule: 'team' }),
      f('estimate', 'Estimate (h)', 'number'),
      f('checklist', 'Checklist', 'checklist'),
      f('description', 'Description', 'textarea'),
    ],
  },
  {
    key: 'ideas', label: 'Idea Vault', labelFa: 'ایده‌ها', icon: 'Lightbulb', group: 'core',
    desc: 'ثبت سریع ایده‌ها تا ذهن آزاد بماند',
    titleField: 'idea', defaultView: 'kanban', views: ['kanban', 'table', 'cards'], groupBy: 'status',
    fields: [
      f('idea', 'Idea', 'text', { col: true }),
      f('category', 'Category', 'select', { col: true, options: ['Business', 'Content', 'Product', 'Marketing', 'Music', 'Tech', 'Other'] }),
      f('status', 'Status', 'select', { col: true, options: IDEA_STATUS }),
      f('potential', 'Potential (1-5)', 'number', { col: true }),
      f('cost', 'Cost', 'money'),
      f('difficulty', 'Difficulty (1-5)', 'number', { col: true }),
      f('priority', 'Priority', 'select', { options: PRIORITY }),
      f('notes', 'Notes', 'textarea'),
    ],
  },
  {
    key: 'departments', label: 'Departments', labelFa: 'دپارتمان‌ها', icon: 'Building2', group: 'core',
    desc: 'واحدهای سازمانی شما',
    titleField: 'name', defaultView: 'cards', views: ['cards', 'table'],
    fields: [
      f('name', 'Department', 'text', { col: true }),
      f('lead', 'Lead', 'ref', { col: true, refModule: 'team' }),
      f('status', 'Status', 'select', { col: true, options: ['Active', 'Building', 'Paused'] }),
      f('goal', 'Goal', 'textarea'),
      f('notes', 'Notes', 'textarea'),
    ],
  },

  /* ---------- MEDIA ---------- */
  {
    key: 'media', label: 'Rap Media', labelFa: 'رسانه‌ها', icon: 'Radio', group: 'media',
    desc: 'پیج‌ها، کانال‌ها و رسانه‌های تحت مدیریت',
    titleField: 'name', defaultView: 'table', views: ['table', 'cards'],
    fields: [
      f('name', 'Media Name', 'text', { col: true }),
      f('platform', 'Platform', 'select', { col: true, options: PLATFORMS }),
      f('handle', 'Handle / URL', 'url', { col: true }),
      f('followers', 'Followers', 'number', { col: true }),
      f('growth', 'Growth /mo', 'number', { col: true }),
      f('status', 'Status', 'select', { col: true, options: ['Active', 'Growing', 'Idle', 'Archived'] }),
      f('project', 'Project', 'ref', { refModule: 'projects' }),
      f('manager', 'Manager', 'ref', { refModule: 'team' }),
      f('notes', 'Notes', 'textarea'),
    ],
  },
  {
    key: 'artists', label: 'Artists', labelFa: 'آرتیست‌ها', icon: 'Mic2', group: 'media',
    desc: 'دیتابیس آرتیست‌ها با جستجو و فیلتر',
    titleField: 'artistName', defaultView: 'table', views: ['table', 'cards'],
    fields: [
      f('artistName', 'Artist Name', 'text', { col: true }),
      f('name', 'Real Name', 'text'),
      f('instagram', 'Instagram', 'url', { col: true }),
      f('telegram', 'Telegram', 'url'),
      f('youtube', 'YouTube', 'url'),
      f('genre', 'Genre', 'select', { col: true, options: ['Rap', 'Trap', 'Drill', 'Hip-Hop', 'R&B', 'Pop', 'Other'] }),
      f('location', 'Location', 'text', { col: true }),
      f('status', 'Status', 'select', { col: true, options: ['Prospect', 'In Touch', 'Collaborating', 'Signed', 'Inactive'] }),
      f('label', 'Label', 'text'),
      f('manager', 'Manager', 'ref', { refModule: 'team' }),
      f('contact', 'Contact', 'text'),
      f('lastContact', 'Last Contact', 'date', { col: true }),
      f('nextAction', 'Next Action', 'text', { col: true }),
      f('notes', 'Notes', 'textarea'),
    ],
  },
  {
    key: 'releases', label: 'Label / Releases', labelFa: 'لیبل و ریلیزها', icon: 'Disc3', group: 'media',
    desc: 'ترک‌ها و انتشارهای لیبل',
    titleField: 'title', defaultView: 'table', views: ['table', 'kanban', 'calendar'], groupBy: 'status', dateField: 'releaseDate',
    fields: [
      f('title', 'Track / Release', 'text', { col: true }),
      f('artist', 'Artist', 'ref', { col: true, refModule: 'artists' }),
      f('type', 'Type', 'select', { col: true, options: ['Single', 'EP', 'Album', 'Feature', 'Remix'] }),
      f('status', 'Status', 'select', { col: true, options: ['Demo', 'Recording', 'Mixing', 'Mastering', 'Scheduled', 'Released'] }),
      f('releaseDate', 'Release Date', 'date', { col: true }),
      f('revenue', 'Revenue', 'money', { col: true }),
      f('cost', 'Cost', 'money'),
      f('streams', 'Streams', 'number'),
      f('contract', 'Contract', 'text'),
      f('links', 'Links', 'textarea'),
      f('notes', 'Notes', 'textarea'),
    ],
  },
  {
    key: 'reaction', label: 'Reaction', labelFa: 'ری‌اکشن', icon: 'Clapperboard', group: 'media',
    desc: 'کانال‌ها، ری‌اکترها و ویدیوها',
    titleField: 'title', defaultView: 'kanban', views: ['kanban', 'table', 'calendar'], groupBy: 'status', dateField: 'publishDate',
    fields: [
      f('title', 'Video / Item', 'text', { col: true }),
      f('channel', 'Channel', 'text', { col: true }),
      f('reactor', 'Reactor', 'text', { col: true }),
      f('status', 'Status', 'select', { col: true, options: ['Idea', 'Scripting', 'Recording', 'Editing', 'Scheduled', 'Published'] }),
      f('publishDate', 'Publish Date', 'date', { col: true }),
      f('views', 'Views', 'number', { col: true }),
      f('link', 'Link', 'url'),
      f('notes', 'Notes', 'textarea'),
    ],
  },
  {
    key: 'social', label: 'Social Accounts', labelFa: 'شبکه‌های اجتماعی', icon: 'Share2', group: 'media',
    desc: 'اکانت‌های شبکه اجتماعی و عملکردشان',
    titleField: 'account', defaultView: 'table', views: ['table', 'cards'],
    fields: [
      f('account', 'Account', 'text', { col: true }),
      f('platform', 'Platform', 'select', { col: true, options: PLATFORMS }),
      f('url', 'URL', 'url'),
      f('followers', 'Followers', 'number', { col: true }),
      f('engagement', 'Engagement %', 'number', { col: true }),
      f('postsPerWeek', 'Posts / week', 'number', { col: true }),
      f('owner', 'Owner', 'ref', { col: true, refModule: 'team' }),
      f('project', 'Project', 'ref', { refModule: 'projects' }),
      f('status', 'Status', 'select', { options: ['Active', 'Growing', 'Idle'] }),
      f('notes', 'Notes', 'textarea'),
    ],
  },
  {
    key: 'content', label: 'Content Calendar', labelFa: 'تقویم محتوا', icon: 'CalendarRange', group: 'media',
    desc: 'تقویم محتوایی مرکزی همه‌ی پلتفرم‌ها',
    titleField: 'title', defaultView: 'calendar', views: ['calendar', 'kanban', 'table'], groupBy: 'status', dateField: 'publishDate',
    fields: [
      f('title', 'Title', 'text', { col: true }),
      f('platform', 'Platform', 'select', { col: true, options: PLATFORMS }),
      f('type', 'Content Type', 'select', { col: true, options: ['Post', 'Reel', 'Story', 'Video', 'Short', 'Article', 'Cover', 'Visualizer'] }),
      f('status', 'Status', 'select', { col: true, options: CONTENT_STATUS }),
      f('publishDate', 'Publish Date', 'date', { col: true }),
      f('person', 'Responsible', 'ref', { col: true, refModule: 'team' }),
      f('project', 'Project', 'ref', { refModule: 'projects' }),
      f('caption', 'Caption', 'textarea'),
      f('hashtags', 'Hashtags', 'tags'),
      f('asset', 'Asset', 'text'),
      f('link', 'Link', 'url'),
    ],
  },

  /* ---------- BUSINESS ---------- */
  {
    key: 'clients', label: 'CRM / Clients', labelFa: 'مشتری‌ها', icon: 'Users', group: 'business',
    desc: 'پایپ‌لاین فروش و مشتری‌ها',
    titleField: 'name', defaultView: 'kanban', views: ['kanban', 'table', 'cards'], groupBy: 'status', dateField: 'nextContact',
    fields: [
      f('name', 'Name', 'text', { col: true }),
      f('company', 'Company', 'text', { col: true }),
      f('status', 'Pipeline', 'select', { col: true, options: PIPELINE }),
      f('service', 'Service', 'select', { col: true, options: ['SEO', 'GEO', 'Local SEO', 'Social Media', 'Design', 'Content', 'Consulting', 'Music', 'Other'] }),
      f('value', 'Deal Value', 'money', { col: true }),
      f('phone', 'Phone', 'text'),
      f('email', 'Email', 'text'),
      f('instagram', 'Instagram', 'url'),
      f('lastContact', 'Last Contact', 'date', { col: true }),
      f('nextContact', 'Next Contact', 'date', { col: true }),
      f('notes', 'Notes', 'textarea'),
    ],
  },
  {
    key: 'finance', label: 'Finance', labelFa: 'مالی', icon: 'Wallet', group: 'business',
    desc: 'درآمد و هزینه به تفکیک پروژه',
    titleField: 'title', defaultView: 'table', views: ['table', 'calendar'], dateField: 'date',
    fields: [
      f('title', 'Description', 'text', { col: true }),
      f('kind', 'Type', 'select', { col: true, options: ['Income', 'Expense'] }),
      f('amount', 'Amount', 'money', { col: true }),
      f('date', 'Date', 'date', { col: true }),
      f('project', 'Project', 'ref', { col: true, refModule: 'projects' }),
      f('client', 'Client', 'ref', { refModule: 'clients' }),
      f('category', 'Category', 'select', { col: true, options: ['Service', 'Sponsorship', 'Music', 'Ads', 'Tools', 'Salary', 'Equipment', 'Other'] }),
      f('status', 'Status', 'select', { col: true, options: ['Paid', 'Pending', 'Overdue'] }),
      f('notes', 'Notes', 'textarea'),
    ],
  },
  {
    key: 'seo', label: 'SEO / GEO', labelFa: 'سئو و جی‌ئو', icon: 'Search', group: 'business',
    desc: 'سئو، سئوی محلی و دیده‌شدن در پاسخ‌های AI',
    titleField: 'website', defaultView: 'table', views: ['table', 'kanban'], groupBy: 'kind',
    fields: [
      f('website', 'Website', 'text', { col: true }),
      f('kind', 'Type', 'select', { col: true, options: ['SEO', 'GEO', 'Local SEO', 'AI Visibility'] }),
      f('keyword', 'Target Keyword', 'text', { col: true }),
      f('location', 'Target Location', 'text', { col: true }),
      f('aiQuery', 'AI Query', 'textarea', { help: 'پرسشی که می‌خواهید در ChatGPT/Gemini شما را نشان دهد', helpEn: 'The prompt where you want ChatGPT/Gemini to surface you' }),
      f('current', 'Current Visibility %', 'progress', { col: true }),
      f('target', 'Target Visibility %', 'number', { col: true }),
      f('client', 'Client', 'ref', { refModule: 'clients' }),
      f('project', 'Project', 'ref', { refModule: 'projects' }),
      f('actions', 'Actions', 'textarea'),
      f('notes', 'Notes', 'textarea'),
    ],
  },
  {
    key: 'team', label: 'Team', labelFa: 'تیم', icon: 'UserCog', group: 'business',
    desc: 'همکاران و نیروها',
    titleField: 'name', defaultView: 'cards', views: ['cards', 'table'],
    fields: [
      f('name', 'Name', 'text', { col: true }),
      f('role', 'Role', 'text', { col: true }),
      f('department', 'Department', 'ref', { col: true, refModule: 'departments' }),
      f('status', 'Status', 'select', { col: true, options: ['Active', 'Part-time', 'Freelance', 'Inactive'] }),
      f('contact', 'Contact', 'text', { col: true }),
      f('rate', 'Rate', 'money'),
      f('notes', 'Notes', 'textarea'),
    ],
  },

  /* ---------- OPS ---------- */
  {
    key: 'agents', label: 'AI Agents', labelFa: 'ایجنت‌های هوش مصنوعی', icon: 'Bot', group: 'ops',
    desc: 'رجیستری نیروهای مجازی — آماده‌ی اتصال به API در آینده',
    titleField: 'name', defaultView: 'cards', views: ['cards', 'table'],
    fields: [
      f('name', 'Agent Name', 'text', { col: true }),
      f('role', 'Role', 'text', { col: true }),
      f('status', 'Status', 'select', { col: true, options: RUN_STATUS }),
      f('description', 'Description', 'textarea'),
      f('responsibilities', 'Responsibilities', 'textarea', { help: 'هر وظیفه در یک خط', helpEn: 'One responsibility per line' }),
      f('input', 'Input', 'textarea'),
      f('output', 'Output', 'textarea'),
      f('tools', 'Tools', 'tags'),
      f('schedule', 'Schedule', 'select', { col: true, options: ['Manual', 'Hourly', 'Daily', 'Weekly', 'Monthly'] }),
      f('automation', 'Linked Automation', 'ref', { refModule: 'automations' }),
      f('lastRun', 'Last Run', 'date', { col: true }),
      f('notes', 'Notes', 'textarea'),
    ],
  },
  {
    key: 'automations', label: 'Automation Center', labelFa: 'اتوماسیون', icon: 'Workflow', group: 'ops',
    desc: 'اتوماسیون‌ها — قابل اتصال به n8n/Make در آینده',
    titleField: 'name', defaultView: 'table', views: ['table', 'cards'],
    fields: [
      f('name', 'Automation', 'text', { col: true }),
      f('trigger', 'Trigger', 'text', { col: true }),
      f('action', 'Action', 'text', { col: true }),
      f('frequency', 'Frequency', 'select', { col: true, options: ['Manual', 'Hourly', 'Daily', 'Weekly', 'Monthly', 'On Event'] }),
      f('status', 'Status', 'select', { col: true, options: RUN_STATUS }),
      f('platform', 'Platform', 'select', { col: true, options: ['Local', 'n8n', 'Make', 'Zapier', 'Dify', 'CrewAI', 'Other'] }),
      f('webhook', 'Webhook URL', 'url', { help: 'برای اتصال آینده — در v1 استفاده نمی‌شود', helpEn: 'Reserved for future integrations — unused in v1' }),
      f('lastRun', 'Last Run', 'date', { col: true }),
      f('nextRun', 'Next Run', 'date', { col: true }),
      f('notes', 'Notes', 'textarea'),
    ],
  },
]

/* ---------- helpers ---------- */
export const GROUP_LABEL: Record<ModuleDef['group'], string> = {
  core: 'Core',
  media: 'Media & Music',
  business: 'Business',
  ops: 'Operations',
}

export function emptyRecord(m: ModuleDef): Record<string, unknown> {
  const r: Record<string, unknown> = {}
  for (const fd of m.fields) {
    r[fd.key] = fd.type === 'number' || fd.type === 'money' || fd.type === 'progress' ? 0
      : fd.type === 'checklist' || fd.type === 'tags' || fd.type === 'multiselect' ? []
      : fd.type === 'select' ? (fd.options?.[0] ?? '')
      : ''
  }
  return r
}

/** ماژول‌هایی که کاربر می‌سازد؛ قالب پایه */
export function makeCustomModule(label: string, icon = 'Box'): ModuleDef {
  const key = 'm_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  return {
    key, label, icon, group: 'core', custom: true,
    titleField: 'title', defaultView: 'table', views: ['table', 'kanban', 'cards', 'calendar'],
    groupBy: 'status', dateField: 'date',
    fields: [
      f('title', 'Title', 'text', { col: true }),
      f('status', 'Status', 'select', { col: true, options: ['To Do', 'Doing', 'Done'] }),
      f('date', 'Date', 'date', { col: true }),
      f('notes', 'Notes', 'textarea'),
    ],
  }
}
