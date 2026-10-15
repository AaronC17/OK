import type { CartItem } from '../types.ts'
import type { AdminAuth, AdminOrders, CheckoutConfig, OrderAudit, OrderCustomer, ShopOrder, SinpeSettings } from '../order-types.ts'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}
let customerCsrf = ''
let adminCsrf = ''
let checkoutRequest: Promise<CheckoutConfig> | null = null

async function request<T>(path: string, method = 'GET', value?: unknown, role: 'customer' | 'admin' = 'customer'): Promise<T> {
  const form = value instanceof FormData
  const csrf = role === 'admin' ? adminCsrf : customerCsrf
  let response: Response
  try {
    response = await fetch(path, {
      method, credentials: 'same-origin', cache: 'no-store', redirect: 'error',
      headers: { ...(form || value === undefined ? {} : { 'Content-Type': 'application/json' }), ...(method === 'GET' ? {} : { 'X-CSRF-Token': csrf }) },
      body: value === undefined ? undefined : form ? value : JSON.stringify(value), signal: AbortSignal.timeout(form ? 30_000 : 15_000),
    })
  } catch { throw new ApiError('No pudimos conectar con la tienda. Comprueba tu conexión y actualiza el estado antes de reintentar.', 0) }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new ApiError('El servidor de pedidos no está disponible. Esta tienda necesita su backend, no solo los archivos estáticos.', 503)
  const result: unknown = await response.json()
  if (!response.ok) throw new ApiError((result as { error?: string }).error ?? 'No se pudo completar la operación.', response.status)
  return result as T
}

export function checkoutConfig(): Promise<CheckoutConfig> {
  checkoutRequest ??= request<CheckoutConfig>('/api/checkout').then(config => { customerCsrf = config.csrfToken; return config }).finally(() => { checkoutRequest = null })
  return checkoutRequest
}
export const currentOrder = () => request<{ order: ShopOrder | null }>('/api/orders/current')
export const fetchOrder = (id: string) => request<ShopOrder>(`/api/orders/${encodeURIComponent(id)}`)

export async function createOrder(items: CartItem[], deliveryId: string, customer: OrderCustomer, privacyAccepted: boolean, key: string): Promise<ShopOrder> {
  let response: Response
  try {
    response = await fetch('/api/orders', {
      method: 'POST', credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15_000),
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': customerCsrf, 'Idempotency-Key': key },
      body: JSON.stringify({ items, deliveryId, customer, privacyAccepted }),
    })
  } catch { throw new ApiError('No recibimos la respuesta del servidor. Reintenta sin cambiar los datos; se conservará la misma solicitud para evitar duplicados.', 0) }
  if (!response.headers.get('content-type')?.includes('application/json')) throw new ApiError('El backend de pedidos no está disponible.', 503)
  const result = await response.json() as ShopOrder & { error?: string }
  if (!response.ok) throw new ApiError(result.error ?? 'No se pudo registrar el pedido.', response.status)
  return result
}

export function uploadReceipt(order: ShopOrder, code: string, bankReference: string, file: File, key: string) {
  const form = new FormData()
  form.set('code', code)
  form.set('bankReference', bankReference)
  form.set('version', String(order.version))
  form.set('uploadKey', key)
  form.set('receipt', file)
  return request<ShopOrder>(`/api/orders/${order.id}/receipt`, 'POST', form)
}

async function rememberAdmin(promise: Promise<AdminAuth>) {
  const auth = await promise
  adminCsrf = auth.csrfToken ?? ''
  return auth
}
export const adminSession = () => rememberAdmin(request<AdminAuth>('/api/admin/session', 'GET', undefined, 'admin'))
export const adminLogin = (username: string, password: string) => rememberAdmin(request<AdminAuth>('/api/admin/login', 'POST', { username, password }, 'admin'))
export const adminSetup = (setupToken: string, username: string, password: string) => rememberAdmin(request<AdminAuth>('/api/admin/setup', 'POST', { setupToken, username, password }, 'admin'))
export async function adminLogout() { await request('/api/admin/logout', 'POST', {}, 'admin'); adminCsrf = '' }
export const adminSettings = () => request<SinpeSettings>('/api/admin/settings', 'GET', undefined, 'admin')
export const saveSettings = (settings: SinpeSettings) => request<SinpeSettings>('/api/admin/settings', 'PUT', settings, 'admin')
export const adminOrders = (query: URLSearchParams) => request<AdminOrders>(`/api/admin/orders?${query}`, 'GET', undefined, 'admin')
export const adminOrder = (id: string) => request<{ order: ShopOrder; audit: OrderAudit[] }>(`/api/admin/orders/${id}`, 'GET', undefined, 'admin')
export const reviewOrder = (id: string, action: 'quote' | 'confirm' | 'reject', value: unknown) => request<ShopOrder>(`/api/admin/orders/${id}/${action}`, 'POST', value, 'admin')

export function amountFromInput(value: string): number {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) throw new Error('Escribe el monto en colones sin separadores de miles; por ejemplo, 1200 o 1200,50.')
  const [whole, decimals = ''] = normalized.split('.')
  const amount = Number(whole) * 100 + Number(decimals.padEnd(2, '0'))
  if (!Number.isSafeInteger(amount) || amount > 100_000_000) throw new Error('El monto supera el límite técnico de esta versión.')
  return amount
}
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.'
export const orderDate = (value: string) => new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
