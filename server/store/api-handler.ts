import type { IncomingMessage, ServerResponse } from 'node:http'
import { createShopRuntime } from './runtime.ts'

let runtimePromise: ReturnType<typeof createShopRuntime> | null = null

export default async function handler(request: IncomingMessage, response: ServerResponse) {
  if (!runtimePromise) {
    runtimePromise = createShopRuntime()
  }
  const runtime = await runtimePromise
  return runtime.handler(request, response)
}
