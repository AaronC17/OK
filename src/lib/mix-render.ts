import type { Point2 } from './mix-physics.ts'

/** Keep a complete painter order. A non-overlapping/inactive neighbour must not
 * block two overlapping gummies from exchanging their correct depth. */
export function sortMixDepth(order: number[], depths: ArrayLike<number>): boolean {
  let changed = false
  for (let i = 1; i < order.length; i++) {
    const value = order[i]
    let j = i
    while (j > 0 && depths[value] < depths[order[j - 1]] - 1.5) {
      order[j] = order[j - 1]
      j--
    }
    if (j !== i) { order[j] = value; changed = true }
  }
  return changed
}

/** Bounds of the deformed texture, not the undeformed gummy radius. */
export function meshVerticalBounds(mesh: Point2[], target: { min: number; max: number }) {
  target.min = Infinity
  target.max = -Infinity
  for (const point of mesh) {
    target.min = Math.min(target.min, point.y)
    target.max = Math.max(target.max, point.y)
  }
}
