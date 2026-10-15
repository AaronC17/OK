/** Revised brief only. Importing this data never calls a generation API. */
const foodPhotography = `Premium realistic food photography for Onky's, a small store selling chamoy-coated spicy gummy candy and desserts. The food is the subject, not gift packaging or abstract branding.
Warm-white background close to #FBFAF9, soft diffused daylight, subtle natural shadows, simple white tableware. Use realistic food textures and natural appetizing colors. Deep plum #382448 may appear as one tiny background accent, never as a colored backdrop. Keep the composition uncluttered and the full plate inside the frame, with room for responsive cropping. No text, logos, people, hands, gift boxes, ribbons, ceramic rings, decorative letters, jewelry, confetti or cosmetic products. Do not invent additional toppings or garnish.`

export const foodDirections = [
  {
    id: '01', title: 'Gomitas enchiladas', icon: 'candy' as const,
    subtitle: 'Chamoy, Tajín y jugo de limón.',
    description: 'Gomitas protagonistas: el brillo del chamoy, el sazonador visible y un limón recién cortado. La interfaz sigue blanca y limpia; el color lo aporta el producto.',
    shots: ['Gomitas con chamoy', 'Tajín sobre la mezcla', 'Un toque de jugo de limón'],
    imagePrompt: `${foodPhotography}\nA small white shallow bowl containing a modest mix of gummy bears, gummy worms and candy strips, evenly coated in a glossy red chamoy sauce. Fine chili-lime seasoning grains are clearly visible on the gummy surfaces. The gummies remain recognizable, with natural translucent texture, not melted or fused together. One halved green lime beside the bowl communicates freshly squeezed lime juice. No other ingredients or props. Three-quarter close-up with the entire bowl visible. The red chamoy, subtle orange-red seasoning and green lime are the only strong colors.`,
    videoPrompt: 'Animate the approved food reference in one locked-camera shot. A very thin stream of red chamoy pours onto the already visible gummy candies in the bowl, then stops. Preserve the exact gummy shapes, bowl, lime, lighting and white background. Slow restrained movement, realistic sauce viscosity, no splashes, no cuts, no new objects, no text. Keep all branding and UI outside the generated video.',
    motion: 'Un hilo de chamoy sobre las gomitas. Tajín y limón ya visibles en la referencia, para no pedir demasiadas acciones al modelo.',
  },
  {
    id: '02', title: 'Tres leches y pie de limón', icon: 'cake' as const,
    subtitle: 'La segunda mitad de Onky’s.',
    description: 'Porciones reconocibles y apetitosas: la textura húmeda del tres leches y el relleno cremoso del pie. Sin sustituirlos por cheesecake, brownies u otros postres no confirmados.',
    shots: ['Tres leches', 'Pie de limón', 'Texturas reales, sin adornos inventados'],
    imagePrompt: `${foodPhotography}\nTwo distinct dessert portions on two small simple white plates: one rectangular slice of tres leches cake with visibly milk-soaked light sponge and a simple smooth white topping, and one triangular slice of lime pie with a light golden crumb base and a smooth pale creamy filling. No chocolate, berries, nuts, cinnamon, cherries or elaborate toppings. Show the cut faces clearly so each dessert is recognizable. Their actual garnish and serving style must follow the supplied real product photographs when available. Three-quarter editorial view; no dark table or rustic background.`,
    videoPrompt: 'Animate the approved dessert reference as a subtle editorial shot. A very slow, short camera push-in reveals the real sponge texture of the tres leches and the smooth lime-pie filling. The food, plates and toppings remain stationary and keep their original shapes. Constant soft light, warm-white background, no added ingredients, no cutting, no morphing, no text or transitions.',
    motion: 'Una aproximación muy corta a las texturas, con las porciones quietas y reconocibles.',
  },
  {
    id: '03', title: 'Dos antojos, una tienda', icon: 'sliders' as const,
    subtitle: 'Mi recomendación para la portada.',
    description: 'Una portada de dos vistas: primero las gomitas enchiladas; después el tres leches y el pie de limón. Onky’s aparece con su logo real en la web, no convertido en una escultura.',
    shots: ['Vista 1 · Gomitas', 'Vista 2 · Postres', 'Misma luz, fondo y encuadre'],
    imagePrompt: `${foodPhotography}\nCreate a cohesive food campaign composition, not a collage. One shallow white bowl of chamoy-coated gummy candies with visible chili-lime seasoning and one halved green lime. Beside it, two small white plates hold a rectangular tres leches slice and a triangular lime-pie slice. The three products form one balanced compact group with generous breathing room. Each food remains separately recognizable. No other dessert types, packaging, decorations or written branding. Match serving styles to the real product reference photographs when available.`,
    videoPrompt: 'Use two separately approved food shots: one of the chamoy-coated gummies and one of the tres leches and lime pie. Animate only one small action per shot, preserving each reference. Do not ask the model to transform gummies into cake or generate a branded transition. The website will handle the crossfade, category labels and Onky’s logo.',
    motion: 'La transición entre gomitas y postres se hace en la web. La API solo anima cada toma; no tiene que inventar una transformación entre alimentos.',
  },
] as const
