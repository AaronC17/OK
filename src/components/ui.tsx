import { useEffect, useId, useRef, useState } from 'react'
import type { ImgHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import { MAX_QUANTITY } from '../lib/shop.ts'
import { productImages } from '../lib/product-images.ts'

export function ProductImage({ decoding = 'async', loading = 'lazy', defer = false, src, srcSet, sizes, width, height, ...props }: ImgHTMLAttributes<HTMLImageElement> & { defer?: boolean }) {
  const image = src ? productImages[src] : undefined
  const ref = useRef<HTMLImageElement>(null)
  const [near, setNear] = useState(false)
  const [failed, setFailed] = useState<{ src: string | undefined; format: 'avif' | 'all' } | null>(null)
  const enabled = !defer || loading === 'eager' || near
  const failure = failed?.src === src ? failed?.format : undefined
  const avif = !srcSet && image?.avifSrcSet && !failure
  const imageSizes = sizes ?? (image ? '100vw' : undefined)

  useEffect(() => {
    if (enabled) return
    // Native lazy loading can fetch images several screens ahead on mobile.
    // Reserve their geometry, but let visible products use the connection first.
    if (!('IntersectionObserver' in window)) { setNear(true); return }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); observer.disconnect() }
    }, { rootMargin: '200px 0px' })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [enabled])

  const photo = <img ref={ref} decoding={decoding} loading={loading}
    src={enabled ? failure === 'all' ? '/images/placeholder.svg' : src : undefined}
    srcSet={enabled && failure !== 'all' ? srcSet ?? image?.srcSet : undefined}
    sizes={failure === 'all' ? undefined : imageSizes} width={width ?? image?.width} height={height ?? image?.height} {...props} onError={event => {
    // Remove the failed <source> before falling back, otherwise <picture>
    // keeps selecting it even after the img's src has changed.
    if (!enabled || failure === 'all') return
    setFailed({ src, format: avif && /\.avif(?:$|\?)/.test(event.currentTarget.currentSrc) ? 'avif' : 'all' })
  }} />
  return image?.avifSrcSet && !srcSet ? <picture className="product-picture">
    {avif && <source type="image/avif" srcSet={enabled ? image.avifSrcSet : undefined} sizes={imageSizes} />}
    {photo}
  </picture> : photo
}

let scrollLocks = 0
let originalOverflow = ''

export function Modal({ open, onClose, titleId, className = '', children }: {
  open: boolean; onClose: () => void; titleId: string; className?: string; children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const backdropStart = useRef(false)
  useEffect(() => {
    const dialog = ref.current!
    if (!open) { dialog.close(); return }
    const previousFocus = document.activeElement as HTMLElement | null
    dialog.showModal()
    if (scrollLocks++ === 0) {
      originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    return () => {
      dialog.close()
      if (--scrollLocks === 0) document.body.style.overflow = originalOverflow
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])
  return <dialog ref={ref} className={`modal ${className}`} aria-labelledby={titleId}
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const elements = [...event.currentTarget.querySelectorAll<HTMLElement>('a[href], button, input, textarea, select, [tabindex]')]
        .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length > 0)
      const first = elements[0]
      const last = elements.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}
    onCancel={event => { event.preventDefault(); onClose() }}
    onPointerDown={event => {
      const rect = event.currentTarget.getBoundingClientRect()
      backdropStart.current = event.target === event.currentTarget && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
    }}
    onClick={event => { if (backdropStart.current && event.target === event.currentTarget) onClose() }}>
    {children}
  </dialog>
}

export function Quantity({ value, onChange, label, max = MAX_QUANTITY, disabled = false }: {
  value: number; onChange: (value: number) => void; label: string; max?: number; disabled?: boolean
}) {
  const id = useId()
  return <div className="quantity" role="group" aria-label={label}>
    <button type="button" aria-label={`Reducir ${label.toLowerCase()}`} disabled={disabled || value <= 1} onClick={() => onChange(value - 1)}><Icon name="minus" size={16} /></button>
    <label className="sr-only" htmlFor={id}>{label}</label>
    <input id={id} type="number" inputMode="numeric" min={1} max={max} value={value} disabled={disabled} onChange={event => {
      const next = Number(event.target.value)
      if (Number.isInteger(next) && next >= 1 && next <= max) onChange(next)
    }} onFocus={event => event.currentTarget.select()} />
    <button type="button" aria-label={`Aumentar ${label.toLowerCase()}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}><Icon name="plus" size={16} /></button>
  </div>
}

export function Lightbox({ image, onClose }: { image: { src: string; alt: string; name: string } | null; onClose: () => void }) {
  return <Modal open={!!image} onClose={onClose} titleId="lightbox-title" className="lightbox">
    <div className="lightbox-inner">
      <div className="lightbox-heading"><h2 id="lightbox-title">{image?.name}</h2><button className="icon-button" onClick={onClose} aria-label="Cerrar imagen ampliada"><Icon name="close" /></button></div>
      {image && <ProductImage src={image.src} alt={image.alt} className="lightbox-image" />}
      <p>Vista completa, sin recortes</p>
    </div>
  </Modal>
}

export function LoadingDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const titleId = useId()
  return <Modal open={open} onClose={onClose} titleId={titleId} className="loading-dialog">
    <h2 id={titleId}>Un momento…</h2>
    <p role="status">Cargando, por favor espera.</p>
    <button className="text-button" onClick={onClose}>Cerrar</button>
  </Modal>
}
