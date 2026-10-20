import { memo, useId, type CSSProperties, type ReactNode } from 'react'

/** Animate HTML surfaces, not descendants of one continuously repainted SVG.
 * The original vector artwork remains sharp at the phone's native pixel ratio. */
function Layer({ className, children, style }: { className: string; children: ReactNode; style?: CSSProperties }) {
  return <div className={`transit-layer ${className}`} style={style}>
    <svg viewBox="0 0 360 142" fill="none" focusable="false">{children}</svg>
  </div>
}

export const DeliveryTruck = memo(function DeliveryTruck() {
  const id = useId().replaceAll(':', '')
  return <div className="transit-scene" aria-hidden="true">
    <svg viewBox="0 0 360 142" className="transit-svg" fill="none" focusable="false">
      <defs><linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="142" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#f3ecf8" /><stop offset="72%" stopColor="#faf8fc" /><stop offset="100%" stopColor="#ede4f3" />
      </linearGradient></defs>
      <rect width="360" height="142" fill={`url(#${id}-sky)`} />
      <rect y="112" width="360" height="30" fill="#e6dcef" />
      <line y1="112" x2="360" y2="112" stroke="#d3c3e2" strokeWidth="1.5" />
    </svg>
    <Layer className="transit-clouds">
      <g opacity=".65" fill="#fff">{[0, 360].map(x => <g key={x} transform={`translate(${x} 0)`}>
        <rect x="34" y="22" width="46" height="12" rx="6" /><circle cx="48" cy="21" r="8" /><circle cx="62" cy="19" r="10" />
        <rect x="210" y="16" width="54" height="13" rx="6.5" /><circle cx="226" cy="15" r="9" /><circle cx="244" cy="14" r="11" />
      </g>)}</g>
    </Layer>
    <Layer className="transit-horizon">
      <g opacity=".45" fill="#dfd2ea">
        <path d="M0 112 Q45 92 95 112 T195 112 T295 112 T360 112 L360 116 L0 116 Z" />
        <path d="M360 112 Q405 92 455 112 T555 112 T655 112 T720 112 L720 116 L360 116 Z" />
      </g>
      {/* The road occludes the bottom of the hills, just as in the SVG scene. */}
      <path d="M0 112H720V116H0Z" fill="#e6dcef" /><path d="M0 112H720" stroke="#d3c3e2" strokeWidth="1.5" />
    </Layer>
    <Layer className="transit-road-dashes">
      <path d="M0 126H396" stroke="#b59ec9" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="16 20" />
    </Layer>
    {[[36, 54, 72, 2], [18, 76, 64, 2], [48, 94, 80, 1.75]].map(([x1, y, x2, width], index) => <Layer key={index} className={`wind-line wind-${index + 1}`}>
      <path d={`M${x1} ${y}H${x2}`} stroke="#cbb8dc" strokeWidth={width} strokeLinecap="round" />
    </Layer>)}
    {[[92, 101, 5], [82, 98, 7], [70, 95, 4.5]].map(([x, y, r], index) => <Layer key={index} className={`puff puff-${index + 1}`}
      style={{ transformOrigin: `${x / 360 * 100}% ${y / 142 * 100}%` }}>
      <circle cx={x} cy={y} r={r} fill="#d9cae6" />
    </Layer>)}
    <Layer className="transit-truck-shadow"><ellipse cx="180" cy="115" rx="74" ry="5.5" fill="#382448" /></Layer>
    <Layer className="transit-truck-chassis">
      <defs>
        <linearGradient id={`${id}-beam`} x1="252" y1="90" x2="348" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde047" stopOpacity=".42" /><stop offset="1" stopColor="#fde047" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-box`} x1="96" y1="42" x2="200" y2="102" gradientUnits="userSpaceOnUse">
          <stop stopColor="#492f5d" /><stop offset="1" stopColor="#321e42" />
        </linearGradient>
      </defs>
      <polygon points="256,85 346,68 346,112 256,97" fill={`url(#${id}-beam)`} />
      <rect x="98" y="42" width="104" height="60" rx="10" fill={`url(#${id}-box)`} />
      <path d="M108 42 H192 A10 10 0 0 1 202 52 V53 H98 V52 A10 10 0 0 1 108 42 Z" fill="#5e3e76" opacity=".5" />
      <rect x="98" y="89" width="104" height="4" fill="#7c5797" opacity=".4" />
      <text x="150" y="76" textAnchor="middle" fill="#fbfaf9" fontFamily="'DM Sans', sans-serif" fontWeight="800" fontSize="22" letterSpacing="-1.55px">
        Onky’s<tspan fill="#b392ca" dx=".5">.</tspan>
      </text>
      <path d="M200 56 H228 C234 56 239 59 242 64 L252 80 C255 84 257 88 257 93 V102 H200 V56 Z" fill="#523568" />
      <path d="M207 62 H227 C230 62 233 64 235 67 L243 80 H207 V62 Z" fill="#e9dff2" />
      <polygon points="214,62 222,62 213,80 207,80" fill="#fff" opacity=".65" />
      <rect x="209" y="86" width="8" height="2.5" rx="1.25" fill="#cbb8dc" />
      <rect x="93" y="97" width="168" height="7" rx="3.5" fill="#261633" />
      <rect x="94" y="86" width="4" height="8" rx="2" fill="#f43f5e" /><rect x="253" y="86" width="5" height="8" rx="2.5" fill="#fde047" />
    </Layer>
    <Layer className="transit-wheel-arches"><circle cx="130" cy="106" r="15.5" fill="#e6dcef" /><circle cx="228" cy="106" r="15.5" fill="#e6dcef" /></Layer>
    {[130, 228].map(x => <Layer key={x} className="transit-wheel" style={{ transformOrigin: `${x / 360 * 100}% ${106 / 142 * 100}%` }}>
      <circle cx={x} cy="106" r="13" fill="#23162e" /><circle cx={x} cy="106" r="7.5" fill="#f3eef8" />
      <rect x={x - 1.5} y="98.5" width="3" height="15" rx="1" fill="#6f4f86" /><rect x={x - 7.5} y="104.5" width="15" height="3" rx="1" fill="#6f4f86" />
      <circle cx={x} cy="106" r="3" fill="#382448" />
    </Layer>)}
  </div>
})
