import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('revised product brief is truthful and cannot generate or spend', async ({ page }) => {
  const apiRequests: string[] = []
  page.on('request', request => {
    if (new URL(request.url()).hostname.includes('higgsfield')) apiRequests.push(request.url())
  })
  await page.goto('/?vista=bocetos')
  await expect(page.getByRole('heading', { name: 'Dulce. Ácido. Y con carácter.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Gomitas enchiladas' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tres leches y pie de limón' })).toBeVisible()
  await expect(page.getByText('Postres pendientes de fotos reales', { exact: false })).toBeVisible()
  await expect(page.locator('.food-direction-card')).toHaveCount(3)
  await expect(page.locator('.brand-concept-image')).toHaveCount(0)
  await page.locator('.food-direction-card').first().locator('summary').first().click()
  await expect(page.locator('.food-direction-card').first().locator('.brand-prompt p').first()).toContainText('lime juice has ALREADY been added')
  await expect(page.locator('.food-direction-card').first().locator('.brand-prompt p').first()).toContainText('No whole citrus fruit')
  await expect(page.locator('.food-direction-card').first().locator('.brand-prompt p').first()).toContainText('watermelon-wedge gummies')
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(accessibility.violations.map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }))).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  expect(apiRequests).toEqual([])
})
