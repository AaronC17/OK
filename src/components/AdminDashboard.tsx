import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { store } from '../config/store.ts'
import { orderStatusLabels } from '../order-types.ts'
import type { AdminAuth, AdminOrders, OrderAudit, ShopOrder, SinpeSettings } from '../order-types.ts'
import { adminLogin, adminLogout, adminOrder, adminOrders, adminSession, adminSettings, adminSetup, amountFromInput, ApiError, errorMessage, orderDate, reviewOrder, saveSettings } from '../lib/orders-api.ts'
import { money } from '../lib/shop.ts'
import { Icon } from './Icon.tsx'
import { Modal } from './ui.tsx'
import { OrderLines } from './OrderPanel.tsx'

type OrderDetail = { order: ShopOrder; audit: OrderAudit[] }

function AdminAccess({ initialized, onSuccess }: { initialized: boolean; onSuccess: (auth: AdminAuth) => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [setupToken, setSetupToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const auth = initialized ? await adminLogin(username, password) : await adminSetup(setupToken.trim(), username, password)
      setPassword('')
      setSetupToken('')
      onSuccess(auth)
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  return <main className="admin-access"><a className="wordmark" href="/">{store.name}<span className="brand-dot">.</span></a><div className="admin-access-card"><div className="admin-access-icon"><Icon name="lock" size={28} /></div><span className="eyebrow">SOLO PARA EL EQUIPO</span><h1>{initialized ? 'Bienvenido de nuevo.' : 'Tu tienda, bajo control.'}</h1><p>{initialized ? 'Entra para revisar comprobantes y confirmar pedidos.' : 'Crea el acceso privado de administración. No hay una contraseña predeterminada.'}</p>
    <form onSubmit={event => { void submit(event) }}><fieldset disabled={busy}>
      {!initialized && <div className="form-field"><label htmlFor="admin-setup-token">Código de instalación</label><input id="admin-setup-token" autoComplete="off" spellCheck={false} required minLength={43} maxLength={43} value={setupToken} onChange={event => setSetupToken(event.target.value)} aria-describedby="setup-code-help" /><small className="small-note" id="setup-code-help">Está en <code>.data/store/admin-setup-token.txt</code> en este equipo. No lo compartas. Deja de funcionar al crear tu cuenta.</small></div>}
      <div className="form-field"><label htmlFor="admin-username">Usuario</label><input id="admin-username" autoComplete="username" required minLength={3} maxLength={40} value={username} onChange={event => setUsername(event.target.value)} /></div>
      <div className="form-field"><label htmlFor="admin-password">Contraseña</label><input id="admin-password" type="password" autoComplete={initialized ? 'current-password' : 'new-password'} required minLength={initialized ? undefined : 12} maxLength={200} value={password} onChange={event => setPassword(event.target.value)} />{!initialized && <small className="small-note">Al menos 12 caracteres. Usa una contraseña distinta de tu banca.</small>}</div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button type="submit" className="button button-primary">{busy ? 'Validando acceso…' : initialized ? 'Entrar a administración' : 'Crear acceso administrativo'}<Icon name="arrow" size={18} /></button>
    </fieldset></form><p className="admin-access-note"><Icon name="shield" size={16} />Este panel no solicita tu usuario, contraseña ni OTP bancarios.</p></div><a className="text-button" href="/">Volver a la tienda</a></main>
}

function SettingsPanel({ initial, onSaved }: { initial: SinpeSettings; onSaved: (settings: SinpeSettings) => void }) {
  const [settings, setSettings] = useState(initial)
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true); setError(''); setSaved(false)
    try { const result = await saveSettings(settings); setSettings(result); onSaved(result); setSaved(true); setVerified(false) }
    catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  return <section className="admin-settings-panel" aria-labelledby="settings-title"><div><span className="eyebrow">EL DESTINO CORRECTO, SIEMPRE</span><h2 id="settings-title">Tu SINPE Móvil</h2><p>Estos datos se mostrarán al comprador. Los pedidos que ya tienen instrucciones conservarán el destino y el monto originales.</p><div className="admin-security-note"><Icon name="shield" size={24} /><div><strong>Revisión manual por ahora</strong><p>Registrar un código y un archivo no verifica un abono. Comprueba el pago en BAC antes de confirmarlo. La conexión automática con banca en línea se implementará después.</p></div></div></div>
    <form className="admin-settings-form" onSubmit={event => { void submit(event) }}><fieldset disabled={busy}>
      <label className="privacy-check"><input type="checkbox" checked={settings.enabled} onChange={event => { setSettings(current => ({ ...current, enabled: event.target.checked })); setSaved(false) }} /><span>Habilitar instrucciones de pago por SINPE Móvil</span></label>
      <div className="form-field"><label htmlFor="sinpe-phone">Número SINPE receptor</label><input id="sinpe-phone" type="tel" inputMode="tel" autoComplete="off" required={settings.enabled} maxLength={24} value={settings.phone} onChange={event => { setSettings(current => ({ ...current, phone: event.target.value })); setVerified(false); setSaved(false) }} placeholder="8 dígitos de Costa Rica" /></div>
      <div className="form-field"><label htmlFor="sinpe-beneficiary">Nombre exacto del beneficiario</label><input id="sinpe-beneficiary" autoComplete="off" required={settings.enabled} minLength={settings.enabled ? 3 : undefined} maxLength={120} value={settings.beneficiary} onChange={event => { setSettings(current => ({ ...current, beneficiary: event.target.value })); setVerified(false); setSaved(false) }} placeholder="Como aparece en la confirmación del banco" /></div>
      <div className="form-field"><label htmlFor="sinpe-bank">Banco receptor</label><input id="sinpe-bank" readOnly value="BAC Credomatic" /></div>
      {settings.enabled && <label className="privacy-check"><input type="checkbox" checked={verified} required onChange={event => setVerified(event.target.checked)} /><span>Verifiqué que este número y beneficiario corresponden a mi cuenta receptora.</span></label>}
      {store.demo && <p className="payment-warning"><Icon name="info" size={17} />El catálogo sigue en demostración. Confirma precios, entrega y condiciones antes de recibir dinero real.</p>}
      {error && <p className="field-error" role="alert">{error}</p>}{saved && <p className="admin-success" role="status">Configuración SINPE guardada.</p>}
      <button type="submit" className="button button-primary" disabled={busy || (settings.enabled && !verified)}><Icon name="check" size={18} />{busy ? 'Guardando…' : 'Guardar configuración SINPE'}</button>
    </fieldset></form></section>
}

function AdminOrderDialog({ detail, onClose, onChanged, onRefresh }: { detail: OrderDetail; onClose: () => void; onChanged: (order: ShopOrder) => void; onRefresh: () => void }) {
  const order = detail.order
  const [code, setCode] = useState('')
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [checked, setChecked] = useState(false)
  const [shipping, setShipping] = useState(order.shippingMinor === null ? '' : (order.shippingMinor / 100).toFixed(2))
  const [correction, setCorrection] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const perform = async (action: 'quote' | 'confirm' | 'reject', event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const payload = action === 'quote' ? { version: order.version, shippingMinor: amountFromInput(shipping), note }
        : action === 'reject' ? { version: order.version, reason }
        : { version: order.version, code, bankReference: reference, amountMinor: amountFromInput(amount), checkedBank: checked, note }
      onChanged(await reviewOrder(order.id, action, payload))
      setNote(''); setChecked(false); setCorrection(false)
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const receiptUrl = order.receipt ? `/api/admin/orders/${order.id}/receipts/${order.receipt.id}` : ''
  return <Modal open onClose={onClose} titleId="admin-order-title" className="admin-order-dialog"><header className="admin-detail-header"><div><span className="eyebrow">DETALLE DEL PEDIDO</span><h2 id="admin-order-title">{order.code}</h2><span className={`order-status status-${order.status}`}>{orderStatusLabels[order.status]}</span></div><button className="icon-button" onClick={onClose} aria-label="Cerrar detalle del pedido"><Icon name="close" /></button></header>
    <div className="admin-detail-grid"><div className="admin-order-information"><section><h3>Cliente y entrega</h3><dl className="admin-facts"><div><dt>Nombre</dt><dd>{order.customer.name}</dd></div><div><dt>Contacto</dt><dd><a href={`tel:+506${order.customer.phone}`}>+506 {order.customer.phone}</a></dd></div><div><dt>Entrega</dt><dd>{order.delivery.name}</dd></div>{order.customer.address && <div><dt>Dirección</dt><dd>{order.customer.address}</dd></div>}{order.customer.notes && <div><dt>Observaciones</dt><dd>{order.customer.notes}</dd></div>}<div><dt>Creado</dt><dd>{orderDate(order.createdAt)}</dd></div></dl></section>
      <section><h3>Productos</h3><OrderLines order={order} /><dl className="order-totals"><div><dt>Subtotal</dt><dd>{money(order.subtotalMinor, store)}</dd></div><div><dt>Entrega</dt><dd>{order.shippingMinor === null ? 'Por cotizar' : money(order.shippingMinor, store)}</dd></div><div className="total-row"><dt>Total</dt><dd>{order.totalMinor === null ? 'Por confirmar' : money(order.totalMinor, store)}</dd></div></dl></section>
      {order.destination && <section><h3>Destino de este pedido</h3><p className="small-note">{order.destination.bank} · {order.destination.phone}<br />{order.destination.beneficiary}</p></section>}
      {order.demo && <p className="payment-warning"><Icon name="info" size={17} />Pedido de demostración. No representa una verificación automática del banco.</p>}
      <details className="admin-audit"><summary>Historial del pedido <Icon name="chevron" size={16} /></summary><ol>{detail.audit.map((entry, index) => <li key={`${entry.createdAt}-${index}`}><strong>{entry.event}</strong><p>{entry.detail}</p><small>{entry.actor} · {orderDate(entry.createdAt)}</small></li>)}</ol></details>
    </div><div className="admin-payment-review"><section className="admin-receipt-card"><div className="admin-section-title"><h3>Comprobante</h3><Icon name="receipt" size={19} /></div>{order.receipt ? <><p className="small-note">Referencia indicada por el cliente: <strong>{order.receipt.bankReference}</strong></p>{order.receipt.contentType === 'image/webp' ? <a href={receiptUrl} target="_blank" rel="noopener noreferrer"><img className="admin-receipt-image" src={receiptUrl} alt={`Comprobante privado del pedido ${order.code}`} /></a> : <div className="admin-pdf-card"><Icon name="receipt" size={38} /><p>Comprobante PDF</p><small>Por seguridad se descarga; no se ejecuta ni se incrusta en el panel.</small></div>}<a className="button button-outline" href={receiptUrl} target="_blank" rel="noopener noreferrer" download><Icon name="download" size={17} />Descargar comprobante</a></> : <div className="admin-no-receipt"><Icon name="clock" size={30} /><p>El cliente aún no ha enviado un comprobante.</p></div>}</section>
      {error && <p className="field-error admin-action-error" role="alert">{error}</p>}
      {order.status === 'pending_details' && <form className="admin-review-form" onSubmit={event => { void perform('quote', event) }}><h3>Confirmar total e instrucciones</h3><p>Configura primero el SINPE receptor en «Configuración». No se solicitará el pago hasta fijar todos los datos.</p><fieldset disabled={busy}><div className="form-field"><label htmlFor="quote-shipping">Costo de entrega en colones</label><input id="quote-shipping" inputMode="decimal" required value={shipping} readOnly={order.shippingMinor !== null} onChange={event => setShipping(event.target.value)} placeholder="Ejemplo: 1500" /></div><div className="form-field"><label htmlFor="quote-note">Detalle de entrega para el cliente</label><textarea id="quote-note" required minLength={5} maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="Confirma punto, horario o tarifa de entrega" /></div><button type="submit" className="button button-primary">{busy ? 'Guardando…' : 'Confirmar total y habilitar SINPE'}</button></fieldset></form>}
      {order.status === 'pending_review' && !correction && <form className="admin-review-form" onSubmit={event => { void perform('confirm', event) }}><span className="eyebrow">VALIDACIÓN MANUAL</span><h3>Comprueba el abono en BAC</h3><p>Transcribe los datos del movimiento bancario. El comprobante por sí solo no confirma el pago.</p><fieldset disabled={busy}>
        <div className="form-field"><label htmlFor="verified-code">Código verificado en el abono</label><input id="verified-code" autoComplete="off" spellCheck={false} required minLength={20} maxLength={20} value={code} onChange={event => setCode(event.target.value.toUpperCase())} /></div>
        <div className="form-field"><label htmlFor="verified-reference">Referencia bancaria verificada</label><input id="verified-reference" autoComplete="off" required minLength={6} maxLength={80} value={reference} onChange={event => setReference(event.target.value)} /></div>
        <div className="form-field"><label htmlFor="verified-amount">Monto verificado en colones</label><input id="verified-amount" inputMode="decimal" required value={amount} onChange={event => setAmount(event.target.value)} placeholder={order.totalMinor === null ? '' : (order.totalMinor / 100).toFixed(2)} /><small className="small-note">Sin separadores de miles. Debe coincidir exactamente con el total.</small></div>
        <div className="form-field"><label htmlFor="verified-note">Nota de revisión</label><textarea id="verified-note" required minLength={5} maxLength={1000} value={note} onChange={event => setNote(event.target.value)} placeholder="Registro breve de la comprobación realizada" /></div>
        <label className="privacy-check"><input type="checkbox" checked={checked} required onChange={event => setChecked(event.target.checked)} /><span>Comprobé en banca en línea el abono aplicado en la cuenta receptora, con este monto, código y referencia.</span></label>
        <button type="submit" className="button button-primary" disabled={!checked || busy}><Icon name="check" size={18} />{busy ? 'Confirmando…' : 'Confirmar pago y pasar a listo'}</button><button type="button" className="text-button" onClick={() => { setCorrection(true); setError('') }}>Solicitar corrección del comprobante</button>
      </fieldset></form>}
      {order.status === 'pending_review' && correction && <form className="admin-review-form" onSubmit={event => { void perform('reject', event) }}><h3>Solicitar una corrección</h3><p>El cliente verá este motivo y podrá adjuntar un nuevo archivo. No se elimina el historial.</p><fieldset disabled={busy}><div className="form-field"><label htmlFor="receipt-correction">Motivo para el cliente</label><textarea id="receipt-correction" required minLength={5} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></div><button className="button button-primary" type="submit">{busy ? 'Guardando…' : 'Enviar solicitud de corrección'}</button><button className="text-button" type="button" onClick={() => setCorrection(false)}>Volver a verificar</button></fieldset></form>}
      {order.status === 'ready' && <div className="admin-confirmed-card"><Icon name="shield" size={30} /><h3>Pago confirmado manualmente</h3><p>Listo para preparar. No se ha marcado como entregado ni se ha descontado inventario automáticamente.</p>{order.paymentConfirmedAt && <small>{orderDate(order.paymentConfirmedAt)}</small>}</div>}
      {order.status === 'rejected' && <p className="notice payment-message">Corrección solicitada: {order.customerMessage}</p>}
      <button type="button" className="text-button" disabled={busy} onClick={onRefresh}><Icon name="refresh" size={16} />Actualizar este pedido</button>
    </div></div>
  </Modal>
}

function AdminWorkspace({ auth, onExit }: { auth: AdminAuth; onExit: () => void }) {
  const [tab, setTab] = useState<'orders' | 'settings'>('orders')
  const [settings, setSettings] = useState<SinpeSettings | null>(null)
  const [data, setData] = useState<AdminOrders | null>(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const openSequence = useRef(0)
  useEffect(() => { void adminSettings().then(setSettings).catch(error => setError(errorMessage(error))) }, [])
  useEffect(() => {
    let alive = true
    const load = async (quiet = false) => {
      if (!quiet) setLoading(true)
      try {
        const result = await adminOrders(new URLSearchParams({ status: filter, q: search, page: String(page) }))
        if (alive) { setData(result); setError('') }
      } catch (error) {
        if (alive) { if (error instanceof ApiError && error.status === 401) onExit(); else setError(errorMessage(error)) }
      } finally { if (alive) setLoading(false) }
    }
    void load()
    const timer = window.setInterval(() => { if (!document.hidden) void load(true) }, 10_000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [filter, search, page, revision])
  const openOrder = async (id: string) => {
    const sequence = ++openSequence.current
    setError('')
    try { const result = await adminOrder(id); if (sequence === openSequence.current) setDetail(result) }
    catch (error) { setError(errorMessage(error)) }
  }
  const changed = (order: ShopOrder) => {
    setMessage(order.status === 'ready' ? `${order.code}: pago confirmado manualmente. Listo para preparar.` : `${order.code}: cambios guardados.`)
    setDetail(current => current?.order.id === order.id ? { ...current, order } : current)
    void openOrder(order.id)
    setRevision(current => current + 1)
  }
  const logout = async () => {
    try { await adminLogout(); onExit() }
    catch (error) { if (error instanceof ApiError && error.status === 401) onExit(); else setError(errorMessage(error)) }
  }
  const counts = data?.counts
  return <div className="admin-page"><header className="admin-topbar"><a className="wordmark" href="/">{store.name}<span className="brand-dot">.</span></a><span className="admin-topbar-label"><Icon name="shield" size={17} />Administración</span><div><span>{auth.username}</span><button className="icon-button" onClick={() => { void logout() }} aria-label="Cerrar sesión administrativa"><Icon name="logout" size={19} /></button></div></header>
    <main className="admin-main"><div className="admin-page-heading"><div><span className="eyebrow">CADA PEDIDO, EN SU PUNTO</span><h1>{tab === 'orders' ? 'Tus pedidos.' : 'Configuración.'}</h1><p>{tab === 'orders' ? 'Revisa el abono, confirma el pago y empieza a preparar.' : 'Define los datos que tus clientes necesitan para pagar.'}</p></div><nav aria-label="Administración"><button className={`button ${tab === 'orders' ? 'button-primary' : 'button-outline'}`} onClick={() => setTab('orders')} aria-current={tab === 'orders' ? 'page' : undefined}><Icon name="bag" size={17} />Pedidos</button><button className={`button ${tab === 'settings' ? 'button-primary' : 'button-outline'}`} onClick={() => setTab('settings')} aria-current={tab === 'settings' ? 'page' : undefined}><Icon name="settings" size={17} />Configuración</button></nav></div>
      {error && <p className="admin-banner is-error" role="alert">{error}</p>}{message && <p className="admin-banner is-success" role="status">{message}</p>}
      {tab === 'settings' ? settings ? <SettingsPanel initial={settings} onSaved={setSettings} /> : <p role="status">Cargando configuración…</p> : <>
        {settings && !settings.enabled && <div className="admin-banner"><Icon name="info" size={19} /><p>El destino SINPE aún no está habilitado. Los pedidos podrán registrarse, pero no se les pedirá pagar.</p><button className="text-button" onClick={() => setTab('settings')}>Configurar SINPE</button></div>}
        <div className="admin-stats"><button onClick={() => { setFilter('pending_review'); setPage(1) }} aria-pressed={filter === 'pending_review'}><span className="admin-stat-icon"><Icon name="receipt" size={22} /></span><span><small>Comprobantes por revisar</small><strong>{counts?.pending_review ?? '—'}</strong></span></button><button onClick={() => { setFilter('awaiting_payment'); setPage(1) }} aria-pressed={filter === 'awaiting_payment'}><span className="admin-stat-icon"><Icon name="clock" size={22} /></span><span><small>Pendientes de pago</small><strong>{counts?.awaiting_payment ?? '—'}</strong></span></button><button onClick={() => { setFilter('ready'); setPage(1) }} aria-pressed={filter === 'ready'}><span className="admin-stat-icon is-ready"><Icon name="check" size={22} /></span><span><small>Listos para preparar</small><strong>{counts?.ready ?? '—'}</strong></span></button></div>
        <section className="admin-orders-section" aria-labelledby="orders-list-title"><div className="admin-order-toolbar"><h2 id="orders-list-title">Todos tus pedidos <span>{data?.total ?? 0}</span></h2><button className="icon-button" disabled={loading} onClick={() => setRevision(current => current + 1)} aria-label="Actualizar pedidos"><Icon name="refresh" size={18} /></button></div>
          <div className="admin-filters"><div className="admin-search"><Icon name="search" size={18} /><label htmlFor="order-search" className="sr-only">Buscar por código o cliente</label><input id="order-search" placeholder="Buscar código o cliente" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} maxLength={80} /></div><label className="sr-only" htmlFor="order-filter">Filtrar pedidos por estado</label><select id="order-filter" value={filter} onChange={event => { setFilter(event.target.value); setPage(1) }}><option value="all">Todos los estados</option><option value="pending">Todos los pendientes</option>{Object.entries(orderStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
          <div className="admin-table-shell"><table className="admin-orders-table"><thead><tr><th>Pedido</th><th>Cliente</th><th>Total</th><th>Estado</th><th><span className="sr-only">Acciones</span></th></tr></thead><tbody>{data?.orders.map(order => <tr key={order.id}><td><strong>{order.code}</strong><small>{orderDate(order.createdAt)}</small></td><td>{order.customer.name}<small>{order.delivery.name}</small></td><td>{order.totalMinor === null ? 'Por cotizar' : money(order.totalMinor, store)}{order.demo && <small>Demostración</small>}</td><td><span className={`order-status status-${order.status}`}>{orderStatusLabels[order.status]}</span></td><td><button className="button button-outline" onClick={() => { void openOrder(order.id) }} aria-label={`Revisar pedido ${order.code}`}>Revisar<Icon name="arrow" size={16} /></button></td></tr>)}</tbody></table></div>
          {!data?.orders.length && <div className="admin-empty"><Icon name="bag" size={38} /><h3>{loading ? 'Consultando pedidos…' : 'Todo empieza con un pedido.'}</h3><p>{search || filter !== 'all' ? 'No hay pedidos para este filtro.' : 'Los pedidos y comprobantes de la tienda aparecerán aquí.'}</p></div>}
          {data && data.total > data.pageSize && <div className="admin-pagination"><button className="button button-outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button><span>Página {page} de {Math.ceil(data.total / data.pageSize)}</span><button className="button button-outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)}>Siguiente</button></div>}
        </section>
        <p className="admin-privacy-note"><Icon name="lock" size={16} />Los comprobantes y datos de clientes son privados. No compartas capturas del panel ni credenciales.</p>
      </>}
    </main>{detail && <AdminOrderDialog key={detail.order.id} detail={detail} onClose={() => { openSequence.current++; setDetail(null) }} onChanged={changed} onRefresh={() => { void openOrder(detail.order.id) }} />}
  </div>
}

export default function AdminDashboard() {
  const [auth, setAuth] = useState<AdminAuth | null>(null)
  const [error, setError] = useState('')
  useEffect(() => { document.title = `Administración — ${store.name}`; void adminSession().then(setAuth).catch(error => setError(errorMessage(error))) }, [])
  if (error) return <main className="admin-access"><h1>No pudimos abrir administración.</h1><p role="alert">{error}</p><button className="button button-primary" onClick={() => window.location.reload()}>Reintentar</button><a href="/" className="text-button">Volver a la tienda</a></main>
  if (!auth) return <main className="admin-access"><p role="status">Abriendo administración…</p></main>
  return auth.authenticated ? <AdminWorkspace auth={auth} onExit={() => setAuth({ initialized: true, authenticated: false, username: null, csrfToken: null })} /> : <AdminAccess initialized={auth.initialized} onSuccess={setAuth} />
}
