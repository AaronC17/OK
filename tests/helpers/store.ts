import type { APIRequestContext, Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import sharp from 'sharp'
import type { AdminAuth, ShopOrder } from '../../src/order-types.ts'

// Test-only credentials, used exclusively with the isolated ONKYS_E2E_DIR database.
export const adminCredentials = { username: 'admin-pruebas', password: 'Clave-unica-de-pruebas-2026!' }
export async function testAdmin(api: APIRequestContext) {
    if (!process.env.ONKYS_E2E_DIR?.includes('onkys-store-e2e-')) throw new Error('Refusing to initialize a non-test store.')
    const state = await (await api.get('/api/admin/session')).json() as AdminAuth
    let auth: AdminAuth | undefined
    if (!state.initialized) {
      try {
        const setupToken = readFileSync(join(process.env.ONKYS_E2E_DIR, 'admin-setup-token.txt'), 'utf8').trim()
        const response = await api.post('/api/admin/setup', { data: { setupToken, ...adminCredentials } })
        if (response.ok()) auth = await response.json() as AdminAuth
      } catch { /* Another worker may have completed first-time setup. */ }
    }
    if (!auth) {
      const response = await api.post('/api/admin/login', { data: adminCredentials })
      if (!response.ok()) throw new Error(`Could not authenticate isolated test admin: ${response.status()}`)
      auth = await response.json() as AdminAuth
    }
    const csrf = auth.csrfToken!
    const configured = await api.put('/api/admin/settings', { headers: { 'X-CSRF-Token': csrf }, data: { enabled: true, phone: '80000000', beneficiary: 'Destino de prueba · No pagar' } })
    if (!configured.ok()) throw new Error('Could not configure the isolated test SINPE destination.')
    return { api, csrf }
}

export async function testReceipt() {
  const color = `#${randomBytes(3).toString('hex')}`
  const buffer = await sharp({ create: { width: 120, height: 80, channels: 3, background: color } }).png().toBuffer()
  return { name: `comprobante-prueba-${randomUUID()}.png`, mimeType: 'image/png', buffer }
}

export async function checkoutOrder(page: Page, delivery: 'pickup' | 'delivery' = 'pickup', quantity = 2) {
  await page.goto('/')
  await page.evaluate(quantity => localStorage.setItem('onkys.cart.v1', JSON.stringify({ version: 1, items: [{ selection: { kind: 'gummy', typeIds: ['ositos'], weight: 100 }, quantity }] })), quantity)
  await page.reload()
  await page.getByRole('button', { name: `Abrir carrito, ${quantity} artículos` }).click()
  await page.getByRole('radio', { name: delivery === 'pickup' ? /Recogida|Recoger/ : /Envío por Correos/ }).check()
  await page.getByLabel('Tu nombre').fill(`Cliente prueba ${randomUUID().slice(0, 6)}`)
  await page.getByLabel('Teléfono de contacto').fill('61551234')
  await page.getByLabel('Correo electrónico').fill(`cliente-${randomUUID().slice(0, 6)}@ejemplo.cr`)
  if (delivery === 'delivery') await page.getByLabel('Dirección o punto de entrega').fill('Dirección ficticia para la prueba de envío.')
  await page.getByLabel(/Acepto que la tienda guarde/).check()
  await page.getByRole('button', { name: 'Crear pedido con SINPE' }).click()
  await page.locator('#assigned-order-code').waitFor({ state: 'visible' })
  return await (await page.request.get('/api/orders/current')).json().then((result: { order: ShopOrder }) => result.order)
}

export async function sendReceipt(page: Page, order: ShopOrder, reference: string) {
  await page.getByLabel('Código del pedido', { exact: false }).last().fill(order.code)
  await page.getByLabel('Referencia bancaria del SINPE').fill(reference)
  await page.locator('#receipt-file').setInputFiles(await testReceipt())
  await page.getByRole('button', { name: 'Enviar comprobante para revisión' }).click()
}

export async function loginAdminPage(page: Page) {
  await page.goto('/admin')
  await page.getByLabel('Usuario', { exact: true }).fill(adminCredentials.username)
  await page.getByLabel('Contraseña', { exact: true }).fill(adminCredentials.password)
  await page.getByRole('button', { name: 'Entrar a administración' }).click()
  await page.getByRole('heading', { name: 'Tus pedidos.', exact: true }).waitFor()
}
