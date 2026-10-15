/** Server-side only. Round 03: small glass pitcher of lemon juice for the mix.
 * Default: estimate. --generate submits/resumes this single, persisted round.
 */
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { createHiggsfieldClient } from '@higgsfield/client/v2'

const round = 'onkys-seasoning-bottles-03'
const model = 'marketing-studio/image/sunburst'
const directory = resolve('.higgsfield', round)
const statePath = resolve(directory, 'state.json')
const credentials = process.env.HF_CREDENTIALS
const subjects = [
  { name: 'limon', description: 'One small clear glass pouring pitcher, about 250 ml, like a tiny kitchen carafe: rounded body, short neck widening into a flared pouring spout with a pinched lip. Filled in the lower half with pale cloudy freshly squeezed lemon juice, realistic liquid surface line, delicate glass reflections and refraction. No handle or a very small glass handle, no hand, no lemons, no leaves, no text, no label. Premium, photorealistic studio product packshot, not an illustration or 3D cartoon. ONE pitcher only, UPRIGHT, viewed almost straight on, camera level with the middle of the vessel, minimal perspective. The entire pitcher including the spout lip is fully inside the frame, centered with 12 percent margin, about 70 percent of image height. Realistic softbox reflections from upper left, clean edges. Isolate on a uniform pure white RGB 255,255,255 background. NO floor shadow, NO surface, NO cast shadow, NO hands, NO props, NO fruit, NO liquid stream, NO droplets, NO collage, NO checkerboard. This will be cut out and tilted around its spout for a pouring animation.' },
] as const
const inputs = subjects.map(subject => ({ prompt: subject.description, resolution: '2k', quality: 'high', aspect_ratio: '3:4', enhance_prompt: false }))
interface Job { key: string; hash: string; requestId?: string; status?: string; outputUrl?: string; file?: string }
interface State { round: string; model: string; jobs: Record<string, Job>; estimates?: unknown[] }
interface Result { request_id: string; status: string; images?: { url: string }[] }
class SafeError extends Error {}
const terminal = ['failed', 'nsfw', 'moderated', 'canceled', 'cancelled']
async function save(state: State) {
  await writeFile(`${statePath}.tmp`, JSON.stringify(state, null, 2))
  await rename(`${statePath}.tmp`, statePath)
}
async function api(path: string, body?: object) {
  const response = await fetch(`https://api.higgsfield.ai/${path}`, { method: body ? 'POST' : 'GET', headers: { Authorization: `Key ${credentials}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(90_000) })
  if (!response.ok) throw new SafeError(`Higgsfield HTTP ${response.status}; existing request identities preserved.`)
  return response.json()
}
async function main() {
  if (!credentials) throw new SafeError('HF_CREDENTIALS is required in .env.local.')
  await mkdir(directory, { recursive: true })
  const lock = await open(resolve(directory, 'run.lock'), 'wx')
  try {
    await lock.writeFile(String(process.pid))
    let state: State
    try { state = JSON.parse(await readFile(statePath, 'utf8')) as State }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; state = { round, model, jobs: {} } }
    if (state.round !== round || state.model !== model) throw new SafeError('Round identity mismatch.')
    state.estimates = await Promise.all(inputs.map(input => api(`estimate/${model}`, input)))
    await save(state)
    console.log(JSON.stringify({ model, images: 1, estimates: state.estimates, planningReserveUsd: 0.6 }, null, 2))
    if (!process.argv.includes('--generate')) return
    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i], input = inputs[i], hash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
      let job = state.jobs[subject.name]
      if (job && job.hash !== hash) throw new SafeError('Saved input differs; preserve the existing request.')
      if (!job) { job = { key: randomUUID(), hash }; state.jobs[subject.name] = job; await save(state) }
      if (job.file) continue
      if (terminal.includes(job.status ?? '')) throw new SafeError(`Saved ${subject.name} request ended as ${job.status}.`)
      if (!job.requestId) {
        const client = createHiggsfieldClient({ credentials, maxRetries: 0, timeout: 90_000, headers: { 'Idempotency-Key': job.key } })
        const receipt = await client.subscribe(model, { input, withPolling: false })
        if (!/^[a-f0-9-]{36}$/i.test(receipt.request_id)) throw new SafeError('Missing verified request ID.')
        job.requestId = receipt.request_id; job.status = receipt.status
        await save(state)
        console.log(`Submitted ${subject.name}: ${job.requestId}`)
      }
    }
    const started = Date.now()
    while (subjects.some(subject => !state.jobs[subject.name].file)) {
      for (const subject of subjects) {
        const job = state.jobs[subject.name]
        if (job.file) continue
        if (!job.outputUrl) {
          const result = await api(`requests/${job.requestId}/status`) as Result
          if (result.request_id !== job.requestId) throw new SafeError('Status identity mismatch.')
          job.status = result.status
          if (result.status === 'completed') job.outputUrl = result.images?.[0]?.url
          await save(state)
          if (terminal.includes(result.status)) throw new SafeError(`${subject.name} ended as ${result.status}.`)
          if (result.status === 'completed' && !job.outputUrl) throw new SafeError('Completed request has no media.')
        }
        if (!job.outputUrl) continue
        if (new URL(job.outputUrl).protocol !== 'https:') throw new SafeError('Expected HTTPS media URL.')
        const response = await fetch(job.outputUrl, { signal: AbortSignal.timeout(120_000) })
        if (!response.ok) throw new SafeError('Download failed. Resume the saved request.')
        const bytes = Buffer.from(await response.arrayBuffer())
        const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        const jpg = bytes[0] === 255 && bytes[1] === 216
        const webp = bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP'
        if (!png && !jpg && !webp) throw new SafeError('Unexpected image format.')
        job.file = `${subject.name}.${png ? 'png' : jpg ? 'jpg' : 'webp'}`
        await writeFile(resolve(directory, job.file), bytes)
        await save(state)
        console.log(`Downloaded ${subject.name}: ${resolve(directory, job.file)}`)
      }
      if (Date.now() - started > 20 * 60_000) throw new SafeError('Timed out; resume existing jobs.')
      if (subjects.some(subject => !state.jobs[subject.name].file)) await delay(5000)
    }
    await writeFile(resolve(directory, 'manifest.json'), JSON.stringify({ round, model, generated: true, planningReserveUsd: 0.6, subjects: subjects.map((subject, i) => ({ name: subject.name, prompt: inputs[i].prompt, file: state.jobs[subject.name].file })) }, null, 2))
  } finally { await lock.close(); await rm(resolve(directory, 'run.lock'), { force: true }) }
}
main().catch(error => { console.error(error instanceof SafeError ? error.message : 'Interrupted. Request identities preserved; credentials are not logged.'); process.exitCode = 1 })
