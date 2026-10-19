import test from 'node:test'
import assert from 'node:assert/strict'
import { encodeMix, packMix, decodeMix } from './mix-codec.ts'
import { simulateMix } from './mix-physics.ts'

test('baked mix preserves every frame, impact and Float64 value', () => {
  const original = simulateMix()
  const binary = encodeMix(original)
  assert.deepStrictEqual(decodeMix(binary), original)
  assert.deepStrictEqual(decodeMix(packMix(binary)), original)
  assert.throws(() => decodeMix(binary.slice(0, -8)), /Truncated/)
})
