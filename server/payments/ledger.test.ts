import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import type { TestContext } from 'node:test'
import { store } from '../../src/config/store.ts'
import { DemoLedger } from './ledger.ts'
import type { PaymentsMode } from './model.ts'
import { exampleOrder, intakeMovement, later, NOW, orderInput } from './test-helpers.ts'
import { parseMovement } from './validation.ts'

function setup(t: TestContext, mode: PaymentsMode = 'mock') {
  const ledger = new DemoLedger(':memory:', { mode, accountId: 'bac-personal-demo' }, store)
  t.after(() => ledger.close())
  return ledger
}

test('ledger: backend prices the current catalog and refuses unknown delivery totals or client prices', t => {
  const ledger = setup(t)
  const order = ledger.createOrder(orderInput(), randomUUID(), NOW)
  assert.equal(order.amountMinor, 120000)
  assert.match(order.reference, /^ONK-[A-F0-9]{16}$/)
  assert.equal(order.demoOnly, true)
  assert.throws(() => ledger.createOrder({ ...orderInput(), amountMinor: 1 }, randomUUID(), NOW), /campos no permitidos/)
  const catalog = structuredClone(store)
  catalog.deliveryMethods[0].feeMinor = null
  const unquoted = new DemoLedger(':memory:', { mode: 'mock', accountId: 'bac-personal-demo' }, catalog)
  t.after(() => unquoted.close())
  assert.throws(() => unquoted.createOrder({ ...orderInput(), deliveryId: 'delivery' }, randomUUID(), NOW), /costo de entrega/)
  assert.throws(() => ledger.createOrder({ items: [], deliveryId: 'pickup' }, randomUUID(), NOW), /variantes/)
  assert.throws(() => ledger.createOrder({ ...orderInput(), items: [{ ...orderInput().items[0], quantity: 100 }] }, randomUUID(), NOW), /Cantidad/)
  assert.throws(() => ledger.createOrder({ ...orderInput(), items: [{ selection: { kind: 'gummy', typeIds: ['unknown'], weight: 100 }, quantity: 1 }] }, randomUUID(), NOW), /no disponibles/)
})

test('ledger: idempotent order creation survives retries and rejects a reused key with another cart', t => {
  const ledger = setup(t)
  const key = randomUUID()
  const order = ledger.createOrder(orderInput(), key, NOW)
  assert.deepEqual(ledger.createOrder(orderInput(), key, later(30)), order)
  assert.equal(ledger.listOrders().length, 1)
  assert.throws(() => ledger.createOrder({ ...orderInput(), items: [{ ...orderInput().items[0], quantity: 2 }] }, key, NOW), /otro pedido/)
})

test('ledger: disabled is fail-closed, cannot ingest fixtures or generate a payment event', t => {
  const ledger = setup(t, 'disabled')
  const order = ledger.createOrder(orderInput(), randomUUID(), NOW)
  assert.equal(order.status, 'manual_review')
  assert.equal(order.reason, 'bank_not_configured')
  assert.throws(() => ledger.addMockMovement(intakeMovement(order), later(10)), /deshabilitada/)
  assert.equal(ledger.reconcileDue(later(60)).simulatedCount, 0)
  assert.equal(ledger.listEvents().length, 0)
})

test('ledger: repeated movement and repeated runs produce one allocation, event and audit confirmation', t => {
  const ledger = setup(t)
  const order = ledger.createOrder(orderInput(), randomUUID(), NOW)
  const movement = intakeMovement(order)
  assert.deepEqual(ledger.addMockMovement(movement), { inserted: true, conflict: false })
  assert.deepEqual(ledger.addMockMovement(movement), { inserted: false, conflict: false })
  assert.equal(ledger.reconcileDue(later(60)).simulatedCount, 1)
  assert.equal(ledger.reconcileDue(later(61)).processedCount, 0)
  assert.equal(ledger.getOrder(order.id)!.status, 'simulated_paid')
  assert.equal(ledger.listEvents().length, 1)
  assert.equal(ledger.listEvents()[0].event, 'payment.simulated')
  assert.equal(ledger.listAudit(order.id).filter(event => event.event === 'payment.simulated').length, 1)
})

test('ledger: retries respect backoff, survive repeated scheduler executions, and expire to manual review', t => {
  const ledger = setup(t)
  const order = ledger.createOrder(orderInput(), randomUUID(), NOW)
  assert.equal(ledger.reconcileDue(NOW).processedCount, 1)
  assert.equal(ledger.getOrder(order.id)!.nextAttemptAt, later(60))
  assert.equal(ledger.reconcileDue(later(1)).processedCount, 0)
  for (const seconds of [60, 180, 420, 900, 1800]) ledger.reconcileDue(later(seconds))
  assert.equal(ledger.getOrder(order.id)!.status, 'manual_review')
  assert.equal(ledger.getOrder(order.id)!.reason, 'expired')
  assert.equal(ledger.getOrder(order.id)!.attempts, 6)
  assert.equal(ledger.listEvents().length, 0)
})

test('ledger: a later valid movement is matched only on the next due attempt', t => {
  const ledger = setup(t)
  const order = ledger.createOrder(orderInput(), randomUUID(), NOW)
  ledger.reconcileDue(NOW)
  ledger.addMockMovement(intakeMovement(order), later(10))
  assert.equal(ledger.reconcileDue(later(20)).processedCount, 0)
  assert.equal(ledger.reconcileDue(later(60)).simulatedCount, 1)
})

test('ledger: mismatched amount, multiple payments and missing description do not simulate a successful payment', t => {
  const ledger = setup(t)
  const wrong = ledger.createOrder(orderInput(), randomUUID(), NOW)
  ledger.addMockMovement(intakeMovement(wrong, { amountMinor: 1 }))
  const ambiguous = ledger.createOrder(orderInput(), randomUUID(), NOW)
  ledger.addMockMovement(intakeMovement(ambiguous, { id: 'ambiguous-1' }))
  ledger.addMockMovement(intakeMovement(ambiguous, { id: 'ambiguous-2' }))
  const missing = ledger.createOrder(orderInput(), randomUUID(), NOW)
  ledger.addMockMovement(intakeMovement(missing, { id: 'missing-1', description: null }))
  ledger.reconcileDue(later(60))
  assert.equal(ledger.getOrder(wrong.id)!.reason, 'amount_mismatch')
  assert.equal(ledger.getOrder(ambiguous.id)!.reason, 'multiple_movements')
  assert.equal(ledger.getOrder(missing.id)!.status, 'pending_payment')
  assert.equal(ledger.listEvents().length, 0)
})

test('ledger: changed data under the same transaction identity is quarantined, not overwritten', t => {
  const ledger = setup(t)
  const order = ledger.createOrder(orderInput(), randomUUID(), NOW)
  const movement = intakeMovement(order)
  ledger.addMockMovement(movement)
  assert.equal(ledger.addMockMovement({ ...movement, amountMinor: 1 }).conflict, true)
  ledger.reconcileDue(later(60))
  assert.equal(ledger.getOrder(order.id)!.reason, 'conflicting_movement')
  assert.equal(ledger.listEvents().length, 0)
})

test('ledger: a conflicting later snapshot reopens a simulated payment for review without freeing its transaction', t => {
  const ledger = setup(t)
  const order = ledger.createOrder(orderInput(), randomUUID(), NOW)
  const movement = intakeMovement(order)
  ledger.addMockMovement(movement)
  ledger.reconcileDue(later(60))
  ledger.addMockMovement({ ...movement, status: 'reversed' }, later(61))
  assert.equal(ledger.getOrder(order.id)!.status, 'manual_review')
  assert.equal(ledger.getOrder(order.id)!.reason, 'conflicting_movement')
  assert.equal(ledger.reconcileDue(later(62)).conflictCount, 1)
  assert.equal(ledger.listAudit(order.id).at(-1)!.event, 'movement.conflict')
})

test('ledger: snapshot intake rejects fractional cents, unzoned dates, forged flags and absent IDs', () => {
  const movement = intakeMovement(exampleOrder())
  for (const patch of [{ amountMinor: 1.2 }, { bookedAt: '2026-10-15T18:00:10' }, { conflict: false }, { id: '' }, { bookedAt: '2026-02-30T18:00:10.000Z' }]) {
    assert.throws(() => parseMovement({ ...movement, ...patch }))
  }
})

test('ledger: persistence, SQL uniqueness and transactional rollback include the outbox', t => {
  // mkdtemp creates one isolated directory under the approved Windows opencode temp directory.
  mkdirSync(join(tmpdir(), 'opencode'), { recursive: true })
  const directory = mkdtempSync(join(tmpdir(), 'opencode', 'sinpe-ledger-test-'))
  const path = join(directory, 'demo.sqlite')
  let ledger = new DemoLedger(path, { mode: 'mock', accountId: 'bac-personal-demo' }, store)
  const connection = new DatabaseSync(path)
  t.after(() => { connection.close(); ledger.close(); rmSync(directory, { recursive: true, force: true }) })
  const key = randomUUID()
  const order = ledger.createOrder(orderInput(), key, NOW)
  ledger.addMockMovement(intakeMovement(order))
  connection.exec("CREATE TRIGGER fail_outbox BEFORE INSERT ON outbox BEGIN SELECT RAISE(ABORT, 'simulated database failure'); END;")
  assert.throws(() => ledger.reconcileDue(later(60)), /simulated database failure/)
  assert.equal(ledger.getOrder(order.id)!.status, 'pending_payment')
  assert.equal(connection.prepare('SELECT count(*) AS count FROM allocations').get()!.count, 0)
  assert.equal(ledger.listEvents().length, 0)
  connection.exec('DROP TRIGGER fail_outbox')
  ledger.reconcileDue(later(60))
  assert.throws(() => connection.prepare("UPDATE orders SET status = 'paid' WHERE id = ?").run(order.id), /CHECK/)
  const second = ledger.createOrder(orderInput(), randomUUID(), NOW)
  assert.throws(() => connection.prepare('INSERT INTO allocations (order_id, account_id, movement_id, allocated_at) VALUES (?, ?, ?, ?)').run(second.id, order.accountId, 'bank-demo-1', later(60)), /UNIQUE/)
  ledger.close()
  ledger = new DemoLedger(path, { mode: 'mock', accountId: 'bac-personal-demo' }, store)
  assert.equal(ledger.createOrder(orderInput(), key, later(70)).status, 'simulated_paid')
  assert.equal(ledger.reconcileDue(later(70)).simulatedCount, 0)
  assert.equal(ledger.listEvents().length, 1)
})
