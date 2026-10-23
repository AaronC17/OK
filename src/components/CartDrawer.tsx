import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { FormEvent } from 'react'
import { store } from '../config/store.ts'
import { money, shippingFee, totals, validateCheckout } from '../lib/shop.ts'
import { checkoutConfig, previewOrder, currentOrder, errorMessage, fetchOrder } from '../lib/orders-api.ts'
import type { CheckoutConfig, CheckoutPreview, OrderCustomer, ShopOrder } from '../order-types.ts'
import type { CustomerAccount } from '../account-types.ts'
import { welcomeDiscount } from '../lib/welcome.ts'
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

export function CartDrawer({ open, onClose, cart, customerAccount, selectedOrderId, onRegister, onOrderChanged }: {
  open: boolean; onClose: () => void; cart: Cart; customerAccount: CustomerAccount | null; selectedOrderId: string | null; onRegister: () => void; onOrderChanged: () => void
}) {
  const [customer, setCustomer] = useState<OrderCustomer>({ name: customerAccount?.name ?? '', phone: '', email: customerAccount?.email ?? '', address: '', notes: '' })
  const [deliveryId, setDeliveryId] = useState(getInitialDeliveryId)
  const [privacy, setPrivacy] = useState(false)
  const [errors, setErrors] = useState<Errors>({})
  const [config, setConfig] = useState<CheckoutConfig | null>(null)
  const [order, setOrder] = useState<ShopOrder | null>(null)
  const [preview, setPreview] = useState<(CheckoutPreview & { fingerprint: string }) | null>(null)
  const [paymentStep, setPaymentStep] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [serverError, setServerError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const submitting = useRef(false)
  const isOpen = useRef(open)
  isOpen.current = open
  const empty = cart.items.length === 0
  const method = store.deliveryMethods.find(method => method.id === deliveryId && method.enabled)
  const calculated = totals(cart.lines, method)
  const fingerprint = JSON.stringify({ items: cart.items, customer, deliveryId, privacy })
  const payment = paymentStep && preview?.fingerprint === fingerprint ? preview : null
  const displayed = order ?? payment?.order
  const discount = displayed ? displayed.discountMinor ?? 0 : welcomeDiscount(calculated.subtotal, !!config?.account?.welcomeAvailable)
  const amounts = displayed ? { subtotal: displayed.subtotalMinor, shipping: displayed.shippingMinor, total: displayed.totalMinor } : { ...calculated, total: calculated.total === null ? null : calculated.total - discount }

  useEffect(() => {
    const navigate = () => {
      if (open) setPaymentStep(!!preview && history.state?.onkysPayment === preview.order.id)
    }
    window.addEventListener('popstate', navigate)
    return () => window.removeEventListener('popstate', navigate)
  }, [open, preview])

  useEffect(() => {
    if (!open) return
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' })
    document.getElementById(payment ? 'sinpe-order-title' : 'cart-title')?.focus({ preventScroll: true })
  }, [open, !!payment])

  useEffect(() => {
    if (cart.items.length > 0 && order && !selectedOrderId) {
      setDismissedOrderId(order.id)
      setOrder(null)
    }
  }, [cart.items.length, order, selectedOrderId])

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    setServerError('')
    void checkoutConfig().then(async settings => {
      if (alive) setConfig(settings)
      if (selectedOrderId) {
        const selected = await fetchOrder(selectedOrderId)
        if (alive) setOrder(selected)
      } else if (empty) {
        const result = await currentOrder()
        if (alive) {
          const activeOrder = result.order && result.order.id !== getDismissedOrderId() ? result.order : null
          setOrder(activeOrder)
        }
      }
    }).catch(error => { if (alive) setServerError(errorMessage(error)) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [open, empty, selectedOrderId, customerAccount?.welcomeAvailable])

  useEffect(() => {
    if (!open || !order || order.status === 'ready') return
    let alive = true
    let pending = false
    const interval = window.setInterval(() => {
      if (document.hidden || pending || loading) return
      pending = true
      void fetchOrder(order.id).then(next => { if (alive) setOrder(current => current?.id === next.id && current.version <= next.version ? next : current) })
        .catch(() => { /* Manual refresh reports connection errors. */ }).finally(() => { pending = false })
    }, 10_000)
    return () => { alive = false; window.clearInterval(interval) }
  }, [open, order?.id, order?.status, loading])

  const refresh = async () => {
    setLoading(true)
    setServerError('')
    try {
      setConfig(await checkoutConfig())
      if (order) {
        const next = await fetchOrder(order.id)
        setOrder(current => current?.id === next.id && current.version <= next.version ? next : current)
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
    if (submitting.current || loading || !config) return
    const next: Errors = validateCheckout(cart.lines, { ...customer, deliveryId }, store)
    if (!/^(?:\+?506)?[2-9]\d{7}$/.test(customer.phone.replace(/[\s()-]/g, ''))) next.phone = 'Escribe un teléfono costarricense válido de 8 dígitos.'
    const contact = customer.email.trim()
    if (!contact || contact.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact)) next.email = 'Escribe un correo válido: te enviaremos aquí el estado de tu pedido y la confirmación de pago.'
    if (!privacy) next.privacy = 'Acepta el uso de tus datos para gestionar este pedido.'
    flushSync(() => setErrors(next))
    if (Object.keys(next).length) { formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return }
    submitting.current = true
    setPreparing(true)
    setServerError('')
    try {
      const next = preview?.fingerprint === fingerprint && ((preview.order.discountMinor ?? 0) > 0) === !!config.account?.welcomeAvailable
        ? preview : { ...await previewOrder(cart.items, deliveryId, customer, privacy), fingerprint }
      setPreview(next)
      if (isOpen.current) {
        if (history.state?.onkysPayment !== next.order.id) history.pushState({ ...history.state, onkysPayment: next.order.id }, '')
        setPaymentStep(true)
      }
    } catch (error) { setServerError(errorMessage(error)); setPreparing(false) }
    finally { submitting.current = false; setPreparing(false) }
  }
  const backToCart = () => {
    if (preview && history.state?.onkysPayment === preview.order.id) history.back()
    setPaymentStep(false)
    setServerError('')
  }
  const close = () => { if (payment) backToCart(); onClose() }
  const cancelCheckout = () => {
    backToCart()
    setPreview(null)
    cart.clear()
    setPrivacy(false)
    setErrors({})
    onClose()
  }
  const receivedOrder = (next: ShopOrder) => {
    if (payment) {
      history.replaceState({ ...history.state, onkysPayment: null }, '')
      setDismissedOrderId(null)
      flushSync(() => { setOrder(next); setPreview(null); setPaymentStep(false); cart.clear() })
    } else setOrder(current => current?.id === next.id && current.version <= next.version ? next : current)
    onOrderChanged()
  }
  const newOrder = () => {
    if (order) setDismissedOrderId(order.id)
    setOrder(null)
    setErrors({})
    setServerError('')
    onClose()
  }

  return <Modal open={open} onClose={close} titleId="cart-title" className="cart-drawer">
    <div className="cart-inner">
      <header className="drawer-header"><div><span className="eyebrow">{displayed ? 'PASARELA DE PAGO' : 'TUS PEQUEÑOS GUSTOS'}</span><h2 id="cart-title" tabIndex={-1}>{order ? 'Tu pedido' : payment ? 'Tu pago' : 'Tu carrito'} {!displayed && <span>{cart.count}</span>}</h2></div><button className="icon-button" onClick={close} aria-label="Cerrar carrito"><Icon name="close" /></button></header>
      {cart.notice && !displayed && <p className="notice cart-notice" role="status"><Icon name="info" size={17} />{cart.notice}</p>}
      {serverError && <div className="checkout-server-error"><p className="field-error" role="alert">{serverError}</p><button type="button" className="text-button" disabled={loading} onClick={() => { void refresh() }}>Reintentar conexión</button></div>}
      {!order && !cart.lines.length ? <div className="empty-cart"><div className="empty-bag"><Icon name="bag" size={48} /></div><span className="eyebrow">AQUÍ CABEN TUS FAVORITOS</span><h3>Un buen momento por empezar.</h3><p>Elige tus favoritos.<br />Ahora puedes pedir y pagar con SINPE Móvil.</p><button className="button button-primary" onClick={() => { onClose(); document.getElementById('catalogo')?.scrollIntoView() }}>Explorar el catálogo <Icon name="arrow" size={18} /></button></div> : <>
        <div className="drawer-scroll" ref={scrollRef}>
          {displayed ? <OrderPanel key={displayed.id} order={displayed} checkoutToken={payment?.token} onBack={payment ? backToCart : undefined} onCancel={payment ? cancelCheckout : undefined} onChange={receivedOrder} onRefresh={() => { void refresh() }} onNew={newOrder} busy={loading} /> : <>
            {deliveryId === 'delivery' && <FreeShippingBar subtotal={amounts.subtotal} />}
            <div className="cart-lines">{cart.lines.map(line => <article key={line.key} className="cart-line"><ProductImage src={line.image} alt={line.imageAlt} sizes="83px" /><div className="cart-line-details"><div className="cart-line-heading"><h3>{line.name}</h3><button className="icon-button remove-button" disabled={preparing} onClick={() => cart.remove(line.key)} aria-label={`Eliminar ${line.name}, ${line.options.join(', ')}`}><Icon name="trash" size={16} /></button></div><p>{line.options.join(' · ')}</p><span className="unit-price">{money(line.unitPriceMinor, store)} / unidad</span><div className="cart-line-bottom"><Quantity value={line.quantity} disabled={preparing} onChange={value => cart.update(line.key, value)} label={`Cantidad de ${line.name}, ${line.options.join(', ')}`} /><strong>{money(line.lineTotalMinor, store)}</strong></div></div></article>)}</div>
            <form ref={formRef} id="checkout-form" className="checkout-form" noValidate onSubmit={event => { void submit(event) }}>
              <fieldset disabled={preparing} className="checkout-fields">
                {!customerAccount ? <div className="checkout-account-note"><Icon name="gift" size={19} /><div><strong>Tu primer antojo, con 10% menos.</strong><p>Crea tu cuenta para recibir el descuento en productos y guardar tus pedidos. También puedes continuar como invitado.</p><button type="button" className="text-button" onClick={onRegister}>Crear mi cuenta <Icon name="arrow" size={14} /></button></div></div> : config?.account?.welcomeAvailable && <div className="checkout-account-note"><Icon name="gift" size={19} /><div><strong>Tu 10% de bienvenida está aplicado.</strong><p>Solo en productos. Volver atrás o cancelar antes de enviar el comprobante conserva tu beneficio.</p></div></div>}
                <div className="form-heading"><span className="step-marker">01</span><h3>¿Cómo lo quieres recibir?</h3></div>
                <fieldset className="delivery-fieldset"><legend className="sr-only">Método de entrega</legend><div className="delivery-options">{store.deliveryMethods.filter(method => method.enabled).map(option => <label className="delivery-option" key={option.id}><input type="radio" name="delivery" value={option.id} checked={deliveryId === option.id} onChange={() => { setDeliveryId(option.id); try { window.localStorage.setItem(DELIVERY_PREF_KEY, option.id) } catch {}; setErrors(current => ({ ...current, deliveryId: undefined, address: undefined })) }} aria-invalid={!!errors.deliveryId} /><Icon name={option.requiresAddress ? 'truck' : 'pin'} size={23} /><strong>{option.name}</strong><small>{option.freeAboveMinor !== undefined && shippingFee(calculated.subtotal, option) === 0 ? ['Gratis', option.coverage].filter(Boolean).join(' · ') : option.description}</small></label>)}</div>{errors.deliveryId && <p className="field-error">{errors.deliveryId}</p>}{method?.conditions && <p className="delivery-note">{method.conditions}{method.pickupPoint ? ` Punto: ${method.pickupPoint}.` : ''}</p>}</fieldset>
                <div className="form-heading"><span className="step-marker">02</span><h3>Tus datos y tu forma de pago.</h3></div>
                <div className="form-field"><label htmlFor="customer-name">Tu nombre <span aria-hidden="true">*</span></label><input id="customer-name" autoComplete="name" maxLength={100} required value={customer.name} onChange={event => change('name', event.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} placeholder="¿Cómo te llamas?" />{errors.name && <p className="field-error" id="name-error">{errors.name}</p>}</div>
                <div className="form-field"><label htmlFor="customer-phone">Teléfono de contacto <span aria-hidden="true">*</span></label><input id="customer-phone" type="tel" autoComplete="tel" inputMode="tel" maxLength={24} required value={customer.phone} onChange={event => change('phone', event.target.value)} aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'phone-error' : undefined} placeholder="8 dígitos · Costa Rica" />{errors.phone && <p className="field-error" id="phone-error">{errors.phone}</p>}</div>

                <div className="form-field"><label htmlFor="customer-email">Correo electrónico <span aria-hidden="true">*</span></label><input id="customer-email" type="email" autoComplete="email" inputMode="email" maxLength={254} required value={customer.email} onChange={event => change('email', event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} placeholder="tucorreo@ejemplo.com" /><small>Te enviamos aquí el estado de tu pedido: cuando llega tu pago a revisión y cuando queda confirmado para entregar.</small>{errors.email && <p className="field-error" id="email-error">{errors.email}</p>}</div>
                {method?.requiresAddress && <div className="form-field"><label htmlFor="customer-address">{method.addressLabel ?? 'Dirección'} <span aria-hidden="true">*</span></label><textarea id="customer-address" autoComplete="street-address" rows={2} maxLength={500} required value={customer.address} onChange={event => change('address', event.target.value)} aria-invalid={!!errors.address} aria-describedby={errors.address ? 'address-error' : undefined} />{errors.address && <p className="field-error" id="address-error">{errors.address}</p>}</div>}
                <div className="form-field"><label htmlFor="customer-notes">¿Algo que debamos saber? <span className="muted">(opcional)</span></label><textarea id="customer-notes" rows={2} maxLength={1000} value={customer.notes} onChange={event => change('notes', event.target.value)} aria-invalid={!!errors.notes} />{errors.notes && <p className="field-error">{errors.notes}</p>}</div>
                <fieldset className="payment-method"><legend>Forma de pago</legend><label><input type="radio" name="payment" value="sinpe" checked readOnly /><Icon name="bank" size={23} /><span><strong>SINPE Móvil</strong><small>Código de pago + comprobante privado</small></span><Icon name="check" size={17} /></label><p>{calculated.total === null ? 'Falta confirmar el costo de envío para continuar al pago.' : config?.sinpe ? 'En el siguiente paso verás el número SINPE, el monto exacto y tu código. El pedido se registra al enviar el comprobante.' : 'La tienda debe confirmar el destino SINPE para habilitar el pago.'}</p></fieldset>
                <label className="privacy-check"><input type="checkbox" checked={privacy} onChange={event => { setPrivacy(event.target.checked); setErrors(current => ({ ...current, privacy: undefined })) }} aria-invalid={!!errors.privacy} aria-describedby="checkout-privacy" /><span id="checkout-privacy">Acepto que la tienda guarde mi nombre, contacto, dirección y comprobante para gestionar este pedido y revisar el pago. No se publicarán.</span></label>{errors.privacy && <p className="field-error">{errors.privacy}</p>}
              </fieldset>
            </form>
          </>}
        </div>
        {!displayed && <footer className="cart-footer"><dl className="order-totals"><div><dt>Subtotal</dt><dd>{money(amounts.subtotal, store)}</dd></div>{discount > 0 && <div className="welcome-discount-row"><dt>Bienvenida · 10%</dt><dd>−{money(discount, store)}</dd></div>}<div><dt>Entrega</dt><dd>{method?.name ?? 'Por elegir'}</dd></div><div><dt>Costo de entrega</dt><dd>{amounts.shipping === null ? 'Envío por confirmar' : money(amounts.shipping, store)}</dd></div>{amounts.total !== null && <div className="total-row"><dt>Total</dt><dd>{money(amounts.total, store)}</dd></div>}</dl>
          {amounts.total === null && <p className="shipping-pending">No pagues todavía: falta confirmar el costo de envío.</p>}
          {errors.cart && <p className="field-error" role="alert">{errors.cart}</p>}
          <button form="checkout-form" type="submit" className="button button-primary checkout-button" disabled={preparing || loading || !config}><Icon name="bank" size={21} />{preparing ? 'Preparando el pago…' : 'Continuar al pago'}<Icon name="arrow" size={17} /></button>
        </footer>}
      </>}
    </div>
  </Modal>
}
