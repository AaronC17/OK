import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { store } from './config/store.ts'
import { MAX_QUANTITY, selectionKey } from './lib/shop.ts'
import type { CartItem } from './types.ts'
import { useCart } from './hooks/useCart.ts'
import { Icon } from './components/Icon.tsx'
import { Lightbox, Modal } from './components/ui.tsx'
import type { ProductTarget } from './components/ProductDialog.tsx'
import { Header } from './components/Header.tsx'
import { Catalog } from './components/Catalog.tsx'
import { MixExperience } from './components/MixExperience.tsx'
import { HeroMedia } from './components/HeroMedia.tsx'
import { BrandMarquee } from './components/BrandMarquee.tsx'
import { SectionLink } from './components/SectionLink.tsx'

const ProductDialog = lazy(() => import('./components/ProductDialog.tsx').then(module => ({ default: module.ProductDialog })))
const CartDrawer = lazy(() => import('./components/CartDrawer.tsx').then(module => ({ default: module.CartDrawer })))
const weightList = new Intl.ListFormat('es').format(store.gummies.weights.map(weight => `${weight} g`))

export default function App() {
  const cart = useCart()
  const [cartOpen, setCartOpen] = useState(false)
  const [cartRequested, setCartRequested] = useState(false)
  const [product, setProduct] = useState<{ target: ProductTarget; instance: number } | null>(null)
  const [productOpen, setProductOpen] = useState(false)
  const [zoom, setZoom] = useState<{ src: string; alt: string; name: string } | null>(null)
  const [infoOpen, setInfoOpen] = useState(false)
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null)

  useEffect(() => { document.title = store.name }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const openCart = useCallback(() => { setCartRequested(true); setCartOpen(true) }, [])
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
    <Header count={cart.count} onCart={openCart} />
    <main>
      <section id="inicio" className="hero container" aria-labelledby="hero-title">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-line" />GOMITAS ENCHILADAS</span>
          <h1 id="hero-title">Tu mezcla.<br /><span>Tus reglas.</span></h1>
          <p>Elige tus favoritas y encuentra tu combinación ideal.</p>
          <SectionLink section="catalogo" className="button hero-catalog-cta">Ver productos <Icon name="arrow" size={19} /></SectionLink>
        </div>
        <div className={`hero-visual ${store.heroVideo ? 'has-video' : ''}`}>
          <HeroMedia image={store.heroImage} alt={store.heroImageAlt} video={store.heroVideo} />
          <div className="hero-photo-label"><Icon name="pepper" size={17} /> Dulce. Ácido. Picosito.</div>
        </div>
      </section>
      <BrandMarquee />
      <Catalog onProduct={openProduct} onZoom={setZoom} />
      <MixExperience onCustomize={customizeMix} suspended={cartOpen || productOpen || !!zoom || infoOpen} />
      <section id="como-pedir" className="how-section" aria-labelledby="how-title"><div className="container">
        <div className="how-heading"><div><span className="eyebrow">CÓMO PEDIR</span><h2 id="how-title">Cómo pedir</h2></div><p>Tu pedido, tu código y tu comprobante. Todo aquí.</p></div>
        <div className="how-steps">
          <article><span className="how-number">01</span><Icon name="bear" size={26} /><h3>Elige</h3><p>Tu tipo de gomita favorito.</p></article>
          <article><span className="how-number">02</span><Icon name="sliders" size={26} /><h3>Personaliza</h3><p>Tipos, mezclas y presentaciones en un mismo carrito.</p></article>
          <article><span className="how-number">03</span><Icon name="bank" size={28} /><h3>Paga con SINPE</h3><p>Registra tu pedido, usa su código en el SINPE y adjunta el comprobante para revisión.</p></article>
        </div>
      </div></section>
      <section className="questions-section container" aria-labelledby="questions-title">
        <div><span className="eyebrow">PREGUNTAS FRECUENTES</span><h2 id="questions-title">Preguntas frecuentes</h2></div>
        <div className="questions-list">
          <details><summary>¿Cómo se confirma mi pedido?<Icon name="plus" size={19} /></summary><p>Registra el pedido desde el carrito. Cuando estén confirmados el total y el destino SINPE, recibirás instrucciones y un código para el detalle de tu transferencia. Adjunta el comprobante y la referencia bancaria. La tienda comprobará el abono antes de marcarlo como listo para preparar; subir una imagen no confirma el pago.</p></details>
          <details><summary>¿Puedo combinar tipos de gomita?<Icon name="plus" size={19} /></summary><p>{store.gummies.mixes.enabled ? store.gummies.mixes.note : 'Por ahora, un solo tipo por bolsa.'} Elige entre {weightList}. También puedes añadir varias bolsas distintas al mismo carrito.</p></details>
          <details><summary>¿Cómo funciona la entrega?<Icon name="plus" size={19} /></summary><p>Enviamos a todo Costa Rica por Correos de Costa Rica por ₡2.800. En compras de productos mayores a ₡15.000, el envío es gratis. El carrito calcula el costo automáticamente antes de pagar. También puedes elegir Recoger en Orotina Centro y consultar el estado del pedido desde este navegador.{store.demo ? ' Los precios de productos siguen siendo de demostración; no envíes dinero real todavía.' : ''}</p></details>
        </div>
      </section>
    </main>
    <footer className="site-footer"><div className="container">
      <div className="footer-main">
        <div><SectionLink section="inicio" className="wordmark" aria-label={`${store.name}, volver al inicio`}>{store.name}<span className="brand-dot">.</span></SectionLink></div>
        <div className="footer-links"><span className="eyebrow">EXPLORA</span><SectionLink section="gomitas">Gomitas enchiladas</SectionLink>{store.products && store.products.length > 0 && <SectionLink section="uvarindas">Uvarindas</SectionLink>}{store.categories.dessertsEnabled && <SectionLink section="postres">Postres</SectionLink>}<SectionLink section="como-pedir">Cómo pedir</SectionLink></div>
        <div className="footer-contact"><span className="eyebrow">TU PEDIDO, AQUÍ</span>
          <button className="text-button" onClick={openCart}>Pedido y seguimiento <Icon name="arrow-up" size={16} /></button>
          <p>Pago con SINPE Móvil · Revisión del abono</p>
          {store.contact.email && <a href={`mailto:${store.contact.email}`}>{store.contact.email}</a>}
          {store.contact.instagramUrl && <a href={store.contact.instagramUrl} target="_blank" rel="noopener noreferrer">Instagram <Icon name="arrow-up" size={14} /></a>}
        </div>
      </div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} {store.name}</span><a href="/admin">Administración</a>{store.demo && <button className="demo-link" onClick={() => setInfoOpen(true)}>Catálogo de demostración <Icon name="info" size={14} /></button>}</div>
    </div></footer>
    <Suspense fallback={null}>
      {product && <ProductDialog key={product.instance} target={product.target} open={productOpen} onClose={() => setProductOpen(false)} onAdd={addProduct} onZoom={setZoom} />}
    </Suspense>
    <Suspense fallback={null}>
      {cartRequested && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} />}
    </Suspense>
    <Lightbox image={zoom} onClose={() => setZoom(null)} />
    <Modal open={infoOpen} onClose={() => setInfoOpen(false)} titleId="info-title" className="info-dialog">
      <div className="info-dialog-inner">
        <button className="icon-button modal-close" aria-label="Cerrar información" onClick={() => setInfoOpen(false)}><Icon name="close" /></button>
        <span className="eyebrow">CONOCE LOS DETALLES</span><h2 id="info-title">Información de la tienda</h2>
        <p>Explora, personaliza y prepara tu carrito. Este catálogo utiliza datos de demostración.</p>
        <ul><li>Productos, disponibilidad y precios de catálogo son de ejemplo y deben confirmarse.</li><li>Precios en colones costarricenses (CRC).</li><li>Correos a todo Costa Rica: ₡2.800; gratis en compras mayores a ₡15.000.</li><li>Puedes elegir un solo tipo de gomita o pedirlas mixtas; el peso es el total de la bolsa.</li><li>Los pedidos se registran en esta tienda y se pagan mediante SINPE Móvil, después de confirmar el destino y el total.</li></ul>
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
