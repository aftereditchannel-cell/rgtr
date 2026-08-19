import { useState, useEffect } from 'react'
import type { ModuleDef, FieldDef } from '../../domain/schema'
import type { Entity } from '../../store/types'
import { useApp } from '../../store/useApp'
import { emptyRecord } from '../../domain/schema'
import { Modal, Button, Field, TextInput, TextArea, Icon } from '../ui/Primitives'
import { useT } from '../../i18n'
import { useFmt } from '../../lib/useFmt'

interface Props { module: ModuleDef; row: Entity | null; open: boolean; onClose: () => void }

type ChecklistItem = { t: string; done: boolean }

export function RecordForm({ module, row, open, onClose }: Props) {
  const { add, update, remove, data } = useApp()
  const { t, m: ml, f: fl, o: ol, lang } = useT()
  const fmt = useFmt()
  const [v, setV] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (open) setV(row ? { ...row } : emptyRecord(module))
  }, [open, row, module])

  const set = (k: string, val: unknown) => setV(p => ({ ...p, [k]: val }))

  const save = () => {
    if (row) update(module.key, row.id, v)
    else add(module.key, v)
    onClose()
  }

  const del = () => {
    if (row && confirm(t('form.confirmDelete'))) { remove(module.key, row.id); onClose() }
  }

  const renderField = (f: FieldDef) => {
    const val = v[f.key]
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
        return <TextInput type="date" value={String(val ?? '').slice(0, 10)} onChange={e => set(f.key, e.target.value)} />
      case 'select':
        return (
          <select value={String(val ?? '')} onChange={e => set(f.key, e.target.value)}
            className="w-full rounded-lg bg-[var(--color-bg)] border border-[var(--color-line2)] px-3 py-2 text-[13px] cursor-pointer focus:border-[var(--color-acc)]">
            <option value="">—</option>
            {(f.options ?? []).map(o => <option key={o} value={o}>{ol(o)}</option>)}
          </select>
        )
      case 'ref': {
        const rm = data.modules.find(m => m.key === f.refModule)
        const rows = data.records[f.refModule ?? ''] ?? []
        return (
          <select value={String(val ?? '')} onChange={e => set(f.key, e.target.value)}
            className="w-full rounded-lg bg-[var(--color-bg)] border border-[var(--color-line2)] px-3 py-2 text-[13px] cursor-pointer focus:border-[var(--color-acc)]">
            <option value="">—</option>
            {rows.map(r => <option key={r.id} value={r.id}>{String(r[rm?.titleField ?? 'name'] ?? r.id)}</option>)}
          </select>
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
      default:
        return <TextInput value={String(val ?? '')} placeholder={f.placeholder} onChange={e => set(f.key, e.target.value)} />
    }
  }

  const wide = ['textarea', 'checklist', 'progress'] as const
  const isWide = (f: FieldDef) => (wide as readonly string[]).includes(f.type)

  return (
    <Modal open={open} onClose={onClose} wide
      title={`${row ? t('form.editTitle') : t('form.addTitle')} — ${ml(module)}`}
      footer={
        <>
          {row && <Button variant="danger" size="sm" icon="Trash2" onClick={del} className="me-auto">{t('common.delete')}</Button>}
          <Button variant="ghost" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" size="sm" icon="Check" onClick={save}>{t('common.save')}</Button>
        </>
      }>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5 max-h-[62vh] overflow-y-auto pe-1">
        {module.fields.map(f => (
          <div key={f.key} className={isWide(f) ? 'sm:col-span-2' : ''}>
            <Field label={fl(f)} help={lang === 'fa' ? f.help : (f.helpEn ?? f.help)}>{renderField(f)}</Field>
          </div>
        ))}
      </div>
    </Modal>
  )
}
