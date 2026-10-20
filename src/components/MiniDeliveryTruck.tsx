import { memo, useId } from 'react'

export const MiniDeliveryTruck = memo(function MiniDeliveryTruck({ className = '' }: { className?: string }) {
  const id = useId().replaceAll(':', '')
  return (
    <svg
      viewBox="90 38 174 82"
      className={`mini-delivery-truck ${className}`}
      fill="none"
      focusable="false"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-box`} x1="96" y1="42" x2="200" y2="102" gradientUnits="userSpaceOnUse">
          <stop stopColor="#492f5d" />
          <stop offset="1" stopColor="#321e42" />
        </linearGradient>
      </defs>

      {/* Shadow */}
      <ellipse cx="177" cy="116" rx="66" ry="4" fill="#382448" className="mini-truck-shadow" />

      {/* Chassis Body with subtle bounce */}
      <g className="mini-truck-body">
        {/* Headlight beam */}
        <polygon points="256,86 268,82 268,98 256,96" fill="#fde047" opacity=".45" />

        {/* Cargo box */}
        <rect x="98" y="42" width="104" height="60" rx="10" fill={`url(#${id}-box)`} />
        <path d="M108 42 H192 A10 10 0 0 1 202 52 V53 H98 V52 A10 10 0 0 1 108 42 Z" fill="#5e3e76" opacity=".5" />
        <rect x="98" y="89" width="104" height="4" fill="#7c5797" opacity=".4" />
        <text
          x="150"
          y="76"
          textAnchor="middle"
          fill="#fbfaf9"
          fontFamily="'DM Sans', sans-serif"
          fontWeight="800"
          fontSize="22"
          letterSpacing="-1.55px"
        >
          Onky’s<tspan fill="#b392ca" dx=".5">.</tspan>
        </text>

        {/* Cab */}
        <path d="M200 56 H228 C234 56 239 59 242 64 L252 80 C255 84 257 88 257 93 V102 H200 V56 Z" fill="#523568" />
        <path d="M207 62 H227 C230 62 233 64 235 67 L243 80 H207 V62 Z" fill="#e9dff2" />
        <polygon points="214,62 222,62 213,80 207,80" fill="#fff" opacity=".65" />
        <rect x="209" y="86" width="8" height="2.5" rx="1.25" fill="#cbb8dc" />

        {/* Lower bumper and lights */}
        <rect x="93" y="97" width="168" height="7" rx="3.5" fill="#261633" />
        <rect x="94" y="86" width="4" height="8" rx="2" fill="#f43f5e" />
        <rect x="253" y="86" width="5" height="8" rx="2.5" fill="#fde047" />

        {/* Wheel arch cutouts */}
        <circle cx="130" cy="106" r="15.5" className="mini-truck-arch" />
        <circle cx="228" cy="106" r="15.5" className="mini-truck-arch" />
      </g>

      {/* Rotating Wheels */}
      <g transform="translate(130 106)">
        <g className="mini-wheel-spin">
          <circle r="13" fill="#23162e" />
          <circle r="7.5" fill="#f3eef8" />
          <rect x="-1.5" y="-7.5" width="3" height="15" rx="1" fill="#6f4f86" />
          <rect x="-7.5" y="-1.5" width="15" height="3" rx="1" fill="#6f4f86" />
          <circle r="3" fill="#382448" />
        </g>
      </g>
      <g transform="translate(228 106)">
        <g className="mini-wheel-spin">
          <circle r="13" fill="#23162e" />
          <circle r="7.5" fill="#f3eef8" />
          <rect x="-1.5" y="-7.5" width="3" height="15" rx="1" fill="#6f4f86" />
          <rect x="-7.5" y="-1.5" width="15" height="3" rx="1" fill="#6f4f86" />
          <circle r="3" fill="#382448" />
        </g>
      </g>
    </svg>
  )
})
