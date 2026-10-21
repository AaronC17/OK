import { expect, test } from '@playwright/test'
import { checkoutOrder, testAdmin } from './helpers/store.ts'
import type { ShopOrder } from '../src/order-types.ts'

test('checkout retries an uncertain response once and a later identical purchase gets a new order', async ({ page, request }) => {
  await testAdmin(request)
  const first = await checkoutOrder(page)
  await page.getByRole('button', { name: 'Hacer otro pedido', exact: true }).click()
  await page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).click()
  await page.getByRole('button', { name: 'Aumentar cantidad de bolsas', exact: true }).click()
  await page.getByRole('button', { name: 'Añadir al carrito', exact: true }).click()
  await page.getByRole('button', { name: 'Abrir carrito, 2 artículos' }).click()
  await expect(page.getByLabel('Tu nombre')).toHaveValue(first.customer.name)
  const keys: string[] = []
  let saved: ShopOrder | null = null
  await page.route('**/api/orders', async route => {
    keys.push(route.request().headers()['idempotency-key'])
    if (keys.length === 1) {
      const response = await route.fetch()
      expect(response.ok()).toBe(true)
      saved = await response.json()
      await route.abort('failed')
    } else await route.continue()
  })
  const submit = page.getByRole('button', { name: 'Crear pedido con SINPE', exact: true })
  await submit.click()
  await expect(page.getByRole('alert')).toContainText('No recibimos la respuesta del servidor')
  await submit.click()
  await expect(page.locator('#assigned-order-code')).toHaveText(/^ONK-\d{4,}$/)
  const second = (await (await page.request.get('/api/orders/current')).json()).order as ShopOrder
  expect(second.id).not.toBe(first.id)
  expect(second.id).toBe(saved!.id)
  expect(second.customer).toEqual(first.customer)
  expect(second.lines).toEqual(first.lines)
  expect(keys).toHaveLength(2)
  expect(keys[0]).toBe(keys[1])
})

test('cart edits synchronize between tabs and skip navigation transfers keyboard focus', async ({ page, context }) => {
  await page.goto('/')
  const other = await context.newPage()
  await other.goto('/')
  await page.getByRole('link', { name: 'Saltar al catálogo' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('#catalogo')).toBeFocused()
  await page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).click()
  await page.getByRole('button', { name: 'Añadir al carrito', exact: true }).click()
  await expect(other.getByRole('button', { name: 'Abrir carrito, 1 artículos' })).toBeVisible()
  await other.getByRole('button', { name: 'Abrir carrito, 1 artículos' }).click()
  await other.getByRole('button', { name: /Eliminar Ositos/ }).click()
  await expect(page.getByRole('button', { name: 'Abrir carrito, 0 artículos' })).toBeVisible()
})

test('an unavailable product chunk has a visible recovery action instead of a blank page', async ({ page }) => {
  await page.route('**/assets/ProductDialog-*.js', route => route.abort())
  await page.goto('/')
  await page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No pudimos cargar esta parte de la tienda.' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Volver a cargar', exact: true })).toBeVisible()
})
