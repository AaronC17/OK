/** Local media inspection and poster optimization only. No API requests or credentials. */
import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const round = process.argv[2] ?? 'onkys-gummies-01'
if (!['onkys-gummies-01', 'onkys-gummies-02'].includes(round)) throw new Error('Unknown media round.')
const assetDir = `public/brand-media/${round}`
const manifestPath = `${assetDir}/manifest.json`
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (!manifest.image) throw new Error('No local reference image is available.')
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 960 } })
  await page.goto('http://localhost:5173')
  const data = await page.evaluate(async source => {
    const image = new Image()
    image.src = source
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = Math.min(1200, image.naturalWidth)
    canvas.height = Math.round(image.naturalHeight * canvas.width / image.naturalWidth)
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
    return { width: canvas.width, height: canvas.height, dataUrl: canvas.toDataURL('image/webp', .84) }
  }, manifest.image)
  const image = Buffer.from(data.dataUrl.split(',')[1], 'base64')
  if (image.subarray(0,4).toString() !== 'RIFF' || image.subarray(8,12).toString() !== 'WEBP') throw new Error('The optimized poster is not WebP.')
  await writeFile(`${assetDir}/poster.webp`, image)
  console.log(`Local poster: ${data.width} × ${data.height}, ${image.length} bytes.`)
  manifest.poster = `/brand-media/${round}/poster.webp`
  try {
    await access(`${assetDir}/hero-web.mp4`)
    const optimized = await readFile(`${assetDir}/hero-web.mp4`)
    manifest.webVideo = `/brand-media/${round}/hero-web.mp4`
    manifest.webVideoBytes = optimized.length
    console.log(`Web video: ${optimized.length} bytes.`)
  } catch { /* Keep the original video when no optimized derivative exists. */ }
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8')

  if (manifest.video) {
    const inspection = await page.evaluate(async source => {
      const video = document.createElement('video')
      video.muted = true
      video.preload = 'auto'
      video.src = source
      document.body.append(video)
      await new Promise((resolve, reject) => {
        video.addEventListener('loadeddata', resolve, { once: true })
        video.addEventListener('error', () => reject(new Error('Local video could not be decoded.')), { once: true })
      })
      const frames = []
      for (const fraction of [.03, .25, .55, .9]) {
        const seconds = Number((video.duration * fraction).toFixed(2))
        await new Promise(resolve => {
          video.addEventListener('seeked', resolve, { once: true })
          video.currentTime = Math.min(seconds, video.duration - .1)
        })
        const canvas = document.createElement('canvas')
        canvas.width = 800
        canvas.height = Math.round(video.videoHeight * 800 / video.videoWidth)
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
        frames.push({ seconds, dataUrl: canvas.toDataURL('image/png') })
      }
      const metadata = { duration: video.duration, width: video.videoWidth, height: video.videoHeight, frames }
      video.remove()
      return metadata
    }, manifest.webVideo ?? manifest.video)
    await mkdir('test-results', { recursive: true })
    for (const frame of inspection.frames) await writeFile(`test-results/${round}-frame-${frame.seconds}.png`, Buffer.from(frame.dataUrl.split(',')[1], 'base64'))
    console.log(`Local video decoded: ${inspection.width} × ${inspection.height}, ${inspection.duration.toFixed(2)} seconds. Four review frames saved.`)
  }
} finally { await browser.close() }
