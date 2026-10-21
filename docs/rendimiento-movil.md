# Rendimiento móvil

La portada usa AVIF con alternativa WebP, adaptados al ancho y la densidad de píxeles. La única precarga comparte `srcset`/`sizes` con la imagen; no se precargan ambos formatos. Los navegadores sin AVIF seleccionan WebP, y los errores de descarga también tienen recuperación WebP → imagen de sustitución.

## Carga y fluidez por secciones

- Las fotos del catálogo esperan hasta estar a 200 px de la pantalla. La carga nativa diferida podía solicitar también las fotos de secciones lejanas durante la portada. Los tamaños adicionales de 192 y 360 px evitan saltos innecesarios a una variante mucho mayor en miniaturas y tarjetas.
- Las dos fuentes del titular móvil pasan de 49.316 a 7.488 bytes con los mismos glifos originales. Los caracteres nuevos pueden usar las fuentes completas como alternativa.
- «Cómo pedir» y preguntas frecuentes usan `content-visibility: auto`, con tamaños recordados para reducir trabajo fuera de pantalla. Las secciones con imágenes y vídeo conservan sus observadores de visibilidad: aplicar esa propiedad a sus ancestros impide algunas notificaciones de intersección en WebKit.
- La preparación no crea sus 19 animaciones CSS ni descarga vídeo/física hasta acercarse a la pantalla. Solo precarga metadatos; empieza la reproducción cuando es visible, y se pausa fuera de pantalla, al ocultar la pestaña o al abrir un panel. En conexiones 2G/3G también elige el vídeo compacto de 720 px, manteniendo 60 fps. Respeta movimiento reducido y ahorro de datos.
- Los paneles móviles evitan desenfocar toda la página de fondo. En una descarga lenta muestran inmediatamente un estado de carga cancelable, con retorno de foco correcto también en Safari.
- Los enlaces directos a secciones se restauran después de montar la página y cargar las fuentes, sin recargar el documento. Se conservan parámetros de URL, navegación por teclado y movimiento reducido.
- Las variantes de imagen, los subconjuntos tipográficos y los vídeos/simulaciones con hash tienen caché permanente en Vercel. Cambiar su contenido genera otra URL.

Para regenerar las variantes después de reemplazar fotos originales: `npm run images:prepare`. Mantener `public/images/responsive/` y `src/config/responsive-images.json` en el despliegue. Para actualizar los subconjuntos del titular: `npm run fonts:prepare` (Python y `fonttools[woff]`; instrucciones en `ASSETS.md`). La compilación normal utiliza los recursos ya generados.

## Medición reproducible

Con un servidor de producción local en `http://127.0.0.1:4173`, ejecutar:

```sh
node scripts/testing/mobile-audit.mjs http://127.0.0.1:4173 test-results/mobile-audit --sections
```

La prueba hace tres cargas sin caché en Edge/Chromium, vista de 390 × 844, DPR 2, CPU 4× más lenta, descarga a 1,6 Mbps y 150 ms de latencia. Entrega medianas y detalles en `report.json` junto con una captura. `--sections` añade un recorrido de ocho segundos de ida y vuelta por la página, con tiempo de CPU, tareas largas e intervalos de `requestAnimationFrame`. Ejecutar las versiones consecutivamente, sin otras pruebas o compilaciones simultáneas. **Son medidas simuladas locales, no datos de usuarios reales ni FPS de un teléfono físico.**

### Medición de esta revisión — 21 de octubre de 2026

Compilaciones de producción, mismas condiciones y tres repeticiones por versión; informes en `test-results/performance-final-{before,after}/report.json`.

| Mediana | Antes | Después |
| --- | ---: | ---: |
| Bytes transferidos en carga inicial, incluidos encabezados | 385 887 | 244 487 |
| Bytes de recursos | 376 488 | 235 770 |
| Solicitudes | 10 | 9 |
| Primer contenido (FCP) | 2 204 ms | 1 864 ms |
| Contenido principal (LCP) | 2 204 ms | 1 864 ms |
| Tiempo bloqueado por tareas largas al cargar | 85 ms | 87 ms |
| Desplazamiento visual inicial (CLS) | 0 | 0 |
| Intervalo p95 entre fotogramas durante el recorrido | 17 ms | 17 ms |
| Pausas de más de 50 ms durante el recorrido | 0 | 0 |

Resultado: **36,6% menos transferencia inicial y 15,4% menos tiempo hasta el contenido principal**. La carga de JavaScript mantiene un tiempo de bloqueo similar; la fluidez medida del recorrido se conserva. Ninguna de las seis cargas produjo errores de página ni desbordamiento horizontal. La comparación de capturas conserva composición, dimensiones y tipografía de la portada.

### Medición de la revisión anterior

| Mediana | Antes | Después |
| --- | ---: | ---: |
| Bytes transferidos en carga inicial | 986 207 | 375 933 |
| Solicitudes | 15 | 9 |
| Contenido principal (LCP) | 2 788 ms | 2 188 ms |
| Tiempo bloqueado por tareas largas | 140 ms | 88 ms |
| Desplazamiento visual (CLS) | 0 | 0 |

Verificar la navegación y las interacciones con `npm run test:e2e`; usar también `PW_BROWSER=webkit` para las pruebas de WebKit cuando esté instalado.

## Comprobaciones de esta revisión

`npm run build` correcto; `npm test`: 116 pruebas aprobadas y una integración MongoDB omitida por falta de configuración. Las pruebas de navegador de `mobile-loading`, `mobile-animations`, `mobile-hero`, `hero-mobile`, `performance` y `store` tienen 45 casos aplicables aprobados en Chromium, y se verificaron también 24 casos móviles en WebKit (con repetición de los 12 de navegación/carrito tras corregir el retorno de foco).

Se verifican carga por proximidad, formatos alternativos ante errores, navegación directa, desplazamiento, pausa/reanudación, ahorro de datos, paneles lentos cancelables, carrito, teclado y accesibilidad. WebKit en Windows usa WebP y un decodificador de vídeo simulado; la medición no sustituye una comprobación en dispositivos iOS reales.

La batería adicional `accounts.spec.ts` tiene tres casos con fallos previos (seis al ejecutar móvil y escritorio): texto de bienvenida antiguo, expectativas de precios anteriores y altura del registro con el campo de referido. Se reprodujeron los mismos resultados contra las compilaciones anterior y posterior; el registro y el descuento actual de ₡125 funcionan en ambas.
