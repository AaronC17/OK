import { store } from '../config/store.ts'
import { useVisibleAnimation } from '../hooks/useVisibleAnimation.ts'
import { GummyBearMark } from './GummyBearMark.tsx'
import { Icon } from './Icon.tsx'
import { accountDialog } from '../lib/dialog-loaders.ts'
import './brand-marquee.css'

const phrases = ['Gomitas enchiladas', store.name]
const repeatedPhrases = Array.from({ length: 6 }, () => phrases).flat()

export function BrandMarquee({ signedIn = true, loading = false, onRegister, suspended = false }: { signedIn?: boolean; loading?: boolean; onRegister?: () => void; suspended?: boolean }) {
  const root = useVisibleAnimation<HTMLDivElement>(suspended)
  if (!signedIn) return <div ref={root} className="brand-marquee welcome-marquee" aria-busy={loading}>
    <button className="welcome-marquee-link" {...accountDialog.intent} onClick={event => { event.currentTarget.focus({ preventScroll: true }); onRegister?.() }} disabled={loading}>
      <Icon name="gift" size={17} />
      <span>Obtén un <strong>10% de descuento</strong> al registrarte</span>
      <Icon name="arrow" size={16} />
    </button>
  </div>
  return <div ref={root} className="brand-marquee">
    <p className="sr-only">Gomitas enchiladas: {store.name}.</p>
    <div className="brand-marquee-track" aria-hidden="true">
      {[0, 1].map(copy => <div className="brand-marquee-group" key={copy}>
        {repeatedPhrases.map((phrase, index) => <span className="brand-marquee-item" key={index}>
          <span className={index % phrases.length === 1 ? 'brand-marquee-name' : 'brand-marquee-product'}>{phrase}</span>
          <GummyBearMark className="brand-marquee-bear" />
        </span>)}
      </div>)}
    </div>
  </div>
}
