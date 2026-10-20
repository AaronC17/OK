import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import type { Session } from './security.ts'
import { email, fields, record, StoreError, text } from './validation.ts'

const derive = (password: string, salt: string) => new Promise<Buffer>((resolve, reject) => {
  scrypt(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key))
})
// Unknown accounts still perform the same expensive password verification.
const dummyHash = `${'0'.repeat(32)}:${'0'.repeat(128)}`

export async function accountPasswordHash(value: unknown) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128 || !value.trim()) throw new StoreError(422, 'Usa una contraseña de entre 12 y 128 caracteres.')
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${(await derive(value, salt)).toString('hex')}`
}
export async function accountPasswordMatches(password: string, stored?: string) {
  const [salt, hash] = (stored ?? dummyHash).split(':')
  const valid = /^[a-f0-9]{32}$/.test(salt) && /^[a-f0-9]{128}$/.test(hash)
  if (!valid) { await derive(password, '0'.repeat(32)); return false }
  const actual = await derive(password, salt)
  return timingSafeEqual(actual, Buffer.from(hash, 'hex')) && !!stored
}
export function parseRegistration(value: unknown) {
  const data = record(value)
  fields(data, ['name', 'email', 'password', 'privacyAccepted'])
  if (data.privacyAccepted !== true) throw new StoreError(422, 'Acepta el uso de tus datos para crear y gestionar tu cuenta.')
  return { name: text(data.name, 2, 100, 'Nombre'), email: email(data.email), password: data.password }
}
export function parseAccountLogin(value: unknown) {
  const data = record(value)
  fields(data, ['email', 'password'])
  const address = email(data.email)
  if (typeof data.password !== 'string' || !data.password.length || data.password.length > 128) throw new StoreError(401, 'Correo o contraseña incorrectos.')
  return { email: address, password: data.password }
}
export function requireGuest(session: Session) {
  if (session.accountId) throw new StoreError(409, 'Ya tienes una sesión iniciada. Ciérrala antes de cambiar de cuenta.')
}
export function requireAccount(session: Session): string {
  if (!session.accountId) throw new StoreError(401, 'Inicia sesión para consultar tu cuenta y tus pedidos.')
  return session.accountId
}
export const accountOwner = (id: string) => `account:${id}`
export const orderOwner = (session: Session) => session.accountId ? accountOwner(session.accountId) : session.hash
export const accountIdFromOwner = (owner: string) => /^account:([a-f0-9-]{36})$/.exec(owner)?.[1] ?? null
export const accountPage = (query: URLSearchParams) => Math.max(1, Math.min(100_000, Number.parseInt(query.get('page') ?? '1', 10) || 1))
