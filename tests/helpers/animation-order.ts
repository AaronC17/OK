import type { Page } from '@playwright/test'
import type { ShopOrder } from '../../src/order-types.ts'

export const animationOrder: ShopOrder = {
  id: 'animation-preview', code: 'ONK-0123456789ABCDEF', version: 1, status: 'pending_review', demo: true,
  createdAt: '2026-01-01T12:00:00.000Z', updatedAt: '2026-01-01T12:00:00.000Z',
  lines: [{ key: 'ositos', name: 'Ositos enchilados', options: ['100 g'], quantity: 1, unitPriceMinor: 120000, lineTotalMinor: 120000 }],
  subtotalMinor: 120000, shippingMinor: 280000, totalMinor: 400000,
  delivery: { id: 'delivery', name: 'Correos de Costa Rica', requiresAddress: true },
  customer: { name: 'Vista de animación', phone: '80000000', email: 'preview@example.com', address: 'Dirección de prueba', notes: '' },
  destination: null, receipt: null, customerMessage: null, paymentConfirmedAt: null, paymentVerification: null,
}

/** Read-only browser fixtures: no real order, upload, payment or admin session. */
export async function mockAnimationOrder(page: Page) {
  await page.route('**/api/checkout', route => route.fulfill({ json: { csrfToken: 'animation-test', sinpe: null, demo: true, maxReceiptBytes: 5_000_000 } }))
  await page.route('**/api/orders/current', route => route.fulfill({ json: { order: animationOrder } }))
  await page.route(`**/api/orders/${animationOrder.id}`, route => route.fulfill({ json: animationOrder }))
}
