import { defineConfig } from '@playwright/test'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import type { AddressInfo } from 'node:net'

// Never run checkout/admin tests against a developer's real orders or credentials.
mkdirSync(join(tmpdir(), 'opencode'), { recursive: true })
process.env.ONKYS_E2E_DIR ??= mkdtempSync(join(tmpdir(), 'opencode', 'onkys-store-e2e-'))
if (!process.env.ONKYS_E2E_PORT) {
  const reservation = createServer()
  await new Promise<void>(resolve => reservation.listen(0, '127.0.0.1', resolve))
  process.env.ONKYS_E2E_PORT = String((reservation.address() as AddressInfo).port)
  await new Promise<void>(resolve => reservation.close(() => resolve()))
}
const port = process.env.ONKYS_E2E_PORT
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL,
    channel: process.env.PW_CHANNEL || 'msedge',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    env: { NODE_ENV: 'test', STORE_DATA_DIR: process.env.ONKYS_E2E_DIR, STORE_PUBLIC_ORIGIN: baseURL, STORE_SECURE_COOKIES: 'false' },
  },
})
