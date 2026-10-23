import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import test from 'node:test'
import type { TestContext } from 'node:test'
import sharp from 'sharp'
import { store } from '../../src/config/store.ts'
import type { CheckoutPreview, ShopOrder } from '../../src/order-types.ts'
import { ShopDatabase } from './database.ts'
import { makeShopHandler } from './http.ts'
import { newToken } from './security.ts'

const TOKEN = newToken() + newToken()
const input = () => ({ items: [{ selection: { kind: 'gummy', typeIds: ['ositos'], weight: 100 }, quantity: 1 }], deliveryId: 'pickup', customer: { name: 'Cliente de prueba', phone: '61551234', email: 'cliente.de.prueba@ejemplo.cr', address: '', notes: '' }, privacyAccepted: true })

async function setup(t: TestContext) {
  const db = new ShopDatabase(':memory:', store)
  const setupToken = newToken()
  db.ensureSetupToken(setupToken)
  const handler = makeShopHandler(db, { automationToken: TOKEN })
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
        method, headers: { Cookie: [...cookies].map(([key, v]) => `${key}=${v}`).join('; '), ...(extra.Authorization ? {} : { Origin: base }), 'X-CSRF-Token': csrf, ...(value === undefined || multipart ? {} : { 'Content-Type': 'application/json' }), ...extra },
        body: value === undefined ? undefined : multipart ? value : JSON.stringify(value),
      })
      for (const cookie of response.headers.getSetCookie()) {
        const [pair] = cookie.split(';')
        const index = pair.indexOf('=')
        cookies.set(pair.slice(0, index), pair.slice(index + 1))
      }
      const result = await response.json() as T
      const nextCsrf = (result as { csrfToken?: string }).csrfToken
      if (nextCsrf) csrf = nextCsrf
      return { status: response.status, data: result }
    }
    return { call }
  }
  const admin = client()
  assert.equal((await admin.call('/api/admin/setup', { setupToken, username: 'test-admin', password: 'A-strong-test-password-2026!' })).status, 200)
  assert.equal((await admin.call('/api/admin/settings', { enabled: true, phone: '80000000', beneficiary: 'Destino de prueba, no pagar' }, 'PUT')).status, 200)
  const buyer = client()
  await buyer.call('/api/checkout')
  const png = await sharp({ create: { width: 30, height: 20, channels: 3, background: '#76538a' } }).png().toBuffer()
  const order = async (reference?: string): Promise<ShopOrder> => {
    const preview = (await buyer.call<CheckoutPreview>('/api/checkout/preview', input())).data
    const form = new FormData()
    form.set('checkoutToken', preview.token)
    form.set('uploadKey', randomUUID())
    form.set('receipt', new Blob([new Uint8Array(await sharp({ create: { width: 30, height: 20, channels: 3, background: reference ? '#111111' : '#76538a' } }).png().toBuffer())], { type: 'image/png' }), 'x.png')
    void png
    const created = await buyer.call<ShopOrder>('/api/orders', form)
    assert.equal(created.status, 200)
    if (reference) {
      // Customers type their bank reference with the receipt; set it directly to avoid a second upload.
      db.database.prepare('UPDATE receipts SET bank_reference = ? WHERE order_id = ?').run(reference, created.data.id)
      return db.getOrder(created.data.id)
    }
    return created.data
  }
  const movement = (overrides: Record<string, unknown> = {}, token = TOKEN) => new Promise<{ status: number; data: Record<string, unknown> }>((resolve, reject) => {
    fetch(`${base}/api/automation/bank-movements`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ source: 'bac-email', movementId: randomUUID(), bankReference: null, amountMinor: 1, currency: 'CRC', bookedAt: new Date().toISOString(), description: null, senderVerified: true, ...overrides }),
    }).then(async response => resolve({ status: response.status, data: await response.json() as Record<string, unknown> }), reject)
  })
  return { db, order, movement }
}

test('automation: exact code + amount confirms once and is idempotent', async t => {
  const { db, order, movement } = await setup(t)
  const created = await order()
  const body = { amountMinor: created.totalMinor, description: `SINPE ${created.code} gracias` }
  const first = await movement(body)
  assert.equal(first.status, 200)
  assert.equal(first.data.decision, 'confirmed')
  assert.equal(db.getOrder(created.id).status, 'ready')
  assert.equal(db.auditFor(created.id).some(entry => entry.actor === 'auto:n8n-bac'), true)
  const replay = await movement({ ...body, movementId: randomUUID() })
  assert.equal(replay.data.decision, 'already_confirmed')
})

test('automation: wrong amount, unverified sender, stale credit and amount-only never confirm', async t => {
  const { db, order, movement } = await setup(t)
  const created = await order()
  const total = created.totalMinor!
  assert.equal((await movement({ amountMinor: total - 1, description: created.code })).data.reason, 'amount_mismatch')
  assert.equal((await movement({ amountMinor: total + 1, description: created.code })).data.reason, 'amount_mismatch')
  assert.equal((await movement({ amountMinor: total, description: created.code, senderVerified: false })).data.reason, 'sender_not_verified')
  assert.equal((await movement({ amountMinor: total, description: created.code, bookedAt: new Date(Date.now() - 3600_000 * 24).toISOString() })).data.reason, 'credit_predates_order')
  assert.equal((await movement({ amountMinor: total, description: created.code, bookedAt: new Date(Date.now() + 3600_000).toISOString() })).data.reason, 'booked_in_the_future')
  const amountOnly = await movement({ amountMinor: total, description: 'Pago' })
  assert.equal(amountOnly.data.decision, 'review')
  assert.equal(amountOnly.data.reason, 'amount_and_time_only')
  assert.deepEqual(amountOnly.data.candidates, [created.code])
  assert.equal((await movement({ amountMinor: total, description: `${created.code} ONK-9999` })).data.reason, 'multiple_order_codes')
  assert.equal(db.getOrder(created.id).status, 'pending_review')
})

test('automation: bank reference typed by the buyer can link a credit without the code', async t => {
  const { db, order, movement } = await setup(t)
  const created = await order('REF-123456789')
  const result = await movement({ amountMinor: created.totalMinor, bankReference: 'ref-123456789', description: 'Pago' })
  assert.equal(result.data.decision, 'confirmed')
  assert.equal(result.data.matchedBy, 'reference')
  assert.equal(db.getOrder(created.id).status, 'ready')
})

test('automation: endpoint requires its own strong token and rejects unknown fields', async t => {
  const { movement } = await setup(t)
  assert.equal((await movement({}, 'x'.repeat(64))).status, 401)
  assert.equal((await movement({ paid: true })).status, 422)
  assert.equal((await movement({ currency: 'USD' })).status, 422)
})
