import type { CartItem, Selection, StoreConfig } from '../../src/types.ts'
import { resolveLine, totals } from '../../src/lib/shop.ts'
import { PaymentsError } from './model.ts'
import type { BankMovement } from './model.ts'

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PaymentsError(422, 'Se esperaba un objeto JSON.')
  return value as Record<string, unknown>
}

function fields(data: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(data).some(key => !allowed.includes(key))) throw new PaymentsError(422, 'El JSON contiene campos no permitidos.')
}

function text(value: unknown, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new PaymentsError(422, 'Campo de texto ausente o inválido.')
  return value.trim()
}

export function isInstant(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString() === value
}

function selection(value: unknown): Selection {
  const data = object(value)
  if (data.kind === 'gummy') {
    fields(data, ['kind', 'typeIds', 'weight'])
    if (!Array.isArray(data.typeIds) || data.typeIds.length < 1 || data.typeIds.length > 3 || ![100, 250, 500].includes(data.weight as number)) {
      throw new PaymentsError(422, 'La selección de gomitas es inválida.')
    }
    const typeIds = data.typeIds.map(id => text(id, 64)).sort()
    if (new Set(typeIds).size !== typeIds.length) throw new PaymentsError(422, 'Hay ingredientes repetidos.')
    return { kind: 'gummy', typeIds, weight: data.weight as 100 | 250 | 500 }
  }
  if (data.kind === 'dessert') {
    fields(data, ['kind', 'productId', 'variantId'])
    return { kind: 'dessert', productId: text(data.productId, 64), variantId: text(data.variantId, 64) }
  }
  if (data.kind === 'product') {
    fields(data, ['kind', 'productId', 'variantId'])
    return {
      kind: 'product',
      productId: text(data.productId, 64),
      variantId: data.variantId === undefined ? undefined : text(data.variantId, 64),
    }
  }
  throw new PaymentsError(422, 'El producto no es válido.')
}

export interface OrderInput { items: CartItem[]; deliveryId: string }

export function parseOrderInput(value: unknown): OrderInput {
  const data = object(value)
  fields(data, ['items', 'deliveryId'])
  if (!Array.isArray(data.items) || !data.items.length || data.items.length > 100) throw new PaymentsError(422, 'Se requieren entre 1 y 100 variantes.')
  const items = data.items.map(value => {
    const item = object(value)
    fields(item, ['selection', 'quantity'])
    if (!Number.isInteger(item.quantity) || (item.quantity as number) < 1 || (item.quantity as number) > 99) throw new PaymentsError(422, 'Cantidad inválida.')
    return { selection: selection(item.selection), quantity: item.quantity as number }
  })
  return { items, deliveryId: text(data.deliveryId, 64) }
}

export function quoteOrder(input: OrderInput, config: StoreConfig): number {
  if (config.currency.code !== 'CRC' || config.currency.fractionDigits !== 2) throw new PaymentsError(422, 'Se requiere CRC en céntimos enteros.')
  const lines = input.items.map(item => {
    const line = resolveLine(item, config)
    if (!line) throw new PaymentsError(422, 'Hay productos, cantidades o precios no disponibles.')
    return line
  })
  if (new Set(lines.map(line => line.key)).size !== lines.length) throw new PaymentsError(422, 'Combina las variantes repetidas antes de crear el pedido.')
  const method = config.deliveryMethods.find(method => method.id === input.deliveryId && method.enabled)
  const amount = totals(lines, method).total
  if (!method || amount === null) throw new PaymentsError(422, 'Confirma el costo de entrega antes de solicitar un pago.')
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new PaymentsError(422, 'El total debe ser un entero positivo en céntimos.')
  return amount
}

export function parseMovement(value: unknown): BankMovement {
  const data = object(value)
  fields(data, ['id', 'accountId', 'bankReference', 'amountMinor', 'currency', 'direction', 'status', 'bookedAt', 'description'])
  if (!Number.isSafeInteger(data.amountMinor) || (data.amountMinor as number) <= 0) throw new PaymentsError(422, 'El monto debe ser un entero positivo en céntimos.')
  if (data.direction !== 'credit' && data.direction !== 'debit') throw new PaymentsError(422, 'Dirección del movimiento inválida.')
  if (data.status !== 'posted' && data.status !== 'pending' && data.status !== 'reversed') throw new PaymentsError(422, 'Estado del movimiento inválido.')
  if (!isInstant(data.bookedAt)) throw new PaymentsError(422, 'La fecha debe ser UTC ISO: 2026-10-15T18:00:00.000Z.')
  if (data.description !== null && (typeof data.description !== 'string' || data.description.length > 1000)) throw new PaymentsError(422, 'Descripción ausente o inválida; usa null cuando no exista.')
  return {
    id: text(data.id, 200), accountId: text(data.accountId, 64), bankReference: text(data.bankReference, 200),
    amountMinor: data.amountMinor as number, currency: text(data.currency, 3), direction: data.direction,
    status: data.status, bookedAt: data.bookedAt, description: data.description as string | null,
  }
}
