import React from 'react';

/* eslint-disable no-undef */
// Etiqueta del build para saber qué versión corre en cada dispositivo.
const BUILD = typeof __BUILD__ !== 'undefined' ? __BUILD__ : 'dev';

/**
 * Si algo revienta en render, muestra el error en pantalla en vez
 * de dejar la app en negro. `label` identifica la zona que cayó.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, stack: '', jsstack: '' };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[hermes] crash:', error, info?.componentStack);
    try {
      this.setState({
        stack: String(info?.componentStack || '').slice(0, 600),
        jsstack: String(error?.stack || '').slice(0, 1500),
      });
    } catch { /* noop */ }
  }
  render() {
    const { error, stack, jsstack } = this.state;
    if (!error) return this.props.children;
    // Si cae solo una zona (menú, contenido, reproductor…) no se tapa toda la app:
    // tarjeta compacta con reintento sin recargar. La pantalla completa queda para la raíz.
    if (this.props.label) {
      return (
        <div role="alert" style={{ margin: '12px', padding: '14px 16px', borderRadius: 16, background: 'rgba(127,127,127,.12)', border: '1px solid rgba(127,127,127,.25)', fontFamily: 'system-ui, sans-serif', fontSize: 13 }}>
          <p style={{ fontWeight: 700, marginBottom: 2 }}>Esta parte no pudo cargarse</p>
          <p style={{ opacity: 0.7, marginBottom: 10, wordBreak: 'break-word' }}>{String(error?.message || error).slice(0, 140)}</p>
          <button onClick={() => this.setState({ error: null, stack: '', jsstack: '' })}
            style={{ padding: '8px 16px', borderRadius: 12, border: 0, background: '#6366f1', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      );
    }
    const label = '';
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#09090b', color: '#fafafa', padding: 24, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <p style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Algo se rompió al iniciar{label}</p>
          <p style={{ fontSize: 12, opacity: 0.7, wordBreak: 'break-word' }}>{String(error?.message || error)}</p>
          {!!stack && <pre style={{ fontSize: 10, opacity: 0.5, wordBreak: 'break-all', whiteSpace: 'pre-wrap', textAlign: 'left', maxHeight: 220, overflowY: 'auto', marginTop: 6, background: 'rgba(255,255,255,.06)', padding: 8, borderRadius: 8 }}>{stack}{jsstack ? `\n---JS---\n${jsstack}` : ''}</pre>}
          <p style={{ fontSize: 10, opacity: 0.45, marginTop: 6 }}>build {BUILD}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '10px 20px', borderRadius: 12, border: 0, background: '#6366f1', color: '#fff', fontSize: 14, cursor: 'pointer' }}
          >
            Recargar
          </button>
          <div>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                  indexedDB.deleteDatabase('hermes-local');
                } catch { /* sigue igual */ }
                window.location.reload();
              }}
              style={{ marginTop: 10, padding: '8px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,.2)', background: 'transparent', color: '#fafafa', fontSize: 13, cursor: 'pointer' }}
            >
              Borrar datos y empezar de cero
            </button>
          </div>
          <p style={{ fontSize: 11, opacity: 0.5, marginTop: 10 }}>Si recargar no funciona, usa ese botón: limpia lo guardado en este dispositivo. O prueba el modo seguro: agrega ?seguro=1 a la dirección.</p>
        </div>
      </div>
    );
  }
}
