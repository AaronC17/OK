import type { CartItem } from '../types.ts'
import type { AdminAuth, AdminOrders, CheckoutConfig, OrderAudit, OrderCustomer, ShopOrder, SinpeSettings } from '../order-types.ts'
import type { AdminCustomers, CustomerAuth, CustomerOrders, Registration } from '../account-types.ts'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) { super(message); this.status = status }
}
let customerCsrf = ''
let adminCsrf = ''
let checkoutRequest: Promise<CheckoutConfig> | null = null
let customerChange: Promise<CustomerAuth> | null = null

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.headers.get('content-type')?.includes('application/json')) throw new ApiError('El servidor de pedidos no está disponible. Reintenta la conexión en unos momentos.', 503)
  let result: unknown
  try { result = await response.json() }
  catch { throw new ApiError('La respuesta de la tienda llegó incompleta. Actualiza el estado antes de reintentar.', 502) }
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new ApiError('La tienda devolvió una respuesta inválida. Reintenta la conexión.', 502)
  if (!response.ok) {
    const message = 'error' in result && typeof result.error === 'string' ? result.error : 'No se pudo completar la operación.'
    throw new ApiError(message, response.status)
  }
  return result as T
}

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
  return readResponse<T>(response)
}

export function checkoutConfig(): Promise<CheckoutConfig> {
  // Session rotation and checkout reads must not race: a late guest response
  // could otherwise replace the CSRF token belonging to the signed-in cookie.
  if (customerChange) return customerChange.then(checkoutConfig, checkoutConfig)
  checkoutRequest ??= request<CheckoutConfig>('/api/checkout').then(config => { customerCsrf = config.csrfToken; return config }).finally(() => { checkoutRequest = null })
  return checkoutRequest
}
export const customerSession = async (): Promise<CustomerAuth> => {
  const config = await checkoutConfig()
  return { user: config.account ?? null, csrfToken: config.csrfToken }
}
function rememberCustomer(operation: () => Promise<CustomerAuth>) {
  if (customerChange) return Promise.reject(new ApiError('Espera a que termine el cambio de sesión.', 409))
  const pendingCheckout = checkoutRequest
  customerChange = (async () => {
    if (pendingCheckout) await pendingCheckout
    const auth = await operation()
    customerCsrf = auth.csrfToken
    return auth
  })().finally(() => { customerChange = null })
  return customerChange
}
export const registerCustomer = (data: Registration) => rememberCustomer(() => request<CustomerAuth>('/api/account/register', 'POST', data))
export const loginCustomer = (email: string, password: string) => rememberCustomer(() => request<CustomerAuth>('/api/account/login', 'POST', { email, password }))
export const logoutCustomer = () => rememberCustomer(() => request<CustomerAuth>('/api/account/logout', 'POST', {}))
export const customerOrders = (page = 1) => request<CustomerOrders>(`/api/account/orders?page=${page}`)
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
  return readResponse<ShopOrder>(response)
}

export function uploadReceipt(order: ShopOrder, file: File, key: string) {
  const form = new FormData()
  form.set('code', order.code)
  form.set('bankReference', `${order.code}-${key.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()}`)
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
export const adminCustomers = (query: URLSearchParams) => request<AdminCustomers>(`/api/admin/customers?${query}`, 'GET', undefined, 'admin')
export const adminOrder = (id: string) => request<{ order: ShopOrder; audit: OrderAudit[] }>(`/api/admin/orders/${id}`, 'GET', undefined, 'admin')
export const reviewOrder = (id: string, action: 'confirm' | 'reject', value: unknown) => request<ShopOrder>(`/api/admin/orders/${id}/${action}`, 'POST', value, 'admin')

export function amountFromInput(value: string): number {
  const normalized = value.trim().replace(',', '.')
  if (!/^\d{1,7}(?:\.\d{1,2})?$/.test(normalized)) throw new Error('Escribe el monto en colones sin separadores de miles; por ejemplo, 1200 o 1200,50.')
  const [whole, decimals = ''] = normalized.split('.')
  const amount = Number(whole) * 100 + Number(decimals.padEnd(2, '0'))
  if (!Number.isSafeInteger(amount) || amount > 100_000_000) throw new Error('El monto supera el límite técnico de esta versión.')
  return amount
}
export const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.'
const dateFormatter = new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', dateStyle: 'medium', timeStyle: 'short' })
export const orderDate = (value: string) => dateFormatter.format(new Date(value))
