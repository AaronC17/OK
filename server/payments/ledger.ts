import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import type { StoreConfig } from '../../src/types.ts'
import type { PaymentsConfig } from './config.ts'
import { PaymentsError } from './model.ts'
import type { BankMovement, DemoOrder, OrderStatus, StoredMovement } from './model.ts'
import { movementKey, reconcile } from './reconcile.ts'
import { isInstant, parseMovement, parseOrderInput, quoteOrder } from './validation.ts'

const RETRY_DELAYS_MS = [60_000, 120_000, 240_000, 480_000, 900_000]
const PAYMENT_WINDOW_MS = 30 * 60_000

interface OrderRow {
  id: string
  reference: string
  account_id: string
  amount_minor: number
  items_json: string
  delivery_id: string
  status: OrderStatus
  reason: string
  created_at: string
  expires_at: string
  attempts: number
  next_attempt_at: string | null
  request_hash: string
}

function fromRow(row: OrderRow): DemoOrder {
  return {
    id: row.id, reference: row.reference, accountId: row.account_id, amountMinor: row.amount_minor,
    currency: 'CRC', items: JSON.parse(row.items_json) as DemoOrder['items'], deliveryId: row.delivery_id,
    status: row.status, reason: row.reason, createdAt: row.created_at, expiresAt: row.expires_at,
    attempts: row.attempts, nextAttemptAt: row.next_attempt_at, demoOnly: true,
  }
}

export class DemoLedger {
  private db: DatabaseSync
  private config: Pick<PaymentsConfig, 'mode' | 'accountId'>
  private catalog: StoreConfig

  constructor(path: string, config: Pick<PaymentsConfig, 'mode' | 'accountId'>, catalog: StoreConfig) {
    this.db = new DatabaseSync(path)
    this.config = config
    this.catalog = catalog
    this.db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'))
  }

  close() { this.db.close() }

  private transaction<T>(callback: () => T): T {
    // No awaits/network calls inside the write transaction. SQLite also serializes other processes.
    this.db.exec('BEGIN IMMEDIATE')
    try {
      const result = callback()
      this.db.exec('COMMIT')
      return result
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  private audit(orderId: string, event: string, reason: string, now: string) {
    this.db.prepare('INSERT INTO audit (order_id, event, reason, created_at) VALUES (?, ?, ?, ?)').run(orderId, event, reason, now)
  }

  createOrder(value: unknown, idempotencyKey: string, now = new Date().toISOString()): DemoOrder {
    if (!/^[A-Za-z0-9._:-]{16,128}$/.test(idempotencyKey)) throw new PaymentsError(422, 'Se requiere Idempotency-Key de 16 a 128 caracteres.')
    if (!isInstant(now)) throw new PaymentsError(422, 'Fecha inválida.')
    const input = parseOrderInput(value)
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
    return this.transaction(() => {
      const previous = this.db.prepare('SELECT * FROM orders WHERE idempotency_key = ?').get(idempotencyKey) as unknown as OrderRow | undefined
      if (previous) {
        if (previous.request_hash !== hash) throw new PaymentsError(409, 'La clave de idempotencia ya corresponde a otro pedido.')
        return fromRow(previous)
      }
      const amount = quoteOrder(input, this.catalog)
      const id = randomUUID()
      const reference = `ONK-${randomBytes(8).toString('hex').toUpperCase()}`
      const expiresAt = new Date(Date.parse(now) + PAYMENT_WINDOW_MS).toISOString()
      const status = this.config.mode === 'mock' ? 'pending_payment' : 'manual_review'
      const reason = this.config.mode === 'mock' ? 'awaiting_mock_movement' : 'bank_not_configured'
      this.db.prepare(`INSERT INTO orders
        (id, reference, account_id, amount_minor, currency, items_json, delivery_id, status, reason, created_at, expires_at, next_attempt_at, idempotency_key, request_hash)
        VALUES (?, ?, ?, ?, 'CRC', ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, reference, this.config.accountId, amount, JSON.stringify(input.items), input.deliveryId, status, reason, now, expiresAt, status === 'pending_payment' ? now : null, idempotencyKey, hash)
      this.audit(id, 'order.created', reason, now)
      return this.getOrder(id)!
    })
  }

  getOrder(id: string): DemoOrder | null {
    const row = this.db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as unknown as OrderRow | undefined
    return row ? fromRow(row) : null
  }

  listOrders(): DemoOrder[] {
    return (this.db.prepare('SELECT * FROM orders ORDER BY created_at DESC, id LIMIT 100').all() as unknown as OrderRow[]).map(fromRow)
  }

  listAudit(orderId: string) {
    return this.db.prepare('SELECT event, reason, created_at AS createdAt FROM audit WHERE order_id = ? ORDER BY id').all(orderId)
  }

  listEvents() {
    return this.db.prepare('SELECT id, order_id AS orderId, event, created_at AS createdAt FROM outbox ORDER BY created_at, id LIMIT 100').all()
  }

  addMockMovement(value: unknown, now = new Date().toISOString()): { inserted: boolean; conflict: boolean } {
    if (this.config.mode !== 'mock') throw new PaymentsError(409, 'La fuente bancaria está deshabilitada; no se aceptan movimientos simulados.')
    if (!isInstant(now)) throw new PaymentsError(422, 'Fecha inválida.')
    const movement = parseMovement(value)
    const payload = JSON.stringify(movement)
    return this.transaction(() => {
      const previous = this.db.prepare('SELECT payload_json, conflict FROM mock_movements WHERE account_id = ? AND id = ?').get(movement.accountId, movement.id)
      if (previous) {
        const conflict = previous.payload_json !== payload || previous.conflict === 1
        if (conflict && previous.conflict !== 1) {
          // Never overwrite financial identity. Conflicting snapshots require operator investigation.
          this.db.prepare('UPDATE mock_movements SET conflict = 1 WHERE account_id = ? AND id = ?').run(movement.accountId, movement.id)
          const allocated = this.db.prepare('SELECT order_id FROM allocations WHERE account_id = ? AND movement_id = ?').get(movement.accountId, movement.id)
          if (allocated) {
            const orderId = allocated.order_id as string
            this.db.prepare("UPDATE orders SET status = 'manual_review', reason = 'conflicting_movement', next_attempt_at = NULL WHERE id = ?").run(orderId)
            this.audit(orderId, 'movement.conflict', 'conflicting_movement', now)
          }
        }
        return { inserted: false, conflict }
      }
      this.db.prepare('INSERT INTO mock_movements (account_id, id, payload_json) VALUES (?, ?, ?)').run(movement.accountId, movement.id, payload)
      return { inserted: true, conflict: false }
    })
  }

  reconcileDue(now = new Date().toISOString()) {
    if (!isInstant(now)) throw new PaymentsError(422, 'Fecha inválida.')
    return this.transaction(() => {
      const due = this.config.mode === 'mock'
        ? this.db.prepare("SELECT * FROM orders WHERE status = 'pending_payment' AND next_attempt_at <= ? ORDER BY next_attempt_at, id LIMIT 50").all(now) as unknown as OrderRow[]
        : []
      const movements: StoredMovement[] = this.db.prepare('SELECT payload_json, conflict FROM mock_movements').all().map(row => ({
        ...JSON.parse(row.payload_json as string) as BankMovement, conflict: row.conflict === 1,
      }))
      const used = new Set(this.db.prepare('SELECT account_id, movement_id FROM allocations').all().map(row => movementKey({ accountId: row.account_id as string, id: row.movement_id as string })))
      let simulatedCount = 0
      let reviewedCount = 0
      for (const row of due) {
        const order = fromRow(row)
        const decision = reconcile(order, movements, used, now)
        const attempts = order.attempts + 1
        let status: OrderStatus = 'pending_payment'
        let reason: string = decision.reason
        let nextAttemptAt: string | null = null
        if (decision.kind === 'match') {
          this.db.prepare('INSERT INTO allocations (order_id, account_id, movement_id, allocated_at) VALUES (?, ?, ?, ?)')
            .run(order.id, decision.movement.accountId, decision.movement.id, now)
          used.add(movementKey(decision.movement))
          status = 'simulated_paid'
          simulatedCount++
          // Same commit as allocation and order state; never an order.paid / fulfillment event.
          this.db.prepare("INSERT INTO outbox (id, order_id, event, created_at) VALUES (?, ?, 'payment.simulated', ?)").run(randomUUID(), order.id, now)
        } else if (decision.kind === 'review' || attempts > RETRY_DELAYS_MS.length) {
          status = 'manual_review'
          reason = decision.kind === 'review' ? decision.reason : 'attempts_exhausted'
          reviewedCount++
        } else {
          nextAttemptAt = new Date(Math.min(Date.parse(order.expiresAt), Date.parse(now) + RETRY_DELAYS_MS[attempts - 1])).toISOString()
        }
        this.db.prepare("UPDATE orders SET status = ?, reason = ?, attempts = ?, next_attempt_at = ? WHERE id = ? AND status = 'pending_payment'")
          .run(status, reason, attempts, nextAttemptAt, order.id)
        this.audit(order.id, status === 'simulated_paid' ? 'payment.simulated' : status === 'manual_review' ? 'verification.review' : 'verification.retry', reason, now)
      }
      const count = (status: OrderStatus) => Number(this.db.prepare('SELECT count(*) AS count FROM orders WHERE status = ?').get(status)!.count)
      return {
        demoOnly: true, mode: this.config.mode, processedCount: due.length, simulatedCount, reviewedCount,
        pendingCount: count('pending_payment'), manualReviewCount: count('manual_review'),
        conflictCount: Number(this.db.prepare('SELECT count(*) AS count FROM mock_movements WHERE conflict = 1').get()!.count),
      }
    })
  }
}
