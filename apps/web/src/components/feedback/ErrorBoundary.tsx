/** Captura errores inesperados de render; evita pantalla blanca y ofrece recarga. */
import { Component, type ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="fatal-error">
          <h1>No pudimos mostrar esta página</h1>
          <p>
            Recarga para intentar de nuevo. Si persiste, restablece los datos de demostración desde
            el acceso.
          </p>
          <button className="button button-primary" onClick={() => window.location.reload()}>
            Recargar
          </button>
        </main>
      );
    return this.props.children;
  }
}
