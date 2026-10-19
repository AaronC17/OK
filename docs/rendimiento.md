# Rendimiento de la tienda

## Máscaras de contacto y animaciones fuera de pantalla

- Las máscaras del chamoy se ajustan una sola vez a todos los vértices de cada osito, incluyendo el margen de los triángulos y antialiasing. Su superficie total pasa al **19,12 %** de la original; se mantienen las fotos, deformaciones, gradientes y tiempos.
- La superficie del chamoy se interpola una vez por fotograma. Se evitan conversiones numéricas a texto y escrituras repetidas cuando el reloj está detenido.
- La cinta de marca y el camión pausan sus bucles fuera del viewport o con la pestaña oculta, retomando el mismo punto. La receta observa la tarjeta animada en lugar de toda la sección.
- Comparación local en Edge, viewport 390 × 844, DPR 3, CPU ×4, servidor Vite, tramo de 6,5 s desde 3,2 s: script **1.227 → 985 ms**, muestras rAF **164 → 179**, p95 **66,6 → 50,1 ms**. Es una muestra emulada del hilo principal, no una nueva medición del iPhone ni FPS del compositor.
- Cinco capturas a 3,5 / 4,2 / 4,5 / 7,5 / 9,5 s: diferencia máxima **1/255**, sin canales con diferencia superior a 16/255. Capturas y perfiles en `%LOCALAPPDATA%\Temp\opencode\onkys-animation`.

## Medición física recibida: Safari en el iPhone

Se recibió una muestra completa de la versión `index-BhUSlhh5.js`, el 19/10/2026 a las 15:34 UTC: viewport 393 × 735, DPR 3, 15.011 ms de observación y 31 eventos de desplazamiento. No hubo errores JavaScript.

| Medida real | Resultado |
| --- | ---: |
| Preparación de datos/worker | 309 ms |
| Preparación de efectos | 61 ms |
| Caída, muestras rAF | 74 |
| Caída, intervalo mediano / p95 / máximo | 17 / 23 / 27 ms |
| Caída, intervalos mayores de 50 ms | 0 |
| Ciclo completo, muestras rAF | 693 |
| Ciclo completo, intervalo mediano / p95 / máximo | 17 / 34 / 46 ms |
| Ciclo completo, intervalos mayores de 50 ms | 0 |

Es una medición del hilo principal de **un iPhone real**, no FPS del compositor ni garantía de 60 FPS constantes. El resto del ciclo aún presenta intervalos de aproximadamente 34 ms. La navegación fue `back_forward`, por lo que no se presenta como prueba de carga en frío; tampoco hay una muestra anterior física comparable para atribuir un porcentaje de mejora. La confirmación visual del usuario y otros dispositivos siguen pendientes. El preview terminó después por su cierre automático de 45 minutos.

Informe: `%LOCALAPPDATA%\Temp\opencode\onkys-phone-reports-final\optimized-1792424093766-4bff541b-6f2d-4494-94af-813f027fa56b.json`.

## Corrección de navegación y caída

- `src/components/SectionLink.tsx`, `src/App.tsx` y `src/components/Header.tsx`: los enlaces internos actualizan el fragmento con History API y desplazan el documento explícitamente. Conservan la URL y sus parámetros de preview, el desplazamiento suave/reducido definido en CSS y los clics modificados. La prueba repite dos pulsaciones, verifica el catálogo bajo la cabecera y comprueba que no hay segunda navegación ni cambia `performance.timeOrigin`, en móvil y escritorio. En Chromium no se reprodujo la recarga nativa notificada por el usuario en Safari; la corrección evita esa ruta nativa en ambos.
- `src/lib/mix-affine.ts`, `src/components/GummyBowl.tsx` y `src/components/mix-motion.ts`: cuando los diez vértices de una foto siguen una sola transformación afín (tolerancia numérica 0,000001 unidades SVG), se pinta una imagen en vez de ocho recortes. En cuanto el osito se dobla, se restablecen todos los triángulos originales. No se altera la física, la trayectoria, la escala, las colisiones ni el reloj. Entre 3,2 y 4,5 s, 425 de 977 poses activas admiten esa representación: **4.841 pinturas fotográficas frente a 7.816**, un 38 % menos de elementos fotográficos que pintar, no un porcentaje de FPS.
- Las 26 capturas adicionales incluyen ocho tiempos (3.250, 3.350, 3.500, 3.750, 4.000, 4.200, 4.500 y 7.500 ms) en ambos tamaños. Portada, página completa, carrito, producto, movimiento reducido y mezcla a 7,5 s permanecen idénticos. Durante la caída hay diferencias de antialiasing localizadas en las fotos: menos del 0,46 % de píxeles de la tarjeta superan 16/255. La geometría se conserva; no se afirma igualdad píxel a píxel de la rasterización de una foto frente a ocho recortes.
- Comprobación adicional con **DPR 3**, como el iPhone: 0,021 % de píxeles de la tarjeta superan 16/255 en la caída a 3,5 s y 0,081 % a 4 s; mezcla a 7,5 s, carrito y movimiento reducido son idénticos. En el enlace LAN real, dos pulsaciones mantuvieron `performance.timeOrigin`, conservaron los parámetros y generaron solo una petición de documento; sin errores JavaScript.
- La comparación emulada adicional sigue siendo inconclusa como prueba de fluidez: una ejecución anterior produjo 195 muestras/ciclo, y la nueva 156; el p95 global pasó de 449,1 a 416,4 ms, mientras que el p95 de la ventana de caída pasó de 283,3 a 416,4 ms, con solo cinco/siete muestras en esa ventana. **No se utiliza esa ejecución para afirmar una mejora de FPS**. El 38 % anterior describe únicamente el trabajo fotográfico evitado. La validación física pendiente permanece abierta.
- `tests/performance.spec.ts` incluye la regresión de «Ver productos» sin recarga; `src/lib/mix-affine.test.ts` verifica que el atajo no acepta mallas dobladas ni desplaza vértices más de su tolerancia. Ocho pruebas de navegador y ocho de física/codec/representación aprobadas, además de TypeScript/compilación.
- El preview permite reutilizar el token con `--token` para mantener **el mismo enlace** al actualizar una copia estable. El recolector separa la ventana de caída del resto del ciclo y registra el tipo de navegación.

> **Actualización tras la prueba física en iPhone:** el usuario detectó demora al preparar la escena y caída de gomitas entrecortada. Las cifras de la primera comparación de abajo NO cierran esa incidencia. La corrección conserva el SVG y evita repintar las máscaras de recubrimiento cuyo recorte está completamente fuera de la foto mientras los ositos caen. La física se precalcula en un archivo binario comprimido y sin pérdida para evitar resolverla otra vez en el teléfono. Se empieza a preparar la escena antes de que llegue al viewport. La confirmación de fluidez en el iPhone queda pendiente de repetir la prueba con esta versión.

Archivos de esta corrección adicional: `src/components/mix-motion.ts`, `src/components/MixExperience.tsx`, `src/components/mix-simulation.ts`, `src/components/mix-simulation.worker.ts`, `src/lib/mix-codec.ts`, `src/lib/mix-codec.test.ts`, `scripts/media/bake-mix.ts`, `src/config/mix-baked.json`, `public/images/mix/motion-*.bin` y el hook `prebuild` de `package.json`. El archivo comprimido actual añade aproximadamente 2,58 MB bajo demanda. Su descarga se limita a 800 ms para no perjudicar enlaces lentos: si no llega a tiempo, falla o no hay descompresor nativo, se usa el solver original dentro del worker.

Se ensayó un pintado Canvas para las fotos deformables, conservando el DPR 3 del teléfono, pero se **descartó** por regresión: en una ejecución móvil emulada con CPU ×4, Canvas produjo 213 muestras rAF/ciclo y p95 de 349,7 ms, frente a 679 muestras y 49,9 ms del SVG anterior en la comparación siguiente. La prueba de ida y vuelta del binario sí confirma igualdad estricta de todos los datos Float64. No se han eliminado efectos ni reducido el DPR. Las muestras del iPhone recibidas hasta ahora no permiten afirmar «20 FPS»: la muestra completa incluyó una suspensión de 65 s y no es válida para comparar cadencia. Se ha corregido el recolector para descartar esos intervalos.

Las pruebas locales del iPhone se sirven con `scripts/testing/phone-preview.mjs` y `scripts/testing/phone-probe.js`, sin backend de pedidos. Se congelan HTML y assets juntos para evitar que otra compilación rompa la URL de pruebas. Se recogen errores, medidas de preparación y cadencia rAF; las muestras interrumpidas por ocultar la pestaña o suspensión se descartan y no se presentan como FPS.

Validación de la corrección: TypeScript y compilación correctos; 6 pruebas de navegador (escritorio/móvil) y 7 de física/binario aprobadas. Los 12 fotogramas de la escena (seis tiempos × dos tamaños) son idénticos píxel a píxel a la versión SVG anterior. No se han sobrescrito los cambios ajenos que aparecieron durante el trabajo, incluidos ajustes de catálogo/diálogos y empaquetado. En una comprobación local adicional, la preparación midió 189,5 ms de snapshot/worker y 95,4 ms de efectos; **esos tiempos son de escritorio, no del iPhone**.

La ejecución adicional de DPR 3 de la corrección (antes de limitar la descarga a prioridad baja y esperar a que termine la carga de portada) produjo 419 muestras rAF/ciclo y p95 de 99,9 ms; **no demuestra una mejora de fluidez frente a las 679 muestras/p95 49,9 ms de la ejecución anterior**. No se da por resuelta la incidencia de fluidez física ni se promete 60 FPS. El siguiente paso es repetir en el mismo iPhone, con la escena visible de forma continua y sin suspender Safari, usando el enlace de la nueva copia estable.

## Diagnóstico y método

Se guardó una compilación de producción **anterior a los cambios** fuera del repositorio. Las comparaciones usan esa compilación y la compilación final, no el servidor de desarrollo de React.

- Edge/Chromium 155, headless, Windows. Móvil: 390 × 844, DPR 1, táctil, CPU ×4, descarga 1,6 Mbps, subida 750 Kbps y latencia 150 ms. Escritorio: 1440 × 1000, CPU/red sin limitar.
- Tres navegaciones con contextos nuevos y caché deshabilitada por versión/dispositivo. Se informa la mediana. No se ejecutan pruebas/builds en paralelo con el benchmark.
- Carga: LCP, CLS, tareas largas y CPU del hilo principal hasta tres segundos después de `load`. «Bloqueo» suma `max(duración − 50 ms, 0)` de las tareas observadas; **no es una puntuación ni un TBT de Lighthouse**.
- Reproducción: un ciclo de 15 segundos con desplazamiento de ±40 px y registro de intervalos `requestAnimationFrame`. Mide la respuesta del hilo principal, **no FPS del compositor, INP ni un teléfono físico**.
- Servidor estático local sin compresión HTTP, con la misma limitación de red para ambas versiones. Los tamaños indicados son bytes sin comprimir; el despliegue puede aplicar Brotli/gzip.
- El muestreo CPU del diagnóstico se hizo aparte; las comparaciones finales no activan el profiler.

El perfil inicial encontró:

1. `simulateMix()` ejecutaba toda la física síncronamente al montar una sección todavía fuera de pantalla. La primera captura instrumentada registró una tarea de 8,8 s. El mayor punto caliente era `separate()`, que calculaba distancias de contactos inexistentes en diez iteraciones por paso.
2. La cabecera leía `window.scrollY` en cada evento de desplazamiento, después de las escrituras de geometría del SVG. Esa lectura forzaba trabajo síncrono de estilos/layout; el perfil atribuyó aproximadamente 2,2 s a ese callback durante un ciclo.
3. Se descargaban código de vistas alternativas, checkout y estilos de administración que la portada no estaba utilizando. Las cuatro fotos de ositos se precargaban incluso antes de necesitar la ilustración.
4. La ilustración repetía la misma imagen y un contenedor de recorte para cada triángulo de cada osito.

## Cambios

| Archivos | Mejora |
| --- | --- |
| `src/components/Header.tsx` | `IntersectionObserver` sustituye al callback de scroll; conserva el umbral de 24 px y el efecto de cristal. El importe del anuncio se formatea una sola vez. |
| `src/components/MixExperience.tsx`, `src/components/mix-simulation.ts`, `src/components/mix-simulation.worker.ts` | Carga anticipada por proximidad; física en un worker, calculada una sola vez y compartida entre montajes; liberación del worker al terminar. Se conserva la pausa fuera de pantalla y en pestañas ocultas. |
| `src/components/mix-motion.ts` | Preparación de los mismos keyframes en tareas pequeñas, cancelables al desmontar. Los efectos SVG invisibles dejan de consumir muestreo continuo: se activan un segundo antes y se suspenden un segundo después de su intervalo visible, usando la época del mismo reloj maestro. No se cambia ningún keyframe ni su duración. |
| `src/lib/mix-physics.ts` | Descarte barato de contactos claramente separados, con margen numérico para conservar los resultados originales. |
| `src/components/GummyBear.tsx`, `src/components/GummyBowl.tsx` | Eliminación de contenedores de recorte redundantes y carga de las mismas fotos por proximidad, sin recomprimirlas ni cambiar su resolución. Se descartó la variante con referencias `<use>` porque el pintado de imágenes directas obtuvo menor coste de estilos/layout. |
| `src/App.tsx`, `src/components/Catalog.tsx` | Callbacks estables, catálogo/experiencia memorizados, lista de pesos formateada una sola vez; configurador y carrito bajo demanda. El carrito sigue montado después de abrirlo para no perder formularios. |
| `src/main.tsx`, `src/components/CartDrawer.tsx`, `src/components/AdminDashboard.tsx` | Vistas secundarias y CSS de pedidos/administración en sus propios chunks. |
| `src/styles.css`, `src/orders.css` | Reubicación de las reglas del anuncio para conservar exactamente su apariencia sin descargar el CSS de checkout en la portada. |
| `src/components/mix-experience.css` | Fotograma fijo equivalente al anterior para movimiento reducido, sin ejecutar la física. No se quitan filtros, sombras ni efectos. |
| `index.html` | Se eliminan exclusivamente las cuatro precargas de fotos decorativas; se mantienen las fuentes y las imágenes principales. |
| `tests/performance.spec.ts` | Regresiones de carga bajo demanda, carrito persistente, worker único, sincronización, pausa y movimiento reducido, en ambos tamaños. |
| `scripts/testing/performance.mjs`, `scripts/testing/compare-visuals.mjs` | Benchmark y comparación reproducible de capturas. |

No se modificaron colores, fuentes, tamaños, posiciones, curvas, número de muestras ni duración de animaciones. El ciclo sigue siendo de **15.000 ms**.

Se ensayó quitar `will-change` de los elementos SVG y se **descartó**: empeoró notablemente la medición móvil. Las ayudas de composición originales permanecen.

## Comparación final

Medianas de tres ejecuciones por dispositivo y compilación:

| Móvil emulado | Antes | Después |
| --- | ---: | ---: |
| LCP | 8.112 ms | 7.284 ms |
| Bloqueo acumulado en carga | 38.439 ms | 1.592 ms |
| Tarea de carga más larga | 36.880 ms | 883 ms |
| Intervalo rAF, percentil 95, durante el ciclo | 483,1 ms | 50 ms |
| Intervalos rAF mayores de 50 ms / ciclo | 79 | 19 |
| CPU del hilo principal / ciclo | 15.104 ms | 11.108 ms |
| Recálculo de estilos / ciclo | 3.849 ms | 1.710 ms |

| Escritorio | Antes | Después |
| --- | ---: | ---: |
| LCP | 1.140 ms | 140 ms |
| Bloqueo acumulado en carga | 884 ms | 14 ms |
| Intervalo rAF, percentil 95 | 50 ms | 16,9 ms |
| Intervalos rAF mayores de 50 ms / ciclo | 19 | 0 |
| CPU del hilo principal / ciclo | 11.911 ms | 3.705 ms |
| Recálculo de estilos / ciclo | 2.432 ms | 608 ms |

| Recursos/estructura | Antes | Después |
| --- | ---: | ---: |
| JS de entrada, sin comprimir | ≈381 kB | ≈290 kB (−24 %) |
| JS total solicitado en carga, incluida preparación anticipada y worker | ≈381 kB | ≈323 kB (−15 %) |
| CSS inicial, sin comprimir | 101,9 kB | 66,8 kB (−34 %) |
| Elementos DOM iniciales | 2.094 | 1.914 |
| CLS | 0 | 0 |
| Errores JavaScript observados | 0 | 0 |

**Variabilidad importante:** Edge con CPU ×4 produjo diferencias grandes entre series. En series anteriores la compilación original acumuló entre 4,7 y 9,6 s de bloqueo; en la última, entre 33,4 y 43,8 s. La compilación final registró 321–2.259 ms de bloqueo y 49,9–400 ms de intervalo rAF p95 en sus tres ejecuciones. Por eso se publican medianas y rangos, no una promesa de tiempos para teléfonos reales ni un porcentaje de FPS. La mejora de bytes, el traslado de física fuera del hilo principal y la reducción de trabajo invisible sí son verificables independientemente de esa variación.

Datos completos de la última comparación, bajo `%LOCALAPPDATA%\Temp\opencode\`:

- `onkys-perf-before-final/metrics.json`
- `onkys-perf-optimized-final/metrics.json`

## Conservación de la física

Se compararon recursivamente los 619 fotogramas y los impactos de `simulateMix()` con la versión original de Git: **igualdad estricta de todos los datos**. Ambas serializaciones tienen el mismo SHA-256:

`2b3a73f11a95f6430d2508faf46c4f35273c1322660373e820379bb9a809338c`

La comprobación local independiente tardó aproximadamente 910 ms antes y 447 ms después, sin limitación de CPU. Es un diagnóstico del cálculo, no una métrica de navegación.

## Verificación visual

Se compararon **22 capturas**: portada, página completa, configurador, carrito, movimiento reducido y seis instantes del ciclo (0, 1.500, 2.500, 3.500, 7.500 y 12.500 ms), en escritorio y móvil.

- **18 capturas son idénticas píxel a píxel**, incluidas todas las fases de animación y ambos carritos.
- Las cuatro restantes solo difieren un máximo de **2/255 por canal**; no hay ningún píxel con diferencia superior a 16/255 en las 22 capturas.
- En los seis instantes, 17 elementos de la ilustración mantienen **exactamente la misma geometría y estilos calculados** en ambos dispositivos: posición, dimensiones, transformación, opacidad, borde y tipografía.
- La revisión visual no encontró diferencias perceptibles. Se conservaron las fuentes, imágenes originales, colores, composición, sombras, desenfoques y tiempos.

Las capturas usan el mismo reloj/instante, recursos decodificados, cursor fuera de los controles y estado de compositor normalizado antes de buscar cada fotograma; no se alteró la página de producción para ocultar diferencias.

Artefactos bajo `%LOCALAPPDATA%\Temp\opencode\`:

- `onkys-visual-before-verified/` y `onkys-visual-after-verified/`: PNG y geometría por fase.
- `onkys-visual-comparison-verified/visual-comparison.json`: comparación de las 22 imágenes.

## Repetir la comprobación

Compilación/TypeScript: correctos. Pruebas unitarias: **87 aprobadas**. Selección de navegador: **17 aprobadas**, con una omisión prevista porque la prueba de hero móvil no aplica al proyecto escritorio. Se ejecutaron `performance.spec.ts`, `mobile-hero.spec.ts`, `brand-marquee.spec.ts`, `food-direction.spec.ts`, `brand-gallery.spec.ts` y `preparation-preview.spec.ts`; no se afirma haber ejecutado toda la suite histórica de navegador.

```powershell
npm.cmd run build
node scripts/testing/performance.mjs --site=dist --output=test-results/performance --runs=3
```

Para capturas de ambos tamaños, seis fases del ciclo, página completa, producto, carrito y movimiento reducido, añadir `--capture=true`. Para ejecutar solo esa comprobación visual, usar `--captureOnly=true`. El script usa respuestas de API ficticias exclusivamente para las capturas del carrito: no crea pedidos ni accede a los datos reales.

```powershell
node scripts/testing/compare-visuals.mjs <capturas-antes> <capturas-después> <directorio-comparación>
```

El comparador informa diferencias exactas, error máximo por canal y píxeles con diferencia mayor de 16/255; estos últimos se resaltan en magenta para inspección. El umbral no sustituye la revisión visual.

## Límites

La ilustración conserva sus máscaras, deformaciones y filtros, por lo que sigue siendo costosa de rasterizar en dispositivos modestos. No se redujo su calidad ni su frecuencia deliberadamente para maquillar la medición. Falta validación en teléfonos físicos, especialmente Safari/iOS, y medición de campo tras desplegar. Las pruebas realizadas no garantizan 60 FPS en todos los equipos.
