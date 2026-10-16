import { clamp, floorHeight, GEL_MESH, GEL_RADII, GEL_TRIANGLES, GUMMY_RADIUS, LIQUID_LEVEL, MIX_CYCLE, mixBears, SAMPLE_RATE, sampleSurface, simulateMix, smooth, spoonAt, stirStrength, type MixSimulation, type Point2 } from '../lib/mix-physics.ts'
import { createLemonPour } from './lemon-pour.ts'
export { MIX_CYCLE } from '../lib/mix-physics.ts'

const seconds = MIX_CYCLE / 1000
const round = (value: number) => Number(value.toFixed(4))
const transform = (x: number, y: number, rotation = 0, sx = 1, sy = sx) => `translate(${round(x)}px, ${round(y)}px) rotate(${round(rotation)}deg) scale(${round(sx)}, ${round(sy)})`
const screenY = (y: number, z: number) => 227 + z * .34 - y
let baked: MixSimulation | undefined

const PRECOMPUTED_TRIANGLES = GEL_TRIANGLES.map(triangle => {
  const a = GEL_MESH[triangle[0]], b = GEL_MESH[triangle[1]], c = GEL_MESH[triangle[2]]
  const bx = b.x - a.x, by = b.y - a.y, cx = c.x - a.x, cy = c.y - a.y
  const determinant = bx * cy - cx * by
  return {
    i0: triangle[0], i1: triangle[1], i2: triangle[2],
    ax: a.x, ay: a.y,
    bx, by, cx, cy, determinant,
  }
})

const warpFast = (t: typeof PRECOMPUTED_TRIANGLES[number], mesh: Point2[]) => {
  const p = mesh[t.i0], q = mesh[t.i1], r = mesh[t.i2]
  const qpx = q.x - p.x, rpx = r.x - p.x
  const qpy = q.y - p.y, rpy = r.y - p.y
  const xx = (qpx * t.cy - rpx * t.by) / t.determinant
  const xy = (rpx * t.bx - qpx * t.cx) / t.determinant
  const yx = (qpy * t.cy - rpy * t.by) / t.determinant
  const yy = (rpy * t.bx - qpy * t.cx) / t.determinant
  return `matrix(${round(xx)} ${round(yx)} ${round(xy)} ${round(yy)} ${round(p.x - xx * t.ax - xy * t.ay)} ${round(p.y - yx * t.ax - yy * t.ay)})`
}

export interface MixSceneMotion {
  animations: Animation[]
  setRunning: (running: boolean) => void
  dispose: () => void
}

export function animateGummyBowl(svg: SVGSVGElement, container?: HTMLElement | null): MixSceneMotion {
  const { frames, impacts } = baked ??= simulateMix()
  const animations: Animation[] = []
  let running = false
  let hasStarted = false

  const animate = (element: Element | null, keyframes: Keyframe[]) => {
    if (!element) return
    const last = keyframes.at(-1)!
    const finalFrames = last.offset === 1 ? keyframes : [...keyframes, { ...last, offset: 1 }]
    const animation = element.animate(finalFrames, { duration: MIX_CYCLE, iterations: Infinity, easing: 'linear', fill: 'both' })
    animation.pause()
    animation.currentTime = 0
    animations.push(animation)
  }
  const envelope = (selector: string, entries: [number, number, string?][]) => {
    animate(svg.querySelector(selector), entries.map(([time, opacity, motion]) => ({ offset: time / seconds, opacity, ...(motion ? { transform: motion } : {}) })))
  }

  // Synchronize HTML film timeline, captions, bowl scene and ingredients to the exact same WAAPI timeline
  if (container) {
    // 1. Timeline progress bar
    animate(container.querySelector('.film-step-1 i'), [
      { offset: 0, transform: 'scaleX(0)' },
      { offset: .33, transform: 'scaleX(1)' },
      { offset: .96, transform: 'scaleX(1)' },
      { offset: .9601, transform: 'scaleX(0)' },
    ])
    animate(container.querySelector('.film-step-2 i'), [
      { offset: 0, transform: 'scaleX(0)' },
      { offset: .33, transform: 'scaleX(0)' },
      { offset: .68, transform: 'scaleX(1)' },
      { offset: .96, transform: 'scaleX(1)' },
      { offset: .9601, transform: 'scaleX(0)' },
    ])
    animate(container.querySelector('.film-step-3 i'), [
      { offset: 0, transform: 'scaleX(0)' },
      { offset: .68, transform: 'scaleX(0)' },
      { offset: .96, transform: 'scaleX(1)' },
      { offset: .9601, transform: 'scaleX(0)' },
    ])

    // 2. Bowl scene and finished pouch transitions
    animate(container.querySelector('.mix-bowl-scene'), [
      { offset: 0, opacity: 1, transform: 'translateY(0) scale(1)' },
      { offset: .64, opacity: 1, transform: 'translateY(0) scale(1)' },
      { offset: .70, opacity: 0, transform: 'translateY(12px) scale(.96)' },
      { offset: .95, opacity: 0, transform: 'translateY(12px) scale(.96)' },
      { offset: 1, opacity: 1, transform: 'translateY(0) scale(1)' },
    ])
    animate(container.querySelector('.finished-mix'), [
      { offset: 0, opacity: 0, transform: 'translateY(22px) rotate(-6deg) scale(.9)' },
      { offset: .68, opacity: 0, transform: 'translateY(22px) rotate(-6deg) scale(.9)' },
      { offset: .73, opacity: 1, transform: 'translateY(-5px) rotate(2deg) scale(1.025)' },
      { offset: .77, opacity: 1, transform: 'translateY(1px) rotate(-.6deg) scale(.995)' },
      { offset: .81, opacity: 1, transform: 'translateY(0) rotate(0) scale(1)' },
      { offset: .87, opacity: 1, transform: 'translateY(-3px) rotate(.5deg) scale(1)' },
      { offset: .93, opacity: 1, transform: 'translateY(0) rotate(0) scale(1)' },
      { offset: .97, opacity: 0, transform: 'translateY(-8px) rotate(2deg) scale(.98)' },
      { offset: 1, opacity: 0, transform: 'translateY(22px) rotate(-6deg) scale(.9)' },
    ])
    animate(container.querySelector('.finished-tick'), [
      { offset: 0, opacity: 0, transform: 'scale(.4)' },
      { offset: .75, opacity: 0, transform: 'scale(.4)' },
      { offset: .79, opacity: 1, transform: 'scale(1.15)' },
      { offset: .82, opacity: 1, transform: 'scale(1)' },
      { offset: .96, opacity: 1, transform: 'scale(1)' },
      { offset: 1, opacity: 0, transform: 'scale(.4)' },
    ])
    container.querySelectorAll('.finish-sparkle').forEach(sparkle => {
      animate(sparkle, [
        { offset: 0, opacity: 0, transform: 'translateY(5px) scale(.4) rotate(-25deg)' },
        { offset: .72, opacity: 0, transform: 'translateY(5px) scale(.4) rotate(-25deg)' },
        { offset: .78, opacity: .8, transform: 'translateY(-3px) scale(1.1) rotate(8deg)' },
        { offset: .84, opacity: .55, transform: 'translateY(0) scale(.85) rotate(0)' },
        { offset: .90, opacity: .55, transform: 'translateY(0) scale(.85) rotate(0)' },
        { offset: .96, opacity: 0, transform: 'translateY(5px) scale(.4) rotate(-25deg)' },
      ])
    })

    // 3. Captions
    animate(container.querySelector('.caption-season'), [
      { offset: 0, opacity: 1, transform: 'translateY(0)' },
      { offset: .195, opacity: 1, transform: 'translateY(0)' },
      { offset: .215, opacity: 0, transform: 'translateY(-3px)' },
      { offset: .97, opacity: 0, transform: 'translateY(-3px)' },
      { offset: 1, opacity: 1, transform: 'translateY(0)' },
    ])
    animate(container.querySelector('.caption-select'), [
      { offset: 0, opacity: 0, transform: 'translateY(3px)' },
      { offset: .21, opacity: 0, transform: 'translateY(3px)' },
      { offset: .23, opacity: 1, transform: 'translateY(0)' },
      { offset: .30, opacity: 1, transform: 'translateY(0)' },
      { offset: .33, opacity: 0, transform: 'translateY(3px)' },
      { offset: 1, opacity: 0, transform: 'translateY(3px)' },
    ])
    animate(container.querySelector('.caption-mix'), [
      { offset: 0, opacity: 0, transform: 'translateY(3px)' },
      { offset: .32, opacity: 0, transform: 'translateY(3px)' },
      { offset: .37, opacity: 1, transform: 'translateY(0)' },
      { offset: .62, opacity: 1, transform: 'translateY(0)' },
      { offset: .68, opacity: 0, transform: 'translateY(3px)' },
      { offset: 1, opacity: 0, transform: 'translateY(3px)' },
    ])
    animate(container.querySelector('.caption-ready'), [
      { offset: 0, opacity: 0, transform: 'translateY(3px)' },
      { offset: .68, opacity: 0, transform: 'translateY(3px)' },
      { offset: .74, opacity: 1, transform: 'translateY(0)' },
      { offset: .94, opacity: 1, transform: 'translateY(0)' },
      { offset: .97, opacity: 0, transform: 'translateY(3px)' },
      { offset: 1, opacity: 0, transform: 'translateY(3px)' },
    ])

    // 4. Ingredient checkmarks & border pulses
    const ingredientTimings = [
      { on: .013, tick: .023, settle: .033 },
      { on: .072, tick: .082, settle: .092 },
      { on: .138, tick: .148, settle: .158 },
      { on: .207, tick: .217, settle: .227 },
    ]
    ingredientTimings.forEach(({ on, tick, settle }, i) => {
      animate(container.querySelector(`.ingredient-${i} .ingredient-tick`), [
        { offset: 0, opacity: 0, transform: 'scale(.5)' },
        { offset: on, opacity: 0, transform: 'scale(.5)' },
        { offset: tick, opacity: 1, transform: 'scale(1.18)' },
        { offset: settle, opacity: 1, transform: 'scale(1)' },
        { offset: .94, opacity: 1, transform: 'scale(1)' },
        { offset: 1, opacity: 0, transform: 'scale(.5)' },
      ])
      animate(container.querySelector(`.ingredient-${i} .ingredient-photo`), [
        { offset: 0, borderColor: '#e4dfe7', transform: 'translateY(0)' },
        { offset: on, borderColor: '#e4dfe7', transform: 'translateY(0)' },
        { offset: tick, borderColor: '#9276a4', transform: 'translateY(-3px)' },
        { offset: settle, borderColor: '#9276a4', transform: 'translateY(0)' },
        { offset: .94, borderColor: '#9276a4', transform: 'translateY(0)' },
        { offset: 1, borderColor: '#e4dfe7', transform: 'translateY(0)' },
      ])
    })
  }

  mixBears.forEach((bear, index) => {
    const keyframes: Keyframe[] = []
    const startOffset = bear.start / seconds
    const firstBody = frames[0].bears[index]
    const initialTransform = transform(180 + firstBody.x, screenY(firstBody.y, firstBody.z))
    keyframes.push({ offset: 0, transform: initialTransform, opacity: 0 })
    if (startOffset > 0.002) {
      keyframes.push({ offset: (bear.start - 0.001) / seconds, transform: initialTransform, opacity: 0 })
    }
    for (const frame of frames) {
      if (frame.time < bear.start) continue
      const body = frame.bears[index]
      keyframes.push({
        offset: frame.time / seconds,
        transform: transform(180 + body.x, screenY(body.y, body.z)),
        opacity: body.active ? 1 : 0,
      })
    }
    const lastBody = frames.at(-1)!.bears[index]
    const lastTransform = transform(180 + lastBody.x, screenY(lastBody.y, lastBody.z))
    keyframes.push({ offset: 10.35 / seconds, transform: lastTransform, opacity: 0 })
    keyframes.push({ offset: 1, transform: initialTransform, opacity: 0 })
    animate(svg.querySelector(`[data-bear="${index}"]`), keyframes)

    const shadowKeyframes: Keyframe[] = []
    const firstFeet = firstBody.lobes[2]
    const initialAltitude = Math.max(0, firstFeet.y - floorHeight(firstFeet.x, firstFeet.z) - GEL_RADII[2])
    const initialShadowTransform = transform(180 + firstBody.x, screenY(floorHeight(firstBody.x, firstBody.z), firstBody.z), 0, 1 - Math.min(initialAltitude / 400, .5), .75)
    shadowKeyframes.push({ offset: 0, transform: initialShadowTransform, opacity: 0 })
    if (startOffset > 0.002) {
      shadowKeyframes.push({ offset: (bear.start - 0.001) / seconds, transform: initialShadowTransform, opacity: 0 })
    }
    for (const frame of frames) {
      if (frame.time < bear.start) continue
      const body = frame.bears[index]
      const feet = body.lobes[2]
      const altitude = Math.max(0, feet.y - floorHeight(feet.x, feet.z) - GEL_RADII[2])
      shadowKeyframes.push({
        offset: frame.time / seconds,
        transform: transform(180 + body.x, screenY(floorHeight(body.x, body.z), body.z), 0, 1 - Math.min(altitude / 400, .5), .75),
        opacity: Math.max(0, .24 - altitude / 450),
      })
    }
    const lastFeet = lastBody.lobes[2]
    const lastAltitude = Math.max(0, lastFeet.y - floorHeight(lastFeet.x, lastFeet.z) - GEL_RADII[2])
    const lastShadowTransform = transform(180 + lastBody.x, screenY(floorHeight(lastBody.x, lastBody.z), lastBody.z), 0, 1 - Math.min(lastAltitude / 400, .5), .75)
    shadowKeyframes.push({ offset: 10.35 / seconds, transform: lastShadowTransform, opacity: 0 })
    shadowKeyframes.push({ offset: 1, transform: initialShadowTransform, opacity: 0 })
    animate(svg.querySelector(`[data-bear-shadow="${index}"]`), shadowKeyframes)
  })
  animate(svg.querySelector('.spoon-motion'), frames.map(frame => ({ offset: frame.time / seconds, transform: transform(180 + frame.spoon.x, screenY(frame.spoon.y, frame.spoon.z)), opacity: frame.spoon.opacity })))
  animate(svg.querySelector('.spoon-head'), frames.map(frame => ({ offset: frame.time / seconds, transform: transform(0, 0, frame.spoon.angle, 1, frame.spoon.headScale) })))

  envelope('.sauce-pool', [
    [0, 0, 'scale(.4, .4)'],
    [.28, 0, 'scale(.4, .4)'],
    [.55, 1, 'scale(.65, .65)'],
    [.85, 1, 'scale(.92, .92)'],
    [1.2, 1, 'scale(1, 1)'],
    [10.3, 1, 'scale(1, 1)'],
    [10.35, 0, 'scale(.4, .4)'],
    [seconds, 0, 'scale(.4, .4)'],
  ])
  envelope('.tajin-sediment', [
    [0, 0],
    [1.25, 0],
    [1.9, 1],
    [10.3, 1],
    [10.35, 0],
    [seconds, 0],
  ])
  envelope('.chamoy-bottle', [[0, 0, 'translate(-12px, -18px) rotate(-8deg)'], [.15, 0, 'translate(-12px, -18px) rotate(-8deg)'], [.28, 1, 'translate(0px, 0px) rotate(0deg)'], [.8, 1, 'translate(0px, 0px) rotate(0deg)'], [.95, 0, 'translate(-10px, -20px) rotate(12deg)']])
  envelope('.chamoy-flow', [[0, 0], [.26, 0], [.34, 1], [.78, 1], [.9, 0]])
  animate(svg.querySelector('.chamoy-stream'), [{ offset: 0, strokeDashoffset: '1' }, { offset: .26 / seconds, strokeDashoffset: '1' }, { offset: .45 / seconds, strokeDashoffset: '0' }, { offset: .78 / seconds, strokeDashoffset: '0' }, { offset: .9 / seconds, strokeDashoffset: '-1' }])
  envelope('.tajin-shaker', [[0, 0, 'translate(10px, -20px) rotate(0deg)'], [1.05, 0, 'translate(10px, -20px) rotate(0deg)'], [1.18, 1, 'translate(0px, 0px) rotate(0deg)'], [1.26, 1, 'translate(-3px, 4px) rotate(-8deg)'], [1.34, 1, 'translate(2px, -3px) rotate(6deg)'], [1.42, 1, 'translate(-3px, 4px) rotate(-8deg)'], [1.5, 1, 'translate(2px, -3px) rotate(6deg)'], [1.58, 1, 'translate(-3px, 4px) rotate(-8deg)'], [1.66, 1, 'translate(2px, -3px) rotate(6deg)'], [1.74, 1, 'translate(-2px, 3px) rotate(-6deg)'], [1.82, 1, 'translate(0px, 0px) rotate(0deg)'], [1.95, 0, 'translate(15px, -20px) rotate(10deg)']])
  envelope('.limon-bottle', [[0, 0, 'translate(8px, -18px) rotate(-9deg)'], [2.05, 0, 'translate(8px, -18px) rotate(-9deg)'], [2.2, 1, 'translate(0px, 0px) rotate(0deg)'], [2.37, 1, 'translate(0px, 0px) rotate(-2.5deg)'], [2.65, 1, 'translate(0px, 0px) rotate(-1deg)'], [2.83, 1, 'translate(0px, 0px) rotate(7deg)'], [3.06, 0, 'translate(8px, -22px) rotate(16deg)']])

  for (let index = 0; index < 32; index++) {
    const begin = 1.22 + index * .016
    const duration = .28 + (index % 4) * .02
    const startX = 229 + (index % 4) * 2, startY = 82
    const endX = 133 + ((index * 37) % 106), endY = 201 + ((index * 7) % 14)
    const keyframes: Keyframe[] = [{ offset: 0, opacity: 0, transform: transform(startX, startY) }, { offset: (begin - .001) / seconds, opacity: 0, transform: transform(startX, startY) }]
    for (let step = 0; step <= 12; step++) {
      const progress = step / 12
      keyframes.push({ offset: (begin + progress * duration) / seconds, opacity: step === 12 ? 0 : 1, transform: transform(startX + (endX - startX) * progress, startY + (endY - startY) * progress * progress, index * 23) })
    }
    animate(svg.querySelectorAll('.tajin-grain')[index], keyframes)
  }

  // A real depth order, including the entire spoon, replaces front/back duplicates.
  const contents = svg.querySelector('.mix-contents')!
  const nodes = [...mixBears.map((_, index) => svg.querySelector(`[data-bear="${index}"]`)!), svg.querySelector('.spoon-motion')!]
  const patches = mixBears.map((_, index) => PRECOMPUTED_TRIANGLES.map((triangleInfo, patch) => ({
    node: svg.querySelector<SVGGraphicsElement>(`[data-gel-patch="${index}-${patch}"]`)!,
    triangleInfo,
    lastTransform: '',
  })))
  const menisci = mixBears.map((_, index) => svg.querySelector(`[data-meniscus="${index}"]`)!)
  const sauceCuts = mixBears.map((_, index) => svg.querySelector(`[data-sauce-cut="${index}"]`)!)
  const surface = svg.querySelector('.liquid-surface')!
  const rings = [...svg.querySelectorAll('.impact-ring')]
  const beads = [...svg.querySelectorAll('.sauce-bead')]
  const grains = [...svg.querySelectorAll('.tajin-sediment ellipse')]
  const wakes = [svg.querySelector('.spoon-wake')!, svg.querySelector('.spoon-wake-inner')!]
  const fold = svg.querySelector('.sauce-fold')!
  const mound = svg.querySelector('.spoon-mound')!, moundGlint = svg.querySelector('.spoon-mound-glint')!
  const contours = [...svg.querySelectorAll('.sauce-contour')]
  const handle = svg.querySelector('.spoon-handle')!, handleGlint = svg.querySelector('.spoon-handle-glint')!
  const spoonDrip = svg.querySelector('.spoon-drip')!, spoonCoating = svg.querySelector('.spoon-coating')!

  // Pre-sort contents by initial z so children start in correct depth order without runtime DOM thrashing
  const currentOrder = nodes.map((_, i) => i)
  const initialZ = (i: number) => i === mixBears.length ? 0 : mixBears[i].z
  currentOrder.sort((a, b) => initialZ(a) - initialZ(b))
  currentOrder.forEach(idx => contents.appendChild(nodes[idx]))

  const drawLemonPour = createLemonPour(svg)

  const SURFACE_ANGLES = Array.from({ length: 64 }, (_, i) => {
    const angle = i / 64 * Math.PI * 2
    return { x: Math.cos(angle) * 102, z: Math.sin(angle) * 102 }
  })
  const CONTOUR_ROWS = [0, 1, 2, 3, 4].map(row => {
    const depth = -56 + row * 27, radius = Math.sqrt(94 ** 2 - depth ** 2)
    const xs = Array.from({ length: 23 }, (_, i) => -radius + i / 22 * radius * 2)
    return { depth, xs }
  })

  const bridges = [...svg.querySelectorAll('[data-bridge]')].map(node => ({
    node,
    indices: node.getAttribute('data-bridge')!.split('-').map(Number),
    edges: [...node.querySelectorAll('path')],
    lastOpacity: 0,
    lastD0: '',
    lastD1: '',
  }))

  const path = (points: number[][], close = false) => `${points.map(([x, y], index) => `${index ? 'L' : 'M'}${round(x)} ${round(y)}`).join(' ')}${close ? 'Z' : ''}`
  const grainLastX = new Array<number>(grains.length).fill(-9999)
  const grainLastY = new Array<number>(grains.length).fill(-9999)
  const contourLastOp = new Array<number>(contours.length).fill(-1)
  const meniscusLastOp = new Array<number>(mixBears.length).fill(-1)
  const meniscusLastTrans = new Array<string>(mixBears.length).fill('')
  const cutLastY = new Array<number>(mixBears.length).fill(-9999)
  const beadLastOp = new Array<number>(beads.length).fill(-1)
  let lastSurfaceD = ''
  let ringsActive = false
  let spoonActive = false
  let request = 0

  // Pre-allocated reusable structures to eliminate frame GC allocations
  const depths = new Float64Array(nodes.length)
  const interpolatedMesh: Point2[] = Array.from({ length: 10 }, () => ({ x: 0, y: 0 }))
  const poses = mixBears.map(() => ({
    x: 0, y: 0, z: 0, active: false, wetLine: 0,
    feet: { x: 0, y: 0, z: 0 },
  }))

  const sortDepth = () => {
    const master = animations[0]
    if (!master) return
    const time = (Number(master.currentTime) % MIX_CYCLE) / 1000

    // Before bears enter (< 3.2s) or after mixing finishes (> 10.35s), reset patches and bridges so the bowl stays pristine
    if (time < 3.2 || time > 10.35) {
      for (let i = 0; i < mixBears.length; i++) {
        const bearPatches = patches[i]
        for (let p = 0; p < bearPatches.length; p++) {
          const bp = bearPatches[p]
          if (bp.lastTransform !== '') {
            bp.lastTransform = ''
            bp.node.removeAttribute('transform')
          }
        }
      }
      bridges.forEach(bridge => {
        if (bridge.lastOpacity !== 0) {
          bridge.lastOpacity = 0
          bridge.node.setAttribute('opacity', '0')
        }
      })
      if (time > 10.35) {
        if (running) request = requestAnimationFrame(sortDepth)
        return
      }
    }

    const index = Math.min(Math.floor(time * SAMPLE_RATE), frames.length - 1)
    const frame = frames[index], next = frames[Math.min(index + 1, frames.length - 1)]
    const progress = clamp((time - frame.time) * SAMPLE_RATE)
    const z = (i: number) => {
      const a = i === mixBears.length ? frame.spoon.z : frame.bears[i].z
      const b = i === mixBears.length ? next.spoon.z : next.bears[i].z
      return a + (b - a) * progress
    }

    for (let i = 0; i < nodes.length; i++) depths[i] = z(i)

    const sauceHeight = (x: number, z: number) => {
      const a = sampleSurface(frame.surface, x, z), b = sampleSurface(next.surface, x, z)
      return a + (b - a) * progress
    }
    const sauceY = (x: number, z: number) => screenY(sauceHeight(x, z), z)
    drawLemonPour(time, x => sauceY(x - 180, 0))

    for (let i = 0; i < mixBears.length; i++) {
      const body = frame.bears[i], nextBody = next.bears[i]
      const pose = poses[i]
      pose.x = body.x + (nextBody.x - body.x) * progress
      pose.y = body.y + (nextBody.y - body.y) * progress
      pose.z = depths[i]
      pose.active = body.active
      pose.wetLine = body.wetLine + (nextBody.wetLine - body.wetLine) * progress
      pose.feet.x = body.lobes[2].x + (nextBody.lobes[2].x - body.lobes[2].x) * progress
      pose.feet.y = body.lobes[2].y + (nextBody.lobes[2].y - body.lobes[2].y) * progress
      pose.feet.z = body.lobes[2].z + (nextBody.lobes[2].z - body.lobes[2].z) * progress
    }

    // Depth sorting with screen overlap check: avoids DOM thrashing while bears fall
    let orderChanged = false
    for (let i = 1; i < currentOrder.length; i++) {
      let j = i
      while (j > 0) {
        const prev = currentOrder[j - 1], curr = currentOrder[j]
        if (depths[curr] < depths[prev] - 1.5) {
          const actPrev = prev === mixBears.length ? frame.spoon.opacity > 0.05 : poses[prev].active
          const actCurr = curr === mixBears.length ? frame.spoon.opacity > 0.05 : poses[curr].active
          if (actPrev && actCurr) {
            const xPrev = prev === mixBears.length ? frame.spoon.x : poses[prev].x
            const yPrev = prev === mixBears.length ? frame.spoon.y : poses[prev].y
            const xCurr = curr === mixBears.length ? frame.spoon.x : poses[curr].x
            const yCurr = curr === mixBears.length ? frame.spoon.y : poses[curr].y
            if (Math.abs(xPrev - xCurr) < 32 && Math.abs(yPrev - yCurr) < 40) {
              currentOrder[j - 1] = curr
              currentOrder[j] = prev
              orderChanged = true
              j--
              continue
            }
          }
        }
        break
      }
    }
    if (orderChanged) {
      currentOrder.forEach((idx, i) => {
        const node = nodes[idx]
        if (contents.children[i] !== node) contents.insertBefore(node, contents.children[i] ?? null)
      })
    }

    // Update bears patches, sauce cuts, and menisci
    for (let i = 0; i < mixBears.length; i++) {
      const body = poses[i]
      if (body.active) {
        const fromMesh = frame.bears[i].mesh, toMesh = next.bears[i].mesh
        for (let j = 0; j < 10; j++) {
          interpolatedMesh[j].x = fromMesh[j].x + (toMesh[j].x - fromMesh[j].x) * progress
          interpolatedMesh[j].y = fromMesh[j].y + (toMesh[j].y - fromMesh[j].y) * progress
        }
        const bearPatches = patches[i]
        for (let p = 0; p < bearPatches.length; p++) {
          const bp = bearPatches[p]
          const matrix = warpFast(bp.triangleInfo, interpolatedMesh)
          if (bp.lastTransform !== matrix) {
            bp.lastTransform = matrix
            bp.node.setAttribute('transform', matrix)
          }
        }
      }
      const { x, y, z: depth } = body
      const sHeight = (time >= 1.0 && time < 4.10) ? LIQUID_LEVEL : sauceHeight(x, depth)
      const line = y - sHeight
      const cutY = round(line)
      if (cutLastY[i] !== cutY) {
        cutLastY[i] = cutY
        sauceCuts[i].setAttribute('y', String(cutY))
      }
      const activeMeniscus = body.active && line <= GUMMY_RADIUS && line >= -20
      const op = activeMeniscus ? round(smooth((GUMMY_RADIUS - line) / 6) * smooth((line + 20) / 6) * .88) : 0
      if (meniscusLastOp[i] !== op) {
        meniscusLastOp[i] = op
        menisci[i].setAttribute('opacity', String(op))
      }
      if (op > 0) {
        const width = Math.min(11, Math.sqrt(Math.max(0, GUMMY_RADIUS ** 2 - line * line)) * .7)
        const trans = `translate(0 ${round(line)}) scale(${round(width / 10)} 1)`
        if (meniscusLastTrans[i] !== trans) {
          meniscusLastTrans[i] = trans
          menisci[i].setAttribute('transform', trans)
        }
      }
    }

    if (time >= 4.10) {
      bridges.forEach(bridge => {
        const [a, b] = bridge.indices
        if (!poses[a]?.active || !poses[b]?.active) {
          if (bridge.lastOpacity !== 0) {
            bridge.lastOpacity = 0
            bridge.node.setAttribute('opacity', '0')
          }
          return
        }
        const from = poses[a].feet, to = poses[b].feet
        const dx = to.x - from.x, dz = to.z - from.z
        if (Math.abs(dx) > 27 || Math.abs(dz) > 27) {
          if (bridge.lastOpacity !== 0) {
            bridge.lastOpacity = 0
            bridge.node.setAttribute('opacity', '0')
          }
          return
        }
        const distance = Math.hypot(dx, dz)
        if (distance > 27) {
          if (bridge.lastOpacity !== 0) {
            bridge.lastOpacity = 0
            bridge.node.setAttribute('opacity', '0')
          }
          return
        }
        const immersed = smooth((sauceHeight(from.x, from.z) - from.y + GEL_RADII[2]) / 8) * smooth((sauceHeight(to.x, to.z) - to.y + GEL_RADII[2]) / 8)
        if (immersed === 0) {
          if (bridge.lastOpacity !== 0) {
            bridge.lastOpacity = 0
            bridge.node.setAttribute('opacity', '0')
          }
          return
        }
        const proximity = 1 - smooth((distance - 17) / 10)
        const opacity = round(proximity * immersed * .8)
        if (bridge.lastOpacity !== opacity) {
          bridge.lastOpacity = opacity
          bridge.node.setAttribute('opacity', String(opacity))
        }
        if (opacity === 0) return
        const nx = dx / (distance || 1), nz = dz / (distance || 1)
        const ax = from.x + nx * 7.5, az = from.z + nz * 7.5, bx = to.x - nx * 7.5, bz = to.z - nz * 7.5
        const ay = sauceY(ax, az), by = sauceY(bx, bz)
        const middle = round(180 + (ax + bx) / 2), height = (ay + by) / 2, width = 1 + proximity * 3
        const d0 = `M${round(180 + ax)} ${round(ay - 3)}Q${middle} ${round(height - width)} ${round(180 + bx)} ${round(by - 3)}L${round(180 + bx)} ${round(by + 3)}Q${middle} ${round(height + width)} ${round(180 + ax)} ${round(ay + 3)}Z`
        const d1 = `M${round(180 + ax)} ${round(ay - 2)}Q${middle} ${round(height - width + 1)} ${round(180 + bx)} ${round(by - 2)}`
        if (bridge.lastD0 !== d0) { bridge.lastD0 = d0; bridge.edges[0].setAttribute('d', d0) }
        if (bridge.lastD1 !== d1) { bridge.lastD1 = d1; bridge.edges[1].setAttribute('d', d1) }
      })
    }

    if (time >= 0.28) {
      let surfaceD = ''
      for (let i = 0; i < 64; i++) {
        const { x, z } = SURFACE_ANGLES[i]
        surfaceD += `${i ? ' L' : 'M'}${round(180 + x)} ${round(sauceY(x, z))}`
      }
      surfaceD += 'Z'
      if (surfaceD !== lastSurfaceD) {
        lastSurfaceD = surfaceD
        surface.setAttribute('d', surfaceD)
      }

      if (time < 1.0 || time >= 4.10) {
        contours.forEach((contour, row) => {
          const { depth, xs } = CONTOUR_ROWS[row]
          let relief = 0, drawing = false, line = ''
          for (let i = 0; i < 23; i++) {
            const x = xs[i]
            const height = sauceHeight(x, depth) - LIQUID_LEVEL
            relief = Math.max(relief, height)
            if (height < .8) { drawing = false; continue }
            line += `${drawing ? 'L' : 'M'}${round(180 + x)} ${round(sauceY(x, depth) + 1)} `
            drawing = true
          }
          const op = round(smooth(relief / 6) * .22)
          if (contourLastOp[row] !== op) {
            contourLastOp[row] = op
            contour.setAttribute('opacity', String(op))
          }
          if (op > 0) contour.setAttribute('d', line)
        })
      }
    }

    if (time >= 5.0 && time <= 10.2) {
      spoonActive = true
      const tool = frame.spoon, nextTool = next.spoon
      const sx = tool.x + (nextTool.x - tool.x) * progress, sy = tool.y + (nextTool.y - tool.y) * progress, sz = z(mixBears.length)
      const gx = tool.grip.x + (nextTool.grip.x - tool.grip.x) * progress - sx
      const gy = screenY(tool.grip.y + (nextTool.grip.y - tool.grip.y) * progress, tool.grip.z + (nextTool.grip.z - tool.grip.z) * progress) - screenY(sy, sz)
      const length = Math.hypot(gx, gy), nx = -gy / length, ny = gx / length
      handle.setAttribute('d', `M${round(-nx * 3)} ${round(-ny * 3)}L${round(gx - nx * 3.5)} ${round(gy - ny * 3.5)}Q${round(gx * 1.035)} ${round(gy * 1.035)} ${round(gx + nx * 3.5)} ${round(gy + ny * 3.5)}L${round(nx * 3)} ${round(ny * 3)}Z`)
      handleGlint.setAttribute('d', `M${round(gx * .16 + nx)} ${round(gy * .16 + ny)}L${round(gx * .96 + nx)} ${round(gy * .96 + ny)}`)
      spoonCoating.setAttribute('opacity', String(round(smooth((time - 5.5) / .4) * .96)))
      const lift = sy - sauceHeight(sx, sz) - 11, neck = 3.6 * (1 - smooth(lift / 34))
      const bottom = sauceY(sx, sz) - screenY(sy, sz)
      spoonDrip.setAttribute('opacity', lift > 0 && lift < 34 && time > 9.5 ? '.9' : '0')
      spoonDrip.setAttribute('d', `M-3 10Q${round(-neck)} ${round(bottom * .6)} -6 ${round(bottom)}Q0 ${round(bottom + 3)} 6 ${round(bottom)}Q${round(neck)} ${round(bottom * .6)} 3 10Z`)
      const priorTool = spoonAt(time - .04), vx = sx - priorTool.x, vz = sz - priorTool.z, speed = Math.hypot(vx, vz) || 1
      const direction = { x: vx / speed, z: vz / speed }
      const lip = Array.from({ length: 19 }, (_, i) => {
        const across = (i / 18 - .5) * 40, forward = 12 - (across / 20) ** 2 * 5
        const x = sx + direction.x * forward - direction.z * across, z = sz + direction.z * forward + direction.x * across
        return [180 + x, sauceY(x, z) - 2 * (1 - (across / 20) ** 2)]
      })
      mound.setAttribute('d', path([...lip, ...lip.map(([x, y]) => [x, y + 4]).reverse()], true))
      moundGlint.setAttribute('d', path(lip.slice(3, -3)))
      const gathered = stirStrength(time) * smooth(speed / 1.2) * smooth((sauceHeight(sx, sz) + 12 - sy) / 16)
      mound.setAttribute('opacity', String(round(gathered * .85)))
      moundGlint.setAttribute('opacity', String(round(gathered * .4)))

      const trail = Array.from({ length: 33 }, (_, i) => {
        const lag = i * .035
        const point = spoonAt(time - lag), before = spoonAt(time - lag - .025)
        const dx = point.x - before.x, dz = point.z - before.z, sp = Math.hypot(dx, dz) || 1
        return { ...point, nx: -dz / sp, nz: dx / sp, width: 9 * (1 - smooth(i / 32)) * stirStrength(time - lag) }
      })
      const edge = (side: number) => trail.map(point => {
        const x = point.x + point.nx * point.width * side, z = point.z + point.nz * point.width * side
        return [180 + x, sauceY(x, z)]
      })
      fold.setAttribute('d', path([...edge(-1), ...edge(1).reverse()], true))
      const foldOpacity = stirStrength(time - .4)
      fold.setAttribute('opacity', String(round(foldOpacity * .94)))
      wakes[0].setAttribute('d', path(edge(1)))
      wakes[1].setAttribute('d', path(trail.map(point => [180 + point.x, sauceY(point.x, point.z) + 1])))
      wakes[0].setAttribute('opacity', String(round(foldOpacity * .5)))
      wakes[1].setAttribute('opacity', String(round(foldOpacity * .35)))
    } else if (spoonActive) {
      spoonActive = false
      fold.setAttribute('opacity', '0')
      wakes[0].setAttribute('opacity', '0')
      wakes[1].setAttribute('opacity', '0')
      mound.setAttribute('opacity', '0')
      moundGlint.setAttribute('opacity', '0')
      spoonDrip.setAttribute('opacity', '0')
    }

    const recent = (time >= 4.09 && time <= 8.5) ? impacts.filter(impact => time >= impact.time && time - impact.time < 2.6).slice(-6) : []
    if (recent.length > 0 || ringsActive) {
      ringsActive = recent.length > 0
      rings.forEach((ring, i) => {
        const impact = recent[i]
        if (!impact) { ring.setAttribute('opacity', '0'); return }
        const age = time - impact.time, radius = 14 + age * .5
        let ringD = ''
        for (let j = 0; j < 40; j++) {
          const angle = j / 39 * Math.PI, x = impact.x + Math.cos(angle) * radius, z = impact.z + Math.sin(angle) * radius
          ringD += `${j ? ' L' : 'M'}${round(180 + x)} ${round(sauceY(x, z))}`
        }
        ring.setAttribute('d', ringD)
        ring.setAttribute('opacity', String(round(smooth(age / .09) * Math.exp(-age * 1.35) * (1 - smooth((age - 1.8) / .8)) * impact.energy * .38)))
      })
      beads.forEach((bead, i) => {
        const impact = recent[Math.floor(i / 4)]
        if (!impact) {
          if (beadLastOp[i] !== 0) { beadLastOp[i] = 0; bead.setAttribute('opacity', '0') }
          return
        }
        const age = time - impact.time - (i % 4) * .025
        if (age < 0 || age >= .65) {
          if (beadLastOp[i] !== 0) { beadLastOp[i] = 0; bead.setAttribute('opacity', '0') }
          return
        }
        const swell = Math.sin(Math.PI * age / .65) * impact.energy
        const op = round(swell * .5)
        if (beadLastOp[i] !== op) {
          beadLastOp[i] = op
          bead.setAttribute('opacity', String(op))
        }
        if (op > 0) {
          const angle = i * 2.39996, distance = 16 + age * 3
          const x = impact.x + Math.cos(angle) * distance, z = impact.z + Math.sin(angle) * distance
          bead.setAttribute('transform', `translate(${round(180 + x)} ${round(sauceY(x, z) - swell)}) scale(${round(.65 + swell * .35)})`)
        }
      })
    }

    if (time >= 1.25) {
      grains.forEach((grain, i) => {
        const from = frame.grains[i], to = next.grains[i]
        const x = round(180 + from.x + (to.x - from.x) * progress)
        const z = from.z + (to.z - from.z) * progress
        const y = round(sauceY(x - 180, z))
        if (grainLastX[i] !== x) {
          grainLastX[i] = x
          grain.setAttribute('cx', String(x))
        }
        if (grainLastY[i] !== y) {
          grainLastY[i] = y
          grain.setAttribute('cy', String(y))
        }
      })
    }

    if (running) request = requestAnimationFrame(sortDepth)
  }

  return {
    animations,
    setRunning(value) {
      if (running === value) return
      running = value
      cancelAnimationFrame(request)
      if (value) {
        const master = animations[0]
        if (master) {
          if (!hasStarted) {
            animations.forEach(a => {
              a.currentTime = 0
              a.play()
            })
            hasStarted = true
          } else {
            const currentTime = master.currentTime
            animations.forEach(a => {
              if (a !== master) a.currentTime = currentTime
              a.play()
            })
            master.play()
          }
        }
        sortDepth()
      } else {
        animations.forEach(a => a.pause())
      }
    },
    dispose() {
      running = false
      cancelAnimationFrame(request)
      animations.forEach(animation => animation.cancel())
    },
  }
}
