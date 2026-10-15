/**
 * SERVER-SIDE ONLY. Archived round. Default: estimate; --generate is now blocked.
 * Credentials are loaded by Node's --env-file at runtime and are never persisted or logged.
 * Persist idempotency keys before submission and request IDs before polling, so restarts resume.
 */
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { createHiggsfieldClient } from '@higgsfield/client/v2'
import { concepts, inputFor, MAX_ESTIMATE_MICRO_USD, MODEL, ROUND_ID } from './concepts.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const privateDir = resolve(root, '.higgsfield', ROUND_ID)
const statePath = resolve(privateDir, 'state.json')
const assetDir = resolve(root, 'public', 'brand-concepts', ROUND_ID)
const credentials = process.env.HF_CREDENTIALS
const generate = process.argv.includes('--generate')

type Job = {
  idempotencyKey: string
  inputHash: string
  estimatedMicroUsd: number
  requestId?: string
  status?: string
  imageUrl?: string
  downloaded?: boolean
}
type State = { round: string; model: string; jobs: Record<string, Job> }
type Response = { request_id?: string; status: string; images?: { url: string }[] }
class SafeError extends Error {}

async function atomicJson(path: string, value: unknown) {
  await writeFile(`${path}.tmp`, JSON.stringify(value, null, 2), 'utf8')
  await rename(`${path}.tmp`, path)
}

async function api(path: string, input?: unknown): Promise<unknown> {
  const response = await fetch(`https://api.higgsfield.ai/${path}`, {
    method: input === undefined ? 'GET' : 'POST',
    headers: { Authorization: `Key ${credentials}`, 'Content-Type': 'application/json' },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) throw new SafeError(`Higgsfield devolvió HTTP ${response.status}. Se detuvo la ronda.`)
  return response.json()
}

function toMicroUsd(value: unknown): number {
  const text = String(value)
  if (!/^\d+(?:\.\d{1,6})?$/.test(text)) throw new SafeError('Cotización sin importe verificable. No se envió una nueva generación.')
  const [whole, decimals = ''] = text.split('.')
  return Number(whole) * 1_000_000 + Number(decimals.padEnd(6, '0'))
}

async function main() {
  if (generate) throw new SafeError('Esta ronda de regalos quedó descartada. No se enviaron solicitudes. Los nuevos prompts de productos requieren aprobación antes de generar.')
  if (!credentials || !/^[^:\s]+:[^:\s]+$/.test(credentials)) throw new SafeError('Configura HF_CREDENTIALS localmente en .env.local. No compartas la clave en el chat.')
  await mkdir(privateDir, { recursive: true })
  let lock
  try { lock = await open(resolve(privateDir, 'run.lock'), 'wx') }
  catch { throw new SafeError('Esta ronda ya tiene un bloqueo de ejecución. Revisa el proceso existente antes de reanudarla.') }

  try {
    await lock.writeFile(String(process.pid))
    let state: State
    try { state = JSON.parse(await readFile(statePath, 'utf8')) as State }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new SafeError('El registro local no se pudo leer. Se detuvo la ejecución para evitar duplicados.')
      state = { round: ROUND_ID, model: MODEL, jobs: {} }
    }
    if (state.round !== ROUND_ID || state.model !== MODEL) throw new SafeError('El registro no coincide con esta ronda.')

    let totalMicroUsd = 0
    for (const concept of concepts) {
      const input = inputFor(concept)
      const inputHash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
      const existing = state.jobs[concept.id]
      if (existing && existing.inputHash !== inputHash) throw new SafeError('Cambió un prompt ya registrado. No se generará otra imagen automáticamente.')
      const estimate = await api(`estimate/${MODEL}`, input) as { usd?: unknown }
      const estimatedMicroUsd = toMicroUsd(estimate.usd)
      if (!existing) state.jobs[concept.id] = { idempotencyKey: randomUUID(), inputHash, estimatedMicroUsd }
      else if (!existing.requestId) existing.estimatedMicroUsd = estimatedMicroUsd
      totalMicroUsd += state.jobs[concept.id].estimatedMicroUsd
      console.log(`${concept.id} · ${concept.title}: USD ${(estimatedMicroUsd / 1_000_000).toFixed(3)}${existing?.requestId ? ' · solicitud ya registrada' : ''}`)
    }
    if (totalMicroUsd > MAX_ESTIMATE_MICRO_USD) throw new SafeError('La cotización supera el tope autorizado de USD 0.21. Se detuvo la ronda.')
    await atomicJson(statePath, state)
    console.log(`Total cotizado: USD ${(totalMicroUsd / 1_000_000).toFixed(3)}. Tope: USD 0.210.`)
    if (!generate) { console.log('Cotización lista. No se enviaron generaciones.'); return }
    await mkdir(assetDir, { recursive: true })

    const publish = async () => atomicJson(resolve(assetDir, 'manifest.json'), {
      round: ROUND_ID, model: MODEL, estimatedTotalUsd: (totalMicroUsd / 1_000_000).toFixed(3),
      updatedAt: new Date().toISOString(),
      concepts: concepts.map(concept => ({
        id: concept.id, title: concept.title, description: concept.description, alt: concept.alt,
        motion: concept.motion, prompt: concept.prompt,
        status: state.jobs[concept.id].downloaded ? 'ready' : state.jobs[concept.id].status ?? 'pending',
        image: state.jobs[concept.id].downloaded ? `/brand-concepts/${ROUND_ID}/${concept.id}.png` : null,
      })),
    })
    await publish()

    for (const concept of concepts) {
      const job = state.jobs[concept.id]
      if (job.downloaded) { console.log(`${concept.id}: imagen local ya disponible.`); continue }
      if (['failed', 'nsfw', 'canceled', 'cancelled', 'moderated'].includes(job.status ?? '')) {
        console.log(`${concept.id}: solicitud terminada sin imagen (${job.status}).`)
        continue
      }
      if (!job.requestId) {
        const client = createHiggsfieldClient({
          credentials, maxRetries: 0, timeout: 60_000,
          headers: { 'Idempotency-Key': job.idempotencyKey },
        })
        // Official subscribe, returning the acceptance receipt before we poll explicitly.
        const receipt = await client.subscribe(MODEL, { input: inputFor(concept), withPolling: false })
        if (!/^[a-f0-9-]{36}$/i.test(receipt.request_id)) throw new SafeError('La respuesta no tiene un request_id válido. Reanuda con la misma clave de idempotencia.')
        job.requestId = receipt.request_id
        job.status = receipt.status
        await atomicJson(statePath, state)
        await publish()
        console.log(`${concept.id}: solicitud registrada · ${job.requestId}`)
      }
      const started = Date.now()
      while (!job.imageUrl) {
        const response = await api(`requests/${job.requestId}/status`) as Response
        if (response.request_id !== job.requestId) throw new SafeError('El estado recibido pertenece a otra solicitud. Ejecución detenida.')
        const status = response.status
        if (!['queued', 'in_progress', 'completed', 'failed', 'nsfw', 'canceled', 'cancelled', 'moderated'].includes(status)) throw new SafeError('Estado no reconocido; la solicitud queda registrada para revisión.')
        job.status = status
        if (status === 'completed') {
          const url = response.images?.[0]?.url
          if (!url || new URL(url).protocol !== 'https:') throw new SafeError('Solicitud completada sin una URL de imagen válida.')
          job.imageUrl = url
        }
        await atomicJson(statePath, state)
        if (!['queued', 'in_progress'].includes(status)) break
        if (Date.now() - started > 15 * 60_000) throw new SafeError('Tiempo de espera agotado. El request_id se guardó para continuar sin generar otra imagen.')
        await delay(3000)
      }
      if (job.imageUrl) {
        // Media download never receives the API authorization header.
        const response = await fetch(job.imageUrl, { signal: AbortSignal.timeout(90_000) })
        if (!response.ok) throw new SafeError(`No se pudo descargar la imagen ${concept.id}. La URL quedó guardada.`)
        const image = Buffer.from(await response.arrayBuffer())
        if (!image.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new SafeError('El recurso recibido no es el PNG solicitado.')
        await writeFile(resolve(assetDir, `${concept.id}.png`), image)
        job.downloaded = true
        await atomicJson(statePath, state)
        console.log(`${concept.id}: imagen completada y guardada localmente.`)
      } else console.log(`${concept.id}: no se produjo imagen (${job.status}).`)
      await publish()
    }
    const completed = Object.values(state.jobs).filter(job => job.downloaded).length
    console.log(`Ronda terminada: ${completed}/${concepts.length} imágenes disponibles. Galería: /?vista=bocetos`)
    if (completed !== concepts.length) process.exitCode = 1
  } finally {
    await lock.close()
    await rm(resolve(privateDir, 'run.lock'), { force: true })
  }
}

main().catch(error => {
  // Never print raw SDK/fetch errors: they can include authorization headers.
  console.error(error instanceof SafeError ? error.message : 'La operación se interrumpió. El registro local permite retomar la misma ronda sin nuevas solicitudes duplicadas.')
  process.exitCode = 1
})
