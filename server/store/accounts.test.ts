import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import type { TestContext } from 'node:test'
import { store } from '../../src/config/store.ts'
import { ShopDatabase } from './database.ts'
import { accountOwner, accountPasswordHash, accountPasswordMatches, orderOwner } from './accounts.ts'
import { welcomeDiscount } from '../../src/lib/welcome.ts'

const registration = () => ({ name: 'Ana Pérez', email: 'ana@ejemplo.cr', password: 'Una-frase-segura-2026!', privacyAccepted: true })
const input = () => ({ items: [{ selection: { kind: 'gummy', typeIds: ['ositos'], weight: 100 }, quantity: 1 }], deliveryId: 'pickup', customer: { name: 'Ana Pérez', phone: '61551234', email: 'ana@ejemplo.cr', address: '', notes: '' }, privacyAccepted: true })
function setup(t: TestContext, configured = true) {
  const catalog = structuredClone(store)
  const db = new ShopDatabase(':memory:', catalog)
  t.after(() => db.close())
  if (configured) db.configure({ enabled: true, phone: '80000000', beneficiary: 'Destino ficticio, no pagar' }, 'test-admin')
  return { db, catalog }
}

test('accounts: passwords are salted, expensive, space-sensitive hashes, never plaintext', async () => {
  const password = ' Una frase con espacios  '
  const a = await accountPasswordHash(password)
  const b = await accountPasswordHash(password)
  assert.notEqual(a, b)
  assert.ok(!a.includes(password))
  assert.equal(await accountPasswordMatches(password, a), true)
  assert.equal(await accountPasswordMatches(password.trim(), a), false)
  assert.equal(await accountPasswordMatches(password), false)
  await assert.rejects(accountPasswordHash('corta'), /8 y 128/)
  await assert.rejects(accountPasswordHash(' '.repeat(20)))
})

test('accounts: explicit consent, normalized unique emails and strict fields; credentials never leave the repository', async t => {
  const { db } = setup(t)
  const guest = db.customerSession(undefined)
  for (const patch of [{ privacyAccepted: false }, { role: 'admin' }, { email: 'not-an-email' }, { name: '' }, { password: 'corta' }]) await assert.rejects(db.registerCustomer({ ...registration(), ...patch }, guest.session))
  const signed = await db.registerCustomer({ ...registration(), email: '  ANA@EJEMPLO.CR  ' }, guest.session)
  const user = db.account(signed.session)!
  assert.equal(user.email, 'ana@ejemplo.cr')
  assert.equal(user.welcomeAvailable, true)
  assert.deepEqual(Object.keys(user).sort(), ['createdAt', 'creditBalanceMinor', 'email', 'id', 'name', 'referralCode', 'welcomeAvailable'])
  assert.equal(db.session(guest.token!, 'customer'), null)
  assert.notEqual(signed.session.csrf, guest.session.csrf)
  assert.equal(db.session(signed.token, 'admin'), null)
  await assert.rejects(db.registerCustomer(registration(), db.customerSession(undefined).session), /Ya existe una cuenta/)
  await assert.rejects(db.registerCustomer({ ...registration(), email: 'otra@ejemplo.cr' }, guest.session), /sesión cambió/)
  assert.equal(db.customers(new URLSearchParams()).total, 1)
})

test('accounts: orders follow the account across devices; only this browser’s guest orders are linked', async t => {
  const { db } = setup(t)
  const guest = db.customerSession(undefined)
  const owned = db.createOrder(input(), guest.session.hash, randomUUID())
  const outsider = db.customerSession(undefined)
  const other = db.createOrder(input(), outsider.session.hash, randomUUID())
  const signed = await db.registerCustomer(registration(), guest.session)
  const owner = orderOwner(signed.session)
  assert.equal(db.customerOrder(owned.id, owner).customerAccountId, signed.session.accountId)
  assert.throws(() => db.customerOrder(other.id, owner), /no encontrado/)
  assert.throws(() => db.customerOrder(owned.id, guest.session.hash), /no encontrado/)
  assert.equal(db.accountOrders(signed.session, new URLSearchParams()).total, 1)
  assert.throws(() => db.accountOrders(outsider.session, new URLSearchParams()), /Inicia sesión/)
  await assert.rejects(db.loginCustomer({ email: registration().email, password: 'Clave incorrecta' }, outsider.session), /Correo o contraseña incorrectos/)
  await assert.rejects(db.loginCustomer({ email: 'nadie@ejemplo.cr', password: 'Clave incorrecta' }, outsider.session), /Correo o contraseña incorrectos/)
  const newDevice = await db.loginCustomer({ email: registration().email, password: registration().password }, db.customerSession(undefined).session)
  assert.equal(orderOwner(newDevice.session), owner)
  assert.equal(db.currentOrder(orderOwner(newDevice.session))!.id, owned.id)
  db.logout(signed.session)
  assert.equal(db.session(signed.token, 'customer'), null)
  assert.ok(db.session(newDevice.token, 'customer'))
})

test('accounts: welcome is applied once per account, never to shipping, and retries keep the original total', async t => {
  const { db } = setup(t)
  const signed = await db.registerCustomer(registration(), db.customerSession(undefined).session)
  const owner = orderOwner(signed.session)
  const value = { ...input(), deliveryId: 'delivery', customer: { ...input().customer, address: 'Dirección de prueba' } }
  const key = randomUUID()
  const first = db.createOrder(value, owner, key)
  assert.equal(first.subtotalMinor, 125000)
  assert.equal(first.discountMinor, 12500)
  assert.equal(first.shippingMinor, 280000)
  assert.equal(first.totalMinor, 392500)
  assert.equal(db.account(signed.session)!.welcomeAvailable, false)
  assert.equal(db.createOrder(value, owner, key).totalMinor, 392500)
  const newDevice = await db.loginCustomer({ email: registration().email, password: registration().password }, db.customerSession(undefined).session)
  const second = db.createOrder(value, orderOwner(newDevice.session), randomUUID())
  assert.equal(second.discountMinor, 0)
  assert.equal(second.totalMinor, 405000)
  for (const patch of [{ discountMinor: 125000 }, { customerAccountId: randomUUID() }, { owner }]) assert.throws(() => db.createOrder({ ...input(), ...patch }, owner, randomUUID()), /campos no permitidos/)
  const guest = db.createOrder(input(), 'anonymous', randomUUID())
  assert.equal(guest.discountMinor, 0)
})

test('accounts: welcome consumption rolls back on failure and survives pending payment-detail completion', async t => {
  const { db } = setup(t, false)
  const signed = await db.registerCustomer(registration(), db.customerSession(undefined).session)
  const owner = orderOwner(signed.session)
  db.database.exec("CREATE TRIGGER fail_event BEFORE INSERT ON shop_events BEGIN SELECT RAISE(ABORT, 'test rollback'); END")
  assert.throws(() => db.createOrder(input(), owner, randomUUID()), /test rollback/)
  assert.equal(db.account(signed.session)!.welcomeAvailable, true)
  assert.equal(db.accountOrders(signed.session, new URLSearchParams()).total, 0)
  db.database.exec('DROP TRIGGER fail_event')
  const first = db.createOrder(input(), owner, randomUUID())
  assert.equal(first.status, 'pending_details')
  assert.equal(first.totalMinor, 112500)
  db.configure({ enabled: true, phone: '80000000', beneficiary: 'Destino ficticio' }, 'test-admin')
  assert.equal(db.getOrder(first.id).totalMinor, 112500)
  assert.equal(db.getOrder(first.id).status, 'awaiting_payment')
})

test('accounts: admin directory and per-account orders never use email matching or return password hashes', async t => {
  const { db } = setup(t)
  const signed = await db.registerCustomer(registration(), db.customerSession(undefined).session)
  const user = db.account(signed.session)!
  db.createOrder(input(), accountOwner(user.id), randomUUID())
  db.createOrder(input(), 'unrelated-guest-with-same-email', randomUUID())
  const results = db.customers(new URLSearchParams('q=ANA@ejemplo'))
  assert.equal(results.total, 1)
  assert.equal(results.customers[0].orderCount, 1)
  assert.ok(!JSON.stringify(results).includes('password'))
  assert.equal(db.customers(new URLSearchParams('q=%')).total, 0)
  const orders = db.list(new URLSearchParams({ customerId: user.id }))
  assert.equal(orders.total, 1)
  assert.equal(orders.counts.awaiting_payment, 1)
})

test('accounts: welcome rounding is integer, deterministic and leaves shipping eligibility based on products', async t => {
  for (const subtotal of [1, 5, 14, 15, 120000, 1500000, 1500001, 100000000]) {
    assert.equal(welcomeDiscount(subtotal, true), Math.round(subtotal / 10))
    assert.equal(welcomeDiscount(subtotal, false), 0)
  }
  const { db, catalog } = setup(t)
  catalog.gummies.types[0].prices[100] = 1500000
  const signed = await db.registerCustomer(registration(), db.customerSession(undefined).session)
  const order = db.createOrder({ ...input(), deliveryId: 'delivery', customer: { ...input().customer, address: 'Dirección de prueba' } }, orderOwner(signed.session), randomUUID())
  assert.equal(order.shippingMinor, 0)
  assert.equal(order.discountMinor, 150000)
  assert.equal(order.totalMinor, 1350000)
})
