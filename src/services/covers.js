// Carátulas ORIGINALES (no el frame del video).
// Prioridad: 1) Deezer 1000px (arte oficial del álbum) -> 2) iTunes 600px -> 3) MusicBrainz + Cover Art Archive
// -> 4) YouTube hq (último recurso: solo si ninguna fuente tiene la original).
// Las miniaturas de YouTube suelen traer título "Artista - Tema (Official Video)" y el canal como artista
// ("ArtistaVEVO", "- Topic"): se prueban varias lecturas del título antes de rendirse.
// Todo gratis, sin key, CORS abierto. Cache memoria + localStorage.

import { dzRaw } from './catalog';
import { prefersYT } from '../lib/artPref';

const mem = new Map(); // "titulo|artista" -> { t, url }
const LS = 'h_cover_cache_v2';
const QS = (s) => encodeURIComponent(s || '');

function lsGet(key) {
  try {
    const c = JSON.parse(localStorage.getItem(LS) || '{}');
    const e = c[key];
    if (e && Date.now() - e.t < 30 * 24 * 3600 * 1000) return e.url;
  } catch {}
  return null;
}
function lsSet(key, url) {
  try {
    const c = JSON.parse(localStorage.getItem(LS) || '{}');
    c[key] = { url, t: Date.now() };
    const ks = Object.keys(c);
    if (ks.length > 300) {
      ks.sort((a, b) => (c[a].t || 0) - (c[b].t || 0));
      for (const old of ks.slice(0, ks.length - 300)) delete c[old];
    }
    localStorage.setItem(LS, JSON.stringify(c));
  } catch {}
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const toks = (s) => norm(s).replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
const overlap = (a, b) => {
  if (!a.length || !b.length) return 0;
  const B = new Set(b);
  return a.filter((w) => B.has(w)).length / Math.max(a.length, b.length);
};
export const cleanTrack = (s) => String(s || '')
  .replace(/\s*[\(\[].*?(official|video|lyric|audio|remaster|feat\.?|ft\.?|live|remix|acoustic|slowed|sped up|8d|nightcore|cover|karaoke|tiktok|version).*?[\)\]]\s*/gi, ' ')
  .replace(/\s{2,}/g, ' ').trim();

async function fetchJSON(url, ms = 7000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// 1) iTunes: arte oficial 600px. Exige coincidencia título ≥0.5 + artista ≥0.34.
async function fromITunes(title, artist) {
  const q = `${cleanTrack(artist)} ${cleanTrack(title)}`.trim().slice(0, 80);
  if (!q) return null;
  const j = await fetchJSON(`https://itunes.apple.com/search?term=${QS(q)}&media=music&entity=song&limit=8`);
  const tt = toks(title); const at = toks(artist);
  let best = null; let bs = 0;
  for (const s of j.results || []) {
    if (!s.artworkUrl100) continue;
    const to = overlap(tt, toks(s.trackName));
    const ao = Math.max(overlap(at, toks(s.artistName)), 0);
    if (to < 0.5 || ao < 0.34) continue;
    const sc = to * 0.7 + ao * 0.3;
    if (sc > bs) {
      bs = sc;
      best = String(s.artworkUrl100).replace('100x100', '600x600').replace('60x60', '600x600');
    }
  }
  return best;
}

// 2) MusicBrainz recording -> release -> Cover Art Archive front-500 (arte original).
async function fromMusicBrainz(title, artist) {
  const ct = cleanTrack(title); const ca = cleanTrack(artist);
  if (!ct) return null;
  const query = `recording:"${ct}"${ca ? ` AND artist:"${ca}"` : ''}`;
  const j = await fetchJSON(`https://musicbrainz.org/ws/2/recording/?query=${QS(query)}&fmt=json&limit=6`);
  const recs = j.recordings || [];
  for (const rec of recs) {
    const releases = rec.releases || [];
    for (const rel of releases.slice(0, 3)) {
      if (!rel.id) continue;
      // front-500 existe casi siempre; si da 404 se prueba el siguiente release
      try {
        const url = `https://coverartarchive.org/release/${rel.id}/front-500`;
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 5000);
        try {
          const r = await fetch(url, { signal: c.signal, method: 'GET' });
          if (r.ok && String(r.headers.get('content-type') || '').startsWith('image/')) return url;
        } finally {
          clearTimeout(t);
        }
      } catch { /* siguiente release */ }
    }
    // Si el recording coincide pero sin cover, no seguir buscando a ciegas
    if (recs.length) break;
  }
  return null;
}

const cleanChannel = (s) => String(s || '')
  .replace(/\s*-\s*topic\s*$/i, '').replace(/vevo\s*$/i, '').replace(/\s*(official|oficial)(\s+channel|\s+music)?\s*$/i, '').trim();

/** Lecturas posibles de (artista, título): el dato tal cual y "Artista - Tema" dentro del título. */
function candidates(title, artist) {
  const out = [];
  const a0 = cleanChannel(artist);
  const t0 = cleanTrack(title);
  const m = t0.split(/\s[-–—|:]\s/);
  if (m.length >= 2) {
    out.push({ artist: m[0].trim(), title: m.slice(1).join(' ').trim() });
    out.push({ artist: m[m.length - 1].trim(), title: m[0].trim() });
  }
  out.push({ artist: a0, title: t0 });
  if (a0) out.push({ artist: '', title: `${a0} ${t0}` });
  const seen = new Set();
  return out.filter((c) => c.title && !seen.has(`${norm(c.artist)}|${norm(c.title)}`) && seen.add(`${norm(c.artist)}|${norm(c.title)}`)).slice(0, 4);
}

// 0) Deezer: carátula del álbum a 1000px. Exige coincidencia de título y, si hay artista, de artista.
async function fromDeezer(title, artist) {
  const q = artist ? `artist:"${cleanTrack(artist)}" track:"${cleanTrack(title)}"` : cleanTrack(title);
  const j = await dzRaw(`/search/track?q=${QS(q)}&limit=8`, 7000);
  const tt = toks(title); const at = toks(artist);
  let best = null; let bs = 0;
  for (const r of j.data || []) {
    const cover = r.album?.cover_xl || r.album?.cover_big;
    // Deezer devuelve una portada genérica cuando el álbum no tiene imagen: md5_image vacío = sin carátula real.
    if (!cover || !r.album?.md5_image) continue;
    const to = overlap(tt, toks(r.title_short || r.title));
    const ao = at.length ? overlap(at, toks(r.artist?.name)) : 0.5;
    if (to < 0.5 || ao < 0.34) continue;
    const sc = to * 0.7 + ao * 0.3;
    if (sc > bs) { bs = sc; best = cover; }
  }
  return best;
}

/** Carátula original para título+artista. Devuelve URL http (no dataURL) o ''. Nunca lanza. */
export async function getOriginalCover(title, artist, { videoId = null } = {}) {
  const key = `${norm(cleanTrack(title))}|${norm(cleanChannel(artist))}`;
  if (!cleanTrack(title)) return '';
  const m = mem.get(key);
  if (m && Date.now() - m.t < 30 * 24 * 3600 * 1000) return m.url;
  const ls = lsGet(key);
  if (ls) { mem.set(key, { t: Date.now(), url: ls }); return ls; }
  const save = (url) => { mem.set(key, { t: Date.now(), url }); lsSet(key, url); return url; };

  for (const c of candidates(title, artist)) {
    // Deezer primero (1000px); iTunes como segunda opinión.
    try { const dz = await fromDeezer(c.title, c.artist); if (dz) return save(dz); } catch { /* siguiente fuente */ }
    try { const it = await fromITunes(c.title, c.artist); if (it) return save(it); } catch { /* siguiente fuente */ }
  }
  // MusicBrainz/CAA (original escaneado, mejor en rock/clásica/catálogo)
  for (const c of candidates(title, artist).slice(0, 2)) {
    try { const mb = await fromMusicBrainz(c.title, c.artist); if (mb) return save(mb); } catch { /* siguiente */ }
  }
  // Último recurso: la miniatura de YouTube (solo si no existe la original en ninguna fuente)
  if (videoId) {
    const yt = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    mem.set(key, { t: Date.now(), url: yt });
    return yt;
  }
  return '';
}

/** Enriquecer lista online en segundo plano: reemplaza art YT por original sin bloquear.
 *  onUpdate(nuevaLista) se llama por lotes. Concurrencia 4, solo faltantes. */
export async function enrichOnlineCovers(list, onUpdate, { concurrency = 4 } = {}) {
  const arr = Array.isArray(list) ? list : [];
  if (!arr.length || typeof onUpdate !== 'function') return arr;
  const out = arr.slice();
  // Solo los que aún traen thumb de YouTube (los de iTunes/Audius ya son originales)
  const idxs = [];
  out.forEach((t, i) => {
    if (t && /i\.ytimg\.com/.test(String(t.art || '')) && t.title && !prefersYT(t.id)) idxs.push(i);
  });
  if (!idxs.length) return out;
  let cursor = 0;
  const worker = async () => {
    while (cursor < idxs.length) {
      const i = idxs[cursor++];
      const t = out[i];
      try {
        const url = await getOriginalCover(t.title, t.artist, { videoId: t.videoId });
        if (url && !/i\.ytimg\.com/.test(url)) {
          out[i] = { ...t, art: url, artOriginal: true, ytArt: t.art };
          // Actualiza por lotes cada 3 para no re-renderizar 20 veces
          if (idxs.indexOf(i) % 3 === 0) onUpdate(out.slice());
        }
      } catch { /* conserva thumb */ }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, idxs.length) }, worker));
  onUpdate(out.slice());
  return out;
}
