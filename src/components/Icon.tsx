import {
  ArrowRight, ArrowUpRight, ShoppingBag, Plus, Minus, X, Check, Truck, MapPin,
  Copy, ZoomIn, Heart, SlidersHorizontal, Info, Trash2, ChevronDown, Flame,
  Candy, CakeSlice, Package, Pause, Play, Blend, Cookie, Layers3,
  Landmark, Upload, ShieldCheck, Clock3, ReceiptText, Download, RefreshCw, Search, LogOut, Settings2, LockKeyhole, UserRound, Eye, EyeOff, Gift, Mail,
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
  user: UserRound, eye: Eye, 'eye-off': EyeOff, gift: Gift, mail: Mail,
}

export type IconName = keyof typeof icons | 'bear' | 'whatsapp' | 'instagram'

export function Icon({ name, size = 20, className = '', style }: { name: IconName; size?: number; className?: string; style?: CSSProperties }) {
  if (name === 'whatsapp' || name === 'instagram') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={`icon ${className}`} style={style}>
    {name === 'whatsapp' ? <>
      <path d="M20.5 11.8a8.5 8.5 0 0 1-12.6 7.5L3 21l1.6-4.8a8.5 8.5 0 1 1 15.9-4.4Z" />
      <path d="M8.4 7.2c-.7 0-1.3.8-1.3 1.7 0 2.6 3.5 6.1 6.4 6.7 1 .2 2.2-.7 2.4-1.4l-2.6-1.4-.9 1c-1.7-.7-2.7-1.7-3.4-3.2l1-1-1.2-2.4Z" />
    </> : <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </>}
  </svg>
  if (name === 'bear') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 28 34"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={`icon ${className}`}
        style={style}
      >
        <path d="M 8.5 3.88 A 9 9 0 0 1 19.5 3.88 A 4 4 0 1 1 23 10.87 A 9 9 0 0 1 21.79 15.5 C 25.3 16.5 26.8 21 25 24.4 C 24.3 25.7 23.2 26.4 22.23 26.64 A 4 4 0 1 1 16.1 31.75 A 9 9 0 0 1 11.9 31.75 A 4 4 0 1 1 5.77 26.64 C 4.8 26.4 3.7 25.7 3 24.4 C 1.2 21 2.7 16.5 6.21 15.5 A 9 9 0 0 1 5 10.87 A 4 4 0 1 1 8.5 3.88 Z" />
        <ellipse cx="10" cy="9" rx="1.7" ry="2.6" fill="currentColor" stroke="none" opacity="0.28" />
      </svg>
    )
  }
  const Component = icons[name]
  return <Component size={size} strokeWidth={1.7} aria-hidden="true" focusable="false" className={`icon ${className}`} style={style} />
}
