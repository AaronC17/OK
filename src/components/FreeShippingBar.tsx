import { useEffect, useState } from 'react'
import { store } from '../config/store.ts'
import { freeShippingStatus, money } from '../lib/shop.ts'
import { Icon } from './Icon.tsx'
import { useVisibleAnimation } from '../hooks/useVisibleAnimation.ts'

export interface FreeShippingBarProps {
  subtotal: number
  initialSubtotal?: number
  className?: string
  compact?: boolean
}

export function FreeShippingBar({ subtotal, initialSubtotal, className = '', compact = false }: FreeShippingBarProps) {
  const root = useVisibleAnimation<HTMLDivElement>()
  const status = freeShippingStatus(subtotal, store)
  const targetPercent = status.percent

  const [animatedPercent, setAnimatedPercent] = useState(() => {
    if (initialSubtotal !== undefined) {
      return freeShippingStatus(initialSubtotal, store).percent
    }
    return 0
  })

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setAnimatedPercent(targetPercent)
    })
    return () => cancelAnimationFrame(frame)
  }, [targetPercent])

  return (
    <div
      ref={root}
      className={`free-shipping-card ${compact ? 'is-compact' : ''} ${status.isFree ? 'is-free' : ''} ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="shipping-card-header">
        <span className="shipping-icon-wrap" aria-hidden="true">
          <Icon name={status.isFree ? 'check' : 'truck'} size={compact ? 15 : 17} />
        </span>
        <div className="shipping-text">
          {status.isFree ? (
            <span>
              <strong>¡Felicidades!</strong> Tienes <strong>Envío Gratis</strong>
            </span>
          ) : (
            <span>
              Te faltan <strong>{money(status.remainingMinor, store)}</strong> para <strong>Envío Gratis</strong>
            </span>
          )}
        </div>
        {!compact && (
          <span className="shipping-badge" aria-hidden="true">
            {status.isFree ? '100%' : `${targetPercent}%`}
          </span>
        )}
      </div>
      <div
        className="shipping-progress-track"
        role="progressbar"
        aria-valuenow={targetPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progreso para envío gratis"
      >
        <div
          className={`shipping-progress-fill ${status.isFree ? 'is-complete' : ''}`}
          style={{ transform: `scaleX(${animatedPercent / 100})` }}
        >
          <span className="shipping-progress-shine" />
        </div>
      </div>
    </div>
  )
}
