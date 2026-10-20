import { createServer } from 'node:http'
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { resolve, join, extname } from 'node:path'
import { chromium } from 'playwright'
import sharp from 'sharp'

// Bake the original desktop SVG, including its full deformation/contact effects.
// Run explicitly when the illustration changes; normal builds use the checked-in MP4.
// node scripts/media/bake-mix-video.mjs --site=dist --ffmpeg=<ffmpeg executable>
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.replace(/^--/, '').split('=')
  return [key, value.join('=')]
}))
if (!args.site) throw new Error('Supply --site with a production build containing the SVG renderer.')
const site = resolve(args.site), output = resolve('public/images/mix')
const sources = [
  'src/components/GummyBowl.tsx', 'src/components/GummyBear.tsx', 'src/components/SeasoningBottle.tsx',
  'src/components/mix-motion.ts', 'src/components/lemon-pour.ts',
  'src/components/MixExperience.tsx', 'src/components/mix-experience.css',
  'src/lib/mix-physics.ts', 'src/lib/mix-sauce.ts', 'src/lib/mix-affine.ts', 'src/lib/mix-render.ts',
  'src/config/seasoning-bottles.json', 'scripts/media/bake-mix-video.mjs',
  ...['amber', 'ruby', 'citrus', 'gold'].map(name => `public/images/mix/bear-${name}.webp`),
  ...['chamoy', 'tajin', 'limon'].map(name => `public/images/mix/bottle-${name}.webp`),
  'public/images/ositos-bolsa.webp',
]
const hash = createHash('sha256').update(Buffer.concat(await Promise.all(sources.map(path => readFile(path))))).digest('hex').slice(0, 16)
const url = `/images/mix/preview-${hash}.mp4`, poster = `/images/mix/preview-${hash}.webp`
const fps = 60, duration = 15_000, width = 1080, height = 918
await mkdir(output, { recursive: true })
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' }
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const file = resolve(site, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (!file.startsWith(`${site}/`) && !file.startsWith(`${site}\\`)) { response.writeHead(404).end(); return }
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream')
    response.end(await readFile(file))
  } catch { response.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: true })
let encoder
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 3, reducedMotion: 'no-preference' })
  await page.goto(`http://127.0.0.1:${server.address().port}`)
  const film = page.locator('.mix-film')
  await film.scrollIntoViewIfNeeded()
  await page.waitForFunction(() => {
    const film = document.querySelector('.mix-film')
    return film.dataset.sceneReady === 'true' && film.dataset.renderer === 'svg'
      && film.getAnimations({ subtree: true }).some(animation => animation.playState === 'running' && animation.currentTime > 100)
  })
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})))
    await Promise.all([...document.querySelectorAll('svg image')].map(async element => {
      const image = new Image()
      image.src = element.getAttribute('href') || ''
      if (image.src) await image.decode()
    }))
    document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime = 0 })
  })
  await page.addStyleTag({ content: '.mix-film{width:408px!important}.mix-stage{box-sizing:content-box!important;width:360px!important;height:306px!important;background:#faf7fc!important;border:0!important;border-radius:0!important}.film-captions{visibility:hidden!important}' })
  const stage = page.locator('.mix-stage')
  await stage.scrollIntoViewIfNeeded()
  const bounds = await stage.boundingBox()
  const clip = { x: Math.round(bounds.x), y: Math.round(bounds.y), width: 360, height: 306 }
  const seek = time => film.evaluate(async (element, time) => {
    element.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = time })
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }, time)
  encoder = spawn(args.ffmpeg || process.env.FFMPEG_PATH || 'ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-i', 'pipe:0',
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-profile:v', 'high', '-level:v', '4.2',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-g', String(fps * 2), resolve(`public${url}`),
  ], { stdio: ['pipe', 'ignore', 'inherit'] })
  const completed = new Promise((resolve, reject) => {
    encoder.on('error', reject)
    encoder.on('close', code => code === 0 ? resolve() : reject(new Error(`ffmpeg exited with ${code}`)))
  })
  void completed.catch(() => {})
  // Handle a missing encoder immediately, before trying to write hundreds of frames.
  await once(encoder, 'spawn')
  for (let frame = 0; frame < fps * duration / 1000; frame++) {
    await seek(frame * 1000 / fps)
    const png = await page.screenshot({ clip, type: 'png', animations: 'allow', scale: 'device' })
    if (frame === fps * 7.5) await sharp(png).webp({ quality: 90 }).toFile(resolve(`public${poster}`))
    if (encoder.exitCode !== null) await completed
    if (!encoder.stdin.write(png)) await once(encoder.stdin, 'drain')
    if (frame % 120 === 0) console.log(`Baked ${frame}/900 frames`)
  }
  encoder.stdin.end()
  await completed
  const bytes = (await stat(resolve(`public${url}`))).size
  await writeFile('src/config/mix-video.json', `${JSON.stringify({ url, poster, hash, fps, duration, width, height, bytes }, null, 2)}\n`)
  console.log(`Baked ${fps} fps mobile recipe: ${bytes} bytes, ${width} × ${height}.`)
} finally {
  encoder?.kill()
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
