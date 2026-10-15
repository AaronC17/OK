import type { CartItem } from '../../src/types.ts'

/** This first phase is deliberately incapable of recording a real payment. */
export type PaymentsMode = 'disabled' | 'mock'
export type OrderStatus = 'pending_payment' | 'manual_review' | 'simulated_paid'

export interface DemoOrder {
  id: string
  reference: string
  accountId: string
  amountMinor: number
  currency: 'CRC'
  items: CartItem[]
  deliveryId: string
  status: OrderStatus
  reason: string
  createdAt: string
  expiresAt: string
  attempts: number
  nextAttemptAt: string | null
  demoOnly: true
}

/** Internal normalized contract, NOT the schema or endpoints of a BAC API. */
export interface BankMovement {
  id: string
  accountId: string
  bankReference: string
  amountMinor: number
  currency: string
  direction: 'credit' | 'debit'
  status: 'posted' | 'pending' | 'reversed'
  bookedAt: string
  description: string | null
}

export interface StoredMovement extends BankMovement { conflict: boolean }

export type Decision =
  | { kind: 'match'; movement: StoredMovement; reason: 'exact_match' }
  | { kind: 'retry'; reason: 'not_found' }
  | { kind: 'review'; reason: 'expired' | 'invalid_order' | 'invalid_movement' | 'conflicting_movement' | 'multiple_movements' | 'multiple_order_references' | 'amount_mismatch' | 'outside_payment_window' | 'movement_already_used' }

export class PaymentsError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'PaymentsError'
    this.status = status
  }
}
