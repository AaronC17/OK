import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { store } from '../../src/config/store.ts'
import { MongoShopDatabase } from './mongo.ts'
import type { PreparedReceipt } from './receipts.ts'
import { tokenHash } from './security.ts'

const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://utn:88406844Cr..@cluster0.nsiunx4.mongodb.net/?appName=Cluster0'

const input = () => ({
  items: [{ selection: { kind: 'gummy', typeIds: ['ositos'], weight: 100 }, quantity: 1 }],
  deliveryId: 'pickup',
  customer: { name: 'Cliente Mongo', phone: '61551234', address: '', notes: '' },
  privacyAccepted: true,
})

const receipt = (identity = randomUUID()): PreparedReceipt => ({
  data: Buffer.from(`mongo-test-receipt-${identity}`),
  rawHash: tokenHash(identity),
  contentType: 'image/webp',
})

test('mongo: full store lifecycle on Atlas (orders, receipts, admin, audit, events, search)', async t => {
  const testDbName = `onkys_test_${Date.now()}`
  const db = new MongoShopDatabase(mongoUri, structuredClone(store), { dbName: testDbName })
  await db.init()

  t.after(async () => {
    try {
      await db.db.dropDatabase()
    } finally {
      await db.close()
    }
  })

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
  assert.match(order.code, /^ONK-[A-F0-9]{6}$/)
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
})
