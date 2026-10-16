import type { StoreConfig } from '../../src/types.ts'
import type { OrderCustomer, OrderLine, SinpeSettings } from '../../src/order-types.ts'
import { resolveLine, totals, validateCheckout } from '../../src/lib/shop.ts'
import { parseOrderInput } from '../payments/validation.ts'

export class StoreError extends Error {
  status: number
  constructor(status: number, message: string) { super(message); this.name = 'StoreError'; this.status = status }
}

export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StoreError(422, 'Se esperaba un objeto JSON.')
  return value as Record<string, unknown>
}
export function fields(data: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(data).some(key => !allowed.includes(key))) throw new StoreError(422, 'Hay campos no permitidos en la solicitud.')
}
export function text(value: unknown, min: number, max: number, label: string): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw new StoreError(422, `${label}: usa entre ${min} y ${max} caracteres.`)
  return value.trim()
}
export function phoneNumber(value: unknown): string {
  const raw = text(value, 8, 24, 'Teléfono').replace(/[\s()-]/g, '').replace(/^\+?506/, '')
  if (!/^[2-9]\d{7}$/.test(raw)) throw new StoreError(422, 'Escribe un teléfono costarricense válido de 8 dígitos.')
  return raw
}
export function bankReference(value: unknown): string {
  const reference = text(value, 6, 80, 'Referencia bancaria').toUpperCase()
  if (!/^[A-Z0-9][A-Z0-9/-]{5,79}$/.test(reference)) throw new StoreError(422, 'La referencia bancaria debe contener de 6 a 80 letras, números, guiones o barras, sin espacios.')
  return reference
}
export function orderCode(value: unknown): string {
  const code = text(value, 6, 20, 'Código de pedido').toUpperCase()
  if (!/^ONK-[A-Z0-9]{3,16}$/.test(code)) throw new StoreError(422, 'El código de pedido no tiene el formato esperado.')
  return code
}
export function minorAmount(value: unknown, allowZero = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (allowZero ? 0 : 1) || value > 100_000_000) throw new StoreError(422, 'Monto inválido. Debe ser un entero en céntimos de CRC, dentro del límite técnico de ₡1.000.000.')
  return value
}
export function version(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) throw new StoreError(422, 'Falta la versión vigente del pedido. Actualiza la vista.')
  return value
}
export function parseSettings(value: unknown): SinpeSettings {
  const data = record(value)
  fields(data, ['enabled', 'phone', 'beneficiary'])
  if (typeof data.enabled !== 'boolean') throw new StoreError(422, 'Indica si SINPE está habilitado.')
  return {
    enabled: data.enabled,
    phone: data.enabled || data.phone ? phoneNumber(data.phone) : '',
    beneficiary: text(data.beneficiary, data.enabled ? 3 : 0, 120, 'Nombre del beneficiario'),
  }
}

export function parseNewOrder(value: unknown, config: StoreConfig) {
  const data = record(value)
  fields(data, ['items', 'deliveryId', 'customer', 'privacyAccepted'])
  if (data.privacyAccepted !== true) throw new StoreError(422, 'Debes aceptar el uso de tus datos para gestionar el pedido y revisar el pago.')
  const input = parseOrderInput({ items: data.items, deliveryId: data.deliveryId })
  const rawCustomer = record(data.customer)
  fields(rawCustomer, ['name', 'phone', 'address', 'notes'])
  const customer: OrderCustomer = {
    name: text(rawCustomer.name, 1, 100, 'Nombre'), phone: phoneNumber(rawCustomer.phone),
    address: text(rawCustomer.address, 0, 500, 'Dirección'), notes: text(rawCustomer.notes, 0, 1000, 'Observaciones'),
  }
  const resolved = input.items.map(item => {
    const line = resolveLine(item, config)
    if (!line) throw new StoreError(422, 'Hay productos o precios no disponibles. Actualiza el carrito.')
    return line
  })
  if (new Set(resolved.map(line => line.key)).size !== resolved.length) throw new StoreError(422, 'Hay variantes repetidas en el carrito.')
  const errors = validateCheckout(resolved, { ...customer, deliveryId: input.deliveryId }, config)
  if (Object.keys(errors).length) throw new StoreError(422, Object.values(errors)[0]!)
  if (config.currency.code !== 'CRC' || config.currency.fractionDigits !== 2) throw new StoreError(422, 'La tienda debe usar CRC en céntimos enteros.')
  const method = config.deliveryMethods.find(method => method.id === input.deliveryId && method.enabled)!
  if (!method.requiresAddress) customer.address = ''
  const amounts = totals(resolved, method)
  minorAmount(amounts.subtotal)
  if (amounts.total !== null) minorAmount(amounts.total)
  const lines: OrderLine[] = resolved.map(({ key, name, options, quantity, unitPriceMinor, lineTotalMinor }) => ({ key, name, options, quantity, unitPriceMinor, lineTotalMinor }))
  return { input, customer, lines, amounts, delivery: { id: method.id, name: method.name, requiresAddress: method.requiresAddress } }
}
