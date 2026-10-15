import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { store } from '../../src/config/store.ts'
import { loadPaymentsConfig } from './config.ts'
import { makePaymentsServer } from './http.ts'
import { DemoLedger } from './ledger.ts'

try {
  const config = loadPaymentsConfig(process.env)
  mkdirSync(resolve('.data'), { recursive: true })
  const ledger = new DemoLedger(resolve('.data/payments-demo.sqlite'), config, store)
  const server = makePaymentsServer(ledger, config)
  server.on('error', () => {
    console.error('No se pudo iniciar el servidor de pagos local. Comprueba el puerto y la base de datos.')
    ledger.close()
    process.exitCode = 1
  })
  server.listen(config.port, '127.0.0.1', () => {
    console.log(`SINPE DEMO: http://127.0.0.1:${config.port} · modo ${config.mode}. No consulta BAC ni confirma pagos reales.`)
  })
  const shutdown = () => server.close(() => ledger.close())
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo iniciar la demostración SINPE.')
  process.exitCode = 1
}
