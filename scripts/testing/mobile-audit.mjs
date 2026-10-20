import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// Run against a production preview, not Vite's development server.
// node scripts/testing/mobile-audit.mjs http://127.0.0.1:4173 test-results/mobile-audit
const url = process.argv[2] || 'http://127.0.0.1:4173'
const output = resolve(process.argv[3] || 'test-results/mobile-audit')
const runs = 3
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL || 'msedge' })
const results = []
try {
  for (let run = 0; run < runs; run++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
    try {
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      const cdp = await context.newCDPSession(page)
      const transfers = new Map()
      cdp.on('Network.dataReceived', event => transfers.set(event.requestId, (transfers.get(event.requestId) || 0) + event.encodedDataLength))
      cdp.on('Network.loadingFinished', event => transfers.set(event.requestId, event.encodedDataLength))
      await cdp.send('Network.enable')
      await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1_600_000 / 8, uploadThroughput: 750_000 / 8, connectionType: 'cellular4g' })
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
      await page.addInitScript(() => {
        window.__mobileAudit = { lcp: 0, shifts: [], longTasks: [] }
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) window.__mobileAudit.lcp = entry.startTime
        }).observe({ type: 'largest-contentful-paint', buffered: true })
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__mobileAudit.shifts.push({ time: entry.startTime, value: entry.value })
        }).observe({ type: 'layout-shift', buffered: true })
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) window.__mobileAudit.longTasks.push(entry.duration)
        }).observe({ type: 'longtask', buffered: true })
      })
      await page.goto(url, { waitUntil: 'load' })
      await page.locator('.hero-photo').waitFor()
      await page.evaluate(() => document.fonts.ready)
      await page.waitForFunction(() => document.querySelector('.hero-photo')?.complete)
      // Fixed observation window also captures speculative below-the-fold loads.
      await page.waitForTimeout(5000)
      const result = await page.evaluate(() => {
        const data = window.__mobileAudit
        let cls = 0, windowScore = 0, start = 0, last = 0
        for (const shift of data.shifts) {
          if (shift.time - last > 1000 || shift.time - start > 5000) { windowScore = 0; start = shift.time }
          windowScore += shift.value
          last = shift.time
          cls = Math.max(cls, windowScore)
        }
        const resources = performance.getEntriesByType('resource').map(entry => ({ path: new URL(entry.name).pathname, bytes: entry.encodedBodySize, transfer: entry.transferSize, type: entry.initiatorType }))
        const hero = document.querySelector('.hero-photo')
        return {
          fcpMs: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0),
          lcpMs: Math.round(data.lcp),
          cls: Number(cls.toFixed(4)),
          longTaskBlockingMs: Math.round(data.longTasks.reduce((sum, duration) => sum + Math.max(0, duration - 50), 0)),
          resourceBytes: resources.reduce((sum, resource) => sum + resource.bytes, 0),
          requests: resources.length,
          domElements: document.querySelectorAll('*').length,
          hero: { src: hero.currentSrc, width: hero.naturalWidth, displayedWidth: Math.round(hero.getBoundingClientRect().width) },
          overflow: document.documentElement.scrollWidth > innerWidth,
          resources,
        }
      })
      results.push({ ...result, networkBytes: [...transfers.values()].reduce((sum, bytes) => sum + bytes, 0), errors })
      if (run === 0) await page.screenshot({ path: resolve(output, 'mobile-first-screen.png') })
    } finally { await context.close() }
  }
} finally { await browser.close() }
const median = key => results.map(result => result[key]).sort((a, b) => a - b)[Math.floor(runs / 2)]
const summary = Object.fromEntries(['fcpMs', 'lcpMs', 'cls', 'longTaskBlockingMs', 'resourceBytes', 'networkBytes', 'requests', 'domElements'].map(key => [key, median(key)]))
const report = { url, conditions: { width: 390, height: 844, dpr: 2, cpuSlowdown: 4, downloadMbps: 1.6, latencyMs: 150, coldCache: true, runs }, summary, results }
await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ output, summary }, null, 2))
