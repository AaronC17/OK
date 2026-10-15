/** SERVER-SIDE ONLY. Redo of the 5-second gummies hero: lime beside the bowl, chamoy across the whole bowl.
 * Default: estimate only. Each stage persists idempotency keys before submitting.
 * Video generation requires --reviewed-image after visual review of the downloaded image.
 */
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, open, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { createHiggsfieldClient } from '@higgsfield/client/v2'
import { foodDirections } from '../../src/config/creative-direction.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const round = 'onkys-gummies-03'
const privateDir = resolve(root, '.higgsfield', round)
const publicDir = resolve(root, 'public', 'brand-media', round)
const statePath = resolve(privateDir, 'state.json')
const stage = process.argv.find(argument => argument.startsWith('--stage='))?.split('=')[1]
const credentials = process.env.HF_CREDENTIALS
const capMicroUsd = 1_000_000
const imageModel = 'marketing-studio/image'
const videoModel = 'kling-video/v3.0/pro/image-to-video'
const imageInput = {
  prompt: `${foodDirections[0].imagePrompt}\nKeep the bowl and lime comfortably inside the frame with at least 15 percent margin on all sides. The gummy mix must show distinct bear and worm silhouettes under a glossy appetizing chamoy coating that is drizzled across the WHOLE bowl surface, edge to edge, not just poured in the center. A fine visible chili-lime seasoning dusting sits on top. One halved green lime rests beside the bowl. Freshly squeezed lime juice is incorporated into the coating. Red sauce coats the gummies generously but must not fill the bowl like soup. Bright natural studio food photography, no colored backdrop, no invented food ingredients.`,
  resolution: '2k', aspect_ratio: '4:3', enhance_prompt: false,
}
const videoInput = (url: string) => ({
  prompt: 'Animate the approved food reference in one locked-camera shot. A thin stream of red chamoy is drizzled in a slow zigzag across the WHOLE surface of the gummy bowl, edge to edge, then stops. Preserve the exact gummy shapes, bowl, lime, lighting and white background. Slow restrained movement, realistic sauce viscosity, no splashes, no cuts, no new objects, no text. Keep all branding and UI outside the generated video.',
  image_url: url, duration: 5, sound: 'off', cfg_scale: 0.5, multi_shots: false,
})

type Job = { key: string; hash: string; input: object; model: string; estimatedMicroUsd: number; requestId?: string; status?: string; outputUrl?: string; localPath?: string }
type State = { round: string; image?: Job; video?: Job }
type MediaResponse = { request_id?: string; status: string; images?: { url: string }[]; video?: { url: string } }
class SafeError extends Error {}

async function save(path: string, data: unknown) {
  await writeFile(`${path}.tmp`, JSON.stringify(data, null, 2), 'utf8')
  await rename(`${path}.tmp`, path)
}

async function api(path: string, body?: object) {
  const response = await fetch(`https://api.higgsfield.ai/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Key ${credentials}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(60_000),
  })
  if (!response.ok) throw new SafeError(`Higgsfield respondió HTTP ${response.status}. No se reintentará una generación automáticamente.`)
  return response.json()
}

async function estimate(model: string, input: object): Promise<number> {
  const result = await api(`estimate/${model}`, input) as { usd?: unknown }
  const usd = String(result.usd)
  if (!/^\d+(?:\.\d{1,6})?$/.test(usd)) throw new SafeError('No se obtuvo una cotización verificable. No se generará contenido.')
  const [whole, decimals = ''] = usd.split('.')
  return Number(whole) * 1_000_000 + Number(decimals.padEnd(6, '0'))
}

async function publish(state: State) {
  await mkdir(publicDir, { recursive: true })
  await save(resolve(publicDir, 'manifest.json'), {
    round, updatedAt: new Date().toISOString(),
    image: state.image?.localPath ?? null, video: state.video?.localPath ?? null,
    imageStatus: state.image?.status ?? 'pending', videoStatus: state.video?.status ?? 'pending',
    estimatedTotalUsd: ((state.image?.estimatedMicroUsd ?? 0) + (state.video?.estimatedMicroUsd ?? 0)) / 1_000_000,
    imageModel, videoModel, duration: 5, audio: false,
    description: 'Referencia visual generada con IA: gomitas con chamoy repartido por todo el plato, sazonador tipo Tajín, jugo de limón y limón al lado. No es una filmación del producto real.',
    imagePrompt: imageInput.prompt, videoPrompt: 'Chamoy en zigzag por toda la superficie del plato, con limón al lado.',
  })
}

async function download(job: Job, kind: 'image' | 'video') {
  if (!job.outputUrl || new URL(job.outputUrl).protocol !== 'https:') throw new SafeError('El resultado no incluye una URL segura de archivo.')
  // No API authorization header is sent to the media host.
  const response = await fetch(job.outputUrl, { signal: AbortSignal.timeout(90_000) })
  if (!response.ok) throw new SafeError('No se pudo descargar el resultado. La solicitud y su URL están guardadas; no se generará otra.')
  const bytes = Buffer.from(await response.arrayBuffer())
  let extension: string
  if (kind === 'video') {
    if (bytes.subarray(4, 8).toString() !== 'ftyp') throw new SafeError('El video recibido no es un archivo MP4 válido.')
    extension = 'mp4'
  } else if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) extension = 'png'
  else if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) extension = 'jpg'
  else if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') extension = 'webp'
  else throw new SafeError('La imagen recibida no tiene un formato verificado.')
  await mkdir(publicDir, { recursive: true })
  const filename = `${kind === 'image' ? 'reference' : 'hero'}.${extension}`
  await writeFile(resolve(publicDir, filename), bytes)
  job.localPath = `/brand-media/${round}/${filename}`
}

async function main() {
  if (stage && !['image', 'video'].includes(stage)) throw new SafeError('Etapa desconocida. Usa --stage=image o --stage=video.')
  if (!credentials || !/^[^:\s]+:[^:\s]+$/.test(credentials)) throw new SafeError('Configura HF_CREDENTIALS solo en .env.local; no compartas la clave en el chat.')
  await mkdir(privateDir, { recursive: true })
  let lock
  try { lock = await open(resolve(privateDir, 'run.lock'), 'wx') }
  catch { throw new SafeError('Ya hay una ejecución registrada para esta ronda. No se enviarán solicitudes duplicadas.') }
  try {
    await lock.writeFile(String(process.pid))
    let state: State
    try { state = JSON.parse(await readFile(statePath, 'utf8')) as State }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new SafeError('No se pudo leer el registro existente. Operación detenida.')
      state = { round }
    }
    if (state.round !== round) throw new SafeError('El registro no corresponde a esta ronda.')
    if (stage === 'video' && (!state.image?.localPath || !state.image.outputUrl || !process.argv.includes('--reviewed-image'))) throw new SafeError('Primero revisa la imagen descargada. Para animarla, usa --stage=video --reviewed-image.')

    const refUrl = state.image?.outputUrl ?? 'https://images.pexels.com/photos/5469044/pexels-photo-5469044.jpeg?auto=compress&w=1280&h=960&fit=crop'
    const imageQuote = await estimate(imageModel, imageInput)
    const videoQuote = await estimate(videoModel, videoInput(refUrl))
    const total = (state.image?.requestId ? state.image.estimatedMicroUsd : imageQuote) + (state.video?.requestId ? state.video.estimatedMicroUsd : videoQuote)
    console.log(`Imagen cotizada: USD ${(imageQuote / 1_000_000).toFixed(3)}. Video de 5 s sin audio: USD ${(videoQuote / 1_000_000).toFixed(3)}.`)
    console.log(`Total previsto para esta ronda: USD ${(total / 1_000_000).toFixed(3)}. Límite: USD 1.000.`)
    if (total > capMicroUsd) throw new SafeError('La cotización supera el límite de USD 1. No se enviarán nuevas generaciones.')
    if (!stage) { console.log('Solo cotización; no se generó contenido.'); return }
    const kind = stage as 'image' | 'video'
    const input = kind === 'image' ? imageInput : videoInput(refUrl)
    const model = kind === 'image' ? imageModel : videoModel
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
    let job = state[kind]
    if (job && (job.hash !== hash || job.model !== model)) throw new SafeError('Los parámetros no coinciden con la solicitud guardada. No se creará otra generación.')
    if (!job) {
      job = { key: randomUUID(), hash, input, model, estimatedMicroUsd: kind === 'image' ? imageQuote : videoQuote }
      state[kind] = job
      await save(statePath, state)
    }
    if (job.localPath) { console.log(`Resultado ya descargado: ${job.localPath}`); return }
    if (['failed', 'nsfw', 'moderated', 'canceled', 'cancelled'].includes(job.status ?? '')) throw new SafeError('La solicitud anterior terminó sin resultado. No se generará otra automáticamente.')
    if (!job.requestId) {
      const client = createHiggsfieldClient({ credentials, maxRetries: 0, timeout: 60_000, headers: { 'Idempotency-Key': job.key } })
      const receipt = await client.subscribe(model, { input, withPolling: false })
      if (!/^[a-f0-9-]{36}$/i.test(receipt.request_id)) throw new SafeError('Respuesta sin request_id verificable. Reanuda con la identidad ya guardada.')
      job.requestId = receipt.request_id
      job.status = receipt.status
      await save(statePath, state)
      await publish(state)
      console.log(`Solicitud registrada (${kind}): ${job.requestId}`)
    }
    const started = Date.now()
    while (!job.outputUrl) {
      const result = await api(`requests/${job.requestId}/status`) as MediaResponse
      if (result.request_id !== job.requestId) throw new SafeError('El estado no corresponde a la solicitud registrada.')
      if (!['queued', 'in_progress', 'completed', 'failed', 'nsfw', 'moderated', 'canceled', 'cancelled'].includes(result.status)) throw new SafeError('Estado no reconocido. La solicitud queda guardada para revisión.')
      job.status = result.status
      if (result.status === 'completed') {
        const url = kind === 'image' ? result.images?.[0]?.url : result.video?.url
        if (!url || new URL(url).protocol !== 'https:') throw new SafeError('Solicitud completada sin un archivo verificable.')
        job.outputUrl = url
      }
      await save(statePath, state)
      if (!['queued', 'in_progress', 'completed'].includes(result.status)) { await publish(state); throw new SafeError(`Solicitud terminada sin archivo: ${result.status}.`) }
      if (job.outputUrl) break
      if (Date.now() - started > 20 * 60_000) throw new SafeError('Espera agotada; el request_id quedó guardado para continuar sin repetir la generación.')
      await delay(4000)
    }
    await download(job, kind)
    await save(statePath, state)
    await publish(state)
    console.log(`Resultado completado y descargado: ${job.localPath}`)
  } finally {
    await lock.close()
    await rm(resolve(privateDir, 'run.lock'), { force: true })
  }
}

main().catch(error => {
  // SDK errors may contain request headers. Never print them or credentials.
  console.error(error instanceof SafeError ? error.message : 'Operación interrumpida. Conserva el registro y reanuda la misma etapa, sin crear una solicitud nueva.')
  process.exitCode = 1
})
