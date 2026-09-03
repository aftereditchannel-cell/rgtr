const fs = require('fs')
const path = require('path')

let content = fs.readFileSync(path.join(__dirname, 'src/lib/migrate.ts'), 'utf8')

// Fix version definition
content = content.replace(/<<<<<<< HEAD\nexport const CURRENT_VERSION = 8\n=======\nexport const CURRENT_VERSION = 9\n>>>>>>> [^\n]*\n/, 'export const CURRENT_VERSION = 9\n')

// Fix v9 migration block
content = content.replace(/<<<<<<< HEAD\n=======\n([\s\S]*?)>>>>>>> [^\n]*\n/, '$1')

fs.writeFileSync(path.join(__dirname, 'src/lib/migrate.ts'), content)
