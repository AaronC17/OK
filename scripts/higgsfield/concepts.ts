/** Six fixed concepts for the approved first round. Changing a prompt requires a new round. */
export const ROUND_ID = 'onkys-o-round-01'
export const MODEL = 'recraft/v4.1/text-to-image'
export const MAX_ESTIMATE_MICRO_USD = 210_000 // $0.21 for the whole round.

const direction = `Create one premium editorial brand still-life image, a carefully art-directed photorealistic studio photograph for a small contemporary boutique celebrating thoughtful little moments and personal choice.
Use a seamless warm-white background and matching matte tabletop close to #FBFAF9. The scene must feel airy and almost white, with soft daylight from the upper left, delicate realistic contact shadows, fine tactile materials and restrained dark-plum accents close to #382448. The background is NOT lilac, grey or dark. Keep at least half the image visually empty.
The central motif is a single sculptural hollow O-shaped object inspired by the first letter of the brand. It is a physical design object, not printed typography. Pair it with the described unbranded gift packaging. All objects must rest naturally on the tabletop. Keep their complete silhouettes and shadows inside the central 70 percent of a landscape 4:3 image, with breathing room on all sides. Eye-level to slightly elevated three-quarter camera view, refined 70mm product-photography perspective, crisp edges, subtle depth, no extreme perspective.
No written words, letters printed on packaging, logos, people, hands, food, extra props, glitter, confetti, particles, gradients in the backdrop, neon colors, heavy shadows or watermark. This is a clean brand concept, not a cosmetics advertisement. Photograph only the objects described below.`

export const concepts = [
  {
    id: '01', title: 'El gesto',
    description: 'Una O de cerámica y una pequeña caja: el gusto de recibir un detalle.',
    alt: 'Boceto El gesto: aro marfil de cerámica junto a una caja blanca con un acento violeta.',
    motion: 'La tapa se eleva suavemente y vuelve a descansar. La O permanece inmóvil.',
    prompt: `${direction}\nA thick, smoothly rounded ivory ceramic ring stands upright slightly behind a small square matte-ivory gift box. The gift box has a separate flat rigid lid, softly rounded corners and a single narrow dark-plum decorative paper strip applied only across the lid. The strip does not wrap the base, allowing the lid to lift freely. The ring is about twice the height of the box. Balanced centered composition, ring slightly left and box slightly right. Quiet, warm, inviting, understated. Exactly one ring and one closed gift box.`,
  },
  {
    id: '02', title: 'La pausa',
    description: 'Vidrio esmerilado, curvas suaves y luz. Un momento para bajar el ritmo.',
    alt: 'Boceto La pausa: aro de vidrio esmerilado con una pequeña caja cilíndrica marfil.',
    motion: 'Un reflejo suave recorre el aro mientras la tapa insinúa una apertura.',
    prompt: `${direction}\nOne substantial frosted-glass ring stands upright, milky translucent rather than clear, with a beautiful soft white edge and barely perceptible pale-violet refraction. In front of the ring, a small low cylindrical ivory paper gift box with a flat removable lid and one narrow dark-plum line along the lid's edge. The circle of the box echoes the circle of the ring. Soft and tactile, not glossy or metallic. Exactly one standing ring and one closed circular gift box.`,
  },
  {
    id: '03', title: 'Con carácter',
    description: 'El violeta en un solo gesto. Una firma de marca sobre blanco cálido.',
    alt: 'Boceto Con carácter: aro violeta oscuro y caja de papel marfil sobre fondo blanco cálido.',
    motion: 'La caja se abre unos centímetros, con un contraste claro entre papel y cerámica.',
    prompt: `${direction}\nOne medium-sized hollow ceramic ring in a muted deep plum #382448, matte finish, stands upright behind a compact ivory square paper gift box. The ring must remain a restrained accent occupying less than 15 percent of the whole image; the surrounding scene stays overwhelmingly warm-white. The box has a separate ivory rigid lid and a very small matching plum rectangular seal applied flat to the top of the lid, without bridging the lid and base. Round soft edges and beautiful thick paper texture. Balanced spacing. Exactly one ring and one closed box.`,
  },
  {
    id: '04', title: 'Un pequeño detalle',
    description: 'Papel, un lazo discreto y una O delicada. Cercanía en los detalles.',
    alt: 'Boceto Un pequeño detalle: aro de porcelana marfil y caja blanca con un pequeño lazo violeta.',
    motion: 'El extremo del lazo se mueve apenas, como con una brisa muy ligera.',
    prompt: `${direction}\nOne slender, gently oval ivory porcelain ring stands upright, its slightly organic shape still unmistakably a clean O. Place a low rectangular ivory gift box just in front of its base. A small restrained dark-plum grosgrain bow is attached only to the center of the box lid, not wrapped around the box. The bow is simple, two tidy loops and short tails, with realistic fabric texture. Gentle asymmetry: ring to the right, box slightly to the left. Soft warm daylight and extremely pale contact shadows. Exactly one ring and one closed gift box with one small bow.`,
  },
  {
    id: '05', title: 'Para compartir',
    description: 'Dos detalles bajo una misma O. La marca como punto de encuentro.',
    alt: 'Boceto Para compartir: dos pequeñas cajas de regalo marfil delante de una O de cerámica.',
    motion: 'Una de las cajas se acerca ligeramente a la otra, como un pequeño gesto de compartir.',
    prompt: `${direction}\nOne ivory ceramic ring stands upright in the center background. In front of it, exactly two small square ivory gift boxes stand next to each other with a natural small gap. One box is slightly taller than the other. Both have separate rigid lids, soft rounded corners, and one very thin muted dark-plum paper strip lying flat on the lid only. The O visually embraces the pair from behind. The arrangement evokes sharing and thoughtful companionship without hearts or symbols. The three objects form a compact harmonious group. Exactly one ring and two closed gift boxes.`,
  },
  {
    id: '06', title: 'Tu pequeño mundo',
    description: 'Una O amplia enmarca la sorpresa. Más espacio para imaginar lo que viene.',
    alt: 'Boceto Tu pequeño mundo: una caja pequeña enmarcada por un gran aro marfil.',
    motion: 'La tapa se eleva dentro de la O; el encuadre se mantiene fijo y sereno.',
    prompt: `${direction}\nA large but delicate architectural O-shaped ivory ceramic ring stands upright, viewed almost straight on so its hollow opening is clearly visible. A tiny square warm-white gift box is centered immediately in front of the opening, framed by the O but resting on the tabletop, not floating. The box has a removable rigid lid and a thin plum accent strip applied only to its top. The ring is three times the height of the box. Refined sculptural proportions, very generous negative space, a welcoming little world within the ring. Exactly one ring and one closed gift box.`,
  },
] as const

export function inputFor(concept: (typeof concepts)[number]) {
  return { prompt: concept.prompt, resolution: '1k', aspect_ratio: '4:3', output_format: 'png' }
}
