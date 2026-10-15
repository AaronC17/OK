import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import type { TestContext } from 'node:test'
import { store } from '../../src/config/store.ts'
import type { ShopOrder } from '../../src/order-types.ts'
import { ShopDatabase } from './database.ts'
import type { PreparedReceipt } from './receipts.ts'
import { createSession, findSession, newToken, passwordMatches, tokenHash } from './security.ts'

const input = () => ({ items: [{ selection: { kind: 'gummy', typeIds: ['ositos'], weight: 100 }, quantity: 1 }], deliveryId: 'pickup', customer: { name: 'Ana Pérez', phone: '61551234', address: '', notes: '' }, privacyAccepted: true })
const receipt = (identity = randomUUID()): PreparedReceipt => ({ data: Buffer.from(`private-test-image-${identity}`), rawHash: tokenHash(identity), contentType: 'image/webp' })
function setup(t: TestContext, configured = true) {
  const catalog = structuredClone(store)
  const db = new ShopDatabase(':memory:', catalog)
  t.after(() => db.close())
  if (configured) db.configure({ enabled: true, phone: '80000000', beneficiary: 'Destino ficticio de pruebas' }, 'test-admin')
  const create = (owner = 'customer-a', key = randomUUID(), value: unknown = input()) => db.createOrder(value, owner, key)
  const upload = (order: ShopOrder, owner = 'customer-a', ref = 'BANK-TEST-123456', file = receipt()) => db.addReceipt(order.id, owner, order.code, ref, randomUUID(), order.version, file)
  const confirm = (order: ShopOrder, extra: Record<string, unknown> = {}) => db.confirm(order.id, { version: order.version, code: order.code, bankReference: order.receipt!.bankReference, amountMinor: order.totalMinor, checkedBank: true, note: 'Revisión manual ficticia, sin dinero real.', ...extra }, 'test-admin')
  return { db, catalog, create, upload, confirm }
}

test('store: server generates the code and freezes catalog prices, details and destination', t => {
  const { db, create, catalog } = setup(t)
  const order = create()
  assert.match(order.code, /^ONK-[A-F0-9]{16}$/)
  assert.equal(order.totalMinor, 120000)
  assert.equal(order.status, 'awaiting_payment')
  assert.equal(order.demo, true)
  catalog.gummies.types[0].prices[100] = 999999
  db.configure({ enabled: true, phone: '81111111', beneficiary: 'Otro destino ficticio' }, 'test-admin')
  const saved = db.getOrder(order.id)
  assert.equal(saved.totalMinor, 120000)
  assert.equal(saved.destination!.phone, '80000000')
  assert.equal(saved.lines[0].unitPriceMinor, 120000)
  assert.equal(saved.paymentConfirmedAt, null)
})

test('store: no browser-supplied code, price or paid state, no invalid customer or consent', t => {
  const { create } = setup(t)
  for (const patch of [{ code: 'ONK-FORGED' }, { totalMinor: 1 }, { status: 'ready' }, { privacyAccepted: false }, { customer: { ...input().customer, phone: '123' } }, { items: [] }]) assert.throws(() => create('customer-a', randomUUID(), { ...input(), ...patch }))
})

test('store: order retries are idempotent and scoped to the buyer, with no cross-customer leaks', t => {
  const { db, create } = setup(t)
  const key = randomUUID()
  const order = create('customer-a', key)
  assert.equal(create('customer-a', key).id, order.id)
  assert.notEqual(create('customer-b', key).id, order.id)
  assert.throws(() => create('customer-a', key, { ...input(), customer: { ...input().customer, name: 'Otra persona' } }), /otro carrito/)
  assert.throws(() => db.customerOrder(order.id, 'customer-b'), /no encontrado/)
  assert.equal(db.currentOrder('customer-a')!.id, order.id)
})

test('store: missing SINPE configuration or unknown delivery prevents requesting a payment', t => {
  const { db, create, upload } = setup(t, false)
  const order = create()
  assert.equal(order.status, 'pending_details')
  assert.equal(order.destination, null)
  assert.throws(() => upload(order), /estado actual/)
  assert.throws(() => db.quote(order.id, { version: order.version, shippingMinor: 0, note: 'Recogida de prueba confirmada.' }, 'admin'), /Configura/)
  db.configure({ enabled: true, phone: '80000000', beneficiary: 'Destino ficticio de pruebas' }, 'admin')
  const delivery = create('customer-a', randomUUID(), { ...input(), deliveryId: 'delivery', customer: { ...input().customer, address: 'Dirección de prueba' } })
  assert.equal(delivery.totalMinor, null)
  assert.equal(delivery.status, 'pending_details')
  const quoted = db.quote(delivery.id, { version: delivery.version, shippingMinor: 150000, note: 'Envío ficticio de ₡1.500 confirmado.' }, 'admin')
  assert.equal(quoted.totalMinor, 270000)
  assert.equal(quoted.status, 'awaiting_payment')
  assert.throws(() => db.quote(delivery.id, { version: quoted.version, shippingMinor: 1, note: 'No modificar el total congelado.' }, 'admin'), /ya tiene instrucciones/)
})

test('store: correct code plus private receipt only moves to review; wrong code and owner fail', t => {
  const { db, create, upload } = setup(t)
  const order = create()
  assert.throws(() => db.addReceipt(order.id, 'customer-a', 'ONK-0000000000000000', 'BANK-123456', randomUUID(), order.version, receipt()), /no corresponde/)
  assert.throws(() => upload(order, 'customer-b'), /no encontrado/)
  const reviewed = upload(order)
  assert.equal(reviewed.status, 'pending_review')
  assert.equal(reviewed.version, 2)
  assert.equal(reviewed.paymentVerification, null)
  assert.ok(reviewed.receipt)
  assert.equal(db.database.prepare('SELECT count(*) AS count FROM manual_payments').get()!.count, 0)
  assert.equal(db.database.prepare("SELECT count(*) AS count FROM shop_events WHERE event = 'payment.review_requested'").get()!.count, 1)
})

test('store: upload redelivery creates one receipt and reused files cannot claim another order', t => {
  const { db, create } = setup(t)
  const order = create()
  const file = receipt()
  const key = randomUUID()
  const saved = db.addReceipt(order.id, 'customer-a', order.code, 'BANK-123456', key, order.version, file)
  assert.equal(db.addReceipt(order.id, 'customer-a', order.code, 'BANK-123456', key, order.version, file).version, saved.version)
  assert.throws(() => db.addReceipt(order.id, 'customer-a', order.code, 'BANK-123456', key, order.version, receipt()), /datos distintos/)
  const other = create()
  assert.throws(() => db.addReceipt(other.id, 'customer-a', other.code, 'BANK-123456', randomUUID(), other.version, file), /otro pedido/)
  assert.equal(db.database.prepare('SELECT count(*) AS count FROM receipts').get()!.count, 1)
})

test('store: manual confirmation checks code, amount, reference, explicit bank attestation and current version', t => {
  const { create, upload, confirm } = setup(t)
  const order = upload(create())
  for (const patch of [{ checkedBank: false }, { amountMinor: 1 }, { bankReference: 'BANK-WRONG-123456' }, { code: 'ONK-0000000000000000' }, { version: order.version - 1 }, { status: 'ready' }]) assert.throws(() => confirm(order, patch))
  const ready = confirm(order)
  assert.equal(ready.status, 'ready')
  assert.equal(ready.paymentVerification, 'manual')
  assert.ok(ready.paymentConfirmedAt)
})

test('store: one verified bank reference cannot confirm two orders, even with different screenshots', t => {
  const { create, upload, confirm, db } = setup(t)
  const first = upload(create())
  const second = upload(create())
  confirm(first)
  assert.throws(() => confirm(second), /ya fue utilizada/)
  assert.equal(db.getOrder(second.id).status, 'pending_review')
  assert.equal(db.database.prepare('SELECT count(*) AS count FROM manual_payments').get()!.count, 1)
  confirm(first)
  assert.equal(db.auditFor(first.id).filter(entry => entry.event === 'payment.confirmed_manual').length, 1)
})

test('store: requesting corrections preserves history and old versions cannot approve a new receipt', t => {
  const { db, create, upload, confirm } = setup(t)
  const original = upload(create())
  const correction = db.reject(original.id, { version: original.version, reason: 'La imagen no permite leer la referencia.' }, 'test-admin')
  assert.equal(correction.status, 'rejected')
  assert.ok(correction.customerMessage)
  const updated = upload(correction, 'customer-a', 'BANK-CORRECTED-234567')
  assert.throws(() => confirm(original), /cambió/)
  assert.equal(confirm(updated).status, 'ready')
  assert.equal(db.database.prepare('SELECT count(*) AS count FROM receipts WHERE order_id = ?').get(original.id)!.count, 2)
  assert.equal(db.auditFor(original.id).filter(entry => entry.event === 'receipt.submitted').length, 2)
})

test('store: payment, ready state, audit and event roll back together on a database failure', t => {
  const { db, create, upload, confirm } = setup(t)
  const order = upload(create())
  db.database.exec("CREATE TRIGGER fail_confirm BEFORE INSERT ON shop_events WHEN NEW.event = 'payment.confirmed_manual' BEGIN SELECT RAISE(ABORT, 'test failure'); END;")
  assert.throws(() => confirm(order), /test failure/)
  assert.equal(db.getOrder(order.id).status, 'pending_review')
  assert.equal(db.database.prepare('SELECT count(*) AS count FROM manual_payments').get()!.count, 0)
  assert.equal(db.auditFor(order.id).filter(entry => entry.event === 'payment.confirmed_manual').length, 0)
  db.database.exec('DROP TRIGGER fail_confirm')
  confirm(order)
  assert.equal(db.database.prepare('SELECT count(*) AS count FROM manual_payments').get()!.count, 1)
})

test('store: dashboard filters, search and counts are backed by the database', t => {
  const { db, create, upload, confirm } = setup(t)
  create()
  const ready = upload(create())
  confirm(ready)
  const filtered = db.list(new URLSearchParams({ status: 'ready', q: ready.code }))
  assert.equal(filtered.total, 1)
  assert.equal(filtered.orders[0].id, ready.id)
  assert.equal(filtered.counts.ready, 1)
  assert.equal(filtered.counts.awaiting_payment, 1)
  assert.equal(db.list(new URLSearchParams({ q: "%' OR 1=1 --" })).total, 0)
})

test('store: admin setup token is one-use; passwords and cookies are hashed, roles and expiry are enforced', t => {
  const { db } = setup(t)
  const token = newToken()
  db.ensureSetupToken(token)
  assert.equal(db.initialized(), false)
  assert.throws(() => db.setupAdmin({ setupToken: newToken(), username: 'test-admin', password: 'A-long-test-password-2026!' }), /incorrecto/)
  const auth = db.setupAdmin({ setupToken: token, username: 'test-admin', password: 'A-long-test-password-2026!' })
  assert.equal(db.initialized(), true)
  assert.throws(() => db.setupAdmin({ setupToken: token, username: 'other-admin', password: 'Another-long-password!' }), /ya fue configurada/)
  const hash = db.database.prepare('SELECT password_hash FROM admin').get()!.password_hash as string
  assert.ok(!hash.includes('A-long-test-password'))
  assert.ok(passwordMatches('A-long-test-password-2026!', hash))
  assert.equal(db.session(auth.token, 'admin')!.role, 'admin')
  assert.equal(db.session(auth.token, 'customer'), null)
  assert.equal(findSession(db.database, auth.token, 'admin', Date.now() + 9 * 3600_000), null)
  db.logout(auth.session)
  assert.equal(db.session(auth.token, 'admin'), null)
  const buyer = createSession(db.database, 'customer')
  assert.equal(db.session(buyer.token, 'admin'), null)
})
