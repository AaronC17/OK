# Rendimiento móvil

La portada usa versiones WebP adaptadas al ancho y la densidad de píxeles, con la misma selección `srcset`/`sizes` en el HTML y en la imagen para no descargarla dos veces. Las demás fotos se cargan de forma diferida. La animación de preparación no descarga vídeo ni módulos de física hasta acercarse a la pantalla; respeta movimiento reducido y ahorro de datos. En móviles, una sombra CSS sustituye los dos filtros `drop-shadow` de la bolsa, que ralentizaban las interacciones en WebKit. El vídeo reanuda el bucle si el decodificador de WebKit se detiene al volver al primer fotograma.

Para regenerar las variantes después de reemplazar fotos originales: `npm run images:prepare`. Mantener `public/images/responsive/` y `src/config/responsive-images.json` en el despliegue.

## Medición reproducible

Con un servidor de producción local en `http://127.0.0.1:4173`, ejecutar:

```sh
node scripts/testing/mobile-audit.mjs http://127.0.0.1:4173 test-results/mobile-audit
```

La prueba hace tres cargas sin caché en Edge/Chromium, vista de 390 × 844, DPR 2, CPU 4× más lenta, descarga a 1,6 Mbps y 150 ms de latencia. Entrega medianas y detalles en `report.json` junto con una captura. **Estas son medidas simuladas locales, no datos de usuarios reales.**

| Mediana | Antes | Después |
| --- | ---: | ---: |
| Bytes transferidos en carga inicial | 986 207 | 375 933 |
| Solicitudes | 15 | 9 |
| Contenido principal (LCP) | 2 788 ms | 2 188 ms |
| Tiempo bloqueado por tareas largas | 140 ms | 88 ms |
| Desplazamiento visual (CLS) | 0 | 0 |

Verificar la navegación y las interacciones con `npm run test:e2e`; usar también `PW_BROWSER=webkit` para las pruebas de WebKit cuando esté instalado.
