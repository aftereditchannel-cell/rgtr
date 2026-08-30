const fs = require('fs')
const path = require('path')

let page = fs.readFileSync(path.join(__dirname, 'src/pages/ModulePage.tsx'), 'utf8')

page = page.replace(
/const hasFollowers = module\?\.fields\.some\(f => f\.key === 'followers'\) \?\? false\n  const urlKey = module\?\.fields\.find\(f => f\.type === 'url' \|\| f\.key === 'handle' \|\| f\.key === 'instagram'\)\?\.key\n  const refreshable = hasFollowers && !!urlKey/,
`const urlKey = module?.fields.find(f => f.type === 'url' || f.key === 'handle' || f.key === 'instagram')?.key
  const refreshable = !!urlKey`
)

const refreshLogic = `const refreshSocial = async () => {
    if (!module || !urlKey) return
    setRefreshing(true)
    const hasFollowers = module.fields.some(f => f.key === 'followers' || f.key === 'subscribers')
    const hasName = module.fields.some(f => f.key === 'name' || f.key === 'title')
    const hasBio = module.fields.some(f => f.key === 'bio' || f.key === 'description')
    
    // Refresh only the first 20 records to avoid rate limiting
    for (const r of rows.slice(0, 20)) {
      const raw = String(r[urlKey] ?? '')
      if (!raw.trim()) continue
      const p = await fetchSocialProfile(raw, socialCfg?.proxyUrl ?? '')
      if (p) {
        const patch: Record<string, unknown> = {}
        if (hasFollowers && p.followers != null) {
          const fk = module.fields.find(f => f.key === 'followers' || f.key === 'subscribers')?.key
          if (fk) patch[fk] = p.followers
        }
        if (hasName && p.name && !r.name && !r.title) {
          const nk = module.fields.find(f => f.key === 'name' || f.key === 'title')?.key
          if (nk) patch[nk] = p.name
        }
        if (hasBio && p.bio && !r.bio && !r.description) {
          const bk = module.fields.find(f => f.key === 'bio' || f.key === 'description')?.key
          if (bk) patch[bk] = p.bio
        }
        if (Object.keys(patch).length > 0) update(module.key, r.id, patch)
      }
    }
    setRefreshing(false)
  }`

page = page.replace(/const refreshSocial = async \(\) => \{[\s\S]*?setRefreshing\(false\)\n  \}/, refreshLogic)

fs.writeFileSync(path.join(__dirname, 'src/pages/ModulePage.tsx'), page)
