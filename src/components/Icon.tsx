import {
  ArrowRight, ArrowUpRight, ShoppingBag, Plus, Minus, X, Check, Truck, MapPin,
  Copy, ZoomIn, Heart, SlidersHorizontal, Info, Trash2, ChevronDown, Flame,
  Candy, CakeSlice, Package, Pause, Play, Blend, Cookie, Layers3,
  Landmark, Upload, ShieldCheck, Clock3, ReceiptText, Download, RefreshCw, Search, LogOut, Settings2, LockKeyhole,
} from 'lucide-react'
import type { CSSProperties } from 'react'

const icons = {
  arrow: ArrowRight, 'arrow-up': ArrowUpRight, bag: ShoppingBag, plus: Plus,
  minus: Minus, close: X, check: Check, truck: Truck, pin: MapPin, copy: Copy,
  zoom: ZoomIn, heart: Heart, sliders: SlidersHorizontal, info: Info,
  trash: Trash2, chevron: ChevronDown, pepper: Flame, candy: Candy,
  cake: CakeSlice, package: Package, pause: Pause, play: Play, mix: Blend,
  cookie: Cookie, layers: Layers3, bank: Landmark, upload: Upload, shield: ShieldCheck,
  clock: Clock3, receipt: ReceiptText, download: Download, refresh: RefreshCw, search: Search,
  logout: LogOut, settings: Settings2, lock: LockKeyhole,
}

export type IconName = keyof typeof icons

export function Icon({ name, size = 20, className = '', style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  const Component = icons[name]
  return <Component size={size} strokeWidth={1.7} aria-hidden="true" focusable="false" className={`icon ${className}`} style={style} />
}
