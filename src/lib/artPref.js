// Preferencia por canción: ¿carátula original (por defecto) o la miniatura de YouTube?
// El botón "Revertir carátula" la cambia y se recuerda para esa canción.
const KEY = 'h_art_pref_v1';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } };

export const prefersYT = (id) => !!id && !!read()[id];

export function setPrefYT(id, yt) {
  if (!id) return;
  try {
    const m = read();
    if (yt) m[id] = 1; else delete m[id];
    const ks = Object.keys(m);
    if (ks.length > 400) for (const k of ks.slice(0, ks.length - 400)) delete m[k];
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch { /* sin almacenamiento */ }
}

// ---- Carátula elegida a mano para una canción (se recuerda; no hay que volver a buscarla) ----
const CKEY = 'h_art_custom_v1';
const readC = () => { try { return JSON.parse(localStorage.getItem(CKEY) || '{}') || {}; } catch { return {}; } };
export const getCustomArt = (id) => (id ? readC()[id] || '' : '');
export function setCustomArt(id, url) {
  if (!id || !url) return;
  try {
    const m = readC();
    delete m[id]; m[id] = url; // reinsertar = más reciente al final
    const ks = Object.keys(m);
    if (ks.length > 300) for (const k of ks.slice(0, ks.length - 300)) delete m[k];
    localStorage.setItem(CKEY, JSON.stringify(m));
  } catch { /* sin almacenamiento */ }
}
export function clearCustomArt(id) {
  if (!id) return;
  try { const m = readC(); delete m[id]; localStorage.setItem(CKEY, JSON.stringify(m)); } catch { /* noop */ }
}
