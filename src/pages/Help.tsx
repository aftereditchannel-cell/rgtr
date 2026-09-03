import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, SectionTitle, Button, Icon, Modal } from '../components/ui/Primitives'
import { useT } from '../i18n'
import { useApp } from '../store/useApp'
import { isMobile } from '../lib/mobile'

interface Topic {
  icon: string
  to: string
  fa: string
  en: string
  dFa: string
  dEn: string
}

const TOPICS: Topic[] = [
  { icon: 'LayoutDashboard', to: '/', fa: 'داشبورد', en: 'Dashboard', dFa: 'تمرکز امروز، سیگنال‌ها و آمار کلیدی. نقطه‌ی شروع هر روز.', dEn: 'Today’s focus, signals and key numbers. Your daily starting point.' },
  { icon: 'Target', to: '/decision', fa: 'مرکز تصمیم', en: 'Decision Center', dFa: 'امتیازدهی پروژه‌ها بر اساس درآمد، فوریت و ارزش، تا بفهمی الان روی چه کاری تمرکز کنی.', dEn: 'Scores projects by revenue, urgency and value to tell you what to work on now.' },
  { icon: 'BarChart3', to: '/analytics', fa: 'تحلیل و آمار', en: 'Analytics', dFa: 'نمودار مالی، پایپ‌لاین، رسانه‌ها و محتوا — همه از داده‌ی خودت، بدون ارسال به بیرون.', dEn: 'Finance, pipeline, media and content charts — all local, nothing leaves your device.' },
  { icon: 'CheckSquare', to: '/m/tasks', fa: 'کارها (کانبان)', en: 'Tasks (Kanban)', dFa: 'کارها را بکش و رها کن بین ستون‌ها. قلب عملیات روزانه.', dEn: 'Drag tasks between columns. The heart of daily ops.' },
  { icon: 'FolderKanban', to: '/m/projects', fa: 'پروژه‌ها', en: 'Projects', dFa: 'همه‌ی پروژه‌ها با بودجه، پیشرفت، درآمد و ورودی‌های تصمیم‌گیری.', dEn: 'All projects with budget, progress, revenue and decision inputs.' },
  { icon: 'Mic2', to: '/m/artists', fa: 'آرتیست‌ها', en: 'Artists', dFa: 'دیتابیس آرتیست‌ها با اینستاگرام، ژانر، وضعیت و پیگیری.', dEn: 'Artist database with Instagram, genre, status and follow-ups.' },
  { icon: 'Radio', to: '/m/media', fa: 'رسانه‌ها', en: 'Media', dFa: 'پیج‌ها و کانال‌ها با فالوور و رشد — قابل تازه‌سازی خودکار.', dEn: 'Pages and channels with followers and growth — auto-refreshable.' },
  { icon: 'Share2', to: '/m/social', fa: 'شبکه‌های اجتماعی', en: 'Social Accounts', dFa: 'اکانت‌ها و عملکردشان؛ می‌توانی پروفایل را خودکار پر کنی.', dEn: 'Accounts and performance; auto-fill profiles from a link.' },
  { icon: 'Users', to: '/m/clients', fa: 'مشتری‌ها (CRM)', en: 'Clients (CRM)', dFa: 'پایپ‌لاین فروش و مشتری‌ها.', dEn: 'Sales pipeline and clients.' },
  { icon: 'Wallet', to: '/m/finance', fa: 'مالی', en: 'Finance', dFa: 'درآمد و هزینه به تفکیک پروژه و مشتری.', dEn: 'Income and expenses per project and client.' },
  { icon: 'Bot', to: '/m/agents', fa: 'ایجنت‌های هوش مصنوعی', en: 'AI Agents', dFa: 'نیروهای مجازی. با وارد کردن کلید OpenAI واقعاً اجرا می‌شوند (چت هر ایجنت).', dEn: 'Virtual staff. Add an OpenAI key to actually run them (chat per agent).' },
  { icon: 'Workflow', to: '/m/automations', fa: 'اتوماسیون', en: 'Automations', dFa: 'اتوماسیون‌ها و اتصال به n8n/Make.', dEn: 'Automations and n8n/Make connections.' },
  { icon: 'Settings', to: '/settings', fa: 'تنظیمات', en: 'Settings', dFa: 'زبان، پوسته (تیره/روشن/شیشه‌ای)، همگام‌سازی ابری، قفل و امنیت، هوش مصنوعی و دپارتمان‌ها.', dEn: 'Language, theme (dark/light/glass), cloud sync, lock & security, AI and departments.' },
  { icon: 'Cloud', to: '/settings#cloud', fa: 'همگام‌سازی ابری', en: 'Cloud sync', dFa: 'داده را در حساب Google و Firebase نگه می‌دارد و بین ویندوز و گوشی همگام می‌کند. با ذخیرهٔ خودکار، هر تغییر چند ثانیه بعد ارسال می‌شود.', dEn: 'Keeps data in your Google/Firebase account and syncs Windows ↔ phone. Auto-save sends changes after a short delay.' },
  { icon: 'Shield', to: '/settings#security', fa: 'قفل و امنیت', en: 'Lock & security', dFa: 'رمز عبور + اثر انگشت/چهره روی گوشی، با قفل خودکار.', dEn: 'Passcode + fingerprint/face on mobile, with auto-lock.' },
]

interface GitMap {
  fa: string
  en: string
  files: string[]
}

const GITMAP: GitMap[] = [
  { fa: 'صفحه‌ها (داشبورد، تصمیم، تحلیل، تنظیمات، راهنما)', en: 'Pages (Dashboard, Decision, Analytics, Settings, Help)', files: ['src/pages/*.tsx'] },
  { fa: 'دپارتمان‌ها و ماژول‌های پیش‌فرض + فیلدهایشان', en: 'Default departments/modules and their fields', files: ['src/domain/schema.ts'] },
  { fa: 'رنگ‌ها، پوسته و افکت شیشه‌ای', en: 'Colors, theme and glass effect', files: ['src/index.css'] },
  { fa: 'متن‌ها و ترجمه‌ها', en: 'Text and translations', files: ['src/i18n/dict.ts', 'src/i18n/domain.ts'] },
  { fa: 'همگام‌سازی ابری (Google / Firebase)', en: 'Cloud sync (Google / Firebase)', files: ['src/lib/firebase.ts', 'src/lib/cloud.ts', 'src/store/useApp.ts'] },
  { fa: 'قفل و اثر انگشت', en: 'Lock & fingerprint', files: ['src/lib/lock.ts', 'src/components/layout/LockScreen.tsx'] },
  { fa: 'هوش مصنوعی / ایجنت‌ها', en: 'AI / agents', files: ['src/lib/ai.ts'] },
  { fa: 'تشخیص خودکار فالوور/بیو', en: 'Social auto-fetch', files: ['src/lib/social.ts'] },
  { fa: 'ذخیره‌سازی در ویندوز', en: 'Windows storage', files: ['electron/main.cjs', 'electron/preload.cjs'] },
  { fa: 'ذخیره‌سازی در اندروید', en: 'Android storage', files: ['src/lib/mobile.ts'] },
  { fa: 'لوگوی برنامه', en: 'App logo', files: ['electron/icons/', 'android/app/src/main/res/', 'scripts/make-icons.py'] },
]

const TOUR_STEPS: { fa: string; en: string }[] = [
  { fa: 'خوش آمدید! این تور همه‌ی بخش‌های برنامه را معرفی می‌کند. دکمه «بعدی» را بزنید.', en: 'Welcome! This tour introduces every part of the app. Press “Next”.' },
  { fa: 'داشبورد: هر روز فقط ۳ کارِ مهم را نشان می‌دهد. بقیه پشتیبان این جمله‌اند.', en: 'Dashboard: shows only your 3 most important tasks each day.' },
  { fa: 'مرکز تصمیم: به پروژه‌ها امتیاز می‌دهد تا بدانید روی چه چیزی کار کنید.', en: 'Decision Center: scores projects so you know what to work on.' },
  { fa: 'ماژول‌ها (کارها، پروژه‌ها، رسانه‌ها، مالی…): هر دپارتمان جدول/کانبان/تقویم خودش را دارد.', en: 'Modules (tasks, projects, media, finance…): each department has its own table/kanban/calendar.' },
  { fa: 'تنظیمات ← زبان و نمایش: زبان، تقویم، ارقام و پوسته (تیره/روشن/شیشه‌ای).', en: 'Settings → Language & display: language, calendar, digits and theme (dark/light/glass).' },
  { fa: 'تنظیمات ← همگام‌سازی ابری: داده را بین ویندوز و گوشی همگام می‌کند. auto-sync یعنی هر تغییر خودکار ذخیره شود.', en: 'Settings → Cloud sync: syncs data between Windows and phone. Auto-sync saves every change.' },
  { fa: 'تنظیمات ← قفل و امنیت: رمز عبور و اثر انگشت/چهره.', en: 'Settings → Lock & security: passcode and fingerprint/face.' },
  { fa: 'تنظیمات ← هوش مصنوعی: با کلید OpenAI ایجنت‌ها را واقعاً اجرا کنید.', en: 'Settings → AI: run your agents for real with an OpenAI key.' },
  { fa: 'تمام شد! بخش «چه چیزی را در گیت‌هاب ویرایش کنم» همین‌جا نقشه‌ی فایل‌ها را دارد.', en: 'Done! The “What to edit on GitHub” section below maps every feature to its files.' },
]

export function Help() {
  const { t, lang } = useT()
  const nav = useNavigate()
  const [tour, setTour] = useState(false)
  const [step, setStep] = useState(0)
  const org = useApp(s => s.data.settings.orgName)

  const L = (fa: string, en: string) => (lang === 'fa' ? fa : en)

  const startTour = () => { setStep(0); setTour(true) }

  return (
    <div className="anim space-y-5 max-w-4xl">
      <div>
        <h1 className="text-[21px] font-semibold tracking-tight">{t('help.title')}</h1>
        <p className="text-[12px] text-[var(--color-dim2)] mt-1">{t('help.subtitle')}</p>
      </div>

      <Card>
        <SectionTitle icon="GraduationCap">{t('help.tour')}</SectionTitle>
        <p className="text-[12px] text-[var(--color-dim)] leading-relaxed mb-3">{t('help.tourHint')}</p>
        <Button variant="primary" size="md" icon="Play" onClick={startTour}>{t('help.startTour')}</Button>
      </Card>

      <Card>
        <SectionTitle icon="Compass">{t('help.sections')}</SectionTitle>
        <div className="grid sm:grid-cols-2 gap-2">
          {TOPICS.map(tp => (
            <button key={tp.to + tp.fa} onClick={() => nav(tp.to)}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg border border-[var(--color-line)] hover:border-[var(--color-line2)] hover:bg-white/[.02] transition-colors text-start">
              <Icon name={tp.icon} size={15} className="text-[var(--color-acc)] mt-0.5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-[12.5px] font-medium">{L(tp.fa, tp.en)}</span>
                <span className="block text-[10.5px] text-[var(--color-dim2)] leading-relaxed mt-0.5">{L(tp.dFa, tp.dEn)}</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle icon="GitBranch">{t('help.gitMap')}</SectionTitle>
        <p className="text-[12px] text-[var(--color-dim)] leading-relaxed mb-3">{t('help.gitMapHint')}</p>
        <div className="space-y-1.5">
          {GITMAP.map(g => (
            <div key={g.fa} className="px-3 py-2 rounded-lg border border-[var(--color-line)]">
              <div className="text-[12.5px]">{L(g.fa, g.en)}</div>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {g.files.map(f => (
                  <code key={f} className="ltr text-[10.5px] px-1.5 py-0.5 rounded bg-black/20 border border-[var(--color-line)] text-[var(--color-dim)]">{f}</code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {org && (
        <p className="text-center text-[11px] text-[var(--color-dim2)]">{org} — NEXUS HQ {!isMobile ? '' : '· Android'}</p>
      )}

      {tour && (
        <Modal open onClose={() => setTour(false)} title={`${t('help.tour')} — ${step + 1}/${TOUR_STEPS.length}`}
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setTour(false)}>{t('common.cancel')}</Button>
              {step > 0 && <Button variant="outline" size="sm" icon="ArrowLeft" onClick={() => setStep(s => s - 1)}>{t('help.prev')}</Button>}
              {step < TOUR_STEPS.length - 1
                ? <Button variant="primary" size="sm" icon="ArrowRight" onClick={() => setStep(s => s + 1)}>{t('help.next')}</Button>
                : <Button variant="primary" size="sm" icon="Check" onClick={() => setTour(false)}>{t('common.save')}</Button>}
            </>
          }>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg grid place-items-center bg-[var(--color-acc)]/12 border border-[var(--color-acc)]/25 shrink-0">
              <Icon name="Lightbulb" size={16} style={{ color: 'var(--color-acc)' }} />
            </div>
            <p className="text-[13.5px] leading-relaxed">{L(TOUR_STEPS[step].fa, TOUR_STEPS[step].en)}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
