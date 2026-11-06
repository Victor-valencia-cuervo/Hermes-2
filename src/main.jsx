import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { prewarmYouTube } from './services/youtube';
import './index.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorBoundary><BrowserRouter><App /></BrowserRouter></ErrorBoundary></React.StrictMode>);

// Sin wifi: registra el Service Worker solo en producción (en dev rompería el HMR).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// Calentamiento en el arranque (no al abrir Música): busca una instancia de YouTube viva y
// baja la pantalla de Música en segundo plano, para que la primera búsqueda/canción tras días
// sin abrir la app no espere ese trabajo.
const idle = (fn, ms) => ('requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: ms }) : setTimeout(fn, 300));
idle(() => { prewarmYouTube(); }, 1200);
idle(() => { import('./views/MusicView.jsx').catch(() => {}); }, 4000);

// Las mascotas cancelan sus animaciones rechazando una promesa a propósito (Symbol('cancel')):
// no es un error, así que no se deja como "promesa rechazada sin capturar".
window.addEventListener('unhandledrejection', (e) => { if (typeof e.reason === 'symbol' && String(e.reason) === 'Symbol(cancel)') e.preventDefault(); });
