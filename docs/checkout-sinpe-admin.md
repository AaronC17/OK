# Checkout SINPE y administración de pedidos

Esta es la fase actual: **pedidos registrados en backend, comprobantes privados y confirmación manual desde administración**. WhatsApp dejó de ser una opción del checkout y de la tienda. No se inicia sesión en BAC ni se realiza ninguna transferencia desde el sistema.

## 1. Abrir la tienda y crear el administrador

Requiere Node.js 22.18+ o 24 LTS. En PowerShell, dentro del proyecto:

```powershell
npm.cmd install
npm.cmd run dev
```

- Tienda: **http://localhost:5173/**.
- Administración: **http://localhost:5173/admin**.
- La API se inicia junto con Vite; no necesitas abrir otro proceso de pagos para este checkout.

En el primer arranque se generan una base nueva y un **código de instalación aleatorio de un solo uso**. No existe una contraseña predeterminada. Para leer el código en tu propio equipo:

```powershell
Get-Content '.data/store/admin-setup-token.txt'
```

En `/admin`, introduce ese código y elige usuario y contraseña propia de al menos 12 caracteres. No uses la contraseña de tu banco. Al crear la cuenta, el código se invalida y su archivo se elimina. No lo envíes a este chat ni lo publiques.

Después, los accesos usan usuario y contraseña. Las contraseñas se almacenan con scrypt y sal aleatoria; las sesiones administrativas duran hasta ocho horas y usan cookies HttpOnly/SameSite y protección CSRF. Cerrar sesión revoca su token en el servidor. Conserva tus credenciales en un gestor: no se ha implementado recuperación de contraseña ni MFA. **No borres la base para recuperar el acceso.**

## 2. Configurar SINPE

En el panel, abre **Configuración** e introduce:

1. Número SINPE receptor de ocho dígitos.
2. Nombre exacto del beneficiario que muestra BAC.
3. Habilita las instrucciones y confirma que verificaste ambos datos.
4. Guarda la configuración.

El banco se identifica como BAC Credomatic. No se solicita IBAN ni acceso bancario. **No se asumió que el número del antiguo WhatsApp sea tu SINPE.**

Sin configuración, se pueden registrar pedidos con su entrega calculada, pero quedan **«Por coordinar»** y no se muestran instrucciones para transferir. Al habilitar SINPE, esos pedidos pasan automáticamente a pendientes de pago. Cambiar el destino después no modifica las instrucciones de pedidos ya emitidos: cada pedido conserva su propio snapshot.

**El catálogo sigue con `demo: true`: los precios de productos siguen siendo ejemplos. La tarifa de Correos ya fue confirmada: ₡2.800 y gratis por compras mayores a ₡15.000. No envíes ni solicites dinero real hasta confirmar el resto de los datos comerciales y el beneficiario.**

## 3. Recorrido del comprador

1. Añade productos al carrito.
2. Elige entrega e introduce nombre, teléfono de contacto y dirección cuando corresponda. El teléfono no abre WhatsApp ni recibe mensajes automáticos.
3. Acepta que sus datos y comprobante se guarden de forma privada para gestionar el pedido.
4. Pulsa **«Crear pedido con SINPE»**.
5. El servidor valida el carrito, calcula precios y genera el código único `ONK-` seguido de 16 caracteres hexadecimales. El cliente no define el código, el precio ni el estado.
6. Si el total y el destino están confirmados, ve el número receptor, beneficiario, monto exacto y código para el detalle de la transferencia.
7. Introduce el código del pedido y la referencia bancaria y adjunta su comprobante.
8. El backend comprueba que ese código corresponde exactamente al pedido de esa sesión y guarda el archivo. El estado cambia a **«Comprobante en revisión»**, no a pagado.
9. Tras la confirmación administrativa, verá **«Pago confirmado» / «Listo para preparar»** al actualizar o mediante la consulta periódica mientras el carrito esté abierto.

El carrito se vacía únicamente cuando el backend confirma que registró el pedido. Se usan claves de idempotencia para evitar duplicados si se pierde la respuesta. El navegador conserva una cookie de compra de hasta siete días: el último pedido puede recuperarse abriendo el carrito en ese mismo navegador. Borrar cookies, cambiar de dispositivo o expirar la sesión impide ese seguimiento; no hay cuentas de cliente ni recuperación por código público en esta fase.

Nombre, teléfono, dirección y comprobante se guardan en el servidor, no en `localStorage`. El carrito sigue guardando solo IDs y cantidades. Los archivos y datos de otros compradores no pueden consultarse conociendo únicamente el código o ID del pedido.

### Entrega automática, sin cotizaciones

- **Correos de Costa Rica a todo el país: ₡2.800.**
- **Envío gratis cuando el subtotal de productos supera ₡15.000**, sin contar el propio envío. A exactamente ₡15.000 se cobran ₡2.800.
- La recogida conserva su costo cero.

Carrito y backend usan la misma política, definida en `src/config/store.ts` mediante `feeMinor: 280000` y `freeAboveMinor: 1500000` (céntimos enteros). El servidor calcula el total antes de pedir el pago; no hay campos administrativos de costo de entrega ni detalle de cotización. La franja superior anuncia ambas condiciones.

Los pedidos antiguos que seguían sin cotizar y sin comprobante se completan automáticamente con esta tarifa. **No se modifica el total ni el destino de los pedidos que ya recibieron instrucciones o enviaron un comprobante.**

## 4. Revisar y confirmar desde el dashboard

El panel incluye búsqueda por código/cliente, filtros de estado, contadores, paginación, datos de entrega, productos, código, comprobante y auditoría.

Para confirmar:

1. Abre **Revisar** en el pedido correspondiente.
2. Revisa el pedido, la imagen, su código y la referencia mostrada. Comprueba el abono por tu cuenta cuando corresponda: esta fase no conecta a BAC.
3. Pulsa **«Confirmar pedido»**. Listo: pasa a **«Listo para preparar»**.

No hay que reescribir código, monto o referencia, añadir notas ni marcar casillas para confirmar. Es una decisión manual del administrador, no una verificación automática de la imagen o del banco.

El servidor exige:

- Sesión administrativa válida y CSRF correcto.
- Un comprobante pendiente, su ID exacto y la versión vigente del pedido.
- Total, código y referencia obtenidos de los datos guardados en el servidor, no de campos editables al confirmar.
- Que esa referencia bancaria no haya confirmado ningún otro pedido.
- Registro automático de quién confirmó, cuándo y qué comprobante revisó, sin afirmar que el sistema consultó BAC.

Si el cliente escribió mal la referencia, solicita una corrección; no la reemplaces silenciosamente al aprobar. Si falta la descripción/correlación necesaria en el banco, no confirmes solo por monto.

Confirmación, referencia consumida, auditoría y evento se guardan en **una única transacción SQLite**. Repetir la misma confirmación no duplica el pago ni el evento. Una versión antigua no puede aprobar un comprobante nuevo.

**«Listo» significa listo para preparar, no listo para entregar.** Se registra `paymentVerification: 'manual'`. No se descuentan existencias, envían correos/SMS ni se procesan devoluciones automáticamente.

### Solicitar corrección

En el detalle, selecciona **«Solicitar corrección del comprobante»** e introduce el motivo. El comprador lo verá en el seguimiento y podrá volver a adjuntar. Se preservan archivos y auditoría anteriores, con un límite técnico de cinco cargas por pedido.

## 5. Qué se valida del comprobante

- Hasta **5 MB**; JPG, PNG, WebP o PDF.
- Imágenes decodificadas realmente con Sharp, límite de 20 megapíxeles, sin animación; se corrige orientación, reduce a máximo 2400 px por lado y se reencoda como WebP eliminando EXIF y metadatos.
- No se admiten SVG ni ejecutables. Se contrasta el formato real con el declarado.
- PDFs: comprobación básica de cabecera/cierre, almacenamiento privado y **descarga autenticada**, nunca incrustados o ejecutados por el servidor. Esto no es un análisis antimalware ni una validación completa de estructura/firma del PDF.
- Los nombres originales no se usan como rutas ni nombres de descarga.
- Una carga repetida con la misma clave y contenido no crea otra evidencia. Un archivo idéntico no puede adjuntarse a otro pedido.

**No hay OCR, validación de firma bancaria, antivirus ni prueba de autenticidad por imagen.** Validar el código escrito por el comprador solo lo vincula al pedido; no demuestra que ese código aparezca en el abono ni que ingresó dinero. La referencia única consumida se registra únicamente después de la revisión administrativa.

Los comprobantes viven como BLOB en SQLite, no en `public/`. Sus rutas requieren sesión del comprador propietario o del administrador. Se sirven con `no-store`, tipo de contenido fijo y protección `nosniff`; los PDFs además se entregan como adjuntos con CSP sandbox.

## 6. API y persistencia

Carpeta predeterminada: **`.data/store/`**, ignorada por Git y bloqueada por Vite. Incluye `orders.sqlite` y sus posibles archivos `-wal`/`-shm`. Protege el equipo y esa carpeta con permisos del sistema operativo y cifrado de disco; la base no está cifrada por la aplicación.

| Ruta | Acceso | Función |
| --- | --- | --- |
| `GET /api/checkout` | Público, crea/recupera cookie de compra | Configuración y CSRF del comprador. |
| `POST /api/orders` | Comprador + CSRF + Idempotency-Key | Registrar pedido con precios del servidor. |
| `GET /api/orders/current` | Comprador | Su último pedido. |
| `GET /api/orders/:id` | Comprador propietario | Seguimiento de su pedido. |
| `POST /api/orders/:id/receipt` | Propietario + CSRF | Comprobante multipart, código, referencia, versión y clave de carga. |
| `GET /api/orders/:id/receipts/:receiptId` | Propietario | Consultar su evidencia privada. |
| `GET /api/admin/session` | Público | Saber si hay configuración/sesión, sin datos de pedidos. |
| `POST /api/admin/setup` | Código privado de un solo uso | Crear el primer administrador. |
| `POST /api/admin/login`, `/logout` | Credenciales / sesión + CSRF | Acceso y revocación. |
| `GET /api/admin/orders` | Administrador | Buscar, filtrar y paginar. |
| `GET /api/admin/orders/:id` | Administrador | Detalle e historial. |
| `POST /api/admin/orders/:id/confirm`, `/reject` | Administrador + CSRF | Confirmar manualmente con `{ version, receiptId }` o pedir corrección. No existe cotización manual. |
| `GET /api/admin/orders/:id/receipts/:receiptId` | Administrador | Evidencia privada. |
| `GET` / `PUT /api/admin/settings` | Administrador; CSRF en PUT | Destino SINPE. |

No se acepta que React envíe un estado «pagado» o un total arbitrario. Se rechazan solicitudes de otros orígenes, hay límites de intentos y las sesiones están separadas por rol. No publicar la carpeta de datos ni sus copias de seguridad. Para un backup consistente usa la API de backup de SQLite o detén el proceso antes de copiar; no copies solo el archivo principal mientras haya escrituras/WAL activos.

### Variables opcionales

Ver `.env.store.example`; no contiene credenciales. `npm run dev`, `preview` y `store:api` cargan `.env.store.local` si existe. No reemplazar `.env.local`, que pertenece a las integraciones creativas.

- `STORE_DATA_DIR`: ubicación privada. No puede estar en `public/`, `dist/` ni ser la raíz del proyecto.
- `STORE_API_PORT`: puerto del proceso independiente, predeterminado 8788.
- `STORE_SECURE_COOKIES`: `false` únicamente para pruebas HTTP locales; `true` con HTTPS.
- `STORE_PUBLIC_ORIGIN`: origen HTTPS exacto del frontend comercial.

`npm.cmd run store:api` inicia solamente la API, enlazada a `127.0.0.1`. Un alojamiento real deberá servir el frontend y redirigir `/api/*` a ese proceso en el **mismo origen**, además de resolver `/admin` a `index.html`. Vite dev/preview son para desarrollo/comprobación, no servidores comerciales. **Publicar solo `dist/` ya no basta.**

## 7. Pruebas y límites antes de producción

```powershell
npm.cmd test
npm.cmd run test:store
npm.cmd run test:e2e
npm.cmd run build
```

Las pruebas de navegador levantan una instancia con puerto libre y base temporal propia dentro de `Temp/opencode/`. No usan tus credenciales, pedidos o archivos locales reales, no abren BAC y no envían dinero. Sus capturas y trazas quedan aisladas por ejecución en `test-results-sinpe/`; algunas pruebas visuales antiguas también escriben en `test-results/`.

Las comprobaciones de backend incluyen carga multipart real, aislamiento entre compradores, acceso administrativo, CSRF, saneamiento de imágenes, PDFs privados, códigos incorrectos, referencias duplicadas, versiones antiguas y persistencia después de reiniciar. Se verificó además que Vite responde **403** al intentar descargar el código de instalación o los módulos de `server/store/`.

Antes de recibir datos/pagos reales faltan confirmar catálogo, recogida y disponibilidad; desplegar HTTPS con secretos/permisos/backup; definir consentimiento, retención, borrado y recuperación de cuentas; añadir MFA, escaneo antimalware y límites de almacenamiento; y probar carga y respuesta a incidentes. La tarifa nacional por Correos ya está definida. Los límites de intentos actuales son locales al proceso, no distribuidos. No hay todavía gestión transaccional de stock ni avisos externos.

## 8. Siguiente fase: n8n y lectura de BAC

El evento `payment.review_requested` se guarda al adjuntar el comprobante, con pedido y versión, dentro de la misma transacción. Es la base para conectar después una cola y n8n. **No se ha enviado ningún webhook ni conectado ese evento a un navegador bancario.**

Se conserva el laboratorio anterior de `server/payments/` y `integrations/n8n/sinpe-local-demo.json`, aislado del checkout y con datos ficticios. No lo uses para confirmar estos pedidos: su token y `simulated_paid` no otorgan acceso al nuevo panel.

La automatización futura deberá obtener evidencia autorizada real, controlar sesión/MFA, evitar consultas paralelas y pasar por las mismas restricciones atómicas de monto/código/referencia. La revisión manual seguirá como alternativa ante sesión vencida, falta de correlación, errores o ambigüedad.
