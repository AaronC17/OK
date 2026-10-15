export type ShopOrderStatus = 'pending_details' | 'awaiting_payment' | 'pending_review' | 'ready' | 'rejected'

export interface SinpeDestination { phone: string; beneficiary: string; bank: 'BAC Credomatic' }
export interface SinpeSettings { enabled: boolean; phone: string; beneficiary: string }
export interface OrderCustomer { name: string; phone: string; address: string; notes: string }
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
  sinpe: SinpeDestination | null
  demo: boolean
  maxReceiptBytes: number
}
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
  pending_details: 'Por coordinar', awaiting_payment: 'Pendiente de pago', pending_review: 'Comprobante en revisión',
  ready: 'Listo para preparar', rejected: 'Comprobante por corregir',
}
