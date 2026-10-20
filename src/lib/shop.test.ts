import { test } from 'node:test'
import assert from 'node:assert/strict'
import { store } from '../config/store.ts'
import { addItem, money, resolveLine, restoreCart, selectionKey, shippingFee, totals, validateCheckout } from './shop.ts'
import type { CartItem, Customer, StoreConfig } from '../types.ts'

const gummy: CartItem = { selection: { kind: 'gummy', typeIds: ['ositos'], weight: 100 }, quantity: 2 }
const dessert: CartItem = { selection: { kind: 'dessert', productId: 'brownie', variantId: 'box-4' }, quantity: 1 }
const customer: Customer = { name: '  Ana Pérez  ', deliveryId: 'delivery', address: 'Calle del Sol 12, 2º B', notes: '' }
const copy = (): StoreConfig => structuredClone(store)
const withDesserts = (): StoreConfig => {
  const config = copy()
  config.categories.dessertsEnabled = true
  return config
}
const withAllGummies = (): StoreConfig => {
  const config = copy()
  for (const type of config.gummies.types) type.visible = true
  return config
}
const normalize = (text: string) => text.replaceAll('\u00a0', ' ')

test('exactly three weights, independently priced for each type', () => {
  assert.deepEqual(store.gummies.weights, [100, 250, 500])
  assert.equal(store.gummies.types.length, 3)
  for (const type of store.gummies.types) for (const weight of store.gummies.weights) {
    const line = resolveLine({ selection: { kind: 'gummy', typeIds: [type.id], weight }, quantity: 3 }, store)!
    assert.equal(line.unitPriceMinor, type.prices[weight])
    assert.equal(line.lineTotalMinor, type.prices[weight]! * 3)
  }
  assert.notEqual(store.gummies.types[0].prices[500], store.gummies.types[0].prices[100]! * 5)
})

test('dessert data remains available for later, but the category is currently disabled', () => {
  const config = withDesserts()
  assert.equal(resolveLine(dessert, store), null)
  for (const product of config.desserts) for (const variant of product.variants) {
    const line = resolveLine({ selection: { kind: 'dessert', productId: product.id, variantId: variant.id }, quantity: 2 }, config)!
    assert.ok(line.options.includes(variant.description))
    assert.equal(line.lineTotalMinor, variant.priceMinor! * 2)
  }
})

test('identical variants merge, weights, mixtures and dessert presentations stay separate', () => {
  let items = addItem([], gummy)
  items = addItem(items, gummy)
  items = addItem(items, { selection: { kind: 'gummy', typeIds: ['ositos'], weight: 500 }, quantity: 1 })
  items = addItem(items, { selection: { kind: 'gummy', typeIds: ['ositos', 'tiritas'], weight: 100 }, quantity: 1 })
  items = addItem(items, dessert)
  items = addItem(items, { selection: { kind: 'dessert', productId: 'brownie', variantId: 'individual' }, quantity: 1 })
  assert.equal(items.length, 5)
  assert.equal(items[0].quantity, 4)
  assert.equal(addItem(items, { ...gummy, quantity: 99 })[0].quantity, 99)
})

test('all combinations of two or three gummies work at all three weights', () => {
  const config = withAllGummies()
  assert.equal(config.gummies.mixes.enabled, true)
  assert.equal(config.gummies.mixes.combinations.length, 4)
  for (const combo of config.gummies.mixes.combinations) for (const weight of config.gummies.weights) {
    const line = resolveLine({ selection: { kind: 'gummy', typeIds: combo.typeIds, weight }, quantity: 2 }, config)!
    assert.equal(line.unitPriceMinor, combo.prices[weight])
    assert.equal(line.lineTotalMinor, combo.prices[weight]! * 2)
    assert.ok(line.options.includes('Mixto'))
    assert.ok(line.options.includes(`${weight} g en total por bolsa`))
  }
  const selection = { kind: 'gummy' as const, typeIds: ['gusanitos', 'ositos'], weight: 250 as const }
  assert.equal(selectionKey(selection), selectionKey({ ...selection, typeIds: ['ositos', 'gusanitos'] }))
})

test('mixtures never derive prices or allow unavailable ingredients', () => {
  const item: CartItem = { selection: { kind: 'gummy', typeIds: ['gusanitos', 'ositos'], weight: 250 }, quantity: 2 }
  const config = withAllGummies()
  config.gummies.mixes.enabled = false
  assert.equal(resolveLine(item, config), null)
  config.gummies.mixes.enabled = true
  config.gummies.mixes.combinations = []
  assert.equal(resolveLine(item, config), null)
  config.gummies.mixes.combinations.push({ typeIds: ['ositos', 'gusanitos'], prices: { 100: 142123, 250: 271355, 500: 561223 } })
  assert.equal(resolveLine(item, config)!.unitPriceMinor, 271355)
  assert.equal(resolveLine(item, config)!.lineTotalMinor, 542710)
  config.gummies.types[0].available = false
  assert.equal(resolveLine(item, config), null)
})

test('missing prices, disabled products and invalid quantities cannot be ordered', () => {
  const config = withDesserts()
  config.gummies.types[0].prices[100] = null
  assert.equal(resolveLine(gummy, config), null)
  config.desserts[0].variants[1].available = false
  assert.equal(resolveLine(dessert, config), null)
  for (const quantity of [-1, 0, .5, 100, NaN]) assert.equal(resolveLine({ ...gummy, quantity }, store), null)
})

test('saved cart uses current prices and removes paused categories', () => {
  const raw = JSON.stringify({ version: 1, items: [{ ...gummy, unitPriceMinor: 1 }, dessert, gummy] })
  const restored = restoreCart(raw, store)
  assert.equal(restored.items.length, 1)
  assert.equal(restored.changed, true)
  const whenEnabled = restoreCart(raw, withDesserts())
  assert.equal(whenEnabled.items.length, 2)
  assert.equal(whenEnabled.changed, false)
  assert.equal(restored.items[0].quantity, 4)
  assert.equal(resolveLine(restored.items[0], store)!.lineTotalMinor, 480000)
  const config = copy()
  config.gummies.types[0].prices[100] = 125000
  assert.equal(resolveLine(restored.items[0], config)!.lineTotalMinor, 500000)
})

test('corrupt storage and old discontinued categories/weights are handled gracefully', () => {
  for (const input of ['{broken', 'null', '[]', '{"version":2,"items":[]}']) assert.deepEqual(restoreCart(input, store), { items: [], changed: true })
  assert.deepEqual(restoreCart(null, store), { items: [], changed: false })
  const restored = restoreCart(JSON.stringify({ version: 1, items: [gummy,
    { selection: { kind: 'poster', productId: 'formas', sizeId: 'small' }, quantity: 1 },
    { selection: { kind: 'gummy', typeIds: ['ositos'], weight: 200 }, quantity: 1 },
    { ...dessert, quantity: -2 }, null,
  ] }), store)
  assert.deepEqual(restored.items, [gummy])
  assert.equal(restored.changed, true)
})

test('quoted, free and fixed delivery have honest totals with integer math', () => {
  const config = withDesserts()
  const lines = [resolveLine(gummy, config)!, resolveLine(dessert, config)!]
  assert.deepEqual(totals(lines, store.deliveryMethods[0]), { subtotal: 760000, shipping: 280000, total: 1040000 })
  assert.deepEqual(totals(lines, { ...store.deliveryMethods[0], feeMinor: null }), { subtotal: 760000, shipping: null, total: null })
  assert.deepEqual(totals(lines, store.deliveryMethods[1]), { subtotal: 760000, shipping: 0, total: 760000 })
  assert.deepEqual(totals(lines, { ...store.deliveryMethods[0], feeMinor: 133333 }), { subtotal: 760000, shipping: 133333, total: 893333 })
  assert.equal(normalize(money(893333, store)), '₡8 933,33')
  assert.equal(normalize(money(120000, store)), '₡1 200')
})

test('Correos costs CRC 2800 through CRC 15000 and is free strictly above the product threshold', () => {
  const delivery = store.deliveryMethods.find(method => method.id === 'delivery')!
  assert.equal(shippingFee(1, delivery), 280000)
  assert.equal(shippingFee(1499999, delivery), 280000)
  assert.equal(shippingFee(1500000, delivery), 280000)
  assert.equal(shippingFee(1500001, delivery), 0)
  assert.equal(shippingFee(2000000, delivery), 0)
  assert.equal(shippingFee(120000, { ...delivery, enabled: false }), null)
  assert.equal(shippingFee(2000000, store.deliveryMethods.find(method => method.id === 'pickup')), 0)
})

test('delivery requires address, pickup does not; notes remain optional', () => {
  const lines = [resolveLine(gummy, store)!]
  assert.deepEqual(validateCheckout(lines, customer, store), {})
  assert.ok(validateCheckout(lines, { ...customer, name: ' ', address: ' ' }, store).name)
  assert.ok(validateCheckout(lines, { ...customer, address: ' ' }, store).address)
  assert.deepEqual(validateCheckout(lines, { ...customer, deliveryId: 'pickup', address: '' }, store), {})
  assert.ok(validateCheckout(lines, { ...customer, deliveryId: 'missing' }, store).deliveryId)
  assert.ok(validateCheckout([], customer, store).cart)
})

test('uvarindas product resolves with price of 2000 colones', () => {
  const line = resolveLine({ selection: { kind: 'product', productId: 'uvarindas' }, quantity: 2 }, store)!
  assert.equal(line.name, 'Uvarindas')
  assert.equal(line.unitPriceMinor, 200000)
  assert.equal(line.lineTotalMinor, 400000)
  assert.ok(line.options.includes('Uvas con tamarindo'))
  assert.equal(line.unitPriceMinor, 200000)
})
