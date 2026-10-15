import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import type { AddressInfo } from 'node:net'
import test from 'node:test'
import type { TestContext } from 'node:test'
import { store } from '../../src/config/store.ts'
import { loadPaymentsConfig } from './config.ts'
import { makePaymentsServer } from './http.ts'
import { DemoLedger } from './ledger.ts'
import type { DemoOrder, PaymentsMode } from './model.ts'
import { intakeMovement, orderInput } from './test-helpers.ts'

async function setup(t: TestContext, mode: PaymentsMode = 'mock') {
  const config = loadPaymentsConfig({ PAYMENTS_MODE: mode, PAYMENTS_ADMIN_TOKEN: 'a'.repeat(43), PAYMENTS_RECONCILE_TOKEN: 'b'.repeat(43) })
  const ledger = new DemoLedger(':memory:', config, store)
  const server = makePaymentsServer(ledger, config)
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve) })
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    ledger.close()
  })
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  const call = (path: string, role: 'admin' | 'reconcile' | 'anonymous', body?: unknown, headers?: Record<string, string>) => fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { ...(role === 'anonymous' ? {} : { Authorization: `Bearer ${role === 'admin' ? config.adminToken : config.reconcileToken}` }), 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { config, ledger, base, call }
}

test('HTTP: health is explicitly non-production; every internal endpoint requires a token', async t => {
  const { call } = await setup(t)
  const health = await call('/health', 'anonymous')
  assert.deepEqual(await health.json(), { ok: true, mode: 'mock', demoOnly: true, productionReady: false })
  const denied = await call('/internal/orders', 'anonymous')
  assert.equal(denied.status, 401)
  assert.equal(denied.headers.get('cache-control'), 'no-store')
  assert.equal(denied.headers.get('access-control-allow-origin'), null)
  assert.equal((await denied.json() as { demoOnly: boolean }).demoOnly, true)
})

test('HTTP: n8n cannot create orders, supply bank movements, read orders or change a status', async t => {
  const { call } = await setup(t)
  for (const [path, body] of [
    ['/internal/orders', orderInput()], ['/internal/mock/movements', {}], ['/internal/orders', undefined], ['/internal/events', undefined],
  ] as const) {
    const response = await call(path, 'reconcile', body)
    assert.equal(response.status, 403)
    await response.json()
  }
  const injected = await call('/internal/reconciliation/run', 'reconcile', { status: 'paid', amountMinor: 1 })
  assert.equal(injected.status, 422)
  await injected.json()
  const wrongRole = await call('/internal/reconciliation/run', 'admin', {})
  assert.equal(wrongRole.status, 403)
  await wrongRole.json()
})

test('HTTP: browsers are denied even with a credential; no public confirm-payment endpoint exists', async t => {
  const { call } = await setup(t)
  const origin = await call('/internal/orders', 'admin', undefined, { Origin: 'https://example.invalid' })
  assert.equal(origin.status, 403)
  await origin.json()
  const confirm = await call('/api/payments/confirm', 'admin', { status: 'paid' })
  assert.equal(confirm.status, 404)
  await confirm.json()
})

test('HTTP: rejects missing idempotency, client pricing, malformed JSON, wrong content type and large payloads', async t => {
  const { call, base, config } = await setup(t)
  const missingKey = await call('/internal/orders', 'admin', orderInput())
  assert.equal(missingKey.status, 422)
  await missingKey.json()
  const clientPrice = await call('/internal/orders', 'admin', { ...orderInput(), total: 1 }, { 'Idempotency-Key': randomUUID() })
  assert.equal(clientPrice.status, 422)
  await clientPrice.json()
  for (const [contentType, body, status] of [
    ['application/json', '{bad', 400], ['text/plain', '{}', 415], ['application/json', 'x'.repeat(65 * 1024), 413],
  ] as const) {
    const response = await fetch(`${base}/internal/orders`, { method: 'POST', headers: { Authorization: `Bearer ${config.adminToken}`, 'Content-Type': contentType, 'Idempotency-Key': randomUUID() }, body })
    assert.equal(response.status, status)
    await response.json()
  }
})

test('HTTP: simultaneous redeliveries yield one order and one simulated confirmation, never paid', async t => {
  const { call } = await setup(t)
  const key = randomUUID()
  const responses = await Promise.all(Array.from({ length: 5 }, () => call('/internal/orders', 'admin', orderInput(), { 'Idempotency-Key': key })))
  assert.ok(responses.every(response => response.ok))
  const orders = await Promise.all(responses.map(response => response.json() as Promise<DemoOrder>))
  assert.equal(new Set(orders.map(order => order.id)).size, 1)
  const order = orders[0]
  const movement = intakeMovement(order, { bookedAt: order.createdAt })
  for (let i = 0; i < 2; i++) {
    const response = await call('/internal/mock/movements', 'admin', movement)
    assert.equal(response.status, 200)
    await response.json()
  }
  const runs = await Promise.all(Array.from({ length: 5 }, () => call('/internal/reconciliation/run', 'reconcile', {})))
  const summaries = await Promise.all(runs.map(response => response.json() as Promise<{ simulatedCount: number; demoOnly: boolean }>))
  assert.equal(summaries.reduce((sum, result) => sum + result.simulatedCount, 0), 1)
  assert.ok(summaries.every(result => result.demoOnly))
  const result = await (await call(`/internal/orders/${order.id}`, 'admin')).json() as DemoOrder
  assert.equal(result.status, 'simulated_paid')
  assert.equal(result.demoOnly, true)
  const events = await (await call('/internal/events', 'admin')).json() as { events: { event: string }[] }
  assert.deepEqual(events.events.map(event => event.event), ['payment.simulated'])
  const audit = await (await call(`/internal/orders/${order.id}/audit`, 'admin')).json() as { audit: unknown[] }
  assert.equal(audit.audit.length, 2)
})

test('HTTP: disabled mode never accepts a fixture or confirms a payment', async t => {
  const { call } = await setup(t, 'disabled')
  const order = await (await call('/internal/orders', 'admin', orderInput(), { 'Idempotency-Key': randomUUID() })).json() as DemoOrder
  assert.equal(order.status, 'manual_review')
  const fixture = await call('/internal/mock/movements', 'admin', intakeMovement(order))
  assert.equal(fixture.status, 409)
  await fixture.json()
  const summary = await (await call('/internal/reconciliation/run', 'reconcile', {})).json() as { simulatedCount: number; mode: string }
  assert.equal(summary.simulatedCount, 0)
  assert.equal(summary.mode, 'disabled')
})
