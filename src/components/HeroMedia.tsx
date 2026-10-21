import { useEffect, useRef, useState } from 'react'
import type { StoreConfig } from '../types.ts'
import { Icon } from './Icon.tsx'
import { ProductImage } from './ui.tsx'
import { HERO_IMAGE_SIZES } from '../lib/product-images.ts'
import './hero-media.css'

function prefersStill() {
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || !!connection?.saveData
}

/** Serves an already generated local MP4. Never calls a generation API. */
export function HeroMedia({ image, alt, video, suspended = false }: { image: string; alt: string; video?: StoreConfig['heroVideo']; suspended?: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  const player = useRef<HTMLVideoElement>(null)
  const [enabled, setEnabled] = useState(() => !prefersStill())
  const [intent, setIntent] = useState(() => !prefersStill())
  const [visible, setVisible] = useState(false)
  const [tabVisible, setTabVisible] = useState(!document.hidden)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!video) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const changed = () => { const allow = !prefersStill(); setEnabled(allow); setIntent(allow); setReady(false) }
    preference.addEventListener('change', changed)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .15 })
    if (root.current) observer.observe(root.current)
    const visibility = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', visibility)
    return () => { preference.removeEventListener('change', changed); observer.disconnect(); document.removeEventListener('visibilitychange', visibility) }
  }, [video])

  useEffect(() => {
    const element = player.current
    if (!element) return
    if (enabled && intent && visible && tabVisible && ready && !failed && !suspended) {
      void element.play().catch(() => { setPlaying(false); setIntent(false) })
    } else element.pause()
  }, [enabled, intent, visible, tabVisible, ready, failed, suspended])

  const toggle = () => {
    if (playing) { setIntent(false); player.current?.pause(); return }
    setEnabled(true)
    setIntent(true)
    if (player.current && ready) void player.current.play().catch(() => setIntent(false))
  }

  if (!video) return <ProductImage src={image} alt={alt} loading="eager" fetchPriority="high" sizes={HERO_IMAGE_SIZES} width={700} height={800} className="hero-photo" />

  return <div ref={root} className={`hero-media ${playing ? 'is-playing' : ''} ${ready && !failed ? 'is-ready' : ''}`}>
    <div className="hero-media-visual">
      <ProductImage src={video.poster} alt={video.description} loading="eager" fetchPriority="high" width={1200} height={900} className="hero-media-poster" />
      {enabled && !failed && <video ref={player} className="hero-media-video" src={video.src} poster={video.poster} muted playsInline loop preload="metadata" aria-hidden="true"
        onCanPlay={() => setReady(true)} onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onError={() => { setFailed(true); setPlaying(false); setIntent(false) }} />}
    </div>
    <div className="hero-media-bottom">
      {!failed && <button className="hero-media-control" onClick={toggle} aria-label={playing ? 'Pausar video de gomitas' : 'Reproducir video de gomitas'}><Icon name={playing ? 'pause' : 'play'} size={15} /><span>{playing ? 'Pausar' : 'Reproducir'}</span></button>}
    </div>
    {failed && <span className="sr-only" role="status">No se pudo cargar el video. Se muestra la foto del producto.</span>}
  </div>
}
