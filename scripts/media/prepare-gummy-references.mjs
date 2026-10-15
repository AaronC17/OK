/** Local reference crops only; no API, credentials, or billable work. */
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

const encode = promisify(execFile)
const ffmpeg = process.env.FFMPEG_BIN ?? join(homedir(), 'AppData/Local/Temp/opencode/ffmpeg.exe')
const dir = '.higgsfield/onkys-gummies-02/references'
await mkdir(dir, { recursive: true })
const sources = [
  { id: 'worms', source: 'references/download.png', crop: '320:180:215:426', role: 'Original customer reference: sugar-coated short gummy worms/rods; packaging excluded.' },
  { id: 'watermelon', source: 'references/download (1).png', crop: '295:120:50:298', role: 'Original customer reference: flat watermelon-wedge gummies, red/white/green; packaging excluded.' },
  { id: 'rings', source: 'references/Gomitasaronaranjas_1024x1024.webp', crop: '790:660:35:100', role: 'Original customer reference: red/orange/yellow sugar-coated gummy rings. Visual reference only, not republished.' },
  { id: 'bears', source: 'public/images/ositos.jpg', crop: '600:750:100:80', role: 'Licensed Pexels gummy-bear photo already in the project; shape reference only, not its pink background.' },
]
const result = []
for (const source of sources) {
  const bytes = await readFile(source.source)
  const sourceHash = createHash('sha256').update(bytes).digest('hex')
  const path = `${dir}/${source.id}-${sourceHash.slice(0, 12)}.jpg`
  let exists = false
  try { await access(path); exists = true } catch { /* New derived crop. */ }
  if (!exists) await encode(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-n', '-i', source.source, '-vf', `crop=${source.crop}`, '-frames:v', '1', '-q:v', '2', path])
  const cropped = await readFile(path)
  result.push({ ...source, sourceHash, path, sha256: createHash('sha256').update(cropped).digest('hex') })
  console.log(`Prepared ${source.id}: ${cropped.length} bytes; source unchanged.`)
}
await writeFile(`${dir}/manifest.json`, JSON.stringify({ references: result }, null, 2), 'utf8')
