import { build, preview } from 'vite'
import { resolve } from 'node:path'

// Build once into this run's private temp directory. Tests must not share Vite HMR,
// dependency caches, dist/ or SQLite with a developer's running storefront.
const directory = process.env.ONKYS_E2E_DIR
const port = Number(process.env.ONKYS_E2E_PORT)
if (!directory?.includes('onkys-store-e2e-') || !Number.isInteger(port) || port < 1024) throw new Error('Missing isolated browser-test configuration.')
const outDir = resolve(directory, 'site')
await build({ build: { outDir }, logLevel: 'error' })
const server = await preview({ build: { outDir }, preview: { host: '127.0.0.1', port, strictPort: true }, logLevel: 'warn' })
let closing = false
const close = () => {
  if (closing) return
  closing = true
  server.httpServer.close(() => { process.exitCode = 0 })
}
process.once('SIGINT', close)
process.once('SIGTERM', close)
