/** SERVER-SIDE ONLY. Approved round: 3 reference images and ONE Seedance 2.5 video.
 * Default = pricing only. --stage=references/start/middle/end/video performs that stage.
 * Budget is a USD 6 working estimate, not a provider-enforced limit: token billing varies.
 * Every submission has a persisted idempotency key; no automatic creative retries.
 */
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createHiggsfieldClient } from '@higgsfield/client/v2'
import { gummyPreparation as brief } from '../../src/config/gummy-preparation.ts'

const round = 'onkys-gummies-02'
const dir = resolve('.higgsfield', round)
const publicDir = resolve('public/brand-media', round)
const statePath = resolve(dir, 'state.json')
const stage = process.argv.find(value => value.startsWith('--stage='))?.split('=')[1]
const credentials = process.env.HF_CREDENTIALS
const imageReserveUsd = .60
// Published image-reference-only tariff, no discounts assumed: 960×720×12×24/1024 tokens.
const videoListEstimateUsd = Math.ceil(960 * 720 * 12 * 24 / 1024) * .0214 / 1000
const planningTotalUsd = imageReserveUsd * 3 + videoListEstimateUsd
const terminalFailure = ['failed', 'nsfw', 'moderated', 'canceled', 'cancelled']
type StageName = 'start' | 'middle' | 'end' | 'video'
type Input = Record<string, unknown>
interface Job { key: string; model: string; input: Input; hash: string; requestId?: string; status?: string; outputUrl?: string; localPath?: string }
interface Upload { hash: string; publicUrl: string; role: string }
interface State { round: string; uploads: Upload[]; jobs: Partial<Record<StageName, Job>> }
interface Crop { path: string; sha256: string; role: string }
interface Result { request_id: string; status: string; images?: { url: string }[]; video?: { url: string } }
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

async function verifyPricing() {
  const reference = 'https://images.pexels.com/photos/5469208/pexels-photo-5469208.jpeg'
  const inputs: [string, Input, string[]][] = [
    [brief.models.image, { prompt: brief.imagePrompts[0], resolution: '2k', quality: 'high', aspect_ratio: '4:3', enhance_prompt: false }, ['$30', '$8', '$5']],
    [brief.models.video, { prompt: brief.videoPrompt, image_urls: [reference], duration: 12, resolution: '720p', aspect_ratio: '4:3', bitrate_mode: 'high', generate_audio: false }, ['$0.0214', '1024', '24']],
  ]
  for (const [model, input, expected] of inputs) {
    const quote = await api(`estimate/${model}`, input) as { pricing_description?: string; usd?: unknown }
    if (!quote.pricing_description || !expected.every(term => quote.pricing_description!.includes(term))) throw new SafeError(`The pricing scheme for ${model} changed or could not be verified. Stop before new generation.`)
    console.log(`Pricing scheme verified: ${model}; variable billing, not a fixed quote.`)
  }
  if (planningTotalUsd > 6) throw new SafeError('The planning estimate exceeds the authorized working budget.')
  console.log(`Planning estimate: USD ${planningTotalUsd.toFixed(3)} (3 image reserves × USD 0.60 + video USD ${videoListEstimateUsd.toFixed(3)} before any discount). Actual image token usage varies.`)
}

async function uploadReferences(state: State) {
  const crops = JSON.parse(await readFile(resolve(dir, 'references/manifest.json'), 'utf8')) as { references: Crop[] }
  if (crops.references.length !== 4) throw new SafeError('Four reviewed candy-only reference crops are required.')
  const next: Upload[] = []
  for (const crop of crops.references) {
    const bytes = await readFile(crop.path)
    const hash = createHash('sha256').update(bytes).digest('hex')
    if (hash !== crop.sha256) throw new SafeError('A reference crop changed; review it before uploading.')
    const cached = state.uploads.find(upload => upload.hash === hash)
    if (cached) { next.push(cached); continue }
    if (Object.values(state.jobs).some(job => job?.requestId)) throw new SafeError('Cannot change uploaded references after generation has started.')
    const ticket = await api('files/generate-upload-url', { content_type: 'image/jpeg' }) as { public_url: string; upload_url: string; upload_headers: Record<string, string> }
    if (new URL(ticket.public_url).protocol !== 'https:' || new URL(ticket.upload_url).protocol !== 'https:') throw new SafeError('Upload response did not contain safe HTTPS URLs.')
    if (Object.keys(ticket.upload_headers).some(header => header.toLowerCase() === 'authorization')) throw new SafeError('Unexpected upload authorization header; API credentials will not be sent to storage.')
    // Only the storage headers supplied by the upload ticket. Never the API authorization.
    const response = await fetch(ticket.upload_url, { method: 'PUT', headers: ticket.upload_headers, body: bytes, signal: AbortSignal.timeout(90_000) })
    if (!response.ok) throw new SafeError(`Reference upload failed with HTTP ${response.status}. No new generation was submitted.`)
    const record = { hash, publicUrl: ticket.public_url, role: crop.role }
    state.uploads.push(record)
    await atomicJson(statePath, state)
    next.push(record)
    console.log(`Uploaded a candy-only reference: ${next.length}/4.`)
  }
  state.uploads = next
  await atomicJson(statePath, state)
}

function makeInput(kind: StageName, state: State): Input {
  if (state.uploads.length !== 4) throw new SafeError('Upload the four reviewed reference crops first.')
  const refs = state.uploads.map(upload => upload.publicUrl)
  const roles = 'Reference roles: the four candy-only crops show worms/rounded sour rods, watermelon wedges, orange-red/yellow rings, and gummy bears, in that order. They define only the candy shapes, colors and textures: do NOT copy their original pink backgrounds, arrangement, printing or watermark. Re-stage the loose candies together in the bowl described below. No collage, contact sheet, packages, logos or letters.'
  if (kind === 'video') {
    if (!process.argv.includes('--reviewed-images')) throw new SafeError('Review all three generated references before requesting the video; then pass --reviewed-images.')
    const imageUrls = (['start', 'middle', 'end'] as const).map(name => {
      const job = state.jobs[name]
      if (job?.status !== 'completed' || !job.localPath || !job.outputUrl) throw new SafeError(`The ${name} image is not completed and downloaded.`)
      return job.outputUrl
    })
    return { prompt: brief.videoPrompt, image_urls: imageUrls, duration: 12, resolution: '720p', aspect_ratio: '4:3', bitrate_mode: 'high', generate_audio: false }
  }
  const index = { start: 0, middle: 1, end: 2 }[kind]
  const start = state.jobs.start?.outputUrl
  if (kind !== 'start' && (!start || !state.jobs.start?.localPath)) throw new SafeError('The starting frame must be generated and reviewed first.')
  if (kind !== 'start' && !process.argv.includes('--reviewed-start')) throw new SafeError('Pass --reviewed-start after reviewing the starting composition.')
  return {
    prompt: `${kind === 'start' ? roles : 'The FIRST image is the approved starting composition. Preserve its exact camera angle, bowl, plain kitchen counter, lighting, ingredient dishes and candy assortment. The remaining images are candy shape references only. Change only the stage of preparation described next. No collage or new props.'}\n${brief.imagePrompts[index]}`,
    image_urls: kind === 'start' ? refs : [start!, ...refs],
    resolution: '2k', quality: 'high', aspect_ratio: '4:3', enhance_prompt: false,
  }
}

async function publish(state: State) {
  await mkdir(publicDir, { recursive: true })
  await atomicJson(resolve(publicDir, 'manifest.json'), {
    round, updatedAt: new Date().toISOString(), image: state.jobs.start?.localPath ?? null,
    video: state.jobs.video?.localPath ?? null, imageStatus: state.jobs.start?.status ?? 'pending', videoStatus: state.jobs.video?.status ?? 'pending',
    duration: 12, resolution: '720p', audio: false,
    imageModel: brief.models.image, videoModel: brief.models.video,
    estimatedTotalUsd: Number(planningTotalUsd.toFixed(3)), pricingKind: 'variable-planning-estimate',
    description: 'Preparación ilustrativa generada con IA, basada en las gomitas de referencia: gusanitos, sandías, aros y ositos; se añade Tajín y se mezcla con espátula, con chamoy y jugo de limón ya incorporados. Sin envolturas ni fruta visible. No es una filmación del negocio.',
    imagePrompt: state.jobs.start?.input.prompt ?? null, videoPrompt: brief.videoPrompt,
    frames: (['start', 'middle', 'end'] as const).map(name => ({ name, image: state.jobs[name]?.localPath ?? null, status: state.jobs[name]?.status ?? 'pending' })),
  })
}

async function download(job: Job, kind: StageName) {
  if (!job.outputUrl || new URL(job.outputUrl).protocol !== 'https:') throw new SafeError('The result does not have a safe media URL.')
  const response = await fetch(job.outputUrl, { signal: AbortSignal.timeout(120_000) })
  if (!response.ok) throw new SafeError('Media download failed; the existing request is saved and must not be regenerated.')
  const bytes = Buffer.from(await response.arrayBuffer())
  let extension: string
  if (kind === 'video') {
    if (bytes.subarray(4, 8).toString() !== 'ftyp') throw new SafeError('The downloaded video is not a verified MP4.')
    extension = 'mp4'
  } else if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) extension = 'png'
  else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) extension = 'jpg'
  else if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') extension = 'webp'
  else throw new SafeError('The downloaded image format was not verified.')
  await mkdir(publicDir, { recursive: true })
  const filename = `${kind === 'video' ? 'hero' : kind}.${extension}`
  await writeFile(resolve(publicDir, filename), bytes)
  job.localPath = `/brand-media/${round}/${filename}`
}

async function main() {
  if (stage && !['references', 'start', 'middle', 'end', 'video'].includes(stage)) throw new SafeError('Unknown stage; no request submitted.')
  if (!credentials || !/^[^:\s]+:[^:\s]+$/.test(credentials)) throw new SafeError('Set HF_CREDENTIALS locally in .env.local. Never paste it into chat.')
  await mkdir(dir, { recursive: true })
  let lock
  try { lock = await open(resolve(dir, 'run.lock'), 'wx') } catch { throw new SafeError('This round is already locked. Check the running process before resuming.') }
  try {
    await lock.writeFile(String(process.pid))
    let state: State
    try { state = JSON.parse(await readFile(statePath, 'utf8')) as State }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new SafeError('Cannot read the existing state; stop to avoid duplicates.')
      state = { round, uploads: [], jobs: {} }
    }
    if (state.round !== round) throw new SafeError('State does not belong to this round.')
    if (stage === 'references') { await uploadReferences(state); console.log('References uploaded. No paid generation submitted.'); return }
    await verifyPricing()
    if (!stage) { console.log('Pricing check only; no generation submitted.'); return }
    const kind = stage as StageName
    const input = makeInput(kind, state)
    const model = kind === 'video' ? brief.models.video : brief.models.image
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
    let job = state.jobs[kind]
    if (job && (job.hash !== hash || job.model !== model)) throw new SafeError('Parameters differ from the saved request. Do not create another request automatically.')
    if (!job) { job = { key: randomUUID(), model, input, hash }; state.jobs[kind] = job; await atomicJson(statePath, state) }
    if (job.localPath) { console.log(`Existing downloaded result: ${job.localPath}`); return }
    if (terminalFailure.includes(job.status ?? '')) throw new SafeError(`The saved request ended as ${job.status}; no automatic replacement.`)
    if (!job.requestId) {
      const client = createHiggsfieldClient({ credentials, maxRetries: 0, timeout: 90_000, headers: { 'Idempotency-Key': job.key } })
      const receipt = await client.subscribe(model, { input, withPolling: false })
      if (!/^[a-f0-9-]{36}$/i.test(receipt.request_id)) throw new SafeError('No verified request ID; preserve the existing idempotency key before resuming.')
      job.requestId = receipt.request_id; job.status = receipt.status
      await atomicJson(statePath, state); await publish(state)
      console.log(`Accepted ${kind}: ${job.requestId}`)
    }
    const started = Date.now()
    while (!job.outputUrl) {
      const result = await api(`requests/${job.requestId}/status`) as Result
      if (result.request_id !== job.requestId) throw new SafeError('Request status ID mismatch.')
      if (!['queued', 'in_progress', 'completed', ...terminalFailure].includes(result.status)) throw new SafeError('Unknown status; preserve the request for manual review.')
      job.status = result.status
      if (result.status === 'completed') {
        const url = kind === 'video' ? result.video?.url : result.images?.[0]?.url
        if (!url || new URL(url).protocol !== 'https:') throw new SafeError('Completed response without verified media.')
        job.outputUrl = url
      }
      await atomicJson(statePath, state)
      if (terminalFailure.includes(result.status)) { await publish(state); throw new SafeError(`Request ended as ${result.status}; no successful media claimed.`) }
      if (job.outputUrl) break
      if (Date.now() - started > 25 * 60_000) throw new SafeError('Polling timed out. Resume the existing request; do not create a new one.')
      await delay(5000)
    }
    await download(job, kind)
    await atomicJson(statePath, state); await publish(state)
    console.log(`Completed and downloaded: ${job.localPath}`)
  } finally { await lock.close(); await rm(resolve(dir, 'run.lock'), { force: true }) }
}

main().catch(error => {
  // Raw SDK/fetch errors may carry authentication headers. Never log those objects.
  console.error(error instanceof SafeError ? error.message : 'Stage interrupted. Preserve the saved state and idempotency key; do not resubmit as a new generation.')
  process.exitCode = 1
})
