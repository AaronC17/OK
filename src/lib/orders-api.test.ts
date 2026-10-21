import assert from 'node:assert/strict'
import test from 'node:test'
import { amountFromInput, ApiError, checkoutConfig, createOrder, currentOrder, loginCustomer } from './orders-api.ts'

test('manual payment amounts convert decimal strings to integer CRC cents without rounding', () => {
  assert.equal(amountFromInput('8500'), 850000)
  assert.equal(amountFromInput('8500,50'), 850050)
  assert.equal(amountFromInput('8500.5'), 850050)
  assert.equal(amountFromInput('0'), 0)
  for (const value of ['8.500,50', '1.001', '-1', 'NaN', '1e3', '', '1000001']) assert.throws(() => amountFromInput(value))
})

test('API: malformed and empty JSON responses report a recoverable error for reads and order creation', async t => {
  for (const payload of ['{truncated', 'null', '[]']) {
    t.mock.method(globalThis, 'fetch', async () => new Response(payload, { headers: { 'Content-Type': 'application/json' } }))
    await assert.rejects(currentOrder(), error => error instanceof ApiError && error.status === 502)
    await assert.rejects(createOrder([], 'pickup', { name: '', phone: '', email: '', address: '', notes: '' }, true, 'same-attempt-key'), error => error instanceof ApiError && error.status === 502)
    t.mock.restoreAll()
  }
})

test('API: checkout reads wait for session rotation and mutations use the latest CSRF token', async t => {
  let resolveCheckout!: (response: Response) => void
  let resolveLogin!: (response: Response) => void
  const checkout = new Promise<Response>(resolve => { resolveCheckout = resolve })
  const login = new Promise<Response>(resolve => { resolveLogin = resolve })
  const calls: { path: string; csrf: string | undefined }[] = []
  t.mock.method(globalThis, 'fetch', async (path: string, options: RequestInit) => {
    calls.push({ path, csrf: (options.headers as Record<string, string>)['X-CSRF-Token'] })
    if (calls.length === 1) return checkout
    if (path === '/api/account/login') return login
    return Response.json({ csrfToken: 'member-token', account: null })
  })
  const initial = checkoutConfig()
  const changing = loginCustomer('test@example.com', 'test-password')
  const refresh = checkoutConfig()
  assert.equal(calls.length, 1)
  resolveCheckout(Response.json({ csrfToken: 'guest-token', account: null }))
  await initial
  await Promise.resolve()
  assert.deepEqual(calls[1], { path: '/api/account/login', csrf: 'guest-token' })
  resolveLogin(Response.json({ csrfToken: 'member-token', user: null }))
  await changing
  await refresh
  assert.equal(calls.filter(call => call.path === '/api/checkout').length, 2)
  await createOrder([], 'pickup', { name: '', phone: '', email: '', address: '', notes: '' }, true, 'test-attempt-key')
  assert.equal(calls.at(-1)!.csrf, 'member-token')
})
