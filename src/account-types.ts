import type { ShopOrder } from './order-types.ts'

export interface CustomerAccount {
  id: string
  name: string
  email: string
  createdAt: string
  welcomeAvailable: boolean
  referralCode?: string
  creditBalanceMinor?: number
}
export interface CustomerAuth { user: CustomerAccount | null; csrfToken: string }
export interface Registration { name: string; email: string; password: string; privacyAccepted: boolean; referralCode?: string }
export interface CustomerOrders { orders: ShopOrder[]; total: number; page: number; pageSize: number }
export interface AdminCustomer extends CustomerAccount { orderCount: number }
export interface AdminCustomers { customers: AdminCustomer[]; total: number; page: number; pageSize: number }

export type ReferralStatus = 'pending' | 'rewarded' | 'revoked'

export interface CustomerReferralItem {
  id: string
  referredName: string
  status: ReferralStatus
  createdAt: string
  firstOrderCode: string | null
  rewardMinor: number | null
  rewardedAt: string | null
}

export interface CreditLedgerItem {
  id: number
  type: 'referral_reward' | 'order_redemption' | 'referral_clawback' | 'manual_adjustment'
  amountMinor: number
  balanceAfterMinor: number
  description: string
  createdAt: string
}

export interface CustomerReferralsData {
  referralCode: string
  shareUrl: string
  creditBalanceMinor: number
  summary: {
    pendingCount: number
    validCount: number
    totalEarnedMinor: number
  }
  pendingReferrals: CustomerReferralItem[]
  validReferrals: CustomerReferralItem[]
  ledger: CreditLedgerItem[]
}
