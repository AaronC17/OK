import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import sharp from 'sharp'

const sources = [
  { path: '/images/bolsa-mix.webp', widths: [160, 320, 480, 640, 900] },
  { path: '/images/ositos-bolsa.webp', widths: [160, 320, 480, 640, 700] },
  { path: '/images/uvarindas.webp', widths: [160, 320, 480, 640, 868] },
  ...['chamoy', 'tajin', 'limon'].map(name => ({ path: `/images/mix/bottle-${name}.webp`, widths: [64, 128, 192] })),
]
const directory = resolve('public/images/responsive')
await mkdir(directory, { recursive: true })
const manifest = {}
for (const source of sources) {
  const original = await readFile(resolve(`public${source.path}`))
  const { width, height } = await sharp(original).metadata()
  const candidates = []
  for (const size of source.widths) {
    const data = await sharp(original).resize({ width: size, withoutEnlargement: true }).webp({ quality: 80, effort: 6 }).toBuffer()
    const hash = createHash('sha256').update(data).digest('hex').slice(0, 12)
    const name = `${basename(source.path, '.webp')}-${size}-${hash}.webp`
    await writeFile(resolve(directory, name), data)
    candidates.push(`/images/responsive/${name} ${Math.min(size, width)}w`)
  }
  manifest[source.path] = { width, height, srcSet: candidates.join(', ') }
}
await writeFile(resolve('src/config/responsive-images.json'), JSON.stringify(manifest, null, 2) + '\n')
console.log(`Prepared responsive WebP images for ${sources.length} photographs (alpha preserved).`)
