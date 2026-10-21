import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import type { TestContext } from 'node:test'
import { store } from '../../src/config/store.ts'
import { ShopDatabase } from './database.ts'
import { orderOwner } from './accounts.ts'

const createCustomerData = (name: string, email: string, referralCode?: string) => ({
  name,
  email,
  password: 'Password-2026-Test!',
  privacyAccepted: true,
  referralCode,
})

const createOrderInput = (name: string, email: string, weight = 100) => ({
  items: [{ selection: { kind: 'gummy', typeIds: ['ositos'], weight }, quantity: 1 }],
  deliveryId: 'pickup',
  customer: { name, phone: '88888888', email, address: '', notes: '' },
  privacyAccepted: true,
})

function setup(t: TestContext) {
  const catalog = structuredClone(store)
  const db = new ShopDatabase(':memory:', catalog)
  t.after(() => db.close())
  db.configure({ enabled: true, phone: '80000000', beneficiary: 'Destino de prueba' }, 'admin-test')
  return { db }
}

test('referrals: user receives unique code, referred user starts pending without reward', async t => {
  const { db } = setup(t)
  const guest1 = db.customerSession(undefined)
  const referrerReg = await db.registerCustomer(createCustomerData('Carlos Méndez', 'carlos@test.cr'), guest1.session)
  const referrer = db.account(referrerReg.session)!

  assert.ok(referrer.referralCode, 'Referrer should have a referral code')
  assert.equal(referrer.creditBalanceMinor, 0, 'Initial credit balance must be 0')

  // Referred user registers with referrer code
  const guest2 = db.customerSession(undefined)
  const referredReg = await db.registerCustomer(
    createCustomerData('Ana Solís', 'ana@test.cr', referrer.referralCode),
    guest2.session
  )
  const referred = db.account(referredReg.session)!
  assert.ok(referred.referralCode)

  // Referrer still has 0 balance (only pending)
  const referrerAfter = db.account(referrerReg.session)!
  assert.equal(referrerAfter.creditBalanceMinor, 0)

  // Dashboard shows 1 pending referral, 0 valid
  const dashboard = db.referrals(referrerReg.session)
  assert.equal(dashboard.summary.pendingCount, 1)
  assert.equal(dashboard.summary.validCount, 0)
  assert.equal(dashboard.pendingReferrals.length, 1)
  assert.equal(dashboard.pendingReferrals[0].referredName, 'Ana S.')
  assert.equal(dashboard.pendingReferrals[0].status, 'pending')
  assert.equal(dashboard.validReferrals.length, 0)
})

test('referrals: self-referral by same email is strictly rejected', async t => {
  const { db } = setup(t)
  const guest1 = db.customerSession(undefined)
  const reg1 = await db.registerCustomer(createCustomerData('Carlos Méndez', 'carlos@test.cr'), guest1.session)
  const user1 = db.account(reg1.session)!

  const guest2 = db.customerSession(undefined)
  await assert.rejects(
    db.registerCustomer(createCustomerData('Carlos Clon', 'carlos@test.cr', user1.referralCode), guest2.session),
    /Ya existe una cuenta/
  )
})

test('referrals: 10% credit granted ONLY upon first paid order, capped at ₡5.000 CRC (500.000 céntimos)', async t => {
  const { db } = setup(t)

  // Referrer
  const guest1 = db.customerSession(undefined)
  const referrerReg = await db.registerCustomer(createCustomerData('Mario Vargas', 'mario@test.cr'), guest1.session)
  const referrerCode = db.account(referrerReg.session)!.referralCode!

  // Referred user
  const guest2 = db.customerSession(undefined)
  const referredReg = await db.registerCustomer(createCustomerData('Lucía Mora', 'lucia@test.cr', referrerCode), guest2.session)
  const referredOwner = orderOwner(referredReg.session)

  // 1. Referred user creates first order
  const order1 = db.createOrder(createOrderInput('Lucía Mora', 'lucia@test.cr', 100), referredOwner, randomUUID())
  assert.equal(order1.status, 'awaiting_payment')

  // Check: Still 0 credit while awaiting payment
  assert.equal(db.account(referrerReg.session)!.creditBalanceMinor, 0)

  // 2. Admin confirms payment (order becomes ready)
  const confirmed = db.confirm(order1.id, { version: order1.version, receiptId: null }, 'admin')
  assert.equal(confirmed.status, 'ready')

  // 3. Expected reward: 10% of total paid (order1.totalMinor)
  const expectedReward = Math.round(order1.totalMinor! * 0.10)
  const referrerAccount = db.account(referrerReg.session)!
  assert.equal(referrerAccount.creditBalanceMinor, expectedReward)

  // Dashboard check
  const dashboard = db.referrals(referrerReg.session)
  assert.equal(dashboard.summary.pendingCount, 0)
  assert.equal(dashboard.summary.validCount, 1)
  assert.equal(dashboard.validReferrals.length, 1)
  assert.equal(dashboard.validReferrals[0].rewardMinor, expectedReward)
  assert.equal(dashboard.validReferrals[0].firstOrderCode, order1.code)
  assert.equal(dashboard.ledger.length, 1)
  assert.equal(dashboard.ledger[0].type, 'referral_reward')
  assert.equal(dashboard.ledger[0].amountMinor, expectedReward)

  // 4. Second purchase by the same referred user must NOT generate additional credit
  const order2 = db.createOrder(createOrderInput('Lucía Mora', 'lucia@test.cr', 100), referredOwner, randomUUID())
  db.confirm(order2.id, { version: order2.version, receiptId: null }, 'admin')

  // Balance remains identical (one-time reward per referred person)
  assert.equal(db.account(referrerReg.session)!.creditBalanceMinor, expectedReward)
  assert.equal(db.referrals(referrerReg.session).ledger.length, 1)
})

test('referrals: reward respects the ₡5.000 CRC cap on large purchases', async t => {
  const { db } = setup(t)

  const guest1 = db.customerSession(undefined)
  const referrerReg = await db.registerCustomer(createCustomerData('Elena Cruz', 'elena@test.cr'), guest1.session)
  const referrerCode = db.account(referrerReg.session)!.referralCode!

  const guest2 = db.customerSession(undefined)
  const referredReg = await db.registerCustomer(createCustomerData('Pedro Salas', 'pedro@test.cr', referrerCode), guest2.session)
  const referredOwner = orderOwner(referredReg.session)

  // Large order with quantity 20 to exceed ₡50.000 total (10% would be > ₡5.000)
  const largeOrderInput = {
    items: [{ selection: { kind: 'gummy', typeIds: ['ositos'], weight: 500 }, quantity: 20 }],
    deliveryId: 'pickup',
    customer: { name: 'Pedro Salas', phone: '88888888', email: 'pedro@test.cr', address: '', notes: '' },
    privacyAccepted: true,
  }

  const order = db.createOrder(largeOrderInput, referredOwner, randomUUID())
  db.confirm(order.id, { version: order.version, receiptId: null }, 'admin')

  // Maximum reward is ₡5.000 = 500.000 céntimos
  const CAP_MINOR = 500_000
  const referrerAccount = db.account(referrerReg.session)!
  assert.equal(referrerAccount.creditBalanceMinor, CAP_MINOR)
})
