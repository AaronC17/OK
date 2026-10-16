import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { store } from '../config/store.ts'
import { orderStatusLabels } from '../order-types.ts'
import type { ShopOrder } from '../order-types.ts'
import { errorMessage, uploadReceipt } from '../lib/orders-api.ts'
import { money } from '../lib/shop.ts'
import { Icon } from './Icon.tsx'

export function OrderLines({ order }: { order: ShopOrder }) {
  return <div className="recorded-lines">{order.lines.map(line => <div key={line.key}><div><strong>{line.quantity} × {line.name}</strong><small>{line.options.join(' · ')}</small></div><span>{money(line.lineTotalMinor, store)}</span></div>)}</div>
}

function DeliveryTransitAnimation({ order }: { order: ShopOrder }) {
  const isReady = order.status === 'ready'
  const isPickup = !order.delivery.requiresAddress

  return (
    <div className="sinpe-transit-card" role="region" aria-label="Estado del envío en curso">
      <div className="transit-card-top">
        <span className="transit-live-badge">
          <span className="transit-pulse-dot" />
          {isReady
            ? (isPickup ? 'Listo para retirar' : 'Pedido en camino')
            : 'Procesando tu pedido'}
        </span>
        <span id="assigned-order-code" className="transit-order-code">{order.code}</span>
      </div>

      <div className="transit-scene" aria-hidden="true">
        <svg viewBox="0 0 360 142" className="transit-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="transit-sky" x1="0" y1="0" x2="0" y2="142" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f3ecf8" />
              <stop offset="72%" stopColor="#faf8fc" />
              <stop offset="100%" stopColor="#ede4f3" />
            </linearGradient>
            <linearGradient id="transit-beam" x1="252" y1="90" x2="348" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#fde047" stopOpacity="0.42" />
              <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="transit-box-grad" x1="96" y1="42" x2="200" y2="102" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#492f5d" />
              <stop offset="100%" stopColor="#321e42" />
            </linearGradient>
          </defs>

          <rect width="360" height="142" fill="url(#transit-sky)" />

          {/* Seamless drifting clouds */}
          <g className="transit-clouds">
            <g opacity="0.65" fill="#ffffff">
              <rect x="34" y="22" width="46" height="12" rx="6" />
              <circle cx="48" cy="21" r="8" />
              <circle cx="62" cy="19" r="10" />
              <rect x="210" y="16" width="54" height="13" rx="6.5" />
              <circle cx="226" cy="15" r="9" />
              <circle cx="244" cy="14" r="11" />
              <rect x="394" y="22" width="46" height="12" rx="6" />
              <circle cx="408" cy="21" r="8" />
              <circle cx="422" cy="19" r="10" />
              <rect x="570" y="16" width="54" height="13" rx="6.5" />
              <circle cx="586" cy="15" r="9" />
              <circle cx="604" cy="14" r="11" />
            </g>
          </g>

          {/* Soft distant horizon hills */}
          <g className="transit-horizon" opacity="0.45">
            <path d="M0 112 Q45 92 95 112 T195 112 T295 112 T360 112 L360 116 L0 116 Z" fill="#dfd2ea" />
            <path d="M360 112 Q405 92 455 112 T555 112 T655 112 T720 112 L720 116 L360 116 Z" fill="#dfd2ea" />
          </g>

          {/* Road surface & scrolling lane dashes */}
          <rect x="0" y="112" width="360" height="30" fill="#e6dcef" />
          <line x1="0" y1="112" x2="360" y2="112" stroke="#d3c3e2" strokeWidth="1.5" />
          <line
            className="transit-road-dashes"
            x1="0"
            y1="126"
            x2="396"
            y2="126"
            stroke="#b59ec9"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="16 20"
          />

          {/* Speed wind lines */}
          <g className="transit-wind-lines" stroke="#cbb8dc" strokeLinecap="round">
            <line className="wind-line wind-1" x1="36" y1="54" x2="72" y2="54" strokeWidth="2" />
            <line className="wind-line wind-2" x1="18" y1="76" x2="64" y2="76" strokeWidth="2" />
            <line className="wind-line wind-3" x1="48" y1="94" x2="80" y2="94" strokeWidth="1.75" />
          </g>

          {/* Exhaust motion puffs */}
          <g className="transit-puffs" fill="#d9cae6">
            <circle className="puff puff-1" cx="92" cy="101" r="5" />
            <circle className="puff puff-2" cx="82" cy="98" r="7" />
            <circle className="puff puff-3" cx="70" cy="95" r="4.5" />
          </g>

          {/* Ground shadow under truck */}
          <ellipse className="transit-truck-shadow" cx="180" cy="115" rx="74" ry="5.5" fill="#382448" opacity="0.16" />

          {/* Delivery Truck */}
          <g className="transit-truck-unit">
            <g className="transit-truck-chassis">
              {/* Headlight beam */}
              <polygon points="256,85 346,68 346,112 256,97" fill="url(#transit-beam)" />

              {/* Cargo Box */}
              <rect x="98" y="42" width="104" height="60" rx="10" fill="url(#transit-box-grad)" />
              <path d="M108 42 H192 A10 10 0 0 1 202 52 V53 H98 V52 A10 10 0 0 1 108 42 Z" fill="#5e3e76" opacity="0.5" />
              <rect x="98" y="89" width="104" height="4" fill="#7c5797" opacity="0.4" />

              {/* Painted brand wordmark directly on truck body (same typography as sticker/wordmark) */}
              <text
                x="150"
                y="76"
                textAnchor="middle"
                fill="#fbfaf9"
                fontFamily="'DM Sans', sans-serif"
                fontWeight="800"
                fontSize="22"
                letterSpacing="-1.55px"
              >
                Onky’s<tspan fill="#b392ca" dx="0.5">.</tspan>
              </text>

              {/* Cab */}
              <path
                d="M200 56 H228 C234 56 239 59 242 64 L252 80 C255 84 257 88 257 93 V102 H200 V56 Z"
                fill="#523568"
              />
              {/* Windshield */}
              <path d="M207 62 H227 C230 62 233 64 235 67 L243 80 H207 V62 Z" fill="#e9dff2" />
              <polygon points="214,62 222,62 213,80 207,80" fill="#ffffff" opacity="0.65" />
              {/* Door handle */}
              <rect x="209" y="86" width="8" height="2.5" rx="1.25" fill="#cbb8dc" />

              {/* Chassis rail & bumpers */}
              <rect x="93" y="97" width="168" height="7" rx="3.5" fill="#261633" />
              <rect x="94" y="86" width="4" height="8" rx="2" fill="#f43f5e" />
              <rect x="253" y="86" width="5" height="8" rx="2.5" fill="#fde047" />
            </g>

            {/* Wheel arches */}
            <circle cx="130" cy="106" r="15.5" fill="#e6dcef" />
            <circle cx="228" cy="106" r="15.5" fill="#e6dcef" />

            {/* Rear spinning wheel */}
            <g className="transit-wheel" style={{ transformOrigin: '130px 106px' }}>
              <circle cx="130" cy="106" r="13" fill="#23162e" />
              <circle cx="130" cy="106" r="7.5" fill="#f3eef8" />
              <rect x="128.5" y="98.5" width="3" height="15" rx="1" fill="#6f4f86" />
              <rect x="122.5" y="104.5" width="15" height="3" rx="1" fill="#6f4f86" />
              <circle cx="130" cy="106" r="3" fill="#382448" />
            </g>

            {/* Front spinning wheel */}
            <g className="transit-wheel" style={{ transformOrigin: '228px 106px' }}>
              <circle cx="228" cy="106" r="13" fill="#23162e" />
              <circle cx="228" cy="106" r="7.5" fill="#f3eef8" />
              <rect x="226.5" y="98.5" width="3" height="15" rx="1" fill="#6f4f86" />
              <rect x="220.5" y="104.5" width="15" height="3" rx="1" fill="#6f4f86" />
              <circle cx="228" cy="106" r="3" fill="#382448" />
            </g>
          </g>
        </svg>
      </div>

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
