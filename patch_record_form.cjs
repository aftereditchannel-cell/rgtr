const fs = require('fs')
const path = require('path')

let content = fs.readFileSync(path.join(__dirname, 'src/components/views/RecordForm.tsx'), 'utf8')

// Add custom field state and functions
const formStateOld = `  const [editMode, setEditMode] = useState(false)`
const formStateNew = `  const [editMode, setEditMode] = useState(false)
  
  const [addFieldOpen, setAddFieldOpen] = useState(false)
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldType, setNewFieldType] = useState<FieldType>('text')`

content = content.replace(formStateOld, formStateNew)

const saveLogicOld = `  const save = () => {
    if (row) update(module.key, row.id, v)
    else add(module.key, v)
    onClose()
  }`
const saveLogicNew = `  const save = () => {
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
  }`
content = content.replace(saveLogicOld, saveLogicNew)

// Render Add Field button and inline form
const moduleFieldsRenderOld = `      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5 max-h-[62vh] overflow-y-auto pe-1">
        {module.fields.map(f => (
          <div key={f.key} className={isWide(f) ? 'sm:col-span-2' : ''}>
            <Field label={fl(f)} help={lang === 'fa' ? f.help : (f.helpEn ?? f.help)}>{renderField(f)}</Field>
          </div>
        ))}
      </div>
    </Modal>`

const moduleFieldsRenderNew = `      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5 max-h-[62vh] overflow-y-auto pe-1">
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
    </Modal>`

content = content.replace(moduleFieldsRenderOld, moduleFieldsRenderNew)

fs.writeFileSync(path.join(__dirname, 'src/components/views/RecordForm.tsx'), content)
