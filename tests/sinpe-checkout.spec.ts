import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { randomUUID } from 'node:crypto'
import { checkoutOrder, loginAdminPage, sendReceipt, testAdmin, testReceipt } from './helpers/store.ts'
import type { CheckoutConfig, ShopOrder } from '../src/order-types.ts'

test.describe.configure({ timeout: 45_000 })

test('SINPE: preview, private upload and manual confirmation create an order only with a receipt', async ({ page, context, request }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await testAdmin(request)
  const order = await checkoutOrder(page)
  expect(order.code).toMatch(/^ONK-\d{4,}$/)
   expect(order.totalMinor).toBe(250000)
  expect(order.status).toBe('awaiting_payment')
  await expect(page.locator('a[href*="wa.me"], a[href*="whatsapp"]')).toHaveCount(0)
  expect((await (await page.request.get('/api/orders/current')).json()).order).toBeNull()
  expect((await page.request.get(`/api/orders/${order.id}`)).status()).toBe(404)
  await expect(page.locator('.sinpe-pay-card')).toContainText('8000-0000')
  await sendReceipt(page, order)
  const config = await (await page.request.get('/api/checkout')).json() as CheckoutConfig
  const invalid = await page.request.post(`/api/orders/${order.id}/receipt`, {
    headers: { 'X-CSRF-Token': config.csrfToken },
    multipart: { code: 'ONK-0000000000000000', bankReference: 'TEST-WRONG-CODE-123', uploadKey: randomUUID(), version: String(order.version), receipt: await testReceipt() },
  })
  expect(invalid.status()).toBe(422)
  await expect(page.getByRole('heading', { name: 'Estamos revisando tu pago.' })).toBeVisible()
  const pending = await (await page.request.get(`/api/orders/${order.id}`)).json() as ShopOrder
  expect(pending.status).toBe('pending_review')
  expect(pending.paymentConfirmedAt).toBeNull()
  await page.reload()
  await page.getByRole('button', { name: 'Abrir carrito, 0 artículos' }).click()
  await expect(page.locator('#assigned-order-code')).toHaveText(order.code)
  await expect(page.getByRole('heading', { name: 'Estamos revisando tu pago.' })).toBeVisible()
  await expect(page.locator('.sinpe-transit-card')).toHaveCSS('opacity', '1')
  const checkoutAccessibility = await new AxeBuilder({ page }).include('.cart-drawer').withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(checkoutAccessibility.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('sinpe-pending.png') })

  const adminPage = await context.newPage()
  await loginAdminPage(adminPage)
  await adminPage.getByLabel('Buscar por código o cliente').fill(order.code)
  await adminPage.locator('.admin-order-card').filter({ hasText: order.code }).getByRole('button', { name: 'Ver comprobante', exact: true }).click()
  const dialog = adminPage.getByRole('dialog', { name: order.code })
  await expect(dialog.getByRole('img', { name: `Comprobante ${order.code}` })).toBeVisible()
  await expect(dialog.locator('input, textarea')).toHaveCount(0)
  await expect(dialog).toContainText(order.code)
  await dialog.getByRole('button', { name: 'Marcar como pagada', exact: true }).click()
  await expect(dialog.locator('.status-ready')).toHaveText('Pagada')
  const confirmed = await (await page.request.get(`/api/orders/${order.id}`)).json() as ShopOrder
  expect(confirmed.paymentVerification).toBe('manual')
  expect(confirmed.paymentConfirmedAt).not.toBeNull()
  await adminPage.screenshot({ path: testInfo.outputPath('sinpe-admin-confirmed.png') })
  await page.getByRole('button', { name: 'Actualizar estado', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Pago confirmado.', exact: true })).toBeVisible()
  await expect(page.locator('.transit-live-badge')).toHaveText('Listo para preparar')
  await expect(page.locator('body')).not.toContainText('Listo para entregar')
  await expect(page.locator('.sinpe-order-panel')).not.toContainText('en camino')
  expect(errors).toEqual([])
})

test('SINPE: corrections keep the same order and an old review cannot approve the new receipt', async ({ page, request }) => {
  const admin = await testAdmin(request)
  const order = await checkoutOrder(page)
  await sendReceipt(page, order)
  await expect(page.getByRole('heading', { name: 'Estamos revisando tu pago.' })).toBeVisible()
  const first = await (await page.request.get(`/api/orders/${order.id}`)).json() as ShopOrder
  const correction = await admin.api.post(`/api/admin/orders/${order.id}/reject`, { headers: { 'X-CSRF-Token': admin.csrf }, data: { version: first.version, reason: 'Necesitamos una imagen donde se lea la referencia bancaria.' } })
  expect(correction.ok()).toBe(true)
  await page.getByRole('button', { name: 'Actualizar estado', exact: true }).click()
  await expect(page.getByText('Necesitamos una imagen donde se lea la referencia bancaria.', { exact: true })).toBeVisible()
  const updated = await correction.json() as ShopOrder
  await sendReceipt(page, updated)
  await expect(page.getByRole('heading', { name: 'Estamos revisando tu pago.' })).toBeVisible()
  const stale = await admin.api.post(`/api/admin/orders/${order.id}/confirm`, { headers: { 'X-CSRF-Token': admin.csrf }, data: { version: first.version, receiptId: first.receipt!.id } })
  expect(stale.status()).toBe(409)
  expect((await (await page.request.get(`/api/orders/${order.id}`)).json() as ShopOrder).status).toBe('pending_review')
})

test('SINPE: Correos delivery is calculated immediately and admin never has to quote shipping', async ({ page, context, request }, testInfo) => {
  await testAdmin(request)
  const order = await checkoutOrder(page, 'delivery')
  expect(order.status).toBe('awaiting_payment')
  expect(order.shippingMinor).toBe(280000)
  expect(order.totalMinor).toBe(530000)
  await expect(page.locator('.sinpe-pay-card')).toContainText('₡5 300')
  await expect(page.locator('#receipt-file')).toBeAttached()
  expect((await (await page.request.get('/api/orders/current')).json()).order).toBeNull()
  await sendReceipt(page, order)
  const adminPage = await context.newPage()
  await loginAdminPage(adminPage)
  await adminPage.getByLabel('Buscar por código o cliente').fill(order.code)
  await adminPage.locator('.admin-order-card').filter({ hasText: order.code }).getByRole('button', { name: 'Ver comprobante', exact: true }).click()
  const dialog = adminPage.getByRole('dialog', { name: order.code })
  await expect(dialog.locator('#quote-shipping, #quote-note')).toHaveCount(0)
  await expect(dialog).toContainText('₡2 800')
  await expect(dialog).toContainText('₡5 300')
  await expect(dialog.locator('.order-status')).toHaveText('Pendiente')
  expect((await (await page.request.get(`/api/orders/${order.id}`)).json()).status).toBe('pending_review')
  const accessibility = await new AxeBuilder({ page: adminPage }).include('.admin-order-dialog').withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(accessibility.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([])
  await adminPage.getByRole('button', { name: 'Cerrar detalle del pedido' }).click()
  for (const width of testInfo.project.name === 'mobile' ? [320, 390, 600] : [1024, 1440]) {
    await adminPage.setViewportSize({ width, height: 900 })
    expect(await adminPage.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  }
  await adminPage.screenshot({ path: testInfo.outputPath('sinpe-admin-dashboard.png'), fullPage: true })
})

test('SINPE: free Correos shipping starts at exactly CRC 15000 in the banner, cart and server order', async ({ page, request }) => {
  await testAdmin(request)
  await page.addInitScript(() => {
    localStorage.setItem('onkys.cart.v1', JSON.stringify({ version: 1, items: [
      { selection: { kind: 'product', productId: 'uvarindas', variantId: 'grande' }, quantity: 6 },
    ] }))
  })
  await page.goto('/')
  await expect(page.locator('.shipping-announcement')).toHaveText('Envío GRATIS a todo Costa Rica en compras de ₡15.000 o más')
  expect(await page.locator('.shipping-announcement').evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false)
  await page.getByRole('button', { name: 'Abrir carrito, 6 artículos' }).click()
  const cart = page.locator('.cart-drawer')
  const shipping = cart.locator('.free-shipping-card')
  const delivery = cart.locator('.delivery-option').filter({ hasText: 'Envío por Correos' })
  const cost = cart.locator('.order-totals > div').filter({ hasText: 'Costo de entrega' })
  await expect(shipping).toContainText('¡Felicidades! Tienes Envío Gratis')
  await expect(shipping.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  await expect(delivery).toContainText('Gratis · Todo Costa Rica')
  await expect(cost).toContainText('₡0')
  await expect(cart.locator('.total-row')).toContainText('₡15 000')

  // The shipping charge itself must never help a smaller cart reach the threshold.
  await cart.getByRole('button', { name: /Reducir cantidad de Uvarindas/i }).click()
  await expect(shipping).toContainText('Te faltan ₡2 500')
  await expect(delivery).toContainText('₡2.800 · Todo Costa Rica')
  await expect(cost).toContainText('₡2 800')
  await expect(cart.locator('.total-row')).toContainText('₡15 300')
  await cart.getByRole('button', { name: /Aumentar cantidad de Uvarindas/i }).click()
  await expect(shipping.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  await expect(cost).toContainText('₡0')
  await cart.getByRole('button', { name: /Aumentar cantidad de Uvarindas/i }).click()
  await expect(cart.locator('.total-row')).toContainText('₡17 500')
  await expect(cost).toContainText('₡0')
  await cart.getByRole('button', { name: /Reducir cantidad de Uvarindas/i }).click()

  await cart.getByLabel('Tu nombre').fill('Prueba envío exacto')
  await cart.getByLabel('Teléfono de contacto').fill('61551234')
  await cart.getByLabel('Correo electrónico').fill('envio-exacto@ejemplo.cr')
  await cart.getByLabel('Dirección o punto de entrega').fill('Dirección ficticia para la prueba de envío.')
  await cart.getByLabel(/Acepto que la tienda guarde/).check()
  const response = page.waitForResponse('**/api/checkout/preview')
  await cart.getByRole('button', { name: 'Continuar al pago' }).click()
  await expect(cart.locator('#assigned-order-code')).toBeVisible()
  const { order } = await (await response).json() as { order: ShopOrder }
  expect(order.subtotalMinor).toBe(1500000)
  expect(order.shippingMinor).toBe(0)
  expect(order.totalMinor).toBe(1500000)
  await expect(cart.locator('.sinpe-pay-card')).toContainText('₡15 000')
  expect((await (await page.request.get('/api/orders/current')).json()).order).toBeNull()
  const saved = await sendReceipt(page, order)
  expect(saved.totalMinor).toBe(1500000)
  expect(saved.shippingMinor).toBe(0)
})
