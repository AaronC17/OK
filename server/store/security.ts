import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'
import { StoreError, text } from './validation.ts'

export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex')
export const newToken = () => randomBytes(32).toString('base64url')
export const constantEqual = (a: string, b: string) => timingSafeEqual(Buffer.from(tokenHash(a), 'hex'), Buffer.from(tokenHash(b), 'hex'))

export function passwordHash(value: unknown): string {
  const password = text(value, 8, 200, 'Contraseña')
  const salt = randomBytes(16).toString('hex')
  return `${salt}:${scryptSync(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 }).toString('hex')}`
}
export function passwordMatches(value: unknown, stored: string): boolean {
  if (typeof value !== 'string' || value.length > 200) return false
  const [salt, hash] = stored.split(':')
  const actual = scryptSync(value.trim(), salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 })
  return hash.length === 128 && timingSafeEqual(actual, Buffer.from(hash, 'hex'))
}

export interface Session { hash: string; role: 'admin' | 'customer'; csrf: string; expiresAt: number; accountId?: string | null }

export function generateSession(role: Session['role'], now = Date.now(), accountId: string | null = null) {
  const token = newToken()
  const session: Session = { hash: tokenHash(token), role, csrf: newToken(), expiresAt: now + (role === 'admin' ? 8 * 3600_000 : 7 * 86400_000), accountId }
  return { token, session }
}

export function createSession(db: DatabaseSync, role: Session['role'], now = Date.now(), accountId: string | null = null) {
  const { token, session } = generateSession(role, now, accountId)
  db.prepare('INSERT INTO sessions (token_hash, role, csrf, expires_at, account_id) VALUES (?, ?, ?, ?, ?)').run(session.hash, role, session.csrf, session.expiresAt, accountId)
  return { token, session }
}

export function findSession(db: DatabaseSync, token: string | undefined, role: Session['role'], now = Date.now()): Session | null {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null
  const row = db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND role = ? AND expires_at > ?').get(tokenHash(token), role, now)
  return row ? { hash: row.token_hash as string, role, csrf: row.csrf as string, expiresAt: row.expires_at as number, accountId: row.account_id as string | null } : null
}

export function requireCsrf(session: Session, supplied: string | undefined) {
  if (!supplied || !constantEqual(session.csrf, supplied)) throw new StoreError(403, 'La sesión de seguridad cambió. Actualiza la página antes de continuar.')
}

/** Bounded in-memory rate limits. Must be replaced/shared for a multi-instance deployment. */
export class RateLimits {
  private entries = new Map<string, { count: number; expires: number }>()
  clear(key: string) { this.entries.delete(key) }
  check(key: string, max: number, windowMs: number, now = Date.now()) {
    for (const [id, entry] of this.entries) if (entry.expires <= now) this.entries.delete(id)
    const entry = this.entries.get(key) ?? { count: 0, expires: now + windowMs }
    if (entry.count >= max || this.entries.size > 10_000) throw new StoreError(429, 'Demasiados intentos. Espera unos minutos y vuelve a intentar.')
    entry.count++
    this.entries.set(key, entry)
  }
}
