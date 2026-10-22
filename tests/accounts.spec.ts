import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { randomUUID } from 'node:crypto'
import { adminCredentials, sendReceipt, testAdmin, testReceipt } from './helpers/store.ts'
import type { ShopOrder } from '../src/order-types.ts'

const password = 'Una-frase-de-prueba-2026!'

test('accounts: branded, accessible registration, persistent login, logout and conditional welcome strip', async ({ page }, testInfo) => {
  const email = `cuenta-${randomUUID()}@ejemplo.cr`
  const pageErrors: string[] = []
  page.on('pageerror', error => pageErrors.push(error.message))
  await page.goto('/')
  const offer = page.getByRole('button', { name: 'Obtén un 10% de descuento al registrarte' })
  await expect(offer).toBeEnabled()
  await offer.click()
  const account = page.getByRole('dialog', { name: 'Crear cuenta', exact: true })
  await expect(account).toBeVisible()
  await expect(account).toHaveCSS('opacity', '1')
  await page.evaluate(() => document.fonts.ready)
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(accessibility.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([])
  await account.screenshot({ path: testInfo.outputPath('register.png') })
  await account.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click()
  await expect(account.getByLabel('Tu nombre', { exact: true })).toBeFocused()
  await expect(account.getByText('Escribe tu contraseña.', { exact: true })).toBeVisible()
  await account.getByLabel('Tu nombre', { exact: true }).fill('Ana de prueba')
  await account.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await account.getByLabel('Contraseña', { exact: true }).fill(password)
  await account.getByRole('button', { name: 'Mostrar contraseña' }).click()
  await expect(account.getByLabel('Contraseña', { exact: true })).toHaveAttribute('type', 'text')
  await account.getByRole('button', { name: 'Ocultar contraseña' }).click()
  await account.getByRole('checkbox', { name: /Acepto que Onky’s/ }).check()
  await account.getByRole('button', { name: 'Crear mi cuenta', exact: true }).click()
  const member = page.getByRole('dialog', { name: 'Hola, Ana.' })
  await expect(member.getByText('Tu cuenta está lista.', { exact: false })).toBeVisible()
  await expect(member.getByText('Tu primer antojo, con 10% menos.')).toBeVisible()
  await expect(member.getByText('Tu próximo antojo empieza aquí.')).toBeVisible()
  await member.getByRole('button', { name: 'Seguir comprando' }).click()
  await expect(page.locator('#catalogo')).toBeFocused()
  await expect(page).toHaveURL(/#catalogo$/)
  await expect(page.locator('.brand-marquee-track')).toBeVisible()
  await expect(page.locator('.brand-marquee-bear')).toHaveCount(24)
  await expect(offer).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Abrir mi cuenta', exact: true }).click()
  await expect(member).toContainText(email)
  await expect(member).toHaveCSS('opacity', '1')
  const memberAccessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(memberAccessibility.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) }))).toEqual([])
  await member.screenshot({ path: testInfo.outputPath('my-account.png') })
  await member.getByRole('button', { name: 'Cerrar sesión', exact: true }).click()
  const login = page.getByRole('dialog', { name: 'Iniciar sesión', exact: true })
  await expect(login).toBeVisible()
  await login.screenshot({ path: testInfo.outputPath('login.png') })
  await login.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await login.getByLabel('Contraseña', { exact: true }).fill('Una-clave-incorrecta')
  await login.getByRole('button', { name: 'Entrar a mi cuenta' }).click()
  await expect(login.getByRole('alert')).toHaveText('Correo o contraseña incorrectos.')
  await login.getByLabel('Contraseña', { exact: true }).fill(password)
  await login.getByRole('button', { name: 'Entrar a mi cuenta' }).click()
  await expect(member).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(member).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Abrir mi cuenta', exact: true })).toBeFocused()
  for (const width of testInfo.project.name === 'mobile' ? [320, 390, 600] : [1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
    await page.getByRole('button', { name: 'Abrir mi cuenta', exact: true }).click()
    expect(await member.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(false)
    await page.keyboard.press('Escape')
  }
  const stored = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))
  expect(stored).not.toContain(email)
  expect(stored).not.toContain(password)
  expect(pageErrors).toEqual([])
})

test('accounts: original static welcome offer opens registration', async ({ page }, testInfo) => {
  await page.goto('/')
  const strip = page.locator('.welcome-marquee')
  const offer = strip.getByRole('button', { name: 'Obtén un 10% de descuento al registrarte', exact: true })
  await expect(offer).toBeEnabled()
  await strip.scrollIntoViewIfNeeded()
  await expect(offer).toHaveText('Obtén un 10% de descuento al registrarte')
  await expect(offer).toHaveCSS('font-size', testInfo.project.name === 'mobile' ? '10px' : '12px')
  await expect(strip.locator('.brand-marquee-track')).toHaveCount(0)
  await expect(strip.locator('.brand-marquee-bear')).toHaveCount(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false)
  await strip.screenshot({ path: testInfo.outputPath('welcome-strip.png') })
  await offer.click()
  await expect(page.getByRole('dialog', { name: 'Crear cuenta', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(offer).toBeFocused()
})

test('accounts: account forms fit phone viewports with aligned controls', async ({ page }, testInfo) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click()
  const account = page.locator('.account-dialog')
  await expect(account.getByRole('button', { name: 'Entrar a mi cuenta', exact: true })).toBeEnabled()
  await page.evaluate(() => document.fonts.ready)
  const mobile = testInfo.project.name === 'mobile'
  const viewports = mobile
    ? [{ width: 320, height: 480 }, { width: 360, height: 540 }, { width: 375, height: 548 }, { width: 430, height: 740 }, { width: 390, height: 664 }]
    : [{ width: 1024, height: 700 }, { width: 1440, height: 1000 }]
  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    for (const mode of ['Iniciar sesión', 'Crear cuenta']) {
      await account.getByRole('button', { name: mode, exact: true }).click()
      await expect(account).toHaveAccessibleName(mode)
      await expect(account.locator('.account-form-heading')).toHaveText(mode)
      await expect(account.locator('.account-form-heading > p, .account-story-copy, .account-story-footer > p, .account-security')).toHaveCount(0)
      const layout = await account.evaluate(element => {
        const dialog = element.getBoundingClientRect()
        const controls = [...element.querySelectorAll('.account-mode-switch, .account-form .account-input, .account-submit')].map(control => {
          const { left, right, top, bottom, height } = control.getBoundingClientRect()
          return { left, right, top, bottom, height }
        })
        return { top: dialog.top, bottom: dialog.bottom, overflowX: element.scrollWidth - element.clientWidth, overflowY: element.scrollHeight - element.clientHeight, leftGutter: controls[0].left - dialog.left, rightGutter: dialog.right - controls[0].right, closeRight: element.querySelector('.account-close')!.getBoundingClientRect().right, controls }
      })
      const context = `${mode} at ${viewport.width}×${viewport.height}`
      expect(layout.overflowX, context).toBeLessThanOrEqual(1)
      expect(layout.overflowY, context).toBeLessThanOrEqual(1)
      expect(layout.top, context).toBeGreaterThanOrEqual(0)
      expect(layout.bottom, context).toBeLessThanOrEqual(viewport.height)
      for (const control of layout.controls) {
        expect(control.left, context).toBeCloseTo(layout.controls[0].left, 0)
        expect(control.right, context).toBeCloseTo(layout.controls[0].right, 0)
        expect(control.height, context).toBeGreaterThanOrEqual(44)
        expect(control.bottom, context).toBeLessThan(layout.bottom)
      }
      if (mobile) {
        expect(layout.leftGutter, context).toBeCloseTo(layout.rightGutter, 0)
        expect(layout.closeRight, context).toBeCloseTo(layout.controls[0].right, 0)
        await expect(account.getByLabel('Correo electrónico', { exact: true })).toHaveCSS('font-size', '16px')
      }
      await account.screenshot({ path: testInfo.outputPath(`${mode === 'Crear cuenta' ? 'register' : 'login'}-${viewport.width}x${viewport.height}.png`) })
    }
  }
})

test('accounts: welcome discount, saved order, cross-device history and customers administration', async ({ page, request, browser }, testInfo) => {
  test.setTimeout(60_000)
  await testAdmin(request)
  const email = `pedido-${randomUUID()}@ejemplo.cr`
  const name = `Cliente ${randomUUID().slice(0, 6)}`
  await page.goto('/')
  await expect(page.locator('.welcome-marquee-link')).toBeEnabled()
  const config = await (await page.request.get('/api/checkout')).json()
  const registered = await page.request.post('/api/account/register', { headers: { 'X-CSRF-Token': config.csrfToken }, data: { name, email, password, privacyAccepted: true } })
  expect(registered.ok()).toBe(true)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Abrir mi cuenta', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).click()
  await page.getByRole('button', { name: 'Añadir al carrito', exact: true }).click()
  await page.getByRole('button', { name: 'Abrir carrito, 1 artículos' }).click()
  const cart = page.locator('.cart-drawer')
  await expect(cart.getByRole('textbox', { name: 'Tu nombre', exact: true })).toHaveValue(name)
  await expect(cart.getByLabel('Correo electrónico', { exact: false })).toHaveValue(email)
  await expect(cart.locator('.welcome-discount-row')).toContainText('−₡125')
  await cart.getByRole('radio', { name: /Recoger/ }).check()
  await expect(cart.locator('.total-row')).toContainText('₡1 125')
  await cart.getByLabel('Teléfono de contacto').fill('61551234')
  await cart.getByRole('checkbox', { name: /Acepto que la tienda guarde/ }).check()
  const response = page.waitForResponse('**/api/checkout/preview')
  await cart.getByRole('button', { name: 'Continuar al pago' }).click()
  await expect(cart.locator('#assigned-order-code')).toBeVisible()
  const order = (await (await response).json()).order as ShopOrder
  expect(order.discountMinor).toBe(12500)
  expect(order.totalMinor).toBe(112500)
  await expect(cart.locator('.gateway-summary-totals')).toContainText('Bienvenida · 10%')
  expect((await (await page.request.get('/api/account/orders')).json()).total).toBe(0)
  await sendReceipt(page, order)
  await cart.getByRole('button', { name: 'Cerrar carrito' }).click()
  await page.getByRole('button', { name: 'Abrir mi cuenta', exact: true }).click()
  const member = page.locator('.account-dialog')
  const savedOrder = member.getByRole('button', { name: `Ver pedido ${order.code}`, exact: true })
  await expect(savedOrder).toBeVisible()
  await member.getByRole('button', { name: 'Cerrar mi cuenta' }).click()
  // A slow refresh must not blank the previously loaded account on reopening.
  let releaseHistory!: () => void
  const historyGate = new Promise<void>(resolve => { releaseHistory = resolve })
  await page.route('**/api/account/orders?*', async route => { await historyGate; await route.continue() })
  try {
    await page.getByRole('button', { name: 'Abrir mi cuenta', exact: true }).click()
    await expect(member.locator('.member-orders')).toHaveAttribute('aria-busy', 'true')
    await expect(savedOrder).toBeVisible()
    await expect(member.locator('.member-orders-loading')).toHaveCount(0)
  } finally { releaseHistory() }
  await expect(member.locator('.member-orders')).toHaveAttribute('aria-busy', 'false')
  await page.unroute('**/api/account/orders?*')
  await member.getByRole('button', { name: `Ver pedido ${order.code}`, exact: true }).click()
  await expect(cart.locator('#assigned-order-code')).toHaveText(order.code)
  await cart.getByRole('button', { name: 'Cerrar carrito' }).click()

  const context = await browser.newContext({ baseURL: new URL(page.url()).origin })
  try {
    const device = await context.newPage()
    const session = await (await device.request.get('/api/checkout')).json()
    const signed = await device.request.post('/api/account/login', { headers: { 'X-CSRF-Token': session.csrfToken }, data: { email, password } })
    expect(signed.ok()).toBe(true)
    const history = await (await device.request.get('/api/account/orders')).json()
    expect(history.orders[0].id).toBe(order.id)
    await device.goto('/')
    await device.getByRole('button', { name: 'Abrir mi cuenta', exact: true }).click()
    await expect(device.getByRole('button', { name: `Ver pedido ${order.code}`, exact: true })).toBeVisible()
    await expect(device.locator('.member-welcome')).toHaveCount(0)
  } finally { await context.close() }

  await page.goto('/admin')
  await page.getByLabel('Usuario', { exact: true }).fill(adminCredentials.username)
  await page.getByLabel('Contraseña', { exact: true }).fill(adminCredentials.password)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.getByRole('button', { name: 'Clientes', exact: true }).click()
  await page.getByLabel('Buscar clientes por nombre o correo').fill(email)
  const card = page.locator('.admin-customer-card').filter({ hasText: email })
  await expect(card).toContainText('Aplicada')
  await card.screenshot({ path: testInfo.outputPath('admin-customer.png') })
  await card.getByRole('button', { name: `Ver pedidos de ${name}` }).click()
  await expect(page.locator('.admin-customer-filter')).toContainText(name)
  await expect(page.locator('.admin-order-card')).toHaveCount(1)
  await expect(page.locator('.admin-order-card')).toContainText(order.code)
  await page.getByRole('button', { name: 'Ver comprobante', exact: true }).click()
  await expect(page.locator('.admin-order-dialog')).toContainText('Bienvenida · 10%')
})

test('accounts: cancellation leaves no order and keeps 10% until a receipt is sent', async ({ page, request, context }) => {
  test.setTimeout(60_000)
  await testAdmin(request)
  await page.goto('/')
  await expect(page.locator('.welcome-marquee-link')).toBeEnabled()
  const config = await (await page.request.get('/api/checkout')).json()
  const email = `bienvenida-${randomUUID()}@ejemplo.cr`
  const registered = await page.request.post('/api/account/register', {
    headers: { 'X-CSRF-Token': config.csrfToken },
    data: { name: 'Cliente Bienvenida', email, password, privacyAccepted: true },
  })
  expect(registered.ok()).toBe(true)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Abrir mi cuenta', exact: true })).toBeVisible()
  const cart = page.locator('.cart-drawer')
  const addProduct = async () => {
    await page.getByRole('button', { name: 'Personalizar Ositos', exact: true }).click()
    await page.getByRole('button', { name: 'Añadir al carrito', exact: true }).click()
    await page.getByRole('button', { name: 'Abrir carrito, 1 artículos' }).click()
    await cart.getByRole('radio', { name: /Recoger/ }).check()
  }
  const available = async () => (await (await page.request.get('/api/checkout')).json()).account.welcomeAvailable
  await addProduct()
  await expect(cart.locator('.welcome-discount-row')).toContainText('−₡125')
  await cart.getByLabel('Teléfono de contacto').fill('61551234')
  await cart.getByRole('checkbox', { name: /Acepto que la tienda guarde/ }).check()
  await cart.getByRole('button', { name: 'Continuar al pago' }).click()
  await expect(cart.locator('#assigned-order-code')).toBeVisible()
  expect(await available()).toBe(true)
  expect((await (await page.request.get('/api/account/orders')).json()).total).toBe(0)
  await cart.getByRole('button', { name: 'Cancelar pedido', exact: true }).click()
  expect((await (await page.request.get('/api/account/orders')).json()).total).toBe(0)

  await addProduct()
  await expect(cart.locator('.welcome-discount-row')).toContainText('−₡125')
  await expect(cart.locator('.total-row')).toContainText('₡1 125')
  await cart.getByRole('checkbox', { name: /Acepto que la tienda guarde/ }).check()
  await cart.getByRole('button', { name: 'Continuar al pago' }).click()
  await expect(cart.locator('#assigned-order-code')).toBeVisible()
  await cart.locator('#receipt-file').setInputFiles(await testReceipt())
  expect(await available()).toBe(true)

  const otherTab = await context.newPage()
  await otherTab.goto('/')
  await otherTab.getByRole('button', { name: 'Abrir mi cuenta', exact: true }).click()
  await expect(otherTab.locator('.member-welcome')).toBeVisible()

  await page.route('**/api/orders', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'No se pudo guardar el comprobante.' }) }))
  await cart.getByRole('button', { name: 'Enviar comprobante para revisión' }).click()
  await expect(cart.getByRole('alert')).toHaveText('No se pudo guardar el comprobante.')
  expect(await available()).toBe(true)
  expect((await (await page.request.get('/api/account/orders')).json()).total).toBe(0)
  await page.unroute('**/api/orders')
  await cart.getByRole('button', { name: 'Enviar comprobante para revisión' }).click()
  await expect(cart.getByRole('heading', { name: 'Estamos revisando tu pago.' })).toBeVisible()
  expect(await available()).toBe(false)
  expect((await (await page.request.get('/api/account/orders')).json()).total).toBe(1)
  await expect(otherTab.locator('.member-welcome')).toHaveCount(0)
  await otherTab.close()
  await cart.getByRole('button', { name: 'Seguir comprando', exact: true }).click()

  await addProduct()
  await expect(cart.locator('.welcome-discount-row')).toHaveCount(0)
  await expect(cart.locator('.total-row')).toContainText('₡1 250')
})
