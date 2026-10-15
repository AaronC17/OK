import { foodDirections } from '../config/creative-direction.ts'
import { gummyPreparation } from '../config/gummy-preparation.ts'
import { store } from '../config/store.ts'
import { Icon } from './Icon.tsx'
import './brand-gallery.css'
import './food-direction.css'

const directions = foodDirections.map(direction => direction.id === '01' ? {
  ...direction,
  subtitle: 'Gusanitos, sandías, aros y ositos. Sin envolturas.',
  description: 'Preparación casera con las formas de tus referencias: chamoy y jugo de limón ya añadidos, Tajín cayendo y mezcla suave con espátula. Sin mostrar limones enteros, cortados o exprimidos.',
  shots: gummyPreparation.steps.map(step => `${step.title} · ${step.description}`),
  imagePrompt: gummyPreparation.imagePrompts[0],
  videoPrompt: gummyPreparation.videoPrompt,
  motion: 'Un plano continuo: se añade el Tajín, se mezcla con espátula y se muestra el resultado. El video actual sigue siendo la referencia anterior, no esta nueva preparación.',
} : direction)

/** A revised storyboard, not generated media. No API access or billable controls. */
export default function FoodDirection() {
  return <>
    <header className="brand-header container">
      <a className="wordmark" href="/" aria-label={`${store.name}, volver a la tienda`}>{store.name}<span className="brand-dot">.</span></a>
      <span className="brand-header-label">DIRECCIÓN CORREGIDA / PRODUCTOS</span>
      <a className="brand-return" href="/">Volver a la tienda <Icon name="arrow-up" size={17} /></a>
    </header>
    <main className="brand-gallery container food-direction">
      <div className="brand-intro">
        <div><span className="eyebrow">GOMITAS ENCHILADAS Y POSTRES</span><h1>Dulce. Ácido.<br /><span>Y con carácter.</span></h1><p>Chamoy, Tajín y jugo de limón. Tres leches y pie de limón. Esa es la propuesta de Onky’s que debe verse desde el primer vistazo.</p></div>
        <div className="brand-round-info"><span className="brand-round-pill"><Icon name="cake" size={17} />Postres pendientes de fotos reales</span><p>Solo se trabaja el video de las gomitas.<br />Los bocetos de regalos quedan descartados.</p><a className="button button-outline" href="/?vista=gomitas">Ver video de gomitas <Icon name="arrow" size={17} /></a></div>
      </div>
      <div className="brand-guidance"><Icon name="info" size={19} /><p>El nuevo guion de gomitas usa las referencias que compartiste, sin mostrar las bolsas. Todavía no se envió esta nueva generación. Seedance y Sunburst devuelven tarifas variables, por lo que falta confirmar el presupuesto y disponer de los archivos de referencia. Los postres siguen pendientes de tus fotos reales.</p></div>
      <div className="food-direction-grid">{directions.map(direction => <article className="food-direction-card" key={direction.id}>
        <div className="food-shot-board" aria-label={`Guion visual de ${direction.title}`}><span className="food-board-number">{direction.id}</span><Icon name={direction.icon} size={42} /><span className="eyebrow">PROPUESTA DE ENCUADRE · SIN GENERAR</span><h2>{direction.title}</h2><p>{direction.subtitle}</p><ol>{direction.shots.map(shot => <li key={shot}>{shot}</li>)}</ol></div>
        <p className="food-direction-description">{direction.description}</p>
        <div className="brand-motion-note"><Icon name="play" size={17} /><p><strong>Movimiento propuesto</strong>{direction.motion}</p></div>
        <details className="brand-prompt"><summary>Prompt de la imagen <Icon name="chevron" size={17} /></summary><p>{direction.imagePrompt}</p></details>
        <details className="brand-prompt"><summary>Prompt del movimiento <Icon name="chevron" size={17} /></summary><p>{direction.videoPrompt}</p></details>
      </article>)}</div>
      <div className="food-process"><span className="eyebrow">LA PREPARACIÓN QUE QUIERES MOSTRAR</span><h2>Ingredientes. Tajín. Mezcla.</h2><div>{gummyPreparation.steps.map((step, index) => <p key={step.title}><strong>0{index + 1} · {step.title}</strong>{step.description}</p>)}</div><p>Jugo de limón ya añadido: no aparece la fruta ni se exprime durante el video. Gomitas sueltas, sin envolturas. Para igualar el producto real, se necesitan fotografías claras de las gomitas, no solo los dibujos del empaque.</p></div>
      <footer className="brand-gallery-footer"><div><span className="eyebrow">PRIMERO EL PRODUCTO. DESPUÉS EL MOVIMIENTO.</span><h2>Menos decoración. Más antojo.</h2><p>Blanco cálido, tipografía limpia y violeta solo como acento. Los colores y las texturas vienen de la comida.</p></div><a className="button button-primary" href="/">Volver a la tienda <Icon name="arrow" size={18} /></a></footer>
    </main>
  </>
}
