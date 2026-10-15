import { useEffect, useMemo, useState } from 'react'
import { store } from '../config/store.ts'
import { addItem, CART_STORAGE_KEY, MAX_QUANTITY, resolveLine, restoreCart, selectionKey } from '../lib/shop.ts'
import type { CartItem, CartLine } from '../types.ts'

function readInitial() {
  try {
    const result = restoreCart(localStorage.getItem(CART_STORAGE_KEY), store)
    return { ...result, error: false }
  } catch { return { items: [], changed: false, error: true } }
}

export function useCart() {
  const [initial] = useState(readInitial)
  const [items, setItems] = useState<CartItem[]>(initial.items)
  const [notice, setNotice] = useState(initial.error
    ? 'El navegador no permite guardar el carrito. Se conservará mientras esta página siga abierta.'
    : initial.changed ? 'Actualizamos tu carrito: algunas variantes guardadas ya no están disponibles.' : '')

  useEffect(() => {
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({ version: 1, items })) }
    catch { setNotice('No pudimos guardar el carrito en este navegador. Se conservará mientras esta página siga abierta.') }
  }, [items])

  const lines = useMemo(() => items.map(item => resolveLine(item, store)).filter((line): line is CartLine => !!line), [items])
  const count = items.reduce((sum, item) => sum + item.quantity, 0)

  return {
    items, lines, count, notice,
    add: (item: CartItem) => {
      if (resolveLine(item, store)) setItems(current => addItem(current, item))
    },
    update: (key: string, quantity: number) => {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return
      setItems(current => current.map(item => selectionKey(item.selection) === key ? { ...item, quantity } : item))
    },
    remove: (key: string) => setItems(current => current.filter(item => selectionKey(item.selection) !== key)),
  }
}

export type Cart = ReturnType<typeof useCart>
