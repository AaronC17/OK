/** New reference-guided preparation brief. No API submission is made by this module.
 * The original paid round is kept intact; these instructions belong to a future round.
 */
const candyShapes = `Use only loose edible gummy candies with the shapes described by the customer's references:
- sugar-dusted plump short sour worms or rounded gummy rods, multicolored, like the candies visible in reference 1;
- small watermelon-wedge gummies with a red face and thin white and green layers, like reference 2;
- red/orange and yellow two-tone sour gummy rings with a real central hole, like reference 3;
- small recognizable translucent gummy bears.
Do not reproduce the packages, logos, labels, brand mascots or text. Do not replace these with rainbow belts, fruit, beans or marshmallows. Preserve each shape under a thin coating.`

const kitchenStyle = `Natural homemade food-preparation photography on a warm off-white kitchen counter matching #FBFAF9, with one ordinary white mixing bowl and one simple silicone spatula. Soft diffused window daylight, natural color and fine real food texture, not an artificial glossy product render. Moderate depth of field: every gummy shape and ingredient should be recognizable. Keep all important items in the central 75 percent of the frame and leave clean off-white room around the edges for the website's soft blend. No dark or colored backdrop, gift packaging, floating objects, dramatic lighting, oversaturated colors or text.
Freshly squeezed lime juice has ALREADY been added to the chamoy coating. No whole citrus fruit, slices, halves, peels or squeezing action should appear. Small plain bowls may show the remaining red chamoy and granular chili-lime seasoning, and a small clear cup may show already-expressed lime juice to identify the ingredients without showing fruit. No commercial packets or branded bottles in the scene.`

export const gummyPreparation = {
  title: 'Así se preparan tus gomitas',
  referenceStatus: 'Las tres referencias originales están guardadas en references/. Se usan recortes de las gomitas, sin las bolsas, y la foto de ositos ya disponible en el proyecto.',
  models: { image: 'marketing-studio/image/sunburst', video: 'bytedance/seedance-2.5/reference-to-video' },
  imageQuality: 'high', imageResolution: '2k', aspectRatio: '4:3',
  duration: 12, videoResolution: '720p', audio: false,
  steps: [
    { title: 'Ingredientes', description: 'Gusanitos, sandías, aros y ositos. Chamoy y jugo de limón ya añadidos; Tajín visible en un recipiente aparte.' },
    { title: 'Sazonar', description: 'Una cucharita reparte el Tajín sobre las gomitas. Se ven granos finos, no una nube artificial.' },
    { title: 'Mezclar', description: 'Una espátula da vueltas suaves y cubre las gomitas. Al final se retira para mostrar la mezcla terminada.' },
  ],
  imagePrompts: [
    `${kitchenStyle}\n${candyShapes}\nStarting reference: the loose candies are in the mixing bowl, lightly moistened with red chamoy and lime juice already added, but not covered in seasoning yet. The seasoning is in one small plain dish next to the bowl; the spatula rests naturally beside it. Small amounts of ingredients, a casual tidy home-kitchen setup, no sauce pool and no candy melting.`,
    `${kitchenStyle}\n${candyShapes}\nMiddle reference: preserve the same bowl, counter, lighting, candy assortment and camera position as the starting reference. Fine chili-lime seasoning has just been sprinkled across the gummies. The silicone spatula rests against the inner side of the bowl, ready to fold the mixture. Thin chamoy coating, no soup-like sauce pool, realistic tiny seasoning grains.`,
    `${kitchenStyle}\n${candyShapes}\nFinal reference: preserve the same bowl, counter, lighting and camera position as the starting reference. The four gummy types are now gently folded together and uniformly coated with a thin realistic red chamoy and chili-lime seasoning mixture containing already-added lime juice. The candies remain separately identifiable, not fused or distorted. The spatula rests outside the bowl. No added garnish or food.`,
  ],
  videoPrompt: `${kitchenStyle}\n${candyShapes}\nCreate one believable continuous 12-second home-kitchen preparation shot based on the approved start, middle and final reference images. The first reference defines the initial setup, the second the seasoning stage and the third the completed mixture. The ingredients and utensils must remain consistent across the entire shot.
0–2 seconds: show the mixing bowl and ingredient dishes, with chamoy and lime juice already lightly coating the loose gummies. Nothing floats or moves without a cause.
2–4 seconds: one ordinary clean right hand enters naturally from the right edge HOLDING a small teaspoon, scoops a small amount from the visible seasoning dish and sprinkles it over the gummies. Small grains fall naturally, no dust explosion. The hand withdraws with the spoon; no utensil appears from nowhere or floats by itself.
4–10 seconds: the same cook picks up the white silicone spatula with wooden handle that is already visible beside the bowl, and makes two or three slow gentle folding strokes. Show only one working hand at a time, with a natural grip and normal fingers. Each stroke makes physical contact, lifts a few gummies and lets them fall back naturally. Preserve the shapes and approximate number of the worms, watermelon wedges, rings and bears. Do not melt, stretch, multiply or transform them. Keep the bowl stationary on the counter.
10–12 seconds: the spatula withdraws and the finished lightly coated mixture settles. Hold the view long enough to appreciate the seasoning and real gummy textures.
Fixed three-quarter camera angle, stable soft window light, lifelike utensil handling and natural anatomy. No jump cuts, magical morphing, floating spoons, robotic motion, extra hands, packaging, citrus fruit or text. This is an illustrative preparation scene, not a claim of filming the shop's actual kitchen.`,
} as const
