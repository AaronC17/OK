import assert from 'node:assert/strict'
import test from 'node:test'
import type { ShopOrder } from '../../src/order-types.ts'
import { createOrderMailer, orderEmailMessage, readSmtpConfig } from './mailer.ts'

const order = (overrides: Partial<ShopOrder> = {}): ShopOrder => ({
  id: '6a2d8ddfa2f14d2ebc9d94a75b3bc9a0', code: 'ONK-0123456789ABCDEF', version: 2, status: 'pending_review', demo: false,
  createdAt: '2026-01-15T14:03:00.000Z', updatedAt: '2026-01-15T14:20:00.000Z',
  lines: [{ key: 'gummy:ositos:100', name: 'Ositos Enchilados', options: ['Un solo tipo', 'Ositos', '100 g por bolsa'], quantity: 2, unitPriceMinor: 120000, lineTotalMinor: 240000 }],
  subtotalMinor: 240000, shippingMinor: 0, totalMinor: 240000,
  delivery: { id: 'pickup', name: 'Recogida en Heredia', requiresAddress: false },
  customer: { name: 'Ana Pérez', phone: '61551234', email: 'ana@ejemplo.cr', address: '', notes: '' },
  destination: { phone: '88880000', beneficiary: 'Onky’s Comercializadora', bank: 'BAC Credomatic' },
  receipt: { id: '1b6d8d5b5a0e4fbcd2a4ad3b7e6eeea0', contentType: 'image/webp', size: 1200, submittedAt: '2026-01-15T14:19:00.000Z', bankReference: 'ONK-01234567-999999' },
  customerMessage: null, paymentConfirmedAt: null, paymentVerification: 'manual',
  ...overrides,
})

test('mailer: configuration requires host, user and pass and supports DirectMail SMTP defaults', () => {
  assert.equal(readSmtpConfig({}), null)
  const config = readSmtpConfig({ SMTP_HOST: 'smtpdm.aliyun.com', SMTP_USER: 'pedidos@onkys.com', SMTP_PASS: 'secret' })
  assert.deepEqual(config, { host: 'smtpdm.aliyun.com', port: 465, secure: true, user: 'pedidos@onkys.com', pass: 'secret', from: 'Onky’s <pedidos@onkys.com>', bcc: undefined })
  const custom = readSmtpConfig({ SMTP_HOST: 'mail.ejemplo', SMTP_USER: 'hola@onkys.com', SMTP_PASS: 's', SMTP_PORT: '587', SMTP_SECURE: 'false', MAIL_FROM: 'Onky’s Tienda <hola@onkys.com>', MAIL_BCC: 'duena@onkys.com' })
  assert.equal(custom?.secure, false)
  assert.equal(custom?.bcc, 'duena@onkys.com')
  assert.throws(() => readSmtpConfig({ SMTP_HOST: 'smtp', SMTP_USER: 'u', SMTP_PASS: 'p', SMTP_PORT: 'no' }), /SMTP_PORT/)
})

test('mailer: message per event carries code, state copy and skips orders without email', () => {
  const created = orderEmailMessage('order.created', order({ status: 'awaiting_payment' }), 'https://tienda.example')!
  assert.match(created.subject, /ONK-0123456789ABCDEF/)
  assert.match(created.html, /SINPE Móvil/)
  assert.match(created.html, /8888-0000/)
  assert.match(created.text, /sube el comprobante/)
  const review = orderEmailMessage('receipt.submitted', order())!
  assert.match(review.html, /En revisión/)
  assert.match(review.html, /ONK-01234567-999999/)
  const confirmed = orderEmailMessage('payment.confirmed_manual', order({ status: 'ready', paymentConfirmedAt: '2026-01-15T15:00:00.000Z' }), 'https://tienda.example')!
  assert.match(confirmed.html, /confirmado/)
  assert.match(confirmed.html, /Recogida en Heredia/)
  assert.ok(confirmed.html.includes('href="https://tienda.example"'))
  const rejected = orderEmailMessage('receipt.correction_requested', order({ status: 'rejected', customerMessage: 'La imagen no muestra la referencia <b>visible</b>.' }))!
  assert.match(rejected.html, /referencia &lt;b&gt;visible&lt;\/b&gt;/)
  assert.equal(orderEmailMessage('receipt.submitted', order({ customer: { ...order().customer, email: '' } })), null)
  assert.equal(orderEmailMessage('receipt.submitted', order({ customer: { ...order().customer, email: 'no-es-correo' } })), null)
  assert.match(orderEmailMessage('order.created', order({ totalMinor: null, shippingMinor: null, destination: null }))!.html, /Envío por confirmar/)
})

test('mailer: without credentials the mailer stays off and store keeps working', () => {
  assert.equal(createOrderMailer({}), null)
})

test('mailer: sends one email per order-state version, with bcc copy and brand sender', async () => {
  const outbox: Array<{ from: string; to: string; bcc?: string; subject: string; html: string }> = []
  const mailer = createOrderMailer({
    SMTP_HOST: 'smtpdm.aliyuncs.com', SMTP_USER: 'pedidos@onkys.com', SMTP_PASS: 'secret', MAIL_BCC: 'duena@onkys.com', STORE_PUBLIC_ORIGIN: 'https://onkys.example',
  }, message => { outbox.push(message); return Promise.resolve({ messageId: 'test' }) })
  const reviewing = order()
  await mailer!.notify('receipt.submitted', reviewing)
  await mailer!.notify('receipt.submitted', reviewing)
  assert.equal(outbox.length, 1)
  assert.equal(outbox[0]!.from, 'Onky’s <pedidos@onkys.com>')
  assert.equal(outbox[0]!.to, 'ana@ejemplo.cr')
  assert.equal(outbox[0]!.bcc, 'duena@onkys.com')
  assert.match(outbox[0]!.subject, /en revisión/)
  await mailer!.notify('payment.confirmed_manual', order({ status: 'ready', paymentConfirmedAt: '2026-01-15T15:00:00.000Z' }))
  assert.equal(outbox.length, 2)
  await mailer!.notify('receipt.submitted', order({ customer: { ...order().customer, email: ' ' } }))
  assert.equal(outbox.length, 2)
  await mailer!.notify('order.created', { ...order(), code: 'ONK-FFFF3333FFFF3333', version: 1 })
  assert.equal(outbox.length, 3)
  assert.match(outbox[2]!.html, /SINPE Móvil/)
})
