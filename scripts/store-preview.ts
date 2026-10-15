// Local preview only: serve the production frontend with the local order API.
// Preserve an explicitly configured production environment and its HTTPS checks.
process.env.NODE_ENV ??= 'development'
const { preview } = await import('vite')
try {
  const server = await preview({ preview: { host: '127.0.0.1' } })
  server.printUrls()
  process.once('SIGINT', () => server.httpServer.close())
  process.once('SIGTERM', () => server.httpServer.close())
} catch (error) {
  console.error(error instanceof Error ? error.message : 'No se pudo iniciar la vista previa local.')
  process.exitCode = 1
}
