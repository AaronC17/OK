import type { IncomingMessage, ServerResponse } from 'node:http'
import { unlinkSync } from 'node:fs'
import { isIP } from 'node:net'
import type { ShopRepository } from './repository.ts'
import type { Session } from './security.ts'
import { RateLimits, requireCsrf, tokenHash } from './security.ts'
import { orderOwner } from './accounts.ts'
import { MAX_RECEIPT_BYTES, prepareReceipt } from './receipts.ts'
import { StoreError, record } from './validation.ts'
import { PaymentsError } from '../payments/model.ts'
import type { OrderMailer } from './mailer.ts'

const ID = '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}'
const CUSTOMER_COOKIE = 'onkys_customer'
const ADMIN_COOKIE = 'onkys_admin'

function cookie(request: IncomingMessage, name: string) {
  return request.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`))?.slice(name.length + 1)
}
function setCookie(response: ServerResponse, name: string, value: string, maxAge: number, secure: boolean) {
  response.setHeader('Set-Cookie', `${name}=${value}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`)
}
function json(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'" })
  response.end(JSON.stringify(body))
}
async function body(request: IncomingMessage, max: number): Promise<Buffer> {
  if (request.headers['content-encoding'] && request.headers['content-encoding'] !== 'identity') throw new StoreError(415, 'No se admiten cuerpos comprimidos.')
  if (Number(request.headers['content-length']) > max) { request.resume(); throw new StoreError(413, 'El archivo o la solicitud supera el tamaño permitido.') }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let size = 0
    let rejected = false
    request.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > max) {
        if (!rejected) reject(new StoreError(413, 'El archivo o la solicitud supera el tamaño permitido.'))
        rejected = true
        chunks.length = 0
      } else if (!rejected) chunks.push(chunk)
    })
    request.on('error', () => reject(new StoreError(400, 'La carga se interrumpió. Puedes intentarlo de nuevo.')))
    request.on('aborted', () => reject(new StoreError(400, 'La carga se interrumpió.')))
    request.on('end', () => { if (!rejected) resolve(Buffer.concat(chunks)) })
  })
}
async function jsonBody(request: IncomingMessage) {
  if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new StoreError(415, 'Usa Content-Type: application/json.')
  const bytes = await body(request, 64 * 1024)
  try { return record(JSON.parse(bytes.toString('utf8')) as unknown) }
  catch (error) { if (error instanceof StoreError) throw error; throw new StoreError(400, 'JSON inválido.') }
}

export interface ShopHttpOptions { secureCookies?: boolean; publicOrigin?: string; setupTokenPath?: string; mailer?: OrderMailer | null; trustVercelProxy?: boolean }

export function makeShopHandler(store: ShopRepository, options: ShopHttpOptions = {}) {
  const limits = new RateLimits()
  const secureCookies = options.secureCookies ?? false
  return async (request: IncomingMessage, response: ServerResponse) => {
    try {
      const url = new URL(request.url ?? '/', 'http://localhost')
      const path = url.pathname
      const method = request.method
      const origin = request.headers.origin
      if (request.headers['sec-fetch-site'] === 'cross-site') throw new StoreError(403, 'Solicitud desde un sitio no autorizado.')
      if (origin) {
        let allowed = false
        try {
          const parsed = new URL(origin)
          allowed = options.publicOrigin ? parsed.origin === options.publicOrigin : ['http:', 'https:'].includes(parsed.protocol) && parsed.host === request.headers.host
        } catch { /* Reject opaque/invalid origins. */ }
        if (!allowed) throw new StoreError(403, 'Origen no autorizado. Abre la tienda y el panel desde la misma dirección.')
      }
      // Vercel overwrites this header at its proxy. Direct/local servers must
      // never trust a client-supplied forwarded address for rate limiting.
      const forwarded = options.trustVercelProxy ? request.headers['x-forwarded-for'] : undefined
      const clientIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : ''
      const ip = isIP(clientIp) ? clientIp : request.socket.remoteAddress ?? 'local'
      const requireSession = async (role: Session['role'], mutate = false) => {
        const session = await store.session(cookie(request, role === 'admin' ? ADMIN_COOKIE : CUSTOMER_COOKIE), role)
        if (!session) throw new StoreError(401, role === 'admin' ? 'Inicia sesión en administración.' : 'Tu sesión de compra venció. Actualiza la tienda.')
        if (mutate) requireCsrf(session, request.headers['x-csrf-token'] as string | undefined)
        return session
      }
      const authReply = async (session: Session | null) => ({
        initialized: await store.initialized(),
        authenticated: !!session,
        username: session ? await store.adminName() : null,
        csrfToken: session?.csrf ?? null
      })

      if ((path === '/api/checkout' || path === '/api/account/session') && method === 'GET') {
        const token = cookie(request, CUSTOMER_COOKIE)
        if (!await store.session(token, 'customer')) limits.check(`session:${ip}`, 120, 3600_000)
        const customer = await store.customerSession(token)
        if (customer.token) setCookie(response, CUSTOMER_COOKIE, customer.token, 7 * 86400, secureCookies)
        const account = await store.account(customer.session)
        json(response, 200, path === '/api/account/session'
          ? { csrfToken: customer.session.csrf, user: account }
          : { csrfToken: customer.session.csrf, account, sinpe: await store.destination(), demo: store.isDemo(), maxReceiptBytes: MAX_RECEIPT_BYTES })
        return
      }
      if ((path === '/api/account/register' || path === '/api/account/login') && method === 'POST') {
        const previous = await requireSession('customer', true)
        const register = path.endsWith('/register')
        limits.check(`account-${register ? 'register' : 'login'}:${ip}`, register ? 8 : 20, register ? 3600_000 : 15 * 60_000)
        const data = await jsonBody(request)
        if (!register && typeof data.email === 'string') limits.check(`account-email:${tokenHash(data.email.trim().toLowerCase().slice(0, 254))}`, 10, 15 * 60_000)
        const result = await (register ? store.registerCustomer(data, previous) : store.loginCustomer(data, previous))
        setCookie(response, CUSTOMER_COOKIE, result.token, 7 * 86400, secureCookies)
        const user = await store.account(result.session)
        if (register && user) {
          await options.mailer?.notifyWelcome(user)
        }
        json(response, 200, { user, csrfToken: result.session.csrf })
        return
      }
      if (path === '/api/account/logout' && method === 'POST') {
        await store.logout(await requireSession('customer', true))
        const guest = await store.customerSession(undefined)
        setCookie(response, CUSTOMER_COOKIE, guest.token!, 7 * 86400, secureCookies)
        json(response, 200, { user: null, csrfToken: guest.session.csrf })
        return
      }
      if (path === '/api/account/orders' && method === 'GET') {
        json(response, 200, await store.accountOrders(await requireSession('customer'), url.searchParams))
        return
      }
      if (path === '/api/account/referrals' && method === 'GET') {
        json(response, 200, await store.referrals(await requireSession('customer')))
        return
      }
      if (path === '/api/admin/session' && method === 'GET') {
        json(response, 200, await authReply(await store.session(cookie(request, ADMIN_COOKIE), 'admin')))
        return
      }
      if ((path === '/api/admin/setup' || path === '/api/admin/login') && method === 'POST') {
        limits.check(`login:${ip}`, 10, 15 * 60_000)
        const data = await jsonBody(request)
        const session = await (path.endsWith('/setup') ? store.setupAdmin(data) : store.login(data))
        limits.clear(`login:${ip}`)
        const previous = await store.session(cookie(request, ADMIN_COOKIE), 'admin')
        if (previous) await store.logout(previous)
        setCookie(response, ADMIN_COOKIE, session.token, 8 * 3600, secureCookies)
        if (path.endsWith('/setup') && options.setupTokenPath) { try { unlinkSync(options.setupTokenPath) } catch { /* Token is already invalidated in the database. */ } }
        json(response, 200, await authReply(session.session))
        return
      }
      if (path === '/api/admin/logout' && method === 'POST') {
        await store.logout(await requireSession('admin', true))
        setCookie(response, ADMIN_COOKIE, '', 0, secureCookies)
        json(response, 200, { ok: true })
        return
      }
      if (path === '/api/admin/settings') {
        await requireSession('admin', method === 'PUT')
        if (method === 'GET') { json(response, 200, await store.settings()); return }
        if (method === 'PUT') { json(response, 200, await store.configure(await jsonBody(request), (await store.adminName())!)); return }
      }
      if (path === '/api/orders/current' && method === 'GET') {
        json(response, 200, { order: await store.currentOrder(orderOwner(await requireSession('customer'))) })
        return
      }
      if (path === '/api/orders' && method === 'POST') {
        const session = await requireSession('customer', true)
        limits.check(`order:${session.hash}`, 20, 15 * 60_000)
        const key = request.headers['idempotency-key']
        if (typeof key !== 'string') throw new StoreError(422, 'Falta Idempotency-Key.')
        const created = await store.createOrder(await jsonBody(request), orderOwner(session), key)
        json(response, 200, created)
        return
      }
      const orderPath = new RegExp(`^/api/orders/(${ID})$`).exec(path)
      if (orderPath && method === 'GET') {
        json(response, 200, await store.customerOrder(orderPath[1], orderOwner(await requireSession('customer'))))
        return
      }
      const uploadPath = new RegExp(`^/api/orders/(${ID})/receipt$`).exec(path)
      if (uploadPath && method === 'POST') {
        const session = await requireSession('customer', true)
        limits.check(`upload:${session.hash}`, 20, 3600_000)
        limits.check(`upload-ip:${ip}`, 60, 3600_000)
        const type = request.headers['content-type'] ?? ''
        if (!type.toLowerCase().startsWith('multipart/form-data;')) throw new StoreError(415, 'Envía el comprobante como multipart/form-data.')
        const bytes = await body(request, MAX_RECEIPT_BYTES + 64 * 1024)
        let form: FormData
        try { form = await new Response(new Uint8Array(bytes), { headers: { 'Content-Type': type } }).formData() }
        catch { throw new StoreError(400, 'No se pudo leer el formulario del comprobante.') }
        const entries = [...form.entries()]
        const keys = entries.map(([key]) => key)
        if (new Set(keys).size !== entries.length || keys.some(key => !['code', 'bankReference', 'uploadKey', 'version', 'receipt'].includes(key)) || !['uploadKey', 'version', 'receipt'].every(req => keys.includes(req))) throw new StoreError(422, 'El formulario contiene campos ausentes, repetidos o no permitidos.')
        await store.checkUpload(uploadPath[1], orderOwner(session), form.get('code'))
        const file = form.get('receipt')
        if (!(file instanceof Blob)) throw new StoreError(422, 'Selecciona un comprobante.')
        if (file.size > MAX_RECEIPT_BYTES) throw new StoreError(413, 'El comprobante no puede superar 5 MB.')
        const version = form.get('version')
        if (typeof version !== 'string' || !/^[1-9]\d{0,8}$/.test(version)) throw new StoreError(422, 'Versión del pedido inválida.')
        const prepared = await prepareReceipt(Buffer.from(await file.arrayBuffer()), file.type)
        const received = await store.addReceipt(uploadPath[1], orderOwner(session), form.get('code'), form.get('bankReference'), form.get('uploadKey'), Number(version), prepared)
        await options.mailer?.notify('receipt.submitted', received)
        json(response, 200, received)
        return
      }
      const receiptPath = new RegExp(`^/api/(admin/)?orders/(${ID})/receipts/(${ID})$`).exec(path)
      if (receiptPath && method === 'GET') {
        if (receiptPath[1]) await requireSession('admin')
        else await store.customerOrder(receiptPath[2], orderOwner(await requireSession('customer')))
        const receipt = await store.receipt(receiptPath[2], receiptPath[3])
        const order = await store.getOrder(receiptPath[2])
        const pdf = receipt.contentType === 'application/pdf'
        response.writeHead(200, {
          'Content-Type': receipt.contentType, 'Content-Length': receipt.data.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
          'Content-Disposition': `${pdf ? 'attachment' : 'inline'}; filename="${order.code}.${pdf ? 'pdf' : 'webp'}"`,
          'Content-Security-Policy': "sandbox; default-src 'none'; frame-ancestors 'none'",
        })
        response.end(receipt.data)
        return
      }
      if (path === '/api/admin/customers' && method === 'GET') {
        await requireSession('admin')
        json(response, 200, await store.customers(url.searchParams))
        return
      }
      if (path === '/api/admin/orders' && method === 'GET') {
        await requireSession('admin')
        json(response, 200, await store.list(url.searchParams))
        return
      }
      const adminOrder = new RegExp(`^/api/admin/orders/(${ID})(?:/(confirm|reject))?$`).exec(path)
      if (adminOrder) {
        await requireSession('admin', method !== 'GET')
        if (!adminOrder[2] && method === 'GET') { json(response, 200, { order: await store.getOrder(adminOrder[1]), audit: await store.auditFor(adminOrder[1]) }); return }
        if (method === 'POST' && adminOrder[2]) {
          const data = await jsonBody(request)
          const confirm = adminOrder[2] === 'confirm'
          const operation = confirm ? store.confirm.bind(store) : store.reject.bind(store)
          const reviewed = await operation(adminOrder[1], data, (await store.adminName())!)
          await options.mailer?.notify(confirm ? 'payment.confirmed_manual' : 'receipt.correction_requested', reviewed)
          json(response, 200, reviewed)
          return
        }
      }
      throw new StoreError(404, 'Ruta no encontrada.')
    } catch (error) {
      if (response.destroyed || response.writableEnded) return
      const known = error instanceof StoreError || error instanceof PaymentsError
      json(response, known ? error.status : 500, { error: known ? error.message : 'No pudimos completar la operación. Actualiza el estado antes de reintentar; no se ha confirmado automáticamente ningún pago.' })
    }
  }
}
