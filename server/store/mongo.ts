import { createHash, randomUUID } from 'node:crypto'
import { MongoClient } from 'mongodb'
import type { ClientSession, Db } from 'mongodb'
import type { StoreConfig } from '../../src/types.ts'
import type { AdminOrders, OrderAudit, OrderReceipt, ShopOrder, ShopOrderStatus, SinpeDestination, SinpeSettings } from '../../src/order-types.ts'
import { bankReference, fields, minorAmount, orderCode, parseNewOrder, parseSettings, record, StoreError, text, version } from './validation.ts'
import { constantEqual, generateSession, passwordHash, passwordMatches, tokenHash } from './security.ts'
import type { Session } from './security.ts'
import type { PreparedReceipt } from './receipts.ts'
import { shippingFee } from '../../src/lib/shop.ts'
import type { CustomerSession, ShopRepository, StoredReceipt } from './repository.ts'
import type { AdminCustomers, CustomerAccount, CustomerOrders } from '../../src/account-types.ts'
import { accountIdFromOwner, accountOwner, accountPage, accountPasswordHash, accountPasswordMatches, parseAccountLogin, parseRegistration, requireAccount, requireGuest } from './accounts.ts'
import { welcomeDiscount } from '../../src/lib/welcome.ts'

const statuses: ShopOrderStatus[] = ['pending_details', 'awaiting_payment', 'pending_review', 'ready', 'rejected']
const timestamp = () => new Date().toISOString()

export class MongoShopDatabase implements ShopRepository {
  readonly client: MongoClient
  readonly db: Db
  private catalog: StoreConfig
  private initializedPromise: Promise<void> | null = null

  constructor(uri: string, catalog: StoreConfig, options: { dbName?: string } = {}) {
    this.client = new MongoClient(uri, { serverSelectionTimeoutMS: 8_000, connectTimeoutMS: 8_000, maxPoolSize: 10 })
    this.db = this.client.db(options.dbName || 'onkys')
    this.catalog = catalog
  }

  private collection(name: string) {
    return this.db.collection<any>(name)
  }

  async init(): Promise<void> {
    if (!this.initializedPromise) {
      this.initializedPromise = (async () => {
        await Promise.all([
          this.collection('metadata').createIndex({ key: 1 }, { unique: true }),
          this.collection('admin').createIndex({ id: 1 }, { unique: true }),
          this.collection('sessions').createIndex({ token_hash: 1 }, { unique: true }),
          this.collection('sessions').createIndex({ expires_at: 1 }),
          this.collection('customers').createIndex({ id: 1 }, { unique: true }),
          this.collection('customers').createIndex({ email: 1 }, { unique: true }),
          this.collection('shop_orders').createIndex({ id: 1 }, { unique: true }),
          this.collection('shop_orders').createIndex({ code: 1 }, { unique: true }),
          this.collection('shop_orders').createIndex({ owner_hash: 1, idempotency_key: 1 }, { unique: true }),
          this.collection('shop_orders').createIndex({ status: 1, created_at: -1 }),
          this.collection('shop_orders').createIndex({ account_id: 1, created_at: -1 }),
          this.collection('shop_orders').createIndex({ owner_hash: 1, created_at: -1, _id: -1 }),
          this.collection('receipts').createIndex({ id: 1 }, { unique: true }),
          this.collection('receipts').createIndex({ order_id: 1, upload_key: 1 }, { unique: true }),
          this.collection('receipts').createIndex({ raw_hash: 1 }),
          this.collection('manual_payments').createIndex({ bank_reference: 1 }, { unique: true }),
          this.collection('manual_payments').createIndex({ order_id: 1 }, { unique: true }),
          this.collection('shop_audit').createIndex({ order_id: 1, created_at: 1 }),
          this.collection('shop_events').createIndex({ order_id: 1, version: 1, event: 1 }, { unique: true }),
        ])
        await this.completePendingDetails()
      })().catch(error => { this.initializedPromise = null; throw error })
    }
    return this.initializedPromise
  }

  async close(): Promise<void> {
    await this.client.close()
  }

  private async transaction<T>(operation: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = this.client.startSession()
    try {
      let result: T
      await session.withTransaction(async () => {
        result = await operation(session)
      })
      return result!
    } finally {
      await session.endSession()
    }
  }

  private async audit(orderId: string | null, event: string, actor: string, detail: string, session?: ClientSession) {
    const docId = `audit_${randomUUID()}`
    await this.collection('shop_audit').insertOne({
      _id: docId,
      id: docId,
      order_id: orderId,
      event,
      actor,
      detail,
      created_at: timestamp(),
    }, { session })
  }

  private async event(order: ShopOrder, event: string, session?: ClientSession) {
    const id = randomUUID()
    await this.collection('shop_events').insertOne({
      _id: id,
      id,
      order_id: order.id,
      version: order.version,
      event,
      created_at: timestamp(),
    }, { session })
  }

  async initialized(): Promise<boolean> {
    const admin = await this.collection('admin').findOne({ id: 1 })
    return !!admin
  }

  async adminName(): Promise<string | undefined> {
    const admin = await this.collection('admin').findOne({ id: 1 })
    return admin?.username as string | undefined
  }

  async ensureSetupToken(token: string): Promise<void> {
    if (await this.initialized()) return
    await this.collection('metadata').updateOne(
      { key: 'setup_hash' },
      { $set: { _id: 'setup_hash', key: 'setup_hash', value: tokenHash(token) } },
      { upsert: true }
    )
  }

  async setupAdmin(value: unknown): Promise<{ token: string; session: Session }> {
    const data = record(value)
    fields(data, ['setupToken', 'username', 'password'])
    const username = text(data.username, 3, 40, 'Usuario').toLowerCase()
    if (!/^[a-z0-9._-]+$/.test(username)) throw new StoreError(422, 'El usuario solo admite letras, números, puntos, guiones y guiones bajos.')
    const setupToken = text(data.setupToken, 43, 43, 'Código de instalación')
    if (await this.initialized()) throw new StoreError(409, 'La administración ya fue configurada. Inicia sesión.')
    const meta = await this.collection('metadata').findOne({ key: 'setup_hash' })
    const expected = meta?.value as string | undefined
    if (!expected || !constantEqual(tokenHash(setupToken), expected)) throw new StoreError(403, 'Código de instalación incorrecto.')
    const hash = passwordHash(data.password)
    return this.transaction(async session => {
      if (await this.initialized()) throw new StoreError(409, 'La administración ya fue configurada.')
      await this.collection('admin').insertOne({ _id: 1, id: 1, username, password_hash: hash }, { session })
      await this.collection('metadata').deleteOne({ key: 'setup_hash' }, { session })
      await this.audit(null, 'admin.created', username, 'Configuración inicial completada.', session)
      return this.createAdminSession(session)
    })
  }

  async login(value: unknown): Promise<{ token: string; session: Session }> {
    const data = record(value)
    fields(data, ['username', 'password'])
    const username = text(data.username, 1, 40, 'Usuario').toLowerCase()
    const admin = await this.collection('admin').findOne({ id: 1 })
    if (!admin || !constantEqual(username, admin.username as string) || !passwordMatches(data.password, admin.password_hash as string)) throw new StoreError(401, 'Usuario o contraseña incorrectos.')
    await this.collection('sessions').deleteMany({ expires_at: { $lte: Date.now() } })
    return this.createAdminSession()
  }

  private async createAdminSession(session?: ClientSession) {
    const { token, session: newSession } = generateSession('admin')
    await this.collection('sessions').updateOne(
      { token_hash: newSession.hash },
      { $set: { _id: newSession.hash, token_hash: newSession.hash, role: newSession.role, csrf: newSession.csrf, expires_at: newSession.expiresAt } },
      { upsert: true, session }
    )
    return { token, session: newSession }
  }

  async session(token: string | undefined, role: Session['role']): Promise<Session | null> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null
    const hash = tokenHash(token)
    const doc = await this.collection('sessions').findOne({ token_hash: hash, role, expires_at: { $gt: Date.now() } })
    return doc ? { hash: doc.token_hash as string, role, csrf: doc.csrf as string, expiresAt: doc.expires_at as number, accountId: doc.account_id as string | null ?? null } : null
  }

  async customerSession(token: string | undefined): Promise<CustomerSession> {
    const existing = await this.session(token, 'customer')
    if (existing) return { session: existing, token: null }
    await this.collection('sessions').deleteMany({ expires_at: { $lte: Date.now() } })
    const { token: newTokenValue, session } = generateSession('customer')
    await this.collection('sessions').updateOne(
      { token_hash: session.hash },
      { $set: { _id: session.hash, token_hash: session.hash, role: session.role, csrf: session.csrf, expires_at: session.expiresAt } },
      { upsert: true }
    )
    return { session, token: newTokenValue }
  }

  async logout(session: Session): Promise<void> {
    await this.collection('sessions').deleteOne({ token_hash: session.hash })
  }

  private accountFromDoc(row: Record<string, any>): CustomerAccount {
    return { id: row.id, name: row.name, email: row.email, createdAt: row.created_at, welcomeAvailable: !row.welcome_order_id }
  }

  async account(session: Session): Promise<CustomerAccount | null> {
    if (!session.accountId) return null
    const row = await this.collection('customers').findOne({ id: session.accountId }, { projection: { password_hash: 0 } })
    return row ? this.accountFromDoc(row) : null
  }

  private async signInCustomer(id: string, previous: Session, session: ClientSession) {
    const removed = await this.collection('sessions').deleteOne({ token_hash: previous.hash, role: 'customer', account_id: null, expires_at: { $gt: Date.now() } }, { session })
    if (removed.deletedCount !== 1) throw new StoreError(409, 'La sesión cambió. Actualiza la página antes de continuar.')
    await this.collection('shop_orders').updateMany({ owner_hash: previous.hash, account_id: null }, { $set: { owner_hash: accountOwner(id), account_id: id } }, { session })
    const result = generateSession('customer', Date.now(), id)
    const next = result.session
    await this.collection('sessions').insertOne({ _id: next.hash, token_hash: next.hash, role: next.role, csrf: next.csrf, expires_at: next.expiresAt, account_id: id }, { session })
    return result
  }

  async registerCustomer(value: unknown, previous: Session) {
    requireGuest(previous)
    const data = parseRegistration(value)
    const hash = await accountPasswordHash(data.password)
    try {
      return await this.transaction(async session => {
        if (await this.collection('customers').findOne({ email: data.email }, { session })) throw new StoreError(409, 'Ya existe una cuenta con este correo. Inicia sesión.')
        const id = randomUUID()
        const now = timestamp()
        await this.collection('customers').insertOne({ _id: id, id, name: data.name, email: data.email, password_hash: hash, created_at: now, welcome_order_id: null, privacy_version: 'customer-account-v1', privacy_accepted_at: now }, { session })
        const result = await this.signInCustomer(id, previous, session)
        await this.audit(null, 'customer.registered', id, 'Cuenta creada con consentimiento. Descuento de bienvenida disponible para el primer pedido.', session)
        return result
      })
    } catch (error) {
      if ((error as { code?: number }).code === 11000) throw new StoreError(409, 'Ya existe una cuenta con este correo. Inicia sesión.')
      throw error
    }
  }

  async loginCustomer(value: unknown, previous: Session) {
    requireGuest(previous)
    const data = parseAccountLogin(value)
    const row = await this.collection('customers').findOne({ email: data.email })
    if (!await accountPasswordMatches(data.password, row?.password_hash)) throw new StoreError(401, 'Correo o contraseña incorrectos.')
    return this.transaction(session => this.signInCustomer(row!.id, previous, session))
  }

  async accountOrders(session: Session, query: URLSearchParams): Promise<CustomerOrders> {
    const id = requireAccount(session)
    const page = accountPage(query)
    const filter = { account_id: id }
    const total = await this.collection('shop_orders').countDocuments(filter)
    const rows = await this.collection('shop_orders').find(filter).sort({ created_at: -1, _id: -1 }).skip((page - 1) * 20).limit(20).toArray()
    return { orders: await this.fromDocs(rows), total, page, pageSize: 20 }
  }

  async customers(query: URLSearchParams): Promise<AdminCustomers> {
    const page = accountPage(query)
    const search = (query.get('q') ?? '').trim().slice(0, 80)
    const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const filter = search ? { $or: [{ name: regex }, { email: regex }] } : {}
    const total = await this.collection('customers').countDocuments(filter)
    const rows = await this.collection('customers').find(filter, { projection: { password_hash: 0 } }).sort({ created_at: -1, id: -1 }).skip((page - 1) * 50).limit(50).toArray()
    const counts = rows.length ? await this.collection('shop_orders').aggregate<{ _id: string; count: number }>([
      { $match: { account_id: { $in: rows.map(row => row.id) } } },
      { $group: { _id: '$account_id', count: { $sum: 1 } } },
    ]).toArray() : []
    const byCustomer = new Map(counts.map(row => [row._id, row.count]))
    const customers = rows.map(row => ({ ...this.accountFromDoc(row), orderCount: byCustomer.get(row.id) ?? 0 }))
    return { customers, total, page, pageSize: 50 }
  }

  async settings(session?: ClientSession): Promise<SinpeSettings> {
    const doc = await this.collection('metadata').findOne({ key: 'sinpe' }, { session })
    return doc?.value ? JSON.parse(doc.value as string) as SinpeSettings : { enabled: false, phone: '', beneficiary: '' }
  }

  async destination(session?: ClientSession): Promise<SinpeDestination | null> {
    const settings = await this.settings(session)
    return settings.enabled ? { phone: settings.phone, beneficiary: settings.beneficiary, bank: 'BAC Credomatic' } : null
  }

  async configure(value: unknown, actor: string): Promise<SinpeSettings> {
    const settings = parseSettings(value)
    return this.transaction(async session => {
      await this.collection('metadata').updateOne(
        { key: 'sinpe' },
        { $set: { _id: 'sinpe', key: 'sinpe', value: JSON.stringify(settings) } },
        { upsert: true, session }
      )
      await this.audit(null, 'sinpe.configured', actor, settings.enabled ? 'Destino SINPE habilitado. Los pedidos con instrucciones conservan su destino original.' : 'Nuevas instrucciones SINPE deshabilitadas.', session)
      await this.completePendingDetails(session)
      return settings
    })
  }

  isDemo(): boolean {
    return this.catalog.demo
  }

  private async completePendingDetails(session?: ClientSession): Promise<void> {
    const destination = await this.destination(session)
    const cursor = this.collection('shop_orders').find({ status: 'pending_details', current_receipt_id: null }, { session })
    for await (const row of cursor) {
      const delivery = JSON.parse(row.delivery_json as string) as ShopOrder['delivery']
      const shipping = row.shipping_minor === null ? shippingFee(row.subtotal_minor as number, this.catalog.deliveryMethods.find(method => method.id === delivery.id)) : row.shipping_minor as number
      const total = shipping === null ? null : minorAmount((row.subtotal_minor as number) - (row.discount_minor ?? 0) + shipping)
      const savedDestination = destination ? JSON.stringify(destination) : row.destination_json as string | null
      const status = total !== null && destination ? 'awaiting_payment' : 'pending_details'
      if (shipping === row.shipping_minor && total === row.total_minor && savedDestination === row.destination_json && status === row.status) continue
      await this.collection('shop_orders').updateOne(
        { _id: row._id, status: 'pending_details', version: row.version },
        {
          $set: {
            shipping_minor: shipping,
            total_minor: total,
            destination_json: savedDestination,
            status,
            updated_at: timestamp(),
          },
          $inc: { version: 1 }
        },
        { session }
      )
      await this.audit(row.id as string, 'order.details_completed', 'system', 'Entrega calculada automáticamente. Las instrucciones SINPE se habilitan cuando el destino está configurado.', session)
    }
  }

  private async fromDoc(row: Record<string, any>, session?: ClientSession): Promise<ShopOrder> {
    let receipt: Record<string, any> | null = null
    if (row.current_receipt_id) {
      receipt = await this.collection('receipts').findOne({ id: row.current_receipt_id, order_id: row.id }, { session, projection: { data: 0 } })
    }
    return this.orderFromDoc(row, receipt)
  }

  private async fromDocs(rows: Record<string, any>[]): Promise<ShopOrder[]> {
    const ids = rows.map(row => row.current_receipt_id).filter(Boolean)
    // Lists need metadata, never the private multi-megabyte attachment bytes.
    const receipts = ids.length ? await this.collection('receipts').find({ id: { $in: ids } }, { projection: { data: 0 } }).toArray() : []
    const byId = new Map(receipts.map(receipt => [receipt.id, receipt]))
    return rows.map(row => {
      const receipt = byId.get(row.current_receipt_id)
      return this.orderFromDoc(row, receipt?.order_id === row.id ? receipt : null)
    })
  }

  private orderFromDoc(row: Record<string, any>, receipt: Record<string, any> | null): ShopOrder {
    return {
      id: row.id as string,
      code: row.code as string,
      version: row.version as number,
      status: row.status as ShopOrderStatus,
      demo: row.demo === 1,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      lines: JSON.parse(row.lines_json as string) as ShopOrder['lines'],
      customer: JSON.parse(row.customer_json as string) as ShopOrder['customer'],
      delivery: JSON.parse(row.delivery_json as string) as ShopOrder['delivery'],
      destination: row.destination_json ? JSON.parse(row.destination_json as string) as SinpeDestination : null,
      subtotalMinor: row.subtotal_minor as number,
      discountMinor: row.discount_minor ?? 0,
      customerAccountId: row.account_id ?? null,
      shippingMinor: row.shipping_minor as number | null,
      totalMinor: row.total_minor as number | null,
      receipt: receipt ? {
        id: receipt.id as string,
        contentType: receipt.content_type as OrderReceipt['contentType'],
        size: receipt.size as number,
        submittedAt: receipt.submitted_at as string,
        bankReference: receipt.bank_reference as string,
      } : null,
      customerMessage: row.customer_message as string | null,
      paymentConfirmedAt: row.payment_confirmed_at as string | null,
      paymentVerification: row.payment_confirmed_at ? 'manual' : null,
    }
  }

  async getOrder(id: string, session?: ClientSession): Promise<ShopOrder> {
    const row = await this.collection('shop_orders').findOne({ id }, { session })
    if (!row) throw new StoreError(404, 'Pedido no encontrado.')
    return this.fromDoc(row, session)
  }

  async customerOrder(id: string, owner: string): Promise<ShopOrder> {
    const row = await this.collection('shop_orders').findOne({ id, owner_hash: owner })
    if (!row) throw new StoreError(404, 'Pedido no encontrado en esta sesión.')
    return this.fromDoc(row)
  }

  async currentOrder(owner: string): Promise<ShopOrder | null> {
    const row = await this.collection('shop_orders').findOne({ owner_hash: owner }, { sort: { created_at: -1, _id: -1 } })
    return row ? this.fromDoc(row) : null
  }

  async createOrder(value: unknown, owner: string, key: string): Promise<ShopOrder> {
    if (!/^[A-Za-z0-9-]{16,128}$/.test(key)) throw new StoreError(422, 'Falta una clave de idempotencia válida.')
    record(value)
    const hash = createHash('sha256').update(JSON.stringify(value)).digest('hex')
    return this.transaction(async session => {
      const previous = await this.collection('shop_orders').findOne({ owner_hash: owner, idempotency_key: key }, { session })
      if (previous) {
        if (previous.request_hash !== hash) throw new StoreError(409, 'Esta solicitud ya corresponde a otro carrito. Actualiza los datos.')
        return this.fromDoc(previous, session)
      }
      const parsed = parseNewOrder(value, this.catalog)
      const accountId = accountIdFromOwner(owner)
      const account = accountId ? await this.collection('customers').findOne({ id: accountId }, { session }) : null
      if (accountId && !account) throw new StoreError(401, 'Inicia sesión de nuevo para registrar el pedido.')
      const discount = welcomeDiscount(parsed.amounts.subtotal, !!account && !account.welcome_order_id)
      const total = parsed.amounts.total === null ? null : parsed.amounts.total - discount
      const destination = await this.destination(session)
      const ready = destination !== null && parsed.amounts.total !== null
      const id = randomUUID()
      let nextNum = 1001
      const meta = await this.collection('metadata').findOne({ key: 'order_number' }, { session })
      if (meta && typeof meta.seq === 'number' && meta.seq >= nextNum) {
        nextNum = meta.seq + 1
      } else {
        const last = await this.collection('shop_orders').find({ code: /^ONK-\d+$/ }, { projection: { code: 1 }, session }).sort({ created_at: -1 }).limit(50).toArray()
        for (const doc of last) {
          const match = /^ONK-(\d+)$/.exec(doc.code)
          if (match) {
            const n = Number(match[1])
            if (n >= nextNum) nextNum = n + 1
          }
        }
      }
      while (await this.collection('shop_orders').findOne({ code: `ONK-${nextNum}` }, { session })) {
        nextNum++
      }
      await this.collection('metadata').updateOne({ key: 'order_number' }, { $set: { seq: nextNum } }, { upsert: true, session })
      const code = `ONK-${nextNum}`
      const now = timestamp()
      const newOrder = {
        _id: id,
        id,
        code,
        owner_hash: owner,
        idempotency_key: key,
        request_hash: hash,
        version: 1,
        status: ready ? 'awaiting_payment' : 'pending_details',
        demo: this.catalog.demo ? 1 : 0,
        created_at: now,
        updated_at: now,
        lines_json: JSON.stringify(parsed.lines),
        customer_json: JSON.stringify(parsed.customer),
        delivery_json: JSON.stringify(parsed.delivery),
        destination_json: destination ? JSON.stringify(destination) : null,
        subtotal_minor: parsed.amounts.subtotal,
        shipping_minor: parsed.amounts.shipping,
        total_minor: total,
        discount_minor: discount,
        account_id: accountId,
        current_receipt_id: null,
        customer_message: null,
        payment_confirmed_at: null,
        privacy_version: 'sinpe-checkout-v1',
        privacy_accepted_at: now,
      }
      await this.collection('shop_orders').insertOne(newOrder, { session })
      if (accountId && !account?.welcome_order_id) await this.collection('customers').updateOne({ id: accountId, welcome_order_id: null }, { $set: { welcome_order_id: id } }, { session })
      await this.audit(id, 'order.created', 'customer', ready ? 'Pedido registrado. Pendiente de pago; no se ha verificado ningún abono.' : 'Pedido registrado. No solicitar pago hasta confirmar destino y total.', session)
      const order = await this.getOrder(id, session)
      await this.event(order, 'order.created', session)
      return order
    })
  }

  assertCode(order: ShopOrder, supplied: unknown) {
    if (!constantEqual(order.code, orderCode(supplied))) throw new StoreError(422, 'El código no corresponde a este pedido. Copia exactamente el código mostrado.')
  }

  async checkUpload(id: string, owner: string, suppliedCode?: unknown, session?: ClientSession): Promise<ShopOrder> {
    const row = await this.collection('shop_orders').findOne({ id, owner_hash: owner }, { session })
    if (!row) throw new StoreError(404, 'Pedido no encontrado en esta sesión.')
    const order = await this.fromDoc(row, session)
    if (suppliedCode !== undefined && suppliedCode !== null && suppliedCode !== '') this.assertCode(order, suppliedCode)
    return order
  }

  async addReceipt(id: string, owner: string, suppliedCode: unknown, suppliedReference: unknown, uploadKey: unknown, suppliedVersion: unknown, file: PreparedReceipt): Promise<ShopOrder> {
    const key = text(uploadKey, 16, 128, 'Identificador de carga')
    const expectedVersion = version(suppliedVersion)
    return this.transaction(async session => {
      const order = await this.checkUpload(id, owner, suppliedCode, session)
      const reference = suppliedReference === undefined || suppliedReference === null || suppliedReference === ''
        ? bankReference(`${order.code}-${key.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}`)
        : bankReference(suppliedReference)
      const previous = await this.collection('receipts').findOne({ order_id: id, upload_key: key }, { session })
      if (previous) {
        if (previous.raw_hash !== file.rawHash || previous.bank_reference !== reference) throw new StoreError(409, 'La carga repetida contiene datos distintos. Actualiza el pedido.')
        return order
      }
      if (order.version !== expectedVersion) throw new StoreError(409, 'El pedido cambió mientras adjuntabas el comprobante. Actualiza su estado.')
      if (order.status !== 'awaiting_payment' && order.status !== 'rejected') throw new StoreError(409, 'Este pedido no admite un nuevo comprobante en su estado actual.')
      if (!order.destination || order.totalMinor === null) throw new StoreError(409, 'Primero deben confirmarse el destino SINPE y el total.')
      const duplicate = await this.collection('receipts').findOne({ raw_hash: file.rawHash, order_id: { $ne: id } }, { session })
      if (duplicate) throw new StoreError(409, 'Este comprobante ya está asociado a otro pedido. Adjunta el comprobante correspondiente.')
      const count = await this.collection('receipts').countDocuments({ order_id: id }, { session })
      if (count >= 5) throw new StoreError(409, 'Este pedido alcanzó el límite de correcciones. La tienda debe revisar el historial.')
      const receiptId = randomUUID()
      const now = timestamp()
      await this.collection('receipts').insertOne({
        _id: receiptId,
        id: receiptId,
        order_id: id,
        upload_key: key,
        raw_hash: file.rawHash,
        content_type: file.contentType,
        size: file.data.length,
        data: file.data,
        submitted_at: now,
        bank_reference: reference,
      }, { session })
      await this.collection('shop_orders').updateOne(
        { id },
        {
          $set: { current_receipt_id: receiptId, status: 'pending_review', customer_message: null, updated_at: now },
          $inc: { version: 1 },
        },
        { session }
      )
      await this.audit(id, 'receipt.submitted', 'customer', 'Código validado y comprobante recibido. Esto no confirma el pago.', session)
      const updated = await this.getOrder(id, session)
      await this.event(updated, 'payment.review_requested', session)
      return updated
    })
  }

  async receipt(orderId: string, receiptId: string): Promise<StoredReceipt> {
    const row = await this.collection('receipts').findOne({ order_id: orderId, id: receiptId })
    if (!row) throw new StoreError(404, 'Comprobante no encontrado.')
    const buffer = Buffer.isBuffer(row.data) ? row.data : (row.data?.buffer ? Buffer.from(row.data.buffer) : Buffer.from(row.data))
    return { data: buffer, contentType: row.content_type as OrderReceipt['contentType'] }
  }

  async confirm(id: string, value: unknown, actor: string): Promise<ShopOrder> {
    const data = record(value)
    fields(data, ['version', 'receiptId'])
    const expectedVersion = version(data.version)
    const receiptId = data.receiptId === undefined || data.receiptId === null ? null : text(data.receiptId, 36, 36, 'Comprobante revisado')
    return this.transaction(async session => {
      const order = await this.getOrder(id, session)
      const existing = await this.collection('manual_payments').findOne({ order_id: id }, { session })
      if (order.status === 'ready' && existing && (receiptId === null || existing.receipt_id === receiptId)) return order
      if (order.version !== expectedVersion || order.status === 'ready') throw new StoreError(409, 'El pedido cambió o no tiene este comprobante pendiente de revisión. Actualiza la vista.')
      if (order.totalMinor === null) throw new StoreError(409, 'Confirma el total del pedido antes de registrar el pago.')
      if (receiptId !== null && (order.status !== 'pending_review' || !order.receipt || order.receipt.id !== receiptId || !order.destination || order.totalMinor === null)) {
        throw new StoreError(409, 'El pedido cambió o no tiene este comprobante pendiente de revisión. Actualiza la vista.')
      }
      const useReceipt = order.receipt && order.status === 'pending_review' ? order.receipt : null
      const reference = useReceipt ? bankReference(useReceipt.bankReference) : `MANUAL-${order.code}`
      const amount = minorAmount(order.totalMinor)
      const note = useReceipt
        ? 'Confirmado manualmente por el administrador al revisar el pedido, su código y el comprobante. Sin consulta bancaria automática.'
        : 'Confirmado manualmente por el administrador tras verificar el pago. Sin consulta bancaria automática.'
      const dup = await this.collection('manual_payments').findOne({ bank_reference: reference, order_id: { $ne: id } }, { session })
      if (dup) throw new StoreError(409, 'Esta referencia bancaria ya fue utilizada para confirmar otro pedido.')
      const now = timestamp()
      await this.collection('manual_payments').insertOne({
        _id: id,
        order_id: id,
        bank_reference: reference,
        amount_minor: amount,
        receipt_id: useReceipt?.id ?? null,
        confirmed_by: actor,
        confirmed_at: now,
        note,
      }, { session })
      await this.collection('shop_orders').updateOne(
        { id },
        {
          $set: { status: 'ready', payment_confirmed_at: now, customer_message: null, updated_at: now },
          $inc: { version: 1 },
        },
        { session }
      )
      await this.audit(id, 'payment.confirmed_manual', actor, note, session)
      const updated = await this.getOrder(id, session)
      await this.event(updated, 'payment.confirmed_manual', session)
      return updated
    })
  }

  async reject(id: string, value: unknown, actor: string): Promise<ShopOrder> {
    const data = record(value)
    fields(data, ['version', 'reason'])
    const expectedVersion = version(data.version)
    const reason = text(data.reason, 5, 500, 'Motivo de corrección')
    return this.transaction(async session => {
      const order = await this.getOrder(id, session)
      if (order.status !== 'pending_review' || order.version !== expectedVersion) throw new StoreError(409, 'El pedido ya no tiene esta revisión pendiente. Actualiza la vista.')
      const now = timestamp()
      await this.collection('shop_orders').updateOne(
        { id },
        {
          $set: { status: 'rejected', customer_message: reason, updated_at: now },
          $inc: { version: 1 },
        },
        { session }
      )
      await this.audit(id, 'receipt.correction_requested', actor, reason, session)
      return this.getOrder(id, session)
    })
  }

  async auditFor(id: string): Promise<OrderAudit[]> {
    await this.getOrder(id)
    const docs = await this.collection('shop_audit').find({ order_id: id }).sort({ created_at: 1, _id: 1 }).toArray()
    return docs.map(d => ({
      event: d.event as string,
      actor: d.actor as string,
      detail: d.detail as string,
      createdAt: d.created_at as string,
    }))
  }

  async list(query: URLSearchParams): Promise<AdminOrders> {
    const page = Math.max(1, Math.min(100_000, Number.parseInt(query.get('page') ?? '1', 10) || 1))
    const filter = query.get('status') ?? 'all'
    const search = (query.get('q') ?? '').trim().slice(0, 80)
    const filterQuery: any = {}
    const customerId = query.get('customerId')
    if (customerId) filterQuery.account_id = customerId.slice(0, 36)
    if (filter === 'pending') {
      filterQuery.status = { $in: ['pending_details', 'awaiting_payment', 'pending_review', 'rejected'] }
    } else if (statuses.includes(filter as ShopOrderStatus)) {
      filterQuery.status = filter
    } else if (filter !== 'all') {
      throw new StoreError(422, 'Filtro de estado inválido.')
    }

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
      filterQuery.$or = [
        { code: { $regex: regex } },
        { customer_json: { $regex: regex } },
      ]
    }

    const total = await this.collection('shop_orders').countDocuments(filterQuery)
    const rows = await this.collection('shop_orders')
      .find(filterQuery)
      .sort({ created_at: -1, _id: -1 })
      .skip((page - 1) * 50)
      .limit(50)
      .toArray()
    const orders = await this.fromDocs(rows)

    const counts = Object.fromEntries(statuses.map(status => [status, 0])) as Record<ShopOrderStatus, number>
    const agg = await this.collection('shop_orders').aggregate([
      ...(customerId ? [{ $match: { account_id: customerId.slice(0, 36) } }] : []),
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).toArray()
    for (const item of agg) {
      if (item._id in counts) {
        counts[item._id as ShopOrderStatus] = item.count
      }
    }
    return { orders, counts, total, page, pageSize: 50 }
  }
}
