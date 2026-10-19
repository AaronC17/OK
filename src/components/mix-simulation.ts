import type { MixSimulation } from '../lib/mix-physics.ts'

let pending: Promise<MixSimulation> | undefined

/** Share one calculation across mounts (including React StrictMode). */
export function prepareMixSimulation(): Promise<MixSimulation> {
  // Do not let the optional snapshot compete with the hero's initial images.
  if (document.readyState !== 'complete') return new Promise(resolve => {
    window.addEventListener('load', () => { resolve(prepareMixSimulation()) }, { once: true })
  })
  return pending ??= new Promise<MixSimulation>((resolve, reject) => {
    performance.mark('mix:simulation-start')
    const worker = new Worker(new URL('./mix-simulation.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (event: MessageEvent<MixSimulation>) => {
      worker.terminate()
      performance.mark('mix:simulation-ready')
      performance.measure('mix:simulation', 'mix:simulation-start', 'mix:simulation-ready')
      resolve(event.data)
    }
    worker.onerror = event => {
      worker.terminate()
      pending = undefined
      reject(new Error(event.message || 'Unable to prepare the mix animation.'))
    }
    worker.onmessageerror = () => {
      worker.terminate()
      pending = undefined
      reject(new Error('Unable to receive the mix simulation.'))
    }
  })
}
