import type { Plugin } from 'vite'
import { createShopRuntime } from './runtime.ts'

/** Node-only middleware. Never imported by React or included in the browser bundle. */
export function shopApiPlugin(): Plugin {
  return {
    name: 'onkys-private-order-api',
    async configureServer(server) {
      const runtime = await createShopRuntime()
      server.httpServer?.once('close', runtime.close)
      server.middlewares.use((request, response, next) => {
        if (request.url?.startsWith('/api/')) void runtime.handler(request, response)
        else next()
      })
    },
    async configurePreviewServer(server) {
      const runtime = await createShopRuntime()
      server.httpServer.once('close', runtime.close)
      server.middlewares.use((request, response, next) => {
        if (request.url?.startsWith('/api/')) void runtime.handler(request, response)
        else next()
      })
    },
  }
}
