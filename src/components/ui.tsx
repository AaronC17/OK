import { useEffect, useId, useRef } from 'react'
import type { ImgHTMLAttributes, ReactNode } from 'react'
import { Icon } from './Icon.tsx'
import { MAX_QUANTITY } from '../lib/shop.ts'
import { productImages } from '../lib/product-images.ts'

export function ProductImage({ decoding = 'async', loading = 'lazy', src, srcSet, sizes, width, height, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const image = src ? productImages[src] : undefined
  return <img decoding={decoding} loading={loading} src={src} srcSet={srcSet ?? image?.srcSet}
    sizes={sizes ?? (image ? '100vw' : undefined)} width={width ?? image?.width} height={height ?? image?.height} {...props} onError={event => {
    const image = event.currentTarget
    // A failed srcset candidate must not override the fallback src.
    image.removeAttribute('srcset')
    image.removeAttribute('sizes')
    if (!image.src.endsWith('/images/placeholder.svg')) image.src = '/images/placeholder.svg'
  }} />
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
      previousFocus?.focus({ preventScroll: true })
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
    onPointerDown={event => { backdropStart.current = event.target === event.currentTarget }}
    onClick={event => { if (backdropStart.current && event.target === event.currentTarget) onClose() }}>
    {children}
  </dialog>
}

export function Quantity({ value, onChange, label, max = MAX_QUANTITY }: {
  value: number; onChange: (value: number) => void; label: string; max?: number
}) {
  const id = useId()
  return <div className="quantity" role="group" aria-label={label}>
    <button type="button" aria-label={`Reducir ${label.toLowerCase()}`} disabled={value <= 1} onClick={() => onChange(value - 1)}><Icon name="minus" size={16} /></button>
    <label className="sr-only" htmlFor={id}>{label}</label>
    <input id={id} type="number" inputMode="numeric" min={1} max={max} value={value} onChange={event => {
      const next = Number(event.target.value)
      if (Number.isInteger(next) && next >= 1 && next <= max) onChange(next)
    }} onFocus={event => event.currentTarget.select()} />
    <button type="button" aria-label={`Aumentar ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}><Icon name="plus" size={16} /></button>
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
