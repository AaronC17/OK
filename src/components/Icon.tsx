import {
  ArrowRight, ArrowUpRight, ShoppingBag, Plus, Minus, X, Check, Truck, MapPin,
  Copy, ZoomIn, Heart, SlidersHorizontal, Info, Trash2, ChevronDown, Flame,
  Candy, CakeSlice, Package, Pause, Play, Blend, Cookie, Layers3,
} from 'lucide-react'
import type { CSSProperties } from 'react'

const icons = {
  arrow: ArrowRight, 'arrow-up': ArrowUpRight, bag: ShoppingBag, plus: Plus,
  minus: Minus, close: X, check: Check, truck: Truck, pin: MapPin, copy: Copy,
  zoom: ZoomIn, heart: Heart, sliders: SlidersHorizontal, info: Info,
  trash: Trash2, chevron: ChevronDown, pepper: Flame, candy: Candy,
  cake: CakeSlice, package: Package, pause: Pause, play: Play, mix: Blend,
  cookie: Cookie, layers: Layers3,
}

export type IconName = keyof typeof icons | 'whatsapp'

export function Icon({ name, size = 20, className = '', style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  if (name === 'whatsapp') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`icon ${className}`} style={style}>
    <path d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.5L3 21l1.6-4.8a8.5 8.5 0 1 1 15.9-4.4Z" />
    <path d="M8.4 7.2c-.7 0-1.3.8-1.3 1.7 0 2.6 3.5 6.1 6.4 6.7 1 .2 2.2-.7 2.4-1.4l-2.6-1.4-.9 1c-1.7-.7-2.7-1.7-3.4-3.2l1-1-1.2-2.4Z" />
  </svg>
  const Component = icons[name]
  return <Component size={size} strokeWidth={1.7} aria-hidden="true" focusable="false" className={`icon ${className}`} style={style} />
}
