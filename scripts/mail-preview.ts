import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { orderEmailMessage } from '../server/store/mailer.ts'
import type { ShopOrder } from '../src/order-types.ts'

const order: ShopOrder = {
  id: '6a2d8ddfa2f14d2ebc9d94a75b3bc9a0', code: 'ONK-D986A04B27C1F5E2', version: 1, status: 'pending_review', demo: false,
  createdAt: '2026-01-15T14:03:00.000Z', updatedAt: '2026-01-15T14:20:00.000Z',
  lines: [
    { key: 'gummy:ositos:250', name: 'Ositos Enchilados', options: ['Un solo tipo', 'Ositos', '250 g por bolsa'], quantity: 1, unitPriceMinor: 280000, lineTotalMinor: 280000 },
    { key: 'gummy:tiritas:100', name: 'Tiritas Enchiladas', options: ['Un solo tipo', 'Tiritas', '100 g por bolsa'], quantity: 2, unitPriceMinor: 120000, lineTotalMinor: 240000 },
  ],
  subtotalMinor: 520000, shippingMinor: 280000, totalMinor: 800000,
  delivery: { id: 'delivery', name: 'Envío por Correos', requiresAddress: true },
  customer: { name: 'Ana Pérez Vargas', phone: '61551234', email: 'ana@ejemplo.cr', address: 'V-9, casa 42, barrio céntrico de Heredia', notes: '' },
  destination: { phone: '88880000', beneficiary: 'Onky’s Comercializadora', bank: 'BAC Credomatic' },
  receipt: { id: '1b6d8d5b5a0e4fbcd2a4ad3b7e6eeea0', contentType: 'image/webp', size: 1200, submittedAt: '2026-01-15T14:19:00.000Z', bankReference: 'ONK-D986A04B-524199' },
  customerMessage: 'La foto llegó borrosa; no se lee el número de referencia.', paymentConfirmedAt: null, paymentVerification: 'manual',
}

const events = [
  ['order.created', '1-registrado'],
  ['receipt.submitted', '2-en-revision'],
  ['payment.confirmed_manual', '3-confirmado'],
  ['receipt.correction_requested', '4-correccion'],
] as const

const outDir = resolve('docs/mail-previews')
mkdirSync(outDir, { recursive: true })
for (const [event, label] of events) {
  const message = orderEmailMessage(event, order, process.env.STORE_PUBLIC_ORIGIN?.trim() || 'https://onkys.example/')
  if (!message) throw new Error('El pedido de muestra no produce correo; revisa el contacto.')
  writeFileSync(join(outDir, `${label}.html`), message.html)
  console.info(`Previsualización generada: docs/mail-previews/${label}.html`)
}
