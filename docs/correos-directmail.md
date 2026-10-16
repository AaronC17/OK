# Avisos por correo con Alibaba Cloud DirectMail

La tienda envía correos automáticos al cliente en cuatro momentos del pedido, usando **DirectMail** de Alibaba Cloud por SMTP. Es SMTP estándar con `nodemailer`: si algún día cambia el proveedor, sirve cualquier otro servidor SMTP.

| Estado del pedido | Correo al cliente |
| --- | --- |
| `awaiting_payment` / `pending_details` | «Recibimos tu pedido» con las instrucciones SINPE: número, beneficiario, monto exacto y el código para la descripción. |
| `pending_review` (comprobante subido) | «Tu pedido está en revisión» — confirma que llegó el comprobante y que **apenas se confirme el pago, el pedido se prepara para la entrega**. |
| `ready` (admin lo confirma) | «¡Pago confirmado!»: entra a preparación; entrega a domicilio o punto de retiro según el método. |
| `rejected` (pide corrección) | «Revisemos tu comprobante» con el motivo exacto y la instrucción de subirlo de nuevo con el mismo código. |

Si el envío falla, el pedido se registra igual y el error queda en los registros del despliegue: el correo nunca bloquea el checkout.

## 1. Configurar DirectMail en Alibaba Cloud

1. Inicia sesión en la [consola de DirectMail](https://console.alibabacloud.com/home/dashboard/ProductAndService → Direct Mail) y activa el servicio. La cuenta de Onky's quedó en la región **ap-southeast-1 (Singapur)**.
2. **Agrega el dominio emisor** (Email Domains → New Domain): `onkys.shop`. La consola genera esta verificación:
   - `TXT` SPF (`@`): `v=spf1 include:spfdm-ap-southeast-1.aliyun.com -all`
   - `TXT` DKIM (`aliyun-ap-southeast-1._domainkey`): `v=DKIM1; k=rsa; p=<clave 1024-bit que genera la consola>`
   - `TXT` DMARC (`_dmarc`): `v=DMARC1;p=none;rua=mailto:dmarc_report@service.aliyun.com`
   - `MX` (`@`, prioridad 10): `mxdm-ap-southeast-1.aliyun.com`
   - Los cuatro registros fueron creados en **Vercel DNS** (`vercel dns add onkys.shop …`) y verificados contra los nameservers autoritativos de Vercel.
3. Pulsa **Verify Now** en la consola cuando la delegación del dominio esté viva: el estado pasa de «To Be Verified» a «Verification passed». Solo con dominio verificado se pueden crear remitentes.
4. **Crea la dirección de remitente** (Sender Addresses → Create Sender Address): `pedidos@` + `onkys.shop`, tipo **Triggered Emails** (avisos de pedido). Esa dirección solo envía; no revisa su inbox.
5. **Genera la contraseña SMTP** de esa dirección (SMTP Password en la misma pantalla). Guárdala de inmediato: no se puede volver a consultar.

## 2. Variables de entorno

En `.env.store.local` para local y en el dashboard de Vercel (Settings → Environment Variables) para producción:

```bash
SMTP_HOST=smtpdm-ap-southeast-1.aliyun.com   # endpoint SMTP de la región ap-southeast-1
SMTP_PORT=465                                # SSL; no uses el 25, muchos hosts lo bloquean
SMTP_USER=pedidos@onkys.shop                 # dirección de remitente de DirectMail
SMTP_PASS=<contraseña SMTP del paso 1.5>
MAIL_FROM="Onky's <pedidos@onkys.shop>"
```

Sin estas variables el correo queda **deshabilitado y el flujo de pedidos funciona igual** (útil para pruebas y para el modo demo).

## 3. Pruebas y cuota gratuita

- Prueba local: configura las variables en `.env.store.local`, corre `npm run store:api`, crea un pedido desde `localhost:5173` con tu propio correo y revisa la bandeja.
- Cuota gratuita actual: **2.000 correos en total por cuenta, máximo 200/día**. Con hasta cuatro avisos por pedido hay margen para el volumen diario de la tienda; revisa las estadísticas en la consola (Direct Mail → Send Statistics) y agrega un paquete pagado si el pedido crece (hay promociones de pago por volumen).
- Los envíos cobran por conexión; dirigir cada aviso a un solo destinatario con pagina copia es el patrón más económico.

## 4. Notas técnicas

- Dependencias: `nodemailer` (producción) + `@types/nodemailer` (dev). El bundle de `api/index.js` deja `nodemailer` como dependencia externa y Vercel lo resuelve desde `node_modules`.
- El envío hacia `smtpdm-ap-southeast-1.aliyun.com:465` ocurre **durante la misma solicitud** de crear pedido / confirmar pago / revisar admin: en serverless (Vercel) las promesas en segundo plano se congelan tras responder, así que reconocer el envío dentro de la solicitud evita correos perdidos.
- Pedidos sin correo del cliente (compatibilidad con pedidos previos) simplemente no disparan envío.
- El remitente solo puede ser la dirección aprobada en DirectMail; para respuestas usa `MAIL_BCC` o el contacto de la tienda del pie del sitio.
- Las plantillas y textos de los cuatro avisos viven en `server/store/mailer.ts`.
