import { store } from '../config/store.ts'
import { money, visibleGummyTypes } from '../lib/shop.ts'
import type { ProductTarget } from './ProductDialog.tsx'
import { Icon } from './Icon.tsx'
import { ProductImage } from './ui.tsx'

function startingPrice(prices: (number | null)[]) {
  const valid = prices.filter((price): price is number => price !== null && price >= 0)
  return valid.length ? money(Math.min(...valid), store) : 'Por definir'
}

export function Catalog({ onProduct, onZoom }: {
  onProduct: (target: ProductTarget) => void
  onZoom: (image: { src: string; alt: string; name: string }) => void
}) {
  return <div className="catalog container" id="catalogo">
    <section id="gomitas" className="product-section" aria-labelledby="gummies-title">
      <div className="section-heading">
        <div><span className="eyebrow section-kicker"><span>01</span> GOMITAS</span><h2 id="gummies-title">Tu combinación favorita.</h2><p>De un solo tipo o mixtas. Tú pones las reglas.</p></div>
        <span className="section-side-note"><Icon name="sliders" size={18} /> {store.gummies.weights.map(weight => `${weight} g`).join(' · ')}</span>
      </div>
      <div className="product-grid gummy-grid">{store.gummies.mixes.enabled && <article className="product-card mobile-mix-card">
          <button className="card-photo blended-card" onClick={() => onProduct({ kind: 'gummy', typeId: store.gummies.types[0]?.id ?? '', mixed: true })} aria-label="Personalizar gomitas mixtas">
            <ProductImage src={store.heroImage} alt={store.heroImageAlt} width={800} height={800} /><span className="premium-badge">Más vendido</span><span className="photo-action"><Icon name="layers" size={20} /></span>
          </button>
          <div className="product-card-info"><div className="product-card-title"><h3>Mixto <span>dos o tres tipos</span></h3></div><p>Combina dos o tres favoritos.</p>
            <div className="product-card-footer"><div><span className="price-from">Desde</span><strong>{startingPrice(store.gummies.mixes.combinations.flatMap(combination => Object.values(combination.prices)))}</strong></div><button className="product-action" onClick={() => onProduct({ kind: 'gummy', typeId: store.gummies.types[0]?.id ?? '', mixed: true })} aria-label="Elegir presentación de gomitas mixtas">Personalizar <span className="action-icon"><Icon name="plus" size={17} /></span></button></div>
          </div>
        </article>}
        {visibleGummyTypes(store).map((type, index) => <article className="product-card" key={type.id}>
        <button className={`card-photo${type.id === 'ositos' ? ' blended-card' : ''}`} onClick={() => onProduct({ kind: 'gummy', typeId: type.id })} aria-label={`Personalizar ${type.name}`}>
          <ProductImage src={type.image} alt={type.imageAlt} loading="lazy" width={800} height={800} style={{ objectPosition: type.imagePosition }} />
          <span className="product-tag">{type.tag}</span><span className="photo-action"><Icon name="arrow-up" size={20} /></span>
          {!type.available && <span className="unavailable-badge">No disponible</span>}
        </button>
        <div className="product-card-info">
          <div className="product-card-title"><h3>{type.name} <span>{type.coatingLabel}</span></h3><span className="product-number">0{index + 1}</span></div>
          <p>{type.description}</p>
          <div className="product-card-footer"><div><span className="price-from">Desde</span><strong>{startingPrice(Object.values(type.prices))}</strong></div><button className="product-action" disabled={!type.available} onClick={() => onProduct({ kind: 'gummy', typeId: type.id })} aria-label={`Elegir presentación de ${type.name}`}>Personalizar <span className="action-icon"><Icon name="plus" size={17} /></span></button></div>
        </div>
      </article>)}
      </div>
      {store.gummies.mixes.enabled && <div className="mix-invitation"><span className="mix-invitation-icon"><Icon name="layers" size={23} /></span><div><strong>¿Para qué elegir solo uno?</strong><p>Combina dos o tres favoritos en una misma bolsa.</p></div><button onClick={() => onProduct({ kind: 'gummy', typeId: store.gummies.types[0]?.id ?? '', mixed: true })}>Armar mi mix <Icon name="arrow" size={17} /></button></div>}
      {store.demo && <p className="catalog-footnote">Disponibilidad por confirmar con la tienda.</p>}
    </section>
    {store.categories.dessertsEnabled && <section id="postres" className="product-section dessert-section" aria-labelledby="desserts-title">
      <div className="section-heading">
        <div><span className="eyebrow section-kicker"><span>02</span> POSTRES</span><h2 id="desserts-title">Una pausa que sabe bien.</h2></div>
      </div>
      <div className="product-grid">{store.desserts.map(dessert => <article className="product-card" key={dessert.id}>
        <div className="dessert-photo-wrap">
          <button className="card-photo" aria-label={`Personalizar ${dessert.name}`} onClick={() => onProduct({ kind: 'dessert', dessert })}>
            <ProductImage src={dessert.image} alt={dessert.imageAlt} width={800} height={640} loading="lazy" style={{ objectPosition: dessert.imagePosition }} />
            <span className="product-tag">{dessert.tag}</span>
            {!dessert.available && <span className="unavailable-badge">No disponible</span>}
          </button>
          <button className="photo-zoom" aria-label={`Ampliar foto de ${dessert.name}`} onClick={() => onZoom({ src: dessert.image, alt: dessert.imageAlt, name: dessert.name })}><Icon name="zoom" size={19} /></button>
        </div>
        <div className="product-card-info">
          <div className="product-card-title"><h3>{dessert.name}</h3></div><p>{dessert.description}</p>
          <div className="product-card-footer"><div><span className="price-from">Desde</span><strong>{startingPrice(dessert.variants.filter(variant => variant.available).map(variant => variant.priceMinor))}</strong></div><button className="product-action" disabled={!dessert.available} onClick={() => onProduct({ kind: 'dessert', dessert })} aria-label={`Elegir presentación de ${dessert.name}`}>Elegir <span className="action-icon"><Icon name="plus" size={17} /></span></button></div>
        </div>
      </article>)}</div>
      {store.demo && <p className="catalog-footnote"><span>Postres y presentaciones de ejemplo. Recetas por confirmar.</span></p>}
    </section>}
  </div>
}
