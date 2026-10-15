import { useEffect, useMemo, useState } from 'react'
import { store } from '../config/store.ts'
import { HeroMedia } from './HeroMedia.tsx'
import { Icon } from './Icon.tsx'
import './brand-gallery.css'
import './gummies-preview.css'

interface MediaManifest {
  image: string | null
  video: string | null
  webVideo?: string
  poster?: string
  videoStatus: string
  estimatedTotalUsd: number
  pricingKind?: string
  duration: number
  description: string
  frames?: { name: string; image: string | null; status: string }[]
}

export default function GummiesPreview() {
  const [media, setMedia] = useState<MediaManifest | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    document.title = `${store.name} — Video de las gomitas`
    const controller = new AbortController()
    let refresh: number | undefined
    const load = async () => {
      try {
        const round = new URLSearchParams(window.location.search).get('version') === '02' ? 'onkys-gummies-02'
          : store.heroVideo?.src.includes('onkys-gummies-02') ? 'onkys-gummies-02' : 'onkys-gummies-01'
        const response = await fetch(`/brand-media/${round}/manifest.json?t=${Date.now()}`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('Media unavailable')
        const data = await response.json() as MediaManifest
        if (!data.image || !data.image.startsWith('/brand-media/') || (data.video && !data.video.startsWith('/brand-media/'))) throw new Error('Invalid local media')
        setMedia(data)
        setError(false)
        if (!data.video && !['failed', 'nsfw', 'moderated', 'canceled', 'cancelled'].includes(data.videoStatus)) refresh = window.setTimeout(load, 4000)
      } catch { if (!controller.signal.aborted) setError(true) }
    }
    void load()
    return () => { controller.abort(); window.clearTimeout(refresh) }
  }, [])

  const video = useMemo(() => media?.video ? {
    src: media.webVideo ?? media.video, poster: media.poster ?? media.image!,
    description: media.description, generated: true, durationSeconds: media.duration,
  } : undefined, [media])

  return <>
    <header className="brand-header container"><a className="wordmark" href="/" aria-label={`${store.name}, volver a la tienda`}>{store.name}<span className="brand-dot">.</span></a><span className="brand-header-label">GOMITAS ENCHILADAS / VIDEO</span><a className="brand-return" href="/">Ver la tienda <Icon name="arrow-up" size={17} /></a></header>
    <main className="gummies-preview container">
      <div className="gummies-preview-heading"><span className="eyebrow">CHAMOY. TAJÍN. JUGO DE LIMÓN.</span><h1>Un toque de chamoy.<br /><span>Todo el antojo.</span></h1><p>Ingredientes y preparación de las gomitas enchiladas de Onky’s.</p></div>
      {media && <div className="gummies-preview-player"><HeroMedia image={media.poster ?? media.image!} alt={media.description} video={video} /></div>}
      {!media && !error && <p className="gummies-preview-status" role="status">Cargando video…</p>}
      {error && <p className="gummies-preview-status" role="status">No se pudo cargar el video. Recarga la página para volver a intentarlo.</p>}
      {media && !media.video && <p className="gummies-preview-status" role="status">{['failed', 'nsfw', 'moderated', 'canceled', 'cancelled'].includes(media.videoStatus) ? 'La solicitud terminó sin video.' : ['queued', 'in_progress'].includes(media.videoStatus) ? 'El video sigue en proceso.' : 'El video está pendiente.'}</p>}
      <div className="gummies-preview-footer"><p>Gomitas enchiladas · Onky’s</p><div><a className="button button-primary" href="/">Ver en la portada <Icon name="arrow" size={18} /></a>{media?.video && <a className="button button-outline" href={media.webVideo ?? media.video} target="_blank" rel="noopener noreferrer">Abrir video <Icon name="arrow-up" size={17} /></a>}</div>{media?.video && <small>{media.duration} segundos · Sin audio</small>}</div>
      {media?.frames && <section className="gummies-reference-frames" aria-labelledby="reference-frames-title"><h2 id="reference-frames-title">Proceso</h2><div>{media.frames.filter(frame => frame.image).map(frame => <figure key={frame.name}><img src={frame.image!} alt={`${frame.name === 'start' ? 'Ingredientes' : frame.name === 'middle' ? 'Tajín añadido' : 'Mezcla terminada'}`} loading="lazy" /><figcaption>{frame.name === 'start' ? '01 · Ingredientes' : frame.name === 'middle' ? '02 · Tajín' : '03 · Mezcla'}</figcaption></figure>)}</div></section>}
    </main>
  </>
}
