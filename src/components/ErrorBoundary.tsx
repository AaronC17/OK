import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Keep a failed render or unavailable lazy chunk from leaving a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Onky’s: no se pudo mostrar la página.', error, info.componentStack) }

  render() {
    if (!this.state.failed) return this.props.children
    return <main className="app-error container">
      <h1>No pudimos cargar esta parte de la tienda.</h1>
      <p role="alert">Comprueba tu conexión y vuelve a cargar la página para continuar.</p>
      <button className="button button-primary" onClick={() => window.location.reload()}>Volver a cargar</button>
      <a href="/" className="text-button">Ir al inicio</a>
    </main>
  }
}
