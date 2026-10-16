import { useState } from 'react'
import { store } from '../config/store.ts'
import { money, resolveLine } from '../lib/shop.ts'
import type { CartItem, Dessert, Selection, Weight } from '../types.ts'
import { Icon } from './Icon.tsx'
import { Modal, ProductImage, Quantity } from './ui.tsx'

export type ProductTarget = { kind: 'gummy'; typeId: string; mixed?: boolean } | { kind: 'dessert'; dessert: Dessert }

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
  const type = store.gummies.types.find(type => type.id === typeIds[0]) ?? store.gummies.types[0]
  const dessert = target.kind === 'dessert' ? target.dessert : null
  const selection: Selection = isGummy ? { kind: 'gummy', typeIds, weight } : { kind: 'dessert', productId: dessert!.id, variantId }
  const enoughTypes = !isGummy || mode === 'single' || typeIds.length >= 2
  const line = enoughTypes ? resolveLine({ selection, quantity }, store) : null
  const image = line?.image ?? (isGummy ? type?.image : dessert?.image) ?? '/images/placeholder.svg'
  const imageAlt = line?.imageAlt ?? (isGummy ? type?.imageAlt : dessert?.imageAlt) ?? 'Producto por actualizar'

  const lockedSingle = isGummy && !(target.kind === 'gummy' && !!target.mixed)
  // El artículo Mixto siempre combina todos los tipos disponibles: sin
  // selector de modo ni elección de tipos, solo gramos y cantidad.
  const lockedMixed = target.kind === 'gummy' && !!target.mixed && store.gummies.mixes.enabled
  const visibleTypes = store.gummies.types
  const chooseType = (id: string) => {
    if (mode === 'single') { setTypeIds([id]); return }
    setTypeIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  }

  return <Modal open={open} onClose={onClose} titleId="product-title" className="product-dialog">
    <div className="product-dialog-inner">
      <button className="icon-button modal-close" onClick={onClose} aria-label="Cerrar configuración"><Icon name="close" /></button>
      <div className="product-visual">
        <ProductImage key={image} src={image} alt={imageAlt} />
      </div>
      <div className="product-options">
        {!isGummy && <span className="eyebrow">UN PEQUEÑO GUSTO, MUY TUYO</span>}
        {!isGummy ? (
          <h2 id="product-title">{dessert!.name}</h2>
        ) : (
          <h2 id="product-title" className="sr-only">
            {lockedMixed ? 'Personalizar gomitas mixtas' : `Personalizar ${type.name}`}
          </h2>
        )}
        {!isGummy && <p className="muted">{dessert!.description}</p>}
        {isGummy ? <>
          {!lockedSingle && !lockedMixed && <fieldset>
            <legend>{store.gummies.mixes.enabled ? '02' : '01'} <span>{mode === 'mixed' ? 'Elige dos o tres favoritos' : 'Elige tu favorito'}</span></legend>
            <div className="type-options">{visibleTypes.map(option => <label key={option.id} className={`type-option ${!option.available ? 'unavailable' : ''}`}>
              <input type={mode === 'mixed' ? 'checkbox' : 'radio'} name="gummy-type" value={option.id} checked={typeIds.includes(option.id)} onChange={() => chooseType(option.id)} disabled={!option.available} />
              <ProductImage src={option.image} alt="" /><span>{option.name}</span>
              {typeIds.includes(option.id) && <span className="selection-check"><Icon name="check" size={12} /></span>}
            </label>)}</div>
          </fieldset>}
          <fieldset>
            <legend>{lockedSingle || lockedMixed ? '01' : store.gummies.mixes.enabled ? '03' : '02'} <span>{lockedSingle || lockedMixed ? 'Elige los gramos' : 'La medida de tu momento'}</span></legend>
            <div className="weight-options">{store.gummies.weights.map(option => <label key={option} className="choice-chip">
              <input type="radio" name="gummy-weight" value={option} checked={weight === option} onChange={() => setWeight(option)} /><span>{option} <small>g</small></span>
            </label>)}</div>
          </fieldset>
          <p className="option-note"><Icon name="info" size={16} />{mode === 'mixed' ? 'Los gramos son el total de tu bolsa, no por tipo. Coordinamos las proporciones contigo.' : 'Una bolsa con tu tipo de gomita favorito.'}</p>
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
          <div><span className="field-label">{isGummy ? 'Cantidad de bolsas' : 'Cantidad de presentaciones'}</span><Quantity value={quantity} onChange={setQuantity} label={isGummy ? 'Cantidad de bolsas' : 'Cantidad de presentaciones'} /></div>
          <div className="configuration-price" aria-live="polite" aria-atomic="true"><span className="muted">{quantity > 1 ? `Por ${quantity} ${isGummy ? 'bolsas' : 'presentaciones'}` : 'Precio por unidad'}</span><strong key={line?.lineTotalMinor}>{line ? money(line.lineTotalMinor, store) : 'Por seleccionar'}</strong></div>
        </div>
        {!line && <p className="field-error" role="status">{!enoughTypes ? 'Elige al menos dos tipos para una bolsa mixta.' : 'Esta combinación o presentación no está disponible todavía.'}</p>}
        <button className="button button-primary add-button" disabled={!line} onClick={() => { if (line) onAdd({ selection, quantity }) }}><Icon name="bag" size={19} /> Añadir al carrito <Icon name="arrow" size={19} /></button>
        <p className="dialog-footnote">{store.demo ? 'Precios de ejemplo en colones. ' : ''}Disponibilidad a confirmar.</p>
      </div>
    </div>
  </Modal>
}
