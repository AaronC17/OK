import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { store } from '../../src/config/store.ts'
import { ShopDatabase } from './database.ts'
import { makeShopHandler } from './http.ts'
import { newToken } from './security.ts'

export function createShopRuntime() {
  const directory = resolve(process.env.STORE_DATA_DIR || '.data/store')
  const unsafeRoots = [resolve('public'), resolve('dist')]
  if (directory === resolve('.') || unsafeRoots.some(root => directory === root || directory.startsWith(`${root}/`) || directory.startsWith(`${root}\\`))) throw new Error('La carpeta de datos privados no puede ser la raíz del proyecto ni estar dentro de public/ o dist/.')
  mkdirSync(directory, { recursive: true })
  const database = new ShopDatabase(resolve(directory, 'orders.sqlite'), store)
  const setupPath = resolve(directory, 'admin-setup-token.txt')
  if (!database.initialized()) {
    let token: string
    try { token = readFileSync(setupPath, 'utf8').trim() }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') { database.close(); throw error }
      token = newToken()
      writeFileSync(setupPath, `${token}\n`, { flag: 'wx', mode: 0o600 })
    }
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) { database.close(); throw new Error('El código de instalación local no es válido. No se sobrescribió el archivo existente.') }
    database.ensureSetupToken(token)
    console.info('Onky’s: configura administración en /admin. El código de instalación está en el archivo privado admin-setup-token.txt de la carpeta de datos.')
  }
  const secure = process.env.STORE_SECURE_COOKIES === 'true'
  const publicOrigin = process.env.STORE_PUBLIC_ORIGIN
  if (process.env.NODE_ENV === 'production' && (!secure || !publicOrigin?.startsWith('https://'))) {
    database.close()
    throw new Error('Para producción se requieren STORE_SECURE_COOKIES=true y STORE_PUBLIC_ORIGIN con HTTPS. Revisa también la guía de despliegue y privacidad.')
  }
  const handler = makeShopHandler(database, { secureCookies: secure, publicOrigin, setupTokenPath: setupPath })
  let closed = false
  return { database, handler, close: () => { if (!closed) { closed = true; database.close() } } }
}
