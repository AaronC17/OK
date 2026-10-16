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
const orderDate = new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', dateStyle: 'medium' })
const storeOrigin = 'https://onkys.shop'

function esc(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
}

function linesTable(order: ShopOrder, paid: boolean): { html: string; text: string } {
  const html = order.lines.map(line =>
    `<tr><td style="padding:18px 12px 18px 0;border-bottom:1px solid #e5e0e6;vertical-align:top;">
      <p style="margin:0 0 5px;font-size:15px;line-height:21px;font-weight:700;color:#211d25;">${esc(line.name)}</p>
      ${line.options.length ? `<p style="margin:0 0 6px;font-size:12px;line-height:18px;color:#716b76;">${esc(line.options.join(' · '))}</p>` : ''}
      <p style="margin:0;font-size:12px;line-height:18px;color:#716b76;">${line.quantity} × ${esc(money(line.unitPriceMinor, store))}</p>
    </td><td align="right" style="padding:18px 0;border-bottom:1px solid #e5e0e6;vertical-align:top;font-size:14px;line-height:21px;font-weight:700;color:#382448;white-space:nowrap;">${esc(money(line.lineTotalMinor, store))}</td></tr>`).join('')
  const shipping = order.shippingMinor === null ? 'Envío por confirmar' : order.shippingMinor === 0 ? 'Sin costo' : money(order.shippingMinor, store)
  const total = order.totalMinor === null ? 'Por confirmar' : money(order.totalMinor, store)
  return {
    html: `<table aria-label="Resumen de tu pedido" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;">
      <thead><tr>
        <th scope="col" align="left" style="padding:0 0 10px;border-bottom:1px solid #e5e0e6;color:#716b76;font-size:11px;font-weight:400;">Producto</th>
        <th scope="col" align="right" style="padding:0 0 10px;border-bottom:1px solid #e5e0e6;color:#716b76;font-size:11px;font-weight:400;">Importe</th>
      </tr></thead>
      <tbody>${html}
        <tr><td style="padding:18px 10px 6px 0;color:#716b76;font-size:13px;">Subtotal</td><td align="right" style="padding:18px 0 6px;color:#211d25;font-size:13px;white-space:nowrap;">${esc(money(order.subtotalMinor, store))}</td></tr>
        <tr><td style="padding:4px 10px 20px 0;color:#716b76;font-size:13px;line-height:19px;">${esc(order.delivery.name)}</td><td align="right" style="padding:4px 0 20px;color:#211d25;font-size:13px;line-height:19px;">${esc(shipping)}</td></tr>
        <tr>
          <th scope="row" align="left" bgcolor="#f2edf5" style="padding:18px 16px;border-radius:8px 0 0 8px;color:#382448;font-size:14px;font-weight:700;">${paid ? 'Total pagado' : 'Total del pedido'}<br><span style="font-size:11px;line-height:20px;font-weight:400;color:#716b76;">Colones costarricenses · CRC</span></th>
          <td align="right" bgcolor="#f2edf5" class="order-total" style="padding:18px 16px 18px 0;border-radius:0 8px 8px 0;color:#382448;font-size:24px;line-height:30px;font-weight:700;letter-spacing:-0.8px;">${esc(total)}</td>
        </tr>
      </tbody></table>`,
    text: order.lines.map(line => `• ${line.quantity} × ${line.name}${line.options.length ? ` (${line.options.join(', ')})` : ''} — ${money(line.lineTotalMinor, store)}`).join('\n') +
      `\nSubtotal: ${money(order.subtotalMinor, store)}\n${order.delivery.name}: ${shipping}\n${paid ? 'Total pagado' : 'Total del pedido'}: ${total} (CRC)`,
  }
}

function noteBox(title: string, content: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;">
    <tr><td bgcolor="#fbfaf9" style="padding:18px 20px;border-radius:8px;font-size:14px;line-height:23px;color:#5d5664;">
      <h2 style="margin:0 0 8px;color:#382448;font-size:14px;line-height:20px;font-weight:700;">${esc(title)}</h2>${content}
    </td></tr></table>`
}

function sinpeBox(order: ShopOrder): string {
  if (order.status === 'pending_details' || !order.destination || order.totalMinor === null) {
    return noteBox('El siguiente paso', '<p style="margin:0;">Tu pedido está guardado. La tienda debe confirmar los datos de pago antes de que realices el SINPE. Consulta las indicaciones desde tu pedido.</p>')
  }
  const destination = order.destination
  const phone = destination.phone.length === 8 ? `${destination.phone.slice(0, 4)}-${destination.phone.slice(4)}` : destination.phone
  return noteBox('Completa tu pago con SINPE Móvil', `
    <p style="margin:0 0 8px;color:#382448;font-size:24px;line-height:30px;font-weight:700;letter-spacing:-0.5px;">${esc(phone)}</p>
    <p style="margin:0 0 12px;">${esc(destination.beneficiary)}<br><span style="color:#716b76;font-size:12px;">${esc(destination.bank)}</span></p>
    <p style="margin:0 0 8px;">Monto exacto: <strong>${esc(money(order.totalMinor, store))}</strong><br>Descripción: <strong style="word-break:break-word;">${esc(order.code)}</strong></p>
    <p style="margin:0;">Después, sube el comprobante desde tu pedido en la tienda. Nuestro equipo revisará el pago y te enviará la confirmación.</p>`)
}

/** Contenido del correo por estado. Devuelve null cuando el pedido no tiene correo de contacto. */
export function orderEmailMessage(event: OrderMailEvent, order: ShopOrder, origin = storeOrigin): { subject: string; html: string; text: string } | null {
  const recipient = order.customer?.email
  if (!recipient || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(recipient)) return null
  const paid = event === 'payment.confirmed_manual'
  const totals = linesTable(order, paid)
  const code = esc(order.code)
  const name = esc(order.customer.name.trim().split(/\s+/)[0] || order.customer.name)
  const image = `${(origin || storeOrigin).replace(/\/+$/, '')}/images/mail-gomitas-v1.png`
  let title = ''
  let headline = ''
  let status = ''
  let preheader = ''
  let lead = ''
  let body = ''
  let detailText = ''
  let action = 'Ir a mi pedido'
  if (event === 'order.created') {
    title = 'Recibimos tu pedido'
    headline = 'Un antojo<br>bien elegido.'
    status = 'Pedido recibido'
    const awaitingDetails = order.status === 'pending_details' || !order.destination || order.totalMinor === null
    preheader = awaitingDetails ? 'Tu pedido está guardado. Estamos por confirmar los datos de pago.' : 'Tu selección está guardada. Solo falta completar el pago con SINPE Móvil.'
    lead = `¡Hola, ${name}! ${awaitingDetails ? 'Tu pedido quedó registrado. La tienda debe confirmar los datos de pago para continuar.' : 'Recibimos tu pedido. Completa el pago con SINPE Móvil para que podamos preparar tus gomitas.'}`
    body = sinpeBox(order)
    detailText = awaitingDetails ? 'Estado: pedido registrado. Consulta las indicaciones de pago desde la tienda.' : `Estado: pedido registrado. Realiza tu SINPE al ${order.destination!.phone}, a nombre de ${order.destination!.beneficiary} (${order.destination!.bank}), por ${money(order.totalMinor!, store)}. Incluye ${order.code} en la descripción y sube el comprobante desde la tienda.`
    action = awaitingDetails ? 'Ir a mi pedido' : 'Completar mi pedido'
  } else if (event === 'receipt.submitted') {
    title = 'Tu pedido está en revisión'
    headline = 'Tu pedido,<br>en revisión.'
    status = 'En revisión'
    preheader = 'Revisaremos tu pago. Una vez confirmado, prepararemos tu pedido para la entrega.'
    lead = `¡Gracias, ${name}! Recibimos tu comprobante. Estamos revisando el pago para confirmar tu pedido.`
    body = noteBox('¿Qué sigue?', `<p style="margin:0;">Por ahora no necesitas hacer nada más. <strong>En cuanto confirmemos el pago, prepararemos tu pedido para la entrega</strong> y te avisaremos por este correo.</p>${order.receipt?.bankReference ? `<p style="margin:12px 0 0;font-size:12px;line-height:19px;color:#716b76;word-break:break-word;">Referencia del comprobante: ${esc(order.receipt.bankReference)}</p>` : ''}`)
    detailText = `Estado: en revisión. Una vez confirmado el pago, tu pedido se prepara para la entrega. Te avisaremos por este correo.${order.receipt?.bankReference ? `\nReferencia del comprobante: ${order.receipt.bankReference}` : ''}`
  } else if (paid) {
    title = '¡Pago confirmado!'
    headline = 'Tu antojo,<br>confirmado.'
    status = 'Pago confirmado'
    preheader = 'Verificamos tu pago. Tu pedido ya está confirmado y entra a preparación.'
    const confirmed = order.paymentConfirmedAt ? totalDate.format(new Date(order.paymentConfirmedAt)) : ''
    lead = `¡Gracias por elegir Onky’s, ${name}! Verificamos tu pago y tu pedido ya entra a preparación.`
    const next = order.delivery.requiresAddress
      ? 'Prepararemos tu selección y la enviaremos a la dirección registrada, con el método de entrega que elegiste.'
      : 'Prepararemos tu selección. Coordina con la tienda el punto y horario de recogida antes de pasar por ella.'
    body = noteBox('Ahora viene lo bueno', `<p style="margin:0;">${next}</p>${confirmed ? `<p style="margin:12px 0 0;font-size:12px;line-height:19px;color:#716b76;">Pago verificado el ${esc(confirmed)}</p>` : ''}`)
    detailText = `Estado: pago confirmado. Tu pedido entra a preparación.${confirmed ? `\nPago verificado el ${confirmed}` : ''}\n${order.delivery.requiresAddress ? `Método de entrega: ${order.delivery.name}. Usaremos la dirección registrada.` : 'Coordina con la tienda el punto y horario de recogida antes de pasar.'}`
  } else {
    title = 'Revisemos tu comprobante'
    headline = 'Un detalle<br>por revisar.'
    status = 'Revisa tu comprobante'
    preheader = 'Necesitamos revisar tu comprobante antes de confirmar el pago de tu pedido.'
    const reason = order.customerMessage
    lead = `Hola, ${name}. Aún no pudimos confirmar el pago. Revisemos el comprobante para continuar con tu pedido.`
    body = noteBox('Un paso más y seguimos', `${reason ? `<p style="margin:0 0 10px;color:#382448;"><strong>Motivo:</strong> ${esc(reason)}</p>` : ''}<p style="margin:0;">Abre tu pedido en la tienda y adjunta el comprobante corregido. Conserva el mismo código de pedido: <strong style="word-break:break-word;">${code}</strong>.</p>`)
    detailText = `Estado: comprobante por corregir.${reason ? `\nMotivo: ${reason}` : ''}\nAbre tu pedido y adjunta el comprobante corregido, conservando el mismo código.`
    action = 'Revisar mi comprobante'
  }

  // Tablas e inline CSS para clientes de correo; el contenido funciona también sin imágenes ni webfonts.
  const message = `<!doctype html>
<html lang="es-CR" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">
  <title>${esc(title)} · Onky’s</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <style>
    body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;} img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    a[x-apple-data-detectors]{color:inherit!important;text-decoration:none!important;}
    @media only screen and (max-width:480px){
      .mail-outer{padding:16px 8px!important;} .mail-pad{padding-left:22px!important;padding-right:22px!important;}
      .mail-hero{padding-top:28px!important;padding-bottom:28px!important;} .hero-title{font-size:34px!important;line-height:37px!important;}
      .hero-art{display:none!important;width:0!important;height:0!important;overflow:hidden!important;}
      .order-meta{display:block!important;width:100%!important;text-align:left!important;}
      .order-date{padding-top:12px!important;} .order-total{font-size:21px!important;} .mail-button{display:block!important;text-align:center!important;}
    }
  </style>
</head>
<body bgcolor="#f1eef3" style="margin:0;padding:0;width:100%;background-color:#f1eef3;font-family:Arial,Helvetica,sans-serif;color:#211d25;">
  <div style="display:none;font-size:1px;line-height:1px;color:#f1eef3;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${esc(preheader)}${'&#847; &zwnj; &nbsp; '.repeat(24)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1eef3" style="width:100%;">
  <tr><td align="center" class="mail-outer" style="padding:36px 16px;">
    <!--[if mso]><table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;border:1px solid #e5e0e6;border-radius:16px;border-spacing:0;overflow:hidden;font-family:Arial,Helvetica,sans-serif;">
      <tr><td class="mail-pad" bgcolor="#fbfaf9" style="padding:26px 36px;border-radius:16px 16px 0 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="color:#382448;font-size:34px;line-height:38px;font-weight:800;letter-spacing:-2px;">Onky’s<span style="color:#9c7bb1;">.</span></td>
          <td align="right" style="color:#716b76;font-size:11px;line-height:17px;">Gomitas<br>enchiladas</td>
        </tr></table>
      </td></tr>
      <tr><td class="mail-pad mail-hero" bgcolor="#f2edf5" style="padding:34px 36px 32px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td valign="middle">
            <p style="margin:0 0 14px;color:#634479;font-size:12px;line-height:18px;font-weight:400;">${status}</p>
            <h1 class="hero-title" style="margin:0 0 18px;color:#382448;font-size:38px;line-height:41px;letter-spacing:-1.6px;font-weight:800;">${headline}</h1>
            <p style="margin:0;font-size:14px;line-height:23px;color:#5d5664;">${lead}</p>
          </td>
          <td class="hero-art" width="154" align="right" valign="middle" style="width:154px;padding-left:20px;">
            <img src="${esc(image)}" width="134" height="179" alt="Gomitas Onky’s" style="display:block;width:134px;height:179px;color:#382448;font-size:12px;">
          </td>
        </tr></table>
      </td></tr>
      <tr><td class="mail-pad" style="padding:0 36px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
          <td class="order-meta" style="padding:30px 0 0;">
            <p style="margin:0 0 6px;color:#716b76;font-size:12px;line-height:18px;">Tu pedido</p>
            <p style="margin:0;color:#382448;font-family:'Courier New',monospace;font-size:14px;line-height:20px;font-weight:700;word-break:break-word;">${code}</p>
          </td>
          <td align="right" class="order-meta order-date" style="padding:30px 0 0;">
            <p style="margin:0 0 6px;color:#716b76;font-size:12px;line-height:18px;">Fecha del pedido</p>
            <p style="margin:0;color:#211d25;font-size:13px;line-height:20px;">${esc(orderDate.format(new Date(order.createdAt)))}</p>
          </td>
        </tr></table>
        <h2 style="margin:28px 0 18px;color:#211d25;font-size:20px;line-height:26px;letter-spacing:-0.4px;">Tu selección</h2>
        ${totals.html}
      </td></tr>
      <tr><td class="mail-pad" style="padding:26px 36px;">
        <p style="margin:0 0 8px;color:#716b76;font-size:12px;line-height:18px;">${order.delivery.requiresAddress ? 'Datos de entrega' : 'Datos de recogida'}</p>
        <p style="margin:0 0 4px;color:#211d25;font-size:14px;line-height:22px;font-weight:700;">${esc(order.customer.name)}</p>
        <p style="margin:0;color:#5d5664;font-size:13px;line-height:21px;">${esc(order.delivery.name)}${order.delivery.requiresAddress && order.customer.address ? `<br>${esc(order.customer.address).replace(/\r?\n/g, '<br>')}` : ''}</p>
      </td></tr>
      <tr><td class="mail-pad" style="padding:0 36px;">${body}</td></tr>
      ${origin ? `<tr><td align="center" class="mail-pad" style="padding:28px 36px 0;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td align="center" bgcolor="#382448" style="border:1px solid #382448;border-radius:8px;mso-padding-alt:16px 32px;">
          <a class="mail-button" href="${esc(origin)}" style="display:inline-block;padding:16px 32px;color:#ffffff;font-size:14px;line-height:20px;font-weight:700;text-decoration:none;border-radius:8px;">${action}</a>
        </td></tr></table>
        <p style="margin:12px 0 0;color:#716b76;font-size:11px;line-height:18px;">Abre la tienda y entra a «Pedido y seguimiento»<br>desde el navegador donde hiciste tu compra.</p>
      </td></tr>` : ''}
      <tr><td align="center" class="mail-pad" style="padding:28px 36px 32px;">
        <p style="margin:0;color:#382448;font-size:14px;line-height:22px;font-weight:700;">Gracias por dejarnos ser parte de tu antojo.</p>
        <p style="margin:4px 0 0;color:#716b76;font-size:12px;line-height:19px;">Con cariño, el equipo de Onky’s.</p>
      </td></tr>
      <tr><td align="center" class="mail-pad" bgcolor="#fbfaf9" style="padding:22px 36px;border-radius:0 0 16px 16px;">
        <p style="margin:0;color:#716b76;font-size:11px;line-height:18px;">Dulce. Ácido. Picosito.</p>
      </td></tr>
    </table>
    <!--[if mso]></td></tr></table><![endif]-->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;"><tr><td align="center" style="padding:20px 16px 0;color:#716b76;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:18px;">
      Recibiste este correo por tu pedido en Onky’s.<br>Conserva el código <span style="word-break:break-word;">${code}</span> para identificarlo.
    </td></tr></table>
  </td></tr></table>
</body></html>`
  const text = `Onky’s · ${title}
Hola, ${order.customer.name}.
Pedido: ${order.code} · ${orderDate.format(new Date(order.createdAt))}

${detailText}

${totals.text}

Entrega: ${order.delivery.name}${order.delivery.requiresAddress && order.customer.address ? `\n${order.customer.address}` : ''}.

${origin ? `Consulta tu pedido: ${origin}\nAbre «Pedido y seguimiento» desde el navegador donde hiciste tu compra.` : 'Consulta tu pedido en la tienda.'}

Gracias por dejarnos ser parte de tu antojo.
El equipo de Onky’s · Dulce. Ácido. Picosito.`
  return { subject: `Onky’s · ${title} (${order.code})`, html: message, text }
}

export interface OrderMailer { notify(event: OrderMailEvent, order: ShopOrder): Promise<void> }

const MAX_TRACKED = 400

export function createOrderMailer(env: NodeJS.ProcessEnv = process.env, deliver?: Transport['sendMail']): OrderMailer | null {
  const config = readSmtpConfig(env)
  if (!config) return null
  const origin = env.STORE_PUBLIC_ORIGIN?.trim() || storeOrigin
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
