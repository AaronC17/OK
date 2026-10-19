import { simulateMix } from '../lib/mix-physics.ts'
import { decodeMix } from '../lib/mix-codec.ts'
import baked from '../config/mix-baked.json'

// Prefer the exact build-time snapshot: Safari need not re-run the solver on
// every visit. The original solver remains a compatibility/network fallback.
async function prepare() {
  const started = performance.now()
  let simulation, source = 'computed'
  const controller = new AbortController()
  // Do not turn a CPU optimization into a multi-second download on slow links.
  const timeout = setTimeout(() => controller.abort(), 800)
  try {
    if (typeof DecompressionStream !== 'function') throw new Error('No native gzip decoder')
    const response = await fetch(baked.url, { signal: controller.signal, priority: 'low' })
    if (!response.ok || !response.body) throw new Error('Snapshot unavailable')
    const buffer = await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
    simulation = decodeMix(buffer)
    source = 'baked'
  } catch {
    simulation = simulateMix()
  } finally {
    clearTimeout(timeout)
  }
  self.postMessage({ ...simulation, preparation: { source, duration: performance.now() - started } })
}
void prepare()
