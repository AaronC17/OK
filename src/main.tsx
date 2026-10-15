import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import BrandGallery from './components/BrandGallery.tsx'
import FoodDirection from './components/FoodDirection.tsx'
import GummiesPreview from './components/GummiesPreview.tsx'
import './styles.css'

const view = new URLSearchParams(window.location.search).get('vista')
createRoot(document.getElementById('root')!).render(<StrictMode>{view === 'gomitas' ? <GummiesPreview /> : view === 'bocetos' ? <FoodDirection /> : view === 'archivo-marca' ? <BrandGallery /> : <App />}</StrictMode>)
