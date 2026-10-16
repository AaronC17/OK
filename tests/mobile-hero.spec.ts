import { test, expect } from '@playwright/test'

test('mobile hero keeps the full pouch visible without scrolling, including short Safari viewports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Only the mobile hero layout changes')
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  await expect.poll(() => page.locator('.hero-photo').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)

  // Use actual available page heights, not the phone's full screen resolution:
  // expanded browser toolbars consume a sizeable part of an iPhone screen.
  for (const [width, height] of [[320, 480], [360, 560], [375, 600], [390, 664], [390, 844], [430, 720], [600, 700]]) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    const layout = await page.evaluate(() => {
      const header = document.querySelector('.site-header')!.getBoundingClientRect()
      const copy = document.querySelector('.hero-copy')!.getBoundingClientRect()
      const action = document.querySelector('.hero-catalog-cta')!.getBoundingClientRect()
      const visual = document.querySelector('.hero-visual')!.getBoundingClientRect()
      const photo = document.querySelector('.hero-photo')!.getBoundingClientRect()
      return {
        scroll: scrollY,
        overflow: document.documentElement.scrollWidth > innerWidth,
        headerBottom: header.bottom,
        copyTop: copy.top,
        actionBottom: action.bottom,
        actionHeight: action.height,
        visualTop: visual.top,
        photoTop: photo.top,
        photoBottom: photo.bottom,
        photoHeight: photo.height,
      }
    })
    expect(layout.scroll).toBe(0)
    expect(layout.overflow).toBe(false)
    expect(layout.copyTop).toBeGreaterThanOrEqual(layout.headerBottom)
    expect(layout.visualTop).toBeGreaterThanOrEqual(layout.actionBottom)
    expect(layout.photoTop).toBeGreaterThanOrEqual(layout.actionBottom)
    expect(layout.photoBottom).toBeLessThanOrEqual(height - 8)
    expect(layout.actionHeight).toBeGreaterThanOrEqual(44)
    expect(layout.photoHeight).toBeGreaterThanOrEqual(height <= 480 ? 140 : 200)
    if (width === 390 && height === 664) {
      await page.screenshot({ path: testInfo.outputPath('mobile-hero-first-screen.png') })
    }
  }
})
