const fs = require('fs')
const path = require('path')

let content = fs.readFileSync(path.join(__dirname, 'src/pages/ModulePage.tsx'), 'utf8')

// Update filterable useMemo
const filterableOld = `const filterable = useMemo(
    () => module?.fields.filter(f => f.type === 'select' && (f.options?.length ?? 0) > 1).slice(0, 3) ?? [],
    [module],
  )`
const filterableNew = `const filterable = useMemo(
    () => module?.fields.filter(f => (f.type === 'select' && (f.options?.length ?? 0) > 1) || f.type === 'ref').slice(0, 4) ?? [],
    [module],
  )`
content = content.replace(filterableOld, filterableNew)

// Update filterable.map to handle ref fields
const mapOld = `{filterable.map(f => (
          <Dropdown key={f.key} className="w-auto min-w-[140px]"
            value={filters[f.key] ?? ''}
            onChange={nv => setFilters(p => ({ ...p, [f.key]: nv }))}
            options={[
              { value: '', label: t('module.filterAll', { f: fl(f) }) },
              ...(f.options ?? []).map(o => ({ value: o, label: ol(o) })),
            ]} />
        ))}`
const mapNew = `{filterable.map(f => {
          let opts: {value: string, label: string}[] = []
          if (f.type === 'select') {
            opts = (f.options ?? []).map(o => ({ value: o, label: ol(o) }))
          } else if (f.type === 'ref' && f.refModule) {
            const rm = data.modules.find(m => m.key === f.refModule)
            const refRows = data.records[f.refModule] ?? []
            opts = refRows.map(r => ({ value: String(r.id), label: String(r[rm?.titleField ?? 'name'] ?? r.id) }))
          }
          return (
            <Dropdown key={f.key} className="w-auto min-w-[140px]"
              value={filters[f.key] ?? ''}
              onChange={nv => setFilters(p => ({ ...p, [f.key]: nv }))}
              options={[
                { value: '', label: t('module.filterAll', { f: fl(f) }) },
                ...opts,
              ]} />
          )
        })}`
content = content.replace(mapOld, mapNew)

fs.writeFileSync(path.join(__dirname, 'src/pages/ModulePage.tsx'), content)
