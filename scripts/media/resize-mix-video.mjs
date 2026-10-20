import { readFile, writeFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/** A native-resolution option for small 1×/2× screens. The 3× master is retained. */
export async function resizeMixVideo(ffmpeg) {
  const config = JSON.parse(await readFile('src/config/mix-video.json', 'utf8'))
  const input = resolve(`public${config.url}`)
  const settings = ['-vf', 'scale=720:612:flags=lanczos', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-level:v', '3.2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-g', '120']
  const hash = createHash('sha256').update(await readFile(input)).update(JSON.stringify(settings)).digest('hex').slice(0, 16)
  const url = `/images/mix/preview-${hash}-720.mp4`
  await new Promise((resolvePromise, reject) => {
    const encoder = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-i', input, ...settings, resolve(`public${url}`)], { stdio: 'inherit' })
    encoder.once('error', reject)
    encoder.once('close', code => code === 0 ? resolvePromise() : reject(new Error(`ffmpeg exited with ${code}`)))
  })
  const bytes = (await stat(resolve(`public${url}`))).size
  config.compact = { url, width: 720, height: 612, bytes }
  await writeFile('src/config/mix-video.json', `${JSON.stringify(config, null, 2)}\n`)
  console.log(`Compact 60 fps recipe: ${bytes} bytes, 720 × 612; native pixels for small 1×/2× screens.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const option = process.argv.find(arg => arg.startsWith('--ffmpeg='))
  await resizeMixVideo(option?.slice('--ffmpeg='.length) || process.env.FFMPEG_PATH || 'ffmpeg')
}
