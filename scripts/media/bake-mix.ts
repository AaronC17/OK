import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { simulateMix } from '../../src/lib/mix-physics.ts'
import { encodeMix, packMix } from '../../src/lib/mix-codec.ts'

const sources = await Promise.all(['src/lib/mix-physics.ts', 'src/lib/mix-sauce.ts'].map(file => readFile(file)))
const hash = createHash('sha256').update(Buffer.concat(sources)).digest('hex').slice(0, 16)
const url = `/images/mix/motion-${hash}.bin`
const binary = encodeMix(simulateMix())
const compressed = gzipSync(new Uint8Array(packMix(binary)), { level: 9 })
await mkdir(resolve('public/images/mix'), { recursive: true })
await writeFile(resolve(`public${url}`), compressed)
await writeFile(resolve('src/config/mix-baked.json'), `${JSON.stringify({ url, hash, encoding: 'gzip', bytes: compressed.byteLength, decodedBytes: binary.byteLength }, null, 2)}\n`)
console.log(`Baked exact mix: ${compressed.byteLength} bytes; no physics calculation required on the phone.`)
