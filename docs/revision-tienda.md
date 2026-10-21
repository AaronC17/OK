# Revisión de la tienda

## Correcciones aplicadas

- Una segunda compra idéntica genera un pedido nuevo. Los reintentos tras una respuesta perdida conservan la misma clave para evitar duplicados.
- Las variantes eliminadas se rechazan; las presentaciones antiguas sin variante se normalizan antes de combinar el carrito. El backend también detecta duplicados equivalentes.
- Subir un comprobante muestra «Estamos revisando tu pago». La confirmación administrativa indica preparación, sin anunciar un envío o una recogida que todavía no se han registrado.
- No se puede marcar como pagado un pedido cuyo total siga pendiente.
- Las respuestas JSON truncadas tienen recuperación comprensible y los cambios de sesión se coordinan con las lecturas de checkout para conservar el token CSRF vigente.
- El carrito se sincroniza entre pestañas; las consultas periódicas evitan solapamientos y respuestas antiguas que hagan retroceder el pedido.
- Los módulos que no pueden descargarse muestran una acción de recuperación. Los diálogos diferidos tienen un estado de carga visible.

## Rendimiento y accesibilidad

- CSS inicial: **91,74 → 77,40 kB** minificados; **19,15 → 16,04 kB** comprimidos. Los estilos del formulario de cuenta se descargan al abrirlo.
- Los formatos monetarios y de fecha se reutilizan.
- Las listas MongoDB recuperan los metadatos de comprobantes en una consulta, excluyendo los archivos binarios. Los recuentos de clientes se agrupan y se añaden índices para las consultas habituales.
- La búsqueda de pedidos espera una pausa breve al escribir; su actualización periódica se detiene al cambiar de sección.
- Foco visible en controles, salto al catálogo con transferencia de foco, áreas completas de selección, contraste del seguimiento y ajustes de formularios en pantallas bajas.
- La receta permite pausa manual y reproducción explícita con movimiento reducido o ahorro de datos.

## Backend y despliegue

- Las lecturas de configuración y comprobantes de MongoDB utilizan la misma transacción que las escrituras relacionadas.
- Un fallo de inicialización devuelve un error recuperable y permite una conexión posterior. Vercel requiere MongoDB para evitar guardar pedidos en almacenamiento efímero.
- Se añaden cabeceras de protección de contenido, marcos y referencias. Las imágenes sin versión dejan de almacenarse como inmutables durante un año; las variantes con huella conservan caché larga.
- Se retiran credenciales incrustadas de la prueba MongoDB y de la migración. Las pruebas externas requieren `TEST_MONGODB_URI`; la migración requiere `MONGODB_URI` y abre SQLite en modo de solo lectura.

**Pendiente operativo:** rotar la credencial MongoDB que estaba incrustada. Retirarla de los archivos actuales no la invalida ni la elimina del historial Git.

## Comprobaciones realizadas

- `npm test`: **112 correctas**, una integración externa omitida por defecto.
- Integración MongoDB ejecutada por separado en una base temporal: **correcta**, incluyendo concurrencia de comprobantes y activación de pedidos pendientes.
- `npm run test:e2e`: **69 correctas**, 9 omitidas por corresponder al otro tipo de dispositivo. Incluye escritorio, móvil, accesibilidad, errores de red, sesiones, pagos y animaciones.
- `npm run build`: **correcta**.
- `npm audit`: **0 vulnerabilidades conocidas** en las dependencias examinadas.

Las cifras de CSS corresponden a compilaciones locales. Esta revisión no constituye una medición de velocidad en producción. Los límites de solicitudes y la deduplicación de correos siguen siendo por proceso; un despliegue con varias instancias necesita almacenamiento compartido para esos controles.
