import { test, expect } from '@playwright/test'

test('Ver productos scrolls to the catalog without reloading, preserving preview query parameters', async ({ page, isMobile }) => {
  let navigations = 0
  page.on('request', request => { if (request.isNavigationRequest() && request.frame() === page.mainFrame()) navigations++ })
  await page.goto('/?qa=test-section&keep=this')
  await expect(page.locator('.hero-catalog-cta')).toBeVisible()
  const origin = await page.evaluate(() => performance.timeOrigin)
  for (let attempt = 0; attempt < 2; attempt++) {
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    const button = page.getByRole('link', { name: 'Ver productos', exact: true })
    if (isMobile) await button.tap()
    else await button.click()
    await expect.poll(() => page.locator('#catalogo').evaluate(element => {
      const rect = element.getBoundingClientRect(), header = document.querySelector('.site-header')!.getBoundingClientRect()
      return rect.top >= header.bottom - 1 && rect.top < innerHeight / 2 && scrollY > 100
    })).toBe(true)
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin)
    expect(new URL(page.url()).search).toBe('?qa=test-section&keep=this')
    expect(new URL(page.url()).hash).toBe('#catalogo')
  }
  expect(navigations).toBe(1)
})

test('checkout and alternate views are loaded only when requested', async ({ page }) => {
  const resources: string[] = []
  page.on('request', request => resources.push(new URL(request.url()).pathname))
  await page.goto('/')
  await expect(page.locator('.hero-photo')).toBeVisible()
  expect(resources.filter(path => /\/(?:CartDrawer|ProductDialog|BrandGallery|FoodDirection|GummiesPreview|AdminDashboard|orders)-.*\.(js|css)$/.test(path))).toEqual([])

  await page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).click()
  const product = page.getByRole('dialog', { name: 'Ositos enchilados' })
  await expect(product).toBeVisible()
  await product.getByRole('radio', { name: '250 g', exact: true }).check()
  await expect(product.getByRole('radio', { name: '250 g', exact: true })).toBeChecked()
  await product.getByRole('button', { name: 'Añadir al carrito' }).click()
  await page.getByRole('button', { name: 'Abrir carrito, 1 artículos' }).click()
  const cart = page.locator('.cart-drawer')
  await expect(cart).toBeVisible()
  await expect(cart.locator('.cart-line')).toContainText('250 g')
  await cart.getByLabel('Tu nombre').fill('Prueba de rendimiento')
  await cart.getByRole('button', { name: 'Cerrar carrito' }).click()
  await page.getByRole('button', { name: 'Abrir carrito, 1 artículos' }).click()
  await expect(cart.getByLabel('Tu nombre')).toHaveValue('Prueba de rendimiento')
})

test('SVG recipe and mobile media fallback synchronize and pause offscreen', async ({ page, isMobile, browserName }) => {
  if (isMobile) await page.route('**/images/mix/preview-*.mp4', route => route.abort())
  const workers: string[] = []
  const errors: string[] = []
  page.on('worker', worker => workers.push(worker.url()))
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  // Windows WebKit uses mock media and does not surface failed decoder loads.
  if (isMobile && browserName === 'webkit' && process.platform === 'win32') await page.locator('.mix-video').dispatchEvent('error')
  const film = page.locator('.mix-film')
  await film.scrollIntoViewIfNeeded()
  const playback = async (state: 'running' | 'paused') => {
    await expect.poll(() => film.evaluate((element, state) => {
      const animations = element.getAnimations({ subtree: true })
      const timeline = animations.filter(animation => !((animation.effect as KeyframeEffect).target instanceof SVGElement))
      const participating = state === 'running' ? animations.filter(animation => animation.playState === 'running') : timeline
      const times = participating.map(animation => Number(animation.currentTime))
      return (element as HTMLElement).dataset.sceneReady === 'true' && animations.length > 50 && timeline.every(animation => animation.playState === state && !animation.pending)
        && participating.every(animation => !animation.pending)
        && (state !== 'paused' || animations.every(animation => animation.playState === 'paused' && !animation.pending))
        && Math.max(...times) - Math.min(...times) < 2
    }, state), { timeout: 15_000 }).toBe(true)
  }
  await playback('running')
  await expect(film).toHaveAttribute('data-renderer', 'svg')
  expect(await film.locator('.bowl-gummy').first().evaluate(element => element.getAnimations().length)).toBe(1)
  expect(await film.evaluate(element => element.getAnimations({ subtree: true }).every(animation => animation.effect!.getTiming().duration === 15_000))).toBe(true)

  await film.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = 12_500 }))
  await expect.poll(() => film.evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => (animation.effect as KeyframeEffect).target instanceof SVGElement)
    .every(animation => animation.playState === 'paused'))).toBe(true)
  await expect(film.locator('.finished-mix')).toHaveCSS('opacity', '1')
  await film.evaluate(element => element.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = 7500 }))
  await playback('running')
  await expect(film.locator('.mixing-spoon')).toHaveCSS('opacity', '1')

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await playback('paused')
  await expect(page.locator('.site-header')).not.toHaveClass(/is-scrolled/)
  await film.scrollIntoViewIfNeeded()
  await playback('running')
  await expect(page.locator('.site-header')).toHaveClass(/is-scrolled/)
  expect(workers.filter(url => url.includes('mix-simulation.worker'))).toHaveLength(1)
  expect(errors).toEqual([])
})

test('reduced motion does not calculate or download the animated bear photos', async ({ page, isMobile }) => {
  const workers: string[] = []
  const bears: string[] = []
  await page.emulateMedia({ reducedMotion: 'reduce' })
  page.on('worker', worker => workers.push(worker.url()))
  page.on('request', request => { if (/\/images\/mix\/bear-/.test(request.url())) bears.push(request.url()) })
  await page.goto('/')
  await page.locator('.mix-film').scrollIntoViewIfNeeded()
  await expect(page.locator('.mix-film')).toHaveAttribute('data-static', 'true')
  expect(workers).toEqual([])
  expect(bears).toEqual([])

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect.poll(() => page.locator('.mix-film').evaluate(element => element.getAnimations({ subtree: true }).some(animation => animation.playState === 'running')), { timeout: 15_000 }).toBe(true)
  expect(workers.filter(url => url.includes('mix-simulation.worker'))).toHaveLength(isMobile ? 0 : 1)
})
