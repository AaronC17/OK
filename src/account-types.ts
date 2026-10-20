import type { ShopOrder } from './order-types.ts'

export interface CustomerAccount {
  id: string
  name: string
  email: string
  createdAt: string
  welcomeAvailable: boolean
}
export interface CustomerAuth { user: CustomerAccount | null; csrfToken: string }
export interface Registration { name: string; email: string; password: string; privacyAccepted: boolean }
export interface CustomerOrders { orders: ShopOrder[]; total: number; page: number; pageSize: number }
export interface AdminCustomer extends CustomerAccount { orderCount: number }
export interface AdminCustomers { customers: AdminCustomer[]; total: number; page: number; pageSize: number }
