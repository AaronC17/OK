import type { ShopOrder } from '../../src/order-types.ts'
import type { ShopRepository } from './repository.ts'
import { StoreError, fields, record, text } from './validation.ts'

/** Actor recorded in the audit trail for confirmations made by the automation. */
export const AUTO_ACTOR = 'auto:n8n-bac'

const CODE_PATTERN = /\bONK-[A-Z0-9]{3,16}\b/gi
const CLOCK_SKEW_MS = 5 * 60_000
/** A bank credit is only linked to an order created at most this long before it. */
const MAX_ORDER_AGE_MS = 72 * 3600_000
const OPEN_STATUSES = ['pending_review', 'awaiting_payment'] as const

/** Normalized movement. n8n builds it from a bank email/SMS/API; this is NOT a BAC schema. */
export interface BankMovementInput {
  source: string
  movementId: string
  bankReference: string | null
  amountMinor: number
  currency: 'CRC'
  bookedAt: string
  description: string | null
  /** True only when n8n verified the origin of the notice (e.g. DKIM + SPF pass for the bank domain). */
  senderVerified: boolean
}

export type AutomationDecision =
  | { decision: 'confirmed'; orderCode: string; matchedBy: 'code' | 'reference'; order: ShopOrder }
  | { decision: 'already_confirmed'; orderCode: string }
  | { decision: 'review'; reason: string; orderCode?: string; candidates?: string[] }
  | { decision: 'no_match'; reason: string }

export function parseBankMovement(value: unknown): BankMovementInput {
  const data = record(value)
  fields(data, ['source', 'movementId', 'bankReference', 'amountMinor', 'currency', 'bookedAt', 'description', 'senderVerified'])
  const amountMinor = data.amountMinor
  if (typeof amountMinor !== 'number' || !Number.isSafeInteger(amountMinor) || amountMinor < 1 || amountMinor > 100_000_000) {
    throw new StoreError(422, 'amountMinor debe ser un entero positivo en céntimos de CRC.')
  }
  if (data.currency !== 'CRC') throw new StoreError(422, 'Solo se admiten abonos en CRC.')
  if (typeof data.senderVerified !== 'boolean') throw new StoreError(422, 'senderVerified debe ser booleano.')
  const bookedAt = text(data.bookedAt, 20, 40, 'bookedAt')
  if (Number.isNaN(Date.parse(bookedAt)) || !/(Z|[+-]\d\d:\d\d)$/.test(bookedAt)) throw new StoreError(422, 'bookedAt debe ser ISO 8601 con zona horaria.')
  const optional = (item: unknown, max: number, label: string) => (item === null || item === undefined || item === '' ? null : text(item, 1, max, label))
  return {
    source: text(data.source, 1, 40, 'source'),
    movementId: text(data.movementId, 6, 200, 'movementId'),
    bankReference: optional(data.bankReference, 80, 'bankReference')?.toUpperCase().replace(/\s+/g, '') ?? null,
    amountMinor, currency: 'CRC', bookedAt: new Date(bookedAt).toISOString(),
    description: optional(data.description, 1000, 'description'),
    senderVerified: data.senderVerified,
  }
}

async function openOrders(store: ShopRepository): Promise<ShopOrder[]> {
  const found: ShopOrder[] = []
  for (const status of OPEN_STATUSES) {
    for (let page = 1; page <= 20; page++) {
      const result = await store.list(new URLSearchParams({ status, page: String(page) }))
      found.push(...result.orders)
      if (result.orders.length < 50) break
    }
  }
  return found
}

/**
 * Decides whether a bank credit proves payment of an order. Auto-confirmation requires ALL of:
 *  - verified origin of the notice,
 *  - exact order total (no tolerance),
 *  - a single order identified by its code in the bank description, or by the bank reference
 *    that the buyer typed with the receipt,
 *  - a credit dated after the order was created (minus clock skew) and within 72 h.
 * An amount+time coincidence alone NEVER confirms; it only returns candidates for manual review.
 */
async function decide(store: ShopRepository, movement: BankMovementInput, now: Date): Promise<AutomationDecision> {
  const booked = Date.parse(movement.bookedAt)
  if (booked > now.getTime() + CLOCK_SKEW_MS) return { decision: 'review', reason: 'booked_in_the_future' }

  const orders = await openOrders(store)
  const codes = [...new Set((movement.description?.match(CODE_PATTERN) ?? []).map(code => code.toUpperCase()))]
  if (codes.length > 1) return { decision: 'review', reason: 'multiple_order_codes' }

  let order: ShopOrder | undefined
  let matchedBy: 'code' | 'reference' | null = null
  if (codes.length === 1) {
    matchedBy = 'code'
    order = orders.find(candidate => candidate.code === codes[0])
    if (!order) {
      // Paid orders are idempotent: the same notice delivered twice must not look like an error.
      const known = (await store.list(new URLSearchParams({ status: 'ready', q: codes[0] }))).orders.find(candidate => candidate.code === codes[0])
      if (known) return known.totalMinor === movement.amountMinor ? { decision: 'already_confirmed', orderCode: known.code } : { decision: 'review', reason: 'amount_mismatch_on_paid_order', orderCode: known.code }
      return { decision: 'no_match', reason: 'code_not_found_or_not_open' }
    }
  } else if (movement.bankReference) {
    const byReference = orders.filter(candidate => candidate.receipt?.bankReference.toUpperCase() === movement.bankReference)
    if (byReference.length > 1) return { decision: 'review', reason: 'reference_matches_several_orders', candidates: byReference.map(item => item.code) }
    if (byReference.length === 1) { order = byReference[0]; matchedBy = 'reference' }
  }

  if (!order || !matchedBy) {
    const created = (candidate: ShopOrder) => Date.parse(candidate.createdAt)
    const candidates = orders.filter(candidate => candidate.totalMinor === movement.amountMinor
      && booked >= created(candidate) - CLOCK_SKEW_MS && booked - created(candidate) <= MAX_ORDER_AGE_MS)
    return candidates.length
      ? { decision: 'review', reason: 'amount_and_time_only', candidates: candidates.map(item => item.code) }
      : { decision: 'no_match', reason: 'no_order_with_that_amount' }
  }

  if (order.totalMinor !== movement.amountMinor) return { decision: 'review', reason: 'amount_mismatch', orderCode: order.code }
  const age = booked - Date.parse(order.createdAt)
  if (age < -CLOCK_SKEW_MS) return { decision: 'review', reason: 'credit_predates_order', orderCode: order.code }
  if (age > MAX_ORDER_AGE_MS) return { decision: 'review', reason: 'credit_too_late', orderCode: order.code }
  if (!movement.senderVerified) return { decision: 'review', reason: 'sender_not_verified', orderCode: order.code }

  try {
    const confirmed = await store.confirm(order.id, {
      version: order.version,
      receiptId: order.status === 'pending_review' && order.receipt ? order.receipt.id : null,
    }, AUTO_ACTOR)
    return { decision: 'confirmed', orderCode: order.code, matchedBy, order: confirmed }
  } catch (error) {
    // Concurrent edits, reused references, etc.: a person must decide; never retry blindly.
    if (error instanceof StoreError && error.status === 409) return { decision: 'review', reason: 'confirmation_conflict', orderCode: order.code }
    throw error
  }
}

/** Non-sensitive echo so the caller can correlate the answer with its queued movement. */
export type AutomationResult = AutomationDecision & { movement: Pick<BankMovementInput, 'movementId' | 'amountMinor' | 'bankReference' | 'bookedAt'> }

export async function reconcileBankMovement(store: ShopRepository, value: unknown, now = new Date()): Promise<AutomationResult> {
  const movement = parseBankMovement(value)
  const decision = await decide(store, movement, now)
  return { ...decision, movement: { movementId: movement.movementId, amountMinor: movement.amountMinor, bankReference: movement.bankReference, bookedAt: movement.bookedAt } }
}
