/** SERVER-SIDE ONLY. One bag reference upload + ONE Seedance 2.5 video, 16:9, no audio.
 * Default: estimate only. --stage=upload|video performs that stage.
 * Budget cap USD 5 working estimate; token billing varies by dimensions and duration.
 * Persisted idempotency key; no automatic creative retries.
 */
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createHiggsfieldClient } from '@higgsfield/client/v2'

const round = 'onkys-bag-01'
const dir = resolve('.higgsfield', round)
const publicDir = resolve('public/brand-media', round)
const statePath = resolve(dir, 'state.json')
const stage = process.argv.find(value => value.startsWith('--stage='))?.split('=')[1]
const credentials = process.env.HF_CREDENTIALS
const capMicroUsd = 5_000_000
const model = 'bytedance/seedance-2.5/reference-to-video'
const referencePath = 'references/bolsa de gomitas.jpg'
const prompt = `Use the supplied reference image: a transparent resealable zip bag filled with chamoy-coated gummy candies (rings, bears, worms) with chili seasoning, centered on a turquoise surface, viewed from directly above. Create a brief horizontal 16:9 product advertisement as ONE continuous locked top-down shot. The bag remains centered and fully visible during the entire action. A realistic clean hand enters naturally from the top edge, opens the resealable zip closure, reaches inside, picks up exactly ONE gummy candy, lifts it out of the bag and carries it out of frame without stopping, posing, or presenting it to camera. Natural lifelike hand anatomy and motion, realistic plastic-bag wrinkles and candy textures, soft even studio light. No cuts, no text, no logos, no extra objects, no deformed fingers, no abrupt movements, no CGI or cartoon look.`
const input = (url: string) => ({
  prompt, image_urls: [url], duration: 8, resolution: '720p',
  aspect_ratio: '16:9', bitrate_mode: 'high', generate_audio: false,
})

interface Job { key: string; model: string; input: object; hash: string; requestId?: string; status?: string; outputUrl?: string; localPath?: string }
interface State { round: string; referenceHash?: string; referenceUrl?: string; job?: Job }
interface Result { request_id: string; status: string; video?: { url: string } }
class SafeError extends Error {}

async function atomicJson(path: string, value: unknown) {
  await writeFile(`${path}.tmp`, JSON.stringify(value, null, 2), 'utf8')
  await rename(`${path}.tmp`, path)
}

async function api(path: string, body?: object): Promise<unknown> {
  const response = await fetch(`https://api.higgsfield.ai/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Key ${credentials}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(90_000),
  })
  if (!response.ok) throw new SafeError(`Higgsfield HTTP ${response.status}; no automatic resubmission.`)
  return response.json()
}

async function estimate(): Promise<number> {
  if (!stateRef.referenceUrl) throw new SafeError('Upload the reference first with --stage=upload.')
  const result = await api(`estimate/${model}`, input(stateRef.referenceUrl)) as { usd?: unknown; pricing_description?: unknown }
  const usd = String(result.usd ?? '')
  if (/^\d+(?:\.\d{1,6})?$/.test(usd)) {
    const [whole, decimals = ''] = usd.split('.')
    return Number(whole) * 1_000_000 + Number(decimals.padEnd(6, '0'))
  }
  // This endpoint returns a pricing scheme instead of a fixed quote: verify it,
  // then compute the list-price planning estimate for 8 s at 720p 16:9.
  const description = String(result.pricing_description ?? '')
  if (!description.includes('0.4622') || !description.includes('1024')) throw new SafeError('The pricing scheme changed or could not be verified; nothing will be generated.')
  console.log('Verified 720p 16:9 list rate USD 0.4622/s before discount; planning estimate computed, not a fixed quote.')
  return Math.round(8 * 0.4622 * 1_000_000)
}

let stateRef: State

async function main() {
  if (stage && !['upload', 'video'].includes(stage)) throw new SafeError('Unknown stage; no request submitted.')
  if (!credentials || !/^[^:\s]+:[^:\s]+$/.test(credentials)) throw new SafeError('Set HF_CREDENTIALS locally in .env.local. Never paste it into chat.')
  await mkdir(dir, { recursive: true })
  let lock
  try { lock = await open(resolve(dir, 'run.lock'), 'wx') } catch { throw new SafeError('This round is already locked. Check the running process before resuming.') }
  try {
    await lock.writeFile(String(process.pid))
    try { stateRef = JSON.parse(await readFile(statePath, 'utf8')) as State }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new SafeError('Cannot read the existing state; stop to avoid duplicates.')
      stateRef = { round }
    }
    if (stateRef.round !== round) throw new SafeError('State does not belong to this round.')

    if (stage === 'upload' || !stateRef.referenceUrl) {
      const bytes = await readFile(referencePath)
      const hash = createHash('sha256').update(bytes).digest('hex')
      if (stateRef.referenceHash && stateRef.referenceHash !== hash) throw new SafeError('The reference file changed; review it before uploading again.')
      if (!stateRef.referenceUrl) {
        const ticket = await api('files/generate-upload-url', { content_type: 'image/jpeg' }) as { public_url: string; upload_url: string; upload_headers: Record<string, string> }
        if (new URL(ticket.public_url).protocol !== 'https:' || new URL(ticket.upload_url).protocol !== 'https:') throw new SafeError('Upload response did not contain safe HTTPS URLs.')
        if (Object.keys(ticket.upload_headers).some(header => header.toLowerCase() === 'authorization')) throw new SafeError('Unexpected upload authorization header; API credentials will not be sent to storage.')
        const response = await fetch(ticket.upload_url, { method: 'PUT', headers: ticket.upload_headers, body: bytes, signal: AbortSignal.timeout(90_000) })
        if (!response.ok) throw new SafeError(`Reference upload failed with HTTP ${response.status}. No generation submitted.`)
        stateRef.referenceHash = hash
        stateRef.referenceUrl = ticket.public_url
        await atomicJson(statePath, stateRef)
        console.log('Reference uploaded (bag only, no packaging text used as content). No paid generation submitted.')
      } else console.log('Reference already uploaded.')
      if (stage === 'upload') return
    }

    const quote = await estimate()
    console.log(`Video 8 s 16:9 720p sin audio cotizado: USD ${(quote / 1_000_000).toFixed(3)}. Límite: USD 5.000.`)
    if (quote > capMicroUsd) throw new SafeError('The quote exceeds the USD 5 cap. No generation submitted.')
    if (!stage) { console.log('Quote only; no generation submitted.'); return }

    const videoInput = input(stateRef.referenceUrl!)
    const hash = createHash('sha256').update(JSON.stringify(videoInput)).digest('hex')
    let job = stateRef.job
    if (job && (job.hash !== hash || job.model !== model)) throw new SafeError('Parameters differ from the saved request. No new request will be created automatically.')
    if (!job) {
      job = { key: randomUUID(), model, input: videoInput, hash }
      stateRef.job = job
      await atomicJson(statePath, stateRef)
    }
    if (job.localPath) { console.log(`Existing downloaded result: ${job.localPath}`); return }
    if (['failed', 'nsfw', 'moderated', 'canceled', 'cancelled'].includes(job.status ?? '')) throw new SafeError(`The saved request ended as ${job.status}; no automatic replacement.`)
    if (!job.requestId) {
      const client = createHiggsfieldClient({ credentials, maxRetries: 0, timeout: 90_000, headers: { 'Idempotency-Key': job.key } })
      const receipt = await client.subscribe(model, { input: videoInput, withPolling: false })
      if (!/^[a-f0-9-]{36}$/i.test(receipt.request_id)) throw new SafeError('No verified request ID; preserve the existing idempotency key before resuming.')
      job.requestId = receipt.request_id
      job.status = receipt.status
      await atomicJson(statePath, stateRef)
      console.log(`Accepted video: ${job.requestId}`)
    }
    const started = Date.now()
    while (!job.outputUrl) {
      const result = await api(`requests/${job.requestId}/status`) as Result
      if (result.request_id !== job.requestId) throw new SafeError('Request status ID mismatch.')
      if (!['queued', 'in_progress', 'completed', 'failed', 'nsfw', 'moderated', 'canceled', 'cancelled'].includes(result.status)) throw new SafeError('Unknown status; preserve the request for manual review.')
      job.status = result.status
      if (result.status === 'completed') {
        if (!result.video?.url || new URL(result.video.url).protocol !== 'https:') throw new SafeError('Completed response without verified media.')
        job.outputUrl = result.video.url
      }
      await atomicJson(statePath, stateRef)
      if (['failed', 'nsfw', 'moderated', 'canceled', 'cancelled'].includes(result.status)) throw new SafeError(`Request ended as ${result.status}; no successful media claimed.`)
      if (job.outputUrl) break
      if (Date.now() - started > 25 * 60_000) throw new SafeError('Polling timed out. Resume the existing request; do not create a new one.')
      await delay(5000)
    }
    const response = await fetch(job.outputUrl, { signal: AbortSignal.timeout(120_000) })
    if (!response.ok) throw new SafeError('Media download failed; the existing request is saved and must not be regenerated.')
    const bytes = Buffer.from(await response.arrayBuffer())
    if (bytes.subarray(4, 8).toString() !== 'ftyp') throw new SafeError('The downloaded video is not a verified MP4.')
    await mkdir(publicDir, { recursive: true })
    await writeFile(resolve(publicDir, 'hero.mp4'), bytes)
    job.localPath = `/brand-media/${round}/hero.mp4`
    await atomicJson(statePath, stateRef)
    await atomicJson(resolve(publicDir, 'manifest.json'), {
      round, updatedAt: new Date().toISOString(), video: job.localPath,
      videoStatus: 'completed', duration: 8, resolution: '720p', aspectRatio: '16:9', audio: false,
      videoModel: model, estimatedTotalUsd: Number((quote / 1_000_000).toFixed(3)),
      description: 'Anuncio ilustrativo generado con IA a partir de la bolsa de referencia: una mano abre el cierre, toma una gomita y la saca del encuadre. Sin texto ni logos. No es una filmación del producto real.',
    })
    console.log(`Completed and downloaded: ${job.localPath}`)
  } finally { await lock.close(); await rm(resolve(dir, 'run.lock'), { force: true }) }
}

main().catch(error => {
  console.error(error instanceof SafeError ? error.message : 'Stage interrupted. Preserve the saved state and idempotency key; do not resubmit as a new generation.')
  process.exitCode = 1
})
