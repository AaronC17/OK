# Onky’s — Pequeños momentos, a tu manera

Tienda de gomitas enchiladas con carrito, checkout SINPE Móvil, comprobantes privados y dashboard administrativo para confirmar pagos manualmente. WhatsApp dejó de ser una opción. React + TypeScript + Vite + backend Node/SQLite. El módulo de postres permanece oculto hasta confirmar catálogo y fotografías.

## Ejecutar

Requisito: Node.js 22.18+ o 24 LTS.

```sh
npm install
npm run dev
```

Abrir **http://localhost:5173**. En Windows PowerShell, usar `npm.cmd` si la política de scripts bloquea `npm.ps1`:

```powershell
npm.cmd install
npm.cmd run dev
```

Administración: **http://localhost:5173/admin**. El backend arranca junto con la tienda. En el primer inicio, leer el código privado de instalación con `Get-Content '.data/store/admin-setup-token.txt'` y crear tu propio usuario/contraseña. Luego configurar número SINPE y beneficiario desde el panel. **No existe una contraseña predeterminada y no se asumió ningún número receptor.** Guía: **[`docs/checkout-sinpe-admin.md`](docs/checkout-sinpe-admin.md)**.

### Producción

```sh
npm run build
npm run preview
```

El frontend se compila en `dist/`, pero **publicar solo esa carpeta ya no basta**: los pedidos y comprobantes necesitan el backend. `preview` comprueba localmente frontend + API; no es un servidor comercial. Para despliegue se requiere HTTPS y `/api/*` hacia el backend del mismo origen, además de resolver `/admin` a la aplicación. Ver la guía de checkout y sus pendientes de seguridad/privacidad.

## Datos confirmados y demostración

- El flujo de WhatsApp fue retirado. El número SINPE y beneficiario se configuran explícitamente desde administración.
- Moneda: **colón costarricense, CRC**, símbolo **₡**.
- Bolsas: **100, 200 y 500 g**, según la última indicación del usuario.
- Se permite **un solo tipo** o **mixto**, eligiendo dos o tres tipos.
- Nombre utilizado: **Onky’s**, tomado originalmente de la carpeta.

`demo: true` señala que **nombres de productos, disponibilidad, recetas de postres, presentaciones, precios y métodos de entrega son ejemplos**. Las fotografías son de referencia. No se hizo una conversión de los antiguos precios de muestra: las nuevas tablas en colones también son provisionales.

## Cambiar los datos del negocio

Editar **`src/config/store.ts`**. Toda la información comercial se encuentra allí; no es necesario cambiar los componentes.

| Dato | Configuración |
| --- | --- |
| Nombre | `name` |
| Avisos de demostración | `demo` |
| Activar postres más adelante | `categories.dessertsEnabled` |
| Ocultar tipos de gomita del catálogo | `visible: false` en cada tipo (`tiritas`, `gusanitos`) |
| Moneda y formato | `currency.code`, `locale`, `fractionDigits` |
| SINPE receptor y beneficiario | Dashboard `/admin` → Configuración; no usar un teléfono inferido |
| Contactos adicionales | `contact.email`, `instagramUrl` |
| Portada | `heroImage`, `heroImageAlt` |
| Tipos de gomita | `gummies.types` |
| Mezclas y precios | `gummies.mixes` |
| Postres y presentaciones | `desserts` |
| Envíos y recogida | `deliveryMethods` |

### Precios sin errores de redondeo

Los precios se almacenan en **céntimos enteros**. Con `fractionDigits: 2`:

```ts
prices: { 100: 120000, 200: 220000, 500: 480000 }
// ₡1.200, ₡2.200 y ₡4.800, respectivamente.
```

Cada peso tiene un importe independiente. Los cálculos de líneas, subtotal y entrega utilizan exclusivamente enteros. El formato `es-CR` muestra el símbolo ₡, separa miles y conserva decimales cuando existen; el mensaje indica además `Moneda: CRC`. `null` significa **precio pendiente** y bloquea esa variante; no se interpreta como gratis.

### Gomitas y mezclas

En cada `gummies.types` se editan `name`, `coatingLabel`, `description`, `image`, `imageAlt`, `imagePosition`, `available`, `visible` y la tabla `prices`. `variantImages` permite una foto por peso. Con `visible: false`, la tarjeta no aparece en el catálogo, pero el tipo sigue disponible como ingrediente del Mixto; para reactivarlo basta quitar esa opción.

`gummies.mixes.enabled` muestra el artículo **Mixto**, que siempre combina todos los tipos disponibles: su configurador no ofrece selector de modo ni elección de tipos, solo gramos y cantidad. La foto del Mixto es la del paquete mixto (`heroImage`). El catálogo incluye además las cuatro combinaciones posibles de dos o tres tipos, cada una con su propia tabla de precios. Ejemplo:

```ts
{
  typeIds: ['ositos', 'gusanitos'],
  prices: { 100: 140000, 200: 250000, 500: 550000 },
  image: '/images/bolsa-mix.webp',
}
```

- El peso es el **total por bolsa**, no el peso de cada ingrediente.
- Las proporciones están pendientes de definición; el cliente puede pedirlas en observaciones y coordinarlas con la tienda.
- No se calculan suplementos ni se deducen precios de los tipos individuales.
- Una mezcla sin tabla o con ingredientes no disponibles no puede añadirse.
- Si cambian los IDs de los tipos, actualizar también los IDs de las mezclas.

Las tres presentaciones actuales están tipadas en `src/types.ts` (`Weight`) y configuradas en `gummies.weights`. Un cambio futuro de presentaciones requiere ajustar ambos y sus tablas de precio.

### Postres

Por ahora `categories.dessertsEnabled: false`: la categoría no aparece en la portada, el menú ni el catálogo; las variantes antiguas de postres se retiran del carrito guardado con un aviso y no se incluyen en pedidos. No se borraron sus datos de ejemplo. Cuando la tienda decida ofrecerlos, confirmar primero productos, fotos, disponibilidad y precios, y cambiar `categories.dessertsEnabled` a `true` en `src/config/store.ts`.

Cada entrada en `desserts` tiene nombre, descripción, foto, disponibilidad y `variants`. Cada variante contiene `id`, `label`, `description` (por ejemplo, «Caja de 4 unidades»), `priceMinor`, `available` y, opcionalmente, `image`.

Las presentaciones son cantidades/porciones, no dimensiones de impresión. Los ejemplos son brownies, cheesecake y galletas. **El negocio debe confirmar el catálogo real, recetas, ingredientes y alérgenos**; `ingredients` y `allergenInfo` están preparados para mostrar esa información.

### Fotografías e iconos

Colocar las imágenes en **`public/images/`** y cambiar su ruta en la configuración. Se recomiendan WebP/JPEG optimizados de 800–1400 px, con texto alternativo descriptivo. `imagePosition` controla el encuadre sin estirar la foto.

Las tarjetas usan proporciones uniformes y `object-fit: cover`; el ampliador muestra la foto completa con `contain`. Si una imagen falla se usa `placeholder.svg`. Las imágenes bajo la portada tienen carga diferida. Fotos y fuente se sirven localmente, sin depender de servicios de imágenes en tiempo de ejecución.

Iconos de **Lucide**, con relación 1:1 y trazo consistente. El icono de WhatsApp mantiene su `viewBox` cuadrado. Fuentes y atribuciones en **`ASSETS.md`**.

### Entrega

En `deliveryMethods`:

- `enabled`: mostrar u ocultar un método.
- `requiresAddress`: exigir dirección solo cuando corresponda.
- `addressLabel`: personalizar la etiqueta del campo.
- `feeMinor: null`: **Envío por confirmar**; se muestra subtotal y se omite un total definitivo.
- `feeMinor: 0`: sin cargo; permite calcular total.
- `feeMinor: 150000`: ejemplo de cargo fijo de ₡1.500.
- `coverage`, `conditions`, `pickupPoint`: cobertura, condiciones y punto real de recogida.

No hay zonas ni plazos inventados. La recogida gratuita actual es un ejemplo, no una condición comercial confirmada.

### Pedidos con SINPE Móvil

El backend genera el código `ONK-` + 16 caracteres hexadecimales y calcula el precio desde el catálogo. El cliente recibe instrucciones cuando están confirmados total y beneficiario, y adjunta su comprobante con código y referencia bancaria. Se valida pertenencia del pedido, código y archivo; subir una imagen solo cambia el estado a **Comprobante en revisión**.

La administración comprueba el abono en BAC por su cuenta e introduce código, monto y referencia verificados antes de pasar el pedido a **Listo para preparar**. Una referencia consumida no puede confirmar otro pedido. Hay correcciones, auditoría, bloqueo de versiones antiguas e idempotencia. No se automatiza BAC en esta fase. Detalles en [`docs/checkout-sinpe-admin.md`](docs/checkout-sinpe-admin.md).

## Interacciones y accesibilidad

- Menú con columnas laterales iguales: el logo y el carrito no desplazan el centro de navegación.
- Vidrio sutil tras 24 px de desplazamiento: desenfoque, transparencia y borde luminoso; sin cambios de tamaño que muevan el contenido.
- Animación ilustrativa de 15 segundos: chamoy, Tajín y jugo de limón de un bote; después caen los ositos de las imágenes suministradas y se mezclan. Cada gomita tiene cabeza, torso y patas unidos con resortes amortiguados: el cuerpo se comprime y se dobla localmente al aterrizar o recibir la cuchara. Una malla de triángulos deforma las fotografías siguiendo esos puntos materiales. La cuchara mantiene un agarre elevado y recorre barridos asimétricos con inmersión, pliegue hacia dentro y levantamiento; su cabeza y mango comparten geometría visual y de contacto. Un campo de chamoy de alta viscosidad simula el arrastre, el relieve, el movimiento del Tajín y el cierre lento de los surcos, con mayor resistencia en reposo. El recubrimiento permanece sobre las gomitas y la cuchara al levantarse, y forma un hilo corto que se estrecha al escurrir. La simulación determinista se calcula una vez; Web Animations interpola el movimiento y un renderizador SVG actualiza mallas, salsa y profundidad únicamente mientras la tarjeta está visible y reproduciéndose, sin renderizados de React por fotograma. No representa el estado real de un pedido.
- Franja tipográfica de la portada: repite Gomitas enchiladas y Onky’s, separadas por una silueta de osito, en movimiento continuo desde que carga, sin pausarse al hacer scroll; queda estática con preferencia de movimiento reducido.
- La animación se pausa al salir de pantalla o al ocultar la pestaña, y permite pausa manual.
- Los envases de chamoy Mega, Tajín Clásico y la jarrita de limón son recortes fotorealistas generados con Higgsfield, optimizados en WebP con transparencia. El vertido parte de la abertura de cada envase. La cuchara usa curvas con velocidad y aceleración continuas y una cadencia aproximadamente un 27 % más ágil que la versión anterior, conservando contactos flexibles con las gomitas. Procedencia y reproducción de los recursos en `ASSETS.md`.
- Con `prefers-reduced-motion` se muestra el resultado estático; solo se reproduce si el visitante lo solicita explícitamente.
- Diálogos nativos, retorno de foco, ciclo de Tab, Escape, etiquetas de campos, radios/checkboxes de teclado y foco visible.

## Carrito y privacidad

`localStorage`, clave `onkys.cart.v1`, conserva únicamente IDs de variantes y cantidades. Los precios se resuelven desde el catálogo vigente, no desde el almacenamiento local. Configuraciones idénticas se combinan; diferentes pesos, mezclas o presentaciones permanecen separados.

Los artículos eliminados del catálogo o pesos antiguos se descartan al restaurar y se informa al visitante. Los datos corruptos y el bloqueo del almacenamiento tienen recuperación controlada. Límite técnico: 99 presentaciones por variante (`MAX_QUANTITY`).

Al registrar un pedido, nombre, teléfono, dirección, observaciones y aceptación de privacidad se envían al backend y se guardan en SQLite privado. No se guardan en `localStorage`. Una cookie HttpOnly permite recuperar el último pedido en el mismo navegador durante hasta siete días. Los comprobantes son privados y no se publican en `public/`; solo el comprador propietario y el administrador autenticado pueden consultarlos.

## Organización

```text
src/config/store.ts               Catálogo y negocio
src/types.ts                      Tipos del dominio
src/lib/shop.ts                   Precios, variantes y validación del carrito
src/lib/orders-api.ts             Cliente de la API y conversión exacta de importes
src/order-types.ts                Contrato de pedidos y estados
src/hooks/useCart.ts              Carrito y persistencia
src/components/Header.tsx         Navegación y efecto vidrio
src/components/Catalog.tsx        Catálogo compartido
src/components/ProductDialog.tsx  Configuración de productos
src/components/CartDrawer.tsx     Entrega y registro del pedido SINPE
src/components/OrderPanel.tsx     Instrucciones, comprobante y seguimiento
src/components/AdminDashboard.tsx Acceso, revisión, confirmación y configuración
server/store/                    API, SQLite, sesiones y comprobantes privados
src/orders.css                   Checkout SINPE y dashboard
src/components/MixExperience.tsx  Animación ilustrativa
src/components/ui.tsx            Diálogos, imágenes, cantidades y ampliador
src/styles.css                   Sistema visual adaptable
tests/store.spec.ts              Pruebas de navegador
```

## Comprobaciones

```sh
npm test
npm run test:e2e
npm run build
```

Las pruebas de navegador usan Microsoft Edge instalado en este equipo. En otro entorno se puede instalar Chromium y elegirlo:

```sh
npx playwright install chromium
```

PowerShell: `$env:PW_CHANNEL='chromium'` antes de ejecutar las pruebas. En Linux/macOS: `PW_CHANNEL=chromium npm run test:e2e`.

Se comprueban catálogo, carrito, entrega, códigos generados en backend, idempotencia, comprobantes privados, autenticación/CSRF, referencias no reutilizables, correcciones, confirmación manual y rollback, además de teclado, contraste y adaptación móvil. Las pruebas de navegador usan una base temporal aislada y un puerto libre; no acceden a BAC ni envían dinero.

## Pendientes para uso comercial

1. Confirmar nombre definitivo, tipos de gomita y fotografías reales.
2. Fijar precios de las tres presentaciones y de cada mezcla; definir proporciones.
3. Confirmar catálogo de postres, presentaciones, recetas, ingredientes y alérgenos.
4. Definir disponibilidad real, cobertura, tarifas, recogida y condiciones comerciales.
5. Completar contactos adicionales si se desean y cambiar `demo` a `false` al sustituir los ejemplos.

La tienda registra pedidos en backend y el panel permite confirmar pagos **manualmente**. Siguen pendientes para uso comercial la disponibilidad/inventario real, condiciones de entrega, despliegue seguro, gestión de datos y controles adicionales descritos en la guía.

## Laboratorio anterior de conciliación + n8n

La investigación, fuentes oficiales, consulta lista para BAC y proceso de implementación están en **[`docs/pagos-sinpe-bac.md`](docs/pagos-sinpe-bac.md)**. Las condiciones públicas de Tesorería Corporativa Digital limitan ese servicio a personas jurídicas. Simple Pay menciona APIs, pero su modalidad Lite describe acceso web; el acceso API con una cuenta personal requiere confirmación del banco.

Se conserva el backend **aislado de demostración** en `server/payments/` y el flujo de `integrations/n8n/sinpe-local-demo.json`, separados del checkout actual en `server/store/`. No hay conexión a BAC. Solo admite `disabled` o `mock`, escucha en localhost y bloquea producción. `simulated_paid` no puede confirmar pedidos del nuevo panel.

1. Seguir la guía para copiar `.env.payments.example` a `.env.payments.local` y generar dos tokens independientes. No modificar ni compartir `.env.local`.
2. Para una simulación, elegir `PAYMENTS_MODE=mock` y ejecutar `npm.cmd run payments:dev`.
3. En otra terminal: `npm.cmd run payments:demo`. Crea un pedido y movimiento ficticios y comprueba que repetirlos no duplique el evento.
4. Pruebas específicas: `npm.cmd run test:payments`. `npm.cmd test` incluye también las pruebas existentes de la tienda.

El SQLite del laboratorio se guarda en `.data/`, separado del nuevo `.data/store/`. **No exponer el laboratorio a Internet ni enviar dinero para probarlo.** El workflow está desactivado y no se ha ejecutado en n8n. El dashboard manual actual se describe en [`docs/checkout-sinpe-admin.md`](docs/checkout-sinpe-admin.md); stock, notificaciones y lector bancario automático siguen pendientes.

## Estudio de marca con Higgsfield

La primera ronda de **«La O de Onky’s»** se descartó porque parecía una tienda de regalos. Sus seis bocetos se conservan como archivo en `public/brand-concepts/onkys-o-round-01/` y se pueden revisar en `/?vista=archivo-marca`. No se van a animar.

La dirección corregida se centra en **gomitas con chamoy, Tajín y jugo de limón**, y en **tres leches y pie de limón**. El guion y los prompts están en `src/config/creative-direction.ts`. Solo se generó la referencia y el video de las gomitas; los postres se dejan pendientes de fotografías reales. La vista de propuesta es independiente de la tienda:

- Equipo: `http://localhost:5173/?vista=bocetos`.
- Celular en el mismo Wi-Fi: `http://192.168.0.129:5173/?vista=bocetos` (la IP puede cambiar).

Muestra tres direcciones de producto, sus prompts de imagen y movimiento, y un guion para ingredientes → mezcla → resultado. No contiene nuevas imágenes generadas ni modifica automáticamente el catálogo. **Esta vista no usa la API y verla no genera cargos.** Para generar otra ronda hay que aprobar primero el enfoque y su cotización. Las fotografías reales del negocio se utilizarán como referencias si se proporcionan.

### Credenciales y gasto

`HF_CREDENTIALS` permanece en `.env.local`, ignorado por Git, y se carga únicamente en el proceso de Node. No usar el prefijo `VITE_` ni importar los scripts de generación desde React. Nunca publicar o registrar la clave. El registro privado de solicitudes está en `.higgsfield/`, también ignorado por Git y bloqueado en el servidor de desarrollo.

```sh
npm run brand:estimate
# Solo cotiza. No crea imágenes.

npm run brand:generate
# BLOQUEADO: la dirección anterior quedó descartada; no envía generaciones.
```

La cotización inicial de la ronda archivada fue de USD 0.035 por imagen, USD 0.210 en total. El registro conserva sus claves de idempotencia y `request_id`. El comando de generación de esa ronda ahora termina antes de enviar solicitudes para no seguir gastando en una dirección rechazada.

Solo un resultado `completed` con PNG descargado se muestra como disponible. Las solicitudes fallidas, moderadas o canceladas se señalan sin declarar éxito. Ante un reinicio abrupto puede quedar `.higgsfield/onkys-o-round-01/run.lock`: comprobar primero que el proceso indicado haya terminado antes de retirar ese bloqueo y reanudar. No borrar el `state.json`, que conserva las identidades de las solicitudes y evita duplicados.

Los parámetros y prompts históricos están en `scripts/higgsfield/concepts.ts`; no se sobrescribieron sus identidades. La primera dirección de producto se utilizó para la ronda de gomitas descrita a continuación. Los otros prompts siguen pendientes. Cualquier nueva generación necesita otra ronda, un presupuesto y aprobación; no se sustituyen parámetros bajo una clave de idempotencia existente.

### Video de gomitas integrado

La portada usa la fotografía real del producto (`public/images/bolsa-mix.webp`): bolsa holográfica de gomitas enchiladas con chamoy y sticker de Onky’s, recortada sin fondo a partir de `references/original bolsa mix-Photoroom.png`. La tarjeta de Ositos usa `public/images/ositos-bolsa.webp`, de `references/ositos-Photoroom.png`. Ambas conservan transparencia para la sombra CSS. No hay video en la portada ni etiquetas de contenido generado. Los videos generados con IA de rondas anteriores se conservan como archivo en `public/brand-media/` y en la vista `/?vista=gomitas`; no se generan postres. Para regenerar los recortes: `python scripts/media/prepare-hero-bag.py` (Pillow).

- Imagen: `marketing-studio/image`, 2K, 4:3; USD **0.284** cotizados.
- Movimiento: `kling-video/v3.0/pro/image-to-video`, 5 s, `sound: off`; USD **0.476** cotizados.
- Total previsto por el cotizador de la cuenta: USD **0.760**, con un límite de seguridad de USD 1 en el script.
- Nueva ronda `onkys-gummies-02` (autorizada por separado, 12 s en 720p, sin audio): 3 imágenes de referencia Sunburst con facturación variable por tokens más un único video Seedance 2.5 con referencias; estimación de trabajo de USD **5.960** antes de descuentos (3 reservas de USD 0.60 + video USD 4.160). Importe definitivo en el panel del proveedor; no se hicieron reintentos creativos ni postres.

El importe de facturación definitivo se consulta en el panel del proveedor. Los `request_id` y claves de idempotencia están guardados en `.higgsfield/onkys-gummies-01/state.json`. Los resultados descargados están en `public/brand-media/onkys-gummies-01/`:

- `reference.png`: referencia original.
- `hero.mp4`: video original, aproximadamente 5.18 MB.
- `poster.webp`: imagen de carga, aproximadamente 107 KB.
- `hero-web.mp4`: versión de la web, H.264, 1000 × 748, sin audio, aproximadamente **247 KB**, con inicio rápido.
- `manifest.json`: metadatos públicos, prompts y cotización, nunca credenciales.

La optimización del video fue local y no generó ningún cargo de API. La portada reproduce únicamente los archivos locales; las visitas no crean generaciones. Hay pausa/reproducción, pausa fuera de pantalla y al ocultar la pestaña, y una imagen estática para movimiento reducido o ahorro de datos. Si el navegador bloquea la reproducción automática, se conserva un botón para iniciarla.

Vista independiente del clip: **`/?vista=gomitas`**. En el celular: `http://192.168.0.129:5173/?vista=gomitas`, conectado al mismo Wi-Fi. Para sustituir el video o la imagen, editar `heroVideo` y `heroImage` en `src/config/store.ts`.

`npm run gummies:estimate` únicamente cotiza. El script server-side `scripts/higgsfield/gummies.ts` permite reanudar las etapas registradas, no empezar intencionalmente otra ronda. No borrar su estado privado ni ejecutar nuevas etapas sin autorización de gasto. `scripts/media/inspect-gummies.mjs` optimiza la imagen de carga e inspecciona el MP4 local con Playwright; no usa la API ni credenciales.

### Diseño compacto en teléfono

Las reglas de hasta 600 px centran los textos y acciones de la portada, utilizan **DM Serif Display** para su titular y colocan los productos en dos columnas con bordes y sombras discretos. Se reducen márgenes y textos secundarios repetitivos; se conservan los nombres, opciones, precios y acciones de compra. El cuarto acceso de gomitas abre directamente el configurador **Mixto**, equilibrando la cuadrícula del teléfono. La cuadrícula de escritorio permanece en tres columnas y su tipografía de portada sigue siendo DM Sans.
