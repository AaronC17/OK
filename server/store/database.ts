import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import type { SQLInputValue } from 'node:sqlite'
import type { StoreConfig } from '../../src/types.ts'
import type { AdminOrders, OrderAudit, OrderReceipt, ShopOrder, ShopOrderStatus, SinpeDestination, SinpeSettings } from '../../src/order-types.ts'
import { schema } from './schema.ts'
import { bankReference, fields, minorAmount, orderCode, parseNewOrder, parseSettings, record, StoreError, text, version } from './validation.ts'
import { constantEqual, createSession, findSession, passwordHash, passwordMatches, tokenHash } from './security.ts'
import type { Session } from './security.ts'
import type { PreparedReceipt } from './receipts.ts'

const statuses: ShopOrderStatus[] = ['pending_details', 'awaiting_payment', 'pending_review', 'ready', 'rejected']
type Row = Record<string, SQLInputValue>
const timestamp = () => new Date().toISOString()

export class ShopDatabase {
  readonly database: DatabaseSync
  private catalog: StoreConfig

  constructor(path: string, catalog: StoreConfig) {
    this.database = new DatabaseSync(path)
    this.catalog = catalog
    this.database.exec(schema)
  }
  close() { this.database.close() }
  private transaction<T>(operation: () => T): T {
    this.database.exec('BEGIN IMMEDIATE')
    try { const result = operation(); this.database.exec('COMMIT'); return result }
    catch (error) { this.database.exec('ROLLBACK'); throw error }
  }
  private audit(orderId: string | null, event: string, actor: string, detail: string) {
    this.database.prepare('INSERT INTO shop_audit (order_id, event, actor, detail, created_at) VALUES (?, ?, ?, ?, ?)').run(orderId, event, actor, detail, timestamp())
  }
  private event(order: ShopOrder, event: string) {
    this.database.prepare('INSERT INTO shop_events (id, order_id, version, event, created_at) VALUES (?, ?, ?, ?, ?)').run(randomUUID(), order.id, order.version, event, timestamp())
  }
  initialized() { return !!this.database.prepare('SELECT id FROM admin WHERE id = 1').get() }
  adminName() { return this.database.prepare('SELECT username FROM admin WHERE id = 1').get()?.username as string | undefined }
  ensureSetupToken(token: string) {
    if (this.initialized()) return
    this.database.prepare("INSERT INTO metadata (key, value) VALUES ('setup_hash', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(tokenHash(token))
  }
  setupAdmin(value: unknown) {
    const data = record(value)
    fields(data, ['setupToken', 'username', 'password'])
    const username = text(data.username, 3, 40, 'Usuario').toLowerCase()
    if (!/^[a-z0-9._-]+$/.test(username)) throw new StoreError(422, 'El usuario solo admite letras, números, puntos, guiones y guiones bajos.')
    const setupToken = text(data.setupToken, 43, 43, 'Código de instalación')
    if (this.initialized()) throw new StoreError(409, 'La administración ya fue configurada. Inicia sesión.')
    const expected = this.database.prepare("SELECT value FROM metadata WHERE key = 'setup_hash'").get()?.value as string | undefined
    if (!expected || !constantEqual(tokenHash(setupToken), expected)) throw new StoreError(403, 'Código de instalación incorrecto.')
    const hash = passwordHash(data.password)
    return this.transaction(() => {
      if (this.initialized()) throw new StoreError(409, 'La administración ya fue configurada.')
      this.database.prepare('INSERT INTO admin (id, username, password_hash) VALUES (1, ?, ?)').run(username, hash)
      this.database.prepare("DELETE FROM metadata WHERE key = 'setup_hash'").run()
      this.audit(null, 'admin.created', username, 'Configuración inicial completada.')
      return createSession(this.database, 'admin')
    })
  }
  login(value: unknown) {
    const data = record(value)
    fields(data, ['username', 'password'])
    const username = text(data.username, 1, 40, 'Usuario').toLowerCase()
    const admin = this.database.prepare('SELECT username, password_hash FROM admin WHERE id = 1').get()
    if (!admin || !constantEqual(username, admin.username as string) || !passwordMatches(data.password, admin.password_hash as string)) throw new StoreError(401, 'Usuario o contraseña incorrectos.')
    this.database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
    return createSession(this.database, 'admin')
  }
  session(token: string | undefined, role: Session['role']) { return findSession(this.database, token, role) }
  customerSession(token: string | undefined) {
    const existing = this.session(token, 'customer')
    if (existing) return { session: existing, token: null }
    this.database.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
    return createSession(this.database, 'customer')
  }
  logout(session: Session) { this.database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(session.hash) }

  settings(): SinpeSettings {
    const value = this.database.prepare("SELECT value FROM metadata WHERE key = 'sinpe'").get()?.value
    return value ? JSON.parse(value as string) as SinpeSettings : { enabled: false, phone: '', beneficiary: '' }
  }
  destination(): SinpeDestination | null {
    const settings = this.settings()
    return settings.enabled ? { phone: settings.phone, beneficiary: settings.beneficiary, bank: 'BAC Credomatic' } : null
  }
  configure(value: unknown, actor: string): SinpeSettings {
    const settings = parseSettings(value)
    return this.transaction(() => {
      this.database.prepare("INSERT INTO metadata (key, value) VALUES ('sinpe', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(settings))
      this.audit(null, 'sinpe.configured', actor, settings.enabled ? 'Destino SINPE habilitado. Los pedidos con instrucciones conservan su destino original.' : 'Nuevas instrucciones SINPE deshabilitadas.')
      return settings
    })
  }
  isDemo() { return this.catalog.demo }

  private fromRow(row: Row): ShopOrder {
    const receipt = row.current_receipt_id ? this.database.prepare('SELECT id, content_type, size, submitted_at, bank_reference FROM receipts WHERE id = ? AND order_id = ?').get(row.current_receipt_id, row.id) : undefined
    return {
      id: row.id as string, code: row.code as string, version: row.version as number, status: row.status as ShopOrderStatus,
      demo: row.demo === 1, createdAt: row.created_at as string, updatedAt: row.updated_at as string,
      lines: JSON.parse(row.lines_json as string) as ShopOrder['lines'],
      customer: JSON.parse(row.customer_json as string) as ShopOrder['customer'],
      delivery: JSON.parse(row.delivery_json as string) as ShopOrder['delivery'],
      destination: row.destination_json ? JSON.parse(row.destination_json as string) as SinpeDestination : null,
      subtotalMinor: row.subtotal_minor as number, shippingMinor: row.shipping_minor as number | null, totalMinor: row.total_minor as number | null,
      receipt: receipt ? { id: receipt.id as string, contentType: receipt.content_type as OrderReceipt['contentType'], size: receipt.size as number, submittedAt: receipt.submitted_at as string, bankReference: receipt.bank_reference as string } : null,
      customerMessage: row.customer_message as string | null, paymentConfirmedAt: row.payment_confirmed_at as string | null,
      paymentVerification: row.payment_confirmed_at ? 'manual' : null,
    }
  }
  getOrder(id: string): ShopOrder {
    const row = this.database.prepare('SELECT * FROM shop_orders WHERE id = ?').get(id)
    if (!row) throw new StoreError(404, 'Pedido no encontrado.')
    return this.fromRow(row)
  }
  customerOrder(id: string, owner: string): ShopOrder {
    const row = this.database.prepare('SELECT * FROM shop_orders WHERE id = ? AND owner_hash = ?').get(id, owner)
    if (!row) throw new StoreError(404, 'Pedido no encontrado en esta sesión.')
    return this.fromRow(row)
  }
  currentOrder(owner: string): ShopOrder | null {
    const row = this.database.prepare('SELECT * FROM shop_orders WHERE owner_hash = ? ORDER BY created_at DESC, rowid DESC LIMIT 1').get(owner)
    return row ? this.fromRow(row) : null
  }
  createOrder(value: unknown, owner: string, key: string): ShopOrder {
    if (!/^[A-Za-z0-9-]{16,128}$/.test(key)) throw new StoreError(422, 'Falta una clave de idempotencia válida.')
    record(value)
    const hash = createHash('sha256').update(JSON.stringify(value)).digest('hex')
    return this.transaction(() => {
      const previous = this.database.prepare('SELECT * FROM shop_orders WHERE owner_hash = ? AND idempotency_key = ?').get(owner, key)
      if (previous) {
        if (previous.request_hash !== hash) throw new StoreError(409, 'Esta solicitud ya corresponde a otro carrito. Actualiza los datos.')
        return this.fromRow(previous)
      }
      const parsed = parseNewOrder(value, this.catalog)
      const destination = this.destination()
      const ready = destination !== null && parsed.amounts.total !== null
      const id = randomUUID()
      const code = `ONK-${randomBytes(8).toString('hex').toUpperCase()}`
      const now = timestamp()
      this.database.prepare(`INSERT INTO shop_orders
        (id, code, owner_hash, idempotency_key, request_hash, status, demo, created_at, updated_at, lines_json, customer_json, delivery_json,
         destination_json, subtotal_minor, shipping_minor, total_minor, privacy_version, privacy_accepted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sinpe-checkout-v1', ?)`)
        .run(id, code, owner, key, hash, ready ? 'awaiting_payment' : 'pending_details', this.catalog.demo ? 1 : 0, now, now,
          JSON.stringify(parsed.lines), JSON.stringify(parsed.customer), JSON.stringify(parsed.delivery), destination ? JSON.stringify(destination) : null,
          parsed.amounts.subtotal, parsed.amounts.shipping, parsed.amounts.total, now)
      this.audit(id, 'order.created', 'customer', ready ? 'Pedido registrado. Pendiente de pago; no se ha verificado ningún abono.' : 'Pedido registrado. No solicitar pago hasta confirmar destino y total.')
      const order = this.getOrder(id)
      this.event(order, 'order.created')
      return order
    })
  }
  assertCode(order: ShopOrder, supplied: unknown) {
    if (!constantEqual(order.code, orderCode(supplied))) throw new StoreError(422, 'El código no corresponde a este pedido. Copia exactamente el código mostrado.')
  }
  checkUpload(id: string, owner: string, suppliedCode: unknown): ShopOrder {
    const order = this.customerOrder(id, owner)
    this.assertCode(order, suppliedCode)
    return order
  }
  addReceipt(id: string, owner: string, suppliedCode: unknown, suppliedReference: unknown, uploadKey: unknown, suppliedVersion: unknown, file: PreparedReceipt): ShopOrder {
    const reference = bankReference(suppliedReference)
    const key = text(uploadKey, 16, 128, 'Identificador de carga')
    const expectedVersion = version(suppliedVersion)
    return this.transaction(() => {
      const order = this.checkUpload(id, owner, suppliedCode)
      const previous = this.database.prepare('SELECT * FROM receipts WHERE order_id = ? AND upload_key = ?').get(id, key)
      if (previous) {
        if (previous.raw_hash !== file.rawHash || previous.bank_reference !== reference) throw new StoreError(409, 'La carga repetida contiene datos distintos. Actualiza el pedido.')
        return order
      }
      if (order.version !== expectedVersion) throw new StoreError(409, 'El pedido cambió mientras adjuntabas el comprobante. Actualiza su estado.')
      if (order.status !== 'awaiting_payment' && order.status !== 'rejected') throw new StoreError(409, 'Este pedido no admite un nuevo comprobante en su estado actual.')
      if (!order.destination || order.totalMinor === null) throw new StoreError(409, 'Primero deben confirmarse el destino SINPE y el total.')
      const duplicate = this.database.prepare('SELECT order_id FROM receipts WHERE raw_hash = ? AND order_id != ?').get(file.rawHash, id)
      if (duplicate) throw new StoreError(409, 'Este comprobante ya está asociado a otro pedido. Adjunta el comprobante correspondiente.')
      const count = Number(this.database.prepare('SELECT count(*) AS count FROM receipts WHERE order_id = ?').get(id)!.count)
      if (count >= 5) throw new StoreError(409, 'Este pedido alcanzó el límite de correcciones. La tienda debe revisar el historial.')
      const receiptId = randomUUID()
      const now = timestamp()
      this.database.prepare('INSERT INTO receipts (id, order_id, upload_key, raw_hash, content_type, size, data, submitted_at, bank_reference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(receiptId, id, key, file.rawHash, file.contentType, file.data.length, file.data, now, reference)
      this.database.prepare("UPDATE shop_orders SET current_receipt_id = ?, status = 'pending_review', customer_message = NULL, version = version + 1, updated_at = ? WHERE id = ?").run(receiptId, now, id)
      this.audit(id, 'receipt.submitted', 'customer', 'Código validado y comprobante recibido. Esto no confirma el pago.')
      const updated = this.getOrder(id)
      this.event(updated, 'payment.review_requested')
      return updated
    })
  }
  receipt(orderId: string, receiptId: string) {
    const row = this.database.prepare('SELECT data, content_type FROM receipts WHERE order_id = ? AND id = ?').get(orderId, receiptId)
    if (!row) throw new StoreError(404, 'Comprobante no encontrado.')
    return { data: Buffer.from(row.data as Uint8Array), contentType: row.content_type as OrderReceipt['contentType'] }
  }
  quote(id: string, value: unknown, actor: string): ShopOrder {
    const data = record(value)
    fields(data, ['version', 'shippingMinor', 'note'])
    const expectedVersion = version(data.version)
    const shipping = minorAmount(data.shippingMinor, true)
    const note = text(data.note, 5, 500, 'Detalle para el cliente')
    return this.transaction(() => {
      const order = this.getOrder(id)
      if (order.version !== expectedVersion || order.status !== 'pending_details') throw new StoreError(409, 'El pedido cambió o ya tiene instrucciones de pago. Actualiza la vista.')
      if (order.shippingMinor !== null && order.shippingMinor !== shipping) throw new StoreError(422, 'No puedes cambiar una tarifa ya fijada para este pedido.')
      const destination = this.destination()
      if (!destination) throw new StoreError(409, 'Configura y habilita el número SINPE y el beneficiario antes de solicitar un pago.')
      const total = minorAmount(order.subtotalMinor + shipping)
      this.database.prepare("UPDATE shop_orders SET destination_json = ?, shipping_minor = ?, total_minor = ?, status = 'awaiting_payment', customer_message = ?, version = version + 1, updated_at = ? WHERE id = ?")
        .run(JSON.stringify(destination), shipping, total, note, timestamp(), id)
      this.audit(id, 'order.quoted', actor, note)
      return this.getOrder(id)
    })
  }
  confirm(id: string, value: unknown, actor: string): ShopOrder {
    const data = record(value)
    fields(data, ['version', 'code', 'bankReference', 'amountMinor', 'checkedBank', 'note'])
    const expectedVersion = version(data.version)
    const reference = bankReference(data.bankReference)
    const amount = minorAmount(data.amountMinor)
    const note = text(data.note, 5, 1000, 'Nota de revisión')
    if (data.checkedBank !== true) throw new StoreError(422, 'Debes comprobar el abono aplicado en banca en línea, no solamente la imagen.')
    return this.transaction(() => {
      const order = this.getOrder(id)
      this.assertCode(order, data.code)
      if (order.totalMinor !== amount) throw new StoreError(422, 'El monto verificado no coincide exactamente con el total del pedido.')
      const existing = this.database.prepare('SELECT bank_reference, amount_minor FROM manual_payments WHERE order_id = ?').get(id)
      if (order.status === 'ready' && existing?.bank_reference === reference && existing.amount_minor === amount) return order
      if (order.version !== expectedVersion || order.status !== 'pending_review' || !order.receipt || !order.destination) throw new StoreError(409, 'El pedido cambió o no tiene un comprobante pendiente de revisión. Actualiza la vista.')
      if (order.receipt.bankReference !== reference) throw new StoreError(422, 'La referencia bancaria no coincide con la enviada por el cliente. Solicita la corrección antes de confirmar.')
      if (this.database.prepare('SELECT order_id FROM manual_payments WHERE bank_reference = ?').get(reference)) throw new StoreError(409, 'Esta referencia bancaria ya fue utilizada para confirmar otro pedido.')
      const now = timestamp()
      this.database.prepare('INSERT INTO manual_payments (order_id, bank_reference, amount_minor, receipt_id, confirmed_by, confirmed_at, note) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(id, reference, amount, order.receipt.id, actor, now, note)
      this.database.prepare("UPDATE shop_orders SET status = 'ready', payment_confirmed_at = ?, customer_message = NULL, version = version + 1, updated_at = ? WHERE id = ?").run(now, now, id)
      this.audit(id, 'payment.confirmed_manual', actor, note)
      const updated = this.getOrder(id)
      this.event(updated, 'payment.confirmed_manual')
      return updated
    })
  }
  reject(id: string, value: unknown, actor: string): ShopOrder {
    const data = record(value)
    fields(data, ['version', 'reason'])
    const expectedVersion = version(data.version)
    const reason = text(data.reason, 5, 500, 'Motivo de corrección')
    return this.transaction(() => {
      const order = this.getOrder(id)
      if (order.status !== 'pending_review' || order.version !== expectedVersion) throw new StoreError(409, 'El pedido ya no tiene esta revisión pendiente. Actualiza la vista.')
      this.database.prepare("UPDATE shop_orders SET status = 'rejected', customer_message = ?, version = version + 1, updated_at = ? WHERE id = ?").run(reason, timestamp(), id)
      this.audit(id, 'receipt.correction_requested', actor, reason)
      return this.getOrder(id)
    })
  }
  auditFor(id: string): OrderAudit[] {
    this.getOrder(id)
    return this.database.prepare('SELECT event, actor, detail, created_at AS createdAt FROM shop_audit WHERE order_id = ? ORDER BY id').all(id) as unknown as OrderAudit[]
  }
  list(query: URLSearchParams): AdminOrders {
    const page = Math.max(1, Math.min(100_000, Number.parseInt(query.get('page') ?? '1', 10) || 1))
    const filter = query.get('status') ?? 'all'
    const search = (query.get('q') ?? '').trim().slice(0, 80)
    const conditions: string[] = []
    const parameters: SQLInputValue[] = []
    if (filter === 'pending') conditions.push("status IN ('pending_details', 'awaiting_payment', 'pending_review')")
    else if (statuses.includes(filter as ShopOrderStatus)) { conditions.push('status = ?'); parameters.push(filter) }
    else if (filter !== 'all') throw new StoreError(422, 'Filtro de estado inválido.')
    if (search) {
      conditions.push("(code LIKE ? ESCAPE '\\' OR customer_json LIKE ? ESCAPE '\\')")
      const like = `%${search.replace(/[\\%_]/g, '\\$&')}%`
      parameters.push(like, like)
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const total = Number(this.database.prepare(`SELECT count(*) AS count FROM shop_orders ${where}`).get(...parameters)!.count)
    const orders = this.database.prepare(`SELECT * FROM shop_orders ${where} ORDER BY created_at DESC, rowid DESC LIMIT 50 OFFSET ?`).all(...parameters, (page - 1) * 50).map(row => this.fromRow(row))
    const counts = Object.fromEntries(statuses.map(status => [status, 0])) as Record<ShopOrderStatus, number>
    for (const row of this.database.prepare('SELECT status, count(*) AS count FROM shop_orders GROUP BY status').all()) counts[row.status as ShopOrderStatus] = Number(row.count)
    return { orders, counts, total, page, pageSize: 50 }
  }
}
