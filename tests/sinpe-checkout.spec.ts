import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { randomUUID } from 'node:crypto'
import { checkoutOrder, loginAdminPage, sendReceipt, testAdmin, testReceipt } from './helpers/store.ts'
import type { CheckoutConfig, ShopOrder } from '../src/order-types.ts'

test('SINPE: order, backend code validation, private upload and admin confirmation without WhatsApp', async ({ page, context, baseURL }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await testAdmin(baseURL!)
  const order = await checkoutOrder(page)
  expect(order.code).toMatch(/^ONK-[A-F0-9]{16}$/)
  expect(order.totalMinor).toBe(240000)
  expect(order.status).toBe('awaiting_payment')
  await expect(page.locator('a[href*="wa.me"], a[href*="whatsapp"]')).toHaveCount(0)
  await expect(page.locator('body')).not.toContainText('WhatsApp')
  await expect(page.locator('.sinpe-instructions')).toContainText('8000 0000')
  const config = await (await page.request.get('/api/checkout')).json() as CheckoutConfig
  const invalid = await page.request.post(`/api/orders/${order.id}/receipt`, {
    headers: { 'X-CSRF-Token': config.csrfToken },
    multipart: { code: 'ONK-0000000000000000', bankReference: 'TEST-WRONG-CODE-123', uploadKey: randomUUID(), version: String(order.version), receipt: await testReceipt() },
  })
  expect(invalid.status()).toBe(422)
  const before = await (await page.request.get(`/api/orders/${order.id}`)).json() as ShopOrder
  expect(before.receipt).toBeNull()
  const reference = `TEST-${randomUUID()}`
  await sendReceipt(page, order, reference)
  await expect(page.getByRole('heading', { name: 'Estamos revisando tu pago.' })).toBeVisible()
  const pending = await (await page.request.get(`/api/orders/${order.id}`)).json() as ShopOrder
  expect(pending.status).toBe('pending_review')
  expect(pending.paymentConfirmedAt).toBeNull()
  await page.reload()
  await page.getByRole('button', { name: 'Abrir carrito, 0 artículos' }).click()
  await expect(page.locator('#assigned-order-code')).toHaveValue(order.code)
  await expect(page.getByRole('heading', { name: 'Estamos revisando tu pago.' })).toBeVisible()
  const checkoutAccessibility = await new AxeBuilder({ page }).include('.cart-drawer').withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(checkoutAccessibility.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([])
  await page.screenshot({ path: `test-results/${testInfo.project.name}-sinpe-pending.png` })

  const adminPage = await context.newPage()
  await loginAdminPage(adminPage)
  await adminPage.getByLabel('Buscar por código o cliente').fill(order.code)
  await adminPage.getByRole('button', { name: `Revisar pedido ${order.code}` }).click()
  const dialog = adminPage.getByRole('dialog', { name: order.code })
  await expect(dialog.getByRole('img', { name: `Comprobante privado del pedido ${order.code}` })).toBeVisible()
  await dialog.getByLabel('Código verificado en el abono').fill(order.code)
  await dialog.getByLabel('Referencia bancaria verificada').fill(reference)
  await dialog.getByLabel('Monto verificado en colones').fill('2400')
  await dialog.getByLabel('Nota de revisión').fill('Prueba manual ficticia, no se ha accedido a BAC.')
  await dialog.getByLabel(/Comprobé en banca en línea el abono aplicado/).check()
  await dialog.getByRole('button', { name: 'Confirmar pago y pasar a listo' }).click()
  await expect(dialog.locator('.admin-confirmed-card')).toContainText('Pago confirmado manualmente')
  await adminPage.screenshot({ path: `test-results/${testInfo.project.name}-sinpe-admin-confirmed.png` })
  await page.getByRole('button', { name: 'Actualizar estado', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Pago confirmado.', exact: true })).toBeVisible()
  await expect(page.locator('.sinpe-order-panel > .order-status')).toHaveText('Listo para preparar')
  await expect(page.locator('body')).not.toContainText('Listo para entregar')
  expect(errors).toEqual([])
})

test('SINPE: corrections keep the same order and an old review cannot approve the new receipt', async ({ page, baseURL }) => {
  const admin = await testAdmin(baseURL!)
  const order = await checkoutOrder(page)
  await sendReceipt(page, order, `TEST-FIRST-${randomUUID()}`)
  await expect(page.getByRole('heading', { name: 'Estamos revisando tu pago.' })).toBeVisible()
  const first = await (await page.request.get(`/api/orders/${order.id}`)).json() as ShopOrder
  const correction = await admin.api.post(`/api/admin/orders/${order.id}/reject`, { headers: { 'X-CSRF-Token': admin.csrf }, data: { version: first.version, reason: 'Necesitamos una imagen donde se lea la referencia bancaria.' } })
  expect(correction.ok()).toBe(true)
  await page.getByRole('button', { name: 'Actualizar estado', exact: true }).click()
  await expect(page.getByText('Necesitamos una imagen donde se lea la referencia bancaria.', { exact: true })).toBeVisible()
  const updated = await correction.json() as ShopOrder
  const reference = `TEST-CORRECTED-${randomUUID()}`
  await sendReceipt(page, updated, reference)
  await expect(page.getByRole('heading', { name: 'Estamos revisando tu pago.' })).toBeVisible()
  const stale = await admin.api.post(`/api/admin/orders/${order.id}/confirm`, { headers: { 'X-CSRF-Token': admin.csrf }, data: { version: first.version, code: order.code, bankReference: reference, amountMinor: 240000, checkedBank: true, note: 'Intento obsoleto de prueba, debe fallar.' } })
  expect(stale.status()).toBe(409)
  expect((await (await page.request.get(`/api/orders/${order.id}`)).json() as ShopOrder).status).toBe('pending_review')
})

test('SINPE: delivery without a quote cannot request payment; admin sets the immutable final total', async ({ page, context, baseURL }, testInfo) => {
  await testAdmin(baseURL!)
  const order = await checkoutOrder(page, 'delivery')
  expect(order.status).toBe('pending_details')
  expect(order.totalMinor).toBeNull()
  await expect(page.locator('.sinpe-instructions')).toHaveCount(0)
  await expect(page.locator('#receipt-file')).toHaveCount(0)
  await expect(page.getByText('No pagues todavía: falta confirmar el costo de envío.')).toBeVisible()
  const adminPage = await context.newPage()
  await loginAdminPage(adminPage)
  await adminPage.getByLabel('Buscar por código o cliente').fill(order.code)
  await adminPage.getByRole('button', { name: `Revisar pedido ${order.code}` }).click()
  const dialog = adminPage.getByRole('dialog', { name: order.code })
  await dialog.getByLabel('Costo de entrega en colones').fill('1500')
  await dialog.getByLabel('Detalle de entrega para el cliente').fill('Tarifa ficticia de entrega confirmada para esta prueba.')
  await dialog.getByRole('button', { name: 'Confirmar total y habilitar SINPE' }).click()
  await expect(dialog.locator('.status-awaiting_payment')).toBeVisible()
  await page.getByRole('button', { name: 'Actualizar estado', exact: true }).click()
  await expect(page.locator('.sinpe-instructions')).toContainText('₡3 900')
  await expect(page.locator('#receipt-file')).toBeAttached()
  const accessibility = await new AxeBuilder({ page: adminPage }).include('.admin-order-dialog').withTags(['wcag2a', 'wcag2aa']).analyze()
  expect(accessibility.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) }))).toEqual([])
  await adminPage.getByRole('button', { name: 'Cerrar detalle del pedido' }).click()
  for (const width of testInfo.project.name === 'mobile' ? [320, 390, 600] : [1024, 1440]) {
    await adminPage.setViewportSize({ width, height: 900 })
    expect(await adminPage.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  }
  await adminPage.screenshot({ path: `test-results/${testInfo.project.name}-sinpe-admin-dashboard.png`, fullPage: true })
})
