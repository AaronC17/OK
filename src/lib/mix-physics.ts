import { createSauce, displaceSauce, sampleSurface, stepSauce } from './mix-sauce.ts'
export { LIQUID_LEVEL, sampleSurface } from './mix-sauce.ts'

/** Small viscoelastic bodies, sampled once and replayed on the shared playhead. */
export const MIX_CYCLE = 15_000
export const SAMPLE_RATE = 60
export const GUMMY_RADIUS = 19
export const GEL_RADII = [8.4, 11.0, 8.6] as const
export const GEL_CORE = .78
export const SPOON_RADIUS = 10.6
export const HANDLE_RADIUS = 3.5
export const BOWL_RADIUS = 112
export const SIMULATION_END = 10.3
export const SAUCE_GRAINS = 54
export const spineLength = 10.5

export const mixBears = [
  { image: 'amber',  start: 3.25,  x: -48, z: -34, angle: -22 },
  { image: 'ruby',   start: 3.29, x: 50,  z: 22,  angle: 24 },
  { image: 'citrus', start: 3.34,  x: -32, z: 38,  angle: -18 },
  { image: 'gold',   start: 3.38, x: 22,  z: -48, angle: 30 },
  { image: 'amber',  start: 3.43,  x: -56, z: 8,   angle: -26 },
  { image: 'ruby',   start: 3.48, x: 38,  z: 36,  angle: -22 },
  { image: 'citrus', start: 3.52,  x: 52,  z: -8,  angle: 16 },
  { image: 'gold',   start: 3.56, x: -8,  z: 50,  angle: -14 },
  { image: 'amber',  start: 3.61,  x: -36, z: -14, angle: -28 },
  { image: 'ruby',   start: 3.65, x: -24, z: -30, angle: 22 },
  { image: 'citrus', start: 3.70,  x: 32,  z: 6,   angle: 18 },
  { image: 'gold',   start: 3.75, x: -14, z: 26,  angle: 16 },
  { image: 'amber',  start: 3.79,  x: 16,  z: 28,  angle: -20 },
  { image: 'ruby',   start: 3.83, x: -4,  z: -20, angle: 26 },
  { image: 'citrus', start: 3.88,  x: -38, z: 12,  angle: -18 },
  { image: 'gold',   start: 3.92, x: 2,   z: -14, angle: 10 },
  { image: 'amber',  start: 3.97,  x: -12, z: -4,  angle: -15 },
  { image: 'ruby',   start: 4.01, x: 14,  z: 4,   angle: 16 },
  { image: 'citrus', start: 4.06,  x: -2,  z: 16,  angle: -12 },
] as const

export interface Point3 { x: number; y: number; z: number }
export interface Point2 { x: number; y: number }
export interface GelPose extends Point3 { squash: number; shear: number }
export interface BearPose extends Point3 { active: boolean; lobes: GelPose[]; mesh: Point2[]; wetLine: number }
export interface SpoonPose extends Point3 { grip: Point3; angle: number; headScale: number; opacity: number }
export interface SurfacePoint { x: number; z: number }
export interface MixFrame { time: number; bears: BearPose[]; spoon: SpoonPose; grains: SurfacePoint[]; surface: number[] }
export interface LiquidImpact { x: number; z: number; time: number; energy: number }
export interface MixSimulation { frames: MixFrame[]; impacts: LiquidImpact[] }
interface GelNode extends GelPose { vx: number; vy: number; vz: number; pressure: number; shearPressure: number; squashSpeed: number; shearSpeed: number }
interface Body { nodes: GelNode[]; angle: number; active: boolean; entered: boolean; wetLine: number }

export const clamp = (value: number) => Math.max(0, Math.min(1, value))
export const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t) }
const smoother = (value: number) => { const t = clamp(value); return t ** 3 * (10 + t * (-15 + 6 * t)) }
export const floorHeight = (x: number, z: number) => .0022 * (x * x + z * z)
export const stirStrength = (time: number) => smooth((time - 5.3) / .4) * (1 - smooth((time - 9.5) / .4))

// Uneven sweeping strokes: around the back, down the side, then fold inward.
// Height is a separate dip/lift, while the hand stays above the rim as a pivot.
const spoonStroke = [
  { time: 5.00, x: 65, z: -30, height: 125 },
  { time: 5.42, x: 44, z: -26, height: 23 },
  { time: 5.80, x: 1, z: -44, height: 21 },
  { time: 6.25, x: -46, z: -11, height: 18 },
  { time: 6.66, x: -19, z: 29, height: 19 },
  { time: 7.04, x: 23, z: 6, height: 27 },
  { time: 7.44, x: 41, z: -28, height: 23 },
  { time: 7.86, x: -7, z: -37, height: 19 },
  { time: 8.26, x: -32, z: 8, height: 20 },
  { time: 8.66, x: 1, z: 30, height: 22 },
  { time: 9.06, x: 35, z: 0, height: 25 },
  { time: 9.50, x: 38, z: 16, height: 32 },
  { time: 10.30, x: 48, z: 28, height: 126 },
]

// Clamped cubic splines keep velocity AND acceleration continuous through each
// sweep, so a quicker wrist motion does not kick at the waypoint boundaries.
function strokeCurvature(key: 'x' | 'z') {
  const count = spoonStroke.length
  const diagonal = Array<number>(count).fill(0), upper = Array<number>(count).fill(0)
  const lower = Array<number>(count).fill(0), result = Array<number>(count).fill(0)
  for (let i = 0; i < count; i++) {
    const a = spoonStroke[Math.max(0, i - 1)], b = spoonStroke[i], c = spoonStroke[Math.min(count - 1, i + 1)]
    const before = b.time - a.time, after = c.time - b.time
    diagonal[i] = 2 * (before + after); lower[i] = before; upper[i] = after
    result[i] = 6 * ((after ? (c[key] - b[key]) / after : 0) - (before ? (b[key] - a[key]) / before : 0))
  }
  for (let i = 1; i < count; i++) {
    const factor = lower[i] / diagonal[i - 1]
    diagonal[i] -= factor * upper[i - 1]; result[i] -= factor * result[i - 1]
  }
  result[count - 1] /= diagonal[count - 1]
  for (let i = count - 2; i >= 0; i--) result[i] = (result[i] - upper[i] * result[i + 1]) / diagonal[i]
  return result
}
const strokeCurves = { x: strokeCurvature('x'), z: strokeCurvature('z') }

export function spoonAt(time: number): SpoonPose {
  let index = spoonStroke.findIndex((point, i) => i < spoonStroke.length - 1 && time < spoonStroke[i + 1].time && time >= point.time)
  if (index < 0) index = time < spoonStroke[0].time ? 0 : spoonStroke.length - 2
  const a = spoonStroke[index], b = spoonStroke[index + 1]
  const duration = b.time - a.time, t = clamp((time - a.time) / duration)
  const curve = (key: 'x' | 'z') => {
    const start = strokeCurves[key][index], end = strokeCurves[key][index + 1], h = duration ** 2 / 6
    return start * (1 - t) ** 3 * h + end * t ** 3 * h + (a[key] - start * h) * (1 - t) + (b[key] - end * h) * t
  }
  const x = curve('x'), z = curve('z'), y = floorHeight(x, z) + a.height + (b.height - a.height) * smoother(t)
  const gripX = 26 + x * .12, gripZ = -26 + z * .14
  const grip = { x: gripX, z: gripZ, y: y + Math.sqrt(116 ** 2 - (gripX - x) ** 2 - (gripZ - z) ** 2) }
  const screenDX = grip.x - x, screenDY = (grip.z - z) * .34 - (grip.y - y)
  return { x, y, z, grip, angle: Math.atan2(screenDX, -screenDY) * 180 / Math.PI, headScale: Math.hypot(screenDX, screenDY) / 116, opacity: smooth((time - 5.0) / .25) * (1 - smooth((time - 9.95) / .35)) }
}

export const spoonHandleEnd = (spoon: SpoonPose): Point3 => spoon.grip

export function closestOnSegment(point: Point3, from: Point3, to: Point3): Point3 {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z
  const amount = clamp(((point.x - from.x) * dx + (point.y - from.y) * dy + (point.z - from.z) * dz) / (dx * dx + dy * dy + dz * dz || 1))
  return { x: from.x + dx * amount, y: from.y + dy * amount, z: from.z + dz * amount }
}

/** The oval head and narrow shaft use the same axis as their visible geometry. */
export function spoonContact(point: Point3, spoon: SpoonPose) {
  const axis = { x: (spoon.grip.x - spoon.x) / 116, y: (spoon.grip.y - spoon.y) / 116, z: (spoon.grip.z - spoon.z) / 116 }
  const along = (distance: number) => ({ x: spoon.x + axis.x * distance, y: spoon.y + axis.y * distance, z: spoon.z + axis.z * distance })
  const head = closestOnSegment(point, along(-6), along(6))
  const handle = closestOnSegment(point, along(10), spoon.grip)
  const distance = (other: Point3) => Math.hypot(point.x - other.x, point.y - other.y, point.z - other.z)
  return distance(head) - SPOON_RADIUS < distance(handle) - HANDLE_RADIUS ? { point: head, radius: SPOON_RADIUS } : { point: handle, radius: HANDLE_RADIUS }
}

export const GEL_MESH = [-20.5, -11.5, 0, 11.5, 20.5].flatMap(y => [-14, 14].map(x => ({ x, y })))
export const GEL_TRIANGLES = Array.from({ length: 4 }, (_, row) => {
  const a = row * 2
  return [[a, a + 1, a + 3], [a, a + 3, a + 2]]
}).flat()

function centre(nodes: Point3[]): Point3 {
  return { x: nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length, y: nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length, z: nodes.reduce((sum, node) => sum + node.z, 0) / nodes.length }
}

function pose(body: Body): BearPose {
  const origin = centre(body.nodes)
  const [head, torso, feet] = body.nodes
  const mesh = GEL_MESH.map(point => {
    const upper = point.y < 0
    const end = upper ? head : feet, amount = Math.abs(point.y) / 11.5
    const x = torso.x + (end.x - torso.x) * amount
    const y = torso.y + (end.y - torso.y) * amount
    const z = torso.z + (end.z - torso.z) * amount
    const tx = point.y === 0 ? (feet.x - head.x) / 2 : upper ? torso.x - head.x : feet.x - torso.x
    const ty = point.y === 0 ? ((feet.z - head.z) * .34 - (feet.y - head.y)) / 2 : upper ? (torso.z - head.z) * .34 - (torso.y - head.y) : (feet.z - torso.z) * .34 - (feet.y - torso.y)
    const length = Math.hypot(tx, ty) || spineLength
    const bulge = Math.max(.86, Math.min(1.2, Math.sqrt(spineLength / length)))
    const weight = Math.min(1, amount)
    const squash = torso.squash + (end.squash - torso.squash) * weight
    const shear = torso.shear + (end.shear - torso.shear) * weight
    const width = point.x * .92 * bulge
    const nx = ty / length, rawNy = -tx / length
    const ny = Math.max(-.32, Math.min(.32, rawNy))
    const txNorm = tx / length, tyNorm = ty / length
    return {
      x: x - origin.x + nx * width * (1 + squash) + txNorm * width * shear,
      y: (z - origin.z) * .34 - (y - origin.y) + ny * width * (1 - squash) + tyNorm * width * shear,
    }
  })
  return { ...origin, active: body.active, lobes: body.nodes.map(({ x, y, z, squash, shear }) => ({ x, y, z, squash, shear })), mesh, wetLine: body.wetLine }
}

function press(node: GelNode, nx: number, ny: number, nz: number, load: number) {
  const sy = nz * .34 - ny, length = Math.hypot(nx, sy) || 1
  const x = nx / length, y = sy / length
  node.pressure -= load * (x * x - y * y)
  node.shearPressure -= load * 2 * x * y
}

function spring(a: GelNode, b: GelNode, rest: number, dt: number) {
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z
  const length = Math.hypot(dx, dy, dz) || 1
  const closing = ((b.vx - a.vx) * dx + (b.vy - a.vy) * dy + (b.vz - a.vz) * dz) / length
  const force = ((length - rest) * 850 + closing * 24) * dt / length
  a.vx += dx * force; a.vy += dy * force; a.vz += dz * force
  b.vx -= dx * force; b.vy -= dy * force; b.vz -= dz * force
}

function softContact(node: GelNode, other: Point3, velocity: Point3, radius: number, dt: number, share = 1) {
  const dx = node.x - other.x, dy = node.y - other.y, dz = node.z - other.z
  const length = Math.hypot(dx, dy, dz) || .001
  const overlap = radius - length
  if (overlap < -2) return { x: 0, y: 0, z: 0 }
  const closing = Math.min(0, ((node.vx - velocity.x) * dx + (node.vy - velocity.y) * dy + (node.vz - velocity.z) * dz) / length)
  const impulse = (Math.max(0, overlap) * 650 - closing * 25 * smooth((overlap + 2) / 3)) * share * dt / length
  const change = { x: dx * impulse, y: dy * impulse, z: dz * impulse }
  node.vx += change.x; node.vy += change.y; node.vz += change.z
  press(node, dx, dy, dz, Math.min(.2, Math.max(0, overlap) * .038 - closing * .0004))
  return change
}

function separate(a: Point3, b: Point3, minimum: number, share: number) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z
  // Most candidate lobes do not touch. The profile's main hot path was taking
  // their square root ten times per simulation step just to apply zero force.
  // Leave borderline contacts to Math.hypot, preserving its floating-point path.
  if (dx * dx + dy * dy + dz * dz > minimum * minimum + 1e-8) return
  const length = Math.hypot(dx, dy, dz) || .001
  const correction = Math.max(0, minimum - length) / length
  a.x += dx * correction * share; a.y += dy * correction * share; a.z += dz * correction * share
  if (share < 1) { b.x -= dx * correction * (1 - share); b.y -= dy * correction * (1 - share); b.z -= dz * correction * (1 - share) }
}

export function simulateMix(): MixSimulation {
  const dt = 1 / 180
  const bodies: Body[] = mixBears.map(bear => {
    const angle = bear.angle * Math.PI / 180
    return { angle, active: false, entered: false, wetLine: 35, nodes: GEL_RADII.map((_, index) => {
      const height = (1 - index) * spineLength
      return { x: bear.x + Math.sin(angle) * height, y: 210 + Math.cos(angle) * height, z: bear.z, vx: 0, vy: -65, vz: 0, squash: 0, shear: 0, pressure: 0, shearPressure: 0, squashSpeed: 0, shearSpeed: 0 }
    }) }
  })
  const sauce = createSauce()
  const frames: MixFrame[] = [], impacts: LiquidImpact[] = []
  const grains = Array.from({ length: SAUCE_GRAINS }, (_, index) => {
    const angle = index * 2.39996, radius = Math.sqrt((index + .5) / SAUCE_GRAINS) * 95
    return { x: Math.cos(angle) * radius, z: Math.sin(angle) * radius }
  })
  for (let step = 0; step <= Math.round(SIMULATION_END / dt); step++) {
    const time = step * dt, spoon = spoonAt(time), priorSpoon = spoonAt(time - dt)
    const toolVelocity = { x: (spoon.x - priorSpoon.x) / dt, y: (spoon.y - priorSpoon.y) / dt, z: (spoon.z - priorSpoon.z) / dt }
    stepSauce(sauce, spoon, toolVelocity.x, toolVelocity.z, stirStrength(time), dt)
    const previous = bodies.map(body => body.nodes.map(node => ({ x: node.x, y: node.y, z: node.z })))
    bodies.forEach((body, index) => {
      body.active = time >= mixBears[index].start
      if (!body.active) return
      const origin = centre(body.nodes)
      for (let j = 0; j < 3; j++) {
        const node = body.nodes[j], radius = GEL_RADII[j]
        node.pressure = 0; node.shearPressure = 0
        const surface = sampleSurface(sauce.height, node.x, node.z)
        const submerged = clamp((surface - node.y + radius) / (radius * 2))
        const flowX = sampleSurface(sauce.vx, node.x, node.z), flowZ = sampleSurface(sauce.vz, node.x, node.z)
        const drag = .75 + submerged * 40
        node.vx += ((flowX - node.vx) * drag - node.x * submerged * .8) * dt
        node.vz += ((flowZ - node.vz) * drag - node.z * submerged * .8 - (node.z - origin.z) * 65) * dt
        const airGravity = 400, fluidGravity = 150
        node.vy = (node.vy - (airGravity - submerged * (airGravity - fluidGravity)) * dt) * Math.exp(-(.65 + submerged * 38) * dt)
        const penetration = floorHeight(node.x, node.z) + radius - node.y
        if (penetration > -2) {
          node.vy += (Math.max(0, penetration) * 900 - Math.min(0, node.vy) * 35 * smooth((penetration + 2) / 3)) * dt
          press(node, 0, 1, 0, Math.min(.2, Math.max(0, penetration) * .05))
        }
      }
      const [head, torso, feet] = body.nodes
      spring(head, torso, spineLength, dt); spring(torso, feet, spineLength, dt)
      // The centre can bow while the head and feet lag independently.
      for (const [position, velocity] of [['x', 'vx'], ['y', 'vy'], ['z', 'vz']] as const) {
        const bend = (((head[position] + feet[position]) / 2 - torso[position]) * 240 + ((head[velocity] + feet[velocity]) / 2 - torso[velocity]) * 18) * dt
        torso[velocity] += bend; head[velocity] -= bend * .5; feet[velocity] -= bend * .5
      }
      const lean = body.angle + Math.max(-.4, Math.min(.4, sampleSurface(sauce.vx, origin.x, origin.z) * .0025))
      const torqueX = (Math.sin(lean) * spineLength * 2 - head.x + feet.x) * 60 * dt
      const torqueY = (Math.cos(lean) * spineLength * 2 - head.y + feet.y) * 60 * dt
      head.vx += torqueX; feet.vx -= torqueX; head.vy += torqueY; feet.vy -= torqueY
    })

    for (let a = 0; a < bodies.length; a++) {
      if (!bodies[a].active) continue
      for (let b = a + 1; b < bodies.length; b++) {
        if (!bodies[b].active) continue
        bodies[a].nodes.forEach((first, i) => bodies[b].nodes.forEach((second, j) => {
          const impulse = softContact(first, second, { x: second.vx, y: second.vy, z: second.vz }, GEL_RADII[i] + GEL_RADII[j], dt, .5)
          second.vx -= impulse.x; second.vy -= impulse.y; second.vz -= impulse.z
          press(second, second.x - first.x, second.y - first.y, second.z - first.z, Math.min(.18, Math.hypot(impulse.x, impulse.y, impulse.z) * .014))
        }))
      }
      bodies[a].nodes.forEach((node, j) => {
        if (spoon.opacity > .01) {
          const contact = spoonContact(node, spoon)
          softContact(node, contact.point, toolVelocity, GEL_RADII[j] + contact.radius, dt)
        }
      })
    }
    for (const body of bodies) if (body.active) for (const node of body.nodes) {
      node.x += node.vx * dt; node.y += node.vy * dt; node.z += node.vz * dt
    }

    // Compliant contacts above do the work; cores only prevent tunnelling.
    for (let iteration = 0; iteration < 10; iteration++) {
      for (let a = 0; a < bodies.length; a++) {
        if (!bodies[a].active) continue
        for (let b = a + 1; b < bodies.length; b++) if (bodies[b].active) {
          bodies[a].nodes.forEach((first, i) => bodies[b].nodes.forEach((second, j) => separate(first, second, (GEL_RADII[i] + GEL_RADII[j]) * GEL_CORE, .5)))
        }
        const nodes = bodies[a].nodes
        for (let j = 0; j < 2; j++) {
          const first = nodes[j], second = nodes[j + 1]
          separate(first, second, spineLength * .65, .5)
          const distance = Math.hypot(first.x - second.x, first.y - second.y, first.z - second.z)
          if (distance > spineLength * 1.28) {
            const factor = (distance - spineLength * 1.28) / distance * .5
            const dx = (second.x - first.x) * factor, dy = (second.y - first.y) * factor, dz = (second.z - first.z) * factor
            first.x += dx; first.y += dy; first.z += dz
            second.x -= dx; second.y -= dy; second.z -= dz
          }
          if (first.y < second.y + spineLength * .2) {
            const lift = (second.y + spineLength * .2 - first.y) * .5
            first.y += lift; second.y -= lift
          }
        }
        nodes.forEach((node, j) => {
          const radius = GEL_RADII[j] * GEL_CORE
          if (spoon.opacity > .01) {
            const contact = spoonContact(node, spoon)
            separate(node, contact.point, radius + contact.radius, 1)
          }
          const radial = Math.hypot(node.x, node.z), limit = BOWL_RADIUS - GEL_RADII[j]
          if (radial > limit) { node.x *= limit / radial; node.z *= limit / radial }
          node.y = Math.max(node.y, floorHeight(node.x, node.z) + radius)
        })
      }
    }

    bodies.forEach((body, index) => {
      if (!body.active) return
      body.nodes.forEach((node, j) => {
        const before = previous[index][j]
        node.vx = node.vx * .9 + (node.x - before.x) / dt * .1
        node.vy = node.vy * .9 + (node.y - before.y) / dt * .1
        node.vz = node.vz * .9 + (node.z - before.z) / dt * .1
        const load = Math.hypot(node.pressure, node.shearPressure), scale = load > .16 ? .16 / load : 1
        node.squashSpeed += ((node.pressure * scale - node.squash) * 180 - node.squashSpeed * 14) * dt
        node.shearSpeed += ((node.shearPressure * scale - node.shear) * 180 - node.shearSpeed * 14) * dt
        node.squash += node.squashSpeed * dt; node.shear += node.shearSpeed * dt
      })
      const origin = centre(body.nodes), feet = body.nodes[2]
      const surface = sampleSurface(sauce.height, feet.x, feet.z)
      if (!body.entered && feet.y - GEL_RADII[2] < surface) {
        body.entered = true
        const impact = { x: feet.x, z: feet.z, time, energy: Math.min(.65, Math.max(.1, -feet.vy / 420)) }
        impacts.push(impact); displaceSauce(sauce, impact.x, impact.z, impact.energy)
      }
      body.wetLine = Math.min(body.wetLine + dt * 2.4, origin.y - sampleSurface(sauce.height, origin.x, origin.z))
    })
    for (const grain of grains) {
      grain.x += sampleSurface(sauce.vx, grain.x, grain.z) * dt
      grain.z += sampleSurface(sauce.vz, grain.x, grain.z) * dt
      const radius = Math.hypot(grain.x, grain.z)
      if (radius > 99) { grain.x *= 99 / radius; grain.z *= 99 / radius }
    }
    if (step % 3 === 0) frames.push({ time, spoon, bears: bodies.map(pose), grains: grains.map(grain => ({ ...grain })), surface: Array.from(sauce.height) })
  }
  return { frames, impacts }
}
