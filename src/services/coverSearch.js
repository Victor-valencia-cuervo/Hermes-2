// Buscador de carátulas en alta resolución para cambiar la imagen de la canción que suena
// (sin tocar el audio). Solo fuentes legítimas y SIN clave (nada secreto en el frontend):
//   1) Deezer  — API pública (JSONP, como el resto del catálogo): cover_xl 1000×1000.
//   2) iTunes  — Search API pública: artworkUrl100 → 1000×1000.
//   3) MusicBrainz + Cover Art Archive — API abierta (1 req/s): front-1200 escaneado.
// Cada fuente falla por separado: si una cae, las otras igual muestran resultados.
// Sin duplicados: una sola imagen por álbum (prioridad Deezer → iTunes → CAA) y por URL.
import { dzRaw } from './catalog';
import { cleanTrack } from './covers';

const QS = (s) => encodeURIComponent(s || '');
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const cleanArtist = (s) => String(s || '').replace(/\s*-\s*topic\s*$/i, '').replace(/vevo\s*$/i, '').replace(/\s*(official|oficial)(\s+channel|\s+music)?\s*$/i, '').trim();

async function fetchJSON(url, ms, signal) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  if (signal) { if (signal.aborted) c.abort(); else signal.addEventListener('abort', () => c.abort(), { once: true }); }
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

/** mode: 'both' (canción + artista) | 'title' | 'artist' */
function termOf({ title, artist, mode }) {
  const t = cleanTrack(title); const a = cleanArtist(artist);
  if (mode === 'title') return { t, a: '', q: t };
  if (mode === 'artist') return { t: '', a, q: a };
  return { t, a, q: `${a} ${t}`.trim() };
}

async function fromDeezer(term, signal) {
  const out = [];
  const { t, a, q } = term;
  const jobs = [];
  if (t) jobs.push(dzRaw(`/search/track?q=${QS(a ? `artist:"${a}" track:"${t}"` : t)}&limit=15`, 7000).then((j) => (j.data || []).map((r) => ({ album: r.album, artist: r.artist?.name }))));
  jobs.push(dzRaw(`/search/album?q=${QS(a && !t ? `artist:"${a}"` : q)}&limit=15`, 7000).then((j) => (j.data || []).map((r) => ({ album: r, artist: r.artist?.name }))));
  const res = await Promise.allSettled(jobs);
  if (signal?.aborted) return out;
  for (const r of res) {
    if (r.status !== 'fulfilled') continue;
    for (const { album, artist } of r.value) {
      // md5_image vacío = Deezer devuelve una portada genérica, no la real.
      if (!album?.cover_xl || (album.md5_image === '' )) continue;
      out.push({ url: album.cover_xl, thumb: album.cover_medium || album.cover_big || album.cover_xl, album: album.title || '', artist: artist || '', year: '', source: 'Deezer', size: '1000×1000' });
    }
  }
  if (!out.length && res.every((r) => r.status === 'rejected')) throw new Error('Deezer no respondió');
  return out;
}

async function fromITunes(term, signal) {
  const { q, t } = term;
  if (!q) return [];
  const j = await fetchJSON(`https://itunes.apple.com/search?term=${QS(q)}&media=music&entity=${t ? 'song' : 'album'}&limit=20`, 7000, signal);
  return (j.results || []).filter((r) => r.artworkUrl100).map((r) => {
    const big = String(r.artworkUrl100).replace(/\/\d+x\d+(bb)?\./, '/1000x1000bb.');
    return { url: big, thumb: String(r.artworkUrl100).replace(/\/\d+x\d+(bb)?\./, '/300x300bb.'), album: r.collectionName || '', artist: r.artistName || '', year: String(r.releaseDate || '').slice(0, 4), source: 'iTunes', size: '1000×1000' };
  });
}

async function fromMusicBrainz(term, signal) {
  const { t, a } = term;
  const parts = [];
  if (t) parts.push(`release:"${t}"`);
  if (a) parts.push(`artist:"${a}"`);
  if (!parts.length) return [];
  const j = await fetchJSON(`https://musicbrainz.org/ws/2/release/?query=${QS(parts.join(' AND '))}&fmt=json&limit=10`, 8000, signal);
  return (j.releases || []).filter((r) => r.id).map((r) => ({
    url: `https://coverartarchive.org/release/${r.id}/front-1200`,
    thumb: `https://coverartarchive.org/release/${r.id}/front-250`,
    album: r.title || '', artist: (r['artist-credit'] || []).map((x) => x.name).join(', '),
    year: String(r.date || '').slice(0, 4), source: 'Cover Art Archive', size: 'hasta 1200px', unverified: true,
  }));
}

/**
 * Busca carátulas. Devuelve { items, errors } (nunca lanza).
 * items: [{ id, url, thumb, album, artist, year, source, size }] sin duplicados.
 */
export async function searchCoverCandidates({ title = '', artist = '', mode = 'both', signal } = {}) {
  const term = termOf({ title, artist, mode });
  if (!term.q) return { items: [], errors: [] };
  const sources = [['Deezer', fromDeezer], ['iTunes', fromITunes], ['Cover Art Archive', fromMusicBrainz]];
  const settled = await Promise.allSettled(sources.map(([, fn]) => fn(term, signal)));
  const errors = []; const seenUrl = new Set(); const seenAlbum = new Set(); const items = [];
  settled.forEach((r, i) => {
    if (r.status === 'rejected') { errors.push(sources[i][0]); return; }
    for (const c of r.value) {
      const albumKey = `${norm(c.album)}|${norm(c.artist)}`;
      if (!c.url || seenUrl.has(c.url) || (c.album && seenAlbum.has(albumKey))) continue; // sin duplicados
      seenUrl.add(c.url); if (c.album) seenAlbum.add(albumKey);
      items.push({ ...c, id: `${c.source}:${c.url}` });
    }
  });
  return { items: items.slice(0, 36), errors };
}
