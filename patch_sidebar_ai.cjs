const fs = require('fs')
const path = require('path')

let content = fs.readFileSync(path.join(__dirname, 'src/components/layout/Sidebar.tsx'), 'utf8')

content = content.replace(
/\{ to: '\/automation', icon: 'Bot', k: 'nav.automation' \},/,
`{ to: '/assistant', icon: 'Sparkles', k: 'nav.assistant' },`
)

fs.writeFileSync(path.join(__dirname, 'src/components/layout/Sidebar.tsx'), content)

// add dict entry
let dict = fs.readFileSync(path.join(__dirname, 'src/i18n/dict.ts'), 'utf8')
dict = dict.replace(
/'nav\.automation': \{ fa: 'هوش مصنوعی و اتوماسیون', en: 'AI & Automation' \},/,
`'nav.automation': { fa: 'هوش مصنوعی و اتوماسیون', en: 'AI & Automation' },
  'nav.assistant': { fa: 'دستیار هوشمند (AI)', en: 'AI Assistant' },`
)
fs.writeFileSync(path.join(__dirname, 'src/i18n/dict.ts'), dict)
