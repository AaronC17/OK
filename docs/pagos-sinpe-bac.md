# SINPE Móvil + BAC personal + n8n

> **Documento de investigación y laboratorio anterior.** El checkout ya fue sustituido por SINPE con comprobantes privados y confirmación administrativa manual, sin WhatsApp. Su estado e instrucciones vigentes están en [`checkout-sinpe-admin.md`](checkout-sinpe-admin.md). Las secciones de implementación de este documento describen el laboratorio aislado, no el nuevo backend de pedidos. La conexión automática a BAC sigue pendiente.

**Investigación: 15 de octubre de 2026. Implementación: laboratorio local, NO habilitado para recibir o confirmar pagos reales.**

## 1. Resultado de la investigación

BAC sí publica soluciones para consultar movimientos y verificar SINPE. **Eso no equivale a acceso API para una cuenta personal.** Son vías comerciales diferentes:

| Vía | Evidencia oficial | Consecuencia para Onky’s |
| --- | --- | --- |
| APIs BAC / Tesorería Corporativa Digital (TCD) | Anuncia saldos, movimientos, conciliación y notificaciones. Los términos publicados, sección II, p. 3, dicen: «El Servicio es ofrecido por el Banco únicamente a personas jurídicas». | La contratación publicada no encaja con una cuenta personal ordinaria. Preguntar por condiciones actuales y productos distintos para persona física; no asumir una excepción. |
| BAC Simple Pay | La página comercial exige cuenta BAC activa y número SINPE vinculado. Describe Lite y un portal donde se digitan/validan pagos manualmente. | El portal puede ser útil, pero no equivale a una integración automática con la tienda. |
| Simple Pay e integración API | El contrato **Lite de septiembre de 2026**, cláusula 1.1, menciona APIs «según los módulos disponibles»; la 5.1.4 menciona «interfaces o API’s». Pero las cláusulas 3.1, 4.1 y el anexo de la p. 9 describen **Lite por navegador web**. | Existe referencia contractual a APIs, pero no prueba que Lite incluya API, ni que se ofrezca a cuentas personales. Solicitar módulo y contrato concretos. |
| BAC API Center | Registro, aplicaciones y planes, algunos sujetos a aprobación. El catálogo anónimo consultado no mostró productos. | Registrarse no autoriza consultar tu cuenta. No se verificaron públicamente endpoint, esquema ni autenticación del producto que contratarías. |
| Correo/SMS bancario | No se confirmó una interfaz de conciliación autorizada para tu cuenta por esta vía. | Una alerta puede abrir una revisión, no aprobar automáticamente. |

El contrato Lite publicado indica **USD 10 mensuales más IVA**, cláusula 9, p. 5. **No es una cotización de acceso API** ni confirma elegibilidad; verificar vigencia con BAC. Tiene campos de razón social, cédula jurídica y representante: tampoco demuestra aceptación de persona física.

El adendum de APIs de TCD, p. 16, enumera ERP, suscripción al API Center y servicios de planillas/proveedores/transferencias internacionales como prerrequisitos. Preguntar cuáles aplican a **consulta de solo lectura**; no contratar servicios de salida de fondos innecesariamente.

**Recomendación:** consultar primero **Simple Pay con módulo API para persona física/comerciante**. Si BAC solo ofrece Lite web o exige otro producto/estructura, mantener revisión manual o evaluar otro servicio autorizado. No prometer automatización total con la cuenta personal actual.

### Fuentes oficiales

1. [APIs BAC / Tesorería](https://www.baccredomatic.com/empresas/api-tesoreria-corporativa-digital).
2. [Términos TCD v1.2, archivo publicado en noviembre de 2024](https://www.baccredomatic.com/sites/default/files/2024-11/Te%CC%81rminos%20y%20Condiciones%20-%20Tesoreri%CC%81a%20Corporativa%20Digital%20-%20v.1.2.pdf): cliente, pp. 1–2; personas jurídicas, p. 3; APIs, pp. 16–17; estados de cuenta, p. 19. Es la versión pública localizada, no una garantía de que sea la que BAC te proponga hoy.
3. [BAC Simple Pay](https://www.baccredomatic.com/es-cr/pymes/herramientas-soluciones/simple-pay).
4. [Contrato BAC Simple Pay Lite, septiembre de 2026](https://www.baccredomatic.com/sites/default/files/2026-09/cr_contrato_servicio_medio_pago_simple_pay_v2_sept_2026.pdf): APIs, pp. 1 y 3; modalidad web, pp. 2 y 9; privacidad y precio, p. 5.
5. [API Center](https://developers.baccredomatic.com/), [catálogo](https://developers.baccredomatic.com/product) y [soporte/planes](https://developers.baccredomatic.com/support).
6. [Solicitud oficial de Simple Pay](https://www.baccredomatic.com/es-cr/pymes/medios-de-pago/simple-pay/solicitud) y [asesoría de APIs](https://www.baccredomatic.com/empresas/solicitud-api-tesoreria/solicitud).
7. n8n: [HTTP Request, autenticación y paginación](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/), [reintentos](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/common-issues/), [cifrado de credenciales](https://docs.n8n.io/deploy/host-n8n/configure-n8n/basic-configuration/configuration-examples/set-a-custom-encryption-key).

No se registraron cuentas, enviaron solicitudes comerciales ni contrataron servicios. No se accedió a banca personal.

## 2. Consulta lista para enviar a BAC

Usa los formularios oficiales anteriores. El contrato Simple Pay también identifica `conectividadcorporativo@baccredomatic.cr` e `infoconectividad@baccredomatic.cr`; confirma el canal en el sitio del banco antes de compartir documentación privada.

> **Asunto: Validación SINPE Móvil por API para comercio de persona física**
>
> Tengo una cuenta personal BAC Costa Rica y un pequeño comercio llamado Onky’s. Deseo verificar abonos SINPE Móvil de mi propia tienda mediante backend TypeScript y n8n, sin compartir credenciales de banca en línea ni iniciar transferencias.
>
> 1. ¿Una persona física con mi tipo de cuenta puede contratar Simple Pay con **API de consulta**, no solamente Lite/portal web? ¿Requiere actividad comercial registrada, cambio de producto de cuenta o persona jurídica?
> 2. El contrato Lite menciona APIs en las cláusulas 1.1 y 5.1.4, pero describe acceso por navegador. ¿Qué modalidad incluye realmente la API y cuáles son sus requisitos, tarifas, límites y plazo de habilitación?
> 3. ¿Permite consultar abonos recibidos desde **todos los bancos participantes de SINPE Móvil**, en la cuenta y número autorizados?
> 4. ¿Devuelve ID bancario estable y único, referencia SINPE, monto, moneda, cuenta destino, descripción completa del pagador, fecha/hora con zona y estado definitivo? ¿Qué campos se conservan entre bancos y cuáles pueden faltar o truncarse?
> 5. Si no devuelve el código de pedido en la descripción, ¿existe un mecanismo autorizado de correlación inequívoca entre un cobro del comercio y el abono?
> 6. ¿Ofrecen sandbox, OpenAPI, ejemplos anonimizados y credenciales de **solo lectura**? ¿Qué autenticación, certificados, consentimiento e IPs autorizadas requieren?
> 7. ¿Hay webhooks firmados? ¿Qué garantías hay de latencia, paginación, historial, duplicados, pendientes, reversos y disponibilidad?
> 8. ¿Se permite backend propio y n8n? ¿Qué restricciones aplican a almacenar referencias, descripciones, datos de pagadores y usar alojamiento externo?
>
> Solicito confirmación escrita de elegibilidad y documentación del producto aplicable. No necesito APIs de pagos salientes ni acceso mediante usuario, contraseña u OTP de banca personal.

**No enviar contraseñas, OTP, números completos de cuenta ni claves API a este chat.** Para continuar bastan elegibilidad, documentación y ejemplos anonimizados. Las credenciales se configurarían directamente en el servidor autorizado.

## 3. Qué está implementado y qué falta

### Implementado

- `server/payments/`: backend TypeScript local, SQLite persistente y pedidos de demostración.
- Precios recalculados desde `src/config/store.ts`; no acepta totales, precios ni estados del cliente.
- Bloqueo de pedidos cuyo costo de entrega sigue desconocido.
- Creación idempotente y restricciones SQL que impiden asignar una transacción a dos pedidos.
- Coincidencia estricta de código, monto, moneda, cuenta, dirección, estado y fecha.
- Reintentos persistentes, revisión, auditoría y eventos guardados en una misma transacción.
- Tokens separados: administración de la demo y ejecución de conciliaciones por n8n.
- `integrations/n8n/sinpe-local-demo.json`: plantilla importable, desactivada y sin secretos.
- Pruebas de motor, HTTP, persistencia, duplicados, rollback y guardas del workflow.

### Límites intencionales

- **Sin adaptador BAC ni endpoints bancarios inventados.** Solo admite `disabled` y `mock`. `NODE_ENV=production` está bloqueado.
- El único resultado exitoso es **`simulated_paid`**. SQLite rechaza `paid`; el evento permitido es `payment.simulated`.
- Escucha exclusivamente en `127.0.0.1`, sin CORS ni acceso desde el navegador. **No publicarlo ni exponerlo con túneles/reverse proxy.**
- No se modificó el checkout de WhatsApp ni se habilitó SINPE en la web. El catálogo sigue siendo de ejemplo y el envío a domicilio no tiene tarifa definitiva.
- No guarda clientes, teléfonos de pagadores, cédulas, comprobantes ni credenciales BAC. La cuenta se identifica con un alias ficticio.
- Faltan dashboard gráfico, aprobación manual real, reserva de inventario, comprobantes y notificaciones. Los endpoints de consulta inspeccionan la **demo**, no sustituyen esos módulos.
- No se instaló/ejecutó n8n. El JSON y su código tienen pruebas locales; la importación y ejecución en tu instancia requieren configuración y validación allí.

El WhatsApp de la tienda **no se ha supuesto como número SINPE**. Número receptor y nombre exacto del beneficiario deben confirmarse antes de mostrar instrucciones reales.

### Verificación de esta entrega

- `npm.cmd test`: **62 pruebas correctas**, incluidas las existentes y el arranque del backend + script de demo en procesos reales con datos temporales aislados.
- `npm.cmd run build`: correcto. El frontend no incorpora módulos ni credenciales del backend.
- Acceso HTTP de Vite a `/server/payments/index.ts` y `/.env.payments.example`: **403**.
- La suite completa de navegador se intentó, presentó fallos y superó 120 segundos; **no está en verde**. Se reprodujo por separado `tests/store.spec.ts:36`: espera un radio «Mixto» que el configurador actual ya no muestra. También hay expectativas visuales por revisar. No se modificaron componentes ni pruebas existentes para ocultar estos fallos.
- No se validó una conexión bancaria ni una ejecución dentro de n8n: requieren acceso autorizado e instancia configurada, respectivamente.

## 4. Demostración segura en Windows

Requiere Node.js 22.18+ o 24 LTS y las dependencias existentes (`npm.cmd install` si faltan). No requiere paquetes bancarios, PostgreSQL, n8n ni dinero real.

### A. Variables separadas

En PowerShell, dentro del proyecto:

```powershell
if (!(Test-Path '.env.payments.local')) {
  Copy-Item '.env.payments.example' '.env.payments.local'
}
node -e "const {randomBytes}=require('node:crypto'); for (const key of ['PAYMENTS_ADMIN_TOKEN','PAYMENTS_RECONCILE_TOKEN']) console.log(key+'='+randomBytes(32).toString('base64url'))"
notepad .env.payments.local
```

Copia cada token generado en su variable correspondiente, sin compartirlos. Para probar, cambia `PAYMENTS_MODE=disabled` por `PAYMENTS_MODE=mock`. No modificar `.env.local`, que pertenece a otros módulos. `.env.payments.local` está ignorado por Git y bloqueado por Vite.

El modo predeterminado `disabled` crea solo pedidos `manual_review / bank_not_configured`, rechaza movimientos ficticios y no genera confirmaciones.

### B. Ejecutar el ciclo ficticio

Terminal 1:

```powershell
npm.cmd run payments:dev
```

`http://127.0.0.1:8787/health` debe indicar `demoOnly: true` y `productionReady: false`.

Terminal 2:

```powershell
npm.cmd run payments:demo
```

Con el catálogo actual crea **₡8.500**: Ositos 500 g + Ositos 100 g + Mixto 200 g, recogida sin costo de ejemplo. El servidor calcula el total; cambiará si cambia el catálogo.

El script introduce un movimiento **ficticio**, repite su recepción y ejecuta dos conciliaciones. Comprueba un solo evento y muestra `simulated_paid`. **No es un pago recibido.**

La base persiste en `.data/payments-demo.sqlite`, con archivos WAL asociados; está ignorada por Git y bloqueada en Vite. Cada ejecución del script crea un pedido nuevo. Una redelivery del mismo pedido conserva su identidad con `Idempotency-Key`.

### C. Pruebas e inspección

```powershell
npm.cmd run test:payments
npm.cmd test
npm.cmd run build
```

| Método/ruta internos y locales | Credencial | Función |
| --- | --- | --- |
| `GET /health` | Ninguna | Estado explícitamente no comercial. |
| `POST /internal/orders` | Admin | Crear demo con `{ items, deliveryId }` y header `Idempotency-Key`. |
| `GET /internal/orders` | Admin | Últimos 100 pedidos de demo. |
| `GET /internal/orders/:id` | Admin | Estado del pedido. |
| `GET /internal/orders/:id/audit` | Admin | Auditoría de intentos. |
| `POST /internal/mock/movements` | Admin, solo `mock` | Introducir transacción **ficticia** normalizada. |
| `POST /internal/reconciliation/run` | Conciliación | Hasta 50 pedidos cuyo próximo intento ya corresponde; cuerpo obligatorio `{}`. |
| `GET /internal/events` | Admin | Primeros 100 eventos de simulación; no envía avisos. |

Header: `Authorization: Bearer <token del rol>`. El token n8n no lee pedidos, crea movimientos ni modifica estados. Admin no sustituye la credencial de conciliación. No existe `confirm-payment` o `mark-paid`.

Los listados limitados son herramientas de demo, no paginación comercial. El historial completo permanece en SQLite.

## 5. Configurar n8n

La plantilla es para **n8n nativo en el mismo equipo** que el backend:

```text
Manual / cada minuto → URL local → HTTP POST: ejecutar conciliación
  → Code: exigir demo y validar contadores
  → IF: ¿hay revisiones o conflictos? → revisión de demo / fin de simulación
```

1. Importar `integrations/n8n/sinpe-local-demo.json` en una instancia actualizada; **mantener sin activar/publicar** mientras configuras.
2. Crear credencial **Header Auth**: Name `Authorization`; Value `Bearer ` seguido del `PAYMENTS_RECONCILE_TOKEN` local.
3. Seleccionarla en **«Conciliar en backend - DEMO»**. No pegar secretos en Set, Code, URL ni JSON exportado.
4. Mantener `backendBaseUrl` en `http://127.0.0.1:8787` y el backend activo. Deshabilitar seguimiento de redirecciones en el nodo HTTP. No deshabilitar validación TLS en futuras conexiones HTTPS.
5. En una terminal ejecutar `npm.cmd run payments:demo -- --prepare-only`: deja un nuevo pedido y movimiento ficticios pendientes, sin conciliarlos. Después ejecutar **«Prueba manual»** en n8n: debe mostrar una simulación, nunca un pago real. Si un programador ya procesó ese pedido, cero casos nuevos es correcto.
6. Para probar el programador, activar únicamente esta demo. Corre cada minuto; el backend decide qué pedidos ya requieren otro intento.

**n8n Cloud no accede al `127.0.0.1` de tu PC. En Docker, localhost es el contenedor.** No resolverlo exponiendo esta demo a Internet. Definir antes un despliegue privado con HTTPS, autenticación y gestión de secretos para una versión preparada para producción. La red Docker no está configurada aquí.

HTTP hace hasta tres intentos ante fallos técnicos, distintos de los intentos de pago guardados en base. Repetir el workflow no adelanta el siguiente intento ni duplica eventos.

La plantilla desactiva la conservación de datos de ejecuciones exitosas/fallidas/manuales. Verificar también logs y retención de la instancia. En self-hosted proteger y respaldar la clave de cifrado y credenciales; habilitar acceso mínimo/MFA. Nunca cargar claves de banca personal.

## 6. Reglas de conciliación

Importes en **céntimos enteros de CRC**: `850000` = **₡8.500**. Un adaptador futuro no debe usar `parseFloat`, redondeos permisivos ni tolerancias.

La coincidencia exige simultáneamente:

1. Pedido vigente, total positivo, CRC y código único generado por servidor.
2. Cuenta receptora esperada y **crédito contabilizado**, no débito, pendiente ni reversado.
3. Monto y moneda exactos.
4. Descripción bancaria con **un solo código completo y aislado**, como `ONK-0123456789ABCDEF`; no una subcadena o solo un monto.
5. ID estable y referencia bancaria no vacíos. Es el ID bancario, no una captura, lo que identifica el movimiento consumido.
6. Fecha UTC válida entre creación y expiración, nunca futura. Expiración es un límite exclusivo.
7. Un único candidato, sin identidad asignada antes ni datos conflictivos.

La referencia que teclee el comprador no demuestra que un abono le pertenezca. Ni esa referencia ni una captura autorizan aprobar por monto si falta correlación bancaria inequívoca. Esta fase no recoge esos datos.

**Si BAC no devuelve el código completo o una correlación de cobro equivalente y autorizada, no habilitar confirmación automática.** La descripción puede truncarse o no conservarse entre bancos. No relajar reglas para «hacerlo funcionar».

- No encontrado: reintentos tras **1, 2, 4, 8 y hasta 15 minutos**, limitados por la ventana de 30 minutos; hasta seis consultas por pedido.
- Monto incorrecto, varios movimientos/pedidos, identidad reutilizada o conflicto: `manual_review` inmediato.
- Descripción ausente, cuenta/moneda equivocada, débito, pendiente o reverso: no se acepta; esperar evidencia válida y pasar a revisión al vencer.
- Abono visible después de vencer: revisión, incluso si fue realizado antes. No descartarlo ni devolver automáticamente.
- Snapshots idénticos del mismo ID: deduplicados. Datos distintos con el mismo ID: conservar primeros y marcar conflicto. Si ya estaba simulado, volver a revisión sin liberar su identidad.
- Un pedido en revisión no se autoaprueba con un movimiento posterior. La aprobación manual real no está implementada.

La política de snapshots es conservadora. Un conector comercial debe manejar cambios legítimos `pending → posted`, actualizaciones y reversos según el banco, sin convertir cambios de identidad en nuevos pagos.

SQLite usa `BEGIN IMMEDIATE`, unicidad `(cuenta, ID de movimiento)` y un pago por pedido. Asignación, estado, auditoría y evento se escriben en un solo commit. Las pruebas fuerzan un fallo al insertar el evento y verifican rollback de todo.

## 7. Arquitectura comercial, después de autorización

```text
React → backend: precio vigente + entrega cotizada + reserva de stock
  → pedido pendiente: total inmutable + código + vencimiento + destino confirmado
  → evento persistido / webhook autenticado a n8n

n8n: webhook + programador de recuperación
  → backend privado: procesar pendientes
      → adaptador BAC autorizado de solo lectura
      → evidencia normalizada completa
      → conciliación y asignación atómicas
      → outbox de confirmación real / revisión

Consumidores idempotentes → inventario/fulfillment → avisos tras commit
Dashboard autenticado → excepciones y revisión auditada
```

**Cambio intencional respecto a decidir `paid` en un Code node:** n8n orquesta; backend obtiene evidencia bancaria y realiza la operación financiera atómica. Nunca aprobar por `{ paid: true }` recibido de un workflow, navegador o comprobante. Si BAC se consulta desde n8n, backend debe verificar independientemente la evidencia autorizada o firma bancaria, no confiar en JSON libre.

### Adaptador BAC real

- Implementar endpoints/autenticación exactos entregados por BAC. No se ha supuesto OAuth, mTLS ni headers propietarios.
- Autorizar cuenta/número y scopes mínimos de consulta; no dar permiso de transferir si no hace falta.
- Confirmar ámbito de unicidad del ID. En producción incluir proveedor y entorno, además de cuenta e ID, y separar físicamente sandbox/live.
- Mapear fechas desde la zona documentada a UTC, sin interpretar una hora costarricense como UTC.
- Obtener **todas las páginas** del rango, con solapamiento para abonos tardíos y deduplicación. No decidir sobre primera página, respuesta parcial, antigua o inválida.
- Consultar fuera de transacciones de escritura prolongadas; después bloquear/releer pedido y revalidar antes de asignar.
- Webhooks bancarios: firma, cuerpo original, fecha y anti-replay según documentación oficial, y confirmación adicional cuando corresponda. No inventar firmas de BAC.
- `401/403`: detener conector y alertar; no recurrir a banca web. `429`: respetar límites/`Retry-After`; `5xx/timeout`: backoff con jitter, límites y revisión. Timeout no equivale a ausencia de pago.
- Acordar qué datos se pueden guardar. No persistir respuestas bancarias completas por comodidad.

### Pedidos, frontend y operación

- Confirmar precios reales antes de retirar `demo: true`; cotizar entrega **antes** de cobrar.
- Confirmar número SINPE y beneficiario; no inferirlos de WhatsApp.
- Crear pedidos en servidor con idempotencia y total congelado. Autorizar seguimiento con token de alta entropía, no solamente un ID visible; evitar enumeración de clientes.
- Mostrar monto, código y vencimiento; permanecer **pendiente** hasta confirmación del backend. No permitir `paid` desde React.
- Reservar stock antes del cobro, con vencimiento y liberación/consumo idempotentes. Definir pagos tardíos o sin stock.
- Comprobante opcional solo para revisión: almacenamiento privado, límites, validación de contenido, escaneo, URLs temporales y borrado. No exigirlo si la fuente verifica inequívocamente el abono.
- Diseñar base comercial administrada, por ejemplo PostgreSQL, con transacciones/bloqueos, restricciones, migraciones, backups y restauración probada. SQLite aquí es un laboratorio.
- Revalidar pedido, pago y stock al confirmar. No sumar pagos parciales/excesos sin política explícita.
- Dashboard con autenticación/MFA, roles y motivos obligatorios; distinguir aprobación automática/manual. Revisión exige fuente bancaria autorizada, no solo imagen; no puede evadir unicidad.
- Auditoría de solo anexado con acceso mínimo y evidencia necesaria. `payment.confirmed` solo para evidencia real verificada y comprometida. **La demo no puede promoverse a live cambiando una variable.**
- Outbox y consumidores idempotentes para inventario/avisos. Los proveedores pueden repetir o fallar; deduplicar y supervisar, no prometer entrega «exactamente una vez» de WhatsApp/correo.
- Contratar proveedor de correo o WhatsApp Business Platform antes de automatizar mensajes. El enlace `wa.me` actual no es esa integración.
- Alertar por fuente desactualizada, fallos, conflictos y abonos sin pedido. Conciliar periódicamente contra estados oficiales y tratar reversos posteriores de forma operativa/contable.
- No hacer devoluciones automáticas con permisos de solo lectura. El contrato Simple Pay atribuye su gestión al comercio.

### Seguridad y privacidad

- Servicios privados con HTTPS y autenticación robusta. Webhook de pedidos con autenticación, expiración/anti-replay e idempotencia; no es prueba de pago.
- Secretos en gestor del servidor o credenciales cifradas, nunca `VITE_*`, React, `localStorage`, exports o logs. Rotación y permisos mínimos.
- No iniciar sesión mediante robots, eludir MFA, guardar OTP ni compartir la contraseña de banca personal.
- Separar datos de entrega de datos bancarios y minimizar retención. Simple Pay, cláusula 8, restringe almacenar teléfonos, cédulas y datos sensibles proporcionados para validar pagos: aclarar alcance por escrito con BAC.
- Revisar privacidad, consentimiento, proveedores externos y normativa costarricense antes de recopilar datos personales/comprobantes.
- Probar recuperación e incidentes; no anunciar «tiempo real» hasta medir la latencia del producto contratado.

## 8. Orden del proceso y requisitos de activación

1. **Ahora:** consultar a BAC y decidir dónde correrá n8n. Se puede probar la demo sin contratar nada.
2. **Viabilidad:** confirmación escrita de persona física/cuenta y módulo API. Si no existe, detener automatización y definir revisión autorizada o cambiar producto/proveedor.
3. **Sandbox:** adaptador con documentación real y pruebas de contrato; verificar campos, bancos de origen, IDs, estados, límites y paginación.
4. **Comercio:** precios/envíos, stock, checkout seguro, dashboard, privacidad y avisos.
5. **Preproducción:** credenciales mínimas y base separada; probar duplicados concurrentes, descripción ausente, centavos, abonos viejos/dobles, cortes, paginación incompleta, reversos y eventos repetidos.
6. **Piloto supervisado:** solo con autorización y condiciones comerciales confirmadas. Pruebas con dinero real necesitan aprobación explícita; no se hicieron aquí.
7. **Activación:** conciliación final validada, recuperación, alertas y procedimientos manuales/devoluciones. No habilitar si depende solo del monto o de una captura.

**Para continuar:** confirmar si ya tienes n8n y si será Cloud, tu equipo o VPS; traer elegibilidad de BAC sin secretos. Hasta entonces la tienda conserva WhatsApp y no muestra instrucciones de pago no autorizadas.
