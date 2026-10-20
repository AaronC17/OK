import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'
import { MongoClient } from 'mongodb'

const defaultMongoUri = 'mongodb+srv://utn:88406844Cr..@cluster0.nsiunx4.mongodb.net/?appName=Cluster0'
const mongoUri = process.env.MONGODB_URI || defaultMongoUri
const dbName = process.env.MONGODB_DB_NAME || 'onkys'
const sqlitePath = resolve(process.env.STORE_DATA_DIR || '.data/store', 'orders.sqlite')

export async function migrateSqliteToMongo() {
  console.log(`Abriendo SQLite desde: ${sqlitePath}`)
  const sqlite = new DatabaseSync(sqlitePath)

  console.log(`Conectando a MongoDB Atlas en base de datos: ${dbName}...`)
  const mongo = new MongoClient(mongoUri)
  await mongo.connect()
  const db = mongo.db(dbName)

  try {
    // 1. Metadata
    const metadataRows = sqlite.prepare('SELECT key, value FROM metadata').all() as { key: string; value: string }[]
    for (const row of metadataRows) {
      await db.collection('metadata').updateOne(
        { key: row.key },
        { $set: { _id: row.key, key: row.key, value: row.value } },
        { upsert: true }
      )
    }
    console.log(`✓ metadata: ${metadataRows.length} registros migrados`)

    // 2. Admin
    const adminRows = sqlite.prepare('SELECT id, username, password_hash FROM admin').all() as { id: number; username: string; password_hash: string }[]
    for (const row of adminRows) {
      await db.collection('admin').updateOne(
        { id: row.id },
        { $set: { _id: row.id, id: row.id, username: row.username, password_hash: row.password_hash } },
        { upsert: true }
      )
    }
    console.log(`✓ admin: ${adminRows.length} registros migrados`)

    // Customer accounts are optional in databases created before registration existed.
    if (sqlite.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'customers'").get()) {
      const customers = sqlite.prepare('SELECT * FROM customers').all() as Record<string, any>[]
      for (const customer of customers) {
        await db.collection('customers').updateOne({ id: customer.id }, { $set: { ...customer, _id: customer.id } }, { upsert: true })
      }
      console.log(`✓ customers: ${customers.length} cuentas migradas`)
    }

    // 3. Sessions
    const sessionRows = sqlite.prepare('SELECT * FROM sessions').all() as { token_hash: string; role: string; csrf: string; expires_at: number; account_id?: string | null }[]
    for (const row of sessionRows) {
      await db.collection('sessions').updateOne(
        { token_hash: row.token_hash },
        { $set: { _id: row.token_hash, token_hash: row.token_hash, role: row.role, csrf: row.csrf, expires_at: row.expires_at, account_id: row.account_id ?? null } },
        { upsert: true }
      )
    }
    console.log(`✓ sessions: ${sessionRows.length} registros migrados`)

    // 4. Shop Orders
    const orderRows = sqlite.prepare('SELECT * FROM shop_orders').all() as Record<string, any>[]
    for (const row of orderRows) {
      await db.collection('shop_orders').updateOne(
        { id: row.id },
        {
          $set: {
            _id: row.id,
            id: row.id,
            code: row.code,
            owner_hash: row.owner_hash,
            idempotency_key: row.idempotency_key,
            request_hash: row.request_hash,
            version: row.version,
            status: row.status,
            demo: row.demo,
            created_at: row.created_at,
            updated_at: row.updated_at,
            lines_json: row.lines_json,
            customer_json: row.customer_json,
            delivery_json: row.delivery_json,
            destination_json: row.destination_json,
            subtotal_minor: row.subtotal_minor,
            shipping_minor: row.shipping_minor,
            total_minor: row.total_minor,
            account_id: row.account_id ?? null,
            discount_minor: row.discount_minor ?? 0,
            current_receipt_id: row.current_receipt_id,
            customer_message: row.customer_message,
            payment_confirmed_at: row.payment_confirmed_at,
            privacy_version: row.privacy_version,
            privacy_accepted_at: row.privacy_accepted_at,
          }
        },
        { upsert: true }
      )
    }
    console.log(`✓ shop_orders: ${orderRows.length} pedidos migrados`)

    // 5. Receipts
    const receiptRows = sqlite.prepare('SELECT * FROM receipts').all() as Record<string, any>[]
    for (const row of receiptRows) {
      await db.collection('receipts').updateOne(
        { id: row.id },
        {
          $set: {
            _id: row.id,
            id: row.id,
            order_id: row.order_id,
            upload_key: row.upload_key,
            raw_hash: row.raw_hash,
            content_type: row.content_type,
            size: row.size,
            data: Buffer.from(row.data as Uint8Array),
            submitted_at: row.submitted_at,
            bank_reference: row.bank_reference,
          }
        },
        { upsert: true }
      )
    }
    console.log(`✓ receipts: ${receiptRows.length} comprobantes migrados`)

    // 6. Manual Payments
    const paymentRows = sqlite.prepare('SELECT * FROM manual_payments').all() as Record<string, any>[]
    for (const row of paymentRows) {
      await db.collection('manual_payments').updateOne(
        { order_id: row.order_id },
        {
          $set: {
            _id: row.order_id,
            order_id: row.order_id,
            bank_reference: row.bank_reference,
            amount_minor: row.amount_minor,
            receipt_id: row.receipt_id,
            confirmed_by: row.confirmed_by,
            confirmed_at: row.confirmed_at,
            note: row.note,
          }
        },
        { upsert: true }
      )
    }
    console.log(`✓ manual_payments: ${paymentRows.length} pagos migrados`)

    // 7. Shop Audit
    const auditRows = sqlite.prepare('SELECT * FROM shop_audit').all() as Record<string, any>[]
    for (const row of auditRows) {
      const docId = `audit_${row.id}`
      await db.collection('shop_audit').updateOne(
        { _id: docId },
        {
          $set: {
            _id: docId,
            id: row.id,
            order_id: row.order_id,
            event: row.event,
            actor: row.actor,
            detail: row.detail,
            created_at: row.created_at,
          }
        },
        { upsert: true }
      )
    }
    console.log(`✓ shop_audit: ${auditRows.length} registros de auditoría migrados`)

    // 8. Shop Events
    const eventRows = sqlite.prepare('SELECT * FROM shop_events').all() as Record<string, any>[]
    for (const row of eventRows) {
      await db.collection('shop_events').updateOne(
        { id: row.id },
        {
          $set: {
            _id: row.id,
            id: row.id,
            order_id: row.order_id,
            version: row.version,
            event: row.event,
            created_at: row.created_at,
          }
        },
        { upsert: true }
      )
    }
    console.log(`✓ shop_events: ${eventRows.length} eventos migrados`)

    // Índices
    console.log('Creando índices en MongoDB Atlas...')
    await Promise.all([
      db.collection('metadata').createIndex({ key: 1 }, { unique: true }),
      db.collection('admin').createIndex({ id: 1 }, { unique: true }),
      db.collection('sessions').createIndex({ token_hash: 1 }, { unique: true }),
      db.collection('sessions').createIndex({ expires_at: 1 }),
      db.collection('shop_orders').createIndex({ code: 1 }, { unique: true }),
      db.collection('shop_orders').createIndex({ owner_hash: 1, idempotency_key: 1 }, { unique: true }),
      db.collection('shop_orders').createIndex({ status: 1, created_at: -1 }),
      db.collection('receipts').createIndex({ order_id: 1, upload_key: 1 }, { unique: true }),
      db.collection('receipts').createIndex({ raw_hash: 1 }),
      db.collection('manual_payments').createIndex({ bank_reference: 1 }, { unique: true }),
      db.collection('shop_audit').createIndex({ order_id: 1, created_at: 1 }),
      db.collection('shop_events').createIndex({ order_id: 1, version: 1, event: 1 }, { unique: true }),
    ])
    console.log('✓ Índices asegurados exitosamente.')

    console.log('\n¡Migración completada con éxito!')
  } finally {
    sqlite.close()
    await mongo.close()
  }
}

if (process.argv[1]?.endsWith('migrate-sqlite-to-mongo.ts')) {
  migrateSqliteToMongo().catch(err => {
    console.error('Error durante la migración:', err)
    process.exit(1)
  })
}
