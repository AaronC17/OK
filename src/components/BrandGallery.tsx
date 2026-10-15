import { useEffect, useState } from 'react'
import { store } from '../config/store.ts'
import { Icon } from './Icon.tsx'
import { Modal, ProductImage } from './ui.tsx'
import './brand-gallery.css'

interface Concept {
  id: string
  title: string
  description: string
  alt: string
  motion: string
  prompt: string
  status: string
  image: string | null
}

interface Manifest {
  round: string
  model: string
  estimatedTotalUsd: string
  concepts: Concept[]
}

const manifestPath = '/brand-concepts/onkys-o-round-01/manifest.json'

/** Preview only. This page cannot submit API requests or spend credits. */
export default function BrandGallery() {
  const [manifest, setManifest] = useState<Manifest | null>(null)
  const [message, setMessage] = useState('Cargando los bocetos…')
  const [revision, setRevision] = useState(0)
  const [preview, setPreview] = useState<{ concept: Concept; mode: 'image' | 'hero' } | null>(null)

  useEffect(() => {
    document.title = `${store.name} — La O de Onky’s · Bocetos`
    const controller = new AbortController()
    let refresh: number | undefined

    const load = async () => {
      try {
        const response = await fetch(`${manifestPath}?t=${Date.now()}`, { cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('Manifest not available')
        const result: unknown = await response.json()
        if (!result || typeof result !== 'object' || !('concepts' in result) || !Array.isArray(result.concepts)) throw new Error('Invalid manifest')
        const next = result as Manifest
        setManifest(next)
        setMessage('')
        if (next.concepts.some(concept => ['pending', 'queued', 'in_progress'].includes(concept.status))) refresh = window.setTimeout(load, 4000)
      } catch {
        if (controller.signal.aborted) return
        setMessage('Los bocetos todavía no están disponibles. Puedes actualizar esta vista en unos momentos.')
      }
    }

    void load()
    return () => { controller.abort(); window.clearTimeout(refresh) }
  }, [revision])

  const readyCount = manifest?.concepts.filter(concept => concept.status === 'ready').length ?? 0

  return <>
    <header className="brand-header container">
      <a className="wordmark" href="/" aria-label={`${store.name}, volver a la tienda`}>{store.name}<span className="brand-dot">.</span></a>
      <span className="brand-header-label">ARCHIVO / DIRECCIÓN DESCARTADA</span>
      <a className="brand-return" href="/">Volver a la tienda <Icon name="arrow-up" size={17} /></a>
    </header>
    <main className="brand-gallery container">
      <div className="brand-intro">
        <div><span className="eyebrow">PEQUEÑOS MOMENTOS. UNA FIRMA PROPIA.</span><h1>La O de <span>Onky’s.</span></h1>
          <p>Esta dirección se descartó: parecía una tienda de regalos y no representa las gomitas enchiladas ni los postres de Onky’s.</p>
        </div>
        <div className="brand-round-info"><span className="brand-round-pill"><Icon name="layers" size={17} />{readyCount} de 6 bocetos disponibles</span><p>Ronda inicial · USD {manifest?.estimatedTotalUsd ?? '0.210'} cotizados<br />Todavía sin nuevas generaciones de video.</p></div>
      </div>
      <div className="brand-guidance"><Icon name="info" size={19} /><p>Se conservan estos archivos como registro de la ronda anterior. No se van a animar. <a href="/?vista=bocetos">Ver la dirección corregida, enfocada en productos.</a></p></div>
      {message && <div className="brand-load-message" role="status"><p>{message}</p><button className="button button-outline" onClick={() => setRevision(current => current + 1)}>Actualizar bocetos</button></div>}
      {manifest && <div className="brand-grid">{manifest.concepts.map(concept => <article className="brand-concept" key={concept.id}>
        <div className="brand-concept-image">
          {concept.image ? <button onClick={() => setPreview({ concept, mode: 'image' })} aria-label={`Ampliar boceto ${concept.id}: ${concept.title}`}><ProductImage src={concept.image} alt={concept.alt} width={1024} height={768} loading="lazy" /></button>
            : <div className="brand-image-pending"><Icon name="package" size={35} /><span>{['failed', 'nsfw', 'canceled', 'cancelled', 'moderated'].includes(concept.status) ? 'Esta solicitud terminó sin imagen.' : 'Esperando el resultado…'}</span></div>}
          <span className="brand-concept-number">{concept.id}</span>
          {concept.image && <button className="brand-image-zoom" onClick={() => setPreview({ concept, mode: 'image' })} aria-label={`Ver imagen completa de ${concept.title}`}><Icon name="zoom" size={18} /></button>}
        </div>
        <div className="brand-concept-heading"><h2>{concept.title}</h2><span>CONCEPTO {concept.id}</span></div>
        <p className="brand-concept-description">{concept.description}</p>
        <div className="brand-motion-note"><Icon name="play" size={16} /><p><strong>Si lo animamos</strong>{concept.motion}</p></div>
        <button className="button button-outline brand-preview-button" disabled={!concept.image} onClick={() => setPreview({ concept, mode: 'hero' })}>Ver en portada <Icon name="arrow" size={17} /></button>
        <details className="brand-prompt"><summary>Ver el prompt de este boceto <Icon name="chevron" size={16} /></summary><p>{concept.prompt}</p></details>
      </article>)}</div>}
      <footer className="brand-gallery-footer"><div><span className="eyebrow">RONDA ARCHIVADA</span><h2>Los productos son la nueva dirección.</h2><p>Gomitas con chamoy, Tajín y limón; postres como tres leches y pie de limón. No más propuestas de regalos.</p></div><a className="button button-primary" href="/?vista=bocetos">Ver dirección corregida <Icon name="arrow" size={18} /></a></footer>
    </main>
    <Modal open={!!preview} onClose={() => setPreview(null)} titleId="brand-preview-title" className={`brand-preview-dialog ${preview?.mode === 'hero' ? 'brand-hero-dialog' : ''}`}>
      {preview && <div className="brand-preview-inner">
        <div className="brand-preview-top"><h2 id="brand-preview-title">{preview.mode === 'hero' ? 'Vista previa de portada' : 'Imagen completa'} · {preview.concept.id}</h2><button className="icon-button" aria-label="Cerrar vista previa" onClick={() => setPreview(null)}><Icon name="close" /></button></div>
        {preview.mode === 'hero' ? <>
          <div className="brand-mock-header"><span className="wordmark">{store.name}<span className="brand-dot">.</span></span><span>Pequeños momentos. A tu manera.</span></div>
          <div className="brand-mock-hero"><div><span className="eyebrow">PEQUEÑOS MOMENTOS. A TU MANERA.</span><h3>Un momento.<br /><span>A tu gusto.</span></h3><p>Una pausa para ti. Un detalle para alguien.<br />Lo especial está en hacerlo muy tuyo.</p><a href="/#catalogo" className="button button-primary">Encuentra tu pequeño gusto <Icon name="arrow" size={18} /></a></div><ProductImage src={preview.concept.image!} alt={preview.concept.alt} /></div>
        </> : <ProductImage className="brand-full-image" src={preview.concept.image!} alt={preview.concept.alt} />}
        <p className="brand-preview-caption">{preview.concept.title} · Boceto de marca, no portada definitiva</p>
      </div>}
    </Modal>
  </>
}
