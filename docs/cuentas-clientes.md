# Cuentas de clientes

## Experiencia

- Acceso desde el icono de usuario del encabezado y desde el pie de página.
- Registro e inicio de sesión en un diálogo adaptable, con el papel, morado y lavanda de la tienda. Etiquetas visibles, validación, mostrar/ocultar contraseña, teclado, Escape y devolución del foco.
- Sin sesión iniciada, la franja bajo la portada muestra **«Obtén un 10% de descuento al registrarte»** y abre el registro al pulsarla. Con sesión iniciada conserva la franja animada original y sus ositos. La comprobación inicial reserva su altura para evitar saltos.
- **Mi cuenta** muestra el nombre, correo, beneficio disponible e historial privado paginado. Cada pedido abre el seguimiento y comprobante existentes, sin vaciar un carrito pendiente.
- El checkout autocompleta nombre y correo. La compra como invitado sigue disponible.
- **Continuar al pago** solo prepara las instrucciones SINPE. Volver atrás conserva datos, entrega y productos editables; **Cancelar pedido** vacía el carrito sin crear un pedido pendiente. El pedido aparece en el historial al enviar el comprobante y pasa a pagado tras verificar el abono.
- `/admin` → **Clientes** lista cuentas, fecha de registro, uso del beneficio y número de pedidos. Se puede buscar por nombre/correo y filtrar pedidos por ID de cuenta; nunca por coincidencias de correo.

## Regla del 10%

1. Cada cuenta obtiene una bienvenida del 10%, calculada por el servidor sobre el subtotal de productos en céntimos enteros de CRC y redondeada al céntimo más cercano.
2. Se muestra automáticamente en los pedidos autenticados mientras esté disponible. **Se consume al enviar correctamente el primer comprobante con descuento**, no al abrir la pantalla de pago ni al seleccionar el archivo. Volver atrás o «Cancelar pedido» conserva el beneficio hasta ese envío. Una confirmación manual de un pedido anterior también lo consume si no se había enviado comprobante.
3. El envío no recibe descuento. Su tarifa y umbral de envío gratis siguen calculándose sobre el subtotal de productos antes del descuento, conservando las reglas existentes.
4. Los pedidos previos no se recalculan. Reintentar la misma solicitud devuelve el mismo pedido y descuento. Solo uno puede consumir la bienvenida: si ya se envió el comprobante de otro pedido con descuento, un borrador anterior debe reemplazarse por un pedido con el total vigente. Las correcciones de comprobante conservan el descuento del pedido que lo consumió.
5. Pedido, comprobante y consumo del beneficio se guardan en una misma transacción. Si falla la carga o su registro, no queda un pedido nuevo y el beneficio sigue disponible. Las instrucciones son una instantánea firmada por el servidor y vinculada al comprador; no se acepta alterar el descuento, ID de cliente o estado pagado en el formulario.
6. El desglose se muestra en carrito, seguimiento, detalle administrativo y correos de pedido existentes.
7. Las reservas creadas por versiones anteriores solo cuentan como usadas si tienen comprobante enviado o pago confirmado. Las cuentas con pedidos abandonados recuperan automáticamente la disponibilidad, también en MongoDB.

El beneficio se limita **por cuenta**, no por persona o domicilio. Sin verificación de correo no debe presentarse como un sistema antifraude contra múltiples registros.

## Persistencia y privacidad

- Funciona con el repositorio SQLite local y con MongoDB. Las migraciones SQLite son aditivas; no borran pedidos, comprobantes ni credenciales administrativas. Los documentos Mongo antiguos se leen con descuento cero y sin cuenta asociada.
- Contraseñas de 12–128 caracteres, con sal aleatoria y **scrypt asíncrono**. Se respetan los espacios. Ni la contraseña ni su hash se envían en respuestas de cuenta, directorio o pedidos.
- Sesión de siete días en cookie `HttpOnly`, `SameSite=Strict`, limitada a `/api`; `Secure` en producción. Registro/login rotan cookie y CSRF e invalidan la sesión anónima anterior. Salir invalida esa sesión y crea una nueva de invitado sin acceso al historial de la cuenta.
- El nombre, correo, contraseña e historial no se guardan en `localStorage` ni `sessionStorage`. El carrito existente sigue conservando únicamente variantes y cantidades.
- Al registrarse o entrar, solo se vinculan los pedidos de la sesión anónima actual. **Nunca se reclaman pedidos por compartir correo electrónico.** Las cuentas usan un propietario estable por ID para recuperar pedidos desde otros dispositivos.
- Consentimiento explícito de registro, con fecha y versión guardadas. Es independiente del consentimiento del checkout; no implica autorización de marketing.
- No hay altas públicas de administradores ni equivalencia entre una cuenta de cliente y un acceso administrativo.
- Comprobación de origen, CSRF en registro/login/logout, respuestas de login genéricas y límites de intentos por IP y correo. El estado de cuenta se actualiza al recuperar foco y entre pestañas, sin compartir credenciales por el canal de notificaciones.

## API

| Método y ruta | Acceso |
| --- | --- |
| `GET /api/account/session` | Crea/recupera sesión de compra y devuelve usuario público o `null`, con CSRF |
| `POST /api/account/register` | Sesión de invitado + CSRF; nombre, correo, contraseña y consentimiento |
| `POST /api/account/login` | Sesión de invitado + CSRF; correo y contraseña |
| `POST /api/account/logout` | Sesión de compra + CSRF |
| `GET /api/account/orders?page=1` | Cliente autenticado, solo sus pedidos |
| `GET /api/admin/customers?q=&page=1` | Administración autenticada |
| `GET /api/admin/orders?customerId=…` | Administración autenticada, filtro por ID de cuenta |

`GET /api/checkout` incluye también el usuario público en `account`, para compartir la inicialización y el CSRF entre cuenta y carrito. Los clientes anteriores siguen pudiendo ignorar ese campo.

## Comprobaciones y pendientes de publicación

Las pruebas de cuentas cubren registro, consentimiento, contraseñas, sesión, CSRF, separación entre compradores, historial entre dispositivos, descuento único, reintentos, concurrencia y rollback. Playwright comprueba registro/login, diseño móvil, accesibilidad, compra con descuento y administración usando SQLite temporal aislado y sin SMTP ni MongoDB reales.

Antes de una publicación comercial, completar recuperación de contraseña y verificación de correo; definir atención para cambios/eliminación de datos y publicar las condiciones de la promoción y privacidad. El envío de correos de pedidos existente no implementa por sí solo recuperación ni verificación de cuenta. Reemplazar los límites de intentos en memoria por un control compartido/persistente para despliegues con varias instancias y revisar la IP de cliente en el proxy de producción. Requiere HTTPS y las mismas precauciones de despliegue del checkout.
