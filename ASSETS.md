# Recursos visuales

## Fotografías de referencia

Fotografías descargadas de **Pexels**, utilizables según su [licencia](https://www.pexels.com/license/). No representan necesariamente los productos reales de Onky’s. Las vistas del catálogo están identificadas como demostración.

| Archivo local | Autor | Fuente |
| --- | --- | --- |
| `public/images/gummies-hero.jpg` | Polina Tankilevitch | [Colorful Candy, 5469044](https://www.pexels.com/photo/colorful-candy-5469044/) |
| `public/images/ositos.jpg` | Polina Tankilevitch | [Gummy Bears, 5469208](https://www.pexels.com/photo/close-up-shot-of-colorful-gummy-bears-5469208/) |
| `public/images/tiritas.jpg` | Polina Tankilevitch | [Sweet Candies, 5469046](https://www.pexels.com/photo/close-up-shot-of-sweet-candies-on-lilac-background-5469046/) |
| `public/images/gusanitos.jpg` | Polina Tankilevitch | [Gummy Worms, 5469209](https://www.pexels.com/photo/close-up-shot-of-colorful-gummy-worms-5469209/) |
| `public/images/brownie.jpg` | Ella Olsson | [Stacked Brownies, 3026804](https://www.pexels.com/photo/close-up-photo-of-stacked-brownies-3026804/) |
| `public/images/cheesecake.jpg` | Suzy Hazelwood | [Cheesecake, 1126359](https://www.pexels.com/photo/cheesecake-1126359/) |
| `public/images/cookies.jpg` | Marcia Salido | [Chocolate Chip Cookies, 14133096](https://www.pexels.com/photo/a-close-up-shot-of-chocolate-chip-cookies-14133096/) |

Se han optimizado en JPEG. Las gomitas de las fotografías no tienen necesariamente el acabado enchilado del producto comercial; sustituir por fotografías del negocio antes de publicar el catálogo definitivo.

## Tipografía

**DM Sans**, almacenada localmente en `public/fonts/dm-sans-latin.woff2`. Fuente de [Fontsource](https://fontsource.org/fonts/dm-sans), bajo licencia SIL Open Font License. Copia de la licencia en `public/fonts/OFL.txt`.

**Inter**, pesos 500 y 600, solo para el título del configurador de gomitas. Archivos locales `inter-latin-500.woff2` e `inter-latin-600.woff2`, de [Fontsource](https://fontsource.org/fonts/inter), con licencia en `public/fonts/INTER-OFL.txt`.

**DM Serif Display**, normal e italic, para el titular de la portada en teléfono. Archivos locales `dm-serif-display-latin.woff2` y `dm-serif-display-latin-italic.woff2`, de [Fontsource](https://fontsource.org/fonts/dm-serif-display), con licencia en `public/fonts/DM-SERIF-OFL.txt`.

La portada precarga subconjuntos locales `hero-{normal,italic}-<hash>.woff2` (7.488 bytes entre ambos, frente a 49.316 bytes de las caras completas). Se obtienen de los mismos originales con `npm run fonts:prepare`, usando Python y `fonttools[woff]`; no se modifican los glifos. Los caracteres adicionales recurren automáticamente a la fuente completa. Si cambia el titular, actualizar los textos en `scripts/media/prepare-hero-fonts.py` y regenerar `src/config/hero-fonts.{css,json}` y los WOFF2.

Las fotografías de producto y miniaturas de ingredientes tienen versiones AVIF y WebP con transparencia en `public/images/responsive/`. `npm run images:prepare` regenera ambos formatos y `src/config/responsive-images.json`; los nombres incluyen un hash del contenido para permitir caché permanente. AVIF reduce aproximadamente un 30% el peso frente a WebP; el navegador conserva WebP como alternativa.

## Iconos e ilustraciones

- **Lucide React**: [Lucide](https://lucide.dev/), licencia ISC incluida con el paquete. Se importan únicamente los iconos utilizados.
- Icono de WhatsApp: trazo vectorial con proporciones cuadradas; identifica el canal de contacto.
- Favicon, imagen de sustitución, recipiente y bolsa animados: recursos SVG/CSS creados para este proyecto.
- La secuencia de mezcla es una animación local; las fotografías optimizadas se sirven desde el proyecto, sin llamadas a servicios de generación durante la reproducción.

### Ositos de la animación de mezcla

Los recortes suministrados en `references/osito 1.png`, `osito 2.png`, `osito 3.png` y `osito 5.png` se usan directamente en la caída, mezcla y bolsa final. Sus versiones WebP con transparencia están en `public/images/mix/bear-{amber,ruby,citrus,gold}.webp` (aproximadamente 107 KB en total). No se modificaron los originales. `osito 4.png` contiene un fondo y se conserva como referencia.

Para volver a optimizarlos: `python scripts/media/prepare-mix-bears.py` (Pillow). Recorta márgenes transparentes y reduce a un máximo de 192 × 256 px. El vidrio y la cuchara son ilustraciones SVG locales.

### Envases fotorealistas de la animación

`public/images/mix/bottle-{chamoy,tajin,limon}.webp`: tres imágenes generadas con la API de Higgsfield (`marketing-studio/image/sunburst`), por indicación del usuario. **Tajín Clásico** se conserva de la ronda `onkys-seasoning-bottles-01` (referencia oficial de Tajín). El **Chamoy Mega Original** es de la ronda `onkys-seasoning-bottles-02` (foto del envase real como referencia) y la **jarrita de vidrio con jugo de limón** es de la ronda `onkys-seasoning-bottles-03` (generada solo con texto, sin envase comercial). Son recreaciones generadas, no fotografías tomadas por el negocio. El envase verde de limón de la primera ronda y el frasco Secreto de la segunda se retiraron del proyecto; sus originales quedan archivados en `.higgsfield/`.

- Las referencias y los puntos de vertido están registrados en `public/images/mix/seasoning-bottles.json`.
- Los originales, prompts e identidades de cada solicitud están en `.higgsfield/onkys-seasoning-bottles-01/` y `.higgsfield/onkys-seasoning-bottles-02/`. No se repiten las generaciones al volver a ejecutar los scripts.
- `scripts/higgsfield/seasoning-bottles.ts`, `scripts/higgsfield/seasoning-bottles-02.ts` y `scripts/higgsfield/seasoning-bottles-03.ts` cotizan por defecto; `--generate` envía o reanuda cada ronda. Las previsiones de trabajo fueron USD 1,80, USD 1,20 y USD 0,60; el proveedor factura según tokens y el importe definitivo se consulta en su cuenta.
- `python scripts/media/prepare-seasoning-bottles.py`, `python scripts/media/prepare-seasoning-bottles-02.py` y `python scripts/media/prepare-seasoning-bottles-03.py` eliminan el fondo con rembg, conservan las etiquetas y optimizan las imágenes con Pillow. Requieren también numpy y scipy. Las tres versiones con transparencia suman aproximadamente **160 KB**.
- La animación rota cada imagen alrededor de su abertura real para alinear el chorro y los ingredientes. Los archivos se sirven localmente; reproducir la animación no genera cargos de API.

## Bocetos de marca generados con IA

`public/brand-concepts/onkys-o-round-01/01.png` a `06.png`: seis conceptos generados por la API de Higgsfield con `recraft/v4.1/text-to-image`, ronda autorizada de «La O de Onky’s». **Dirección descartada por parecer una tienda de regalos.** Se conservan como registro, no se utilizarán en la portada ni se animarán.

Los prompts y metadatos públicos se conservan en el `manifest.json` de esa carpeta. Los resultados se descargaron al proyecto para no depender de la retención temporal del proveedor. El archivo se consulta en `/?vista=archivo-marca`. El guion corregido de gomitas y postres está en `/?vista=bocetos`; únicamente se generó el clip de gomitas descrito abajo.

## Visual de gomitas con chamoy, Tajín y limón

`public/brand-media/onkys-gummies-01/reference.png`: imagen generada mediante `marketing-studio/image`, con fondo blanco cálido, gomitas recubiertas de chamoy y sazonador tipo Tajín, y limón. No representa una fotografía del producto real del negocio. El texto alternativo y la portada señalan el uso de IA.

`hero.mp4`: clip de referencia generado con `kling-video/v3.0/pro/image-to-video`, de 5 segundos y sin audio. `hero-web.mp4` es una versión optimizada localmente con FFmpeg, conservando sus proporciones. `poster.webp` deriva de la misma referencia y permite una vista estática ligera. El video se puede revisar en `/?vista=gomitas` y se integra en la portada.

Los resultados se descargaron al proyecto; reproducirlos no utiliza la API. No se generaron imágenes ni videos de postres: se esperan fotografías reales del tres leches y el pie de limón.
