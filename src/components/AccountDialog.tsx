import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { CustomerOrders } from '../account-types.ts'
import type { Customer } from '../hooks/useCustomer.ts'
import { store } from '../config/store.ts'
import { customerOrders, errorMessage, orderDate } from '../lib/orders-api.ts'
import { money } from '../lib/shop.ts'
import { orderStatusLabels } from '../order-types.ts'
import { GummyBearMark } from './GummyBearMark.tsx'
import { Icon } from './Icon.tsx'
import { Modal, ProductImage } from './ui.tsx'

export type AccountMode = 'login' | 'register'
type FieldErrors = Partial<Record<'name' | 'email' | 'password' | 'privacy', string>>

export function AccountDialog({ open, initialMode, customer, onClose, onOrder }: {
  open: boolean; initialMode: AccountMode; customer: Customer; onClose: () => void; onOrder: (id: string) => void
}) {
  const [mode, setMode] = useState(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [privacy, setPrivacy] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState(false)
  const [loadedHistory, setHistory] = useState<{ owner: string; data: CustomerOrders } | null>(null)
  const [historyError, setHistoryError] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const form = useRef<HTMLFormElement>(null)
  const errorRef = useRef<HTMLParagraphElement>(null)
  const registering = mode === 'register'
  const user = customer.user
  const history = loadedHistory?.owner === user?.id ? loadedHistory?.data ?? null : null

  useEffect(() => {
    if (!open || !user) { setHistory(null); return }
    let alive = true
    setHistoryLoading(true)
    setHistoryError('')
    void customerOrders(page).then(result => { if (alive) setHistory({ owner: user.id, data: result }) })
      .catch(error => { if (alive) setHistoryError(errorMessage(error)) })
      .finally(() => { if (alive) setHistoryLoading(false) })
    return () => { alive = false }
  }, [open, user?.id, page, revision])

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
    else if (registering && (password.length < 12 || !password.trim())) next.password = 'Usa al menos 12 caracteres para proteger tu cuenta.'
    if (registering && !privacy) next.privacy = 'Acepta el uso de tus datos para crear tu cuenta.'
    setErrors(next)
    setError('')
    if (Object.keys(next).length) return
    setBusy(true)
    try {
      if (registering) { await customer.register({ name: name.trim(), email: email.trim(), password, privacyAccepted: privacy }); setCreated(true) }
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
        <span className="eyebrow">TU ESPACIO EN ONKY’S</span>
        <div className="member-profile"><span className="member-avatar" aria-hidden="true">{user.name.trim().slice(0, 1).toLocaleUpperCase('es')}</span><div><h2 id="account-title">Hola, {user.name.split(' ')[0]}.</h2><p>{user.email}</p></div></div>
        {created && <p className="account-success" role="status"><Icon name="check" size={16} />Tu cuenta está lista. Qué gusto tenerte aquí.</p>}
      </header>
      {user.welcomeAvailable && <div className="member-welcome"><span className="member-welcome-icon"><Icon name="gift" size={22} /></span><div><strong>Tu primer antojo, con 10% menos.</strong><p>Se aplica automáticamente a los productos de tu primer pedido. El envío no está incluido.</p></div></div>}
      <section className="member-orders" aria-labelledby="member-orders-title" aria-busy={historyLoading}>
        <div className="member-section-heading"><h3 id="member-orders-title">Mis pedidos {history && <span>{history.total}</span>}</h3><button className="icon-button" aria-label="Actualizar mis pedidos" disabled={historyLoading} onClick={() => setRevision(value => value + 1)}><Icon name="refresh" size={16} /></button></div>
        {historyError ? <div className="account-history-error"><p className="field-error" role="alert">{historyError}</p><button className="text-button" onClick={() => setRevision(value => value + 1)}>Reintentar</button></div> : history?.orders.length ? <div className="member-order-list">{history.orders.map(order => <button className="member-order" key={order.id} onClick={() => onOrder(order.id)} aria-label={`Ver pedido ${order.code}`}>
          <span className="member-order-icon"><Icon name="bag" size={18} /></span>
          <span className="member-order-info"><strong>{order.code}</strong><small>{orderDate(order.createdAt)}</small><span className={`member-order-status ${order.status === 'ready' ? 'is-ready' : ''}`}>{orderStatusLabels[order.status]}</span></span>
          <span className="member-order-total">{order.totalMinor === null ? 'Por confirmar' : money(order.totalMinor, store)}<Icon name="arrow" size={16} /></span>
        </button>)}</div> : <div className="member-empty"><Icon name="bag" size={27} /><strong>{historyLoading ? 'Buscando tus pedidos…' : 'Aquí empiezan tus próximos antojos.'}</strong><p>{historyLoading ? 'Un momento, por favor.' : 'Tus pedidos y su seguimiento estarán en este espacio, incluso si cambias de dispositivo.'}</p></div>}
        {history && history.total > history.pageSize && <div className="member-pagination"><button className="text-button" disabled={page === 1 || historyLoading} onClick={() => setPage(value => value - 1)}>Anterior</button><span>{page} / {Math.ceil(history.total / history.pageSize)}</span><button className="text-button" disabled={page * history.pageSize >= history.total || historyLoading} onClick={() => setPage(value => value + 1)}>Siguiente</button></div>}
      </section>
      {error && <p ref={errorRef} tabIndex={-1} className="account-error" role="alert">{error}</p>}
      <footer className="member-footer"><button className="button button-primary" onClick={onClose}>Seguir comprando<Icon name="arrow" size={17} /></button><button className="text-button member-logout" disabled={busy} onClick={() => { void logout() }}><Icon name="logout" size={16} />{busy ? 'Cerrando…' : 'Cerrar sesión'}</button></footer>
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
            <div className="form-field"><div className="account-password-label"><label htmlFor="account-password">Contraseña</label>{registering && <small id="account-password-help">Mínimo 12 caracteres</small>}</div><div className="account-input account-password"><Icon name="lock" size={17} /><input id="account-password" type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} required minLength={registering ? 12 : undefined} maxLength={128} placeholder={registering ? 'Crea tu contraseña' : 'Tu contraseña'} value={password} onChange={event => { setPassword(event.target.value); setErrors(current => ({ ...current, password: undefined })) }} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'account-password-error' : registering ? 'account-password-help' : undefined} /><button type="button" className="icon-button" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}><Icon name={showPassword ? 'eye-off' : 'eye'} size={18} /></button></div>{errors.password && <p id="account-password-error" className="field-error">{errors.password}</p>}</div>
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
