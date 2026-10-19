import { test, expect } from '@playwright/test'
import { simulateMix, sampleSurface } from '../src/lib/mix-physics.ts'

const simulation = simulateMix()
const phases = [4.083333333333334, 4.15, 4.25, 4.4, 4.6, 4.9, 5.2, 7.5, 9.5]

test('each gummy keeps its own coating at the physical liquid surface after depth sorting', async ({ page }) => {
  await page.goto('/')
  const film = page.locator('.mix-film')
  await film.scrollIntoViewIfNeeded()
  await expect(film).toHaveAttribute('data-scene-ready', 'true', { timeout: 15_000 })
  // The film autostarts once it is observed and the recipe surface is decoded,
  // which on some engines lands AFTER scene-ready. Wait until it is genuinely
  // playing, otherwise pausing here would be undone by the one-time start reset.
  await expect.poll(async () => film.evaluate(element =>
    element.getAnimations({ subtree: true }).some(animation => animation.playState === 'running' && (animation.currentTime ?? 0) > 200)))
    .toBe(true)
  // The rAF renderer writes cut/coating attributes one frame behind WAAPI
  // seeks, so settle two frames before reading the DOM.
  const settle = () => film.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))))
  for (const phase of phases) {
    const frame = simulation.frames[Math.round(phase * 60)]
    await film.evaluate((element, time) => {
      element.getAnimations({ subtree: true }).forEach(animation => { animation.pause(); animation.currentTime = time })
    }, frame.time * 1000)
    await settle()
    const expected = frame.bears.map((bear, index) => {
      const line = bear.y - sampleSurface(frame.surface, bear.x, bear.z)
      return { index, line, covered: bear.active && line <= Math.max(...bear.mesh.map(vertex => vertex.y)) + 1 }
    })
    await expect.poll(async () => film.evaluate((element, states) => states.every(state => {
      const bear = element.querySelector(`[data-bear="${state.index}"]`)!
      const cover = bear.querySelector<SVGElement>('.gummy-sauce-cover')!
      const cut = element.querySelector(`[data-sauce-cut="${state.index}"]`)!
      return (cover.style.display !== 'none') === state.covered
        && (!state.covered || Math.abs(Number(cut.getAttribute('y')) - state.line) < .02)
    }), expected)).toBe(true)
  }
  // Exercise the wrap/reset and the first entry again, not only the first loop.
  for (const time of [0, 15_000, 30_000]) {
    await film.evaluate((element, time) => element.getAnimations({ subtree: true }).forEach(animation => { animation.currentTime = time }), time)
    await settle()
    await expect.poll(() => film.locator('.gummy-sauce-cover').evaluateAll(covers => covers.every(cover => (cover as SVGElement).style.display === 'none'))).toBe(true)
  }
})
