import test from 'node:test'
import assert from 'node:assert/strict'
import { affinePhoto } from './mix-affine.ts'
import { GEL_MESH, simulateMix } from './mix-physics.ts'

test('one photo is used only for an affine mesh; all bending keeps the original triangles', () => {
  const matrix = { xx: 0, xy: 0, yx: 0, yy: 0, x: 0, y: 0 }
  assert.equal(affinePhoto(GEL_MESH, matrix), true)
  assert.deepEqual(matrix, { xx: 1, xy: 0, yx: 0, yy: 1, x: 0, y: 0 })
  const bent = GEL_MESH.map(point => ({ ...point }))
  bent[4].x += .001
  assert.equal(affinePhoto(bent, matrix), false)
  let falling = 0, singlePhoto = 0, bentPhoto = 0
  for (const frame of simulateMix().frames) {
    for (const bear of frame.bears) {
      if (!bear.active) continue
      if (affinePhoto(bear.mesh, matrix)) {
        for (let i = 0; i < GEL_MESH.length; i++) {
          const p = GEL_MESH[i], q = bear.mesh[i]
          assert.ok(Math.hypot(matrix.xx * p.x + matrix.xy * p.y + matrix.x - q.x, matrix.yx * p.x + matrix.yy * p.y + matrix.y - q.y) <= 1e-6)
        }
        if (frame.time <= 4.2) singlePhoto++
      } else bentPhoto++
      if (frame.time <= 4.2) falling++
    }
  }
  assert.ok(singlePhoto / falling > .5, 'over half of falling poses should avoid eight redundant clips')
  assert.ok(bentPhoto > 1000, 'deforming poses must retain their full mesh')
})
