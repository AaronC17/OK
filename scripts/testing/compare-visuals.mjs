import { readdir, mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import sharp from 'sharp'

// node scripts/testing/compare-visuals.mjs <before> <after> <output>
const [before, after, directory] = process.argv.slice(2).map(path => resolve(path))
if (!before || !after || !directory) throw new Error('Supply before, after and output directories.')
await mkdir(directory, { recursive: true })
const names = (await readdir(before)).filter(name => name.endsWith('.png'))
const results = []
for (const name of names) {
  const a = await sharp(join(before, name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const b = await sharp(join(after, name)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width, height } = a.info
  if (width !== b.info.width || height !== b.info.height) {
    results.push({ name, sizeMismatch: { before: a.info, after: b.info } })
    continue
  }
  let different = 0, over16 = 0, maxChannelError = 0, sum = 0
  const diff = Buffer.from(b.data)
  for (let i = 0; i < a.data.length; i += 4) {
    let error = 0
    for (let channel = 0; channel < 3; channel++) {
      const delta = Math.abs(a.data[i + channel] - b.data[i + channel])
      error = Math.max(error, delta)
      sum += delta
    }
    if (error) different++
    if (error > 16) {
      over16++
      diff[i] = 255; diff[i + 1] = 0; diff[i + 2] = 255
    }
    maxChannelError = Math.max(maxChannelError, error)
  }
  results.push({ name, width, height, different, over16, percentOver16: over16 / (width * height) * 100, maxChannelError, meanChannelError: sum / (width * height * 3) })
  if (over16) await sharp(diff, { raw: { width, height, channels: 4 } }).png().toFile(join(directory, name.replace('.png', '-diff.png')))
}
await writeFile(join(directory, 'visual-comparison.json'), JSON.stringify(results, null, 2))
console.log(JSON.stringify(results, null, 2))
