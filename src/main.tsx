import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import BrandGallery from './components/BrandGallery.tsx'
import FoodDirection from './components/FoodDirection.tsx'
import GummiesPreview from './components/GummiesPreview.tsx'
import './styles.css'
import './orders.css'

const view = new URLSearchParams(window.location.search).get('vista')
const AdminDashboard = lazy(() => import('./components/AdminDashboard.tsx'))
const admin = window.location.pathname.replace(/\/$/, '') === '/admin'
createRoot(document.getElementById('root')!).render(<StrictMode><Suspense fallback={<p className="notice">Cargando…</p>}>{admin ? <AdminDashboard /> : view === 'gomitas' ? <GummiesPreview /> : view === 'bocetos' ? <FoodDirection /> : view === 'archivo-marca' ? <BrandGallery /> : <App />}</Suspense></StrictMode>)
