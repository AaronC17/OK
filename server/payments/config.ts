import type { PaymentsMode } from './model.ts'

export interface PaymentsConfig {
  mode: PaymentsMode
  port: number
  adminToken: string
  reconcileToken: string
  accountId: string
}

export function loadPaymentsConfig(env: NodeJS.ProcessEnv): PaymentsConfig {
  if (env.NODE_ENV === 'production') throw new Error('El backend SINPE de demostración no está habilitado en producción.')
  const mode = env.PAYMENTS_MODE ?? 'disabled'
  if (mode !== 'disabled' && mode !== 'mock') throw new Error('PAYMENTS_MODE solo admite disabled o mock. No hay un adaptador BAC autorizado implementado.')
  const port = Number(env.PAYMENTS_PORT ?? '8787')
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('PAYMENTS_PORT debe estar entre 1024 y 65535.')
  const adminToken = env.PAYMENTS_ADMIN_TOKEN ?? ''
  const reconcileToken = env.PAYMENTS_RECONCILE_TOKEN ?? ''
  if (![adminToken, reconcileToken].every(token => /^[A-Za-z0-9_-]{43,128}$/.test(token))) throw new Error('Genera dos tokens aleatorios distintos de al menos 32 bytes; consulta docs/pagos-sinpe-bac.md.')
  if (adminToken === reconcileToken) throw new Error('El token de administración y el de n8n deben ser distintos.')
  const accountId = env.PAYMENTS_ACCOUNT_ALIAS ?? 'bac-personal-demo'
  if (!/^[a-z0-9-]{3,64}$/.test(accountId)) throw new Error('PAYMENTS_ACCOUNT_ALIAS debe ser un alias, no un IBAN ni un teléfono.')
  return { mode, port, adminToken, reconcileToken, accountId }
}
