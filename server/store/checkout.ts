import { createHmac, randomUUID } from 'node:crypto'
import type { CheckoutPreview, ShopOrder, SinpeDestination } from '../../src/order-types.ts'
import { welcomeDiscount } from '../../src/lib/welcome.ts'
import { accountIdFromOwner } from './accounts.ts'
import { constantEqual } from './security.ts'
import { StoreError, text } from './validation.ts'
import type { parseNewOrder } from './validation.ts'

const signature = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url')

export function paymentPreview(parsed: ReturnType<typeof parseNewOrder>, owner: string, welcomeAvailable: boolean, destination: SinpeDestination | null, demo: boolean, code: string, secret: string): CheckoutPreview {
  if (!destination) throw new StoreError(409, 'El pago con SINPE aún no está disponible. Vuelve a intentarlo cuando la tienda confirme los datos de pago.')
  if (parsed.amounts.total === null) throw new StoreError(409, 'Falta confirmar el costo de envío. Elige otro método de entrega para continuar al pago.')
  const discount = welcomeDiscount(parsed.amounts.subtotal, welcomeAvailable)
  const now = new Date().toISOString()
  const order: ShopOrder = {
    id: randomUUID(), code, version: 1, status: 'awaiting_payment', demo,
    createdAt: now, updatedAt: now, lines: parsed.lines, customer: parsed.customer, delivery: parsed.delivery,
    destination, subtotalMinor: parsed.amounts.subtotal, shippingMinor: parsed.amounts.shipping,
    discountMinor: discount, totalMinor: parsed.amounts.total - discount, customerAccountId: accountIdFromOwner(owner),
    receipt: null, customerMessage: null, paymentConfirmedAt: null, paymentVerification: null,
  }
  // Keep the validated snapshot in the browser, signed by a persistent server-only
  // key. Opening payment stores neither a customer draft nor a pending order.
  const payload = Buffer.from(JSON.stringify({ owner, order })).toString('base64url')
  return { order, token: `${payload}.${signature(payload, secret)}` }
}

export function readPaymentPreview(value: unknown, owner: string, secret: string): ShopOrder {
  const token = text(value, 40, 64 * 1024, 'Datos de pago')
  const [payload, supplied, extra] = token.split('.')
  if (!payload || !supplied || extra !== undefined || !constantEqual(signature(payload, secret), supplied)) throw new StoreError(422, 'Los datos de pago no son válidos. Vuelve al carrito para revisarlos.')
  let snapshot: { owner: string; order: ShopOrder }
  try { snapshot = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) }
  catch { throw new StoreError(422, 'No se pudieron leer los datos de pago.') }
  if (snapshot.owner !== owner) throw new StoreError(403, 'Estos datos de pago pertenecen a otra sesión. Vuelve al carrito.')
  return snapshot.order
}
