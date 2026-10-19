import { defineConfig } from '@playwright/test'
import { mkdirSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
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
const webkit = process.env.PW_BROWSER === 'webkit'

export default defineConfig({
  testDir: './tests',
  outputDir: join('test-results-sinpe', basename(process.env.ONKYS_E2E_DIR)),
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  reporter: 'list',
  use: {
    baseURL,
    browserName: webkit ? 'webkit' : 'chromium',
    channel: webkit ? undefined : process.env.PW_CHANNEL || 'msedge',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: webkit ? 3 : 1 } },
  ],
  webServer: {
    command: 'node --experimental-strip-types scripts/testing/store-preview.ts',
    url: baseURL,
    reuseExistingServer: false,
    env: { NODE_ENV: 'test', STORE_DATA_DIR: process.env.ONKYS_E2E_DIR, STORE_PUBLIC_ORIGIN: baseURL, STORE_SECURE_COOKIES: 'false' },
  },
})
