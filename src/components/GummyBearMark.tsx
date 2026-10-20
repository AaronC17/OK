export function GummyBearMark({ size = 24, className = '' }: { size?: number; className?: string }) {
  return <svg className={className} width={size * 28 / 34} height={size} viewBox="0 0 28 34" fill="currentColor" aria-hidden="true" focusable="false">
    <circle cx="6" cy="7" r="4" />
    <circle cx="22" cy="7" r="4" />
    <circle cx="14" cy="11" r="9" />
    <ellipse cx="5.5" cy="21" rx="3.5" ry="5.5" transform="rotate(20 5.5 21)" />
    <ellipse cx="22.5" cy="21" rx="3.5" ry="5.5" transform="rotate(-20 22.5 21)" />
    <ellipse cx="14" cy="23" rx="9" ry="9" />
    <circle cx="9" cy="29" r="4" />
    <circle cx="19" cy="29" r="4" />
    <ellipse cx="10" cy="9" rx="2" ry="3" fill="#fff" opacity=".28" />
  </svg>
}
