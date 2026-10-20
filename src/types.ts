export type Weight = 100 | 250 | 500
export type Prices = Record<Weight, number | null>

export interface GummyType {
  id: string
  name: string
  coatingLabel: string
  description: string
  tag: string
  image: string
  imageAlt: string
  imagePosition?: string
  available: boolean
  /** Opcional. Si es false, el tipo se oculta del catálogo y no se puede pedir, sin borrar sus datos. */
  visible?: boolean
  prices: Prices
  variantImages?: Partial<Record<Weight, string>>
}

export interface DessertVariant {
  id: string
  label: string
  description: string
  priceMinor: number | null
  available: boolean
  image?: string
}

export interface Dessert {
  id: string
  name: string
  description: string
  tag: string
  image: string
  imageAlt: string
  imagePosition?: string
  available: boolean
  ingredients: string | null
  allergenInfo: string | null
  variants: DessertVariant[]
}

export interface DeliveryMethod {
  id: string
  name: string
  description: string
  enabled: boolean
  requiresAddress: boolean
  addressLabel?: string
  feeMinor: number | null
  /** Envío gratis solo si el subtotal de productos SUPERA este importe. */
  freeAboveMinor?: number
  coverage: string | null
  conditions: string
  pickupPoint?: string | null
}

export interface ProductVariant {
  id: string
  label: string
  description?: string
  priceMinor: number
  available: boolean
  image?: string
}

export interface Product {
  id: string
  name: string
  tag: string
  description: string
  image: string
  imageAlt: string
  imagePosition?: string
  available: boolean
  priceMinor?: number
  unitLabel?: string
  ingredients?: string | null
  allergenInfo?: string | null
  variants?: ProductVariant[]
}

export interface StoreConfig {
  name: string
  demo: boolean
  categories: { dessertsEnabled: boolean }
  currency: { code: string; locale: string; fractionDigits: number }
  contact: { email: string | null; instagramUrl: string | null }
  heroImage: string
  heroImageAlt: string
  heroVideo?: {
    src: string
    poster: string
    description: string
    generated: boolean
    durationSeconds?: number
  }
  gummies: {
    weights: Weight[]
    types: GummyType[]
    mixes: {
      enabled: boolean
      note: string
      combinations: { typeIds: string[]; prices: Prices; image?: string }[]
    }
  }
  desserts: Dessert[]
  products?: Product[]
  deliveryMethods: DeliveryMethod[]
}

export type Selection =
  | { kind: 'gummy'; typeIds: string[]; weight: Weight }
  | { kind: 'dessert'; productId: string; variantId: string }
  | { kind: 'product'; productId: string; variantId?: string }

export interface CartItem {
  selection: Selection
  quantity: number
}

export interface CartLine extends CartItem {
  key: string
  name: string
  options: string[]
  image: string
  imageAlt: string
  unitPriceMinor: number
  lineTotalMinor: number
}

export interface Customer {
  name: string
  deliveryId: string
  address: string
  notes: string
}

export type CheckoutErrors = Partial<Record<keyof Customer | 'cart', string>>
