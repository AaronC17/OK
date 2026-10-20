import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { stat, mkdir, writeFile } from 'node:fs/promises'
import { resolve, extname, join } from 'node:path'
import { chromium } from 'playwright'
import { mockAnimationOrder } from '../../tests/helpers/animation-order.ts'

// Compare two frozen production builds. This measures emulated main-thread
// cadence/CPU and decoder counters, not the FPS of a physical phone's screen.
const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, ...value] = arg.replace(/^--/, '').split('=')
  return [key, value.join('=')]
}))
if (!args.before || !args.after || !args.output) throw new Error('Supply --before, --after and --output directories.')
const output = resolve(args.output)
await mkdir(output, { recursive: true })
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.png': 'image/png' }
const serve = async directory => {
  const site = resolve(directory)
  const server = createServer(async (request, response) => {
    try {
      const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      const file = resolve(site, `.${path === '/' ? '/index.html' : path}`)
      if (!file.startsWith(`${site}/`) && !file.startsWith(`${site}\\`)) { response.writeHead(404).end(); return }
      const { size } = await stat(file)
      const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || '')
      const start = range ? Number(range[1]) : 0, end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1
      response.writeHead(range ? 206 : 200, {
        'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1, ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
      })
      createReadStream(file, { start, end }).pipe(response)
    } catch { response.writeHead(404).end() }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  return { url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise(resolve => server.close(resolve)) }
}
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: true })
const results = { browser: browser.version(), conditions: { viewport: '390x844', dpr: 3, cpuSlowdown: 4, network: 'local, unthrottled', duration: 15000 }, runs: [] }
const metrics = async cdp => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(item => [item.name, item.value]))
try {
  for (let run = 1; run <= Number(args.runs || 2); run++) {
    for (const version of ['before', 'after']) {
      const server = await serve(args[version])
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 })
      try {
        const page = await context.newPage(), errors = []
        page.on('pageerror', error => errors.push(error.message))
        await mockAnimationOrder(page)
        const cdp = await context.newCDPSession(page)
        await cdp.send('Performance.enable')
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
        await page.goto(server.url)
        const film = page.locator('.mix-film')
        await film.scrollIntoViewIfNeeded()
        await page.waitForFunction(() => document.querySelector('.mix-film').dataset.sceneReady === 'true')
        await page.waitForTimeout(600)
        for (const scene of ['recipe', 'truck']) {
          if (scene === 'truck') {
            await page.getByRole('button', { name: 'Abrir carrito, 0 artículos' }).click()
            await page.locator('.sinpe-transit-card').waitFor({ state: 'visible' })
            await page.waitForTimeout(600)
          }
          const before = await metrics(cdp)
          const sample = await page.evaluate(async () => {
            const video = document.querySelector('.mix-video'), qualityBefore = video?.getVideoPlaybackQuality()
            const gaps = [], start = performance.now()
            let previous = start
            await new Promise(resolve => {
              const tick = time => {
                gaps.push(time - previous); previous = time
                if (time - start < 15000) requestAnimationFrame(tick)
                else resolve()
              }
              requestAnimationFrame(tick)
            })
            gaps.sort((a, b) => a - b)
            const qualityAfter = video?.getVideoPlaybackQuality()
            return {
              samples: gaps.length, p50: gaps[Math.floor(gaps.length * .5)], p95: gaps[Math.floor(gaps.length * .95)], gapsOver50: gaps.filter(gap => gap > 50).length,
              video: qualityAfter ? { decoded: qualityAfter.totalVideoFrames - qualityBefore.totalVideoFrames, dropped: qualityAfter.droppedVideoFrames - qualityBefore.droppedVideoFrames, paused: video.paused } : null,
            }
          })
          const after = await metrics(cdp)
          const cpu = Object.fromEntries(['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].map(key => [key, Math.round((after[key] - before[key]) * 1000)]))
          const result = { version, run, scene, ...sample, cpu, errors: [...errors] }
          results.runs.push(result)
          console.log(JSON.stringify(result))
          await writeFile(join(output, 'metrics.json'), JSON.stringify(results, null, 2))
          if (run === 1) await page.locator(scene === 'recipe' ? '.mix-film' : '.sinpe-transit-card').screenshot({ path: join(output, `${version}-${scene}.png`) })
        }
      } finally {
        await context.close()
        await server.close()
      }
    }
  }
} finally { await browser.close() }
