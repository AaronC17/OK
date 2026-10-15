import { createHash, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { PaymentsConfig } from './config.ts'
import type { DemoLedger } from './ledger.ts'
import { PaymentsError } from './model.ts'
import { object } from './validation.ts'

const MAX_BODY_BYTES = 64 * 1024

function send(response: ServerResponse, status: number, value: unknown) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  })
  response.end(JSON.stringify(value))
}

function matches(header: string | undefined, token: string): boolean {
  const digest = (text: string) => createHash('sha256').update(text).digest()
  return timingSafeEqual(digest(header ?? ''), digest(`Bearer ${token}`))
}

async function jsonBody(request: IncomingMessage): Promise<unknown> {
  if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new PaymentsError(415, 'Usa Content-Type: application/json.')
  if (Number(request.headers['content-length']) > MAX_BODY_BYTES) {
    request.resume()
    throw new PaymentsError(413, 'El cuerpo supera 64 KiB.')
  }
  return new Promise((resolve, reject) => {
    let size = 0
    let exceeded = false
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        if (!exceeded) reject(new PaymentsError(413, 'El cuerpo supera 64 KiB.'))
        exceeded = true
        chunks.length = 0
      } else if (!exceeded) chunks.push(chunk)
    })
    request.on('error', () => reject(new PaymentsError(400, 'No se pudo leer el JSON.')))
    request.on('end', () => {
      if (exceeded) return
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown) }
      catch { reject(new PaymentsError(400, 'JSON inválido.')) }
    })
  })
}

/** Internal, loopback-only demo API. Do not put this behind a public reverse proxy. */
export function makePaymentsServer(ledger: DemoLedger, config: PaymentsConfig) {
  const server = createServer(async (request, response) => {
    try {
      const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname
      if (request.headers.origin) throw new PaymentsError(403, 'Esta API es servidor a servidor, no un checkout público.')
      if (path === '/health' && request.method === 'GET') {
        send(response, 200, { ok: true, mode: config.mode, demoOnly: true, productionReady: false })
        return
      }
      const role = matches(request.headers.authorization, config.adminToken) ? 'admin'
        : matches(request.headers.authorization, config.reconcileToken) ? 'reconcile' : null
      if (!role) throw new PaymentsError(401, 'Autenticación requerida.')

      if (path === '/internal/reconciliation/run' && request.method === 'POST') {
        if (role !== 'reconcile') throw new PaymentsError(403, 'Usa la credencial de conciliación, no la de administración.')
        const body = object(await jsonBody(request))
        if (Object.keys(body).length) throw new PaymentsError(422, 'No se aceptan montos, movimientos ni estados en esta operación.')
        send(response, 200, ledger.reconcileDue())
        return
      }
      if (role !== 'admin') throw new PaymentsError(403, 'La credencial de n8n solo puede ejecutar conciliaciones.')
      if (path === '/internal/orders' && request.method === 'POST') {
        const key = request.headers['idempotency-key']
        if (typeof key !== 'string') throw new PaymentsError(422, 'Falta Idempotency-Key.')
        send(response, 200, ledger.createOrder(await jsonBody(request), key))
        return
      }
      if (path === '/internal/orders' && request.method === 'GET') {
        send(response, 200, { demoOnly: true, orders: ledger.listOrders() })
        return
      }
      const orderPath = /^\/internal\/orders\/([a-f0-9-]{36})(\/audit)?$/.exec(path)
      if (orderPath && request.method === 'GET') {
        const order = ledger.getOrder(orderPath[1])
        if (!order) throw new PaymentsError(404, 'Pedido no encontrado.')
        send(response, 200, orderPath[2] ? { demoOnly: true, audit: ledger.listAudit(order.id) } : order)
        return
      }
      if (path === '/internal/mock/movements' && request.method === 'POST') {
        send(response, 200, { demoOnly: true, ...ledger.addMockMovement(await jsonBody(request)) })
        return
      }
      if (path === '/internal/events' && request.method === 'GET') {
        send(response, 200, { demoOnly: true, events: ledger.listEvents() })
        return
      }
      throw new PaymentsError(404, 'Ruta no disponible. No hay un endpoint para marcar pagos reales.')
    } catch (error) {
      send(response, error instanceof PaymentsError ? error.status : 500, {
        error: error instanceof PaymentsError ? error.message : 'Error interno. No se ha confirmado ningún pago real.', demoOnly: true,
      })
    }
  })
  server.requestTimeout = 15_000
  server.headersTimeout = 10_000
  return server
}
