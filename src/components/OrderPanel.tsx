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

export function OrderPanel({ order, onChange, onRefresh, onNew, busy }: {
  order: ShopOrder; onChange: (order: ShopOrder) => void; onRefresh: () => void; onNew: () => void; busy: boolean
}) {
  const [code, setCode] = useState('')
  const [reference, setReference] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [copy, setCopy] = useState('')
  const codeRef = useRef<HTMLInputElement>(null)
  const uploadKey = useRef<{ fingerprint: string; key: string } | null>(null)
  const canSubmit = order.status === 'awaiting_payment' || order.status === 'rejected'
  useEffect(() => {
    if (!file?.type.startsWith('image/')) { setPreview(''); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  const copyValue = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setCopy('Copiado') }
    catch { codeRef.current?.focus(); codeRef.current?.select(); setCopy('Selecciona y copia el código manualmente.') }
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!file) { setError('Selecciona tu comprobante antes de enviarlo.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('El comprobante no puede superar 5 MB.'); return }
    if (code.trim().toUpperCase() !== order.code) { setError('El código no corresponde a este pedido. Copia el código que aparece arriba.'); return }
    const fingerprint = JSON.stringify({ id: order.id, version: order.version, code, reference, file: [file.name, file.size, file.lastModified] })
    if (uploadKey.current?.fingerprint !== fingerprint) uploadKey.current = { fingerprint, key: crypto.randomUUID() }
    setSending(true)
    try {
      onChange(await uploadReceipt(order, code, reference, file, uploadKey.current.key))
      setFile(null)
    } catch (error) { setError(errorMessage(error)) }
    finally { setSending(false) }
  }
  const title = order.status === 'ready' ? 'Pago confirmado.' : order.status === 'pending_review' ? 'Estamos revisando tu pago.'
    : order.status === 'pending_details' ? 'Tu pedido está registrado.' : order.status === 'rejected' ? 'Revisemos tu comprobante.' : 'Un SINPE y casi listo.'

  return <section className="sinpe-order-panel" aria-labelledby="sinpe-order-title">
    <div className={`order-status-illustration ${order.status === 'ready' ? 'is-confirmed' : ''}`}><Icon name={order.status === 'ready' ? 'check' : order.status === 'pending_review' ? 'clock' : 'bank'} size={30} /></div>
    <span className={`order-status status-${order.status}`}>{orderStatusLabels[order.status]}</span>
    <h3 id="sinpe-order-title">{title}</h3>
    <p>{order.status === 'pending_review' ? 'Validamos el código del pedido y recibimos tu archivo. La tienda debe comprobar el abono en BAC antes de confirmar el pago.'
      : order.status === 'ready' ? 'La tienda confirmó manualmente tu pago. Tu pedido está listo para empezar a prepararse; todavía no significa que esté listo para entregar.'
      : order.status === 'pending_details' ? 'Tu pedido ya tiene el costo de entrega calculado. La tienda debe habilitar sus datos SINPE antes de solicitarte el pago.'
      : 'Usa el código de tu pedido en el detalle del SINPE y luego adjunta el comprobante. Subirlo no confirma automáticamente el pago.'}</p>
    {order.demo && <p className="payment-warning"><Icon name="info" size={17} />Demostración: los precios de los productos son de ejemplo. No envíes dinero real.</p>}
    <div className="sinpe-pay-card">
      <div className="sinpe-pay-head">
        <img src="/images/sinpe-movil.png" alt="SINPE Móvil" width="64" height="64" />
        <div><strong>Paga con SINPE Móvil</strong><small>Desde la app de tu banco</small></div>
        {order.totalMinor !== null && order.status !== 'pending_details' && <span className="sinpe-pay-amount"><small>Total</small>{money(order.totalMinor, store)}</span>}
      </div>
      <div className="payment-code-card">
        <label htmlFor="assigned-order-code">Código de tu pedido · escríbelo en el detalle</label>
        <input id="assigned-order-code" ref={codeRef} readOnly value={order.code} onFocus={event => event.currentTarget.select()} />
        <button type="button" className="code-copy-button" onClick={() => { void copyValue(order.code) }} aria-label="Copiar código del pedido"><Icon name={copy === 'Copiado' ? 'check' : 'copy'} size={16} />{copy === 'Copiado' ? 'Copiado' : 'Copiar código'}</button>
        <small role="status">{copy && copy !== 'Copiado' ? copy : 'Cópialo completo, sin espacios, en el detalle de la transferencia.'}</small>
      </div>
      {order.destination && order.totalMinor !== null && order.status !== 'pending_details' && <dl className="sinpe-instructions">
        <div><dt><span className="sinpe-step">1</span>SINPE Móvil · {order.destination.bank}</dt><dd>{order.destination.phone.slice(0, 4)} {order.destination.phone.slice(4)}</dd></div>
        <div><dt><span className="sinpe-step">2</span>Beneficiario</dt><dd>{order.destination.beneficiary}</dd></div>
        <div><dt><span className="sinpe-step">3</span>Monto exacto · CRC</dt><dd>{money(order.totalMinor, store)}</dd></div>
      </dl>}
    </div>
    {order.customerMessage && <p className="notice payment-message" role="status">{order.customerMessage}</p>}
    <details className="recorded-order-summary"><summary>Ver productos y entrega <Icon name="chevron" size={16} /></summary><OrderLines order={order} /><p>{order.delivery.name} · {order.customer.name}{order.customer.address ? ` · ${order.customer.address}` : ''}</p></details>
    {canSubmit && <form className="receipt-form" onSubmit={event => { void submit(event) }}>
      <div className="form-heading"><span className="step-marker">03</span><h3>Adjunta tu comprobante</h3></div>
      <fieldset disabled={sending}>
        <div className="form-field"><label htmlFor="receipt-order-code">Código del pedido <span aria-hidden="true">*</span></label><input id="receipt-order-code" autoComplete="off" spellCheck={false} maxLength={20} required value={code} onChange={event => setCode(event.target.value.toUpperCase())} placeholder="Pega el código mostrado arriba" /></div>
        <div className="form-field"><label htmlFor="receipt-bank-reference">Referencia bancaria del SINPE <span aria-hidden="true">*</span></label><input id="receipt-bank-reference" autoComplete="off" spellCheck={false} minLength={6} maxLength={80} required value={reference} onChange={event => setReference(event.target.value)} aria-describedby="bank-reference-help" placeholder="Número de referencia de tu transferencia" /><small id="bank-reference-help" className="small-note">No es el código del pedido. Aparece en el comprobante de tu banco.</small></div>
        <label className={`receipt-dropzone ${file ? 'has-file' : ''}`} htmlFor="receipt-file"><Icon name="upload" size={24} /><strong>{file ? file.name : 'Seleccionar comprobante'}</strong><span>JPG, PNG, WebP o PDF · máximo 5 MB</span><input id="receipt-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required onChange={event => { setFile(event.target.files?.[0] ?? null); setError('') }} /></label>
        {preview && <img className="receipt-local-preview" src={preview} alt="Vista previa del comprobante seleccionado" />}
        <p className="small-note">El archivo es privado: solo tú y la administración podrán consultarlo. No adjuntes contraseñas, OTP ni números completos de cuenta que no sean necesarios.</p>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" className="button button-primary"><Icon name="receipt" size={18} />{sending ? 'Enviando comprobante…' : 'Enviar comprobante para revisión'}</button>
      </fieldset>
    </form>}
    {order.receipt && !canSubmit && <div className="receipt-received"><Icon name="receipt" size={20} /><div><strong>Comprobante recibido</strong><small>Referencia: {order.receipt.bankReference}</small></div><a className="icon-button" href={`/api/orders/${order.id}/receipts/${order.receipt.id}`} target="_blank" rel="noopener noreferrer" aria-label="Consultar mi comprobante"><Icon name="download" size={18} /></a></div>}
    <div className="order-panel-actions"><button type="button" className="button button-outline" disabled={busy || sending} onClick={onRefresh}><Icon name="refresh" size={17} />{busy ? 'Consultando…' : 'Actualizar estado'}</button><button type="button" className="text-button" disabled={sending} onClick={onNew}>Hacer otro pedido</button></div>
    <p className="small-note">El seguimiento se conserva en este navegador mediante una cookie privada de compra. La confirmación bancaria automática todavía no está conectada.</p>
  </section>
}
