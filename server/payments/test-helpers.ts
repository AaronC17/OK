import type { DemoOrder, StoredMovement } from './model.ts'

export const NOW = '2026-10-15T18:00:00.000Z'
export const later = (seconds: number) => new Date(Date.parse(NOW) + seconds * 1000).toISOString()

export const orderInput = () => ({
  deliveryId: 'pickup', items: [{ selection: { kind: 'gummy' as const, typeIds: ['ositos'], weight: 100 as const }, quantity: 1 }],
})

export function exampleOrder(): DemoOrder {
  return {
    id: 'order-demo', reference: 'ONK-0123456789ABCDEF', accountId: 'bac-personal-demo', amountMinor: 850000,
    currency: 'CRC', ...orderInput(), status: 'pending_payment', reason: 'awaiting_mock_movement',
    createdAt: NOW, expiresAt: later(1800), attempts: 0, nextAttemptAt: NOW, demoOnly: true,
  }
}

export function exampleMovement(order = exampleOrder(), overrides: Partial<StoredMovement> = {}): StoredMovement {
  return {
    id: 'bank-demo-1', accountId: order.accountId, bankReference: 'DEMO-REF-1', amountMinor: order.amountMinor,
    currency: 'CRC', direction: 'credit', status: 'posted', bookedAt: later(10), description: `Pedido ${order.reference}`,
    conflict: false, ...overrides,
  }
}

/** Mock intake must not accept the server-owned conflict flag. */
export function intakeMovement(order: DemoOrder, overrides: Partial<StoredMovement> = {}) {
  const { conflict: _conflict, ...movement } = exampleMovement(order, overrides)
  return movement
}
