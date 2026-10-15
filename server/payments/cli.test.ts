import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

test('CLI: real server bootstrap and demo script complete using only loopback and isolated temporary data', { timeout: 20_000 }, async t => {
  const reservation = createServer()
  await new Promise<void>(resolve => reservation.listen(0, '127.0.0.1', resolve))
  const port = (reservation.address() as AddressInfo).port
  await new Promise<void>(resolve => reservation.close(() => resolve()))
  mkdirSync(join(tmpdir(), 'opencode'), { recursive: true })
  const directory = mkdtempSync(join(tmpdir(), 'opencode', 'sinpe-cli-test-'))
  const env = {
    ...process.env, NODE_ENV: 'test', PAYMENTS_MODE: 'mock', PAYMENTS_PORT: String(port),
    PAYMENTS_ADMIN_TOKEN: randomBytes(32).toString('base64url'), PAYMENTS_RECONCILE_TOKEN: randomBytes(32).toString('base64url'),
  }
  const backend = spawn(process.execPath, ['--experimental-strip-types', fileURLToPath(new URL('./index.ts', import.meta.url))], { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] })
  t.after(async () => {
    if (backend.exitCode === null && backend.signalCode === null) {
      const exited = once(backend, 'exit')
      backend.kill()
      await exited
    }
    rmSync(directory, { recursive: true, force: true })
  })
  let startup = ''
  let errors = ''
  backend.stderr.on('data', chunk => { errors += String(chunk) })
  await new Promise<void>((resolve, reject) => {
    backend.once('error', reject)
    backend.once('exit', () => reject(new Error(`El backend de demo terminó antes de iniciar: ${errors}`)))
    backend.stdout.on('data', chunk => {
      startup += String(chunk)
      if (startup.includes('SINPE DEMO:')) resolve()
    })
  })
  const demo = spawn(process.execPath, ['--experimental-strip-types', fileURLToPath(new URL('../../scripts/payments/demo.ts', import.meta.url))], { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] })
  let output = ''
  let demoErrors = ''
  demo.stdout.on('data', chunk => { output += String(chunk) })
  demo.stderr.on('data', chunk => { demoErrors += String(chunk) })
  const [exitCode] = await once(demo, 'exit')
  assert.equal(exitCode, 0, demoErrors)
  assert.match(output, /simulated_paid/)
  assert.match(output, /NO es un pago recibido/)
  const seed = spawn(process.execPath, ['--experimental-strip-types', fileURLToPath(new URL('../../scripts/payments/demo.ts', import.meta.url)), '--prepare-only'], { cwd: directory, env, stdio: ['ignore', 'pipe', 'pipe'] })
  let preparedOutput = ''
  seed.stdout.on('data', chunk => { preparedOutput += String(chunk) })
  const [seedExit] = await once(seed, 'exit')
  assert.equal(seedExit, 0)
  assert.match(preparedOutput, /pending_payment \(DEMO\)/)
  const response = await fetch(`http://127.0.0.1:${port}/internal/reconciliation/run`, {
    method: 'POST', headers: { Authorization: `Bearer ${env.PAYMENTS_RECONCILE_TOKEN}`, 'Content-Type': 'application/json' }, body: '{}',
  })
  assert.equal(response.status, 200)
  const summary = await response.json() as { demoOnly: boolean; simulatedCount: number }
  assert.equal(summary.demoOnly, true)
  assert.equal(summary.simulatedCount, 1)
  for (const token of [env.PAYMENTS_ADMIN_TOKEN, env.PAYMENTS_RECONCILE_TOKEN]) {
    assert.ok(!`${startup}${errors}${output}${demoErrors}${preparedOutput}`.includes(token))
  }
})
