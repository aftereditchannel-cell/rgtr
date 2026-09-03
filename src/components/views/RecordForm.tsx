import { useState, useEffect } from 'react'
import type { ModuleDef, FieldDef, FieldType } from '../../domain/schema'
import type { Entity } from '../../store/types'
import { useApp } from '../../store/useApp'
import { emptyRecord } from '../../domain/schema'
import { Modal, Button, Field, TextInput, TextArea, Icon } from '../ui/Primitives'
import { Dropdown } from '../ui/Dropdown'
import { useT } from '../../i18n'
import { useFmt } from '../../lib/useFmt'
import { fetchSocialProfile } from '../../lib/social'
import { isoToJalali } from '../../lib/jalali'

interface Props { module: ModuleDef; row: Entity | null; open: boolean; onClose: () => void }

type ChecklistItem = { t: string; done: boolean }

/** تقویم سفارشی یکسان در Android، Electron و وب؛ تاریخ در داده همیشه ISO میلادی می‌ماند. */
function DateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useT()
  const fmt = useFmt()
  const [open, setOpen] = useState(false)
  const selected = value.slice(0, 10)
  const initialMonth = () => {
    if (selected && fmt.opts.calendar === 'jalali' && fmt.opts.lang === 'fa') {
      const j = isoToJalali(selected)
      if (j) return { year: j.jy, month: j.jm - 1 }
    }
    if (selected) { const d = new Date(selected + 'T00:00:00'); return { year: d.getFullYear(), month: d.getMonth() } }
    return fmt.currentYearMonth()
  }
  const [cursor, setCursor] = useState(initialMonth)
  const show = () => { setCursor(initialMonth()); setOpen(true) }
  const choose = (iso: string) => { onChange(iso); setOpen(false) }
  const today = new Date().toISOString().slice(0, 10)

  return <>
    <button type="button" onClick={show} className="w-full flex items-center gap-2 rounded-lg bg-[var(--color-bg)] border border-[var(--color-line2)] px-3 py-2 text-[13px] text-start hover:border-[var(--color-dim2)] focus:border-[var(--color-acc)]">
      <Icon name="Calendar" size={15} className="text-[var(--color-acc)] shrink-0" />
      <span className={selected ? 'flex-1' : 'flex-1 text-[var(--color-dim2)]'}>{selected ? fmt.date(selected) : t('form.pickDate')}</span>
      <Icon name="ChevronDown" size={14} className="text-[var(--color-dim2)]" />
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title={t('form.pickDate')} footer={<><Button size="sm" variant="ghost" onClick={() => choose('')}>{t('form.clearDate')}</Button><Button size="sm" variant="outline" onClick={() => { setCursor(fmt.currentYearMonth()); choose(today) }}>{t('form.today')}</Button><Button size="sm" variant="primary" onClick={() => setOpen(false)}>{t('common.done')}</Button></>}>
      <div className="min-w-[260px]">
        <div className="flex items-center justify-between mb-4">
          <Button size="sm" variant="ghost" icon="ChevronRight" onClick={() => setCursor(fmt.shiftMonth(cursor.year, cursor.month, -1))} title={t('form.prevMonth')} />
          <span className="text-[13px] font-semibold">{fmt.monthTitle(cursor.year, cursor.month)}</span>
          <Button size="sm" variant="ghost" icon="ChevronLeft" onClick={() => setCursor(fmt.shiftMonth(cursor.year, cursor.month, 1))} title={t('form.nextMonth')} />
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">{fmt.weekdayNames().map(day => <span key={day} className="text-[10px] text-[var(--color-dim2)] py-1">{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {fmt.monthMatrix(cursor.year, cursor.month).flat().map((iso, i) => {
            if (!iso) return <span key={`empty-${i}`} />
            const day = fmt.opts.calendar === 'jalali' && fmt.opts.lang === 'fa' ? isoToJalali(iso)?.jd ?? '' : Number(iso.slice(8))
            const isSelected = iso === selected, isToday = iso === today
            return <button key={iso} type="button" onClick={() => choose(iso)} className={`h-9 rounded-lg text-[12px] transition-colors ${isSelected ? 'bg-[var(--color-acc)] text-white font-semibold' : isToday ? 'border border-[var(--color-acc)] text-[var(--color-acc)]' : 'hover:bg-white/[.07] text-[var(--color-tx)]'}`}>{fmt.dg(day)}</button>
          })}
        </div>
      </div>
    </Modal>
  </>
}

export function RecordForm({ module, row, open, onClose }: Props) {
  const { add, update, remove, data } = useApp()
  const { t, m: ml, f: fl, o: ol, lang } = useT()
  const fmt = useFmt()
  const [v, setV] = useState<Record<string, unknown>>({})
  const [editMode, setEditMode] = useState(false)
  
  const [addFieldOpen, setAddFieldOpen] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<FieldType>('text')

  useEffect(() => {
    if (open) {
      setV(row ? { ...row } : emptyRecord(module))
      setEditMode(!row)
    }
  }, [open, row, module])

  const set = (k: string, val: unknown) => setV(p => ({ ...p, [k]: val }))

  const save = () => {
    if (row) update(module.key, row.id, v)
    else add(module.key, v)
    onClose()
  }

  const handleAddCustomField = () => {
    if (!newFieldName.trim()) return
    const key = 'f_' + Date.now().toString(36)
    const newField: FieldDef = { key, label: newFieldName, labelFa: newFieldName, type: newFieldType, col: false }
    useApp.getState().updateModule(module.key, { fields: [...module.fields, newField] })
    setAddFieldOpen(false)
    setNewFieldName('')
  }

  const del = () => {
    if (row && confirm(t('form.confirmDelete'))) { remove(module.key, row.id); onClose() }
  }

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt).catch(()=>{})
  }

  const renderReadOnlyField = (f: FieldDef, val: unknown) => {
    const text = String(val ?? '')
    if (!text || (Array.isArray(val) && val.length === 0)) {
      return <div className="text-[13px] text-[var(--color-dim2)] pt-1">—</div>
    }

    if (f.type === 'url' || text.match(/^(https?:\/\/|(?:www\.)[^\s]+)/i)) {
      const href = text.startsWith('http') ? text : `https://${text}`
      return (
        <div className="flex items-center gap-2 pt-1">
          <a href={href} target="_blank" rel="noreferrer" className="text-[13px] text-[var(--color-acc)] hover:underline ltr truncate max-w-full">
            {text}
          </a>
          <button onClick={() => copyText(text)} className="p-1.5 text-[var(--color-dim2)] hover:text-[var(--color-tx)] hover:bg-white/[.08] rounded-md transition-colors" title="Copy"><Icon name="Copy" size={13}/></button>
          <a href={href} target="_blank" rel="noreferrer" className="p-1.5 text-[var(--color-dim2)] hover:text-[var(--color-tx)] hover:bg-white/[.08] rounded-md transition-colors inline-block" title="Open"><Icon name="ExternalLink" size={13}/></a>
        </div>
      )
    }

    const isPhone = f.key.toLowerCase().includes('phone') || f.label.toLowerCase().includes('phone')
    const phoneNorm = text.replace(/[\s().-]/g, '')
    if (isPhone && /^\+?[0-9]{7,15}$/.test(phoneNorm)) {
      return (
        <div className="flex items-center gap-2 pt-1">
          <a href={`tel:${phoneNorm}`} className="text-[13px] text-[var(--color-acc)] hover:underline ltr font-medium">
            {text}
          </a>
          <button onClick={() => copyText(text)} className="p-1.5 text-[var(--color-dim2)] hover:text-[var(--color-tx)] hover:bg-white/[.08] rounded-md transition-colors" title="Copy"><Icon name="Copy" size={13}/></button>
          <a href={`tel:${phoneNorm}`} className="p-1.5 text-[var(--color-dim2)] hover:text-[var(--color-tx)] hover:bg-white/[.08] rounded-md transition-colors inline-block" title="Call"><Icon name="Phone" size={13}/></a>
        </div>
      )
    }

    if (f.type === 'progress') {
      return (
        <div className="flex items-center gap-3 pt-1">
          <div className="flex-1 h-1.5 bg-white/[.08] rounded-full overflow-hidden">
            <div className="h-full bg-[var(--color-acc)]" style={{ width: `${Number(val) || 0}%` }} />
          </div>
          <span className="text-[12px] nums text-[var(--color-dim)]">{fmt.dg(Number(val) || 0)}%</span>
        </div>
      )
    }

    if (f.type === 'checklist') {
      const items = (Array.isArray(val) ? val : []) as ChecklistItem[]
      return (
        <div className="space-y-1 pt-1">
          {items.map((it, i) => (
            <div key={i} className="flex items-start gap-2">
              <Icon name={it.done ? 'CheckSquare' : 'Square'} size={14} className={it.done ? 'text-[var(--color-acc)] mt-0.5 shrink-0' : 'text-[var(--color-dim2)] mt-0.5 shrink-0'} />
              <span className={`text-[13px] ${it.done ? 'text-[var(--color-dim)] line-through' : 'text-[var(--color-tx)]'}`}>{it.t}</span>
            </div>
          ))}
        </div>
      )
    }
    
    if (f.type === 'ref') {
      const rm = data.modules.find(m => m.key === f.refModule)
      const rows = data.records[f.refModule ?? ''] ?? []
      const refRow = rows.find(r => String(r.id) === String(val))
      const label = refRow ? String(refRow[rm?.titleField ?? 'name'] ?? refRow.id) : text
      return <div className="text-[13px] text-[var(--color-tx)] pt-1">{label}</div>
    }

    // Default text view with LinkifyText-like support (basic regex split for phones/urls)
    const regex = /(https?:\/\/[^\s()]+?(?=[.,!?:;]*(?:[\s()\[\]]|$))|09\d{9}|\+\d{10,14})/g
    const parts = text.split(regex)
    const matches = text.match(regex) || []
    
    if (matches.length === 0) {
       return <div className="text-[13px] text-[var(--color-tx)] pt-1 whitespace-pre-wrap">{text}</div>
    }
    
    const result = []
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) result.push(<span key={`t-${i}`}>{parts[i]}</span>)
      if (matches[i]) {
         const m = matches[i]
         if (m.startsWith('http')) {
           result.push(<a key={`m-${i}`} href={m} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-[var(--color-acc)] hover:underline ltr inline-block mx-0.5">{m}</a>)
         } else {
           const norm = m.replace(/[\s-]/g, '')
           result.push(<a key={`m-${i}`} href={`tel:${norm}`} onClick={e => e.stopPropagation()} className="text-[var(--color-acc)] hover:underline ltr inline-block mx-0.5">{m}</a>)
         }
      }
    }
    return <div className="text-[13px] text-[var(--color-tx)] pt-1 whitespace-pre-wrap">{result}</div>
  }

  const renderField = (f: FieldDef) => {
    const val = v[f.key]
    
    if (!editMode) {
      return renderReadOnlyField(f, val)
    }
    
    switch (f.type) {
      case 'textarea':
        return <TextArea value={String(val ?? '')} placeholder={f.placeholder} onChange={e => set(f.key, e.target.value)} />
      case 'number':
      case 'money':
        return <TextInput type="number" value={String(val ?? '')} onChange={e => set(f.key, e.target.value === '' ? '' : Number(e.target.value))} />
      case 'progress':
        return (
          <div className="flex items-center gap-3">
            <input type="range" min={0} max={100} value={Number(val) || 0} onChange={e => set(f.key, Number(e.target.value))}
              className="flex-1 accent-[var(--color-acc)]" />
            <span className="text-[12px] nums w-9 text-end text-[var(--color-dim)]">{fmt.dg(Number(val) || 0)}%</span>
          </div>
        )
      case 'date':
        return <DateField value={String(val ?? '').slice(0, 10)} onChange={date => set(f.key, date)} />
      case 'select':
        return (
          <Dropdown
            value={String(val ?? '')}
            onChange={nv => set(f.key, nv)}
            options={(f.options ?? []).map(o => ({ value: o, label: ol(o) }))}
          />
        )
      case 'ref': {
        const rm = data.modules.find(m => m.key === f.refModule)
        const rows = data.records[f.refModule ?? ''] ?? []
        return (
          <Dropdown
            value={String(val ?? '')}
            onChange={nv => set(f.key, nv)}
            options={rows.map(r => ({ value: String(r.id), label: String(r[rm?.titleField ?? 'name'] ?? r.id) }))}
          />
        )
      }
      case 'tags': {
        const arr = Array.isArray(val) ? (val as string[]) : []
        return <TextInput value={arr.join(', ')} placeholder={t('form.tagsHint')}
          onChange={e => set(f.key, e.target.value.split(',').map(s => s.trim()).filter(Boolean))} />
      }
      case 'checklist': {
        const items = (Array.isArray(val) ? val : []) as ChecklistItem[]
        return (
          <div className="space-y-1.5">
            {items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="checkbox" checked={!!it.done} className="accent-[var(--color-acc)] w-3.5 h-3.5"
                  onChange={e => set(f.key, items.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)))} />
                <TextInput value={it.t} className="flex-1 py-1"
                  onChange={e => set(f.key, items.map((x, j) => (j === i ? { ...x, t: e.target.value } : x)))} />
                <button onClick={() => set(f.key, items.filter((_, j) => j !== i))}
                  className="text-[var(--color-dim2)] hover:text-red-400 p-1"><Icon name="X" size={13} /></button>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon="Plus" onClick={() => set(f.key, [...items, { t: '', done: false }])}>{t('form.newItem')}</Button>
          </div>
        )
      }
      case 'url': {
        const s = String(val ?? '')
        return (
          <div className="flex items-center gap-2">
            <TextInput value={s} placeholder={f.placeholder} className="ltr" onChange={e => set(f.key, e.target.value)} />
            <Button size="sm" variant="outline" icon={enriching === f.key ? 'Loader' : 'Sparkles'}
              title={t('form.autoFill')}
              disabled={enriching === f.key || !s.trim()}
              onClick={() => void enrich(f)}>
              {enriching === f.key ? t('form.fetching') : t('form.autoFill')}
            </Button>
          </div>
        )
      }
      default: {
        const isPhone = f.key.toLowerCase().includes('phone') || f.label.toLowerCase().includes('phone')
        
        const handlePickContact = async () => {
          try {
            const nav = navigator as any
            if ('contacts' in nav && 'ContactsManager' in window) {
               const contacts = await nav.contacts.select(['tel'], { multiple: false })
               if (contacts && contacts.length > 0 && contacts[0].tel && contacts[0].tel.length > 0) {
                 set(f.key, contacts[0].tel[0])
               }
            } else {
               alert(t('common.error') + ': مرورگر/دستگاه شما از دفترچه تلفن پشتیبانی نمی‌کند.')
            }
          } catch (e) {
            console.error(e)
          }
        }
        
        if (isPhone) {
          return (
            <div className="flex items-center gap-2">
              <TextInput type="tel" inputMode="tel" className="ltr flex-1" value={String(val ?? '')} placeholder={f.placeholder} onChange={e => set(f.key, e.target.value)} />
              <Button size="sm" variant="outline" icon="Users" title="انتخاب از مخاطبین" onClick={() => void handlePickContact()} />
            </div>
          )
        }
        
        return <TextInput type="text" value={String(val ?? '')} placeholder={f.placeholder} onChange={e => set(f.key, e.target.value)} />
      }
    }
  }

  // پر کردن خودکار پروفایل (فالوور/بیو/نام) از لینک اینستاگرام/یوتیوب/…
  const [enriching, setEnriching] = useState<string | null>(null)
  const enrich = async (f: FieldDef) => {
    const raw = String(v[f.key] ?? '')
    if (!raw.trim()) return
    setEnriching(f.key)
    const p = await fetchSocialProfile(raw, data.settings.social?.proxyUrl ?? '')
    setEnriching(null)
    if (!p) { useApp.getState().setToast(t('form.noProfile')); return }
    const patch: Record<string, unknown> = {}
    // فالوور → فیلد followers (یا subscriber)
    const followersKey = ['followers', 'subscribers', 'followerCount'].find(k => module.fields.some(fd => fd.key === k))
    if (followersKey && p.followers != null) patch[followersKey] = p.followers
    // نام → فیلد name/account/title/artistName
    const nameKey = ['name', 'account', 'title', 'artistName', 'mediaName'].find(k => module.fields.some(fd => fd.key === k))
    if (nameKey && p.name && !v[nameKey]) patch[nameKey] = p.name
    // بیو → اولین فیلد متنی بلند مناسب
    const bioKey = ['bio', 'caption', 'description', 'notes'].find(k => module.fields.some(fd => fd.key === k))
    if (bioKey && p.bio) patch[bioKey] = p.bio
    setV(prev => ({ ...prev, ...patch }))
  }

  const wide = ['textarea', 'checklist', 'progress'] as const
  const isWide = (f: FieldDef) => (wide as readonly string[]).includes(f.type)

  return (
    <Modal open={open} onClose={onClose} wide
      title={
        <div className="flex items-center gap-3 w-full pe-6">
          <span className="truncate">{row ? (editMode ? t('form.editTitle') : String(row[module.titleField] ?? '')) : t('form.addTitle')} — {ml(module)}</span>
          {row && !editMode && (
            <Button size="sm" variant="outline" icon="Edit3" onClick={() => setEditMode(true)} className="ms-auto shrink-0 px-2.5 h-7 text-[11px]">
              {t('common.edit') || 'Edit'}
            </Button>
          )}
        </div>
      }
      footer={
        <>
          {row && editMode && <Button variant="danger" size="sm" icon="Trash2" onClick={del} className="me-auto">{t('common.delete')}</Button>}
          {!editMode && <Button variant="ghost" size="sm" className="me-auto" onClick={onClose}>{t('common.close') || 'Close'}</Button>}
          {editMode && <Button variant="ghost" size="sm" onClick={() => { if (row) setEditMode(false); else onClose() }}>{t('common.cancel')}</Button>}
          {editMode && <Button variant="primary" size="sm" icon="Check" onClick={save}>{t('common.save')}</Button>}
        </>
      }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5 max-h-[62vh] overflow-y-auto pe-1">
        {module.fields.map(f => (
          <div key={f.key} className={isWide(f) ? 'sm:col-span-2' : ''}>
            <Field label={fl(f)} help={lang === 'fa' ? f.help : (f.helpEn ?? f.help)}>{renderField(f)}</Field>
          </div>
        ))}
        
        {editMode && !addFieldOpen && (
          <div className="sm:col-span-2 pt-2 border-t border-[var(--color-line)] mt-1">
            <Button size="sm" variant="ghost" icon="Plus" onClick={() => setAddFieldOpen(true)}>
              {t('set.newField') || 'Add custom field'}
            </Button>
          </div>
        )}
        
        {editMode && addFieldOpen && (
          <div className="sm:col-span-2 p-3 mt-1 rounded-lg border border-[var(--color-acc)] bg-[var(--color-acc)]/10 flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[120px]">
              <Field label={t('set.modTitle') || 'Field Name'}>
                <TextInput value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="..." />
              </Field>
            </div>
            <div className="w-32 shrink-0">
              <Field label="Type">
                <Dropdown value={newFieldType} onChange={v => setNewFieldType(v as FieldType)} 
                  options={['text', 'textarea', 'number', 'money', 'date', 'progress', 'checklist', 'tags', 'url'].map(t => ({ value: t, label: t }))} />
              </Field>
            </div>
            <Button size="sm" variant="primary" onClick={handleAddCustomField}>{t('common.save') || 'Add'}</Button>
            <Button size="sm" variant="ghost" icon="X" onClick={() => setAddFieldOpen(false)} />
          </div>
        )}
      </div>
    </Modal>
  )
}
