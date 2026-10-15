import type { StoreConfig } from '../types.ts'

/**
 * CONFIGURACIÓN COMERCIAL
 * Moneda confirmada por el usuario. Catálogo y precios de EJEMPLO.
 * El destino SINPE se configura desde administración, sin inferir un teléfono.
 * Todos los importes son enteros en céntimos: 120000 = ₡1.200.
 * Cada variante tiene su precio propio; no hay fórmulas por peso ni recargos implícitos.
 */
export const store: StoreConfig = {
  name: 'Onky’s',
  demo: true,
  categories: { dessertsEnabled: false }, // Reactivar cuando haya catálogo y fotografías reales.
  currency: { code: 'CRC', locale: 'es-CR', fractionDigits: 2 },
  contact: { email: null, instagramUrl: null },
  heroImage: '/images/bolsa-mix.webp',
  heroImageAlt: 'Bolsa transparente de gomitas enchiladas con chamoy y sticker de Onky’s',
  gummies: {
    weights: [100, 200, 500],
    types: [
      {
        id: 'ositos', name: 'Ositos', coatingLabel: 'enchilados', tag: 'Pequeños, con carácter',
        description: 'El antojo de siempre, con un giro picosito.',
        image: '/images/ositos-bolsa.webp', imageAlt: 'Bolsa de ositos enchilados con chamoy y sticker de Onky’s',
        available: true, prices: { 100: 120000, 200: 220000, 500: 480000 },
      },
      {
        id: 'tiritas', name: 'Tiritas', coatingLabel: 'enchiladas', tag: 'El lado más dulce',
        description: 'Capas de color y un toque de chile.',
        image: '/images/tiritas.jpg', imageAlt: 'Tiritas y gomitas azucaradas de colores',
        imagePosition: '50% 38%', available: true, visible: false, // Oculto por ahora; reactivar cuando vuelva al catálogo.
        prices: { 100: 130000, 200: 240000, 500: 520000 },
      },
      {
        id: 'gusanitos', name: 'Gusanitos', coatingLabel: 'enchilados', tag: 'Fuera de lo habitual',
        description: 'Dulces, divertidos y con ese toque de picante.',
        image: '/images/gusanitos.jpg', imageAlt: 'Gusanitos de gomita multicolor',
        available: true, visible: false, // Oculto por ahora; reactivar cuando vuelva al catálogo.
        prices: { 100: 120000, 200: 230000, 500: 500000 },
      },
    ],
    mixes: {
      enabled: true,
      note: 'Elige un solo tipo o mezcla dos o tres. El peso es el total de la bolsa; las proporciones se coordinan con la tienda.',
      // Combinaciones explícitas. Precios provisionales, no suplementos calculados.
      combinations: [
        { typeIds: ['ositos', 'tiritas'], prices: { 100: 140000, 200: 250000, 500: 550000 }, image: '/images/bolsa-mix.webp' },
        { typeIds: ['ositos', 'gusanitos'], prices: { 100: 140000, 200: 250000, 500: 550000 }, image: '/images/bolsa-mix.webp' },
        { typeIds: ['tiritas', 'gusanitos'], prices: { 100: 140000, 200: 250000, 500: 550000 }, image: '/images/bolsa-mix.webp' },
        { typeIds: ['ositos', 'tiritas', 'gusanitos'], prices: { 100: 140000, 200: 250000, 500: 550000 }, image: '/images/bolsa-mix.webp' },
      ],
    },
  },
  desserts: [
    {
      id: 'brownie', name: 'Brownie de chocolate', tag: 'Una pausa de chocolate',
      description: 'Para ese momento que merece algo especial.',
      image: '/images/brownie.jpg', imageAlt: 'Brownies de chocolate sobre un plato',
      imagePosition: '50% 52%', available: true, ingredients: null, allergenInfo: null,
      variants: [
        { id: 'individual', label: 'Individual', description: '1 unidad', priceMinor: 150000, available: true },
        { id: 'box-4', label: 'Para compartir', description: 'Caja de 4 unidades', priceMinor: 520000, available: true },
      ],
    },
    {
      id: 'cheesecake', name: 'Cheesecake', tag: 'Disfruta sin prisa',
      description: 'Un pequeño gusto para bajar el ritmo.',
      image: '/images/cheesecake.jpg', imageAlt: 'Porción de cheesecake con frutos rojos',
      imagePosition: '50% 50%', available: true, ingredients: null, allergenInfo: null,
      variants: [
        { id: 'individual', label: 'Para ti', description: '1 porción', priceMinor: 240000, available: true },
        { id: 'duo', label: 'Para dos', description: '2 porciones', priceMinor: 440000, available: true },
      ],
    },
    {
      id: 'cookies', name: 'Galletas con chocolate', tag: 'Mejor en buena compañía',
      description: 'El detalle perfecto para acompañar tu día.',
      image: '/images/cookies.jpg', imageAlt: 'Galletas con trocitos de chocolate',
      imagePosition: '50% 45%', available: true, ingredients: null, allergenInfo: null,
      variants: [
        { id: 'duo', label: 'Un pequeño gusto', description: '2 unidades', priceMinor: 180000, available: true },
        { id: 'box-6', label: 'Para compartir', description: 'Caja de 6 unidades', priceMinor: 480000, available: true },
      ],
    },
  ],
  deliveryMethods: [
    {
      id: 'delivery', name: 'A domicilio', description: 'Envío por confirmar', enabled: true,
      requiresAddress: true, addressLabel: 'Dirección o punto de entrega', feeMinor: null,
      coverage: null, conditions: 'Cobertura, tarifa y fecha a coordinar con la tienda. Método de ejemplo.',
    },
    {
      id: 'pickup', name: 'Recogida', description: 'Punto por coordinar', enabled: true,
      requiresAddress: false, feeMinor: 0, coverage: null, pickupPoint: null,
      conditions: 'Método de ejemplo sin cargo. Punto y horario pendientes de confirmar con la tienda.',
    },
  ],
}
