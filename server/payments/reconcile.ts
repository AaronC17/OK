import type { BankMovement, Decision, DemoOrder, StoredMovement } from './model.ts'
import { isInstant } from './validation.ts'

export const ORDER_REFERENCE = /^ONK-[A-F0-9]{16}$/

export function movementKey(movement: Pick<BankMovement, 'accountId' | 'id'>): string {
  return JSON.stringify([movement.accountId, movement.id])
}

function references(description: string | null): string[] {
  // A complete, isolated code: never a substring, partial code or amount-only match.
  return [...new Set((description ?? '').toUpperCase().match(/(?<![A-Z0-9-])ONK-[A-F0-9]{16}(?![A-Z0-9-])/g) ?? [])]
}

/** Pure matching. The caller must fetch trusted movements and allocate atomically. */
export function reconcile(order: DemoOrder, movements: StoredMovement[], used: ReadonlySet<string>, now: string): Decision {
  if (!ORDER_REFERENCE.test(order.reference) || !Number.isSafeInteger(order.amountMinor) || order.amountMinor <= 0 || order.currency !== 'CRC'
    || !order.accountId || !isInstant(now) || !isInstant(order.createdAt) || !isInstant(order.expiresAt)
    || order.createdAt >= order.expiresAt || now < order.createdAt) return { kind: 'review', reason: 'invalid_order' }
  if (now >= order.expiresAt) return { kind: 'review', reason: 'expired' }

  const related = movements.filter(movement => movement.accountId === order.accountId && references(movement.description).includes(order.reference))
  if (related.some(movement => movement.conflict)) return { kind: 'review', reason: 'conflicting_movement' }
  if (related.some(movement => references(movement.description).length !== 1)) return { kind: 'review', reason: 'multiple_order_references' }
  const posted = related.filter(movement => movement.direction === 'credit' && movement.status === 'posted' && movement.currency === 'CRC')
  if (!posted.length) return { kind: 'retry', reason: 'not_found' }
  if (posted.length !== 1) return { kind: 'review', reason: 'multiple_movements' }
  const movement = posted[0]
  if (!movement.id || !movement.bankReference || !isInstant(movement.bookedAt) || !Number.isSafeInteger(movement.amountMinor) || movement.amountMinor <= 0) return { kind: 'review', reason: 'invalid_movement' }
  if (movement.bookedAt < order.createdAt || movement.bookedAt > now || movement.bookedAt >= order.expiresAt) return { kind: 'review', reason: 'outside_payment_window' }
  if (used.has(movementKey(movement))) return { kind: 'review', reason: 'movement_already_used' }
  if (movement.amountMinor !== order.amountMinor) return { kind: 'review', reason: 'amount_mismatch' }
  return { kind: 'match', reason: 'exact_match', movement }
}
