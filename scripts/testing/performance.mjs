import { createServer } from 'node:http'
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises'
import { resolve, join, extname } from 'node:path'
import { chromium } from 'playwright'

// Benchmark a production build, without touching the shop API or real orders.
// node scripts/testing/performance.mjs --site=<build> --output=<directory> --runs=3
const args = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')))
if (!args.site || !args.output) throw new Error('Supply --site and --output (absolute paths recommended).')
const site = resolve(args.site), output = resolve(args.output)
await mkdir(output, { recursive: true })
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png', '.json': 'application/json' }
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    let file = resolve(site, `.${pathname}`)
    if (!file.startsWith(`${site}\\`) && !file.startsWith(`${site}/`)) file = join(site, 'index.html')
    if (!(await stat(file).catch(() => null))?.isFile()) file = join(site, 'index.html')
    response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream')
    response.end(await readFile(file))
  } catch { response.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const url = `http://127.0.0.1:${server.address().port}`
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge', headless: true })
const results = { browser: browser.version(), conditions: { mobile: '390x844, DPR 1, touch, CPU 4x, 1.6 Mbps / 750 Kbps, RTT 150 ms', desktop: '1440x1000, DPR 1, CPU 1x, unthrottled' }, runs: [] }

async function instrument(page) {
  await page.addInitScript(() => {
    window.__perf = { longTasks: [], lcp: 0, cls: 0, animations: [] }
    new PerformanceObserver(list => list.getEntries().forEach(entry => window.__perf.longTasks.push({ start: entry.startTime, duration: entry.duration }))).observe({ type: 'longtask', buffered: true })
    new PerformanceObserver(list => list.getEntries().forEach(entry => { window.__perf.lcp = entry.startTime })).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver(list => list.getEntries().forEach(entry => { if (!entry.hadRecentInput) window.__perf.cls += entry.value })).observe({ type: 'layout-shift', buffered: true })
    const animate = Element.prototype.animate
    Element.prototype.animate = function (...args) {
      const start = performance.now()
      const result = animate.apply(this, args)
      window.__perf.animations.push({ duration: performance.now() - start, keyframes: args[0]?.length || 0 })
      return result
    }
  })
}

const metricDelta = (a, b) => Object.fromEntries(['TaskDuration', 'ScriptDuration', 'LayoutDuration', 'RecalcStyleDuration'].map(name => [name, (b[name] - a[name]) * 1000]))
const metrics = async cdp => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(item => [item.name, item.value]))

async function captureVisuals(page, cdp, device) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  // Start a fresh scene: hidden SVG paths can retain a previous cycle's state.
  await page.reload({ waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.locator('.mix-film').scrollIntoViewIfNeeded()
  await page.mouse.move(0, 0)
  await page.waitForFunction(() => {
    const animations = document.querySelector('.mix-film').getAnimations({ subtree: true })
    return animations.length > 0 && document.querySelector('.mix-film').dataset.sceneReady !== 'false' && animations.every(animation => !animation.pending)
  })
  // Prime the same compositor state in both versions before seeking: otherwise
  // a never-played SVG rotation may be rasterized differently from a paused one.
  await page.locator('.mix-film').evaluate(async root => {
    const animations = root.getAnimations({ subtree: true })
    animations.forEach(animation => { animation.pause(); animation.currentTime = 0 })
    const svg = animations.filter(animation => animation.effect?.target instanceof SVGElement)
    svg.forEach(animation => animation.play())
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    svg.forEach(animation => { animation.pause(); animation.currentTime = 0 })
  })
  await page.evaluate(async () => {
    await Promise.all([...document.images].map(img => img.decode().catch(() => {})))
    await Promise.all([...document.querySelectorAll('svg image')].map(image => new Promise(resolve => {
      const img = new Image(); img.onload = img.onerror = resolve; img.src = image.getAttribute('href')
    })))
  })
  const geometry = []
  for (const time of (args.phases ? args.phases.split(',').map(Number) : [0, 1500, 2500, 3500, 7500, 12500])) {
    await page.evaluate(time => {
      document.getAnimations().forEach(animation => {
        const end = Number(animation.effect?.getComputedTiming().endTime)
        animation.pause()
        animation.currentTime = animation.effect?.target?.closest('.mix-film') ? time : Number.isFinite(end) ? end : 0
      })
    }, time)
    await page.waitForTimeout(200)
    geometry.push({ time, elements: await page.locator('.mix-film').evaluate(root => {
      const bounds = root.getBoundingClientRect()
      return [...root.querySelectorAll('.film-top, .ingredient-photo, .ingredient-photo img, .mix-stage, .bowl-illustration, .tajin-shaker, .limon-bottle, .film-captions, .film-step')].map(element => {
        const rect = element.getBoundingClientRect(), style = getComputedStyle(element)
        return { class: element.getAttribute('class'), x: rect.x - bounds.x, y: rect.y - bounds.y, width: rect.width, height: rect.height, transform: style.transform, opacity: style.opacity, borderColor: style.borderColor, fontFamily: style.fontFamily, fontSize: style.fontSize }
      })
    }) })
    await page.locator('.mix-film').screenshot({ path: join(output, `${device}-film-${time}.png`) })
  }
  await writeFile(join(output, `${device}-geometry.json`), JSON.stringify(geometry, null, 2))
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(350)
  await page.screenshot({ path: join(output, `${device}-full.png`), fullPage: true })
  await page.screenshot({ path: join(output, `${device}-hero.png`) })
  // Fixtures for visual checks only: never create orders or access real data.
  await page.route('**/api/checkout', route => route.fulfill({ json: { csrfToken: 'visual-test', sinpe: null, demo: true, maxReceiptBytes: 8_000_000 } }))
  await page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).click()
  await page.mouse.move(0, 0)
  await page.locator('.product-dialog[open]').waitFor()
  await page.waitForTimeout(350)
  await page.locator('.product-dialog').screenshot({ path: join(output, `${device}-product.png`) })
  await page.getByRole('button', { name: 'Añadir al carrito' }).click()
  await page.getByRole('button', { name: 'Abrir carrito, 1 artículos' }).click()
  await page.mouse.move(0, 0)
  await page.locator('.cart-drawer[open]').waitFor()
  await page.waitForTimeout(350)
  await page.locator('.cart-drawer').screenshot({ path: join(output, `${device}-cart.png`) })
  await page.getByRole('button', { name: 'Cerrar carrito' }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.reload({ waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.locator('.mix-film').scrollIntoViewIfNeeded()
  await page.waitForTimeout(350)
  await page.locator('.mix-film').screenshot({ path: join(output, `${device}-reduced.png`) })
}

try {
  for (const device of (args.device ? [args.device] : ['mobile', 'desktop'])) {
    for (let run = 0; run < Number(args.captureOnly ? 1 : args.runs || 3); run++) {
      const context = await browser.newContext({ viewport: device === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: device === 'mobile', hasTouch: device === 'mobile', deviceScaleFactor: Number(args.dpr || 1) })
      const page = await context.newPage()
      page.setDefaultTimeout(120_000)
      page.setDefaultNavigationTimeout(120_000)
      await instrument(page)
      const cdp = await context.newCDPSession(page)
      await cdp.send('Performance.enable')
      await cdp.send('Network.enable')
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      if (args.captureOnly) {
        await page.goto(url, { waitUntil: 'load' })
        await captureVisuals(page, cdp, device)
        if (errors.length) throw new Error(errors.join('\n'))
        await context.close()
        continue
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: device === 'mobile' ? 4 : 1 })
      if (device === 'mobile') await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8 })
      if (run === 0 && args.profile) {
        await cdp.send('Profiler.enable')
        await cdp.send('Profiler.start')
      }
      await page.goto(url, { waitUntil: 'load' })
      await page.locator('.hero-photo').waitFor({ state: 'attached' }).catch(async error => {
        console.error(JSON.stringify({ errors, hero: await page.evaluate(() => [...document.querySelectorAll('.hero, .hero-visual, .hero-photo')].map(el => ({ html: el.outerHTML.slice(0, 300), rect: el.getBoundingClientRect().toJSON(), display: getComputedStyle(el).display, height: getComputedStyle(el).height, visibility: getComputedStyle(el).visibility }))) }))
        throw error
      })
      await page.evaluate(() => document.fonts.ready)
      // Include delayed main-thread work; consistently use the same settle interval.
      await page.waitForTimeout(3000)
      if (args.debug) console.log(await page.evaluate(() => [...document.querySelectorAll('.hero, .hero-visual, .hero-photo, .mix-film')].map(el => ({ class: el.className, rect: el.getBoundingClientRect().toJSON(), visibility: getComputedStyle(el).visibility }))))
      const load = await page.evaluate(() => ({ ...window.__perf, navigation: performance.getEntriesByType('navigation')[0].toJSON(), resources: performance.getEntriesByType('resource').map(({ name, initiatorType, encodedBodySize, decodedBodySize, transferSize }) => ({ name: new URL(name).pathname, initiatorType, encodedBodySize, decodedBodySize, transferSize })), nodes: document.querySelectorAll('*').length, animationCount: document.getAnimations().length }))
      load.cpu = await metrics(cdp)
      if (run === 0 && args.profile) {
        const { profile } = await cdp.send('Profiler.stop')
        await writeFile(join(output, `${device}-load.cpuprofile`), JSON.stringify(profile))
      }
      // Measure one complete, unmodified 15-second recipe cycle while scrolling
      // gently around the same position. rAF gaps measure main-thread cadence,
      // not compositor FPS or the performance of a physical phone.
      await page.locator('.mix-film').scrollIntoViewIfNeeded()
      await page.waitForFunction(() => {
        const film = document.querySelector('.mix-film')
        return film.getAnimations({ subtree: true }).length > 0 && film.dataset.sceneReady !== 'false'
      })
      await page.waitForTimeout(300)
      if (run === 0 && args.profile) await cdp.send('Profiler.start')
      const a = await metrics(cdp)
      const animation = await page.evaluate(async () => {
        const start = performance.now(), y = scrollY, gaps = [], tasksBefore = window.__perf.longTasks.length
        const initialTime = Number(document.querySelector('.mix-film').getAnimations({ subtree: true })[0]?.currentTime || 0)
        const falling = [], mixing = []
        let previous = start
        await new Promise(resolve => {
          function tick(now) {
            gaps.push(now - previous); previous = now
            const phase = (initialTime + now - start) % 15000
            if (phase >= 3200 && phase <= 4500) falling.push(gaps[gaps.length - 1])
            if (phase >= 5000 && phase <= 10000) mixing.push(gaps[gaps.length - 1])
            window.scrollTo({ top: y + Math.sin((now - start) / 800) * 40, behavior: 'instant' })
            if (now - start < 15000) requestAnimationFrame(tick)
            else resolve()
          }
          requestAnimationFrame(tick)
        })
        gaps.sort((a, b) => a - b)
        const summarize = samples => {
          samples.sort((a, b) => a - b)
          return { samples: samples.length, p95Gap: samples[Math.floor(samples.length * .95)] || null, gapsOver50: samples.filter(gap => gap > 50).length }
        }
        return { frames: gaps.length, p95Gap: gaps[Math.floor(gaps.length * .95)], maxGap: Math.max(...gaps), gapsOver50: gaps.filter(gap => gap > 50).length, falling: summarize(falling), mixing: summarize(mixing), longTasks: window.__perf.longTasks.slice(tasksBefore) }
      })
      animation.cpu = metricDelta(a, await metrics(cdp))
      if (run === 0 && args.profile) {
        const { profile } = await cdp.send('Profiler.stop')
        await writeFile(join(output, `${device}-animation.cpuprofile`), JSON.stringify(profile))
      }
      const result = { device, run: run + 1, errors, load, animation }
      results.runs.push(result)
      await writeFile(join(output, 'metrics.json'), JSON.stringify(results, null, 2))
      console.log(JSON.stringify({ device, run: run + 1, lcp: load.lcp, loadBlockingMs: load.longTasks.reduce((sum, task) => sum + Math.max(0, task.duration - 50), 0), longestLoadTask: Math.max(0, ...load.longTasks.map(task => task.duration)), initialJS: load.resources.filter(resource => resource.initiatorType === 'script' || resource.name.endsWith('.js')).reduce((sum, resource) => sum + resource.encodedBodySize, 0), nodes: load.nodes, animation: { frames: animation.frames, p95Gap: animation.p95Gap, gapsOver50: animation.gapsOver50, cpu: animation.cpu } }))
      if (run === 0 && args.capture) await captureVisuals(page, cdp, device)
      await context.close()
    }
  }
  await writeFile(join(output, 'metrics.json'), JSON.stringify(results, null, 2))
} finally {
  await browser.close()
  await new Promise(resolve => server.close(resolve))
}
