import { test, expect } from '@playwright/test'
import { mockAnimationOrder } from './helpers/animation-order.ts'

test('mobile recipe decodes natively, stays in sync and resumes after an overlay or scrolling', async ({ page, isMobile, browserName }, testInfo) => {
  test.skip(!isMobile, 'The desktop recipe retains its SVG renderer.')
  const workers: string[] = [], resources: string[] = [], errors: string[] = []
  page.on('worker', worker => workers.push(worker.url()))
  page.on('request', request => resources.push(request.url()))
  page.on('pageerror', error => errors.push(error.message))
  await mockAnimationOrder(page)
  await page.goto('/')
  const film = page.locator('.mix-film'), video = film.locator('video')
  await film.scrollIntoViewIfNeeded()
  await expect(film).toHaveAttribute('data-renderer', 'video')
  await expect.poll(() => video.evaluate(element => !element.paused && element.currentTime > .2)).toBe(true)
  await expect(film).toHaveAttribute('data-scene-ready', 'true')
  const media = await video.evaluate(element => ({ width: element.videoWidth, height: element.videoHeight, duration: element.duration, inline: element.playsInline, muted: element.muted }))
  expect(media).toMatchObject({ duration: 15, inline: true, muted: true })
  // Windows WebKit's mock decoder reports layout dimensions, not encoded pixels.
  if (browserName !== 'webkit' || process.platform !== 'win32') expect(media).toMatchObject({ width: 1080, height: 918 })
  expect(workers).toEqual([])
  expect(resources.filter(url => /bear-.*\.webp|motion-.*\.bin/.test(url))).toEqual([])

  for (const time of [3.6, 7.5, 12.5, 14.85]) {
    await video.evaluate((element, time) => { element.currentTime = time }, time)
    await expect.poll(() => film.evaluate(element => {
      const video = element.querySelector('video')!
      const animations = element.getAnimations({ subtree: true })
      return !video.seeking && animations.length > 0 && animations.every(animation =>
        animation.playState === 'running' && Math.abs(Number(animation.currentTime) % 15000 - video.currentTime * 1000) < 160)
    })).toBe(true)
    if (time === 7.5) await film.screenshot({ path: testInfo.outputPath('mobile-recipe.png') })
  }
  await expect.poll(() => video.evaluate(element => element.currentTime < 2)).toBe(true)

  // Open the actual order overlay while the recipe is visible underneath it.
  await page.getByRole('button', { name: 'Abrir carrito, 0 artículos' }).click()
  await expect(page.locator('.sinpe-transit-card')).toBeVisible()
  await expect.poll(() => video.evaluate(element => element.paused)).toBe(true)
  const pausedAt = await video.evaluate(element => element.currentTime)
  await expect.poll(() => film.evaluate(element => element.getAnimations({ subtree: true }).every(animation => animation.playState === 'paused'))).toBe(true)
  await page.getByRole('button', { name: 'Cerrar carrito' }).click()
  await expect.poll(() => video.evaluate(element => !element.paused && element.currentTime > .1)).toBe(true)
  expect(await video.evaluate(element => element.currentTime)).toBeGreaterThanOrEqual(pausedAt)

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect.poll(() => video.evaluate(element => element.paused)).toBe(true)
  await film.scrollIntoViewIfNeeded()
  await expect.poll(() => video.evaluate(element => !element.paused)).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect.poll(() => video.evaluate(element => element.paused)).toBe(true)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect.poll(() => video.evaluate(element => !element.paused)).toBe(true)
  await expect.poll(() => film.evaluate(element => element.getAnimations({ subtree: true }).every(animation => animation.playState === 'running'))).toBe(true)
  expect(errors).toEqual([])
})

test('mobile recipe offers a working tap-to-play recovery when autoplay is blocked', async ({ page, isMobile }) => {
  test.skip(!isMobile)
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play
    let blocked = false
    HTMLMediaElement.prototype.play = function () {
      if (this.classList.contains('mix-video') && !blocked) {
        blocked = true
        return Promise.reject(new DOMException('Autoplay blocked for test', 'NotAllowedError'))
      }
      return play.call(this)
    }
  })
  await page.goto('/')
  await page.locator('.mix-film').scrollIntoViewIfNeeded()
  const play = page.getByRole('button', { name: 'Reproducir animación' })
  await expect(play).toBeVisible()
  await play.click()
  await expect(play).toBeHidden()
  await expect.poll(() => page.locator('.mix-video').evaluate((element: HTMLVideoElement) => !element.paused && element.currentTime > 0)).toBe(true)
})

test('reduced-motion mobile does not request the animation movie or physics', async ({ page, isMobile }) => {
  test.skip(!isMobile)
  const resources: string[] = []
  await page.emulateMedia({ reducedMotion: 'reduce' })
  page.on('request', request => resources.push(request.url()))
  await page.goto('/')
  await page.locator('.mix-film').scrollIntoViewIfNeeded()
  await expect(page.locator('.mix-film')).toHaveAttribute('data-static', 'true')
  expect(resources.filter(url => /preview-.*\.mp4|mix-simulation|motion-.*\.bin/.test(url))).toEqual([])
  await expect(page.locator('.mix-video')).not.toHaveAttribute('src')
})

test('delivery loops pause inside a closed cart and honor reduced motion', async ({ page }, testInfo) => {
  await mockAnimationOrder(page)
  await page.goto('/')
  await page.getByRole('button', { name: 'Abrir carrito, 0 artículos' }).click()
  const card = page.locator('.sinpe-transit-card')
  await expect(card).toBeVisible()
  await expect(card).toHaveAttribute('data-motion-paused', 'false')
  const wheel = card.locator('.transit-wheel').first()
  await expect.poll(() => wheel.evaluate(element => Number(element.getAnimations()[0]?.currentTime) > 100)).toBe(true)
  await card.screenshot({ path: testInfo.outputPath('delivery-truck.png') })
  await page.getByRole('button', { name: 'Cerrar carrito' }).click()
  await expect(card).toHaveAttribute('data-motion-paused', 'true')
  // display:none on the closed dialog may remove CSS animation objects entirely.
  await expect.poll(() => card.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0)
  await page.getByRole('button', { name: 'Abrir carrito, 0 artículos' }).click()
  await expect(card).toHaveAttribute('data-motion-paused', 'false')
  await expect.poll(() => wheel.evaluate(element => Number(element.getAnimations()[0]?.currentTime))).toBeGreaterThan(100)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(wheel).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.transit-truck-chassis')).toBeVisible()
})
