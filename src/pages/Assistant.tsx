import { useState, useRef, useEffect } from 'react'
import { useApp } from '../store/useApp'
import { getAiKey, setAiKey, chat, type ChatMessage } from '../lib/ai'
import { Icon, Button, TextInput, Card, SectionTitle } from '../components/ui/Primitives'
import { uid } from '../lib/id'

type Msg = ChatMessage & { id: string }

export function Assistant() {
  const { data, add } = useApp()
  
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasKey, setHasKey] = useState(!!getAiKey())
  const [keyInput, setKeyInput] = useState('')
  const [provider, setProvider] = useState('groq')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSetKey = () => {
    if (!keyInput.trim()) return
    setAiKey(keyInput.trim())
    setHasKey(true)
    data.settings.ai.model = provider === 'groq' ? 'llama3-70b-8192' : 'gpt-4o-mini'
    data.settings.ai.baseUrl = provider === 'groq' ? 'https://api.groq.com/openai/v1' : 'https://api.openai.com/v1'
    useApp.getState().persist()
  }

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: Msg = { id: uid(), role: 'user', content: input.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      // Create a system prompt with current data context
      const projects = data.records['projects'] || []
      const projectNames = projects.map((p: any) => `${p.name} (Status: ${p.status})`).join(', ')

      const sysPrompt = `You are an intelligent assistant integrated directly into NEXUS HQ app.
You have access to the user's data. Currently, the user has the following projects:
${projectNames || 'No projects yet.'}

The user can ask you to explain data or add new data.
If the user asks you to create a project, respond exactly with a JSON block in this format:
<create_project>{"name": "Project Name", "category": "Category", "status": "To Do"}</create_project>
Otherwise, respond normally and concisely in the user's language (Persian).`

      const chatHistory = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      
      const response = await chat(
        [{ role: 'system', content: sysPrompt }, ...chatHistory],
        data.settings.ai
      )

      // Parse for tool calling
      let finalResponse = response
      const createMatch = response.match(/<create_project>([\s\S]*?)<\/create_project>/)
      if (createMatch) {
        try {
          const projectData = JSON.parse(createMatch[1])
          add('projects', projectData)
          finalResponse = response.replace(createMatch[0], '') + `\n\n✅ پروژه "${projectData.name}" با موفقیت در اپلیکیشن ثبت شد.`
        } catch { /* ignore parse error */ }
      }

      setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: finalResponse.trim() }])
    } catch (e: any) {
      setMessages(prev => [...prev, { id: uid(), role: 'assistant', content: '❌ خطا در برقراری ارتباط با هوش مصنوعی: ' + e.message }])
    } finally {
      setLoading(false)
    }
  }

  if (!hasKey) {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <Card>
          <SectionTitle icon="Bot">اتصال به هوش مصنوعی</SectionTitle>
          <p className="text-[12.5px] text-[var(--color-dim)] leading-relaxed mb-4">
            برای استفاده از دستیار هوشمند و تحلیل داده‌های شما (مثل پروژه‌ها و رسانه‌ها)، لطفاً کلید دسترسی (API Key) خود را وارد کنید. 
            هیچ نیازی به تنظیمات پیچیده نیست. کلید شما کاملاً محلی و امن روی همین دستگاه ذخیره می‌شود.
          </p>
          <div className="space-y-4">
            <div className="flex gap-2">
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                <input type="radio" name="provider" value="groq" checked={provider === 'groq'} onChange={() => setProvider('groq')} className="accent-[var(--color-acc)]" />
                Groq (رایگان و بسیار سریع)
              </label>
              <label className="flex items-center gap-2 text-[13px] cursor-pointer ml-4">
                <input type="radio" name="provider" value="openai" checked={provider === 'openai'} onChange={() => setProvider('openai')} className="accent-[var(--color-acc)]" />
                OpenAI (ChatGPT)
              </label>
            </div>
            <TextInput value={keyInput} onChange={e => setKeyInput(e.target.value)} placeholder="API Key..." className="ltr" type="password" />
            <Button variant="primary" onClick={handleSetKey}>اتصال حساب</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] sm:h-[calc(100vh-60px)] max-w-3xl mx-auto bg-[var(--color-bg2)] border border-[var(--color-line)] rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-line)] bg-white/[.02]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[var(--color-acc)]/20 text-[var(--color-acc)] flex items-center justify-center">
            <Icon name="Sparkles" size={16} />
          </div>
          <div>
            <h2 className="text-[14px] font-semibold">دستیار هوشمند NEXUS</h2>
            <p className="text-[10.5px] text-[var(--color-dim2)]">متصل به اطلاعات شما</p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => { setAiKey(''); setHasKey(false) }}>قطع اتصال</Button>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-[var(--color-dim2)]">
            <Icon name="Bot" size={48} className="mb-3 opacity-20" />
            <p className="text-[13px]">سلام! من آماده‌ام تا پروژه‌ها و اطلاعات شما را مدیریت کنم.</p>
            <p className="text-[11px] mt-1">مثال: "پروژه‌های من رو لیست کن" یا "یه پروژه جدید بساز برای طراحی سایت"</p>
          </div>
        )}
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-[var(--color-acc)] text-white rounded-br-none' : 'bg-[var(--color-panel)] border border-[var(--color-line)] rounded-bl-none'}`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[var(--color-panel)] border border-[var(--color-line)] rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-dim2)] animate-bounce" />
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-dim2)] animate-bounce" style={{ animationDelay: '0.15s' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-dim2)] animate-bounce" style={{ animationDelay: '0.3s' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-[var(--color-line)] bg-white/[.01]">
        <div className="flex items-center gap-2 bg-[var(--color-panel)] border border-[var(--color-line)] rounded-xl p-1">
          <input 
            type="text" 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => { if (e.key === 'Enter') void send() }}
            placeholder="درخواست خود را بنویسید..." 
            className="flex-1 bg-transparent px-3 py-2 text-[13.5px] outline-none"
          />
          <button 
            onClick={() => void send()}
            disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-lg bg-[var(--color-acc)] text-white flex items-center justify-center disabled:opacity-50 transition-opacity shrink-0"
          >
            <Icon name="Send" size={15} className="rtl:-scale-x-100" />
          </button>
        </div>
      </div>
    </div>
  )
}
