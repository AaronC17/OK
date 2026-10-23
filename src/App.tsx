import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { store } from './config/store.ts'
import { MAX_QUANTITY, selectionKey } from './lib/shop.ts'
import { accountDialog, cartDrawer, productDialog } from './lib/dialog-loaders.ts'
import type { CartItem } from './types.ts'
import { useCart } from './hooks/useCart.ts'
import { useCustomer } from './hooks/useCustomer.ts'
import { Icon } from './components/Icon.tsx'
import { Lightbox, Modal } from './components/ui.tsx'
import type { ProductTarget } from './components/ProductDialog.tsx'
import { Header } from './components/Header.tsx'
import { Catalog } from './components/Catalog.tsx'
import { MixExperience } from './components/MixExperience.tsx'
import { HeroMedia } from './components/HeroMedia.tsx'
import { BrandMarquee } from './components/BrandMarquee.tsx'
import { navigateToSection, SectionLink, useSectionNavigation } from './components/SectionLink.tsx'
import type { AccountMode } from './components/AccountDialog.tsx'
import './account-shell.css'

const ProductDialog = lazy(productDialog.load)
const CartDrawer = lazy(cartDrawer.load)
const AccountDialog = lazy(accountDialog.load)
const weightList = new Intl.ListFormat('es').format(store.gummies.weights.map(weight => `${weight} g`))

export default function App() {
  useSectionNavigation()
  const cart = useCart()
  const customer = useCustomer()
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountRequested, setAccountRequested] = useState(false)
  const [accountMode, setAccountMode] = useState<AccountMode>('login')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [cartOpen, setCartOpen] = useState(false)
  const [cartRequested, setCartRequested] = useState(false)
  const [product, setProduct] = useState<{ target: ProductTarget; instance: number } | null>(null)
  const [productOpen, setProductOpen] = useState(false)
  const [zoom, setZoom] = useState<{ src: string; alt: string; name: string } | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)
  const overlayOpen = cartOpen || productOpen || !!zoom || infoOpen || accountOpen

  useEffect(() => { document.title = store.name }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) {
      const cleanRef = ref.trim().toUpperCase()
      try {
        sessionStorage.setItem('onky_referral_code', cleanRef)
        localStorage.setItem('onky_referral_code', cleanRef)
      } catch {}
    }
  }, [])

  const openCart = useCallback(() => { setSelectedOrderId(null); setCartRequested(true); setCartOpen(true) }, [])
  const openAccount = useCallback((mode: AccountMode = 'login') => { setAccountMode(mode); setAccountRequested(true); setCartOpen(false); setAccountOpen(true) }, [])

  useEffect(() => {
    if (customer.loading) return
    if (!customer.user) {
      const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
      if (params?.has('ref')) {
        openAccount('register')
      }
    }
  }, [customer.loading, customer.user, openAccount])
  const viewAccountOrder = (id: string) => { setSelectedOrderId(id); setAccountOpen(false); setCartRequested(true); setCartOpen(true) }
  const shopFromAccount = () => {
    setAccountOpen(false)
    // Restore the dialog's focus/scroll lock before moving into the catalog.
    requestAnimationFrame(() => navigateToSection('catalogo'))
  }
  const openProduct = useCallback((target: ProductTarget) => {
    setProduct({ target, instance: Date.now() })
    setProductOpen(true)
  }, [])
  const customizeMix = useCallback(() => openProduct({ kind: 'gummy', typeId: store.gummies.types[0]?.id ?? '', mixed: true }), [openProduct])

  const addProduct = (item: CartItem) => {
    const previous = cart.items.find(entry => selectionKey(entry.selection) === selectionKey(item.selection))?.quantity ?? 0
    const added = Math.min(MAX_QUANTITY - previous, item.quantity)
    cart.add(item)
    setProductOpen(false)
    setToast({
      text: added > 0 ? added < item.quantity ? `Añadimos ${added}. Límite de ${MAX_QUANTITY} por variante.` : 'Un gusto más en tu carrito.' : `Ya tienes el máximo de ${MAX_QUANTITY} de esta variante.`,
      id: Date.now(),
    })
  }

  return <>
    <SectionLink section="catalogo" className="skip-link">Saltar al catálogo</SectionLink>
    <Header count={cart.count} onCart={openCart} signedIn={!!customer.user} onAccount={() => openAccount()} />
    <main>
      <section id="inicio" className="hero container" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-line" />GOMITAS ENCHILADAS</span>
          <h1 id="hero-title">Tu mezcla.<br /><span>Tus reglas.</span></h1>
          <p>Elige tus favoritas y encuentra tu combinación ideal.</p>
          <SectionLink section="catalogo" className="button hero-catalog-cta">Ver productos <Icon name="arrow" size={19} /></SectionLink>
        </div>
        <div className={`hero-visual ${store.heroVideo ? 'has-video' : ''}`}>
          <HeroMedia image={store.heroImage} alt={store.heroImageAlt} video={store.heroVideo} suspended={overlayOpen} />
          <div className="hero-photo-label"><Icon name="pepper" size={17} /> Dulce. Ácido. Picosito.</div>
        </div>
      </section>
      <BrandMarquee signedIn={!!customer.user} loading={customer.loading} onRegister={() => openAccount('register')} suspended={overlayOpen} />
      <Catalog onProduct={openProduct} onZoom={setZoom} />
      <MixExperience onCustomize={customizeMix} suspended={overlayOpen} />
      <section id="como-pedir" className="how-section" aria-labelledby="how-title"><div className="container">
        <div className="how-heading"><div><span className="eyebrow">CÓMO PEDIR</span><h2 id="how-title">Cómo pedir</h2></div><p>Fácil, rápido y directo a tu puerta.</p></div>
        <div className="how-steps">
          <article><span className="how-number">01</span><Icon name="bear" size={26} /><h3>Elige</h3><p>Tus gomitas favoritas.</p></article>
          <article><span className="how-number">02</span><Icon name="sliders" size={26} /><h3>Personaliza</h3><p>Arma tu mix o elige tu tamaño ideal.</p></article>
          <article><span className="how-number">03</span><Icon name="bank" size={28} /><h3>Paga con SINPE</h3><p>Transfiere con tu código de pedido y sube el comprobante.</p></article>
        </div>
      </div></section>
      <section className="questions-section container" aria-labelledby="questions-title">
        <div><span className="eyebrow">PREGUNTAS FRECUENTES</span><h2 id="questions-title">Preguntas frecuentes</h2></div>
        <div className="questions-list">
          <details><summary>¿Cómo se confirma mi pedido?<Icon name="plus" size={19} /></summary><p>Haces tu pedido en la página, pagas por SINPE Móvil con el código asignado y subes tu comprobante. Revisamos el pago y de inmediato empezamos a preparar tu antojo.</p></details>
          <details><summary>¿Puedo combinar tipos de gomita?<Icon name="plus" size={19} /></summary><p>¡Claro! Puedes elegir un solo tipo o armar un mix con dos o tres opciones en presentaciones de {weightList}.</p></details>
          <details><summary>¿Cómo funciona la entrega?<Icon name="plus" size={19} /></summary><p>Enviamos a todo Costa Rica por Correos por ₡2.800 (¡gratis en compras de ₡15.000 o más!). También puedes retirar sin costo en Orotina Centro.{store.demo ? ' Los precios son de demostración; no envíes dinero real todavía.' : ''}</p></details>
        </div>
      </section>
    </main>
    <footer className="site-footer"><div className="container">
      <div className="footer-main">
        <div className="footer-brand">
          <SectionLink section="inicio" className="wordmark" aria-label={`${store.name}, volver al inicio`}>{store.name}<span className="brand-dot">.</span></SectionLink>
          <p className="footer-tagline">Dulce. Ácido. Picosito.</p>
          <p className="footer-about">Gomitas enchiladas, hechas en Orotina, Costa Rica.</p>
        </div>
        <div className="footer-col footer-info">
          <h3>Entregas</h3>
          <ul>
            <li><Icon name="truck" size={14} />Envíos a todo Costa Rica</li>
            <li><Icon name="pin" size={14} />Retiro en Orotina Centro</li>
            <li><Icon name="shield" size={14} />Pago con SINPE Móvil</li>
          </ul>
        </div>
        {(store.contact.whatsappUrl || store.contact.instagramUrl || store.contact.email) && <nav className="footer-col footer-socials" aria-label="Contacto y redes sociales">
          <h3>Contacto</h3>
          <div className="footer-social-list">
            {store.contact.whatsappUrl && <a className="footer-social-link is-whatsapp" href={store.contact.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp de Onky’s (abre en una pestaña nueva)" title="WhatsApp"><Icon name="whatsapp" size={22} /></a>}
            {store.contact.instagramUrl && <a className="footer-social-link is-instagram" href={store.contact.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram de Onky’s (abre en una pestaña nueva)" title="Instagram"><Icon name="instagram" size={22} /></a>}
            {store.contact.email && <a className="footer-social-link" href={`mailto:${store.contact.email}`} aria-label="Escribir a Onky’s por correo" title="Correo"><Icon name="mail" size={22} /></a>}
          </div>
        </nav>}
      </div>
      {store.demo && <div className="footer-bottom"><button className="demo-link" onClick={() => setInfoOpen(true)}>Catálogo de demostración <Icon name="info" size={14} /></button></div>}
    </div></footer>
    <Suspense fallback={null}>
      {product && <ProductDialog key={product.instance} target={product.target} open={productOpen} onClose={() => setProductOpen(false)} onAdd={addProduct} onZoom={setZoom} />}
    </Suspense>
    <Suspense fallback={null}>
      {cartRequested && <CartDrawer key={`${customer.user?.id ?? 'guest'}:${selectedOrderId ?? 'cart'}`} open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} customerAccount={customer.user} selectedOrderId={selectedOrderId} onRegister={() => openAccount('register')} onOrderChanged={customer.orderChanged} />}
    </Suspense>
    <Suspense fallback={null}>
      {accountRequested && <AccountDialog open={accountOpen} initialMode={accountMode} customer={customer} onClose={() => setAccountOpen(false)} onOrder={viewAccountOrder} onShop={shopFromAccount} />}
    </Suspense>
    <Lightbox image={zoom} onClose={() => setZoom(null)} />
    <Modal open={infoOpen} onClose={() => setInfoOpen(false)} titleId="info-title" className="info-dialog">
      <div className="info-dialog-inner">
        <button className="icon-button modal-close" aria-label="Cerrar información" onClick={() => setInfoOpen(false)}><Icon name="close" /></button>
        <span className="eyebrow">CONOCE LOS DETALLES</span><h2 id="info-title">Información de la tienda</h2>
        <p>Explora, personaliza y prepara tu carrito. Este catálogo utiliza datos de demostración.</p>
        <ul><li>Productos, disponibilidad y precios de catálogo son de ejemplo y deben confirmarse.</li><li>Precios en colones costarricenses (CRC).</li><li>Correos a todo Costa Rica: ₡2.800; gratis en compras de ₡15.000 o más.</li><li>Puedes elegir un solo tipo de gomita o pedirlas mixtas; el peso es el total de la bolsa.</li><li>Los pedidos se registran en esta tienda y se pagan mediante SINPE Móvil, después de confirmar el destino y el total.</li></ul>
        <p>El comprobante y el código se revisan antes de confirmar el pago. En esta demostración no envíes dinero real.</p>
        <button className="button button-primary" onClick={() => setInfoOpen(false)}>Seguir explorando <Icon name="arrow" size={18} /></button>
      </div>
    </Modal>
    <div className="toast-region" aria-live="polite" aria-atomic="true">{toast && <div className="toast" key={toast.id}>
      <div className="toast-header">
        <span className="toast-check"><Icon name="check" size={16} /></span>
        <span className="toast-text">{toast.text}</span>
        <button className="toast-view-btn" onClick={() => { setToast(null); openCart() }}>Ver carrito <Icon name="arrow" size={15} /></button>
        <button className="toast-close" aria-label="Cerrar aviso" onClick={() => setToast(null)}><Icon name="close" size={16} /></button>
      </div>
    </div>}</div>
  </>
}
