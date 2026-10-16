import { memo, useId } from 'react'
import { GummyDefinitions } from './GummyBear.tsx'
import { SeasoningBottle } from './SeasoningBottle.tsx'
import { GEL_MESH, GEL_TRIANGLES, mixBears, SAUCE_GRAINS } from '../lib/mix-physics.ts'

// Its contents are depth-sorted by the motion controller, independently of React.
export const GummyBowl = memo(function GummyBowl() {
  const id = useId().replaceAll(':', '')
  return <svg className="bowl-illustration" viewBox="0 0 360 290" fill="none" focusable="false">
    <GummyDefinitions id={id} />
    <defs>
      <linearGradient id={`${id}-back`} x1="180" y1="110" x2="180" y2="252" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff" stopOpacity=".95" /><stop offset="1" stopColor="#e6dce9" stopOpacity=".45" />
      </linearGradient>
      <linearGradient id={`${id}-glass`} x1="65" y1="163" x2="289" y2="230" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fff" stopOpacity=".5" /><stop offset=".24" stopColor="#fff" stopOpacity=".025" /><stop offset=".76" stopColor="#f2e6f4" stopOpacity=".025" /><stop offset="1" stopColor="#cbb5d7" stopOpacity=".22" />
      </linearGradient>
      <linearGradient id={`${id}-rim`} x1="55" y1="140" x2="305" y2="170" gradientUnits="userSpaceOnUse">
        <stop stopColor="#b19dbb" /><stop offset=".4" stopColor="#faf6fc" /><stop offset=".75" stopColor="#c5b0ce" /><stop offset="1" stopColor="#a08aac" />
      </linearGradient>
      <linearGradient id={`${id}-spoon`} x1="-9" y1="13" x2="25" y2="-100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#694577" /><stop offset=".35" stopColor="#9b78ad" /><stop offset=".7" stopColor="#bca0ce" /><stop offset="1" stopColor="#dbc9e5" />
      </linearGradient>
      <radialGradient id={`${id}-shadow`}><stop stopColor="#765284" stopOpacity=".22" /><stop offset="1" stopColor="#765284" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-contact`}><stop stopColor="#5b1e19" /><stop offset="1" stopColor="#5b1e19" stopOpacity="0" /></radialGradient>
      <radialGradient id={`${id}-chamoy`} cx=".36" cy=".24" r=".82"><stop stopColor="#c84529" /><stop offset=".38" stopColor="#a72d22" /><stop offset="1" stopColor="#681c1d" /></radialGradient>
      <linearGradient id={`${id}-submerged-chamoy`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ab3023" /><stop offset="1" stopColor="#781e1c" /></linearGradient>
      <linearGradient id={`${id}-stream`}><stop stopColor="#842322" /><stop offset=".45" stopColor="#c94627" /><stop offset=".7" stopColor="#ef8a48" /><stop offset="1" stopColor="#8e2420" /></linearGradient>
      <linearGradient id={`${id}-limon-stream`} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#c9cf98" stopOpacity=".78" /><stop offset=".38" stopColor="#f7f1c6" stopOpacity=".94" /><stop offset=".72" stopColor="#fffbe2" stopOpacity=".88" /><stop offset="1" stopColor="#d1d89f" stopOpacity=".78" /></linearGradient>
      <linearGradient id={`${id}-fold`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#df7146" /><stop offset=".3" stopColor="#bd3c27" /><stop offset="1" stopColor="#701b1c" /></linearGradient>
      <filter id={`${id}-wet-coating`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values=".55 .14 0 0 .12  0 .4 0 0 .025  0 0 .3 0 .01  0 0 0 1 0" /></filter>
      <clipPath id={`${id}-interior`}><path d="M0-90H360V146H304C295 221 267 251 180 251S65 221 56 146H0Z" /></clipPath>
      <clipPath id={`${id}-liquid-surface`}><ellipse cx="180" cy="200" rx="102" ry="39" /></clipPath>
      {GEL_TRIANGLES.map((triangle, index) => {
        const points = triangle.map(vertex => GEL_MESH[vertex])
        const cx = points.reduce((sum, point) => sum + point.x, 0) / 3, cy = points.reduce((sum, point) => sum + point.y, 0) / 3
        return <clipPath key={index} id={`${id}-gel-triangle-${index}`}><polygon points={points.map(point => `${cx + (point.x - cx) * 1.015},${cy + (point.y - cy) * 1.015}`).join(' ')} /></clipPath>
      })}
      {mixBears.map((_, index) => <g key={`coating-${index}`}>
        <mask id={`${id}-gummy-silhouette-${index}`} maskUnits="userSpaceOnUse" x="-55" y="-55" width="110" height="110" style={{ maskType: 'alpha' }}>
          <use href={`#${id}-gummy-body-${index}`} />
        </mask>
        <clipPath id={`${id}-submerged-${index}`}><rect data-sauce-cut={index} x="-55" y="55" width="110" height="110" /></clipPath>
      </g>)}
    </defs>
    <ellipse cx="180" cy="261" rx="132" ry="15" fill={`url(#${id}-shadow)`} />
    <g className="bowl-vessel">
      <path d="M55 146C55 98 305 98 305 146C296 223 267 253 180 253S64 223 55 146Z" fill={`url(#${id}-back)`} stroke="#b8a6c0" strokeWidth="1.3" />
      <ellipse cx="180" cy="146" rx="123" ry="35" fill="#fff" fillOpacity=".5" />
      <path d="M56 146C56 127 111 111 180 111S304 127 304 146" stroke="#ad97b8" strokeWidth="1.8" />
      <path d="M63 142C72 125 126 116 179 116" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <g clipPath={`url(#${id}-interior)`}>
        <g className="sauce-pool" opacity="0">
          <path d="M78 200C78 223 122 237 180 237S282 223 282 200C271 236 241 248 180 249S89 236 78 200Z" fill="#78201e" />
          <path className="liquid-surface" d="M78 200A102 35 0 1 1 282 200A102 35 0 1 1 78 200Z" fill={`url(#${id}-chamoy)`} />
          <path d="M94 212C118 235 234 246 268 215" stroke="#df7540" strokeOpacity=".6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M85 198 91 214M269 215 275 198" stroke="#d75934" strokeOpacity=".3" strokeWidth="3" strokeLinecap="round" />
          <g className="liquid-glints" clipPath={`url(#${id}-liquid-surface)`}>
            <path d="M100 190Q106 183 125 181M237 214Q251 210 255 203" stroke="#f49d68" strokeWidth="3.5" strokeLinecap="round" opacity=".2" />
            {Array.from({ length: 5 }, (_, index) => <path className="sauce-contour" key={index} stroke="#df774c" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity="0" />)}
            {Array.from({ length: 6 }, (_, index) => <path className="impact-ring" key={index} stroke="#d57247" strokeWidth="3.5" strokeLinecap="round" opacity="0" />)}
            <path className="sauce-fold" fill={`url(#${id}-fold)`} opacity="0" />
            <path className="spoon-wake-inner" stroke="#6f1c1c" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
            <path className="spoon-wake" stroke="#ed9a60" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
            <path className="spoon-mound" fill={`url(#${id}-fold)`} opacity="0" />
            <path className="spoon-mound-glint" stroke="#ee9d65" strokeWidth="2.2" strokeLinecap="round" opacity="0" />
          </g>
        </g>
        <g className="tajin-sediment" opacity="0">
          {Array.from({ length: SAUCE_GRAINS }, (_, i) => {
            const angle = i * 2.39996, radius = Math.sqrt((i + .5) / SAUCE_GRAINS)
            return <ellipse key={i} cx={180 + Math.cos(angle) * radius * 95} cy={203 + Math.sin(angle) * radius * 31} rx={.65 + (i % 3) * .3} ry={.4 + (i % 2) * .25} fill={['#77291c', '#e79043', '#f2c681'][i % 3]} />
          })}
        </g>
        <g className="gummy-contact-shadows">
          {mixBears.map((_, index) => <ellipse key={index} data-bear-shadow={index} rx="18" ry="6" fill={`url(#${id}-contact)`} opacity="0" />)}
        </g>
        <g className="sauce-bridges" clipPath={`url(#${id}-liquid-surface)`}>
          {mixBears.flatMap((_, a) => mixBears.slice(a + 1).map((_, offset) => <g key={`${a}-${a + offset + 1}`} data-bridge={`${a}-${a + offset + 1}`} opacity="0">
            <path fill="#84221e" />
            <path fill="none" stroke="#d46d3f" strokeWidth="1.5" strokeLinecap="round" />
          </g>))}
        </g>
        <g className="mix-contents">
          {mixBears.map((bear, index) => <g className="bowl-gummy" data-bear={index} key={index} opacity="0">
            <g className="gummy-body" id={`${id}-gummy-body-${index}`}>
              {GEL_TRIANGLES.map((_, triangle) => (
                <g key={triangle} data-gel-patch={`${index}-${triangle}`}>
                  <g clipPath={`url(#${id}-gel-triangle-${triangle})`}>
                    <image
                      href={`/images/mix/bear-${bear.image}.webp`}
                      xlinkHref={`/images/mix/bear-${bear.image}.webp`}
                      x="-14" y="-20.5" width="28" height="41"
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </g>
                </g>
              ))}
            </g>
            <g clipPath={`url(#${id}-submerged-${index})`}>
              <rect className="gummy-sauce-cover" x="-55" y="-55" width="110" height="110" fill={`url(#${id}-submerged-chamoy)`} opacity=".90" mask={`url(#${id}-gummy-silhouette-${index})`} />
            </g>
            <path className="gummy-meniscus" data-meniscus={index} d="M-10 0Q0 3.5 10 0" stroke="#bd5832" strokeWidth="1.7" strokeLinecap="round" opacity="0" />
          </g>)}
          <g className="mixing-spoon spoon-motion" opacity="0">
            <path className="spoon-drip" fill={`url(#${id}-stream)`} opacity="0" />
            <path className="spoon-handle" d="M-3 0 22-103Q25-108 28-103L3 0Z" fill={`url(#${id}-spoon)`} stroke="#8a6c99" strokeWidth=".6" />
            <path className="spoon-handle-glint" d="M25-98 3-16" stroke="#f2e7f6" strokeOpacity=".72" strokeWidth="1.6" strokeLinecap="round" />
            <g className="spoon-head">
              <ellipse rx="10.6" ry="16.6" fill={`url(#${id}-spoon)`} stroke="#7a588b" strokeWidth=".7" />
              <path d="M-3-11C-10-5-10 4-5 10" stroke="#e3cfec" strokeOpacity=".7" strokeWidth="1.5" strokeLinecap="round" />
              <g className="spoon-coating" opacity="0">
                <path d="M-10-2Q-1 5 10-3Q12 10 5 15Q-4 19-10-2Z" fill={`url(#${id}-chamoy)`} />
                <path d="M-7 5Q-3 17 5 13" stroke="#dc824f" strokeOpacity=".6" strokeWidth="1.9" strokeLinecap="round" />
              </g>
            </g>
          </g>
        </g>
        <g className="liquid-beads">{Array.from({ length: 24 }, (_, index) => <ellipse className="sauce-bead" key={index} rx="2.4" ry="1.2" fill="#d5572e" stroke="#f69a57" strokeWidth=".35" opacity="0" />)}</g>
      </g>
    </g>
    <g className="seasoning-tools">
      <g className="chamoy-bottle" opacity="0">
        <SeasoningBottle name="chamoy" x={140} y={84} height={100} rotation={135} />
      </g>
      <g className="chamoy-flow" opacity="0">
        <path className="chamoy-stream" d="M140 84C152 99 174 145 174 200" stroke={`url(#${id}-stream)`} strokeWidth="5.6" strokeLinecap="round" pathLength="1" strokeDasharray="1" />
        <ellipse cx="174" cy="200" rx="11" ry="3" fill="#f38a51" opacity=".5" />
      </g>
      <g className="tajin-shaker" opacity="0">
        <SeasoningBottle name="tajin" x={231} y={82} height={94} rotation={225} />
      </g>
      <g className="tajin-rain">
        {Array.from({ length: 32 }, (_, index) => <circle className="tajin-grain" key={index} data-grain={index} r={.65 + (index % 3) * .25} fill={['#bd4d29', '#db6a30', '#e6ad64'][index % 3]} opacity="0" />)}
      </g>
      <g className="limon-bottle" opacity="0">
        <SeasoningBottle name="limon" x={186} y={92} height={78} rotation={225} />
      </g>
      <g className="limon-juice" opacity="0">
        <path className="limon-stream" fill={`url(#${id}-limon-stream)`} />
        <path className="limon-stream-glint" stroke="#fffef0" strokeOpacity=".62" strokeWidth=".85" strokeLinecap="round" strokeDasharray="7 11 4 13" />
      </g>
      <g className="limon-contact" opacity="0">
        <ellipse className="limon-impact" ry="1" fill="#fff4cf" opacity="0" />
        {[0, 1, 2].map(index => <ellipse key={index} className="limon-ripple" stroke="#f4d6ad" strokeWidth=".7" opacity="0" />)}
      </g>
    </g>
    <g className="bowl-front">
      <path className="bowl-front-glass" d="M55 146C55 165 111 181 180 181S305 165 305 146C296 223 267 253 180 253S64 223 55 146Z" fill={`url(#${id}-glass)`} />
      <path d="M55 146C64 223 93 253 180 253S296 223 305 146" stroke="#aa94b7" strokeWidth="1.5" />
      <path d="M56 147C59 166 113 183 180 183S301 166 304 147" stroke="#fff" strokeOpacity=".72" strokeWidth="4" />
      <path className="bowl-front-rim" d="M55 146C55 165 111 181 180 181S305 165 305 146" stroke={`url(#${id}-rim)`} strokeWidth="2" />
      <path d="M70 169C75 199 84 216 99 227" stroke="#fff" strokeOpacity=".87" strokeWidth="3.8" strokeLinecap="round" />
      <path d="M78 173 81 185M274 213 280 195" stroke="#fff" strokeOpacity=".6" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M144 245Q180 250 216 245" stroke="#fff" strokeOpacity=".8" strokeWidth="2.2" strokeLinecap="round" />
    </g>
  </svg>
})
