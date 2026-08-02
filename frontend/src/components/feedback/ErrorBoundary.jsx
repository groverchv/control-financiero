import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * ErrorBoundary global para capturar errores en el árbol de componentes React.
 *
 * Estándar de Calidad: CORRECTO
 * - Evita que un error en un componente hijo derrumbe toda la aplicación.
 * - Muestra una pantalla amigable con opción de recarga.
 * - Registra el error en consola para depuración.
 *
 * Nota: Los Error Boundaries DEBEN ser Class Components (requisito de React).
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error capturado:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/inicio';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0f172a',
            padding: '24px',
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '24px',
              padding: '48px 32px',
              maxWidth: '440px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <AlertTriangle style={{ width: '56px', height: '56px', color: '#f59e0b' }} />
            </div>
            <h1
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: '#f1f5f9',
                marginBottom: '8px',
                margin: '0 0 8px 0',
              }}
            >
              Algo salió mal
            </h1>
            <p
              style={{
                fontSize: '14px',
                color: '#94a3b8',
                lineHeight: 1.6,
                marginBottom: '24px',
                margin: '0 0 24px 0',
              }}
            >
              Ocurrió un error inesperado en la aplicación. Puedes intentar
              recargar la página para continuar.
            </p>
            <button
              onClick={this.handleReload}
              style={{
                background: '#3b82f6',
                color: '#fff',
                border: 'none',
                padding: '12px 28px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseOver={(e) => (e.target.style.background = '#2563eb')}
              onMouseOut={(e) => (e.target.style.background = '#3b82f6')}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
