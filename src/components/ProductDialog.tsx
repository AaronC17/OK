import { useState } from 'react'
import { store } from '../config/store.ts'
import { money, resolveLine } from '../lib/shop.ts'
import type { CartItem, Dessert, Product, Selection, Weight } from '../types.ts'
import { Icon } from './Icon.tsx'
import { Modal, ProductImage, Quantity } from './ui.tsx'

export type ProductTarget =
  | { kind: 'gummy'; typeId: string; mixed?: boolean }
  | { kind: 'dessert'; dessert: Dessert }
  | { kind: 'product'; product: Product }

function GummyTypeGraphic({ id }: { id: string }) {
  if (id === 'tiritas') {
    // Aros: bicolor peach/crimson gummy ring with chamoy/Tajín specks
    return (
      <svg viewBox="0 0 44 44" className="gummy-type-svg" aria-hidden="true">
        <defs>
          <linearGradient id="gummy-ring-grad" x1="8" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffb703" />
            <stop offset="48%" stopColor="#fb8500" />
            <stop offset="52%" stopColor="#e63946" />
            <stop offset="100%" stopColor="#9b111e" />
          </linearGradient>
        </defs>
        <circle cx="22" cy="23" r="14" fill="#382448" opacity="0.1" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M22 7a15 15 0 1 0 0 30 15 15 0 0 0 0-30Zm0 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"
          fill="url(#gummy-ring-grad)"
        />
        <path d="M13 14a12 12 0 0 1 15-2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.55" fill="none" />
        <circle cx="15" cy="27" r="1" fill="#780000" opacity="0.7" />
        <circle cx="29" cy="17" r="1.1" fill="#780000" opacity="0.65" />
        <circle cx="25" cy="30" r="0.9" fill="#ffb703" opacity="0.8" />
      </svg>
    )
  }
  if (id === 'gusanitos') {
    // Gusanos: bicolor S-curved segmented gummy worm
    return (
      <svg viewBox="0 0 44 44" className="gummy-type-svg" aria-hidden="true">
        <defs>
          <linearGradient id="gummy-worm-grad" x1="8" y1="34" x2="36" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffb703" />
            <stop offset="45%" stopColor="#f77f00" />
            <stop offset="55%" stopColor="#d62828" />
            <stop offset="100%" stopColor="#800f2f" />
          </linearGradient>
        </defs>
        <path
          d="M11 32 C10 22, 22 25, 22 18 C22 11, 33 13, 33 10"
          stroke="#382448"
          strokeWidth="9.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.1"
          transform="translate(0 1.5)"
        />
        <path
          d="M11 32 C10 22, 22 25, 22 18 C22 11, 33 13, 33 10"
          stroke="url(#gummy-worm-grad)"
          strokeWidth="9.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M11 32 C10 22, 22 25, 22 18 C22 11, 33 13, 33 10"
          stroke="#ffffff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="2 5"
          fill="none"
          opacity="0.42"
        />
        <circle cx="31.5" cy="9.5" r="1" fill="#fff" opacity="0.7" />
        <circle cx="14" cy="27" r="1" fill="#780000" opacity="0.65" />
        <circle cx="24" cy="16" r="1" fill="#780000" opacity="0.65" />
      </svg>
    )
  }
  // Ositos: glossy enchilado gummy bear
  return (
    <svg viewBox="0 0 44 44" className="gummy-type-svg" aria-hidden="true">
      <defs>
        <linearGradient id="gummy-bear-grad" x1="12" y1="6" x2="32" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff4d6d" />
          <stop offset="55%" stopColor="#c9184a" />
          <stop offset="100%" stopColor="#800f2f" />
        </linearGradient>
      </defs>
      <g fill="url(#gummy-bear-grad)">
        <circle cx="14" cy="11" r="4.2" />
        <circle cx="30" cy="11" r="4.2" />
        <circle cx="22" cy="15.5" r="8.8" />
        <ellipse cx="13.5" cy="25" rx="3.5" ry="5.2" transform="rotate(18 13.5 25)" />
        <ellipse cx="30.5" cy="25" rx="3.5" ry="5.2" transform="rotate(-18 30.5 25)" />
        <ellipse cx="22" cy="27" rx="8.8" ry="8.5" />
        <circle cx="17" cy="33.5" r="4" />
        <circle cx="27" cy="33.5" r="4" />
      </g>
      <ellipse cx="18.5" cy="13.5" rx="2" ry="3" fill="#fff" opacity="0.42" />
      <circle cx="25" cy="25" r="1" fill="#590d22" opacity="0.65" />
      <circle cx="19" cy="29" r="0.9" fill="#ffb703" opacity="0.7" />
    </svg>
  )
}

export function ProductDialog({ target, open, onClose, onAdd }: {
  target: ProductTarget; open: boolean; onClose: () => void; onAdd: (item: CartItem) => void
  onZoom?: (image: { src: string; alt: string; name: string }) => void
}) {
  const initialMix = target.kind === 'gummy' && !!target.mixed && store.gummies.mixes.enabled
  const [mode] = useState<'single' | 'mixed'>(initialMix ? 'mixed' : 'single')
  const [typeIds, setTypeIds] = useState<string[]>(target.kind === 'gummy'
    ? initialMix ? store.gummies.types.filter(type => type.available).map(type => type.id) : [target.typeId]
    : [])
  const [weight, setWeight] = useState<Weight>(store.gummies.weights[0])
  const [variantId, setVariantId] = useState(target.kind === 'dessert'
    ? target.dessert.variants.find(variant => variant.available && variant.priceMinor !== null)?.id ?? '' : '')
  const [quantity, setQuantity] = useState(1)
  const isGummy = target.kind === 'gummy'
  const isProduct = target.kind === 'product'
  const product = isProduct ? target.product : null
  const dessert = target.kind === 'dessert' ? target.dessert : null
  const type = isGummy ? store.gummies.types.find(type => type.id === typeIds[0]) ?? store.gummies.types[0] : null
  const selection: Selection = isGummy
    ? { kind: 'gummy', typeIds, weight }
    : isProduct
      ? { kind: 'product', productId: product!.id }
      : { kind: 'dessert', productId: dessert!.id, variantId }
  const enoughTypes = !isGummy || mode === 'single' || typeIds.length >= 2
  const line = enoughTypes ? resolveLine({ selection, quantity }, store) : null
  const image = line?.image ?? (isGummy ? (mode === 'mixed' ? store.heroImage : type?.image) : isProduct ? product?.image : dessert?.image) ?? '/images/placeholder.svg'
  const imageAlt = line?.imageAlt ?? (isGummy ? type?.imageAlt : isProduct ? product?.imageAlt : dessert?.imageAlt) ?? 'Producto por actualizar'

  const visibleTypes = store.gummies.types
  const chooseType = (id: string) => {
    if (mode === 'single') { setTypeIds([id]); return }
    setTypeIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  }


  return <Modal open={open} onClose={onClose} titleId="product-title" className="product-dialog">
    <div className={`product-dialog-inner ${mode === 'mixed' ? 'is-mixed-dialog' : ''}`}>
      <button className="icon-button modal-close" onClick={onClose} aria-label="Cerrar configuración"><Icon name="close" /></button>
      <div className="product-visual" data-weight={isGummy ? String(weight) : undefined}>
        <div className="product-visual-stage">
          <ProductImage key={image} src={image} alt={imageAlt} />
        </div>
      </div>
      <div className="product-options">
        {isProduct ? (
          <>
            <span className="eyebrow">ANTOJO ESPECIAL · ONKY’S</span>
            <h2 id="product-title">{product!.name}</h2>
            <p className="muted">{product!.description}</p>
          </>
        ) : !isGummy ? (
          <>
            <span className="eyebrow">UN PEQUEÑO GUSTO, MUY TUYO</span>
            <h2 id="product-title">{dessert!.name}</h2>
            <p className="muted">{dessert!.description}</p>
          </>
        ) : (
          <div className="dialog-compact-head">
            <h2 id="product-title">
              {mode === 'mixed' ? 'Mix de gomitas' : `${type?.name} ${type?.coatingLabel}`}
            </h2>
            <span className="dialog-mode-pill">
              {mode === 'mixed'
                ? `${typeIds.length} ${typeIds.length === 1 ? 'tipo' : 'tipos'}`
                : 'Un solo tipo'}
            </span>
          </div>
        )}
        {isGummy ? <>
          {mode === 'mixed' && <fieldset className="dialog-fieldset">
            <legend>
              <span className="legend-step">01</span>
              <span>Elige tus gomitas para el mix <small>(2 o 3)</small></span>
            </legend>
            <div className="type-options">
              {visibleTypes.map(option => {
                const checked = typeIds.includes(option.id)
                return (
                  <label key={option.id} className={`type-option ${!option.available ? 'unavailable' : ''} ${checked ? 'is-selected' : ''}`}>
                    <input
                      type="checkbox"
                      name="gummy-type"
                      value={option.id}
                      checked={checked}
                      onChange={() => chooseType(option.id)}
                      disabled={!option.available}
                    />
                    <span className="type-option-graphic">
                      <GummyTypeGraphic id={option.id} />
                    </span>
                    <span className="type-option-name">{option.name}</span>
                    {checked && <span className="selection-check"><Icon name="check" size={11} /></span>}
                  </label>
                )
              })}
            </div>
          </fieldset>}
          <fieldset className="dialog-fieldset">
            <legend>
              <span className="legend-step">{mode === 'mixed' ? '02' : '01'}</span>
              <span>Elige el tamaño de tu bolsa</span>
            </legend>
            <div className="weight-options">
              {store.gummies.weights.map(option => {
                const isSelected = weight === option
                return (
                  <label key={option} className={`choice-chip ${isSelected ? 'is-selected' : ''}`}>
                    <input
                      type="radio"
                      name="gummy-weight"
                      value={option}
                      checked={isSelected}
                      onChange={() => setWeight(option)}
                    />
                    <span>
                      <strong>{option} g</strong>
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        </> : isProduct ? <>
          <fieldset className="dialog-fieldset">
            <legend>
              <span className="legend-step">01</span>
              <span>Presentación</span>
            </legend>
            <div className="size-options">
              <label className="size-option" style={{ cursor: 'default' }}>
                <input type="radio" name="product-variant" checked readOnly />
                <span><strong>{product!.unitLabel ?? 'Domo individual'}</strong><small>{product!.tag}</small></span>
                <span>{money(product!.priceMinor, store)}</span>
              </label>
            </div>
          </fieldset>
          {product!.ingredients && (
            <p className="option-note"><Icon name="info" size={16} />Ingredientes: {product!.ingredients}.</p>
          )}
        </> : <>
          <fieldset><legend>01 <span>Elige tu presentación</span></legend>
            <div className="size-options">{dessert!.variants.map(variant => <label key={variant.id} className={`size-option ${!variant.available || variant.priceMinor === null ? 'unavailable' : ''}`}>
              <input type="radio" name="dessert-variant" value={variant.id} checked={variantId === variant.id} disabled={!variant.available || variant.priceMinor === null} onChange={() => setVariantId(variant.id)} />
              <span><strong>{variant.label}</strong><small>{variant.description}{!variant.available ? ' · No disponible' : ''}</small></span>
              <span>{variant.priceMinor === null ? 'Por definir' : money(variant.priceMinor, store)}</span>
            </label>)}</div>
          </fieldset>
          <p className="option-note"><Icon name="info" size={16} />{store.demo ? 'Presentaciones de ejemplo. ' : ''}{dessert!.ingredients ? `Ingredientes: ${dessert!.ingredients}.` : 'Receta e ingredientes por confirmar con la tienda.'}</p>
          {dessert!.allergenInfo && <p className="option-note">Alérgenos: {dessert!.allergenInfo}</p>}
        </>}
        <div className="configuration-bottom">
          <div><span className="field-label">{isGummy ? 'Cantidad' : isProduct ? 'Cantidad de domos' : 'Cantidad de presentaciones'}</span><Quantity value={quantity} onChange={setQuantity} label={isGummy ? 'Cantidad de bolsas' : isProduct ? 'Cantidad de domos' : 'Cantidad de presentaciones'} /></div>
          <div className="configuration-price" aria-live="polite" aria-atomic="true"><span className="muted">{quantity > 1 ? `Total (${quantity} unidades)` : 'Total'}</span><strong key={line?.lineTotalMinor}>{line ? money(line.lineTotalMinor, store) : '—'}</strong></div>
        </div>
        {!line && <p className="field-error" role="status">{!enoughTypes ? 'Selecciona al menos 2 tipos de gomitas para tu mix.' : 'Esta combinación o presentación no está disponible todavía.'}</p>}
        <button className="button button-primary add-button" disabled={!line} onClick={() => { if (line) onAdd({ selection, quantity }) }}><Icon name="bag" size={19} /> Añadir al carrito <Icon name="arrow" size={19} /></button>
      </div>
    </div>
  </Modal>
}
