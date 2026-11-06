import { searchTracks as searchAudius } from '../services/audius';
import { getOriginalCover } from '../services/covers';

// Carátulas reales para temas locales (con wifi): iTunes primero, Audius después.
// Si no hay coincidencia o falla la red, se devuelve '' y queda el arte generado.

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const toks = (s) => norm(s).replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
const overlap = (a, b) => {
  if (!a.length || !b.length) return 0;
  const B = new Set(b);
  const hit = a.filter((w) => B.has(w)).length;
  return hit / Math.max(a.length, b.length);
};

/** Elige la mejor coincidencia (título parecido + artista mencionado). */
function pickBest(cands, title, artist) {
  const tt = toks(title);
  const at = toks(artist);
  let best = null;
  let bs = 0;
  for (const c of cands || []) {
    if (!c?.art) continue;
    const ct = toks(c.title);
    const to = overlap(tt, ct);
    const ao = Math.max(
      overlap(at, toks(c.artist)),
      at.length && at[0].length > 2 && ct.includes(at[0]) ? 0.5 : 0,
    );
    if (to < 0.5) continue;
    if (!(ao >= 0.34)) continue;
    const s = to * 0.7 + ao * 0.3;
    if (s > bs) { best = c; bs = s; }
  }
  return best;
}

/** Reduce un dataURL de imagen a máx 512px JPEG. Nunca lanza. */
export function shrinkArt(dataUrl, maxSide = 512) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (!w || !h) { resolve(''); return; }
          const k = Math.min(1, maxSide / Math.max(w, h));
          if (k >= 1) { resolve(dataUrl); return; }
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(w * k));
          cv.height = Math.max(1, Math.round(h * k));
          cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          resolve(cv.toDataURL('image/jpeg', 0.82));
        } catch {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = dataUrl;
    } catch {
      resolve('');
    }
  });
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    try {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    } catch (e) {
      reject(e);
    }
  });
}

/** Descarga una imagen a dataURL (con repliegue por proxy si el host niega CORS). */
export async function downloadArt(url) {
  if (!url || /^data:|^blob:/.test(String(url))) return String(url || '');
  const cands = [String(url)];
  try {
    const u = String(url).replace(/^https?:\/\//, '').replace(/^\/\//, '');
    if (u) cands.push(`https://wsrv.nl/?url=${encodeURIComponent(u)}&w=600&h=600&fit=cover&output=jpg`);
  } catch { /* solo directa */ }
  for (const u of cands) {
    try {
      const r = await fetch(u, { mode: 'cors' });
      if (!r.ok) continue;
      const b = await r.blob();
      if (!b?.size || !String(b.type || '').startsWith('image/')) continue;
      const du = await blobToDataURL(b);
      if (typeof du === 'string' && du.startsWith('data:image')) return du;
    } catch { /* siguiente candidato */ }
  }
  return '';
}

const withTimeout = (p, ms) => Promise.race([
  Promise.resolve(p).catch(() => null),
  new Promise((r) => setTimeout(() => r(null), ms)),
]);

/** Busca carátula real (dataURL 512px) para título+artista. '' si no hay. Nunca lanza.
 * Orden: iTunes oficial 600 -> MusicBrainz/CAA original -> Audius -> YT al final.
 * Antes YT iba primero y por eso salían frames del video en vez del álbum. */
export async function findRemoteArt(title, artist, timeout = 9000, videoId = null) {
  try {
    if (!navigator.onLine) return '';
    const q = `${artist || ''} ${title || ''}`.replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!q) return '';
    // 1. Arte ORIGINAL via covers (iTunes 600 -> MB/CAA). Reutiliza su caché.
    try {
      const original = await withTimeout(getOriginalCover(title, artist, { videoId }), timeout);
      if (original && !/i\.ytimg\.com/.test(original)) {
        const du = await withTimeout(downloadArt(original), timeout);
        if (du) return (await shrinkArt(du).catch(() => '')) || du;
      }
      // Si solo hay thumb YT, se sigue a los repliegues para intentar superarlo
      if (original && !videoId) {
        const du = await withTimeout(downloadArt(original), timeout);
        if (du) return (await shrinkArt(du).catch(() => '')) || du;
      }
    } catch { /* repliegues */ }
    // 2. Audius (independiente, hasta 1000px) como repliegue
    try {
      const au = await withTimeout(searchAudius(q, { limit: 6 }), timeout);
      const m2 = pickBest(au, title, artist);
      if (m2?.art) {
        const du = await withTimeout(downloadArt(m2.art), timeout);
        if (du) return (await shrinkArt(du).catch(() => '')) || du;
      }
    } catch { /* sigue a YT */ }
    // 3. YouTube al final: maxres si existe, si no hq (es frame, no álbum)
    if (videoId) {
      for (const u of [`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`]) {
        try {
          const du = await withTimeout(downloadArt(u), 5000);
          if (du) return (await shrinkArt(du).catch(() => '')) || du;
        } catch { /* siguiente */ }
      }
    }
  } catch { /* queda la generada */ }
  return '';
}
