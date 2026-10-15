import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { testAdmin } from './helpers/store.ts'

test('only gummies are shown and a saved dessert is removed from the cart', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('onkys.cart.v1', JSON.stringify({ version: 1, items: [
      { selection: { kind: 'gummy', typeIds: ['ositos'], weight: 100 }, quantity: 1 },
      { selection: { kind: 'dessert', productId: 'brownie', variantId: 'box-4' }, quantity: 1 },
    ] }))
  })
  await page.goto('/')
  await expect(page.locator('#postres')).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Postres', exact: true })).toHaveCount(0)
  await expect(page.locator('.brand-marquee')).not.toContainText('Postres')
  await expect(page.getByRole('button', { name: 'Personalizar Brownie de chocolate' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Abrir carrito, 1 artículos' })).toBeVisible()
  await page.getByRole('button', { name: 'Abrir carrito, 1 artículos' }).click()
  await expect(page.getByText('Actualizamos tu carrito:', { exact: false })).toBeVisible()
  await expect(page.locator('.cart-line')).toHaveCount(1)
  await expect(page.locator('.cart-line')).toContainText('Ositos enchilados')
  await expect(page.locator('.cart-line')).not.toContainText('Brownie')
  await page.getByRole('button', { name: 'Cerrar carrito' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Abrir carrito, 1 artículos' }).click()
  await expect(page.locator('.cart-line')).toHaveCount(1)
})

test('mixto combines hidden catalog types as ingredients', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Personalizar Tiritas', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Personalizar Gusanitos', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: testInfo.project.name === 'mobile' ? 'Personalizar gomitas mixtas' : 'Armar mi mix' }).click()
  const configurator = page.getByRole('dialog', { name: 'Tu mezcla. Tus reglas.' })
  await expect(configurator.getByText('Siempre mixto. Elige los gramos.', { exact: true })).toBeVisible()
  await expect(configurator.locator('.type-options input')).toHaveCount(0)
  await expect(configurator.locator('.weight-options input')).toHaveCount(3)
  await expect(configurator.locator('.configuration-price')).toContainText('₡1 400')
  await configurator.getByRole('button', { name: 'Añadir al carrito' }).click()
  await page.getByRole('button', { name: 'Abrir carrito, 1 artículos' }).click()
  await expect(page.locator('.cart-line')).toHaveCount(1)
  await expect(page.locator('.cart-line')).toContainText('Mix de gomitas enchiladas')
  await expect(page.locator('.cart-line')).toContainText('Gusanitos')
})

test('gummies-only cart, variant prices, persistence, delivery and server-created SINPE order', async ({ page, request }) => {
  await testAdmin(request)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  await page.getByRole('button', { name: 'Abrir carrito, 0 artículos' }).click()
  await expect(page.getByText('Un buen momento por empezar.')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar carrito' }).click()

  await page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).click()
  const configurator = page.getByRole('dialog', { name: 'Tu mezcla. Tus reglas.' })
  await expect(configurator.locator('.weight-options input')).toHaveCount(3)
  for (const [weight, price] of [['100', '₡1 200'], ['200', '₡2 200'], ['500', '₡4 800']]) {
    await configurator.getByRole('radio', { name: `${weight} g`, exact: true }).check()
    await expect(configurator.locator('.configuration-price')).toContainText(price)
  }
  await configurator.getByRole('button', { name: 'Aumentar cantidad de bolsas', exact: true }).click()
  await expect(configurator.locator('.configuration-price')).toContainText('₡9 600')
  await configurator.getByRole('button', { name: 'Añadir al carrito' }).click()

  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).click()
    await configurator.getByRole('button', { name: 'Añadir al carrito' }).click()
  }

  await expect(page.getByRole('button', { name: 'Tiritas', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Personalizar Gusanitos', exact: true })).toHaveCount(0)

  await page.reload()
  await page.getByRole('button', { name: 'Abrir carrito, 4 artículos' }).click()
  const cart = page.locator('.cart-drawer')
  await expect(cart.locator('.cart-line')).toHaveCount(2)
  await expect(cart.locator('.order-totals')).toContainText('₡12 000')
  await expect(cart.locator('.order-totals')).toContainText('₡2 800')
  await expect(cart.locator('.total-row')).toContainText('₡14 800')
  await cart.getByRole('button', { name: 'Crear pedido con SINPE' }).click()
  await expect(cart.getByText('¿Cómo te llamas? Escribe tu nombre.')).toBeVisible()
  await expect(cart.getByLabel('Tu nombre')).toBeFocused()
  await cart.getByLabel('Tu nombre').fill('Ana Pérez')
  await cart.getByLabel('Teléfono de contacto').fill('61551234')
  await cart.getByLabel('Dirección o punto de entrega').fill('Calle del Sol 12, 2º B')
  await cart.getByLabel(/Acepto que la tienda guarde/).check()
  await cart.getByRole('radio', { name: /Recogida/ }).check()
  await expect(cart.getByLabel('Dirección o punto de entrega')).toHaveCount(0)
  await expect(cart.locator('.total-row')).toContainText('₡12 000')
  await cart.locator('.cart-line').first().getByRole('button', { name: /Aumentar cantidad/ }).click()
  await expect(cart.locator('.total-row')).toContainText('₡16 800')
  await cart.locator('.cart-line').last().getByRole('button', { name: /Eliminar/ }).click()
  await expect(cart.locator('.cart-line')).toHaveCount(1)
  await expect(cart.locator('.total-row')).toContainText('₡14 400')
  await cart.getByRole('button', { name: 'Crear pedido con SINPE' }).click()
  await expect(cart.locator('#assigned-order-code')).toHaveValue(/^ONK-[A-F0-9]{16}$/)
  await expect(cart.locator('.sinpe-instructions')).toContainText('₡14 400')
  const result = await (await page.request.get('/api/orders/current')).json()
  expect(result.order.customer.name).toBe('Ana Pérez')
  expect(result.order.customer.address).toBe('')
  expect(result.order.totalMinor).toBe(1440000)
  expect(result.order.status).toBe('awaiting_payment')
  await expect(page.locator('a[href*="wa.me"]')).toHaveCount(0)
  await cart.getByRole('button', { name: 'Cerrar carrito' }).click()
  expect(errors).toEqual([])
})

test('symmetrical glass menu, proportional icons, responsive layout and keyboard accessibility', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.getByRole('heading', { name: 'Tu mezcla. Tus reglas.' })).toBeVisible()
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(accessibility.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([])
  for (const width of testInfo.project.name === 'mobile' ? [320, 390, 600, 768] : [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    const layout = await page.evaluate(() => {
      const header = document.querySelector('.header-inner')!.getBoundingClientRect()
      const logo = document.querySelector('.header-inner .wordmark')!.getBoundingClientRect()
      const cart = document.querySelector('.cart-toggle')!.getBoundingClientRect()
      return { overflow: document.documentElement.scrollWidth > innerWidth, mirrorError: Math.abs((logo.x - header.x) - (header.x + header.width - cart.right)), overlap: logo.right > cart.left,
        stretchedIcons: [...document.querySelectorAll('svg.icon')].filter(icon => { const r = icon.getBoundingClientRect(); return r.width > 0 && Math.abs(r.width - r.height) > 1 }).length }
    })
    expect(layout.mirrorError).toBeLessThan(1)
    expect(layout).toMatchObject({ overflow: false, overlap: false, stretchedIcons: 0 })
  }
  await page.setViewportSize(testInfo.project.name === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 })
  await page.locator('#gomitas').scrollIntoViewIfNeeded()
  await expect(page.locator('.site-header')).toHaveClass(/is-scrolled/)
  expect(await page.locator('.header-inner').evaluate(el => getComputedStyle(el).backdropFilter)).toContain('blur(22px)')
  await page.locator('.mix-film').scrollIntoViewIfNeeded()
  await expect.poll(async () => page.locator('main img').evaluateAll(images => images.filter(img => !(img as HTMLImageElement).complete || !(img as HTMLImageElement).naturalWidth).length)).toBe(0)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect(page.locator('.site-header')).not.toHaveClass(/is-scrolled/)
  await page.screenshot({ path: `test-results/${testInfo.project.name}-store.png`, fullPage: true })
  await page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Tu mezcla. Tus reglas.' })
  await expect(dialog).toHaveCSS('opacity', '1')
  await expect(dialog.getByText('Fotografía de referencia', { exact: true })).toHaveCount(0)
  const modalAccessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(modalAccessibility.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([])
  await dialog.getByRole('button', { name: 'Añadir al carrito' }).focus()
  await page.keyboard.press('Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('dialog[open]'))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Personalizar Ositos', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).click()
  await dialog.getByRole('button', { name: 'Añadir al carrito' }).click()
  await page.getByRole('button', { name: 'Abrir carrito, 1 artículos' }).click()
  await expect(page.locator('.cart-drawer')).toHaveCSS('opacity', '1')
  const cartAccessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(cartAccessibility.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([])
  await page.locator('.cart-drawer').screenshot({ path: `test-results/${testInfo.project.name}-cart.png` })
})

test('loop selects, mixes, finishes and pauses, respecting reduced motion', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/')
  const film = page.locator('.mix-film')
  const expectPlayback = async (state: 'paused' | 'running') => {
    await expect.poll(() => film.evaluate((el, state) => {
      const animations = el.getAnimations({ subtree: true })
      const times = animations.map(animation => Number(animation.currentTime))
      return animations.length > 0 && animations.every(animation => animation.playState === state && !animation.pending) && Math.max(...times) - Math.min(...times) < 2
    }, state)).toBe(true)
  }
  await film.scrollIntoViewIfNeeded()
  await expect(film).toHaveAttribute('data-paused', 'false')
  await expectPlayback('running')
  // StrictMode must not leave a second, competing motion on the same bear.
  expect(await film.locator('.bowl-gummy').first().evaluate(el => el.getAnimations().length)).toBe(1)
  await page.getByRole('button', { name: 'Pausar animación' }).click()
  await expectPlayback('paused')
  await page.getByRole('button', { name: 'Reproducir animación' }).click()
  await expectPlayback('running')
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await expect(film).toHaveAttribute('data-paused', 'true')
  await expectPlayback('paused')
  await film.scrollIntoViewIfNeeded()
  await expect(film).toHaveAttribute('data-paused', 'false')
  await expectPlayback('running')
  // Seek the shared CSS / Web Animations timeline without artificial waits.
  for (const [time, visible] of [[1500, '.caption-season'], [3500, '.caption-select'], [7500, '.caption-mix'], [12500, '.caption-ready']] as const) {
    await film.evaluate((el, time) => el.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = time }), time)
    await expect(film.locator(visible)).toHaveCSS('opacity', '1')
    if (time === 7500) {
      await expect(film.locator('.mixing-spoon')).toHaveCSS('opacity', '1')
      await film.screenshot({ path: `test-results/${testInfo.project.name}-mix-stirring.png` })
    }
    if (time === 12500) await expect(film.locator('.finished-mix')).toHaveCSS('opacity', '1')
  }
  await page.locator('.experience-section').screenshot({ path: `test-results/${testInfo.project.name}-mix-ready.png` })
  const photoSources = await film.locator('.bowl-illustration defs image').evaluateAll(images => images.map(image => image.getAttribute('href')))
  expect(photoSources).toHaveLength(4)
  for (const source of photoSources) {
    const response = await page.request.get(source!)
    expect(response.ok()).toBe(true)
    expect(response.headers()['content-type']).toContain('image/webp')
  }
  await page.getByRole('button', { name: 'Pausar animación' }).click()
  await expect(film).toHaveAttribute('data-paused', 'true')
  await expect(page.getByRole('button', { name: 'Reproducir animación' })).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(film).toHaveAttribute('data-static', 'true')
  await expect(film.locator('.finished-mix')).toHaveCSS('opacity', '1')
  await expect(film.locator('.mix-bowl-scene')).toHaveCSS('opacity', '0')
  await expectPlayback('paused')
  await page.getByRole('button', { name: 'Reproducir animación' }).click()
  await expect(film).toHaveAttribute('data-static', 'false')
  await expectPlayback('running')
  await page.getByRole('button', { name: 'Pausar animación' }).click()
  await expect(film).toHaveAttribute('data-static', 'true')
  await expectPlayback('paused')
  await page.getByRole('button', { name: 'Crear mi combinación' }).click()
  const mixDialog = page.getByRole('dialog', { name: 'Tu mezcla. Tus reglas.' })
  // El artículo Mixto siempre combina todo: sin radios de modo ni elección de tipos.
  await expect(mixDialog.getByRole('radio', { name: 'Mixto', exact: true })).toHaveCount(0)
  await expect(mixDialog.getByRole('radio', { name: 'Un solo tipo', exact: true })).toHaveCount(0)
  await expect(mixDialog.getByText('Elige dos o tres favoritos', { exact: false })).toHaveCount(0)
  await expect(mixDialog.getByText('Siempre mixto. Elige los gramos.', { exact: true })).toBeVisible()
  await expect(mixDialog.locator('.weight-options input')).toHaveCount(3)
  await expect(mixDialog.locator('.product-visual img')).toHaveAttribute('src', '/images/bolsa-mix.webp')
  expect(errors).toEqual([])
})
