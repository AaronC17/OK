import { useEffect, useRef, useState } from 'react'
import { store } from '../config/store.ts'
import { Icon } from './Icon.tsx'
import { money } from '../lib/shop.ts'
import { SectionLink } from './SectionLink.tsx'

const freeShippingThreshold = money(store.deliveryMethods.find(method => method.id === 'delivery')!.freeAboveMinor!, store).replace(/\s/g, '.')

export function Header({ count, onCart, signedIn = false, onAccount }: { count: number; onCart: () => void; signedIn?: boolean; onAccount: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const sentinel = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // Reading scrollY after the SVG's writes forced style/layout on every scroll.
    // Intersection geometry is supplied by the browser without a synchronous read.
    const observer = new IntersectionObserver(([entry]) => setScrolled(entry.boundingClientRect.top < 0))
    if (sentinel.current) observer.observe(sentinel.current)
    return () => observer.disconnect()
  }, [])

  return <>
    <span ref={sentinel} aria-hidden="true" style={{ position: 'absolute', top: 24, left: 0, width: 1, height: 0, pointerEvents: 'none' }} />
    <div className="announcement shipping-announcement"><p>Envío GRATIS a todo Costa Rica en compras superiores a {freeShippingThreshold}</p></div>
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container header-inner">
        <SectionLink section="inicio" className="wordmark" aria-label={`${store.name}, inicio`}>{store.name}<span className="brand-dot">.</span></SectionLink>
        <div className="header-actions">
          {/* Safari does not focus tapped buttons; the dialog needs a return-focus target. */}
          <button className={`account-toggle ${signedIn ? 'is-signed-in' : ''}`} onClick={event => { event.currentTarget.focus({ preventScroll: true }); onAccount() }} aria-label={signedIn ? 'Abrir mi cuenta' : 'Iniciar sesión'}><Icon name="user" size={19} /><span>{signedIn ? 'Mi cuenta' : 'Iniciar sesión'}</span>{signedIn && <i aria-hidden="true" />}</button>
          <span className="header-actions-divider" aria-hidden="true" />
          <button className="cart-toggle" onClick={onCart} aria-label={`Abrir carrito, ${count} artículos`}><Icon name="bag" size={20} /><span className="cart-label">Carrito</span><span className="cart-count" key={count}>{count}</span></button>
        </div>
      </div>
    </header>
  </>
}
