import { createServer } from 'node:http'
import { createShopRuntime } from './runtime.ts'

try {
  const port = Number(process.env.STORE_API_PORT || '8788')
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('STORE_API_PORT debe estar entre 1024 y 65535.')
  const runtime = await createShopRuntime()
  const server = createServer((request, response) => { void runtime.handler(request, response) })
  server.requestTimeout = 30_000
  server.headersTimeout = 15_000
  server.once('error', () => { runtime.close(); console.error('No se pudo iniciar la API de pedidos. Comprueba el puerto y la carpeta de datos.'); process.exitCode = 1 })
  server.listen(port, '127.0.0.1', () => console.info(`API de pedidos local: http://127.0.0.1:${port}. Conciliación bancaria automática no conectada.`))
  const shutdown = () => server.close(runtime.close)
  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo iniciar la API de pedidos.')
  process.exitCode = 1
}
