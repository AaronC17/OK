import type { CartItem, CartLine, CheckoutErrors, Customer, DeliveryMethod, Selection, StoreConfig, Weight } from '../types.ts'

export const MAX_QUANTITY = 99
export const CART_STORAGE_KEY = 'onkys.cart.v1'

export function money(amountMinor: number, config: StoreConfig): string {
  const { code, locale, fractionDigits } = config.currency
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(amountMinor / 10 ** fractionDigits)
}

export function selectionKey(selection: Selection): string {
  return selection.kind === 'gummy'
    ? `gummy:${[...new Set(selection.typeIds)].sort().join('+')}:${selection.weight}`
    : `dessert:${selection.productId}:${selection.variantId}`
}

function validPrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

/** Tipos visibles en el catálogo. Los ocultos conservan sus datos para reactivarlos después. */
export function visibleGummyTypes(config: StoreConfig) {
  return config.gummies.types.filter(type => type.visible !== false)
}

export function resolveLine(item: CartItem, config: StoreConfig): CartLine | null {
  const { selection, quantity } = item
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return null
  const key = selectionKey(selection)
  if (selection.kind === 'gummy') {
    if (!config.gummies.weights.includes(selection.weight)) return null
    const ids = [...new Set(selection.typeIds)].sort()
    if (!ids.length || (ids.length > 1 && !config.gummies.mixes.enabled)) return null
    const types = ids.map(id => config.gummies.types.find(type => type.id === id))
    if (types.some(type => !type?.available)) return null
    const first = types[0]!
    const mix = ids.length > 1
      ? config.gummies.mixes.combinations.find(combo => [...combo.typeIds].sort().join('+') === ids.join('+'))
      : undefined
    const price = ids.length === 1 ? first.prices[selection.weight] : mix?.prices[selection.weight]
    if (!validPrice(price)) return null
    return {
      selection: { ...selection, typeIds: ids }, quantity, key,
      name: ids.length === 1 ? `${first.name} ${first.coatingLabel}` : 'Mix de gomitas enchiladas',
      options: [ids.length > 1 ? 'Mixto' : 'Un solo tipo', types.map(type => type!.name).join(' + '), `${selection.weight} g${ids.length > 1 ? ' en total por bolsa' : ' por bolsa'}`],
      image: mix?.image ?? first.variantImages?.[selection.weight] ?? first.image,
      imageAlt: mix?.image ? config.heroImageAlt : first.imageAlt, unitPriceMinor: price, lineTotalMinor: price * quantity,
    }
  }
  if (!config.categories.dessertsEnabled) return null
  const dessert = config.desserts.find(product => product.id === selection.productId)
  const variant = dessert?.variants.find(variant => variant.id === selection.variantId)
  if (!dessert?.available || !variant?.available || !validPrice(variant.priceMinor)) return null
  return {
    selection, quantity, key, name: dessert.name,
    options: ['Postre', variant.label, variant.description],
    image: variant.image ?? dessert.image, imageAlt: dessert.imageAlt,
    unitPriceMinor: variant.priceMinor, lineTotalMinor: variant.priceMinor * quantity,
  }
}

export function addItem(items: CartItem[], item: CartItem): CartItem[] {
  const key = selectionKey(item.selection)
  const existing = items.findIndex(entry => selectionKey(entry.selection) === key)
  if (existing < 0) return [...items, { ...item, quantity: Math.min(MAX_QUANTITY, item.quantity) }]
  return items.map((entry, index) => index === existing
    ? { ...entry, quantity: Math.min(MAX_QUANTITY, entry.quantity + item.quantity) }
    : entry)
}

function parseSelection(value: unknown): Selection | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>
  if (data.kind === 'gummy' && Array.isArray(data.typeIds) && data.typeIds.every(id => typeof id === 'string') && typeof data.weight === 'number') {
    return { kind: 'gummy', typeIds: [...new Set(data.typeIds as string[])], weight: data.weight as Weight }
  }
  if (data.kind === 'dessert' && typeof data.productId === 'string' && typeof data.variantId === 'string') {
    return { kind: 'dessert', productId: data.productId, variantId: data.variantId }
  }
  return null
}

/** Only variant IDs and quantities are persisted; prices always come from the catalog. */
export function restoreCart(raw: string | null, config: StoreConfig): { items: CartItem[]; changed: boolean } {
  if (!raw) return { items: [], changed: false }
  try {
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object' || !('version' in data) || data.version !== 1 || !('items' in data) || !Array.isArray(data.items)) {
      return { items: [], changed: true }
    }
    let items: CartItem[] = []
    let changed = false
    for (const value of data.items.slice(0, 200)) {
      if (!value || typeof value !== 'object') { changed = true; continue }
      const selection = parseSelection(value.selection)
      if (!selection || !Number.isInteger(value.quantity) || value.quantity < 1 || value.quantity > MAX_QUANTITY) { changed = true; continue }
      const item = { selection, quantity: value.quantity as number }
      if (!resolveLine(item, config)) { changed = true; continue }
      items = addItem(items, item)
    }
    return { items, changed: changed || data.items.length > 200 }
  } catch {
    return { items: [], changed: true }
  }
}

export function totals(lines: CartLine[], method: DeliveryMethod | undefined) {
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotalMinor, 0)
  const shipping = method?.enabled && validPrice(method.feeMinor) ? method.feeMinor : null
  return { subtotal, shipping, total: shipping === null ? null : subtotal + shipping }
}

export function validateCheckout(lines: CartLine[], customer: Customer, config: StoreConfig): CheckoutErrors {
  const errors: CheckoutErrors = {}
  if (!lines.length) errors.cart = 'Añade algún favorito para preparar tu pedido.'
  if (!customer.name.trim()) errors.name = '¿Cómo te llamas? Escribe tu nombre.'
  else if (customer.name.trim().length > 100) errors.name = 'Usa un nombre de hasta 100 caracteres.'
  const method = config.deliveryMethods.find(method => method.id === customer.deliveryId && method.enabled)
  if (!method) errors.deliveryId = 'Elige cómo quieres recibir tu pedido.'
  if (method?.requiresAddress && !customer.address.trim()) errors.address = 'Indica dónde te gustaría recibirlo.'
  else if (method?.requiresAddress && customer.address.trim().length > 500) errors.address = 'La dirección debe tener hasta 500 caracteres.'
  if (customer.notes.trim().length > 1000) errors.notes = 'Las observaciones deben tener hasta 1.000 caracteres.'
  return errors
}
