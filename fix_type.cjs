const fs = require('fs')
const path = require('path')

let content = fs.readFileSync(path.join(__dirname, 'src/components/views/RecordForm.tsx'), 'utf8')
content = content.replace(/import type \{ ModuleDef, FieldDef \} from '\.\.\/\.\.\/domain\/schema'/, "import type { ModuleDef, FieldDef, FieldType } from '../../domain/schema'")
fs.writeFileSync(path.join(__dirname, 'src/components/views/RecordForm.tsx'), content)
