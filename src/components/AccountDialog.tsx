import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { CustomerOrders, CustomerReferralsData } from '../account-types.ts'
import type { Customer } from '../hooks/useCustomer.ts'
import { store } from '../config/store.ts'
import { customerOrders, customerReferrals, errorMessage, orderDate } from '../lib/orders-api.ts'
import { money } from '../lib/shop.ts'
import { cartDrawer } from '../lib/dialog-loaders.ts'
import { orderStatusLabels } from '../order-types.ts'
import { GummyBearMark } from './GummyBearMark.tsx'
import { Icon } from './Icon.tsx'
import { Modal, ProductImage } from './ui.tsx'
import '../account.css'

export type AccountMode = 'login' | 'register'
type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'privacy', string>>
const memberSince = new Intl.DateTimeFormat('es-CR', { month: 'short', year: 'numeric', timeZone: 'America/Costa_Rica' })

export function AccountDialog({ open, initialMode, customer, onClose, onOrder, onShop }: {
  open: boolean; initialMode: AccountMode; customer: Customer; onClose: () => void; onOrder: (id: string) => void; onShop: () => void
}) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [referralCode, setReferralCode] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('ref') || ''
    }
    return ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(false)
  const [loadedHistory, setHistory] = useState<{ owner: string; data: CustomerOrders } | null>(null)
  const [historyError, setHistoryError] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [referralsData, setReferralsData] = useState<CustomerReferralsData | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const form = useRef<HTMLFormElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const registering = mode === 'register'
  const user = customer.user
  const history = loadedHistory?.owner === user?.id ? loadedHistory?.data ?? null : null

  useEffect(() => {
    // Reopening shows the last result immediately while revalidating it.
    // The owner check above prevents another account from seeing that history.
    if (!open || !user) return
    let alive = true
    setHistoryLoading(true)
    setHistoryError('')
    void customerOrders(page).then(result => { if (alive) setHistory({ owner: user.id, data: result }) })
      .catch(error => { if (alive) setHistoryError(errorMessage(error)) })
      .finally(() => { if (alive) setHistoryLoading(false) })
    void customerReferrals().then(result => { if (alive) setReferralsData(result) }).catch(() => {})
    return () => { alive = false }
  }, [open, user?.id, page, revision])

  useEffect(() => {
    setPage(1)
    if (!user) { setHistory(null); setHistoryError('') }
  }, [user?.id])
  useEffect(() => {
    setMode(initialMode); setErrors({}); setError(''); setPassword(''); setShowPassword(false)
    if (!open) { setCreated(false); setName(''); setEmail(''); setPrivacy(false) }
  }, [open, initialMode])

  useEffect(() => {
    if (Object.keys(errors).length) form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
  }, [errors])
  useEffect(() => { if (error) errorRef.current?.focus() }, [error])

  const switchMode = (next: AccountMode) => {
    if (next === mode) return
    setMode(next); setErrors({}); setError(''); setPassword(''); setShowPassword(false); setCreated(false)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (busy || customer.loading || customer.error) return
    const next: FieldErrors = {}
    if (registering && name.trim().length < 2) next.name = 'Escribe tu nombre, al menos 2 caracteres.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) next.email = 'Escribe un correo electrónico válido.'
    if (!password.length) next.password = 'Escribe tu contraseña.'
    else if (registering && (password.length < 8 || !password.trim())) next.password = 'Usa al menos 8 caracteres para proteger tu cuenta.'
    if (registering && !privacy) next.privacy = 'Acepta el uso de tus datos para crear tu cuenta.'
    setErrors(next)
    setError('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      if (registering) { await customer.register({ name: name.trim(), email: email.trim(), password, privacyAccepted: privacy, referralCode: referralCode.trim() || undefined }); setCreated(true) }
      else await customer.login(email.trim(), password)
      setPassword(''); setShowPassword(false); setPage(1)
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const logout = async () => {
    if (busy) return
    setBusy(true); setError('')
    try { await customer.logout(); setMode('login'); setCreated(false); setName(''); setEmail(''); setPassword(''); setPrivacy(false); setHistory(null) }
    catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }

  return <Modal open={open} onClose={onClose} titleId="account-title" className={`account-dialog ${user ? 'is-member' : registering ? 'is-register' : 'is-login'}`}>
    <div className="account-topbar">
      <div className="account-brand"><span className="account-brand-symbol" aria-hidden="true"><GummyBearMark /></span><span className="wordmark">{store.name}<span className="brand-dot">.</span></span><span className="account-brand-caption">Mi cuenta</span></div>
      <button type="button" className="icon-button account-close" onClick={onClose} aria-label="Cerrar mi cuenta"><Icon name="close" size={18} /></button>
    </div>
    {user ? <div className="member-content">
      <header className="member-heading">
        <div className="member-profile">
          <div className="member-info">
            <span className="member-eyebrow">MI CUENTA</span>
            <h2 id="account-title">Hola, {user.name.trim().split(/\s+/)[0]}.</h2>
            <p className="member-email">{user.email}</p>
          </div>
          <span className="member-avatar" aria-hidden="true">
            {user.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('es')}
          </span>
        </div>
        <div className="member-since">
          <span>Miembro desde <time dateTime={user.createdAt}>{memberSince.format(new Date(user.createdAt))}</time></span>
          <span>{user.name}</span>
        </div>
      </header>
      <div className="member-body">
        {created && <p className="account-success" role="status"><Icon name="check" size={16} />Tu cuenta está lista. Qué gusto tenerte aquí.</p>}
        {user.welcomeAvailable && <aside className="member-welcome" aria-label="Tu beneficio de bienvenida">
          <div className="member-welcome-pill" aria-hidden="true">
            <span className="welcome-pill-rate">10<small>%</small></span>
            <small className="welcome-pill-label">DE DESCUENTO</small>
          </div>
          <div className="member-welcome-copy">
            <span className="member-benefit-label"><Icon name="gift" size={13} />TU BIENVENIDA</span>
            <strong>10% en tu primer pedido</strong>
            <p>Se aplica automáticamente en tu carrito.</p>
          </div>
        </aside>}
        <section className="member-referrals" aria-label="Programa de invitación">
          <div className="referrals-milestone-card">
            <header className="milestone-header">
              <span className="milestone-badge"><Icon name="gift" size={13} /> GOMITA DE REGALO</span>
              <span className="milestone-rule">En compras de ₡3.000 o más</span>
            </header>
            <h3 className="milestone-title">Invitá a 3 amigos y llevate una gomita</h3>
            <p className="milestone-subtext">Ellos reciben 10% en su primer pedido. Cuando completen su compra, sumás progreso para tu gomita gratis.</p>

            {(() => {
              const validCount = referralsData?.summary.validCount ?? 0
              const currentInCycle = validCount % 3
              const remaining = 3 - currentInCycle
              const isComplete = validCount > 0 && currentInCycle === 0

              return (
                <div className="milestone-counter-box">
                  <div className="milestone-counter-label">
                    <span>Amigos que ya compraron:</span>
                    <strong>{isComplete ? '3 de 3' : `${currentInCycle} de 3`}</strong>
                  </div>
                  <div className="milestone-dots" role="img" aria-label={`Progreso: ${isComplete ? 3 : currentInCycle} de 3 compras completadas`}>
                    {[0, 1, 2].map(dotIndex => {
                      const isFilled = isComplete || dotIndex < currentInCycle
                      return (
                        <span key={dotIndex} className={`milestone-dot ${isFilled ? 'is-filled' : 'is-empty'}`}>
                          {isFilled ? '●' : '○'}
                        </span>
                      )
                    })}
                  </div>
                  <p className="milestone-status-message">
                    {isComplete
                      ? '🎉 ¡Felicidades! Ganaste tu gomita de regalo para tu próximo pedido de ₡3.000 o más.'
                      : remaining === 1
                      ? 'Te falta 1 compra para ganar tu gomita'
                      : `Te faltan ${remaining} compras para ganar tu gomita`}
                  </p>
                </div>
              )
            })()}

            <div className="referral-share-actions">
              <button
                type="button"
                className="button button-primary referral-share-btn"
                onClick={() => {
                  const url = referralsData?.shareUrl || (user.referralCode ? `${window.location.origin}/?ref=${user.referralCode}` : '')
                  const text = `¡Mae, te regalo 10% en tu primer pedido de gomitas Onky's! 🌶️ Pedí con mi enlace: ${url}`
                  if (typeof navigator !== 'undefined' && navigator.share) {
                    void navigator.share({ title: "Onky's Gomitas", text, url }).catch(() => {})
                  } else {
                    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`
                    window.open(waUrl, '_blank', 'noopener,noreferrer')
                  }
                }}
              >
                <Icon name="arrow-up" size={15} />
                <span>Compartir enlace</span>
              </button>

              <button
                type="button"
                className="referral-copy-btn"
                onClick={() => {
                  const url = referralsData?.shareUrl || (user.referralCode ? `${window.location.origin}/?ref=${user.referralCode}` : '')
                  if (url) {
                    void navigator.clipboard.writeText(url)
                    setCopiedLink(true)
                    setTimeout(() => setCopiedLink(false), 2000)
                  }
                }}
              >
                <Icon name={copiedLink ? 'check' : 'copy'} size={15} />
                <span>{copiedLink ? '¡Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            {referralsData && (referralsData.validReferrals.length > 0 || referralsData.pendingReferrals.length > 0) && (
              <div className="referral-details">
                {referralsData.validReferrals.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#185a35', textTransform: 'uppercase' }}>Ya compraron ({referralsData.validReferrals.length})</span>
                    <div className="referral-items-list">
                      {referralsData.validReferrals.map(r => (
                        <div key={r.id} className="referral-item-row">
                          <div>
                            <strong>{r.referredName}</strong>
                            <small style={{ display: 'block', color: '#776680', fontSize: '9.5px' }}>{r.firstOrderCode ? `Pedido ${r.firstOrderCode}` : '1ra compra pagada'}</small>
                          </div>
                          <span className="status-rewarded">✓ Contabilizado</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {referralsData.pendingReferrals.length > 0 && (
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#8c6720', textTransform: 'uppercase' }}>Pendientes de compra ({referralsData.pendingReferrals.length})</span>
                    <div className="referral-items-list">
                      {referralsData.pendingReferrals.map(r => (
                        <div key={r.id} className="referral-item-row">
                          <strong>{r.referredName}</strong>
                          <span className="status-pending">Esperando 1ra compra</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
        <section className="member-orders" aria-labelledby="member-orders-title" aria-busy={historyLoading}>
          <div className="member-section-heading">
            <div>
              <h3 id="member-orders-title">Mis pedidos {history && <span className="member-order-badge">{history.total}</span>}</h3>
              <p>Historial y seguimiento de tus compras</p>
            </div>
            <button className="icon-button member-refresh" aria-label="Actualizar mis pedidos" disabled={historyLoading} onClick={() => setRevision(value => value + 1)}>
              <Icon name="refresh" size={15} />
            </button>
          </div>
          {historyError && <div className="account-history-error"><Icon name="receipt" size={24} /><p role="alert">{historyError}</p><button className="text-button" onClick={() => setRevision(value => value + 1)}>Reintentar <Icon name="refresh" size={14} /></button></div>}
          {(!historyError || history) && (!history || (historyLoading && history.page !== page) ? <div className="member-orders-loading" role="status"><span className="sr-only">Buscando tus pedidos…</span>{[0, 1].map(index => <div className="member-order-skeleton" key={index} aria-hidden="true"><span /><div><i /><i /></div><span /></div>)}</div>
            : history.orders.length ? <div className="member-order-list">{history.orders.map(order => <button className="member-order" key={order.id} {...cartDrawer.intent} onClick={() => onOrder(order.id)} aria-label={`Ver pedido ${order.code}`}>
              <div className="member-order-main">
                <span className="member-order-code">{order.code}</span>
                <span className="member-order-date">{orderDate(order.createdAt)}</span>
                <span className={`member-order-status is-${order.status}`}>{orderStatusLabels[order.status]}</span>
              </div>
              <div className="member-order-side">
                <strong className="member-order-price">{order.totalMinor === null ? 'Por confirmar' : money(order.totalMinor, store)}</strong>
                <span className="member-order-action">Ver pedido <Icon name="arrow" size={13} /></span>
              </div>
            </button>)}</div>
            : <div className="member-empty">
              <div className="member-empty-icon" aria-hidden="true"><Icon name="bag" size={22} /></div>
              <h4>Tu próximo antojo empieza aquí.</h4>
              <p>Aún no tienes pedidos registrados.<br />Explora nuestro catálogo para armar tu mezcla favorita.</p>
            </div>)}
          {history && history.total > history.pageSize && <div className="member-pagination"><button className="text-button" disabled={page === 1 || historyLoading} onClick={() => setPage(value => value - 1)}>Anterior</button><span>{page} / {Math.ceil(history.total / history.pageSize)}</span><button className="text-button" disabled={page * history.pageSize >= history.total || historyLoading} onClick={() => setPage(value => value + 1)}>Siguiente</button></div>}
        </section>
        <button className="button button-primary member-shop" onClick={onShop}><span>Seguir comprando</span><Icon name="arrow" size={16} /></button>
        {error && <p ref={errorRef} tabIndex={-1} className="account-error" role="alert">{error}</p>}
        <footer className="member-footer"><span>Onky’s · Gomitas enchiladas</span><button className="text-button member-logout" disabled={busy} onClick={() => { void logout() }}><Icon name="logout" size={14} />{busy ? 'Cerrando…' : 'Cerrar sesión'}</button></footer>
      </div>
    </div> : <div className="account-layout">
      <aside className="account-story" aria-hidden="true">
        <div className="account-story-visual"><ProductImage src={store.heroImage} alt="" sizes="220px" /><span className="account-story-seal"><GummyBearMark size={27} /></span></div>
        <div className="account-story-footer"><span className="account-story-note"><Icon name="pepper" size={15} />Gomitas enchiladas</span></div>
      </aside>
      <div className="account-form-panel">
        <div className="account-mode-switch" role="group" aria-label="Acceso a tu cuenta"><button type="button" aria-pressed={!registering} aria-controls="account-form" onClick={() => switchMode('login')} disabled={busy}>Iniciar sesión</button><button type="button" aria-pressed={registering} aria-controls="account-form" onClick={() => switchMode('register')} disabled={busy}>Crear cuenta</button></div>
        <header className="account-form-heading"><h2 id="account-title">{registering ? 'Crear cuenta' : 'Iniciar sesión'}</h2></header>
        {registering && <div className="account-welcome"><span className="account-welcome-amount">10<small>%</small></span><div><strong>En tu primer pedido.</strong><p>Descuento automático en productos.</p></div><Icon name="gift" size={19} /></div>}
        <form ref={form} id="account-form" className="account-form" noValidate aria-busy={busy || customer.loading} onSubmit={event => { void submit(event) }}>
          <fieldset disabled={busy || customer.loading || !!customer.error}>
            {registering && <div className="form-field"><label htmlFor="account-name">Tu nombre</label><div className="account-input"><Icon name="user" size={17} /><input id="account-name" autoComplete="name" required minLength={2} maxLength={100} placeholder="¿Cómo te llamas?" value={name} onChange={event => { setName(event.target.value); setErrors(current => ({ ...current, name: undefined })) }} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'account-name-error' : undefined} /></div>{errors.name && <p id="account-name-error" className="field-error">{errors.name}</p>}</div>}
            <div className="form-field"><label htmlFor="account-email">Correo electrónico</label><div className="account-input"><Icon name="mail" size={17} /><input id="account-email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} required maxLength={254} placeholder="tucorreo@ejemplo.com" value={email} onChange={event => { setEmail(event.target.value); setErrors(current => ({ ...current, email: undefined })) }} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'account-email-error' : undefined} /></div>{errors.email && <p id="account-email-error" className="field-error">{errors.email}</p>}</div>
            <div className="form-field"><div className="account-password-label"><label htmlFor="account-password">Contraseña</label>{registering && <small id="account-password-help">Mínimo 8 caracteres</small>}</div><div className="account-input account-password"><Icon name="lock" size={17} /><input id="account-password" type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} required minLength={registering ? 8 : undefined} maxLength={128} placeholder={registering ? 'Crea tu contraseña' : 'Tu contraseña'} value={password} onChange={event => { setPassword(event.target.value); setErrors(current => ({ ...current, password: undefined })) }} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'account-password-error' : registering ? 'account-password-help' : undefined} /><button type="button" className="icon-button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}><Icon name={showPassword ? 'eye-off' : 'eye'} size={18} /></button></div>{errors.password && <p id="account-password-error" className="field-error">{errors.password}</p>}</div>
            {registering && (
              <div className="form-field">
                <label htmlFor="account-referral">Código de referido <small style={{ fontWeight: 400, color: '#7a6b82' }}>(opcional)</small></label>
                <div className="account-input">
                  <Icon name="gift" size={17} />
                  <input
                    id="account-referral"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={20}
                    placeholder="ONKY-XXXX"
                    value={referralCode}
                    onChange={event => setReferralCode(event.target.value.toUpperCase())}
                  />
                </div>
              </div>
            )}
            {registering && <div className="account-consent"><label><input type="checkbox" checked={privacy} onChange={event => { setPrivacy(event.target.checked); setErrors(current => ({ ...current, privacy: undefined })) }} aria-invalid={!!errors.privacy} aria-describedby={errors.privacy ? 'account-privacy-error' : undefined} /><span>Acepto que Onky’s guarde mi nombre, correo y pedidos para gestionar mi cuenta.</span></label>{errors.privacy && <p id="account-privacy-error" className="field-error">{errors.privacy}</p>}</div>}
            {error && <p ref={errorRef} tabIndex={-1} className="account-error" role="alert">{error}</p>}
            <button className="button button-primary account-submit" type="submit"><span>{busy ? registering ? 'Creando tu cuenta…' : 'Entrando…' : customer.loading ? 'Conectando…' : registering ? 'Crear mi cuenta' : 'Entrar a mi cuenta'}</span><span className="account-submit-icon" aria-hidden="true">{busy || customer.loading ? <span className="account-spinner" /> : <Icon name="arrow" size={17} />}</span></button>
          </fieldset>
        </form>
        {customer.error && <div className="account-error" role="alert"><p>{customer.error}</p><button className="text-button" onClick={() => { void customer.refresh() }}>Reintentar conexión</button></div>}
      </div>
    </div>}
  </Modal>
}
