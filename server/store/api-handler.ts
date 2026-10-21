import type { IncomingMessage, ServerResponse } from 'node:http'
import { createShopRuntime } from './runtime.ts'

let runtimePromise: ReturnType<typeof createShopRuntime> | null = null

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  try {
    runtimePromise ??= createShopRuntime().catch(error => { runtimePromise = null; throw error })
    const runtime = await runtimePromise
    return await runtime.handler(request, response)
  } catch {
    if (response.destroyed || response.writableEnded) return
    response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '5', 'X-Content-Type-Options': 'nosniff' })
    response.end(JSON.stringify({ error: 'La tienda no pudo conectar con sus datos. Reintenta en unos momentos.' }))
  }
}
