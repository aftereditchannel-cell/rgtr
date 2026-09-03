const fs = require('fs')
const path = require('path')

let content = fs.readFileSync(path.join(__dirname, 'src/App.tsx'), 'utf8')

content = content.replace(
/import \{ Automation \} from '\.\/pages\/Automation'/,
`import { Automation } from './pages/Automation'
import { Assistant } from './pages/Assistant'`
)

content = content.replace(
/<Route path="\/automation" element=\{<Automation \/>\} \/>/,
`<Route path="/automation" element={<Automation />} />
              <Route path="/assistant" element={<Assistant />} />`
)

fs.writeFileSync(path.join(__dirname, 'src/App.tsx'), content)
