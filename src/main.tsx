import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './styles.css'

const view = new URLSearchParams(window.location.search).get('vista')
const AdminDashboard = lazy(() => import('./components/AdminDashboard.tsx'))
const BrandGallery = lazy(() => import('./components/BrandGallery.tsx'))
const FoodDirection = lazy(() => import('./components/FoodDirection.tsx'))
const GummiesPreview = lazy(() => import('./components/GummiesPreview.tsx'))
const admin = window.location.pathname.replace(/\/$/, '') === '/admin'
createRoot(document.getElementById('root')!).render(<StrictMode><Suspense fallback={<p className="notice">Cargando…</p>}>{admin ? <AdminDashboard /> : view === 'gomitas' ? <GummiesPreview /> : view === 'bocetos' ? <FoodDirection /> : view === 'archivo-marca' ? <BrandGallery /> : <App />}</Suspense></StrictMode>)
