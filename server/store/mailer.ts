import nodemailer from 'nodemailer'
import { store } from '../../src/config/store.ts'
import { money } from '../../src/lib/shop.ts'
import type { ShopOrder } from '../../src/order-types.ts'

/** Estado del pedido que dispara un correo al cliente. Nombres alineados con la auditoría. */
export type OrderMailEvent = 'order.created' | 'receipt.submitted' | 'payment.confirmed_manual' | 'receipt.correction_requested'

export interface DirectMailConfig { host: string; port: number; secure: boolean; user: string; pass: string; from: string; bcc?: string }

interface Transport { sendMail(message: { from: string; to: string; bcc?: string; subject: string; html: string; text: string }): Promise<unknown> }

export function readSmtpConfig(env: NodeJS.ProcessEnv = process.env): DirectMailConfig | null {
  const host = env.SMTP_HOST?.trim()
  const user = env.SMTP_USER?.trim()
  const pass = env.SMTP_PASS
  if (!host || !user || !pass) return null
  const port = Number(env.SMTP_PORT || '465')
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT debe ser un número de puerto válido.')
  const secure = port === 465 ? true : (env.SMTP_SECURE ? env.SMTP_SECURE.toLowerCase() === 'true' : false)
  return { host, port, secure, user, pass, from: env.MAIL_FROM?.trim() || `Onky’s <${user}>`, bcc: env.MAIL_BCC?.trim() || undefined }
}

const totalDate = new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', dateStyle: 'long', timeStyle: 'short' })

function esc(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}

function linesTable(order: ShopOrder): { html: string; text: string } {
  const html = order.lines.map(line =>
    `<tr><td style="padding:6px 0;color:#3a2b47;">${esc(`${line.quantity} × ${line.name}${line.options.length ? ` · ${line.options.join(' · ')}` : ''}`)}</td>` +
    `<td style="padding:6px 0;text-align:right;color:#3a2b47;white-space:nowrap;">${esc(money(line.lineTotalMinor, store))}</td></tr>`).join('')
  const shipping = order.shippingMinor === null ? 'Envío por confirmar' : money(order.shippingMinor, store)
  const total = order.totalMinor === null ? 'Por confirmar' : money(order.totalMinor, store)
  return {
    html:
      `<table style="width:100%;border-collapse:collapse;font-size:14px;">${html}` +
      `<tr><td style="padding:6px 0;color:#6b5a7d;">Envío (${esc(order.delivery.name)})</td><td style="padding:6px 0;text-align:right;color:#6b5a7d;">${esc(shipping)}</td></tr>` +
      `<tr><td style="padding:10px 0;border-top:2px solid #e6daee;font-weight:700;color:#492f5d;">Total</td>` +
      `<td style="padding:10px 0;border-top:2px solid #e6daee;text-align:right;font-weight:700;color:#492f5d;">${esc(total)}</td></tr></table>`,
    text: order.lines.map(line => `• ${line.quantity} × ${line.name}${line.options.length ? ` (${line.options.join(', ')})` : ''} — ${money(line.lineTotalMinor, store)}`).join('\n') +
      `\nEnvío (${order.delivery.name}): ${shipping}\nTotal: ${total}`,
  }
}

function sinpeBox(order: ShopOrder): string {
  if (!order.destination || order.totalMinor === null) {
    return '<p style="margin:16px 0;color:#6b5a7d;font-size:14px;">Aún no hay datos de pago para este pedido: la tienda compartirá el monto exacto y el número SINPE apenas se activen. Te avisaremos por este correo.</p>'
  }
  const destination = order.destination
  const phone = destination.phone.length === 8 ? `${destination.phone.slice(0, 4)}-${destination.phone.slice(4)}` : destination.phone
  return `<div style="margin:16px 0;padding:14px 16px;border:1px solid #e6daee;border-radius:10px;background:#faf8fc;">
<p style="margin:0 0 6px;font-size:14px;color:#3a2b47;">Haces tu <strong>SINPE Móvil</strong> al <strong>${esc(phone)}</strong> (${esc(destination.bank)}) a nombre de <strong>${esc(destination.beneficiary)}</strong>.</p>
<p style="margin:0;font-size:14px;color:#3a2b47;">Monto exacto: <strong>${esc(money(order.totalMinor, store))}</strong>. En la descripción escribes el código <strong style="color:#492f5d;">${esc(order.code)}</strong>.</p></div>`
}

function stepsList(order: ShopOrder): string {
  if (order.status === 'pending_details') {
    return '<li style="margin-bottom:6px;">Tu pedido quedó registrado y esperará a que la tienda active los datos de pago.</li><li>Te avisaremos por este correo cuando puedas pagar.</li>'
  }
  return `<li style="margin-bottom:6px;">Haces tu SINPE Móvil con el monto y código exactos.</li><li style="margin-bottom:6px;">Subes la captura del comprobante desde la tienda y confirmas el pago.</li><li>Nuestro equipo lo revisa y confirma tu pedido. Te avisamos por este correo.</li>`
}

/** Contenido del correo por estado. Devuelve null cuando el pedido no tiene correo de contacto. */
export function orderEmailMessage(event: OrderMailEvent, order: ShopOrder, origin = ''): { subject: string; html: string; text: string } | null {
  const recipient = order.customer?.email
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipient)) return null
  const totals = linesTable(order)
  const code = esc(order.code)
  const name = esc(order.customer.name.split(' ')[0] || order.customer.name)
  let title = ''
  let eyes = ''
  let lead = ''
  let body = ''
  if (event === 'order.created') {
    title = 'Recibimos tu pedido'
    eyes = 'PEDIDO REGISTRADO'
    lead = `¡Hola, ${name}! Tu pedido <strong>${code}</strong> quedó registrado en Onky’s.`
    body = `<div style="margin:16px 0;color:#3a2b47;font-size:14px;">
<ol style="margin:0 0 0 18px;padding:0;">${stepsList(order)}</ol></div>${sinpeBox(order)}`
  } else if (event === 'receipt.submitted') {
    title = 'Tu pedido está en revisión'
    eyes = 'PAGO EN REVISIÓN'
    lead = `Recibimos el comprobante de tu pedido <strong>${code}</strong>.`
    body = `<div style="margin:16px 0;color:#3a2b47;font-size:14px;">
<p style="margin:0 0 10px;">Ahora nuestro equipo revisa que el pago coincida con tu pedido. <strong>En cuanto lo confirmemos, tu pedido se prepara para la entrega</strong> y te avisamos por este correo.</p>
<ul style="margin:0 0 0 18px;padding:0;">
<li style="margin-bottom:6px;">Estado actual: <strong>En revisión</strong>. No es necesario que hagas nada más.</li>
<li style="margin-bottom:6px;">Referencia del comprobante: <strong>${esc(order.receipt?.bankReference ?? '')}</strong>.</li>
<li>Si cambio algo, te escribimos con la corrección al instante.</li>
</ul></div>`
  } else if (event === 'payment.confirmed_manual') {
    title = '¡Pago confirmado!'
    eyes = 'PEDIDO CONFIRMADO'
    const confirmed = order.paymentConfirmedAt ? totalDate.format(new Date(order.paymentConfirmedAt)) : ''
    lead = `Verificamos tu pago del pedido <strong>${code}</strong>. ¡Ya es tuyo!`
    body = `<div style="margin:16px 0;color:#3a2b47;font-size:14px;">
<p style="margin:0 0 10px;">Tu pedido quedó <strong>confirmado${confirmed ? ` el ${esc(confirmed)}` : ''}</strong> y entra a preparación.</p>
<p style="margin:0 0 10px;">${order.delivery.requiresAddress ? `Vamos a entregarlo por ${esc(order.delivery.name)} a la dirección que registraste. Te avisaremos cuando salga en ruta.` : `Puedes retirarlo en el punto de recogida: <strong>${esc(order.delivery.name)}</strong>.`}</p>
<p style="margin:0;">Cualquier detalle, escríbenos o revisa el estado desde la tienda.</p></div>`
  } else {
    title = 'Revisemos tu comprobante'
    eyes = 'AYUDA CON TU PAGO'
    const reason = order.customerMessage
    lead = `Aún no pudimos confirmar el pago del pedido <strong>${code}</strong>.`
    body = `<div style="margin:16px 0;color:#3a2b47;font-size:14px;">
<p style="margin:0 0 10px;">Es muy fácil de arreglar. Abre la tienda, ingresa con tu carrito y sube un nuevo comprobante:</p>
${reason ? `<ul style="margin:0 0 10px 18px;padding:0;"><li style="margin-bottom:6px;">Motivo: <strong>${esc(reason)}</strong></li><li>Usa el mismo código <strong style="color:#492f5d;">${code}</strong> en la descripción de tu nuevo SINPE.</li></ul>` : ''}
<p style="margin:0;">Nos confirmas apenas subas el nuevo comprobante.</p></div>`
  }

  const message = `<!doctype html><html lang="es-CR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f3ecf8;font-family:Georgia,'Times New Roman',serif;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6daee;">
<div style="background:#492f5d;padding:18px 24px;"><div style="color:#fbfaf9;font-size:26px;letter-spacing:-0.5px;font-weight:700;">Onky’s</div>
<div style="color:#cbb8dc;font-size:11px;letter-spacing:2.4px;font-weight:700;font-family:Cambria,Georgia,serif;">${eyes}</div></div>
<div style="padding:24px;"><h1 style="margin:0 0 10px;color:#492f5d;font-size:21px;font-family:Cambria,Georgia,serif;">${esc(title)}</h1>
<p style="margin:0 0 6px;color:#3a2b47;font-size:15px;line-height:1.5;">${lead}</p>
${body}
<div style="margin:20px 0 8px;padding:12px 16px;border-radius:10px;background:#faf8fc;border:1px solid #e6daee;">${totals.html}</div>
<div style="margin:14px 0 0;color:#6b5a7d;font-size:13px;">Cliente: ${esc(order.customer.name)} · ${esc(order.delivery.name)}${order.customer.address ? ` · ${esc(order.customer.address)}` : ''}</div>
${origin ? `<a href="${esc(origin)}" style="display:inline-block;margin-top:14px;padding:10px 18px;border-radius:999px;background:#492f5d;color:#fbfaf9;text-decoration:none;font-size:14px;">Ver mi pedido en la tienda</a>` : ''}
</div>
<div style="padding:14px 24px;border-top:1px solid #e6daee;color:#8d7da0;font-size:11px;line-height:1.5;">Mensajes automáticos de Onky’s para tu pedido ${code}. Nadie te pedirá contraseñas ni datos extra por correo.</div>
</div></body></html>`
  const text = `${title}
${order.customer.name}, pedido ${order.code}. Entrega: ${order.delivery.name}${order.customer.address ? `, ${order.customer.address}` : ''}.

${totals.text}

${event === 'order.created' ? 'Estado: pedido registrado. Realiza tu SINPE y sube el comprobante desde la tienda.\n' : event === 'receipt.submitted' ? 'Estado: en revisión. Una vez confirmado el pago, tu pedido se prepara para la entrega.\n' : event === 'payment.confirmed_manual' ? 'Estado: pago confirmado. Tu pedido entra a preparación.\n' : `Estado: comprobante por corregir. ${order.customerMessage ?? ''}\n`}
${origin ? `Consulta tu pedido: ${origin}` : 'Consulta tu pedido en la tienda.'}`
  return { subject: `Onky’s · ${title} (${order.code})`, html: message, text }
}

export interface OrderMailer { notify(event: OrderMailEvent, order: ShopOrder): Promise<void> }

const MAX_TRACKED = 400

export function createOrderMailer(env: NodeJS.ProcessEnv = process.env, deliver?: Transport['sendMail']): OrderMailer | null {
  const config = readSmtpConfig(env)
  if (!config) return null
  const origin = env.STORE_PUBLIC_ORIGIN?.trim() || ''
  const transport: Transport = deliver ? { sendMail: deliver } : nodemailer.createTransport({
        host: config.host, port: config.port, secure: config.secure, auth: { user: config.user, pass: config.pass },
        connectionTimeout: 6_000, greetingTimeout: 6_000, socketTimeout: 10_000,
      })
  const sent = new Map<string, number>()
  const first = (key: string) => {
    if (sent.has(key)) return false
    if (sent.size >= MAX_TRACKED) for (const [old, time] of sent) { if (time < Date.now() - 3_600_000) sent.delete(old) }
    if (sent.size >= MAX_TRACKED) sent.delete(sent.keys().next().value!)
    sent.set(key, Date.now())
    return true
  }
  return {
    notify(event, order) {
      const key = `${order.id}:${order.version || 0}:${event}`
      if (!first(key)) return Promise.resolve()
      const message = orderEmailMessage(event, order, origin)
      if (!message) return Promise.resolve()
      const to = order.customer.email
      return transport.sendMail({ from: config.from, to, bcc: config.bcc, subject: message.subject, html: message.html, text: message.text })
        .then(() => { sent.set(key, Date.now()) })
        .catch(error => {
          sent.delete(key)
          console.warn(`Onky’s: el correo ${event} del pedido ${order.code} no salió: ${error instanceof Error ? error.message : 'error desconocido'}`)
        })
    },
  }
}
