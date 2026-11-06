/**
 * Escenario del reproductor YouTube: UN solo player oculto (solo audio).
 *
 * FIX (carga infinita en la primera reproducción): antes el player se creaba
 * en un <div> suelto que solo se enganchaba al DOM cuando <PlayerBar/> montaba
 * su slot (y PlayerBar no pinta nada hasta que hay una canción). Un iframe
 * fuera del documento no carga, así que onReady nunca llegaba y la primera
 * canción se quedaba "cargando" hasta recargar la página.
 * Ahora el host vive SIEMPRE en document.body desde el primer momento y
 * nunca se mueve (mover un iframe en el DOM lo recarga).
 */
export const stage = { container: null, host: null };

function ensureHost() {
  if (typeof document === 'undefined') return null;
  if (stage.host && stage.host.isConnected) return stage.host;
  const h = document.createElement('div');
  h.id = 'yt-audio-host';
  h.setAttribute('aria-hidden', 'true');
  // 2px reales (no display:none ni fuera de pantalla extrema: algunos
  // navegadores móviles pausan los iframes ocultos del todo).
  h.style.cssText = 'position:fixed;left:0;bottom:0;width:2px;height:2px;overflow:hidden;opacity:0.01;pointer-events:none;z-index:-1';
  document.body.appendChild(h);
  stage.host = h;
  return h;
}

export function ensureContainer() {
  const host = ensureHost();
  if (!host) return null;
  if (!stage.container || !stage.container.isConnected) {
    const d = document.createElement('div');
    d.style.width = '2px';
    d.style.height = '2px';
    host.appendChild(d);
    stage.container = d;
  }
  return stage.container;
}

/** Compat: el player ya vive en su host fijo; solo se asegura que esté montado. */
export function ensureHidden() {
  const host = ensureHost();
  const c = stage.container;
  if (host && c && !c.isConnected) host.appendChild(c);
}

/** Compat. */
export function place() { ensureHidden(); }
export function sizeToSlot() {}
