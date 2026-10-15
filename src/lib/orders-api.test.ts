import assert from 'node:assert/strict'
import test from 'node:test'
import { amountFromInput } from './orders-api.ts'

test('manual payment amounts convert decimal strings to integer CRC cents without rounding', () => {
  assert.equal(amountFromInput('8500'), 850000)
  assert.equal(amountFromInput('8500,50'), 850050)
  assert.equal(amountFromInput('8500.5'), 850050)
  assert.equal(amountFromInput('0'), 0)
  for (const value of ['8.500,50', '1.001', '-1', 'NaN', '1e3', '', '1000001']) assert.throws(() => amountFromInput(value))
})
