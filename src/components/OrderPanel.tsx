import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { store } from '../config/store.ts'
import { orderStatusLabels } from '../order-types.ts'
import type { ShopOrder } from '../order-types.ts'
import { errorMessage, uploadReceipt } from '../lib/orders-api.ts'
import { money } from '../lib/shop.ts'
import { useVisibleAnimation } from '../hooks/useVisibleAnimation.ts'
import { Icon } from './Icon.tsx'
import { DeliveryTruck } from './DeliveryTruck.tsx'

export function OrderLines({ order }: { order: ShopOrder }) {
  return <div className="recorded-lines">{order.lines.map(line => <div key={line.key}><div><strong>{line.quantity} × {line.name}</strong><small>{line.options.join(' · ')}</small></div><span>{money(line.lineTotalMinor, store)}</span></div>)}</div>
}

function DeliveryTransitAnimation({ order }: { order: ShopOrder }) {
  const root = useVisibleAnimation<HTMLDivElement>()
  const isReady = order.status === 'ready'
  const isPickup = !order.delivery.requiresAddress

  return (
    <div ref={root} className="sinpe-transit-card" role="region" aria-label="Estado del envío en curso">
      <div className="transit-card-top">
        <span className="transit-live-badge">
          <span className="transit-pulse-dot" />
          {isReady
            ? (isPickup ? 'Listo para retirar' : 'Pedido en camino')
            : 'Procesando tu pedido'}
        </span>
        <span id="assigned-order-code" className="transit-order-code">{order.code}</span>
      </div>

      <DeliveryTruck />

      <div className="transit-steps" aria-label="Progreso del pedido">
        <div className="transit-step is-done">
          <span className="transit-step-dot"><Icon name="check" size={12} /></span>
          <span>Pago enviado</span>
        </div>
        <div className="transit-step-line is-filled" />
        <div className={`transit-step ${isReady ? 'is-done' : 'is-active'}`}>
          <span className="transit-step-dot">{isReady ? <Icon name="check" size={12} /> : <span className="step-inner-pulse" />}</span>
          <span>Preparando</span>
        </div>
        <div className={`transit-step-line ${isReady ? 'is-filled' : ''}`} />
        <div className={`transit-step ${isReady ? 'is-active' : ''}`}>
          <span className="transit-step-dot"><Icon name={isPickup ? 'pin' : 'truck'} size={12} /></span>
          <span>{isPickup ? 'Para retirar' : 'En camino'}</span>
        </div>
      </div>
    </div>
  )
}

export function OrderPanel({ order, onChange, onRefresh, onNew, busy }: {
  order: ShopOrder; onChange: (order: ShopOrder) => void; onRefresh: () => void; onNew: () => void; busy: boolean
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [copiedField, setCopiedField] = useState<'code' | 'phone' | null>(null)
  const uploadKey = useRef<{ fingerprint: string; key: string } | null>(null)
  const canSubmit = order.status === 'awaiting_payment' || order.status === 'rejected'

  useEffect(() => {
    document.querySelector('.cart-drawer')?.scrollTo({ top: 0, behavior: 'instant' })
  }, [order.status])

  useEffect(() => {
    if (!file?.type.startsWith('image/')) { setPreview(''); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const copyText = async (value: string, field: 'code' | 'phone') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedField(field)
      window.setTimeout(() => setCopiedField(current => current === field ? null : current), 2400)
    } catch {
      /* Clipboard permission denied or unavailable */
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!file) {
      setError('Adjunta la captura o PDF del comprobante antes de confirmar el pago.')
      document.getElementById('receipt-file')?.focus()
      return
    }
    if (file.size > 5 * 1024 * 1024) { setError('El comprobante no puede superar 5 MB.'); return }
    const fingerprint = JSON.stringify({ id: order.id, version: order.version, file: [file.name, file.size, file.lastModified] })
    if (uploadKey.current?.fingerprint !== fingerprint) uploadKey.current = { fingerprint, key: crypto.randomUUID() }
    setSending(true)
    try {
      onChange(await uploadReceipt(order, file, uploadKey.current.key))
      setFile(null)
    } catch (err) { setError(errorMessage(err)) }
    finally { setSending(false) }
  }

  const title = order.status === 'ready'
    ? '¡Tu pedido va en camino!'
    : order.status === 'pending_review'
      ? '¡Pago confirmado!'
      : order.status === 'pending_details'
        ? 'Pedido registrado'
        : order.status === 'rejected'
          ? 'Actualiza tu comprobante'
          : 'Completa tu pago'

  const subtitle = order.status === 'pending_review'
    ? 'Recibimos tu comprobante. Estamos alistando tu pedido para que salga lo antes posible.'
    : order.status === 'ready'
      ? 'Tu pago fue verificado. Tu pedido ya está confirmado y en ruta.'
      : order.status === 'pending_details'
        ? 'Tu pedido está guardado. Te avisaremos apenas estén activos los datos SINPE.'
        : 'Realiza el SINPE Móvil con el código en la descripción, sube tu comprobante y confirma el pago.'

  const formattedPhone = order.destination
    ? `${order.destination.phone.slice(0, 4)}-${order.destination.phone.slice(4)}`
    : ''

  const showTransitAnimation = order.status === 'pending_review' || order.status === 'ready'

  return <section className="sinpe-order-panel" aria-labelledby="sinpe-order-title">
    <div className="sinpe-gateway-header">
      <h3 id="sinpe-order-title">{title}</h3>
      <p>{subtitle}</p>
    </div>

    {showTransitAnimation ? (
      <DeliveryTransitAnimation order={order} />
    ) : (
      <div className="sinpe-pay-card">
        <div className="sinpe-pay-head">
          <div className="sinpe-brand-badge">
            <img src="/images/sinpe-movil.png" alt="SINPE Móvil" width="44" height="44" />
            <div>
              <strong>SINPE Móvil</strong>
              <small>{order.destination ? `Banco ${order.destination.bank}` : 'Transferencia inmediata'}</small>
            </div>
          </div>
          {order.totalMinor !== null && order.status !== 'pending_details' && (
            <div className="sinpe-pay-amount">
              <small>Monto exacto</small>
              <strong>{money(order.totalMinor, store)}</strong>
            </div>
          )}
        </div>

        <div className="sinpe-gateway-body">
          {order.destination && order.totalMinor !== null && order.status !== 'pending_details' && (
            <div className="sinpe-gateway-field">
              <div className="sinpe-field-info">
                <span className="sinpe-field-label">Enviar al número SINPE</span>
                <strong className="sinpe-phone-number">{formattedPhone}</strong>
                <small className="sinpe-beneficiary">A nombre de: {order.destination.beneficiary}</small>
              </div>
              <button
                type="button"
                className={`gateway-copy-btn ${copiedField === 'phone' ? 'is-copied' : ''}`}
                onClick={() => { void copyText(order.destination!.phone, 'phone') }}
                aria-label="Copiar teléfono SINPE"
              >
                <Icon name={copiedField === 'phone' ? 'check' : 'copy'} size={14} />
                <span>{copiedField === 'phone' ? 'Copiado' : 'Copiar'}</span>
              </button>
            </div>
          )}

          <div className="sinpe-gateway-field sinpe-code-field">
            <div className="sinpe-field-info">
              <span className="sinpe-field-label">Detalle / Descripción del SINPE</span>
              <div className="sinpe-code-pill-row">
                <span id="assigned-order-code" className="sinpe-code-display">{order.code}</span>
                <button
                  type="button"
                  className={`gateway-copy-btn ${copiedField === 'code' ? 'is-copied' : ''}`}
                  onClick={() => { void copyText(order.code, 'code') }}
                  aria-label="Copiar código del pedido"
                >
                  <Icon name={copiedField === 'code' ? 'check' : 'copy'} size={14} />
                  <span>{copiedField === 'code' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <small className="sinpe-code-hint">Incluye este código en la descripción al hacer el SINPE en tu banco.</small>
            </div>
          </div>
        </div>
      </div>
    )}

    {order.customerMessage && <p className="notice payment-message" role="status">{order.customerMessage}</p>}

    {canSubmit && (
      <form id="receipt-upload-form" className="receipt-form" noValidate onSubmit={event => { void submit(event) }}>
        <div className="receipt-form-header">
          <div>
            <h4>Comprobante de pago</h4>
            <p>Adjunta la captura o PDF del comprobante generado por tu banco.</p>
          </div>
        </div>
        <fieldset disabled={sending}>
          <label className={`receipt-dropzone ${file ? 'has-file' : ''}`} htmlFor="receipt-file">
            <div className="receipt-dropzone-icon">
              <Icon name={file ? 'check' : 'upload'} size={20} />
            </div>
            <div className="receipt-dropzone-text">
              <strong>{file ? file.name : 'Subir captura o comprobante'}</strong>
              <span>{file ? 'Comprobante listo · Toca para cambiar' : 'JPG, PNG, WebP o PDF · máx. 5 MB'}</span>
            </div>
            <input
              id="receipt-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={event => { setFile(event.target.files?.[0] ?? null); setError('') }}
            />
          </label>
          {preview && <img className="receipt-local-preview" src={preview} alt="Vista previa del comprobante seleccionado" />}
          {error && <p className="field-error" role="alert">{error}</p>}
        </fieldset>
      </form>
    )}

    {order.receipt && !canSubmit && (
      <div className="receipt-received">
        <div className="receipt-received-icon"><Icon name="check" size={18} /></div>
        <div>
          <strong>Comprobante adjuntado</strong>
          <small>Pedido {order.code} · {order.totalMinor !== null ? `${money(order.totalMinor, store)} · ` : ''}{orderStatusLabels[order.status]}</small>
        </div>
        <a
          className="icon-button"
          href={`/api/orders/${order.id}/receipts/${order.receipt.id}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Consultar mi comprobante"
        >
          <Icon name="download" size={18} />
        </a>
      </div>
    )}

    <details className="recorded-order-summary">
      <summary>
        <span>Resumen del pedido ({order.lines.reduce((acc, l) => acc + l.quantity, 0)})</span>
        <Icon name="chevron" size={16} />
      </summary>
      <OrderLines order={order} />
      <dl className="order-totals gateway-summary-totals">
        <div><dt>Subtotal</dt><dd>{money(order.subtotalMinor, store)}</dd></div>
        <div><dt>Envío ({order.delivery.name})</dt><dd>{order.shippingMinor === null ? 'Por confirmar' : money(order.shippingMinor, store)}</dd></div>
        {order.totalMinor !== null && <div className="total-row"><dt>Total</dt><dd>{money(order.totalMinor, store)}</dd></div>}
      </dl>
      <p>{order.delivery.name} · {order.customer.name}{order.customer.address ? ` · ${order.customer.address}` : ''}</p>
    </details>

    <div className="order-panel-actions">
      {canSubmit ? (
        <button
          type="submit"
          form="receipt-upload-form"
          className="button button-primary gateway-confirm-btn"
          disabled={sending}
        >
          <Icon name="check" size={18} />
          <span>{sending ? 'Confirmando pago…' : 'Confirmar pago'}</span>
          <Icon name="arrow" size={16} />
        </button>
      ) : (
        <button type="button" className="button button-outline" disabled={busy || sending} onClick={onRefresh}>
          <Icon name="refresh" size={16} />
          {busy ? 'Consultando…' : 'Actualizar estado'}
        </button>
      )}
      <button type="button" className="text-button" disabled={sending} onClick={onNew}>Hacer otro pedido</button>
    </div>
  </section>
}
