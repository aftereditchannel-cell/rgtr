const fs = require('fs')
const path = require('path')

let content = fs.readFileSync(path.join(__dirname, 'src/pages/Settings.tsx'), 'utf8')

// Remove existing AI Card components entirely, just leave a simple link or delete it because the new Assistant has its own key manager.
const oldAiCard = /function AiCard\(\) \{[\s\S]*?\}\n\n\/\* \-\-\-\-\-\-\-\-\-\- /
content = content.replace(oldAiCard, '/* ---------- ')

fs.writeFileSync(path.join(__dirname, 'src/pages/Settings.tsx'), content)
