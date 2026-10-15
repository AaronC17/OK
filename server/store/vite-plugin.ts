import type { Plugin } from 'vite'
import { createShopRuntime } from './runtime.ts'

/** Node-only middleware. Never imported by React or included in the browser bundle. */
export function shopApiPlugin(): Plugin {
  return {
    name: 'onkys-private-order-api',
    configureServer(server) {
      const runtime = createShopRuntime()
      server.httpServer?.once('close', runtime.close)
      server.middlewares.use((request, response, next) => {
        if (request.url?.startsWith('/api/')) void runtime.handler(request, response)
        else next()
      })
    },
    configurePreviewServer(server) {
      const runtime = createShopRuntime()
      server.httpServer.once('close', runtime.close)
      server.middlewares.use((request, response, next) => {
        if (request.url?.startsWith('/api/')) void runtime.handler(request, response)
        else next()
      })
    },
  }
}
