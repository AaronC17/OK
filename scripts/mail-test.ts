import nodemailer from 'nodemailer'
import { readSmtpConfig } from '../server/store/mailer.ts'

// Envía un correo de prueba con las credenciales SMTP configuradas (DirectMail).
// Uso: npm run mail:test [destinatario]  — sin argumento usa MAIL_BCC o la propia dirección SMTP_USER.

const config = readSmtpConfig()
if (!config) {
  console.error('Faltan variables SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS): configúralas en .env.store.local o en el entorno.')
  process.exit(1)
}

const to = process.argv[2]?.trim() || config.bcc || config.user

const transport = nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: config.secure,
  auth: { user: config.user, pass: config.pass },
  connectionTimeout: 15_000,
  greetingTimeout: 15_000,
  socketTimeout: 20_000,
})

try {
  const info = await transport.sendMail({
    from: config.from,
    replyTo: config.replyTo,
    to,
    bcc: config.bcc && config.bcc !== to ? config.bcc : undefined,
    subject: 'Onky’s · prueba de DirectMail',
    headers: { 'Auto-Submitted': 'auto-generated' },
    text: 'Prueba de envío SMTP desde la tienda de Onky’s (DirectMail, región ap-southeast-1). Si lees este mensaje, tus credenciales funcionan.',
    html:
      '<div style="font-family:Arial,sans-serif;color:#3a2b47;">' +
      '<p>Prueba de envío SMTP desde la tienda de <strong>Onky’s</strong> vía DirectMail (región ap-southeast-1).</p>' +
      '<p>Si lees este mensaje en tu bandeja, las credenciales SMTP funcionan y los avisos de pedido pueden enviarse.</p>' +
      '<p style="color:#6b5a7d;">— Prueba técnica de Onky’s</p></div>',
  })
  console.log(`Enviado a ${to} · id ${info.messageId}`)
} catch (error) {
  console.error('Error de SMTP:', error)
  process.exit(1)
}
