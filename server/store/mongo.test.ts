import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { store } from '../../src/config/store.ts'
import { MongoShopDatabase } from './mongo.ts'
import type { PreparedReceipt } from './receipts.ts'
import { tokenHash } from './security.ts'

// Integration tests connect only to an explicitly configured test server.
const mongoUri = process.env.TEST_MONGODB_URI

const input = () => ({
  items: [{ selection: { kind: 'gummy', typeIds: ['ositos'], weight: 100 }, quantity: 1 }],
  deliveryId: 'pickup',
  customer: { name: 'Cliente Mongo', phone: '61551234', email: 'cliente.mongo@ejemplo.cr', address: '', notes: '' },
  privacyAccepted: true,
})

const receipt = (identity = randomUUID()): PreparedReceipt => ({
  data: Buffer.from(`mongo-test-receipt-${identity}`),
  rawHash: tokenHash(identity),
  contentType: 'image/webp',
})

test('mongo: full store lifecycle (orders, receipts, admin, audit, events, search)', { skip: !mongoUri }, async t => {
  const testDbName = `onkys_test_${randomUUID().replaceAll('-', '').slice(0, 24)}`
  const db = new MongoShopDatabase(mongoUri!, structuredClone(store), { dbName: testDbName })
  t.after(async () => {
    try {
      await db.db.dropDatabase()
    } finally {
      await db.close()
    }
  })
  await db.init()

  // 1. Initialized check & setup token
  assert.equal(await db.initialized(), false)
  const setupToken = 'abcdefghijklmnopqrstuvwxyz0123456789-_ABCDE'
  await db.ensureSetupToken(setupToken)

  // 2. Setup admin
  const adminSession = await db.setupAdmin({
    setupToken,
    username: 'adminmongo',
    password: 'AtlasPassword2026!',
  })
  assert.equal(await db.initialized(), true)
  assert.equal(await db.adminName(), 'adminmongo')
  assert.ok(adminSession.token)

  // 3. Configure SINPE
  await db.configure({ enabled: true, phone: '88888888', beneficiary: 'Onkys Mongo Test' }, 'adminmongo')
  const dest = await db.destination()
  assert.equal(dest?.phone, '88888888')

  // 4. Create customer session & order
  const { session: custSession } = await db.customerSession(undefined)
  const orderKey = randomUUID()
  const order = await db.createOrder(input(), custSession.hash, orderKey)
  assert.equal(order.code, 'ONK-1001')
  assert.equal(order.status, 'awaiting_payment')
  assert.equal(order.totalMinor, 120000)

  // Idempotent retry
  const retryOrder = await db.createOrder(input(), custSession.hash, orderKey)
  assert.equal(retryOrder.id, order.id)

  // 5. Add receipt
  const file = receipt()
  const withReceipt = await db.addReceipt(order.id, custSession.hash, order.code, 'BANK-MONGO-999', randomUUID(), order.version, file)
  assert.equal(withReceipt.status, 'pending_review')
  assert.ok(withReceipt.receipt)

  // Stored receipt binary check
  const stored = await db.receipt(order.id, withReceipt.receipt!.id)
  assert.equal(stored.contentType, 'image/webp')
  assert.deepEqual(stored.data, file.data)

  // 6. Confirm payment
  const confirmed = await db.confirm(order.id, { version: withReceipt.version, receiptId: withReceipt.receipt!.id }, 'adminmongo')
  assert.equal(confirmed.status, 'ready')
  assert.ok(confirmed.paymentConfirmedAt)

  // 7. Audit log check
  const audit = await db.auditFor(order.id)
  assert.ok(audit.length >= 3)
  assert.ok(audit.some(a => a.event === 'order.created'))
  assert.ok(audit.some(a => a.event === 'payment.confirmed_manual'))

  // 8. Admin listing & search
  const listAll = await db.list(new URLSearchParams('status=all'))
  assert.equal(listAll.total, 1)
  assert.equal(listAll.counts.ready, 1)

  const searchMatch = await db.list(new URLSearchParams(`q=${order.code.slice(4, 10)}`))
  assert.equal(searchMatch.total, 1)

  const searchNone = await db.list(new URLSearchParams('q=NONEXISTENT_CODE'))
  assert.equal(searchNone.total, 0)

  // Settings changed inside a transaction must also be read in that session.
  await db.configure({ enabled: false, phone: '', beneficiary: '' }, 'adminmongo')
  const pending = await db.createOrder(input(), custSession.hash, randomUUID())
  assert.equal(pending.status, 'pending_details')
  await db.configure({ enabled: true, phone: '81111111', beneficiary: 'Nuevo destino de prueba' }, 'adminmongo')
  const activated = await db.getOrder(pending.id)
  assert.equal(activated.status, 'awaiting_payment')
  assert.equal(activated.destination?.phone, '81111111')
  assert.equal((await db.getOrder(order.id)).destination?.phone, '88888888')

  const uploads = await Promise.allSettled([1, 2].map(() => db.addReceipt(activated.id, custSession.hash, activated.code, `BANK-${randomUUID()}`, randomUUID(), activated.version, receipt())))
  assert.equal(uploads.filter(result => result.status === 'fulfilled').length, 1)
  assert.equal(uploads.filter(result => result.status === 'rejected').length, 1)
  assert.equal((await db.getOrder(activated.id)).version, activated.version + 1)

  const guest = await db.customerSession(undefined)
  const member = await db.registerCustomer({ name: 'Cuenta de prueba', email: 'cuenta@ejemplo.cr', password: 'Clave-de-prueba-2026!', privacyAccepted: true }, guest.session)
  const memberOrder = await db.createOrder(input(), `account:${member.session.accountId}`, randomUUID())
  assert.equal(memberOrder.discountMinor, 12000)
  const directory = await db.customers(new URLSearchParams('q=cuenta@ejemplo.cr'))
  assert.equal(directory.customers[0].orderCount, 1)
  assert.equal(directory.customers[0].welcomeAvailable, false)
  assert.equal((await db.accountOrders(member.session, new URLSearchParams())).orders[0].id, memberOrder.id)
})
