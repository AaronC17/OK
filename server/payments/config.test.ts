import assert from 'node:assert/strict'
import test from 'node:test'
import { loadPaymentsConfig } from './config.ts'

const env = { PAYMENTS_ADMIN_TOKEN: 'a'.repeat(43), PAYMENTS_RECONCILE_TOKEN: 'b'.repeat(43) }

test('config: defaults to no bank access and never permits production or an invented BAC integration', () => {
  assert.equal(loadPaymentsConfig(env).mode, 'disabled')
  assert.equal(loadPaymentsConfig({ ...env, PAYMENTS_MODE: 'mock' }).mode, 'mock')
  assert.throws(() => loadPaymentsConfig({ ...env, NODE_ENV: 'production' }), /producción/)
  for (const mode of ['bac', 'live', 'authorized']) assert.throws(() => loadPaymentsConfig({ ...env, PAYMENTS_MODE: mode }), /adaptador BAC/)
})

test('config: requires separate strong-format tokens and validates port and nonbank account alias', () => {
  assert.throws(() => loadPaymentsConfig({}), /tokens/)
  assert.throws(() => loadPaymentsConfig({ ...env, PAYMENTS_RECONCILE_TOKEN: env.PAYMENTS_ADMIN_TOKEN }), /distintos/)
  assert.throws(() => loadPaymentsConfig({ ...env, PAYMENTS_ADMIN_TOKEN: 'short' }), /tokens/)
  for (const port of ['0', '8787.5', '65536', 'NaN']) assert.throws(() => loadPaymentsConfig({ ...env, PAYMENTS_PORT: port }), /PAYMENTS_PORT/)
  assert.throws(() => loadPaymentsConfig({ ...env, PAYMENTS_ACCOUNT_ALIAS: '+506 12345678' }), /alias/)
})
