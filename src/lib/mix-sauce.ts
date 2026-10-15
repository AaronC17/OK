/** A shallow, highly damped chamoy layer. Motion, seasoning and surface relief
 * share this field; it yields near the spoon and levels slowly after a stroke. */
export const LIQUID_LEVEL = 27
export const SAUCE_RADIUS = 102
export const SAUCE_SIZE = 17
const spacing = SAUCE_RADIUS * 2 / (SAUCE_SIZE - 1)
const count = SAUCE_SIZE ** 2

export interface SauceField {
  height: Float64Array
  vx: Float64Array
  vz: Float64Array
  nextX: Float64Array
  nextZ: Float64Array
  nextHeight: Float64Array
}

const cells = Array.from({ length: count }, (_, index) => {
  const x = (index % SAUCE_SIZE) * spacing - SAUCE_RADIUS
  const z = Math.floor(index / SAUCE_SIZE) * spacing - SAUCE_RADIUS
  return { x, z, inside: Math.hypot(x, z) <= SAUCE_RADIUS }
})

export function createSauce(): SauceField {
  return { height: new Float64Array(count).fill(LIQUID_LEVEL), vx: new Float64Array(count), vz: new Float64Array(count), nextX: new Float64Array(count), nextZ: new Float64Array(count), nextHeight: new Float64Array(count) }
}

export function sampleSurface(values: ArrayLike<number>, x: number, z: number) {
  const column = Math.max(0, Math.min(SAUCE_SIZE - 1.001, (x + SAUCE_RADIUS) / spacing))
  const row = Math.max(0, Math.min(SAUCE_SIZE - 1.001, (z + SAUCE_RADIUS) / spacing))
  const a = Math.floor(row) * SAUCE_SIZE + Math.floor(column)
  const u = column % 1, v = row % 1
  return (values[a] * (1 - u) + values[a + 1] * u) * (1 - v) + (values[a + SAUCE_SIZE] * (1 - u) + values[a + SAUCE_SIZE + 1] * u) * v
}

function neighbour(index: number, offset: number) {
  const next = index + offset
  return next >= 0 && next < count && cells[next].inside ? next : index
}

export function stepSauce(field: SauceField, spoon: { x: number; y: number; z: number }, vx: number, vz: number, strength: number, dt: number) {
  const immersion = Math.max(0, Math.min(1, (LIQUID_LEVEL + 12 - spoon.y) / 24))
  for (let i = 0; i < count; i++) {
    const cell = cells[i]
    if (!cell.inside) continue
    const left = neighbour(i, -1), right = neighbour(i, 1), back = neighbour(i, -SAUCE_SIZE), front = neighbour(i, SAUCE_SIZE)
    const gradientX = (field.height[right] - field.height[left]) / (2 * spacing)
    const gradientZ = (field.height[front] - field.height[back]) / (2 * spacing)
    const lapX = (field.vx[left] + field.vx[right] + field.vx[back] + field.vx[front] - 4 * field.vx[i]) / spacing ** 2
    const lapZ = (field.vz[left] + field.vz[right] + field.vz[back] + field.vz[front] - 4 * field.vz[i]) / spacing ** 2
    const distanceSquared = (cell.x - spoon.x) ** 2 + (cell.z - spoon.z) ** 2
    const contact = Math.exp(-distanceSquared / 1050) * strength * immersion
    const boundary = Math.max(0, 1 - (cell.x ** 2 + cell.z ** 2) / SAUCE_RADIUS ** 2)
    const stream = vx * cell.z - vz * cell.x
    const returnX = (vx * boundary ** 2 - 4 * cell.z * boundary / SAUCE_RADIUS ** 2 * stream) * .2
    const returnZ = (vz * boundary ** 2 + 4 * cell.x * boundary / SAUCE_RADIUS ** 2 * stream) * .2
    const speed = Math.hypot(field.vx[i], field.vz[i])
    // Shear thinning: thick at rest, more mobile under the moving spoon.
    const resistance = 3.5 + 16 / (1 + speed / 12)
    field.nextX[i] = (field.vx[i] + (170 * lapX - 32 * gradientX + (vx * .82 + returnX - field.vx[i]) * contact * 38) * dt) / (1 + resistance * dt)
    field.nextZ[i] = (field.vz[i] + (170 * lapZ - 32 * gradientZ + (vz * .82 + returnZ - field.vz[i]) * contact * 38) * dt) / (1 + resistance * dt)
    const radius = Math.hypot(cell.x, cell.z)
    if (radius > SAUCE_RADIUS - spacing) {
      const normal = (field.nextX[i] * cell.x + field.nextZ[i] * cell.z) / (radius || 1)
      const wall = Math.min(1, (radius - SAUCE_RADIUS + spacing) / spacing)
      field.nextX[i] -= normal * cell.x / radius * wall
      field.nextZ[i] -= normal * cell.z / radius * wall
    }
  }
  for (let i = 0; i < count; i++) {
    if (!cells[i].inside) continue
    const left = neighbour(i, -1), right = neighbour(i, 1), back = neighbour(i, -SAUCE_SIZE), front = neighbour(i, SAUCE_SIZE)
    const divergence = (field.nextX[right] - field.nextX[left] + field.nextZ[front] - field.nextZ[back]) / (2 * spacing)
    const lap = (field.height[left] + field.height[right] + field.height[back] + field.height[front] - 4 * field.height[i]) / spacing ** 2
    const height = field.height[i] + (-LIQUID_LEVEL * .48 * divergence + lap * 8 - (field.height[i] - LIQUID_LEVEL) * .24) * dt
    field.nextHeight[i] = Math.max(LIQUID_LEVEL - 8, Math.min(LIQUID_LEVEL + 10, height))
  }
  for (let i = 0; i < count; i++) {
    if (!cells[i].inside) continue
    field.vx[i] = field.nextX[i]; field.vz[i] = field.nextZ[i]; field.height[i] = field.nextHeight[i]
  }
}

export function displaceSauce(field: SauceField, x: number, z: number, energy: number) {
  for (let i = 0; i < count; i++) {
    if (!cells[i].inside) continue
    const distance = Math.hypot(cells[i].x - x, cells[i].z - z)
    // A local rim of displaced paste, not a propagating splash or water ring.
    field.height[i] += (3.4 * Math.exp(-((distance - 14) ** 2) / 55) - 4 * Math.exp(-(distance ** 2) / 90)) * energy
  }
}
