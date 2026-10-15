import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { loadPaymentsConfig } from '../../server/payments/config.ts'
import type { DemoOrder } from '../../server/payments/model.ts'

async function main() {
  const config = loadPaymentsConfig(process.env)
  if (config.mode !== 'mock') throw new Error('La demostración necesita PAYMENTS_MODE=mock. No uses dinero ni datos bancarios reales.')
  const base = `http://127.0.0.1:${config.port}`
  const request = async (path: string, token: string, body?: unknown, key?: string): Promise<unknown> => {
    const response = await fetch(`${base}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15_000), redirect: 'error',
    })
    const data: unknown = await response.json()
    if (!response.ok) throw new Error(`La API local respondió ${response.status}. Revisa el modo y las credenciales locales.`)
    return data
  }
  const order = await request('/internal/orders', config.adminToken, {
    deliveryId: 'pickup', items: [
      { selection: { kind: 'gummy', typeIds: ['ositos'], weight: 500 }, quantity: 1 },
      { selection: { kind: 'gummy', typeIds: ['ositos'], weight: 100 }, quantity: 1 },
      { selection: { kind: 'gummy', typeIds: ['ositos', 'tiritas', 'gusanitos'], weight: 200 }, quantity: 1 },
    ],
  }, `demo-${randomUUID()}`) as DemoOrder
  assert.equal(order.demoOnly, true)
  const movement = {
    id: `demo-${randomUUID()}`, accountId: order.accountId, bankReference: `DEMO-${randomUUID()}`,
    amountMinor: order.amountMinor, currency: 'CRC', direction: 'credit', status: 'posted',
    bookedAt: new Date().toISOString(), description: `Pedido ${order.reference}`,
  }
  await request('/internal/mock/movements', config.adminToken, movement)
  // Redelivery is intentional: it must not create a second movement or event.
  await request('/internal/mock/movements', config.adminToken, movement)
  if (process.argv.includes('--prepare-only')) {
    console.log(`${order.reference} · CRC ${(order.amountMinor / 100).toFixed(2)} · pending_payment (DEMO)`)
    console.log('Pedido y movimiento ficticios preparados. Ejecuta «Prueba manual» en n8n. NO es un pago recibido.')
    return
  }
  await request('/internal/reconciliation/run', config.reconcileToken, {})
  await request('/internal/reconciliation/run', config.reconcileToken, {})
  const result = await request(`/internal/orders/${order.id}`, config.adminToken) as DemoOrder
  assert.equal(result.status, 'simulated_paid')
  const { events } = await request('/internal/events', config.adminToken) as { events: { orderId: string; event: string }[] }
  assert.equal(events.filter(event => event.orderId === order.id && event.event === 'payment.simulated').length, 1)
  console.log(`${order.reference} · CRC ${(order.amountMinor / 100).toFixed(2)} · simulated_paid`)
  console.log('Simulación local correcta: movimiento y conciliación repetidos, un solo evento. NO es un pago recibido.')
}

main().catch(() => {
  console.error('No se completó la simulación. Inicia npm run payments:dev con PAYMENTS_MODE=mock y consulta docs/pagos-sinpe-bac.md.')
  process.exitCode = 1
})
