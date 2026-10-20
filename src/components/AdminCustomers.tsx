import { useEffect, useState } from 'react'
import type { AdminCustomer, AdminCustomers as CustomerList } from '../account-types.ts'
import { adminCustomers, ApiError, errorMessage, orderDate } from '../lib/orders-api.ts'
import { Icon } from './Icon.tsx'

export function AdminCustomers({ onOrders, onExit }: { onOrders: (customer: AdminCustomer) => void; onExit: () => void }) {
  const [data, setData] = useState<CustomerList | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    setLoading(true)
    const timeout = window.setTimeout(() => {
      void adminCustomers(new URLSearchParams({ q: search, page: String(page) }))
        .then(result => { if (alive) { setData(result); setError('') } })
        .catch(error => { if (alive) { if (error instanceof ApiError && error.status === 401) onExit(); else setError(errorMessage(error)) } })
        .finally(() => { if (alive) setLoading(false) })
    }, search ? 220 : 0)
    return () => { alive = false; window.clearTimeout(timeout) }
  }, [search, page, revision])

  return <section className="admin-customers" aria-labelledby="customers-title">
    <div className="admin-customers-heading"><div><h1 id="customers-title">Clientes</h1><p>Cuentas registradas, beneficio de bienvenida y pedidos por usuario.</p></div><button className="icon-button" disabled={loading} onClick={() => setRevision(value => value + 1)} aria-label="Actualizar clientes"><Icon name="refresh" size={17} /></button></div>
    <div className="admin-controls"><span className="admin-customer-count">{data ? `${data.total} ${data.total === 1 ? 'cuenta registrada' : 'cuentas registradas'}` : 'Cargando cuentas…'}</span><div className="admin-search"><Icon name="search" size={15} /><label className="sr-only" htmlFor="customer-search">Buscar clientes por nombre o correo</label><input id="customer-search" placeholder="Buscar nombre o correo…" maxLength={80} value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} />{search && <button className="admin-search-clear" aria-label="Limpiar búsqueda de clientes" onClick={() => { setSearch(''); setPage(1) }}><Icon name="close" size={14} /></button>}</div></div>
    {error && <p className="admin-banner is-error" role="alert">{error}</p>}
    <div aria-busy={loading} className="admin-customer-list">
      {data?.customers.length ? data.customers.map(customer => <article className="admin-customer-card" key={customer.id}>
        <div className="admin-customer-identity"><span className="admin-customer-avatar" aria-hidden="true">{customer.name.slice(0, 1).toLocaleUpperCase('es')}</span><div><h2>{customer.name}</h2><a href={`mailto:${customer.email}`}>{customer.email}</a><small>Desde {orderDate(customer.createdAt)}</small></div></div>
        <div className="admin-customer-benefit"><span>Bienvenida · 10%</span><strong className={customer.welcomeAvailable ? 'is-available' : ''}>{customer.welcomeAvailable ? 'Disponible' : 'Aplicada'}</strong></div>
        <button className="admin-customer-orders" onClick={() => onOrders(customer)} aria-label={`Ver pedidos de ${customer.name}`}><span><strong>{customer.orderCount}</strong> {customer.orderCount === 1 ? 'pedido' : 'pedidos'}</span><Icon name="arrow" size={16} /></button>
      </article>) : <div className="admin-empty"><Icon name="user" size={28} /><h3>{loading ? 'Consultando clientes…' : search ? 'Sin coincidencias' : 'Tu comunidad empieza aquí.'}</h3><p>{search ? 'Prueba con otro nombre o correo.' : 'Las cuentas nuevas aparecerán aquí con sus pedidos asociados.'}</p></div>}
    </div>
    {data && data.total > data.pageSize && <div className="admin-pagination"><button className="button button-outline" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Anterior</button><span>{page} / {Math.ceil(data.total / data.pageSize)}</span><button className="button button-outline" disabled={page * data.pageSize >= data.total || loading} onClick={() => setPage(value => value + 1)}>Siguiente</button></div>}
  </section>
}
