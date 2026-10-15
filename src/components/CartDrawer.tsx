import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { FormEvent } from 'react'
import { store } from '../config/store.ts'
import { buildOrderMessage, makeReference, money, totals, validateCheckout, whatsappNumber, whatsappUrl } from '../lib/shop.ts'
import type { CheckoutErrors, Customer } from '../types.ts'
import type { Cart } from '../hooks/useCart.ts'
import { Icon } from './Icon.tsx'
import { Modal, ProductImage, Quantity } from './ui.tsx'

interface PreparedOrder { message: string; reference: string; url: string | null; fingerprint: string }

export function CartDrawer({ open, onClose, cart }: { open: boolean; onClose: () => void; cart: Cart }) {
  const [customer, setCustomer] = useState<Customer>({ name: '', deliveryId: store.deliveryMethods.find(method => method.enabled)?.id ?? '', address: '', notes: '' })
  const [errors, setErrors] = useState<CheckoutErrors>({})
  const [preparing, setPreparing] = useState(false)
  const [prepared, setPrepared] = useState<PreparedOrder | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle')
  const formRef = useRef<HTMLFormElement>(null)
  const readyRef = useRef<HTMLDivElement>(null)
  const summaryRef = useRef<HTMLTextAreaElement>(null)
  const method = store.deliveryMethods.find(method => method.id === customer.deliveryId && method.enabled)
  const amounts = totals(cart.lines, method)
  const fingerprint = JSON.stringify({ items: cart.items, customer })
  const ready = prepared?.fingerprint === fingerprint ? prepared : null
  const configured = !!whatsappNumber(store)

  const change = (field: keyof Customer, value: string) => {
    setCustomer(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined, ...(field === 'deliveryId' ? { address: undefined } : {}) }))
    setPrepared(null)
    setCopyState('idle')
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors = validateCheckout(cart.lines, customer, store)
    flushSync(() => setErrors(nextErrors))
    if (Object.keys(nextErrors).length) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    flushSync(() => setPreparing(true))
    try {
      const reference = makeReference()
      const message = buildOrderMessage(cart.lines, customer, reference, store)
      const url = whatsappUrl(message, store)
      // Synchronous with the user's click: no timer or awaited animation before opening.
      if (url) {
        try { window.open(url, '_blank', 'noopener,noreferrer') } catch { /* The ready panel always provides a link and copy fallback. */ }
      }
      flushSync(() => { setPrepared({ reference, message, url, fingerprint }); setCopyState('idle'); setPreparing(false) })
      readyRef.current?.focus({ preventScroll: true })
      readyRef.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' })
    } catch {
      setPreparing(false)
      setErrors({ cart: 'No pudimos preparar el resumen. Revisa tus opciones e inténtalo de nuevo.' })
    }
  }

  const copySummary = async () => {
    if (!ready) return
    try {
      await navigator.clipboard.writeText(ready.message)
      setCopyState('copied')
    } catch {
      flushSync(() => setCopyState('manual'))
      summaryRef.current?.focus()
      summaryRef.current?.select()
    }
  }

  return <Modal open={open} onClose={onClose} titleId="cart-title" className="cart-drawer">
    <div className="cart-inner">
      <header className="drawer-header"><div><span className="eyebrow">TUS PEQUEÑOS GUSTOS</span><h2 id="cart-title">Tu carrito <span>{cart.count}</span></h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar carrito"><Icon name="close" /></button></header>
      {cart.notice && <p className="notice cart-notice" role="status"><Icon name="info" size={17} />{cart.notice}</p>}
      {!cart.lines.length ? <div className="empty-cart">
        <div className="empty-bag"><Icon name="bag" size={48} /></div>
        <span className="eyebrow">AQUÍ CABEN TUS FAVORITOS</span><h3>Un buen momento por empezar.</h3><p>Algo para ti, algo para compartir.<br />Encuentra ese pequeño gusto.</p>
        <button className="button button-primary" onClick={() => { onClose(); document.getElementById('catalogo')?.scrollIntoView() }}>Explorar el catálogo <Icon name="arrow" size={18} /></button>
      </div> : <>
        <div className="drawer-scroll">
          <div className="cart-lines">{cart.lines.map(line => <article key={line.key} className="cart-line">
            <ProductImage src={line.image} alt={line.imageAlt} />
            <div className="cart-line-details"><div className="cart-line-heading"><h3>{line.name}</h3><button className="icon-button remove-button" onClick={() => cart.remove(line.key)} aria-label={`Eliminar ${line.name}, ${line.options.join(', ')}`}><Icon name="trash" size={16} /></button></div>
              <p>{line.options.join(' · ')}</p><span className="unit-price">{money(line.unitPriceMinor, store)} / unidad</span>
              <div className="cart-line-bottom"><Quantity value={line.quantity} onChange={value => cart.update(line.key, value)} label={`Cantidad de ${line.name}, ${line.options.join(', ')}`} /><strong>{money(line.lineTotalMinor, store)}</strong></div>
            </div>
          </article>)}</div>
          <button className="continue-shopping" onClick={onClose}><Icon name="plus" size={16} /> Seguir explorando</button>
          {ready ? <div className="order-ready" ref={readyRef} tabIndex={-1}>
            <div className="ready-symbol"><Icon name={ready.url ? 'whatsapp' : 'check'} size={30} /></div>
            <span className="eyebrow">RESUMEN PREPARADO</span>
            <h3>{ready.url ? 'Tu pedido está listo para enviar por WhatsApp.' : 'Tu resumen está listo.'}</h3>
            <p>{ready.url ? 'Envía el mensaje en WhatsApp para solicitar la confirmación de la tienda.' : 'Falta configurar el código de país de WhatsApp. Mientras tanto, puedes copiar tu pedido.'}</p>
            <span className="reference">{ready.reference}</span>
            {ready.url && <a className="button button-primary" href={ready.url} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" /> Volver a abrir WhatsApp <Icon name="arrow-up" size={18} /></a>}
            <button className={`button ${ready.url ? 'button-outline' : 'button-primary'}`} onClick={copySummary}><Icon name={copyState === 'copied' ? 'check' : 'copy'} size={18} />{copyState === 'copied' ? 'Resumen copiado' : 'Copiar resumen del pedido'}</button>
            <span className="sr-only" role="status">{copyState === 'copied' ? 'El resumen se copió al portapapeles.' : ''}</span>
            <details className="summary-details" open={copyState === 'manual' || undefined}><summary>Ver resumen completo <Icon name="chevron" size={16} /></summary>
              {copyState === 'manual' && <p className="notice">No pudimos acceder al portapapeles. Selecciona el texto y usa «Copiar» en tu dispositivo.</p>}
              <label htmlFor="order-summary" className="sr-only">Resumen de tu solicitud</label><textarea id="order-summary" ref={summaryRef} readOnly value={ready.message} onFocus={event => event.currentTarget.select()} />
            </details>
            <button className="text-button" onClick={() => setPrepared(null)}>Volver a los datos de entrega</button>
            <p className="small-note">Tu carrito sigue guardado. Esta solicitud requiere confirmación de la tienda.</p>
          </div> : <form ref={formRef} id="checkout-form" className="checkout-form" noValidate onSubmit={submit}>
            <div className="form-heading"><span className="step-marker">01</span><h3>¿Cómo lo quieres recibir?</h3></div>
            <fieldset className="delivery-fieldset"><legend className="sr-only">Método de entrega</legend>
              <div className="delivery-options">{store.deliveryMethods.filter(method => method.enabled).map(option => <label className="delivery-option" key={option.id}>
                <input type="radio" name="delivery" value={option.id} checked={customer.deliveryId === option.id} onChange={() => change('deliveryId', option.id)} aria-invalid={!!errors.deliveryId} aria-describedby={errors.deliveryId ? 'delivery-error' : undefined} />
                <Icon name={option.requiresAddress ? 'truck' : 'pin'} size={23} /><strong>{option.name}</strong><small>{option.description}</small>
              </label>)}</div>
              {errors.deliveryId && <p id="delivery-error" className="field-error">{errors.deliveryId}</p>}
              {!store.deliveryMethods.some(method => method.enabled) && <p className="field-error">Los métodos de entrega están pendientes de configurar.</p>}
              {method && <p className="delivery-note">{method.coverage ? `Cobertura: ${method.coverage}. ` : ''}{method.conditions}{method.pickupPoint ? ` Punto: ${method.pickupPoint}.` : ''}</p>}
            </fieldset>
            <div className="form-heading"><span className="step-marker">02</span><h3>Un par de datos y listo.</h3></div>
            <div className="form-field"><label htmlFor="customer-name">Tu nombre <span aria-hidden="true">*</span></label><input id="customer-name" name="name" autoComplete="name" placeholder="¿Cómo te llamas?" maxLength={100} required value={customer.name} onChange={event => change('name', event.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} />{errors.name && <p className="field-error" id="name-error">{errors.name}</p>}</div>
            {method?.requiresAddress && <div className="form-field"><label htmlFor="customer-address">{method.addressLabel ?? 'Dirección'} <span aria-hidden="true">*</span></label><textarea id="customer-address" name="address" autoComplete="street-address" placeholder="Dirección y referencias para encontrarte" rows={2} maxLength={500} required value={customer.address} onChange={event => change('address', event.target.value)} aria-invalid={!!errors.address} aria-describedby={errors.address ? 'address-error' : undefined} />{errors.address && <p className="field-error" id="address-error">{errors.address}</p>}</div>}
            <div className="form-field"><label htmlFor="customer-notes">¿Algo que debamos saber? <span className="muted">(opcional)</span></label><textarea id="customer-notes" name="notes" placeholder="Déjanos una nota para tu pedido" rows={2} maxLength={1000} value={customer.notes} onChange={event => change('notes', event.target.value)} aria-invalid={!!errors.notes} aria-describedby={errors.notes ? 'notes-error' : undefined} />{errors.notes && <p className="field-error" id="notes-error">{errors.notes}</p>}</div>
            <p className="small-note">Tus datos se incluyen únicamente en el resumen que decidas compartir con la tienda.</p>
          </form>}
        </div>
        <footer className="cart-footer">
          <dl className="order-totals"><div><dt>Subtotal</dt><dd>{money(amounts.subtotal, store)}</dd></div><div><dt>Entrega</dt><dd>{method?.name ?? 'Por elegir'}</dd></div><div><dt>{method?.requiresAddress ? 'Envío' : 'Costo de entrega'}</dt><dd>{amounts.shipping === null ? 'Envío por confirmar' : money(amounts.shipping, store)}</dd></div>{amounts.total !== null && <div className="total-row"><dt>Total</dt><dd>{money(amounts.total, store)}</dd></div>}</dl>
          {amounts.total === null && <p className="shipping-pending">El total final depende del costo de envío.</p>}
          {errors.cart && <p className="field-error" role="alert">{errors.cart}</p>}
          {!ready && <><button form="checkout-form" type="submit" className="button button-primary checkout-button" disabled={preparing}><Icon name="whatsapp" size={21} />{preparing ? 'Preparando tu pedido…' : 'Enviar pedido por WhatsApp'}<Icon name="arrow-up" size={17} /></button>
            <p className="checkout-footnote">{!configured ? 'WhatsApp pendiente de configurar. Podrás copiar el resumen.' : 'Se abrirá WhatsApp para que envíes tu solicitud.'}</p></>}
          {store.demo && <p className="demo-small">Precios y entrega de ejemplo · Colones costarricenses (CRC)</p>}
        </footer>
      </>}
    </div>
  </Modal>
}
