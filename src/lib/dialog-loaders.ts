import type { MouseEvent } from 'react'

function focusTrigger(event: MouseEvent<HTMLElement>) {
  // Safari does not focus tapped buttons. Do this at activation (not touch
  // down, which might be a scroll) so both loading and final dialogs can return
  // focus to the same trigger. Some catalog intents live on a parent article.
  const target = event.target instanceof Element ? event.target.closest<HTMLElement>('button, a[href]') : null
  if (target && event.currentTarget.contains(target)) target.focus({ preventScroll: true })
}

/** Share the import between a visitor's first intent and React.lazy. Failed
 * speculative loads can retry on the actual click; no customer data is fetched. */
function deferredDialog<T>(importModule: () => Promise<T>) {
  let pending: Promise<T> | undefined
  const load = () => pending ??= importModule().catch(error => { pending = undefined; throw error })
  const preload = () => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? '') || matchMedia('(prefers-reduced-data: reduce)').matches) return
    void load().catch(() => { /* The requested dialog handles a persistent failure. */ })
  }
  return { load, intent: { onPointerEnter: preload, onPointerDown: preload, onFocus: preload, onClickCapture: focusTrigger } }
}

export const productDialog = deferredDialog(() => import('../components/ProductDialog.tsx').then(module => ({ default: module.ProductDialog })))
export const cartDrawer = deferredDialog(() => import('../components/CartDrawer.tsx').then(module => ({ default: module.CartDrawer })))
export const accountDialog = deferredDialog(() => import('../components/AccountDialog.tsx').then(module => ({ default: module.AccountDialog })))
