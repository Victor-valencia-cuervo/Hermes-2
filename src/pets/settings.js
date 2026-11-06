import { MAX_PETS } from './pets';
import { knownPet } from './catalog';

export const DEFAULT_PETS = { on: true, sel: ['capi', 'gato'], size: 'm', mode: 'walk', talk: true, freq: 'normal', shake: false, shakeSens: 'normal' };
export const SIZES = { s: 0.8, m: 1, l: 1.3 };
// Intervalo (ms) entre comentarios espontáneos.
export const FREQ = { low: [480000, 840000], normal: [180000, 360000], high: [60000, 150000] };

/** Normaliza lo guardado: ids válidos, máximo 5, valores por defecto si falta algo. */
export function normalizePets(raw) {
  const c = { ...DEFAULT_PETS, ...(raw && typeof raw === 'object' ? raw : {}) };
  const seen = new Set();
  c.sel = (Array.isArray(c.sel) ? c.sel : []).filter((id) => knownPet(id) && !seen.has(id) && seen.add(id)).slice(0, MAX_PETS);
  if (!SIZES[c.size]) c.size = 'm';
  if (!['walk', 'float'].includes(c.mode)) c.mode = 'walk';
  if (!FREQ[c.freq]) c.freq = 'normal';
  // Sacudida por gravedad: apagada por defecto, solo funciona si se activa.
  if (typeof c.shake !== 'boolean') c.shake = false;
  if (!['soft', 'normal', 'strong'].includes(c.shakeSens)) c.shakeSens = 'normal';
  return c;
}

const SPOT_KEY = 'h_pets_spots';
export const readSpots = () => { try { return JSON.parse(localStorage.getItem(SPOT_KEY)) || {}; } catch { return {}; } };
export const writeSpot = (id, spot) => {
  try { localStorage.setItem(SPOT_KEY, JSON.stringify({ ...readSpots(), [id]: spot })); } catch { /* sin almacenamiento */ }
};
export const clearSpots = () => { try { localStorage.removeItem(SPOT_KEY); } catch { /* noop */ } };
