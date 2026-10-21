import { expect, test } from '@playwright/test'

test('mobile landing reuses its responsive preload and defers recipe downloads', async ({ page, isMobile, browserName }) => {
  test.skip(!isMobile)
  const requests: string[] = []
  const workers: string[] = []
  page.on('request', request => requests.push(new URL(request.url()).pathname))
  page.on('worker', worker => workers.push(worker.url()))
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const photo = page.locator('.hero-photo')
  const source = await photo.evaluate((image: HTMLImageElement) => ({ src: new URL(image.currentSrc).pathname, loaded: image.complete && image.naturalWidth > 0 }))
  expect(source.loaded).toBe(true)
  // Windows WebKit has no AVIF decoder; it selects WebP natively via <picture>.
  expect(source.src).toMatch(browserName === 'webkit' && process.platform === 'win32'
    ? /\/images\/responsive\/bolsa-mix-.*\.webp$/ : /\/images\/responsive\/bolsa-mix-.*\.avif$/)
  expect(requests.filter(path => path === source.src)).toHaveLength(1)
  expect(requests).not.toContain('/images/bolsa-mix.webp')
  expect(requests).not.toContain('/images/uvarindas.webp')
  expect(requests.filter(path => /\/images\/responsive\/uvarindas-/.test(path))).toEqual([])
  expect(requests.filter(path => /dm-serif-display-latin/.test(path))).toEqual([])
  expect(await page.locator('.mix-film').evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0)
  expect(requests.filter(path => /\/images\/mix\/|\/assets\/(GummyBowl|mix-physics|mix-motion|mix-simulation)/.test(path))).toEqual([])
  expect(workers).toEqual([])
  await expect(page.locator('.mix-video')).not.toHaveAttribute('src')

  await page.locator('.mix-film').scrollIntoViewIfNeeded()
  await expect.poll(() => page.locator('.mix-video').evaluate((video: HTMLVideoElement) => !video.paused && video.currentTime > 0)).toBe(true)
})

test('data saving keeps the recipe still until the visitor requests playback', async ({ page, isMobile }) => {
  test.skip(!isMobile)
  await page.addInitScript(() => {
    const connection = new EventTarget()
    Object.defineProperty(connection, 'saveData', { value: true })
    Object.defineProperty(navigator, 'connection', { value: connection, configurable: true })
  })
  const movies: string[] = []
  page.on('request', request => { if (request.url().endsWith('.mp4')) movies.push(request.url()) })
  await page.goto('/')
  await page.locator('.mix-film').scrollIntoViewIfNeeded()
  const play = page.getByRole('button', { name: 'Reproducir animación' })
  await expect(play).toBeVisible()
  await expect(page.locator('.mix-film')).toHaveAttribute('data-static', 'true')
  await expect(page.locator('.mix-video')).not.toHaveAttribute('src')
  expect(movies).toEqual([])
  await play.click()
  await expect(page.locator('.mix-film')).toHaveAttribute('data-static', 'false')
  await expect.poll(() => page.locator('.mix-video').evaluate((video: HTMLVideoElement) => !video.paused && video.currentTime > 0)).toBe(true)
})

test('a failed responsive photograph displays the image fallback', async ({ page }) => {
  await page.route(/\/images\/responsive\/ositos-bolsa-.*\.(avif|webp)$/, route => route.abort())
  await page.goto('/')
  const image = page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).locator('img')
  await image.scrollIntoViewIfNeeded()
  await expect(image).toHaveAttribute('src', '/images/placeholder.svg')
  await expect(image).not.toHaveAttribute('srcset')
  await expect.poll(() => image.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
})

test('a failed AVIF loads its WebP fallback and nearby products still load on scroll', async ({ page }) => {
  await page.route('**/images/responsive/ositos-bolsa-*.avif', route => route.abort())
  await page.goto('/')
  const image = page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).locator('img')
  await image.scrollIntoViewIfNeeded()
  await expect.poll(() => image.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0 && image.currentSrc.endsWith('.webp'))).toBe(true)
  const grapes = page.locator('#uvarindas .card-photo img')
  await grapes.scrollIntoViewIfNeeded()
  await expect.poll(() => grapes.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
})

test('deferred sections support direct links and returning to the catalog without layout jumps', async ({ page, isMobile }) => {
  test.skip(!isMobile)
  await page.goto('/?qa=sections#como-pedir')
  const how = page.locator('#como-pedir')
  await expect(how).toBeInViewport()
  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await page.getByRole('link', { name: 'Uvarindas', exact: true }).click()
  await expect(page.locator('#uvarindas')).toBeFocused()
  await expect(page.locator('#uvarindas .card-photo')).toBeInViewport()
  const image = page.locator('#uvarindas .card-photo img')
  await expect.poll(() => image.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  await page.locator('.site-footer').scrollIntoViewIfNeeded()
  await page.getByRole('link', { name: 'Gomitas enchiladas', exact: true }).click()
  await expect(page.locator('#gomitas')).toBeFocused()
  await expect.poll(() => page.locator('#gomitas').evaluate(element => {
    const rect = element.getBoundingClientRect()
    return rect.top >= document.querySelector('.site-header')!.getBoundingClientRect().bottom - 1 && rect.top < innerHeight / 2
  })).toBe(true)
  expect(new URL(page.url()).search).toBe('?qa=sections')
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
})
