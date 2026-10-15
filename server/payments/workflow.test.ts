import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'

const workflow = JSON.parse(readFileSync(new URL('../../integrations/n8n/sinpe-local-demo.json', import.meta.url), 'utf8')) as {
  active: boolean
  nodes: { name: string; type: string; credentials?: unknown; parameters: Record<string, unknown> }[]
  connections: Record<string, { main: { node: string }[][] }>
}

test('n8n: JSON has valid links, no embedded credentials, is inactive and never calls a bank', () => {
  assert.equal(workflow.active, false)
  const names = new Set(workflow.nodes.map(node => node.name))
  assert.equal(names.size, workflow.nodes.length)
  for (const [source, connection] of Object.entries(workflow.connections)) {
    assert.ok(names.has(source))
    for (const branch of connection.main) for (const target of branch) assert.ok(names.has(target.node))
  }
  assert.ok(workflow.nodes.every(node => !node.credentials))
  const http = workflow.nodes.filter(node => node.type === 'n8n-nodes-base.httpRequest')
  assert.equal(http.length, 1)
  assert.match(http[0].parameters.url as string, /internal\/reconciliation\/run/)
  assert.equal(http[0].parameters.genericAuthType, 'httpHeaderAuth')
})

test('n8n: Code guard rejects live results, missing flags and invalid metrics', () => {
  const code = workflow.nodes.find(node => node.type === 'n8n-nodes-base.code')!.parameters.jsCode as string
  const run = (json: Record<string, unknown>) => runInNewContext(`(function() { ${code} })()`, { $input: { first: () => ({ json }) } }, { timeout: 1000 }) as { json: Record<string, unknown> }[]
  const summary = { demoOnly: true, mode: 'mock', processedCount: 1, simulatedCount: 1, reviewedCount: 0, pendingCount: 0, manualReviewCount: 0, conflictCount: 0 }
  assert.match(run(summary)[0].json.aviso as string, /SIMULACION/)
  for (const patch of [{ demoOnly: false }, { mode: 'bac' }, { simulatedCount: -1 }, { pendingCount: '0' }]) assert.throws(() => run({ ...summary, ...patch }))
})
