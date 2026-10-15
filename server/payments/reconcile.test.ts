import assert from 'node:assert/strict'
import test from 'node:test'
import { movementKey, reconcile } from './reconcile.ts'
import type { StoredMovement } from './model.ts'
import { exampleMovement, exampleOrder, later, NOW } from './test-helpers.ts'

test('SINPE: requires exact amount, code, account, CRC, posted credit and payment window', () => {
  const order = exampleOrder()
  const decision = reconcile(order, [exampleMovement(order)], new Set(), later(60))
  assert.equal(decision.kind, 'match')
  assert.equal(decision.reason, 'exact_match')
  assert.equal(order.amountMinor, 850000) // ₡8.500, not 8.500 cents.
})

for (const [name, overrides] of [
  ['missing description', { description: null }],
  ['amount-only description', { description: 'Pago de 8500' }],
  ['partial order code', { description: 'ONK-0123456789ABCDE' }],
  ['code embedded in a longer token', { description: 'XONK-0123456789ABCDEF' }],
  ['longer order code', { description: 'ONK-0123456789ABCDEFA' }],
  ['another destination account', { accountId: 'another-account' }],
  ['another currency', { currency: 'USD' }],
  ['outgoing debit', { direction: 'debit' }],
  ['unsettled movement', { status: 'pending' }],
  ['reversed movement', { status: 'reversed' }],
] as [string, Partial<StoredMovement>][]) {
  test(`SINPE: does not approve ${name}`, () => {
    assert.equal(reconcile(exampleOrder(), [exampleMovement(undefined, overrides)], new Set(), later(60)).kind, 'retry')
  })
}

for (const amountMinor of [8500, 849999, 850001]) {
  test(`SINPE: wrong amount ${amountMinor} requires review, never a tolerance`, () => {
    assert.deepEqual(reconcile(exampleOrder(), [exampleMovement(undefined, { amountMinor })], new Set(), later(60)), { kind: 'review', reason: 'amount_mismatch' })
  })
}

test('SINPE: accepts an isolated code with punctuation and different case', () => {
  assert.equal(reconcile(exampleOrder(), [exampleMovement(undefined, { description: '(onk-0123456789abcdef).' })], new Set(), later(60)).kind, 'match')
})

test('SINPE: two matching movements or two order codes are ambiguous', () => {
  assert.deepEqual(reconcile(exampleOrder(), [exampleMovement(), exampleMovement(undefined, { id: 'bank-demo-2' })], new Set(), later(60)), { kind: 'review', reason: 'multiple_movements' })
  assert.deepEqual(reconcile(exampleOrder(), [exampleMovement(undefined, { description: 'ONK-0123456789ABCDEF ONK-FEDCBA9876543210' })], new Set(), later(60)), { kind: 'review', reason: 'multiple_order_references' })
})

test('SINPE: another payment with the same code is reviewed even if only one amount matches', () => {
  assert.equal(reconcile(exampleOrder(), [exampleMovement(), exampleMovement(undefined, { id: 'bank-demo-2', amountMinor: 1 })], new Set(), later(60)).reason, 'multiple_movements')
})

test('SINPE: bank transaction identity cannot be reused and conflicting snapshots are quarantined', () => {
  assert.equal(reconcile(exampleOrder(), [exampleMovement()], new Set([movementKey(exampleMovement())]), later(60)).reason, 'movement_already_used')
  assert.equal(reconcile(exampleOrder(), [exampleMovement(undefined, { conflict: true })], new Set(), later(60)).reason, 'conflicting_movement')
})

test('SINPE: old, future, expired and timezone-less dates never auto-approve', () => {
  for (const bookedAt of [later(-1), later(61)]) assert.equal(reconcile(exampleOrder(), [exampleMovement(undefined, { bookedAt })], new Set(), later(60)).reason, 'outside_payment_window')
  assert.equal(reconcile(exampleOrder(), [exampleMovement()], new Set(), later(1800)).reason, 'expired')
  assert.equal(reconcile(exampleOrder(), [exampleMovement(undefined, { bookedAt: '2026-10-15T18:00:10' })], new Set(), later(60)).reason, 'invalid_movement')
  assert.equal(reconcile({ ...exampleOrder(), amountMinor: 850000.5 }, [exampleMovement()], new Set(), later(60)).reason, 'invalid_order')
  assert.equal(reconcile(exampleOrder(), [exampleMovement()], new Set(), NOW).reason, 'outside_payment_window')
})
