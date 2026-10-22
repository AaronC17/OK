import type { CustomerAccount } from './account-types.ts'

export type ShopOrderStatus = 'pending_details' | 'awaiting_payment' | 'pending_review' | 'ready' | 'rejected'

export interface SinpeDestination { phone: string; beneficiary: string; bank: 'BAC Credomatic' }
export interface SinpeSettings { enabled: boolean; phone: string; beneficiary: string }
export interface OrderCustomer { name: string; phone: string; email: string; address: string; notes: string }
export interface OrderLine {
  key: string
  name: string
  options: string[]
  quantity: number
  unitPriceMinor: number
  lineTotalMinor: number
}
export interface OrderReceipt {
  id: string
  contentType: 'image/webp' | 'application/pdf'
  size: number
  submittedAt: string
  bankReference: string
}
export interface ShopOrder {
  id: string
  code: string
  version: number
  status: ShopOrderStatus
  demo: boolean
  createdAt: string
  updatedAt: string
  lines: OrderLine[]
  subtotalMinor: number
  discountMinor?: number
  customerAccountId?: string | null
  shippingMinor: number | null
  totalMinor: number | null
  delivery: { id: string; name: string; requiresAddress: boolean }
  customer: OrderCustomer
  destination: SinpeDestination | null
  receipt: OrderReceipt | null
  customerMessage: string | null
  paymentConfirmedAt: string | null
  paymentVerification: 'manual' | null
}
export interface CheckoutConfig {
  csrfToken: string
  account?: CustomerAccount | null
  sinpe: SinpeDestination | null
  demo: boolean
  maxReceiptBytes: number
}
/** Payment instructions only; no order exists until its receipt is submitted. */
export interface CheckoutPreview { order: ShopOrder; token: string }
export interface AdminAuth {
  initialized: boolean
  authenticated: boolean
  username: string | null
  csrfToken: string | null
}
export interface OrderAudit { event: string; actor: string; detail: string; createdAt: string }
export interface AdminOrders {
  orders: ShopOrder[]
  counts: Record<ShopOrderStatus, number>
  total: number
  page: number
  pageSize: number
}

export const orderStatusLabels: Record<ShopOrderStatus, string> = {
  pending_details: 'Pendiente', awaiting_payment: 'Pendiente de pago', pending_review: 'En revisión',
  ready: 'Pagada', rejected: 'Por corregir',
}
