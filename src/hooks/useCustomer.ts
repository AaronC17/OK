import { useCallback, useEffect, useRef, useState } from 'react'
import type { CustomerAuth, Registration } from '../account-types.ts'
import { customerSession, errorMessage, loginCustomer, logoutCustomer, registerCustomer } from '../lib/orders-api.ts'

export function useCustomer() {
  const [auth, setAuth] = useState<CustomerAuth | null>(null)
  const [error, setError] = useState('')
  const sequence = useRef(0)
  const changing = useRef(false)
  const channel = useRef<BroadcastChannel | null>(null)

  const refresh = useCallback(async () => {
    if (changing.current) return
    const request = ++sequence.current
    try {
      const next = await customerSession()
      if (request === sequence.current) { setAuth(next); setError('') }
    } catch (error) { if (request === sequence.current) setError(errorMessage(error)) }
  }, [])

  useEffect(() => {
    void refresh()
    const visible = () => { if (!document.hidden) void refresh() }
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('focus', visible)
    if (typeof BroadcastChannel !== 'undefined') {
      channel.current = new BroadcastChannel('onkys-account')
      channel.current.onmessage = () => { void refresh() }
    }
    return () => { sequence.current++; document.removeEventListener('visibilitychange', visible); window.removeEventListener('focus', visible); channel.current?.close(); channel.current = null }
  }, [refresh])

  const change = async (operation: () => Promise<CustomerAuth>) => {
    changing.current = true
    sequence.current++
    try {
      const next = await operation()
      sequence.current++
      setAuth(next)
      setError('')
      channel.current?.postMessage('changed')
      return next
    } finally { changing.current = false }
  }

  return {
    user: auth?.user ?? null, loading: !auth && !error, error, refresh,
    register: (data: Registration) => change(() => registerCustomer(data)),
    login: (email: string, password: string) => change(() => loginCustomer(email, password)),
    logout: () => change(logoutCustomer),
    orderChanged: () => { channel.current?.postMessage('changed'); void refresh() },
  }
}
export type Customer = ReturnType<typeof useCustomer>
