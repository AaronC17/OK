# Avisos por correo con Alibaba Cloud DirectMail

La tienda envía una confirmación de cuenta y correos automáticos al cliente en cuatro momentos del pedido, usando **DirectMail** de Alibaba Cloud por SMTP. Es SMTP estándar con `nodemailer`: si algún día cambia el proveedor, sirve cualquier otro servidor SMTP.

| Estado del pedido | Correo al cliente |
| --- | --- |
| Cuenta creada | «Onky’s · Tu cuenta está lista»: confirma los datos de registro y explica el beneficio de bienvenida. |
| `awaiting_payment` / `pending_details` | «Recibimos tu pedido» con las instrucciones SINPE: número, beneficiario, monto exacto y el código para la descripción. |
| `pending_review` (comprobante subido) | «Onky’s · Pago en revisión (código)» — confirma que llegó el comprobante y que **apenas se confirme el pago, el pedido se prepara para la entrega**. |
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
# MAIL_REPLY_TO=<buzón real atendido por la tienda; opcional>
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
- El remitente debe ser la dirección aprobada en DirectMail. `MAIL_REPLY_TO` permite dirigir respuestas a un buzón real atendido por la tienda; si no está configurado se omite. `MAIL_BCC` únicamente recibe copias, no dirige respuestas.
- Las plantillas y textos de los cinco avisos viven en `server/store/mailer.ts`.
- Todos los avisos usan `Auto-Submitted: auto-generated` para identificar que se generan automáticamente. Nodemailer genera `Date`, `Message-ID` y el MIME con alternativas de texto y HTML. Esa cabecera describe el envío, no obliga a los filtros a aceptarlo.

## 5. Diseño y vistas previas

- Los cuatro avisos comparten la identidad de la tienda: blanco cálido, violeta `#382448`, marca tipográfica y fotografía de las gomitas. La confirmación destaca el pago verificado, la preparación, el total y los datos de entrega.
- HTML con tablas de presentación, estilos inline, ajustes móviles y versión de texto. La información del pedido sigue siendo legible aunque el cliente de correo bloquee las imágenes.
- Resumen visible, sin relleno invisible de caracteres repetidos. Los asuntos identifican la tienda y el evento; en la bienvenida, los datos de la cuenta son el contenido principal y el descuento se explica en un único párrafo.
- La foto optimizada para correo es `public/images/mail-gomitas-v1.png` (PNG, 268 × 358, derivada de `bolsa-mix.webp`). Se publica junto con la aplicación y se muestra a la mitad de su tamaño para pantallas de alta densidad.
- `npm run mail:preview` regenera los cinco ejemplos en `docs/mail-previews/`. Abre `2-en-revision.html` y `5-bienvenida.html` para revisar los avisos de pago y cuenta; sus imágenes son locales, por lo que puedes revisarlos antes de desplegar.
- El botón lleva a `STORE_PUBLIC_ORIGIN`, o a `https://onkys.shop` cuando no está configurado. El seguimiento se consulta desde el navegador donde se realizó la compra.

## 6. Foto del remitente (avatar en Gmail)

DirectMail no permite definir una foto para el remitente: Gmail toma la imagen de la **cuenta de Google** asociada a la dirección. Como `pedidos@onkys.shop` es solo un remitente SMTP sin buzón, la vía gratuita es alta con **Cloud Identity Free** (identidad del dominio, sin Gmail ni buzón):

1. Imagen lista: `public/images/onkys-perfil.png` (1024 × 1024, fondo blanco, wordmark con comilla tipográfica y punto lila). Regenérase con `node --experimental-strip-types scripts/onkys-avatar.ts`; una vez desplegada queda en `https://onkys.shop/images/onkys-perfil.png`.
2. En `workspace.google.com` → *Comenzar*: negocio «Onky's», dominio propio `onkys.shop`, y como usuario administrador `pedidos@onkys.shop` (edición gratuita, sin Gmail).
3. Google entrega un registro TXT `google-site-verification=...`: se añade en el DNS de Vercel (raíz) y se pulsa *Verificar*. No es necesario tocar el MX actual de DirectMail.
4. Con la sesión de `pedidos@onkys.shop`: `accounts.google.com` → foto de perfil → subir la imagen del paso 1.
5. En la consola de administración (`admin.google.com`) → Directorio → Compartir: permitir que los datos del perfil (incluida la foto) sean visibles fuera de la organización; Gmail decide si muestra el avatar, y con la identidad verificada es lo más cercano al logotipo.
6. La alternativa con garantía es **BIMI** con certificado de marca (VMC/CMC), de pago anual; no tiene sentido mientras la tienda sea pequeña.

**Estado del alta (2026-10-16):** la cuenta de Google `pedidos@onkys.shop` ya fue creada en Cloud Identity Free (con su contraseña y el Gmail de recuperación). El primer inicio de sesión se bloqueó con «Demasiados intentos fallidos» en la verificación por teléfono; Google libera el método al pasar unas horas. Reintentar al día siguiente desde el celular o el navegador habitual del administrador (lada +506, o un solo intento; si aparece el código al correo de recuperación, preferirlo) y luego seguir con los pasos 4 y 5. La imagen ya está publicada en `https://onkys.shop/images/onkys-perfil.png`.
