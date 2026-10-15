import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('six generated brand concepts preview locally without making generation requests', async ({ page }, testInfo) => {
  const externalRequests: string[] = []
  const errors: string[] = []
  page.on('request', request => {
    if (new URL(request.url()).hostname.includes('higgsfield')) externalRequests.push(request.url())
  })
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/?vista=archivo-marca')
  await expect(page.getByRole('heading', { name: 'La O de Onky’s.' })).toBeVisible()
  await expect(page.getByText('6 de 6 bocetos disponibles')).toBeVisible()
  await expect(page.locator('.brand-concept')).toHaveCount(6)
  for (const image of await page.locator('.brand-concept-image img').all()) {
    await image.scrollIntoViewIfNeeded()
    await expect.poll(() => image.evaluate(img => (img as HTMLImageElement).complete && (img as HTMLImageElement).naturalWidth > 0)).toBe(true)
    expect(await image.evaluate(img => getComputedStyle(img).objectFit)).toBe('contain')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.screenshot({ path: `test-results/${testInfo.project.name}-brand-gallery.png`, fullPage: true })
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(accessibility.violations.map(violation => ({ id: violation.id, nodes: violation.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))).toEqual([])

  const concept = page.locator('.brand-concept').nth(2)
  await concept.getByRole('button', { name: 'Ver en portada' }).click()
  const preview = page.getByRole('dialog', { name: 'Vista previa de portada · 03' })
  await expect(preview).toBeVisible()
  await expect(preview.getByRole('heading', { name: 'Un momento. A tu gusto.' })).toBeVisible()
  await expect(preview.locator('.brand-mock-hero > img')).toHaveAttribute('src', '/brand-concepts/onkys-o-round-01/03.png')
  await preview.screenshot({ path: `test-results/${testInfo.project.name}-brand-03-preview.png` })
  await page.keyboard.press('Escape')
  await expect(preview).not.toBeVisible()
  await concept.getByRole('button', { name: 'Ampliar boceto 03: Con carácter' }).click()
  await expect(page.locator('.brand-full-image')).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar vista previa' }).click()
  await page.getByRole('link', { name: 'Volver a la tienda', exact: true }).first().click()
  await expect(page.locator('.site-header')).toBeVisible()
  expect(externalRequests).toEqual([])
  expect(errors).toEqual([])
})
