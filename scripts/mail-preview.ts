import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { orderEmailMessage } from '../server/store/mailer.ts'
import type { ShopOrder } from '../src/order-types.ts'

const order: ShopOrder = {
  id: '6a2d8ddfa2f14d2ebc9d94a75b3bc9a0', code: 'ONK-D986A04B27C1F5E2', version: 1, status: 'pending_review', demo: false,
  createdAt: '2026-10-16T14:03:00.000Z', updatedAt: '2026-10-16T14:20:00.000Z',
  lines: [
    { key: 'gummy:ositos:250', name: 'Ositos enchilados', options: ['Ositos', '250 g por bolsa'], quantity: 1, unitPriceMinor: 250000, lineTotalMinor: 250000 },
    { key: 'gummy:mix:100', name: 'Mix de gomitas', options: ['Ositos, aros y gusanos', '100 g por bolsa'], quantity: 2, unitPriceMinor: 120000, lineTotalMinor: 240000 },
  ],
  subtotalMinor: 490000, shippingMinor: 280000, totalMinor: 770000,
  delivery: { id: 'delivery', name: 'Envío por Correos', requiresAddress: true },
  customer: { name: 'Ana Pérez Vargas', phone: '61551234', email: 'ana@ejemplo.cr', address: 'V-9, casa 42, barrio céntrico de Heredia', notes: '' },
  destination: { phone: '88880000', beneficiary: 'Onky’s Comercializadora', bank: 'BAC Credomatic' },
  receipt: { id: '1b6d8d5b5a0e4fbcd2a4ad3b7e6eeea0', contentType: 'image/webp', size: 1200, submittedAt: '2026-10-16T14:19:00.000Z', bankReference: 'ONK-D986A04B-524199' },
  customerMessage: null, paymentConfirmedAt: null, paymentVerification: 'manual',
}

const events = [
  ['order.created', '1-registrado', 'awaiting_payment'],
  ['receipt.submitted', '2-en-revision', 'pending_review'],
  ['payment.confirmed_manual', '3-confirmado', 'ready'],
  ['receipt.correction_requested', '4-correccion', 'rejected'],
] as const

const outDir = resolve('docs/mail-previews')
mkdirSync(outDir, { recursive: true })
for (const [event, label, status] of events) {
  const message = orderEmailMessage(event, {
    ...order, status,
    paymentConfirmedAt: status === 'ready' ? '2026-10-16T14:25:00.000Z' : null,
    customerMessage: status === 'rejected' ? 'La foto llegó borrosa; no se lee el número de referencia.' : null,
    receipt: status === 'awaiting_payment' ? null : order.receipt,
  }, process.env.STORE_PUBLIC_ORIGIN?.trim() || 'https://onkys.shop')
  if (!message) throw new Error('El pedido de muestra no produce correo; revisa el contacto.')
  // Solo la vista previa usa el recurso local; el correo real lleva una URL absoluta HTTPS.
  const html = message.html.replace(/src="[^"]*\/images\/mail-gomitas-v1\.png"/g, 'src="../../public/images/mail-gomitas-v1.png"')
  writeFileSync(join(outDir, `${label}.html`), html)
  console.info(`Previsualización generada: docs/mail-previews/${label}.html`)
}
