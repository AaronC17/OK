import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import test from 'node:test'
import type { TestContext } from 'node:test'
import sharp from 'sharp'
import { store } from '../../src/config/store.ts'
import type { CheckoutConfig, CheckoutPreview, ShopOrder } from '../../src/order-types.ts'
import type { AdminCustomers, CustomerAuth, CustomerOrders } from '../../src/account-types.ts'
import { ShopDatabase } from './database.ts'
import { makeShopHandler } from './http.ts'
import { newToken } from './security.ts'

const input = () => ({ items: [{ selection: { kind: 'gummy', typeIds: ['ositos'], weight: 100 }, quantity: 1 }], deliveryId: 'pickup', customer: { name: 'Cliente de prueba', phone: '61551234', email: 'cliente.de.prueba@ejemplo.cr', address: '', notes: '' }, privacyAccepted: true })

async function setup(t: TestContext) {
  const db = new ShopDatabase(':memory:', store)
  const setupToken = newToken()
  db.ensureSetupToken(setupToken)
  const handler = makeShopHandler(db)
  const server = createServer((req, res) => { void handler(req, res) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => { await new Promise<void>(resolve => server.close(() => resolve())); db.close() })
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  function client() {
    const cookies = new Map<string, string>()
    let csrf = ''
    const call = async <T = Record<string, unknown>>(path: string, value?: unknown, method = value === undefined ? 'GET' : 'POST', extra: Record<string, string> = {}) => {
      const multipart = value instanceof FormData
      const response = await fetch(`${base}${path}`, {
        method, headers: { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '), Origin: base, 'X-CSRF-Token': csrf, ...(value === undefined || multipart ? {} : { 'Content-Type': 'application/json' }), ...extra },
        body: value === undefined ? undefined : multipart ? value : JSON.stringify(value),
      })
      for (const cookie of response.headers.getSetCookie()) {
        const [pair] = cookie.split(';')
        const index = pair.indexOf('=')
        cookies.set(pair.slice(0, index), pair.slice(index + 1))
      }
      const content = response.headers.get('content-type') ?? ''
      const result = content.includes('application/json') ? await response.json() as T : Buffer.from(await response.arrayBuffer()) as unknown as T
      const nextCsrf = (result as { csrfToken?: string }).csrfToken
      if (nextCsrf) csrf = nextCsrf
      return { status: response.status, headers: response.headers, data: result }
    }
    return { call }
  }
  const admin = client()
  const initialized = await admin.call('/api/admin/setup', { setupToken, username: 'test-admin', password: 'A-strong-test-password-2026!' })
  assert.equal(initialized.status, 200)
  const configured = await admin.call('/api/admin/settings', { enabled: true, phone: '80000000', beneficiary: 'Destino de prueba, no pagar' }, 'PUT')
  assert.equal(configured.status, 200)
  const buyer = client()
  const config = await buyer.call<CheckoutConfig>('/api/checkout')
  assert.equal(config.status, 200)
  const previews = new Map<string, CheckoutPreview>()
  const create = async (recipient = buyer) => {
    const response = await recipient.call<CheckoutPreview>('/api/checkout/preview', input())
    assert.equal(response.status, 200)
    previews.set(response.data.order.id, response.data)
    return response.data.order
  }
  const png = await sharp({ create: { width: 30, height: 20, channels: 3, background: '#76538a' } }).png().toBuffer()
  const upload = (order: ShopOrder, overrides: Partial<{ code: string; reference: string; file: Buffer; type: string }> = {}, recipient = buyer) => {
    const form = new FormData()
    const preview = previews.get(order.id)!
    let token = preview.token
    if (overrides.code) {
      const [payload, signature] = token.split('.')
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
      data.order.code = overrides.code
      token = `${Buffer.from(JSON.stringify(data)).toString('base64url')}.${signature}`
    }
    form.set('checkoutToken', token)
    form.set('uploadKey', randomUUID())
    form.set('receipt', new Blob([new Uint8Array(overrides.file ?? png)], { type: overrides.type ?? 'image/png' }), '../../unsafe-name.svg')
    return recipient.call<ShopOrder>('/api/orders', form)
  }
  return { db, base, admin, buyer, client, create, upload }
}

test('store HTTP: real multipart, sanitized private receipt, manual review and ready status end-to-end', async t => {
  const { admin, buyer, create, upload, client, db } = await setup(t)
  const order = await create()
  assert.equal(db.list(new URLSearchParams()).total, 0)
  assert.equal((await buyer.call<{ order: ShopOrder | null }>('/api/orders/current')).data.order, null)
  assert.equal((await buyer.call(`/api/orders/${order.id}`)).status, 404)
  const submitted = await upload(order)
  assert.equal(submitted.status, 200)
  assert.equal(submitted.data.status, 'pending_review')
  const reviewed = submitted.data
  const receiptPath = `/api/orders/${order.id}/receipts/${reviewed.receipt!.id}`
  const owned = await buyer.call<Buffer>(receiptPath)
  assert.equal(owned.status, 200)
  assert.equal(owned.headers.get('content-type'), 'image/webp')
  assert.equal(owned.headers.get('cache-control'), 'no-store')
  assert.ok(!owned.headers.get('content-disposition')!.includes('unsafe-name'))
  const outsider = client()
  await outsider.call('/api/checkout')
  assert.equal((await outsider.call(`/api/orders/${order.id}`)).status, 404)
  assert.equal((await outsider.call(receiptPath)).status, 404)
  assert.equal((await outsider.call(`/api/admin/orders/${order.id}/receipts/${reviewed.receipt!.id}`)).status, 401)
  const approval = { version: reviewed.version, receiptId: reviewed.receipt!.id }
  assert.equal((await buyer.call(`/api/admin/orders/${order.id}/confirm`, approval)).status, 401)
  const ready = await admin.call<ShopOrder>(`/api/admin/orders/${order.id}/confirm`, approval)
  assert.equal(ready.status, 200)
  assert.equal(ready.data.status, 'ready')
  assert.equal(ready.data.paymentVerification, 'manual')
  assert.equal((await buyer.call<ShopOrder>(`/api/orders/${order.id}`)).data.status, 'ready')
  assert.equal(db.database.prepare('SELECT count(*) AS count FROM manual_payments').get()!.count, 1)
})

test('store HTTP: backend rejects wrong code, invalid MIME and oversize files without saving or confirming', async t => {
  const { db, create, upload } = await setup(t)
  const order = await create()
  assert.equal((await upload(order, { code: 'ONK-0000000000000000' })).status, 422)
  assert.equal((await upload(order, { file: Buffer.from('not a real PNG') })).status, 422)
  assert.equal((await upload(order, { type: 'image/svg+xml', file: Buffer.from('<svg/>') })).status, 415)
  assert.equal((await upload(order, { file: Buffer.alloc(5 * 1024 * 1024 + 1) })).status, 413)
  assert.equal(db.database.prepare('SELECT count(*) AS count FROM receipts').get()!.count, 0)
  assert.equal(db.list(new URLSearchParams()).total, 0)
  assert.throws(() => db.getOrder(order.id), /no encontrado/)
})

test('store HTTP: admin sessions, CSRF, cross-site requests and logout protect all private operations', async t => {
  const { admin, buyer, client, create, upload } = await setup(t)
  const order = await create()
  const reviewed = (await upload(order)).data
  const anonymous = client()
  assert.equal((await anonymous.call('/api/admin/orders')).status, 401)
  assert.equal((await buyer.call('/api/admin/settings')).status, 401)
  assert.equal((await admin.call('/api/admin/settings', { enabled: false, phone: '', beneficiary: '' }, 'PUT', { 'X-CSRF-Token': '' })).status, 403)
  assert.equal((await buyer.call('/api/orders', input(), 'POST', { 'Idempotency-Key': randomUUID(), 'X-CSRF-Token': '' })).status, 403)
  assert.equal((await admin.call('/api/admin/orders', undefined, 'GET', { Origin: 'https://attacker.invalid' })).status, 403)
  const privatePath = `/api/admin/orders/${order.id}/receipts/${reviewed.receipt!.id}`
  assert.equal((await admin.call(privatePath)).status, 200)
  const session = await admin.call('/api/admin/session')
  assert.equal(session.data.authenticated, true)
  await admin.call('/api/admin/logout', {})
  assert.equal((await admin.call(privatePath)).status, 401)
  assert.equal((await admin.call('/api/admin/orders')).status, 401)
})

test('store HTTP: PDFs are authenticated attachments, never inline documents', async t => {
  const { buyer, create, upload } = await setup(t)
  const order = await create()
  const file = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n')
  const submitted = await upload(order, { type: 'application/pdf', file })
  assert.equal(submitted.status, 200)
  const result = await buyer.call<Buffer>(`/api/orders/${order.id}/receipts/${submitted.data.receipt!.id}`)
  assert.equal(result.headers.get('content-type'), 'application/pdf')
  assert.match(result.headers.get('content-disposition')!, /^attachment;/)
  assert.match(result.headers.get('content-security-policy')!, /sandbox/)
})

test('store HTTP: simultaneous receipt retries create one order; bare creation and direct status updates are rejected', async t => {
  const { buyer, create, upload, db } = await setup(t)
  const preview = await create()
  const replies = await Promise.all(Array.from({ length: 4 }, () => upload(preview)))
  assert.ok(replies.every(reply => reply.status === 200))
  assert.equal(new Set(replies.map(reply => reply.data.id)).size, 1)
  assert.equal(db.list(new URLSearchParams()).total, 1)
  assert.equal(db.database.prepare('SELECT count(*) AS count FROM receipts').get()!.count, 1)
  assert.equal((await buyer.call('/api/orders', input())).status, 415)
  assert.equal((await buyer.call('/api/checkout/preview', { ...input(), totalMinor: 1 })).status, 422)
  assert.equal((await buyer.call(`/api/orders/${replies[0].data.id}/confirm`, { status: 'ready' })).status, 404)
})

test('store HTTP: failed receipt persistence rolls back the order, audit, events and welcome benefit', async t => {
  const { buyer, client, db, create, upload } = await setup(t)
  await buyer.call('/api/account/register', customerRegistration())
  const preview = await create()
  const outsider = client()
  await outsider.call('/api/checkout')
  assert.equal((await upload(preview, {}, outsider)).status, 403)
  db.database.exec("CREATE TRIGGER reject_receipt BEFORE INSERT ON receipts BEGIN SELECT RAISE(ABORT, 'test failure'); END")
  assert.equal((await upload(preview)).status, 500)
  assert.equal((await buyer.call<CustomerOrders>('/api/account/orders')).data.total, 0)
  assert.equal((await buyer.call<CheckoutConfig>('/api/checkout')).data.account!.welcomeAvailable, true)
  assert.equal(db.database.prepare('SELECT count(*) AS count FROM shop_events').get()!.count, 0)
  assert.equal(db.database.prepare('SELECT count(*) AS count FROM shop_audit WHERE order_id IS NOT NULL').get()!.count, 0)
  db.database.exec('DROP TRIGGER reject_receipt')
  const saved = await upload(preview)
  assert.equal(saved.status, 200)
  assert.equal(saved.data.status, 'pending_review')
  assert.equal((await buyer.call<CustomerOrders>('/api/account/orders')).data.total, 1)
  assert.equal((await buyer.call<CheckoutConfig>('/api/checkout')).data.account!.welcomeAvailable, false)
  // Reusing the same receipt for another checkout must not leave a new order.
  assert.equal((await upload(await create())).status, 409)
  assert.equal(db.list(new URLSearchParams()).total, 1)
})

const customerRegistration = () => ({ name: 'Cliente con cuenta', email: 'cuenta@ejemplo.cr', password: 'Una-frase-segura-2026!', privacyAccepted: true })

test('accounts HTTP: registration and logout rotate HttpOnly sessions and CSRF; guests cannot access private history or the directory', async t => {
  const { buyer, client, admin, create, upload } = await setup(t)
  const outsider = client()
  await outsider.call('/api/checkout')
  assert.equal((await outsider.call('/api/account/orders')).status, 401)
  assert.equal((await outsider.call('/api/admin/customers')).status, 401)
  assert.equal((await buyer.call('/api/account/register', customerRegistration(), 'POST', { 'X-CSRF-Token': '' })).status, 403)
  assert.equal((await buyer.call('/api/account/login', { email: 'cuenta@ejemplo.cr', password: 'irrelevante' }, 'POST', { Origin: 'https://attacker.invalid' })).status, 403)
  const signed = await buyer.call<CustomerAuth>('/api/account/register', customerRegistration())
  assert.equal(signed.status, 200)
  assert.ok(signed.data.user?.id)
  assert.ok(!JSON.stringify(signed.data).includes('password'))
  assert.match(signed.headers.get('set-cookie')!, /HttpOnly; SameSite=Strict/)
  const preview = await create()
  assert.equal((await buyer.call<CustomerOrders>('/api/account/orders')).data.total, 0)
  const order = await upload(preview)
  assert.equal(order.data.discountMinor, 12500)
  assert.equal((await buyer.call<CustomerOrders>('/api/account/orders')).data.total, 1)
  assert.equal((await outsider.call(`/api/orders/${order.data.id}`)).status, 404)
  assert.equal((await admin.call<AdminCustomers>('/api/admin/customers')).data.customers[0].orderCount, 1)
  assert.equal((await buyer.call('/api/account/logout', {}, 'POST', { 'X-CSRF-Token': '' })).status, 403)
  const loggedOut = await buyer.call<CustomerAuth>('/api/account/logout', {})
  assert.equal(loggedOut.data.user, null)
  assert.notEqual(loggedOut.data.csrfToken, signed.data.csrfToken)
  assert.equal((await buyer.call('/api/account/orders')).status, 401)
  assert.equal((await buyer.call(`/api/orders/${order.data.id}`)).status, 404)
  assert.equal((await buyer.call('/api/account/login', { email: 'cuenta@ejemplo.cr', password: 'Incorrecta-2026!' })).status, 401)
  const login = await buyer.call<CustomerAuth>('/api/account/login', { email: 'CUENTA@ejemplo.cr', password: customerRegistration().password })
  assert.equal(login.status, 200)
  assert.equal(login.data.user!.id, signed.data.user!.id)
  assert.equal((await buyer.call<ShopOrder>(`/api/orders/${order.data.id}`)).data.totalMinor, 112500)
})

test('accounts HTTP: welcome survives drafts and failed uploads; simultaneous receipts consume it once', async t => {
  const { buyer, client, upload, create, db } = await setup(t)
  const signed = await buyer.call<CustomerAuth>('/api/account/register', customerRegistration())
  const secondDevice = client()
  await secondDevice.call('/api/checkout')
  const login = await secondDevice.call<CustomerAuth>('/api/account/login', { email: customerRegistration().email, password: customerRegistration().password })
  assert.equal(login.data.user!.id, signed.data.user!.id)
  const [first, second] = await Promise.all([
    create(),
    create(secondDevice),
  ])
  assert.equal(first.discountMinor, 12500)
  assert.equal(second.discountMinor, 12500)
  assert.equal((await buyer.call<CheckoutConfig>('/api/checkout')).data.account!.welcomeAvailable, true)
  assert.equal((await secondDevice.call<CustomerOrders>('/api/account/orders')).data.total, 0)
  assert.equal((await upload(first, { file: Buffer.from('not an image') })).status, 422)
  assert.equal((await buyer.call<CheckoutConfig>('/api/checkout')).data.account!.welcomeAvailable, true)
  const otherImage = await sharp({ create: { width: 31, height: 21, channels: 3, background: '#123456' } }).png().toBuffer()
  const submissions = await Promise.all([
    upload(first),
    upload(second, { file: otherImage }, secondDevice),
  ])
  assert.deepEqual(submissions.map(result => result.status).sort(), [200, 409])
  assert.match((submissions.find(result => result.status === 409)!.data as unknown as { error: string }).error, /ya se usó en otro pedido/)
  assert.equal((await buyer.call<CheckoutConfig>('/api/checkout')).data.account!.welcomeAvailable, false)
  assert.equal((await secondDevice.call<CheckoutConfig>('/api/checkout')).data.account!.welcomeAvailable, false)
  assert.equal(db.list(new URLSearchParams()).total, 1)
  const next = await create(secondDevice)
  assert.equal(next.discountMinor, 0)
  assert.equal(next.totalMinor, 125000)
})

test('accounts HTTP: credential failures are generic and account brute-force attempts are bounded', async t => {
  const { buyer } = await setup(t)
  for (let i = 0; i < 10; i++) {
    const response = await buyer.call('/api/account/login', { email: 'no-existe@ejemplo.cr', password: 'Incorrecta-2026!' })
    assert.equal(response.status, 401)
    assert.equal(response.data.error, 'Correo o contraseña incorrectos.')
  }
  assert.equal((await buyer.call('/api/account/login', { email: 'no-existe@ejemplo.cr', password: 'Incorrecta-2026!' })).status, 429)
})
