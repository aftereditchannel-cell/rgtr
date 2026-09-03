const fs = require('fs')
const path = require('path')

let content = fs.readFileSync(path.join(__dirname, 'src/pages/Settings.tsx'), 'utf8')

content = content.replace(/<AiCard \/>/, '')

fs.writeFileSync(path.join(__dirname, 'src/pages/Settings.tsx'), content)
