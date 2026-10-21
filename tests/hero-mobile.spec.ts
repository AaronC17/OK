import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('hero shows the real product photo without video or AI labels', async ({ page }) => {
  const generationRequests: string[] = []
  page.on('request', request => {
    if (new URL(request.url()).hostname.includes('higgsfield')) generationRequests.push(request.url())
  })
  await page.goto('/')
  const photo = page.locator('.hero-photo')
  await expect(photo).toBeVisible()
  await expect(photo).toHaveAttribute('src', '/images/bolsa-mix.webp')
  await expect.poll(() => photo.evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true)
  await expect(page.locator('.hero-media-video')).toHaveCount(0)
  await expect(page.getByText('Visual generado con IA', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Fotografía de referencia', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Animación ilustrativa', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /video de gomitas/ })).toHaveCount(0)
  const glassButton = await page.getByRole('link', { name: 'Ver productos', exact: true }).evaluate(element => {
    const style = getComputedStyle(element)
    return { background: style.backgroundImage, backdrop: style.backdropFilter, color: style.color }
  })
  expect(glassButton.background).toContain('linear-gradient')
  expect(glassButton.backdrop).toContain('blur(16px)')
  expect(glassButton.color).toBe('rgb(255, 255, 255)')
  expect(generationRequests).toEqual([])
})

test('reduced motion keeps the still product photo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('.hero-photo')).toBeVisible()
  await expect(page.locator('.hero-media-video')).toHaveCount(0)
})

test('mobile hero is centered and product cards are compact with two columns', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'This layout change applies only to phones.')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    const layout = await page.evaluate(() => {
      const hero = document.querySelector('.hero-copy')!
      const heading = document.querySelector('.hero h1')!
      const cards = [...document.querySelectorAll('#gomitas .product-card')]
      const rect = cards[0].getBoundingClientRect()
      return {
        textAlign: getComputedStyle(hero).textAlign,
        fontFamily: getComputedStyle(heading).fontFamily,
        gridColumns: getComputedStyle(document.querySelector('.gummy-grid')!).gridTemplateColumns.split(' ').length,
        cardCount: cards.length,
        cardWidth: rect.width, cardHeight: rect.height,
        border: getComputedStyle(cards[0]).borderTopWidth,
        overflow: document.documentElement.scrollWidth > innerWidth,
        mainHeight: document.querySelector('main')!.getBoundingClientRect().height,
      }
    })
    expect(layout.textAlign).toBe('center')
    expect(layout.fontFamily).toContain('DM Serif Display')
    expect(layout.gridColumns).toBe(2)
    expect(layout.cardCount).toBe(2)
    expect(layout.cardWidth).toBeLessThan(210)
    expect(layout.cardHeight).toBeLessThan(320)
    expect(layout.border).toBe('1px')
    expect(layout.overflow).toBe(false)
    expect(layout.mainHeight).toBeLessThan(3700)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: 'test-results/mobile-compact-hero.png' })
  await page.locator('#gomitas').scrollIntoViewIfNeeded()
  await page.screenshot({ path: 'test-results/mobile-compact-products.png' })
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(accessibility.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))).toEqual([])
  await expect(page.locator('.mobile-mix-card .premium-badge')).toHaveText('Más vendido')
  await page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).click()
  const ositosDialog = page.getByRole('dialog', { name: 'Ositos enchilados', exact: true })
  await expect(ositosDialog.locator('.type-options')).toHaveCount(0)
  await expect(ositosDialog.locator('.mix-mode')).toHaveCount(0)
  await expect(ositosDialog.locator('.weight-options input')).toHaveCount(3)
  await expect(ositosDialog.getByText('Elige el tamaño de tu bolsa', { exact: true })).toBeVisible()
})

test('desktop keeps its headline font and shows both gummy cards', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Desktop layout check.')
  await page.goto('/')
  const layout = await page.evaluate(() => ({
    gridColumns: getComputedStyle(document.querySelector('.gummy-grid')!).gridTemplateColumns.split(' ').length,
    headlineFont: getComputedStyle(document.querySelector('.hero h1')!).fontFamily,
    cards: document.querySelectorAll('#gomitas .product-card').length,
    border: getComputedStyle(document.querySelector('#gomitas .product-card')!).borderTopWidth,
  }))
  expect(layout.gridColumns).toBe(2)
  expect(layout.headlineFont).toContain('DM Sans')
  expect(layout.cards).toBe(2)
  await expect(page.locator('.mobile-mix-card')).toBeVisible()
  expect(layout.border).toBe('0px')
})
