import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('new preparation preview uses only local media and keeps controls outside the edge mask', async ({ page }) => {
  const requests: string[] = []
  page.on('request', request => {
    if (new URL(request.url()).hostname.includes('higgsfield')) requests.push(request.url())
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?vista=gomitas&version=02')
  await expect(page.getByRole('heading', { name: 'Un toque de chamoy. Todo el antojo.' })).toBeVisible()
  await expect(page.locator('.gummies-preview-player img')).toBeVisible()
  await expect(page.locator('.hero-media-video')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Proceso' })).toBeVisible()
  await expect(page.getByText('Visual generado con IA', { exact: true })).toHaveCount(0)
  await expect(page.getByText('fotografía de referencia', { exact: false })).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const api = await page.request.get('/brand-media/onkys-gummies-02/manifest.json')
  expect(api.ok()).toBe(true)
  const manifest = await api.json()
  expect(manifest.duration).toBe(12)
  expect(manifest.resolution).toBe('720p')
  expect(manifest.audio).toBe(false)
  expect(manifest.pricingKind).toBe('variable-planning-estimate')
  if (manifest.video) {
    await expect(page.getByText('12 segundos · Sin audio', { exact: false })).toBeVisible()
    const button = page.getByRole('button', { name: 'Reproducir video de gomitas' })
    expect(await button.evaluate(element => !!element.closest('.hero-media-visual'))).toBe(false)
    await button.click()
    await expect(page.getByRole('button', { name: 'Pausar video de gomitas' })).toBeVisible({ timeout: 15_000 })
    const dimensions = await page.locator('.hero-media-video').evaluate(element => ({ width: (element as HTMLVideoElement).videoWidth, height: (element as HTMLVideoElement).videoHeight, duration: (element as HTMLVideoElement).duration }))
    expect(dimensions.width / dimensions.height).toBeCloseTo(4 / 3, 1)
    expect(dimensions.duration).toBeGreaterThanOrEqual(11.8)
    expect(dimensions.duration).toBeLessThan(12.5)
    await page.getByRole('button', { name: 'Pausar video de gomitas' }).click()
  }
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(accessibility.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }))).toEqual([])
  expect(requests).toEqual([])
})
