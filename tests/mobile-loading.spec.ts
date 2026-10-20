import { expect, test } from '@playwright/test'

test('mobile landing reuses its responsive preload and defers recipe downloads', async ({ page, isMobile }) => {
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
  expect(source.src).toMatch(/\/images\/responsive\/bolsa-mix-/)
  expect(requests.filter(path => path === source.src)).toHaveLength(1)
  expect(requests).not.toContain('/images/bolsa-mix.webp')
  expect(requests).not.toContain('/images/uvarindas.webp')
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
  await page.route('**/images/responsive/ositos-bolsa-*.webp', route => route.abort())
  await page.goto('/')
  const image = page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).locator('img')
  await image.scrollIntoViewIfNeeded()
  await expect(image).toHaveAttribute('src', '/images/placeholder.svg')
  await expect(image).not.toHaveAttribute('srcset')
  await expect.poll(() => image.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
})
