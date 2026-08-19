/**
 * اتصال هوش مصنوعی — سازگار با OpenAI (و هر سرویس سازگار: Groq, OpenRouter, LocalAI…).
 *
 * کلید API مثل توکن گیت‌هاب، خارج از AppData و فایل بکاپ در localStorage نگه‌داری می‌شود
 * تا با sync ابری به دستگاه‌های دیگر نرود.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

const KEY = 'nexus_hq_ai_key'

export function getAiKey(): string {
  try { return localStorage.getItem(KEY) ?? '' } catch { return '' }
}
export function setAiKey(k: string): void {
  try {
    if (k) localStorage.setItem(KEY, k)
    else localStorage.removeItem(KEY)
  } catch { /* حالت خصوصی */ }
}
export function hasAiKey(): boolean { return !!getAiKey() }

export class AiError extends Error {
  code: 'no_key' | 'network' | 'bad_request' | 'unknown'
  constructor(code: AiError['code'], msg = '') {
    super(msg || code)
    this.code = code
    this.name = 'AiError'
  }
}

export interface AiConfig {
  baseUrl: string
  model: string
  /** دمای پاسخ — پیش‌فرض ۰٫۷ */
  temperature?: number
  /** حداکثر توکن خروجی */
  maxTokens?: number
}

/** فراخوانی یک دور گفتگو و برگرداندن متن پاسخ */
export async function chat(messages: ChatMessage[], cfg: AiConfig): Promise<string> {
  const key = getAiKey()
  if (!key) throw new AiError('no_key')
  const base = (cfg.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')
  let res: Response
  try {
    res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: cfg.model || 'gpt-4o-mini',
        messages,
        temperature: cfg.temperature ?? 0.7,
        ...(cfg.maxTokens ? { max_tokens: cfg.maxTokens } : {}),
      }),
    })
  } catch {
    throw new AiError('network')
  }
  if (res.status === 401 || res.status === 403) throw new AiError('no_key')
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json()).error?.message ?? '' } catch { /* ignore */ }
    throw new AiError(res.status >= 400 && res.status < 500 ? 'bad_request' : 'network', detail)
  }
  const j = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return j.choices?.[0]?.message?.content?.trim() ?? ''
}

/** اجرای یک ایجنت: سیستم‌پرامپت از تعریف ایجنت ساخته می‌شود */
export function runAgent(
  cfg: AiConfig,
  agent: { name: string; role: string; description?: string; responsibilities?: string },
  userInput: string,
): Promise<string> {
  const lines = [
    `You are "${agent.name}"${agent.role ? ` — ${agent.role}` : ''}.`,
    agent.description ? `\nAbout you: ${agent.description}` : '',
    agent.responsibilities ? `\nYour responsibilities:\n${agent.responsibilities}` : '',
    '\nAnswer in the user’s language. Be concise and actionable.',
  ].filter(Boolean)
  return chat(
    [
      { role: 'system', content: lines.join('\n') },
      { role: 'user', content: userInput },
    ],
    cfg,
  )
}
