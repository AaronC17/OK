import { store } from '../config/store.ts'
import { useVisibleAnimation } from '../hooks/useVisibleAnimation.ts'
import './brand-marquee.css'

const phrases = ['Gomitas enchiladas', store.name]
const repeatedPhrases = Array.from({ length: 6 }, () => phrases).flat()

function GummyBearMark() {
  return <svg className="brand-marquee-bear" viewBox="0 0 28 34" fill="currentColor" aria-hidden="true" focusable="false">
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

export function BrandMarquee() {
  const root = useVisibleAnimation<HTMLDivElement>()
  return <div ref={root} className="brand-marquee">
    <p className="sr-only">Gomitas enchiladas: {store.name}.</p>
    <div className="brand-marquee-track" aria-hidden="true">
      {[0, 1].map(copy => <div className="brand-marquee-group" key={copy}>
        {repeatedPhrases.map((phrase, index) => <span className="brand-marquee-item" key={index}>
          <span className={index % phrases.length === 1 ? 'brand-marquee-name' : 'brand-marquee-product'}>{phrase}</span>
          <GummyBearMark />
        </span>)}
      </div>)}
    </div>
  </div>
}
