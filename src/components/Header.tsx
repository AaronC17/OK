import { useEffect, useState } from 'react'
import { store } from '../config/store.ts'
import { Icon } from './Icon.tsx'

export function Header({ count, onCart }: { count: number; onCart: () => void }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return <>
    <div className="announcement"><span>Pedidos aquí · Pago con SINPE Móvil <Icon name="bank" size={12} /></span></div>
    <header className={`site-header ${scrolled ? 'is-scrolled' : ''}`}>
      <div className="container header-inner">
        <a href="#inicio" className="wordmark" aria-label={`${store.name}, inicio`}>{store.name}<span className="brand-dot">.</span></a>
        <button className="cart-toggle" onClick={onCart} aria-label={`Abrir carrito, ${count} artículos`}><Icon name="bag" size={20} /><span className="cart-label">Carrito</span><span className="cart-count" key={count}>{count}</span></button>
      </div>
    </header>
  </>
}
