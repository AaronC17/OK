import type { AdminOrders, OrderAudit, ShopOrder, SinpeSettings } from '../../src/order-types.ts'
import type { PreparedReceipt } from './receipts.ts'
import type { Session } from './security.ts'

export type MaybePromise<T> = T | Promise<T>
export interface CustomerSession { session: Session; token: string | null }
export interface StoredReceipt { data: Buffer; contentType: 'image/webp' | 'application/pdf' }

/** Persistence contract shared by the local SQLite development store and MongoDB. */
export interface ShopRepository {
  close(): MaybePromise<void>
  initialized(): MaybePromise<boolean>
  adminName(): MaybePromise<string | undefined>
  ensureSetupToken(token: string): MaybePromise<void>
  setupAdmin(value: unknown): MaybePromise<{ token: string; session: Session }>
  login(value: unknown): MaybePromise<{ token: string; session: Session }>
  session(token: string | undefined, role: Session['role']): MaybePromise<Session | null>
  customerSession(token: string | undefined): MaybePromise<CustomerSession>
  logout(session: Session): MaybePromise<void>
  settings(): MaybePromise<SinpeSettings>
  destination(): MaybePromise<ShopOrder['destination']>
  configure(value: unknown, actor: string): MaybePromise<SinpeSettings>
  isDemo(): boolean
  currentOrder(owner: string): MaybePromise<ShopOrder | null>
  createOrder(value: unknown, owner: string, key: string): MaybePromise<ShopOrder>
  customerOrder(id: string, owner: string): MaybePromise<ShopOrder>
  checkUpload(id: string, owner: string, suppliedCode: unknown): MaybePromise<ShopOrder>
  addReceipt(id: string, owner: string, suppliedCode: unknown, suppliedReference: unknown, uploadKey: unknown, suppliedVersion: unknown, file: PreparedReceipt): MaybePromise<ShopOrder>
  receipt(orderId: string, receiptId: string): MaybePromise<StoredReceipt>
  getOrder(id: string): MaybePromise<ShopOrder>
  list(query: URLSearchParams): MaybePromise<AdminOrders>
  auditFor(id: string): MaybePromise<OrderAudit[]>
  confirm(id: string, value: unknown, actor: string): MaybePromise<ShopOrder>
  reject(id: string, value: unknown, actor: string): MaybePromise<ShopOrder>
}
