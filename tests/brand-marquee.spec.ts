import { test, expect } from '@playwright/test'

// These visual tests cover the original strip shown to signed-in customers.
// Real registration and session behavior are exercised in accounts.spec.ts.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/checkout', async route => {
    const response = await route.fetch()
    const config = await response.json()
    await route.fulfill({ response, json: { ...config, account: { id: 'visual-test-member', name: 'Cliente visual', email: 'visual@ejemplo.cr', createdAt: '2026-01-01T00:00:00Z', welcomeAvailable: true } } })
  })
})

test('brand strip sits below the hero and scrolls seamlessly without overflowing', async ({ page }, testInfo) => {
  await page.goto('/')
  const strip = page.locator('.brand-marquee')
  await expect(strip).toBeVisible()
  await expect(strip).toContainText('Gomitas enchiladas: Onky’s.')
  await expect(strip.locator('.brand-marquee-product').first()).toHaveText('Gomitas enchiladas')
  await expect(strip.locator('.brand-marquee-name').first()).toHaveText('Onky’s')
  await expect(strip).not.toContainText('Postres')
  await expect(strip).not.toContainText('A tu gusto')
  await expect(strip.locator('.brand-marquee-bear')).toHaveCount(24)
  await expect(strip.locator('.brand-marquee-group')).toHaveCount(2)

  const layout = await page.evaluate(() => {
    const hero = document.querySelector('.hero')!.getBoundingClientRect()
    const marquee = document.querySelector('.brand-marquee')!.getBoundingClientRect()
    const catalog = document.querySelector('.catalog')!.getBoundingClientRect()
    const groups = [...document.querySelectorAll('.brand-marquee-group')]
    return {
      nextToHero: Math.abs(hero.bottom - marquee.top) < 1,
      beforeCatalog: marquee.bottom <= catalog.top,
      sameWidth: Math.abs(groups[0].getBoundingClientRect().width - groups[1].getBoundingClientRect().width) < 1,
      enoughContent: groups[0].getBoundingClientRect().width >= window.innerWidth,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    }
  })
  expect(layout).toEqual({ nextToHero: true, beforeCatalog: true, sameWidth: true, enoughContent: true, overflow: false })
  const track = strip.locator('.brand-marquee-track')
  await strip.scrollIntoViewIfNeeded()
  await expect(track).toHaveCSS('animation-name', 'brand-marquee-scroll')
  await expect(track).toHaveCSS('animation-play-state', 'running')
  await expect(strip.locator('.brand-marquee-name').first()).toHaveCSS('font-weight', '750')
  await expect(strip.locator('.brand-marquee-name').first()).toHaveCSS('font-size', testInfo.project.name === 'mobile' ? '9px' : '11px')
  await expect(strip.locator('.brand-marquee-name').first()).toHaveCSS('color', 'rgb(56, 36, 72)')
  await expect(strip.locator('.brand-marquee-product').first()).toHaveCSS('font-weight', '750')
  await expect(strip.locator('.brand-marquee-product').first()).toHaveCSS('font-size', testInfo.project.name === 'mobile' ? '9px' : '11px')
  await expect(strip.locator('.brand-marquee-product').first()).toHaveCSS('color', 'rgb(56, 36, 72)')
  await expect(strip.locator('.brand-marquee-bear').first()).toHaveCSS('color', 'rgb(56, 36, 72)')
})

test('brand strip resumes when visible and pauses offscreen; reduced motion stays still', async ({ page }) => {
  await page.goto('/')
  const strip = page.locator('.brand-marquee')
  const track = strip.locator('.brand-marquee-track')
  await strip.scrollIntoViewIfNeeded()
  await expect(track).toHaveCSS('animation-play-state', 'running')
  await page.locator('.experience-section').scrollIntoViewIfNeeded()
  await expect(track).toHaveCSS('animation-play-state', 'paused')
  const pausedAt = await track.evaluate(element => Number(element.getAnimations()[0].currentTime))
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))
  expect(await track.evaluate(element => Number(element.getAnimations()[0].currentTime))).toBe(pausedAt)
  await strip.scrollIntoViewIfNeeded()
  await expect(track).toHaveCSS('animation-play-state', 'running')
  expect(await track.evaluate(element => Number(element.getAnimations()[0].currentTime))).toBeGreaterThanOrEqual(pausedAt)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(track).toHaveCSS('animation-name', 'none')
  await expect(strip.locator('.brand-marquee-group').nth(1)).toBeHidden()
})
