/**
 * AI Providers — ماژولار
 * ========================
 * OpenAI / Google Gemini / Anthropic Claude با کلید خود کاربر.
 * هیچ ادعای «رایگان» نمی‌کنیم — مصرف به حساب کاربر است.
 * همه‌ی درخواست‌ها از دروازه‌ی بومی (بدون CORS) انجام می‌شود.
 */
import { gwFetch } from '../lib/gateway'

export type AIProviderId = 'openai' | 'gemini' | 'anthropic'

export interface AIProviderDef {
  id: AIProviderId
  label: string
  keyName: string          // نام در مخزن امن
  defaultModel: string
  models: string[]
  docsUrl: string
}

export const AI_PROVIDERS: AIProviderDef[] = [
  {
    id: 'openai', label: 'OpenAI / ChatGPT', keyName: 'ai_openai',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'o4-mini'],
    docsUrl: 'platform.openai.com/api-keys',
  },
  {
    id: 'gemini', label: 'Google Gemini', keyName: 'ai_gemini',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'],
    docsUrl: 'aistudio.google.com/apikey',
  },
  {
    id: 'anthropic', label: 'Anthropic Claude', keyName: 'ai_anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-5-haiku-20241022'],
    docsUrl: 'console.anthropic.com/settings/keys',
  },
]

export function aiProviderById(id: AIProviderId): AIProviderDef | undefined {
  return AI_PROVIDERS.find(p => p.id === id)
}

/** تست اتصال واقعی — یک درخواست سبک رسمی */
export async function testAIConnection(id: AIProviderId, model: string, key: string): Promise<{ ok: boolean; detail: string }> {
  try {
    if (id === 'openai') {
      const r = await gwFetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: 'user', content: 'ping' }] }),
      })
      return r.ok ? { ok: true, detail: 'OK — model responded' } : { ok: false, detail: `HTTP ${r.status}: ${r.body.slice(0, 160)}` }
    }
    if (id === 'gemini') {
      const r = await gwFetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] }) },
      )
      return r.ok ? { ok: true, detail: 'OK — model responded' } : { ok: false, detail: `HTTP ${r.status}: ${r.body.slice(0, 160)}` }
    }
    // anthropic
    const r = await gwFetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: 5, messages: [{ role: 'user', content: 'ping' }] }),
    })
    return r.ok ? { ok: true, detail: 'OK — model responded' } : { ok: false, detail: `HTTP ${r.status}: ${r.body.slice(0, 160)}` }
  } catch (e) {
    return { ok: false, detail: (e as Error).message }
  }
}

/** تولید متن با مدل انتخابی — برای Automation (تحلیل و گزارش) */
export async function aiComplete(id: AIProviderId, model: string, key: string, prompt: string): Promise<string> {
  if (id === 'openai') {
    const r = await gwFetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
    })
    if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}`)
    return (JSON.parse(r.body) as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? ''
  }
  if (id === 'gemini') {
    const r = await gwFetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) },
    )
    if (!r.ok) throw new Error(`Gemini HTTP ${r.status}`)
    type GeminiResp = { candidates?: { content?: { parts?: { text?: string }[] } }[] }
    const j = JSON.parse(r.body) as GeminiResp
    return j.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }
  const r = await gwFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!r.ok) throw new Error(`Claude HTTP ${r.status}`)
  return (JSON.parse(r.body) as { content?: Array<{ text?: string }> }).content?.[0]?.text ?? ''
}
