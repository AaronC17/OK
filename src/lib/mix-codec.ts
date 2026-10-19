import type { MixSimulation } from './mix-physics.ts'

const MAGIC = 0x4d495831
const HEADER_BYTES = 40

/** Lossless Float64 snapshot: no resampling, rounding or changed physics. */
export function encodeMix(simulation: MixSimulation): ArrayBuffer {
  const first = simulation.frames[0]
  const counts = [simulation.frames.length, simulation.impacts.length, first.bears.length, first.grains.length, first.surface.length, first.bears[0].lobes.length, first.bears[0].mesh.length]
  const [frames, impacts, bears, grains, surface, lobes, mesh] = counts
  const stride = 10 + bears * (5 + lobes * 5 + mesh * 2) + grains * 2 + surface
  const buffer = new ArrayBuffer(HEADER_BYTES + (frames * stride + impacts * 4) * 8)
  const header = new DataView(buffer)
  header.setUint32(0, MAGIC, true)
  counts.forEach((count, index) => header.setUint32(4 + index * 4, count, true))
  const values = new Float64Array(buffer, HEADER_BYTES)
  let cursor = 0
  const put = (...numbers: number[]) => { for (const number of numbers) values[cursor++] = number }
  for (const frame of simulation.frames) {
    const spoon = frame.spoon
    put(frame.time, spoon.x, spoon.y, spoon.z, spoon.grip.x, spoon.grip.y, spoon.grip.z, spoon.angle, spoon.headScale, spoon.opacity)
    for (const bear of frame.bears) {
      put(bear.x, bear.y, bear.z, Number(bear.active), bear.wetLine)
      for (const lobe of bear.lobes) put(lobe.x, lobe.y, lobe.z, lobe.squash, lobe.shear)
      for (const point of bear.mesh) put(point.x, point.y)
    }
    for (const grain of frame.grains) put(grain.x, grain.z)
    for (const height of frame.surface) put(height)
  }
  for (const impact of simulation.impacts) put(impact.x, impact.z, impact.time, impact.energy)
  return buffer
}

/** Byte-plane/XOR transform for gzip; preserves every Float64 bit. */
export function packMix(buffer: ArrayBuffer): ArrayBuffer {
  const header = new DataView(buffer)
  const bears = header.getUint32(12, true), grains = header.getUint32(16, true), surface = header.getUint32(20, true)
  const stride = 10 + bears * (5 + header.getUint32(24, true) * 5 + header.getUint32(28, true) * 2) + grains * 2 + surface
  const source = new Uint8Array(buffer), count = (buffer.byteLength - HEADER_BYTES) / 8
  const packed = new Uint8Array(buffer.byteLength)
  packed.set(source.subarray(0, HEADER_BYTES))
  new DataView(packed.buffer).setUint32(32, 1, true)
  for (let byte = 0; byte < 8; byte++) for (let i = 0; i < count; i++) {
    packed[HEADER_BYTES + byte * count + i] = source[HEADER_BYTES + i * 8 + byte] ^ (i >= stride ? source[HEADER_BYTES + (i - stride) * 8 + byte] : 0)
  }
  return packed.buffer
}

export function decodeMix(buffer: ArrayBuffer): MixSimulation {
  if (buffer.byteLength < HEADER_BYTES) throw new Error('Incomplete mix snapshot.')
  const header = new DataView(buffer)
  if (header.getUint32(0, true) !== MAGIC) throw new Error('Invalid mix snapshot.')
  const counts = Array.from({ length: 7 }, (_, index) => header.getUint32(4 + index * 4, true))
  const [frameCount, impactCount, bears, grains, surface, lobes, mesh] = counts
  if (frameCount !== 619 || bears !== 19 || grains !== 54 || surface !== 289 || lobes !== 3 || mesh !== 10 || impactCount > 1000) throw new Error('Unexpected mix snapshot dimensions.')
  const stride = 10 + bears * (5 + lobes * 5 + mesh * 2) + grains * 2 + surface
  if (buffer.byteLength !== HEADER_BYTES + (frameCount * stride + impactCount * 4) * 8) throw new Error('Truncated mix snapshot.')
  if (header.getUint32(32, true) === 1) {
    const packed = new Uint8Array(buffer), unpacked = new Uint8Array(buffer.byteLength), count = (buffer.byteLength - HEADER_BYTES) / 8
    unpacked.set(packed.subarray(0, HEADER_BYTES))
    for (let byte = 0; byte < 8; byte++) for (let i = 0; i < count; i++) {
      unpacked[HEADER_BYTES + i * 8 + byte] = packed[HEADER_BYTES + byte * count + i] ^ (i >= stride ? unpacked[HEADER_BYTES + (i - stride) * 8 + byte] : 0)
    }
    buffer = unpacked.buffer
  }
  const values = new Float64Array(buffer, HEADER_BYTES)
  let cursor = 0
  const take = () => values[cursor++]
  const frames = Array.from({ length: frameCount }, () => ({
    time: take(),
    spoon: { x: take(), y: take(), z: take(), grip: { x: take(), y: take(), z: take() }, angle: take(), headScale: take(), opacity: take() },
    bears: Array.from({ length: bears }, () => ({
      x: take(), y: take(), z: take(), active: !!take(), wetLine: take(),
      lobes: Array.from({ length: lobes }, () => ({ x: take(), y: take(), z: take(), squash: take(), shear: take() })),
      mesh: Array.from({ length: mesh }, () => ({ x: take(), y: take() })),
    })),
    grains: Array.from({ length: grains }, () => ({ x: take(), z: take() })),
    surface: Array.from({ length: surface }, take),
  }))
  const impacts = Array.from({ length: impactCount }, () => ({ x: take(), z: take(), time: take(), energy: take() }))
  return { frames, impacts }
}
