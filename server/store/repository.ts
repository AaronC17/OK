import type { AdminOrders, CheckoutPreview, OrderAudit, ShopOrder, SinpeSettings } from '../../src/order-types.ts'
import type { PreparedReceipt } from './receipts.ts'
import type { Session } from './security.ts'
import type { AdminCustomers, CustomerAccount, CustomerOrders, CustomerReferralsData } from '../../src/account-types.ts'

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
  account(session: Session): MaybePromise<CustomerAccount | null>
  registerCustomer(value: unknown, previous: Session): MaybePromise<{ token: string; session: Session }>
  loginCustomer(value: unknown, previous: Session): MaybePromise<{ token: string; session: Session }>
  accountOrders(session: Session, query: URLSearchParams): MaybePromise<CustomerOrders>
  referrals(session: Session): MaybePromise<CustomerReferralsData>
  customers(query: URLSearchParams): MaybePromise<AdminCustomers>
  settings(): MaybePromise<SinpeSettings>
  destination(): MaybePromise<ShopOrder['destination']>
  configure(value: unknown, actor: string): MaybePromise<SinpeSettings>
  isDemo(): boolean
  currentOrder(owner: string): MaybePromise<ShopOrder | null>
  previewOrder(value: unknown, owner: string): MaybePromise<CheckoutPreview>
  completeCheckout(token: unknown, owner: string, key: unknown, file: PreparedReceipt): MaybePromise<ShopOrder>
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
