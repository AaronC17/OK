import { chromium } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Genera la imagen de perfil del remitente (Gmail/Google) para pedidos@onkys.shop:
// el wordmark «Onky's.» con la tipografía oficial (DM Sans 800, espaciado -0.0705em,
// punto lila #b392ca, como el sticker de la bolsa y el SVG de OrderPanel).
// Salida: public/images/onkys-perfil.png (1024 × 1024, fondo blanco).

const target = 'public/images/onkys-perfil.png'
const font = readFileSync(resolve('public/fonts/dm-sans-latin.woff2')).toString('base64')
// U+2019 (comilla simple tipográfica) en escape para que ningún canal la corrompa.
const wordmark = `Onky\u2019s`

const browser = await chromium.launch({ headless: true, channel: 'msedge' })
try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    @font-face { font-family: Brand; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 100 1000 }
    html, body { width: 1024px; height: 1024px; margin: 0; background: #ffffff }
    body { display: grid; place-items: center }
    #mark {
      font-family: Brand, sans-serif; font-size: 220px; font-weight: 800; line-height: 1;
      letter-spacing: -0.0705em; padding-right: 0.0705em; color: #382448; white-space: nowrap;
    }
    #mark span { color: #b392ca }
  </style><div id="mark">${wordmark}<span>.</span></div>`)
  await page.evaluate(() => document.fonts.ready)

  // Ajusta el tamaño para que el ancho pintado sea 640 px y respire dentro del recorte circular.
  const factor = await page.evaluate(() => {
    const width = document.getElementById('mark')!.getBoundingClientRect().width
    return 640 / width
  })
  const size = Math.round(220 * factor * 10) / 10
  await page.evaluate(sizeValue => {
    const mark = document.getElementById('mark')!
    mark.style.fontSize = `${sizeValue}px`
  }, size)

  await page.screenshot({ path: target })
  console.log(`Imagen de perfil generada: ${target} (1024 × 1024, texto a ${size}px)`)
} finally {
  await browser.close()
}
