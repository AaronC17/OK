import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { FormEvent } from 'react'
import { store } from '../config/store.ts'
import { money, totals, validateCheckout } from '../lib/shop.ts'
import { checkoutConfig, createOrder, currentOrder, errorMessage, fetchOrder } from '../lib/orders-api.ts'
import type { CheckoutConfig, OrderCustomer, ShopOrder } from '../order-types.ts'
import type { Cart } from '../hooks/useCart.ts'
import { Icon } from './Icon.tsx'
import { FreeShippingBar } from './FreeShippingBar.tsx'
import { OrderPanel } from './OrderPanel.tsx'
import { Modal, ProductImage, Quantity } from './ui.tsx'
import '../orders.css'

type Errors = Partial<Record<'name' | 'phone' | 'email' | 'deliveryId' | 'address' | 'notes' | 'privacy' | 'cart', string>>

const DISMISSED_ORDER_KEY = 'onkys.dismissedOrderId'
const DELIVERY_PREF_KEY = 'onkys.delivery'

function getInitialDeliveryId(): string {
  try {
    const saved = window.localStorage.getItem(DELIVERY_PREF_KEY)
    if (saved && store.deliveryMethods.some(method => method.id === saved && method.enabled)) {
      return saved
    }
  } catch { /* ignore */ }
  return store.deliveryMethods.find(method => method.enabled)?.id ?? 'delivery'
}

function getDismissedOrderId(): string | null {
  try { return window.localStorage.getItem(DISMISSED_ORDER_KEY) } catch { return null }
}

function setDismissedOrderId(id: string | null) {
  try {
    if (id) window.localStorage.setItem(DISMISSED_ORDER_KEY, id)
    else window.localStorage.removeItem(DISMISSED_ORDER_KEY)
  } catch { /* Ignore storage quota/privacy errors */ }
}

export function CartDrawer({ open, onClose, cart }: { open: boolean; onClose: () => void; cart: Cart }) {
  const [customer, setCustomer] = useState<OrderCustomer>({ name: '', phone: '', email: '', address: '', notes: '' })
  const [deliveryId, setDeliveryId] = useState(getInitialDeliveryId)
  const [privacy, setPrivacy] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [config, setConfig] = useState<CheckoutConfig | null>(null)
  const [order, setOrder] = useState<ShopOrder | null>(null)
  const [loading, setLoading] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [serverError, setServerError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null)
  const method = store.deliveryMethods.find(method => method.id === deliveryId && method.enabled)
  const calculated = totals(cart.lines, method)
  const amounts = order ? { subtotal: order.subtotalMinor, shipping: order.shippingMinor, total: order.totalMinor } : calculated

  useEffect(() => {
    if (cart.items.length > 0 && order) {
      setDismissedOrderId(order.id)
      setOrder(null)
    }
  }, [cart.items.length, order])

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    setServerError('')
    void checkoutConfig().then(async settings => {
      if (alive) setConfig(settings)
      if (!cart.items.length) {
        const result = await currentOrder()
        if (alive) {
          const activeOrder = result.order && result.order.id !== getDismissedOrderId() ? result.order : null
          setOrder(activeOrder)
        }
      }
    }).catch(error => { if (alive) setServerError(errorMessage(error)) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [open, cart.items.length])

  useEffect(() => {
    if (!open || !order || order.status === 'ready') return
    let alive = true
    const interval = window.setInterval(() => {
      if (document.hidden) return
      void fetchOrder(order.id).then(next => { if (alive) setOrder(current => current?.id === next.id && current.version > next.version ? current : next) }).catch(() => { /* Manual refresh reports connection errors. */ })
    }, 10_000)
    return () => { alive = false; window.clearInterval(interval) }
  }, [open, order?.id, order?.status])

  const refresh = async () => {
    setLoading(true)
    setServerError('')
    try {
      setConfig(await checkoutConfig())
      if (order) {
        const next = await fetchOrder(order.id)
        setOrder(current => current?.id === next.id && current.version > next.version ? current : next)
      }
      else if (!cart.items.length) {
        const latest = (await currentOrder()).order
        setOrder(latest && latest.id !== getDismissedOrderId() ? latest : null)
      }
    } catch (error) { setServerError(errorMessage(error)) }
    finally { setLoading(false) }
  }
  const change = (field: keyof OrderCustomer, value: string) => {
    setCustomer(current => ({ ...current, [field]: value }))
    setErrors(current => ({ ...current, [field]: undefined }))
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (preparing) return
    const next: Errors = validateCheckout(cart.lines, { ...customer, deliveryId }, store)
    if (!/^(?:\+?506)?[2-9]\d{7}$/.test(customer.phone.replace(/[\s()-]/g, ''))) next.phone = 'Escribe un teléfono costarricense válido de 8 dígitos.'
    const contact = customer.email.trim()
    if (!contact || contact.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact)) next.email = 'Escribe un correo válido: te enviaremos aquí el estado de tu pedido y la confirmación de pago.'
    if (!privacy) next.privacy = 'Acepta el uso de tus datos para gestionar este pedido.'
    flushSync(() => setErrors(next))
    if (Object.keys(next).length) { formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return }
    const fingerprint = JSON.stringify({ items: cart.items, customer, deliveryId, privacy })
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() }
    setPreparing(true)
    setServerError('')
    try {
      const created = await createOrder(cart.items, deliveryId, customer, privacy, attempt.current.key)
      setDismissedOrderId(null)
      flushSync(() => { setOrder(created); cart.clear(); setPreparing(false) })
      scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    } catch (error) { setServerError(errorMessage(error)); setPreparing(false) }
  }
  const newOrder = () => {
    if (order) setDismissedOrderId(order.id)
    setOrder(null)
    setErrors({})
    setServerError('')
    onClose()
  }

  return <Modal open={open} onClose={onClose} titleId="cart-title" className="cart-drawer">
    <div className="cart-inner">
      <header className="drawer-header"><div><span className="eyebrow">{order ? 'PASARELA DE PAGO' : 'TUS PEQUEÑOS GUSTOS'}</span><h2 id="cart-title">{order ? 'Tu pedido' : 'Tu carrito'} {!order && <span>{cart.count}</span>}</h2></div><button className="icon-button" onClick={onClose} aria-label="Cerrar carrito"><Icon name="close" /></button></header>
      {cart.notice && !order && <p className="notice cart-notice" role="status"><Icon name="info" size={17} />{cart.notice}</p>}
      {serverError && <div className="checkout-server-error"><p className="field-error" role="alert">{serverError}</p><button type="button" className="text-button" disabled={loading} onClick={() => { void refresh() }}>Reintentar conexión</button></div>}
      {!order && !cart.lines.length ? <div className="empty-cart"><div className="empty-bag"><Icon name="bag" size={48} /></div><span className="eyebrow">AQUÍ CABEN TUS FAVORITOS</span><h3>Un buen momento por empezar.</h3><p>Elige tus favoritos.<br />Ahora puedes pedir y pagar con SINPE Móvil.</p><button className="button button-primary" onClick={() => { onClose(); document.getElementById('catalogo')?.scrollIntoView() }}>Explorar el catálogo <Icon name="arrow" size={18} /></button></div> : <>
        <div className="drawer-scroll" ref={scrollRef}>
          {order ? <OrderPanel key={order.id} order={order} onChange={setOrder} onRefresh={() => { void refresh() }} onNew={newOrder} busy={loading} /> : <>
            {deliveryId === 'delivery' && <FreeShippingBar subtotal={amounts.subtotal} />}
            <div className="cart-lines">{cart.lines.map(line => <article key={line.key} className="cart-line"><ProductImage src={line.image} alt={line.imageAlt} /><div className="cart-line-details"><div className="cart-line-heading"><h3>{line.name}</h3><button className="icon-button remove-button" disabled={preparing} onClick={() => cart.remove(line.key)} aria-label={`Eliminar ${line.name}, ${line.options.join(', ')}`}><Icon name="trash" size={16} /></button></div><p>{line.options.join(' · ')}</p><span className="unit-price">{money(line.unitPriceMinor, store)} / unidad</span><div className="cart-line-bottom"><Quantity value={line.quantity} onChange={value => { if (!preparing) cart.update(line.key, value) }} label={`Cantidad de ${line.name}, ${line.options.join(', ')}`} /><strong>{money(line.lineTotalMinor, store)}</strong></div></div></article>)}</div>
            <button className="continue-shopping" disabled={preparing} onClick={onClose}><Icon name="plus" size={16} />Seguir explorando</button>
            <form ref={formRef} id="checkout-form" className="checkout-form" noValidate onSubmit={event => { void submit(event) }}>
              <fieldset disabled={preparing} className="checkout-fields">
                <div className="form-heading"><span className="step-marker">01</span><h3>¿Cómo lo quieres recibir?</h3></div>
                <fieldset className="delivery-fieldset"><legend className="sr-only">Método de entrega</legend><div className="delivery-options">{store.deliveryMethods.filter(method => method.enabled).map(option => <label className="delivery-option" key={option.id}><input type="radio" name="delivery" value={option.id} checked={deliveryId === option.id} onChange={() => { setDeliveryId(option.id); try { window.localStorage.setItem(DELIVERY_PREF_KEY, option.id) } catch {}; setErrors(current => ({ ...current, deliveryId: undefined, address: undefined })) }} aria-invalid={!!errors.deliveryId} /><Icon name={option.requiresAddress ? 'truck' : 'pin'} size={23} /><strong>{option.name}</strong><small>{option.description}</small></label>)}</div>{errors.deliveryId && <p className="field-error">{errors.deliveryId}</p>}{method && <p className="delivery-note">{method.conditions}{method.pickupPoint ? ` Punto: ${method.pickupPoint}.` : ''}</p>}</fieldset>
                <div className="form-heading"><span className="step-marker">02</span><h3>Tus datos y tu forma de pago.</h3></div>
                <div className="form-field"><label htmlFor="customer-name">Tu nombre <span aria-hidden="true">*</span></label><input id="customer-name" autoComplete="name" maxLength={100} required value={customer.name} onChange={event => change('name', event.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} placeholder="¿Cómo te llamas?" />{errors.name && <p className="field-error" id="name-error">{errors.name}</p>}</div>
                <div className="form-field"><label htmlFor="customer-phone">Teléfono de contacto <span aria-hidden="true">*</span></label><input id="customer-phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={24} required value={customer.phone} onChange={event => change('phone', event.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'phone-error' : undefined} placeholder="8 dígitos · Costa Rica" />{errors.phone && <p className="field-error" id="phone-error">{errors.phone}</p>}</div>

                <div className="form-field"><label htmlFor="customer-email">Correo electrónico <span aria-hidden="true">*</span></label><input id="customer-email" type="email" autoComplete="email" inputMode="email" maxLength={254} required value={customer.email} onChange={event => change('email', event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} placeholder="tucorreo@ejemplo.com" /><small>Te enviamos aquí el estado de tu pedido: cuando llega tu pago a revisión y cuando queda confirmado para entregar.</small>{errors.email && <p className="field-error" id="email-error">{errors.email}</p>}</div>
                {method?.requiresAddress && <div className="form-field"><label htmlFor="customer-address">{method.addressLabel ?? 'Dirección'} <span aria-hidden="true">*</span></label><textarea id="customer-address" autoComplete="street-address" rows={2} maxLength={500} required value={customer.address} onChange={event => change('address', event.target.value)} aria-invalid={!!errors.address} aria-describedby={errors.address ? 'address-error' : undefined} />{errors.address && <p className="field-error" id="address-error">{errors.address}</p>}</div>}
                <div className="form-field"><label htmlFor="customer-notes">¿Algo que debamos saber? <span className="muted">(opcional)</span></label><textarea id="customer-notes" rows={2} maxLength={1000} value={customer.notes} onChange={event => change('notes', event.target.value)} aria-invalid={!!errors.notes} />{errors.notes && <p className="field-error">{errors.notes}</p>}</div>
                <fieldset className="payment-method"><legend>Forma de pago</legend><label><input type="radio" name="payment" value="sinpe" checked readOnly /><Icon name="bank" size={23} /><span><strong>SINPE Móvil</strong><small>Código de pedido + comprobante privado</small></span><Icon name="check" size={17} /></label><p>{calculated.total === null ? 'Registraremos tu pedido sin pedirte que pagues. La tienda debe cotizar el envío antes de mostrar el monto definitivo.' : config?.sinpe ? 'Al registrar el pedido recibirás el número SINPE, el monto exacto y tu código.' : 'Registraremos tu pedido. La tienda debe configurar y confirmar el destino SINPE antes de solicitarte un pago.'}</p></fieldset>
                <label className="privacy-check"><input type="checkbox" checked={privacy} onChange={event => { setPrivacy(event.target.checked); setErrors(current => ({ ...current, privacy: undefined })) }} aria-invalid={!!errors.privacy} aria-describedby="checkout-privacy" /><span id="checkout-privacy">Acepto que la tienda guarde mi nombre, contacto, dirección y comprobante para gestionar este pedido y revisar el pago. No se publicarán.</span></label>{errors.privacy && <p className="field-error">{errors.privacy}</p>}
              </fieldset>
            </form>
          </>}
        </div>
        {!order && <footer className="cart-footer"><dl className="order-totals"><div><dt>Subtotal</dt><dd>{money(amounts.subtotal, store)}</dd></div><div><dt>Entrega</dt><dd>{method?.name ?? 'Por elegir'}</dd></div><div><dt>Costo de entrega</dt><dd>{amounts.shipping === null ? 'Envío por confirmar' : money(amounts.shipping, store)}</dd></div>{amounts.total !== null && <div className="total-row"><dt>Total</dt><dd>{money(amounts.total, store)}</dd></div>}</dl>
          {amounts.total === null && <p className="shipping-pending">No pagues todavía: falta confirmar el costo de envío.</p>}
          {errors.cart && <p className="field-error" role="alert">{errors.cart}</p>}
          <button form="checkout-form" type="submit" className="button button-primary checkout-button" disabled={preparing || loading || !config}><Icon name="bank" size={21} />{preparing ? 'Registrando tu pedido…' : 'Crear pedido con SINPE'}<Icon name="arrow" size={17} /></button><p className="checkout-footnote">El pedido se guarda aquí. El pago se confirma después de revisar el abono.</p>
          {store.demo && <p className="demo-small">Precios de productos de ejemplo · No envíes dinero real</p>}
        </footer>}
      </>}
    </div>
  </Modal>
}
