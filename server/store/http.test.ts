import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import test from 'node:test'
import type { TestContext } from 'node:test'
import sharp from 'sharp'
import { store } from '../../src/config/store.ts'
import type { CheckoutConfig, ShopOrder } from '../../src/order-types.ts'
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
  const create = async () => {
    const response = await buyer.call<ShopOrder>('/api/orders', input(), 'POST', { 'Idempotency-Key': randomUUID() })
    assert.equal(response.status, 200)
    return response.data
  }
  const png = await sharp({ create: { width: 30, height: 20, channels: 3, background: '#76538a' } }).png().toBuffer()
  const upload = (order: ShopOrder, overrides: Partial<{ code: string; reference: string; file: Buffer; type: string }> = {}) => {
    const form = new FormData()
    form.set('code', overrides.code ?? order.code)
    form.set('bankReference', overrides.reference ?? `BANK-${randomUUID()}`)
    form.set('uploadKey', randomUUID())
    form.set('version', String(order.version))
    form.set('receipt', new Blob([new Uint8Array(overrides.file ?? png)], { type: overrides.type ?? 'image/png' }), '../../unsafe-name.svg')
    return buyer.call<ShopOrder>(`/api/orders/${order.id}/receipt`, form)
  }
  return { db, base, admin, buyer, client, create, upload }
}

test('store HTTP: real multipart, sanitized private receipt, manual review and ready status end-to-end', async t => {
  const { admin, buyer, create, upload, client, db } = await setup(t)
  const order = await create()
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
  assert.equal(db.getOrder(order.id).status, 'awaiting_payment')
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

test('store HTTP: simultaneous idempotent requests create one order; no direct status update exists', async t => {
  const { buyer } = await setup(t)
  const key = randomUUID()
  const replies = await Promise.all(Array.from({ length: 4 }, () => buyer.call<ShopOrder>('/api/orders', input(), 'POST', { 'Idempotency-Key': key })))
  assert.ok(replies.every(reply => reply.status === 200))
  assert.equal(new Set(replies.map(reply => reply.data.id)).size, 1)
  assert.equal((await buyer.call('/api/orders', { ...input(), totalMinor: 1 }, 'POST', { 'Idempotency-Key': randomUUID() })).status, 422)
  assert.equal((await buyer.call(`/api/orders/${replies[0].data.id}/confirm`, { status: 'ready' })).status, 404)
})

const customerRegistration = () => ({ name: 'Cliente con cuenta', email: 'cuenta@ejemplo.cr', password: 'Una-frase-segura-2026!', privacyAccepted: true })

test('accounts HTTP: registration and logout rotate HttpOnly sessions and CSRF; guests cannot access private history or the directory', async t => {
  const { buyer, client, admin } = await setup(t)
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
  const order = await buyer.call<ShopOrder>('/api/orders', input(), 'POST', { 'Idempotency-Key': randomUUID() })
  assert.equal(order.data.discountMinor, 12000)
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
  assert.equal((await buyer.call<ShopOrder>(`/api/orders/${order.data.id}`)).data.totalMinor, 108000)
})

test('accounts HTTP: simultaneous orders and idempotent retries cannot duplicate a welcome discount', async t => {
  const { buyer, client } = await setup(t)
  const signed = await buyer.call<CustomerAuth>('/api/account/register', customerRegistration())
  const secondDevice = client()
  await secondDevice.call('/api/checkout')
  const login = await secondDevice.call<CustomerAuth>('/api/account/login', { email: customerRegistration().email, password: customerRegistration().password })
  assert.equal(login.data.user!.id, signed.data.user!.id)
  const key = randomUUID()
  const [first, second] = await Promise.all([
    buyer.call<ShopOrder>('/api/orders', input(), 'POST', { 'Idempotency-Key': key }),
    secondDevice.call<ShopOrder>('/api/orders', input(), 'POST', { 'Idempotency-Key': randomUUID() }),
  ])
  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.equal(first.data.discountMinor! + second.data.discountMinor!, 12000)
  const retried = await secondDevice.call<ShopOrder>('/api/orders', input(), 'POST', { 'Idempotency-Key': key })
  assert.equal(retried.data.id, first.data.id)
  assert.equal(retried.data.totalMinor, first.data.totalMinor)
  assert.equal((await secondDevice.call<CustomerOrders>('/api/account/orders')).data.total, 2)
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
