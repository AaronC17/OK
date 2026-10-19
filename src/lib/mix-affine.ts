import { GEL_MESH, type Point2 } from './mix-physics.ts'

export interface AffinePhoto { xx: number; xy: number; yx: number; yy: number; x: number; y: number }

/** Exact-affine fast path, not a simplified/degraded mesh. The 1e-6 SVG-unit
 * tolerance only absorbs floating-point arithmetic, far below a device pixel. */
export function affinePhoto(mesh: Point2[], result: AffinePhoto): boolean {
  const p = mesh[0], q = mesh[1], r = mesh[8]
  const xx = (q.x - p.x) / 28, yx = (q.y - p.y) / 28
  const xy = (r.x - p.x) / 41, yy = (r.y - p.y) / 41
  const x = p.x + 14 * xx + 20.5 * xy, y = p.y + 14 * yx + 20.5 * yy
  for (let i = 0; i < 10; i++) {
    const { x: sourceX, y: sourceY } = GEL_MESH[i]
    const dx = xx * sourceX + xy * sourceY + x - mesh[i].x
    const dy = yx * sourceX + yy * sourceY + y - mesh[i].y
    if (dx * dx + dy * dy > 1e-12) return false
  }
  result.xx = xx; result.xy = xy; result.yx = yx; result.yy = yy; result.x = x; result.y = y
  return true
}
