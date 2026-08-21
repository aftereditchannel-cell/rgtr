/**
 * ماژول هوش مصنوعی و اتوماسیون.
 *
 * کلید API یک‌بار وارد می‌شود و برای همیشه (در دیتابیس محلی رمزگذاری‌نشده‌ی دستگاه)
 * می‌ماند. همه‌ی ارائه‌دهنده‌ها از پروتکل «OpenAI-compatible Chat Completions»
 * پشتیبانی می‌کنند، پس با یک تابع با همه‌جا حرف می‌زنیم.
 *
 * سرویس‌های رایگان پیشنهادی (به‌عنوان preset):
 *  - Groq       → https://console.groq.com/keys        (رایگان و بسیار سریع)
 *  - OpenRouter → https://openrouter.ai/keys           (مدل‌های رایگان متنوع)
 *  - Gemini     → https://aistudio.google.com/apikey   (پنل رایگان Google)
 *  - Together   → https://api.together.xyz/keys
 */

export interface AIProvider {
  id: string
  label: string
  baseUrl: string
  /** مدل پیش‌فرض */
  model: string
  key: string
  enabled: boolean
  /** راهنمای دریافت کلید */
  signupUrl?: string
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AutomationTask {
  id: string
  name: string
  /** prompt قالبی — {input} با ورودی جایگزین می‌شود */
  prompt: string
  providerId: string
  model?: string
  createdAt: string
  /** نمونه‌های اخیر خروجی */
  history: { at: string; input: string; output: string; model: string }[]
}

export const DEFAULT_PROVIDERS: AIProvider[] = [
  {
    id: 'groq',
    label: 'Groq (رایگان، سریع)',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    key: '',
    enabled: true,
    signupUrl: 'https://console.groq.com/keys',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter (مدل‌های رایگان)',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    key: '',
    enabled: true,
    signupUrl: 'https://openrouter.ai/keys',
  },
  {
    id: 'gemini',
    label: 'Google Gemini (رایگان)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.0-flash',
    key: '',
    enabled: true,
    signupUrl: 'https://aistudio.google.com/apikey',
  },
  {
    id: 'together',
    label: 'Together AI (رایگان)',
    baseUrl: 'https://api.together.xyz/v1',
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free',
    key: '',
    enabled: false,
    signupUrl: 'https://api.together.xyz/settings/api-keys',
  },
]

export const DEFAULT_AUTOMATIONS: AutomationTask[] = [
  {
    id: 'reply-fa',
    name: 'پاسخ کامنت فارسی',
    prompt:
      'به‌عنوان مدیر یک کسب‌وکار، یک پاسخ کوتاه، مؤدبانه و دوستانده به کامنت زیر بده. لحن طبیعی و انسانی باشد و حداکثر ۲ جمله:\n\n{input}',
    providerId: 'groq',
    createdAt: new Date().toISOString(),
    history: [],
  },
  {
    id: 'caption',
    name: 'کپشن پست اینستاگرام',
    prompt:
      'برای محتوای زیر یک کپشن اینستاگرام جذاب بنویس. شامل ۳ تا ۵ هشتگ مرتبط در پایان باشد:\n\n{input}',
    providerId: 'groq',
    createdAt: new Date().toISOString(),
    history: [],
  },
  {
    id: 'summarize',
    name: 'خلاصه‌سازی متن',
    prompt:
      'متن زیر را در حداکثر ۳ نقطه‌ی کوتاه و گویا خلاصه کن:\n\n{input}',
    providerId: 'groq',
    createdAt: new Date().toISOString(),
    history: [],
  },
]

/**
 * فراخوانی چت — با پشتیبانی streaming.
 * سازگار با OpenAI Chat Completions.
 */
export async function chat(
  provider: AIProvider,
  messages: ChatMessage[],
  opts: { model?: string; signal?: AbortSignal; temperature?: number } = {},
): Promise<string> {
  if (!provider.key) throw new Error('کلید API برای این ارائه‌دهنده تنظیم نشده است.')
  const res = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    signal: opts.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.key}`,
      ...(provider.id === 'openrouter'
        ? { 'HTTP-Referer': 'https://nexus-hq.app', 'X-Title': 'NEXUS HQ' }
        : {}),
    },
    body: JSON.stringify({
      model: opts.model ?? provider.model,
      messages,
      temperature: opts.temperature ?? 0.7,
      stream: false,
    }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`AI ${res.status}: ${txt.slice(0, 300) || res.statusText}`)
  }
  const j = await res.json()
  const content = j?.choices?.[0]?.message?.content
  if (typeof content !== 'string') throw new Error('پاسخ هوش مصنوعی نامعتبر است.')
  return content.trim()
}

/** اجرای یک تسک اتوماسیون روی ورودی */
export async function runAutomation(
  task: AutomationTask,
  providers: AIProvider[],
  input: string,
): Promise<{ output: string; model: string }> {
  const provider = providers.find(p => p.id === task.providerId) ?? providers.find(p => p.enabled && p.key)
  if (!provider) throw new Error('هیچ ارائه‌دهنده‌ای با کلید فعال پیدا نشد.')
  const model = task.model ?? provider.model
  const prompt = task.prompt.replace(/\{input\}/g, input)
  const output = await chat(provider, [
    { role: 'system', content: 'You are a concise, professional assistant. Reply in the same language as the user input.' },
    { role: 'user', content: prompt },
  ], { model })
  return { output, model }
}
