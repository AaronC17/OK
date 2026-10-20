import { memo, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Icon } from './Icon.tsx'
import { ProductImage } from './ui.tsx'
import { GummyBowl } from './GummyBowl.tsx'
import { MIX_CYCLE } from '../lib/mix-physics.ts'
import mixVideo from '../config/mix-video.json'
import type { MixSceneMotion } from './mix-motion.ts'
import './mix-experience.css'

const MIX_INGREDIENTS = [
  { id: 'chamoy', name: 'Chamoy', image: '/images/mix/bottle-chamoy.webp', alt: 'Chamoy' },
  { id: 'tajin', name: 'Tajín', image: '/images/mix/bottle-tajin.webp', alt: 'Tajín' },
  { id: 'limon', name: 'Limón', image: '/images/mix/bottle-limon.webp', alt: 'Limón' },
  { id: 'ositos', name: 'Ositos', image: '/images/bolsa-mix.webp', alt: 'Ositos' },
] as const

/** Decorative, repeatable process illustration. Never connected to order status. */
export const MixExperience = memo(function MixExperience({ onCustomize, suspended = false }: { onCustomize: () => void; suspended?: boolean }) {
  const root = useRef<HTMLElement>(null)
  const film = useRef<HTMLDivElement>(null)
  const scene = useRef<MixSceneMotion | null>(null)
  const video = useRef<HTMLVideoElement>(null)
  const shouldRun = useRef(false)
  const [useVideo, setUseVideo] = useState(() => window.matchMedia('(max-width: 700px), (pointer: coarse)').matches)
  const [playbackBlocked, setPlaybackBlocked] = useState(false)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [motionRequested, setMotionRequested] = useState(!reduced)
  const [visible, setVisible] = useState(false)
  const [tabVisible, setTabVisible] = useState(!document.hidden)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const preference = () => { setReduced(media.matches); if (!media.matches) setMotionRequested(true) }
    media.addEventListener('change', preference)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15, rootMargin: '40px 0px' })
    const preload = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); preload.disconnect() }
    }, { rootMargin: '1200px 0px' })
    if (film.current) observer.observe(film.current)
    if (root.current) preload.observe(root.current)
    const visibility = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); preload.disconnect(); media.removeEventListener('change', preference); document.removeEventListener('visibilitychange', visibility) }
  }, [])

  useEffect(() => {
    if (!near || !motionRequested || reduced) return
    if (useVideo) {
      let disposed = false
      void import('./mix-video-motion.ts').then(({ animateMixVideo }) => {
        if (disposed || !video.current || !film.current) return
        const prepared = animateMixVideo(video.current, film.current, setPlaybackBlocked)
        scene.current = prepared
        prepared.setRunning(shouldRun.current)
      }).catch(() => { if (!disposed) setUseVideo(false) })
      return () => { disposed = true; scene.current?.dispose(); scene.current = null }
    }
    const svg = film.current?.querySelector<SVGSVGElement>('.bowl-illustration')
    if (!svg) return
    let disposed = false
    const controller = new AbortController()
    void Promise.all([import('./mix-motion.ts'), import('./mix-simulation.ts').then(module => module.prepareMixSimulation())]).then(async ([motion, simulation]) => {
      if (disposed) return
      performance.mark('mix:effects-start')
      const prepared = await motion.animateGummyBowl(svg, simulation, film.current, controller.signal)
      if (disposed) { prepared.dispose(); return }
      scene.current = prepared
      performance.mark('mix:effects-ready')
      performance.measure('mix:effects', 'mix:effects-start', 'mix:effects-ready')
      prepared.setRunning(shouldRun.current)
    }).catch(error => { if (!controller.signal.aborted) console.error('Mix animation could not be prepared:', error) })
    return () => { disposed = true; controller.abort(); scene.current?.dispose(); scene.current = null }
  }, [near, motionRequested, useVideo, reduced])

  useEffect(() => {
    shouldRun.current = visible && tabVisible && !reduced && !suspended
    scene.current?.setRunning(shouldRun.current)
  }, [visible, tabVisible, reduced, suspended])

  return <section ref={root} className="experience-section container" aria-labelledby="experience-title">
    <div className="experience-copy">
      <span className="eyebrow">RECETA ARTESANAL</span>
      <h2 id="experience-title">Ositos enchilados.</h2>
      <p>Chamoy, Tajín y limón fresco sobre gomitas de osito, en 100, 250 o 500 g.</p>
      <div className="experience-points">
        <span><span>01</span> Chamoy, Tajín y limón fresco.</span>
        <span><span>02</span> Mezcla suave y cobertura pareja.</span>
        <span><span>03</span> Empacado listo para disfrutar.</span>
      </div>
      <button className="button experience-cta" onClick={onCustomize}>Crear mi combinación <Icon name="arrow" size={19} /></button>
    </div>
    <div ref={film} className="mix-film" style={{ '--cycle': `${MIX_CYCLE}ms` } as CSSProperties} data-static={reduced} data-scene-ready="false" data-renderer={useVideo ? 'video' : undefined}>
      <div className="film-top"><div><span>Preparación<small>Vista previa</small></span></div><span className="film-loop-label">EN BUCLE</span></div>
      <p className="sr-only">Animación ilustrativa: se vierte chamoy, se espolvorea Tajín y se añade jugo de limón de una jarrita. Los ositos caen, se comprimen y se doblan suavemente al contacto. La cuchara barre los lados y pliega la mezcla hacia dentro; el chamoy espeso se adhiere y escurre lentamente. Al final aparece la bolsa terminada. No representa la preparación de un pedido real.</p>
      <div className="film-scene">
        <div className="film-ingredients" aria-hidden="true">{MIX_INGREDIENTS.map((item, index) => <div className={`film-ingredient ingredient-${index}`} key={item.id}>
          <div className="ingredient-photo"><ProductImage src={item.image} alt={item.alt} loading="lazy" /><span className="ingredient-tick"><Icon name="check" size={13} /></span></div>
          <span>{item.name}</span>
        </div>)}</div>
        <div className="mix-stage">
          {useVideo ? <>
            <video ref={video} className="mix-video" src={near && motionRequested ? mixVideo.url : undefined} poster={mixVideo.poster}
              width={mixVideo.width} height={mixVideo.height} muted playsInline loop preload={near && motionRequested ? 'auto' : 'none'} aria-hidden="true"
              onError={() => { setPlaybackBlocked(false); setUseVideo(false) }} />
            {playbackBlocked && !reduced && <button type="button" className="mix-play-button" onClick={() => {
              void video.current?.play().catch(() => setPlaybackBlocked(true))
            }}><Icon name="play" size={16} />Reproducir animación</button>}
          </> : <>
            <div className="mix-bowl-scene" aria-hidden="true">
              <GummyBowl loadImages={near && motionRequested} />
            </div>
            <div className="finished-mix" aria-hidden="true">
              <span className="finish-sparkle sparkle-one">✦</span><span className="finish-sparkle sparkle-two">✦</span><span className="finish-sparkle sparkle-three">✧</span>
              <div className="finished-package">
                <ProductImage
                  src="/images/ositos-bolsa.webp"
                  alt="Bolsa de ositos enchilados Onky's"
                  className="finished-package-img"
                  loading="lazy"
                />
              </div>
              <span className="finished-tick"><Icon name="check" size={19} /></span>
            </div>
          </>}
          <div className="film-captions" aria-hidden="true"><span className="caption-season">Chamoy, Tajín y limón.</span><span className="caption-select">Ahora, tus ositos favoritos.</span><span className="caption-mix">Todo se mezcla. Todo se antoja.</span><span className="caption-ready">Lista para el carrito.</span></div>
        </div>
        <div className="film-timeline" aria-hidden="true"><span className="film-step film-step-1"><i />Sazonar</span><span className="film-step film-step-2"><i />Mezclar</span><span className="film-step film-step-3"><i />Disfrutar</span></div>
      </div>
    </div>
  </section>
})
