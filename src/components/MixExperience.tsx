import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { store } from '../config/store.ts'
import { Icon } from './Icon.tsx'
import { ProductImage } from './ui.tsx'
import { GummyBowl } from './GummyBowl.tsx'
import { PackagedGummies } from './GummyBear.tsx'
import { animateGummyBowl, MIX_CYCLE, type MixSceneMotion } from './mix-motion.ts'
import './mix-experience.css'

const MIX_INGREDIENTS = [
  { id: 'chamoy', name: 'Chamoy', image: '/images/mix/bottle-chamoy.webp', alt: 'Chamoy' },
  { id: 'tajin', name: 'Tajín', image: '/images/mix/bottle-tajin.webp', alt: 'Tajín' },
  { id: 'limon', name: 'Limón', image: '/images/mix/bottle-limon.webp', alt: 'Limón' },
  { id: 'ositos', name: 'Ositos', image: '/images/bolsa-mix.webp', alt: 'Ositos' },
] as const

/** Decorative, repeatable process illustration. Never connected to order status. */
export function MixExperience({ onCustomize }: { onCustomize: () => void }) {
  const root = useRef<HTMLElement>(null)
  const film = useRef<HTMLDivElement>(null)
  const scene = useRef<MixSceneMotion | null>(null)
  const elapsed = useRef(0)
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [visible, setVisible] = useState(false)
  const [tabVisible, setTabVisible] = useState(!document.hidden)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const preference = () => { setReduced(media.matches); setPlaying(!media.matches) }
    media.addEventListener('change', preference)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .1 })
    if (root.current) observer.observe(root.current)
    const visibility = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', visibility)
    return () => { observer.disconnect(); media.removeEventListener('change', preference); document.removeEventListener('visibilitychange', visibility) }
  }, [])

  useEffect(() => {
    const svg = film.current?.querySelector<SVGSVGElement>('.bowl-illustration')
    if (!svg) return
    scene.current = animateGummyBowl(svg)
    return () => scene.current?.dispose()
  }, [])

  useEffect(() => {
    const animations = film.current?.getAnimations({ subtree: true }) ?? []
    // CSS scene changes and individual SVG motion share one pausable playhead.
    animations.forEach(animation => {
      animation.currentTime = elapsed.current
      if (playing && visible && tabVisible) animation.play()
      else animation.pause()
    })
    scene.current?.setRunning(playing && visible && tabVisible)
    return () => {
      elapsed.current = Number(scene.current?.animations[0]?.currentTime ?? elapsed.current)
      animations.forEach(animation => { if (animation.playState !== 'idle') animation.pause() })
      scene.current?.setRunning(false)
    }
  }, [playing, visible, tabVisible, reduced])

  return <section ref={root} className="experience-section container" aria-labelledby="experience-title">
    <div className="experience-copy">
      <span className="eyebrow">RECETA ARTESANAL</span>
      <h2 id="experience-title">Ositos enchilados.</h2>
      <p>Chamoy, Tajín y limón fresco sobre gomitas de osito, en 100, 200 o 500 g.</p>
      <div className="experience-points">
        <span><span>01</span> Chamoy, Tajín y limón fresco.</span>
        <span><span>02</span> Mezcla suave y cobertura pareja.</span>
        <span><span>03</span> Empacado listo para disfrutar.</span>
      </div>
      <button className="button experience-cta" onClick={onCustomize}>Crear mi combinación <Icon name="arrow" size={19} /></button>
    </div>
    <div ref={film} className="mix-film" style={{ '--cycle': `${MIX_CYCLE}ms` } as CSSProperties} data-paused={!playing || !visible || !tabVisible} data-static={reduced && !playing}>
      <div className="film-top"><div><span>Preparación<small>Vista previa</small></span></div><span className="film-loop-label">EN BUCLE</span></div>
      <p className="sr-only">Animación ilustrativa: se vierte chamoy, se espolvorea Tajín y se añade jugo de limón de una jarrita. Los ositos caen, se comprimen y se doblan suavemente al contacto. La cuchara barre los lados y pliega la mezcla hacia dentro; el chamoy espeso se adhiere y escurre lentamente. Al final aparece la bolsa terminada. No representa la preparación de un pedido real.</p>
      <div className="film-scene" aria-hidden="true">
        <div className="film-ingredients">{MIX_INGREDIENTS.map((item, index) => <div className={`film-ingredient ingredient-${index}`} key={item.id}>
          <div className="ingredient-photo"><ProductImage src={item.image} alt={item.alt} loading="lazy" /><span className="ingredient-tick"><Icon name="check" size={13} /></span></div>
          <span>{item.name}</span>
        </div>)}</div>
        <div className="mix-stage">
          <div className="mix-bowl-scene">
            <GummyBowl />
          </div>
          <div className="finished-mix">
            <span className="finish-sparkle sparkle-one">✦</span><span className="finish-sparkle sparkle-two">✦</span><span className="finish-sparkle sparkle-three">✧</span>
            <div className="mix-pouch"><div className="pouch-seal" /><span className="pouch-brand">{store.name}.</span><span className="pouch-tagline">UN GUSTO MUY TUYO</span><div className="pouch-window"><PackagedGummies /></div><span className="pouch-bottom">TU COMBINACIÓN FAVORITA</span></div>
            <span className="finished-tick"><Icon name="check" size={19} /></span>
          </div>
          <div className="film-captions"><span className="caption-season">Chamoy, Tajín y limón.</span><span className="caption-select">Ahora, tus ositos favoritos.</span><span className="caption-mix">Todo se mezcla. Todo se antoja.</span><span className="caption-ready">Lista para el carrito.</span></div>
        </div>
        <div className="film-timeline"><span className="film-step film-step-1"><i />Sazonar</span><span className="film-step film-step-2"><i />Mezclar</span><span className="film-step film-step-3"><i />Disfrutar</span></div>
      </div>
      <div className="film-bottom"><button onClick={() => setPlaying(current => !current)} aria-label={playing ? 'Pausar animación' : 'Reproducir animación'}><Icon name={playing ? 'pause' : 'play'} size={15} /><span>{playing ? 'Pausar' : 'Reproducir'}</span></button></div>
    </div>
  </section>
}
