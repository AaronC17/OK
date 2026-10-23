import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { store } from '../../src/config/store.ts'
import { ShopDatabase } from './database.ts'
import { MongoShopDatabase } from './mongo.ts'
import { makeShopHandler } from './http.ts'
import { newToken } from './security.ts'
import { createOrderMailer } from './mailer.ts'
import type { ShopRepository } from './repository.ts'

/** Token used only by the n8n bank-reconciliation workflow. Weak or missing tokens leave the endpoint disabled. */
function automationToken(): string | undefined {
  const token = process.env.BANK_AUTOMATION_TOKEN?.trim()
  if (!token) return undefined
  if (token.length < 32) throw new Error('BANK_AUTOMATION_TOKEN debe tener al menos 32 caracteres (usa 32 bytes en base64url).')
  return token
}

export async function createShopRuntime() {
  const directory = resolve(process.env.STORE_DATA_DIR || (process.env.VERCEL ? '/tmp/store' : '.data/store'))
  const unsafeRoots = [resolve('public'), resolve('dist')]
  if (directory === resolve('.') || unsafeRoots.some(root => directory === root || directory.startsWith(`${root}/`) || directory.startsWith(`${root}\\`))) throw new Error('La carpeta de datos privados no puede ser la raíz del proyecto ni estar dentro de public/ o dist/.')
  mkdirSync(directory, { recursive: true })

  const mongoUri = process.env.MONGODB_URI
  if (process.env.VERCEL && !mongoUri) throw new Error('Configura MONGODB_URI: el almacenamiento temporal de Vercel no conserva los pedidos.')
  let database: ShopRepository
  if (mongoUri) {
    const mongoDb = new MongoShopDatabase(mongoUri, store, { dbName: process.env.MONGODB_DB_NAME || 'onkys' })
    try { await mongoDb.init() }
    catch (error) { await mongoDb.close(); throw error }
    database = mongoDb
  } else {
    database = new ShopDatabase(resolve(directory, 'orders.sqlite'), store)
  }

  const setupPath = resolve(directory, 'admin-setup-token.txt')
  try {
    if (!(await database.initialized())) {
      let token: string
      try { token = readFileSync(setupPath, 'utf8').trim() }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        token = newToken()
        writeFileSync(setupPath, `${token}\n`, { flag: 'wx', mode: 0o600 })
      }
      if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error('El código de instalación local no es válido. No se sobrescribió el archivo existente.')
      await database.ensureSetupToken(token)
      console.info('Onky’s: configura administración en /admin. El código de instalación está en el archivo privado admin-setup-token.txt de la carpeta de datos.')
    }
    const secure = process.env.STORE_SECURE_COOKIES === 'true' || Boolean(process.env.VERCEL)
    const publicOrigin = process.env.STORE_PUBLIC_ORIGIN || (process.env.VERCEL && process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined)
    if (process.env.NODE_ENV === 'production' && !process.env.VERCEL && (!secure || !publicOrigin?.startsWith('https://'))) {
      throw new Error('Para producción se requieren STORE_SECURE_COOKIES=true y STORE_PUBLIC_ORIGIN con HTTPS. Revisa también la guía de despliegue y privacidad.')
    }
    const handler = makeShopHandler(database, { secureCookies: secure, publicOrigin, setupTokenPath: setupPath, mailer: createOrderMailer(), trustVercelProxy: process.env.VERCEL === '1', automationToken: automationToken() })
    let closed = false
    return { database, handler, close: () => { if (!closed) { closed = true; void database.close() } } }
  } catch (error) {
    await database.close()
    throw error
  }
}
