import { createServer } from 'node:http'
import { createReadStream } from 'node:fs'
import { readFile, mkdir, writeFile, stat, cp, mkdtemp } from 'node:fs/promises'
import { extname, resolve, sep, join } from 'node:path'
import { networkInterfaces } from 'node:os'
import { randomBytes, randomUUID } from 'node:crypto'

// Read-only LAN audit. Never imports the shop server, credentials or database.
const args = Object.fromEntries(process.argv.slice(2).map(arg => arg.replace(/^--/, '').split('=')))
const host = args.host
if (!Object.values(networkInterfaces()).flat().some(address => address?.address === host && address.family === 'IPv4')) throw new Error('Supply --host with this computer’s LAN IPv4 address.')
if (!/^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)) throw new Error('Only a private LAN address is allowed.')
if (!args.output) throw new Error('Supply --output for local, non-production performance reports.')
const output = resolve(args.output)
await mkdir(output, { recursive: true })
const snapshots = await mkdtemp(join(output, 'sites-'))
if (args.token && !/^[a-f0-9]{16}$/.test(args.token)) throw new Error('The preview token must contain 16 lowercase hexadecimal characters.')
const token = args.token || randomBytes(8).toString('hex')
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json' }
const probe = await readFile(new URL('./phone-probe.js', import.meta.url), 'utf8')
const variants = [{ name: 'optimized', site: resolve(args.site || 'dist'), port: Number(args.port || 4174) }]
if (args.baseline) variants.push({ name: 'baseline', site: resolve(args.baseline), port: Number(args.baselinePort || 4175) })
const servers = []
let reports = 0

for (const variant of variants) {
  // Freeze HTML and its hashed assets together. A later build of dist/ must
  // never leave the phone loading stale HTML with missing JS/CSS chunks.
  const source = variant.site
  variant.site = join(snapshots, variant.name)
  await cp(source, variant.site, { recursive: true })
  const index = await readFile(join(variant.site, 'index.html'), 'utf8')
  const build = index.match(/\/assets\/index-[\w-]+\.js/)?.[0] || 'unknown'
  const html = index.replace('<head>', '<head><script src="/__phone-probe.js"></script>')
  const server = createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'no-referrer')
    const url = new URL(request.url, `http://${host}:${variant.port}`)
    const authorized = request.headers.cookie?.split(';').some(part => part.trim() === `onkys_phone_qa=${token}`)
    if (url.searchParams.get('qa') === token) response.setHeader('Set-Cookie', `onkys_phone_qa=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600`)
    else if (!authorized) { response.writeHead(403).end('Usa el enlace completo de la prueba local.'); return }
    try {
      if (url.pathname === '/__phone-report' && request.method === 'POST') {
        if (request.headers.origin !== `http://${host}:${variant.port}` || reports >= 120) { response.writeHead(403).end(); return }
        let body = ''
        for await (const chunk of request) {
          body += chunk
          if (Buffer.byteLength(body) > 32_768) { response.writeHead(413).end(); return }
        }
        const record = JSON.parse(body)
        const file = `${variant.name}-${Date.now()}-${randomUUID()}.json`
        await writeFile(join(output, file), JSON.stringify({ ...record, variant: variant.name, build, receivedAt: new Date().toISOString() }, null, 2), { flag: 'wx' })
        reports++
        console.log(JSON.stringify({ variant: variant.name, event: record.event, userAgent: record.device?.userAgent, raf: record.raf, file }))
        response.writeHead(204).end()
        return
      }
      if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(403).end('Prueba de solo lectura: no se crean pedidos.'); return }
      if (url.pathname.startsWith('/api/')) {
        response.setHeader('Content-Type', 'application/json')
        if (url.pathname === '/api/checkout') response.end(JSON.stringify({ csrfToken: 'read-only-phone-test', sinpe: null, demo: true, maxReceiptBytes: 8_000_000 }))
        else if (url.pathname === '/api/orders/current') response.end('{"order":null}')
        else response.writeHead(403).end('{"error":"Prueba de solo lectura: pedidos desactivados."}')
        return
      }
      if (url.pathname === '/__phone-probe.js') {
        response.setHeader('Content-Type', mime['.js'])
        response.end(probe)
        return
      }
      if (url.pathname === '/') {
        response.setHeader('Content-Type', mime['.html'])
        response.end(request.method === 'HEAD' ? undefined : html)
        return
      }
      const file = resolve(variant.site, `.${decodeURIComponent(url.pathname)}`)
      if (!file.startsWith(`${variant.site}${sep}`) || !(await stat(file).catch(() => null))?.isFile()) { response.writeHead(404).end(); return }
      response.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream')
      if (request.method === 'HEAD') response.end()
      else createReadStream(file).on('error', () => response.destroy()).pipe(response)
    } catch { if (!response.headersSent) response.writeHead(400); response.end('Solicitud no válida.') }
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(variant.port, host, resolve) })
  servers.push(server)
  console.log(`${variant.name}: http://${host}:${variant.port}/?qa=${token}`)
}
console.log(`Local reports: ${output}. Read-only; automatically closes after 45 minutes.`)
const close = () => servers.forEach(server => server.close())
setTimeout(close, 45 * 60_000).unref()
process.once('SIGINT', close)
process.once('SIGTERM', close)
