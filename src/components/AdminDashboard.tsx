import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { store } from '../config/store.ts'
import type { AdminAuth, AdminOrders, OrderAudit, ShopOrder, SinpeSettings } from '../order-types.ts'
import { adminLogin, adminLogout, adminOrder, adminOrders, adminSession, adminSettings, adminSetup, ApiError, errorMessage, orderDate, reviewOrder, saveSettings } from '../lib/orders-api.ts'
import { money } from '../lib/shop.ts'
import { Icon } from './Icon.tsx'
import { Modal } from './ui.tsx'
import { OrderLines } from './OrderPanel.tsx'

type OrderDetail = { order: ShopOrder; audit: OrderAudit[] }

const shortDate = (value: string) => new Intl.DateTimeFormat('es-CR', {
  timeZone: 'America/Costa_Rica',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
}).format(new Date(value))

function summarizeOrderLines(order: ShopOrder) {
  return order.lines.map(line => `${line.quantity}× ${line.name}${line.options.length ? ` (${line.options.join(', ')})` : ''}`).join(' · ')
}

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
  return <main className="admin-access">
    <a className="wordmark" href="/">{store.name}<span className="brand-dot">.</span></a>
    <div className="admin-access-card">
      <div className="admin-access-head">
        <div className="admin-access-icon"><Icon name="lock" size={20} /></div>
        <div>
          <span className="eyebrow">ADMINISTRACIÓN</span>
          <h1>{initialized ? 'Iniciar sesión' : 'Configurar acceso'}</h1>
        </div>
      </div>
      <form onSubmit={event => { void submit(event) }}><fieldset disabled={busy}>
        {!initialized && <div className="form-field"><label htmlFor="admin-setup-token">Código de instalación</label><input id="admin-setup-token" autoComplete="off" spellCheck={false} required minLength={43} maxLength={43} value={setupToken} onChange={event => setSetupToken(event.target.value)} aria-describedby="setup-code-help" /><small className="small-note" id="setup-code-help">En <code>.data/store/admin-setup-token.txt</code>.</small></div>}
        <div className="form-field"><label htmlFor="admin-username">Usuario</label><input id="admin-username" autoComplete="username" required minLength={3} maxLength={40} value={username} onChange={event => setUsername(event.target.value)} /></div>
        <div className="form-field"><label htmlFor="admin-password">Contraseña</label><input id="admin-password" type="password" autoComplete={initialized ? 'current-password' : 'new-password'} required minLength={initialized ? undefined : 12} maxLength={200} value={password} onChange={event => setPassword(event.target.value)} />{!initialized && <small className="small-note">Mínimo 12 caracteres.</small>}</div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" className="button button-primary">{busy ? 'Validando…' : initialized ? 'Entrar' : 'Crear acceso'}<Icon name="arrow" size={16} /></button>
      </fieldset></form>
    </div>
    <a className="text-button" href="/">Volver a la tienda</a>
  </main>
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
  return <section className="admin-settings-panel" aria-labelledby="settings-title">
    <div className="admin-settings-head">
      <h2 id="settings-title">Datos de SINPE Móvil</h2>
      <p>Datos que verá el cliente al realizar su pedido.</p>
    </div>
    <form className="admin-settings-form" onSubmit={event => { void submit(event) }}><fieldset disabled={busy}>
      <label className="privacy-check"><input type="checkbox" checked={settings.enabled} onChange={event => { setSettings(current => ({ ...current, enabled: event.target.checked })); setSaved(false) }} /><span>Habilitar pagos por SINPE Móvil</span></label>
      <div className="admin-settings-grid">
        <div className="form-field"><label htmlFor="sinpe-phone">Número SINPE</label><input id="sinpe-phone" type="tel" inputMode="tel" autoComplete="off" required={settings.enabled} maxLength={24} value={settings.phone} onChange={event => { setSettings(current => ({ ...current, phone: event.target.value })); setVerified(false); setSaved(false) }} placeholder="8 dígitos" /></div>
        <div className="form-field"><label htmlFor="sinpe-bank">Banco</label><input id="sinpe-bank" readOnly value="BAC Credomatic" /></div>
      </div>
      <div className="form-field"><label htmlFor="sinpe-beneficiary">Nombre del beneficiario</label><input id="sinpe-beneficiary" autoComplete="off" required={settings.enabled} minLength={settings.enabled ? 3 : undefined} maxLength={120} value={settings.beneficiary} onChange={event => { setSettings(current => ({ ...current, beneficiary: event.target.value })); setVerified(false); setSaved(false) }} placeholder="Nombre titular de la cuenta" /></div>
      {settings.enabled && <label className="privacy-check"><input type="checkbox" checked={verified} required onChange={event => setVerified(event.target.checked)} /><span>Confirmo que el número y beneficiario son correctos.</span></label>}
      {error && <p className="field-error" role="alert">{error}</p>}
      {saved && <p className="admin-success" role="status">Configuración SINPE guardada.</p>}
      <button type="submit" className="button button-primary" disabled={busy || (settings.enabled && !verified)}><Icon name="check" size={16} />{busy ? 'Guardando…' : 'Guardar cambios'}</button>
    </fieldset></form>
  </section>
}

function AdminOrderDialog({ detail, onClose, onChanged }: { detail: OrderDetail; onClose: () => void; onChanged: (order: ShopOrder) => void }) {
  const order = detail.order
  const isPaid = order.status === 'ready'
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const confirmPayment = async () => {
    if (busy || isPaid) return
    setBusy(true); setError('')
    try {
      const payload = order.receipt && order.status === 'pending_review'
        ? { version: order.version, receiptId: order.receipt.id }
        : { version: order.version }
      onChanged(await reviewOrder(order.id, 'confirm', payload))
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const receiptUrl = order.receipt ? `/api/admin/orders/${order.id}/receipts/${order.receipt.id}` : ''
  return <Modal open onClose={onClose} titleId="admin-order-title" className="admin-order-dialog">
    <header className="admin-detail-header">
      <div className="admin-detail-title-group">
        <h2 id="admin-order-title">{order.code}</h2>
        <span className={`order-status ${isPaid ? 'status-ready' : 'status-awaiting_payment'}`}>{isPaid ? 'Pagada' : 'Pendiente'}</span>
      </div>
      <button className="icon-button" onClick={onClose} aria-label="Cerrar detalle del pedido"><Icon name="close" size={18} /></button>
    </header>
    <div className="admin-detail-body">
      <div className="admin-detail-action-bar">
        <div className="admin-detail-total">
          <small>Total de la orden</small>
          <strong>{order.totalMinor === null ? 'Por cotizar' : money(order.totalMinor, store)}</strong>
        </div>
        {isPaid ? (
          <span className="admin-paid-pill"><Icon name="check" size={15} /> Pagada</span>
        ) : (
          <button type="button" className="admin-mark-paid is-large" disabled={busy} onClick={() => { void confirmPayment() }}>
            <span className="admin-checkbox-box"><Icon name="check" size={13} /></span>
            <span>{busy ? 'Marcando…' : 'Marcar como pagada'}</span>
          </button>
        )}
      </div>
      {error && <p className="field-error admin-action-error" role="alert">{error}</p>}
      <section className="admin-detail-section">
        <h3>Cliente y entrega</h3>
        <dl className="admin-facts">
          <div><dt>Cliente</dt><dd>{order.customer.name}</dd></div>
          <div><dt>Teléfono</dt><dd><a href={`tel:+506${order.customer.phone}`}>+506 {order.customer.phone}</a></dd></div>
          <div><dt>Entrega</dt><dd>{order.delivery.name}</dd></div>
          {order.customer.address && <div><dt>Dirección</dt><dd>{order.customer.address}</dd></div>}
          {order.customer.notes && <div><dt>Notas</dt><dd>{order.customer.notes}</dd></div>}
          <div><dt>Fecha</dt><dd>{orderDate(order.createdAt)}</dd></div>
          {order.paymentConfirmedAt && <div><dt>Pagado</dt><dd>{orderDate(order.paymentConfirmedAt)}</dd></div>}
        </dl>
      </section>
      <section className="admin-detail-section">
        <h3>Productos</h3>
        <OrderLines order={order} />
        <dl className="order-totals">
          <div><dt>Subtotal</dt><dd>{money(order.subtotalMinor, store)}</dd></div>
          <div><dt>Envío</dt><dd>{order.shippingMinor === null ? 'Por cotizar' : money(order.shippingMinor, store)}</dd></div>
          <div className="total-row"><dt>Total</dt><dd>{order.totalMinor === null ? 'Por confirmar' : money(order.totalMinor, store)}</dd></div>
        </dl>
      </section>
      {order.receipt && (
        <section className="admin-detail-section">
          <div className="admin-section-title">
            <h3>Comprobante adjunto</h3>
            <a className="text-button" href={receiptUrl} target="_blank" rel="noopener noreferrer" download><Icon name="download" size={14} />Descargar</a>
          </div>
          <p className="small-note">Enviado: <strong>{orderDate(order.receipt.submittedAt)}</strong></p>
          {order.receipt.contentType === 'image/webp' ? (
            <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
              <img className="admin-receipt-image" src={receiptUrl} alt={`Comprobante ${order.code}`} />
            </a>
          ) : (
            <div className="admin-pdf-card"><Icon name="receipt" size={28} /><p>Archivo PDF adjunto</p></div>
          )}
        </section>
      )}
    </div>
  </Modal>
}

function AdminWorkspace({ auth, onExit }: { auth: AdminAuth; onExit: () => void }) {
  const [tab, setTab] = useState<'orders' | 'settings'>('orders')
  const [settings, setSettings] = useState<SinpeSettings | null>(null)
  const [data, setData] = useState<AdminOrders | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'ready'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [detail, setDetail] = useState<OrderDetail | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
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
    setMessage(`${order.code} marcada como pagada.`)
    setDetail(current => current?.order.id === order.id ? { ...current, order } : current)
    setData(current => current ? {
      ...current,
      orders: current.orders.map(item => item.id === order.id ? order : item),
    } : current)
    setRevision(current => current + 1)
  }

  const markAsPaid = async (order: ShopOrder) => {
    if (confirmingId || order.status === 'ready') return
    setConfirmingId(order.id)
    setError('')
    setMessage('')
    try {
      const payload = order.receipt && order.status === 'pending_review'
        ? { version: order.version, receiptId: order.receipt.id }
        : { version: order.version }
      const updated = await reviewOrder(order.id, 'confirm', payload)
      changed(updated)
    } catch (error) {
      setError(errorMessage(error))
    } finally {
      setConfirmingId(null)
    }
  }

  const logout = async () => {
    try { await adminLogout(); onExit() }
    catch (error) { if (error instanceof ApiError && error.status === 401) onExit(); else setError(errorMessage(error)) }
  }

  const counts = data?.counts
  const pendingCount = (counts?.pending_details ?? 0) + (counts?.awaiting_payment ?? 0) + (counts?.pending_review ?? 0) + (counts?.rejected ?? 0)
  const paidCount = counts?.ready ?? 0
  const totalCount = pendingCount + paidCount

  return <div className="admin-page">
    <header className="admin-topbar">
      <div className="admin-topbar-brand">
        <a className="wordmark" href="/">{store.name}<span className="brand-dot">.</span></a>
        <span className="admin-topbar-badge">Admin</span>
      </div>
      <nav className="admin-nav-pills" aria-label="Administración">
        <button
          type="button"
          className={tab === 'orders' ? 'is-active' : ''}
          onClick={() => setTab('orders')}
          aria-current={tab === 'orders' ? 'page' : undefined}
        >
          Pedidos
        </button>
        <button
          type="button"
          className={tab === 'settings' ? 'is-active' : ''}
          onClick={() => setTab('settings')}
          aria-current={tab === 'settings' ? 'page' : undefined}
        >
          SINPE
        </button>
      </nav>
      <div className="admin-topbar-actions">
        <span className="admin-user-label">{auth.username}</span>
        {tab === 'orders' && (
          <button className="icon-button" disabled={loading} onClick={() => setRevision(current => current + 1)} aria-label="Actualizar pedidos">
            <Icon name="refresh" size={16} />
          </button>
        )}
        <button className="icon-button" onClick={() => { void logout() }} aria-label="Cerrar sesión administrativa">
          <Icon name="logout" size={16} />
        </button>
      </div>
    </header>

    <main className="admin-main">
      {error && <p className="admin-banner is-error" role="alert">{error}</p>}
      {message && <p className="admin-banner is-success" role="status">{message}</p>}

      {tab === 'settings' ? (
        settings ? <SettingsPanel initial={settings} onSaved={setSettings} /> : <p className="admin-loading" role="status">Cargando configuración…</p>
      ) : (
        <>
          {settings && !settings.enabled && (
            <div className="admin-banner">
              <Icon name="info" size={16} />
              <p>SINPE no configurado.</p>
              <button className="text-button" onClick={() => setTab('settings')}>Configurar</button>
            </div>
          )}

          <div className="admin-controls">
            <div className="admin-filter-pills" role="group" aria-label="Filtrar por estado">
              <button
                type="button"
                className={filter === 'all' ? 'is-active' : ''}
                onClick={() => { setFilter('all'); setPage(1) }}
                aria-pressed={filter === 'all'}
              >
                Todas <span>{counts ? totalCount : '—'}</span>
              </button>
              <button
                type="button"
                className={filter === 'pending' ? 'is-active' : ''}
                onClick={() => { setFilter('pending'); setPage(1) }}
                aria-pressed={filter === 'pending'}
              >
                Pendientes <span>{counts ? pendingCount : '—'}</span>
              </button>
              <button
                type="button"
                className={filter === 'ready' ? 'is-active' : ''}
                onClick={() => { setFilter('ready'); setPage(1) }}
                aria-pressed={filter === 'ready'}
              >
                Pagadas <span>{counts ? paidCount : '—'}</span>
              </button>
            </div>

            <div className="admin-search">
              <Icon name="search" size={15} />
              <label htmlFor="order-search" className="sr-only">Buscar por código o cliente</label>
              <input
                id="order-search"
                placeholder="Buscar orden o cliente…"
                value={search}
                onChange={event => { setSearch(event.target.value); setPage(1) }}
                maxLength={80}
              />
              {search && (
                <button type="button" className="admin-search-clear" onClick={() => { setSearch(''); setPage(1) }} aria-label="Limpiar búsqueda">
                  <Icon name="close" size={14} />
                </button>
              )}
            </div>
          </div>

          <section className="admin-orders-section" aria-label="Lista de pedidos">
            {data?.orders.length ? (
              <div className="admin-order-list">
                {data.orders.map(order => {
                  const isPaid = order.status === 'ready'
                  const busy = confirmingId === order.id
                  return (
                    <article key={order.id} className={`admin-order-card ${isPaid ? 'is-paid' : ''}`}>
                      <div className="admin-order-card-top">
                        <div className="admin-order-id-wrap">
                          <strong className="admin-order-code">{order.code}</strong>
                          <time className="admin-order-date">{shortDate(order.createdAt)}</time>
                        </div>
                        <div className="admin-order-price-wrap">
                          <strong className="admin-order-amount">{order.totalMinor === null ? 'Por cotizar' : money(order.totalMinor, store)}</strong>
                          <span className={`order-status ${isPaid ? 'status-ready' : 'status-awaiting_payment'}`}>
                            {isPaid ? 'Pagada' : 'Pendiente'}
                          </span>
                        </div>
                      </div>

                      <div className="admin-order-card-body">
                        <div className="admin-order-customer">
                          <strong>{order.customer.name}</strong>
                          <span>·</span>
                          <a href={`tel:+506${order.customer.phone}`}>{order.customer.phone}</a>
                          <span>·</span>
                          <span>{order.delivery.name}</span>
                        </div>
                        <p className="admin-order-items">{summarizeOrderLines(order)}</p>
                      </div>

                      <div className="admin-order-card-footer">
                        <button
                          type="button"
                          className="admin-detail-btn"
                          onClick={() => { void openOrder(order.id) }}
                        >
                          {order.receipt ? <><Icon name="receipt" size={14} />Ver comprobante</> : 'Ver detalle'}
                        </button>

                        {isPaid ? (
                          <span className="admin-paid-pill">
                            <Icon name="check" size={14} /> Pagada
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="admin-mark-paid"
                            disabled={busy}
                            onClick={() => { void markAsPaid(order) }}
                            aria-label={`Marcar orden ${order.code} como pagada`}
                          >
                            <span className="admin-checkbox-box"><Icon name="check" size={12} /></span>
                            <span>{busy ? 'Guardando…' : 'Marcar pagada'}</span>
                          </button>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="admin-empty">
                <Icon name="bag" size={28} />
                <h3>{loading ? 'Consultando pedidos…' : 'Sin pedidos'}</h3>
                <p>{search || filter !== 'all' ? 'No hay órdenes para este filtro.' : 'Las órdenes nuevas aparecerán aquí.'}</p>
              </div>
            )}

            {data && data.total > data.pageSize && (
              <div className="admin-pagination">
                <button className="button button-outline" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Anterior</button>
                <span>{page} / {Math.ceil(data.total / data.pageSize)}</span>
                <button className="button button-outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)}>Siguiente</button>
              </div>
            )}
          </section>
        </>
      )}
    </main>

    {detail && (
      <AdminOrderDialog
        key={detail.order.id}
        detail={detail}
        onClose={() => { openSequence.current++; setDetail(null) }}
        onChanged={changed}
      />
    )}
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
