import test from 'node:test'
import assert from 'node:assert/strict'
import { sortMixDepth, meshVerticalBounds } from './mix-render.ts'
import { mixBears, simulateMix } from './mix-physics.ts'

test('depth order crosses non-overlapping neighbours instead of trapping a front gummy behind them', () => {
  const order = [0, 1, 2, 3]
  assert.equal(sortMixDepth(order, [30, 20, 10, -10]), true)
  assert.deepEqual(order, [3, 2, 1, 0])
  assert.equal(sortMixDepth(order, [30, 20, 10, -10]), false)
})

test('all simulated gummies and the spoon retain a consistent painter order', () => {
  const simulation = simulateMix()
  const order = Array.from({ length: mixBears.length + 1 }, (_, i) => i)
  for (const frame of simulation.frames) {
    const depths = [...frame.bears.map(bear => bear.z), frame.spoon.z]
    sortMixDepth(order, depths)
    for (let i = 1; i < order.length; i++) assert.ok(depths[order[i]] >= depths[order[i - 1]] - 1.5)
  }
})

test('immersion uses the complete bent texture bounds', () => {
  const bounds = { min: 0, max: 0 }
  meshVerticalBounds([{ x: -14, y: -24 }, { x: 14, y: 9 }, { x: 4, y: 29 }], bounds)
  assert.deepEqual(bounds, { min: -24, max: 29 })
})
