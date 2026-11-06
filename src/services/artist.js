// Perfil de artista + álbumes + canciones vía iTunes Search/lookup (gratis, sin key).
// La reproducción se resuelve al video oficial de YouTube con resolveOfficial,
// igual que Tendencias/Lanzamientos. Docs: https://music.apple.com/us/search
// y https://itunes.apple.com/lookup?id=...&entity=album|song

const cache = new Map();
const TTL = 5 * 60 * 1000;
function cGet(k) {
  const e = cache.get(k);
  if (e && Date.now() - e.t < TTL) return e.v;
  cache.delete(k);
  return null;
}
function cSet(k, v) {
  cache.set(k, { v, t: Date.now() });
  if (cache.size > 80) cache.delete(cache.keys().next().value);
}

async function fetchTimeout(url, ms = 8000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } finally {
    clearTimeout(t);
  }
}

const bigArt = (u = '', px = 300) =>
  String(u || '').replace('100x100', `${px}x${px}`).replace('60x60', `${px}x${px}`);

const norm = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/** ¿El artista encontrado corresponde a lo buscado? (evita perfiles falsos) */
export function artistMatches(term, name) {
  const t = norm(term);
  const n = norm(name);
  if (!t || !n) return false;
  if (n === t || n.includes(t) || t.includes(n)) return true;
  const words = t.split(/\s+/).filter((w) => w.length > 2);
  if (!words.length) return false;
  const hit = words.filter((w) => n.includes(w)).length;
  return hit / words.length >= 0.7;
}

/** Mejor artista para un término (o null si no hay coincidencia fiable). */
export async function searchArtist(term) {
  const q = String(term || '').trim();
  if (q.length < 2) return null;
  const ck = `ar:${q.toLowerCase()}`;
  const hit = cGet(ck);
  if (hit !== null) return hit;
  try {
    const j = await fetchTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=musicArtist&limit=6`,
    );
    const cands = (j.results || []).filter((a) => a.artistId && a.artistName);
    const best = cands.find((a) => artistMatches(q, a.artistName)) || null;
    const out = best
      ? {
          id: `art_${best.artistId}`,
          artistId: best.artistId,
          name: best.artistName,
          genre: best.primaryGenreName || '',
          art: bigArt(best.artworkUrl100 || ''),
        }
      : null;
    cSet(ck, out);
    return out;
  } catch {
    return null;
  }
}

/** Álbumes de un artista (ordenados: más recientes primero). */
export async function getArtistAlbums(artistId, limit = 12) {
  if (!artistId) return [];
  const ck = `alb:${artistId}:${limit}`;
  const hit = cGet(ck);
  if (hit) return hit;
  try {
    const j = await fetchTimeout(
      `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=${limit * 2}`,
    );
    const seen = new Set();
    const list = (j.results || [])
      .filter((x) => x.collectionType === 'Album' && x.collectionId && !seen.has(x.collectionId) && seen.add(x.collectionId))
      .sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0))
      .slice(0, limit)
      .map((a) => ({
        id: `al_${a.collectionId}`,
        collectionId: a.collectionId,
        title: a.collectionName || 'Álbum',
        artist: a.artistName || '',
        artistId: a.artistId,
        art: bigArt(a.artworkUrl100 || a.artworkUrl60 || '', 400),
        trackCount: a.trackCount || 0,
        releaseDate: (a.releaseDate || '').slice(0, 4),
        genre: a.primaryGenreName || '',
      }));
    cSet(ck, list);
    return list;
  } catch {
    return [];
  }
}

/** Canciones de un álbum (pista, título, duración). */
export async function getAlbumTracks(collectionId, limit = 30) {
  if (!collectionId) return [];
  const ck = `songs:${collectionId}:${limit}`;
  const hit = cGet(ck);
  if (hit) return hit;
  try {
    const j = await fetchTimeout(
      `https://itunes.apple.com/lookup?id=${collectionId}&entity=song&limit=${limit + 5}`,
    );
    const rows = (j.results || []).filter((x) => x.wrapperType === 'track' && x.trackId);
    const head = (j.results || []).find((x) => x.collectionId === Number(collectionId));
    const list = rows.slice(0, limit).map((s) => ({
      id: `s_${collectionId}_${s.trackId}`,
      trackId: s.trackId,
      collectionId: s.collectionId,
      trackNumber: s.trackNumber || 0,
      title: s.trackName || 'Sin título',
      artist: s.artistName || head?.artistName || '',
      art: bigArt(s.artworkUrl100 || head?.artworkUrl100 || '', 300),
      duration: Math.round((s.trackTimeMillis || 0) / 1000),
      genre: s.primaryGenreName || head?.primaryGenreName || '',
      preview: s.previewUrl || '',
    }));
    cSet(ck, list);
    return list;
  } catch {
    return [];
  }
}

/** Top canciones de un artista (para el perfil). */
export async function getArtistTopSongs(artistName, limit = 8) {
  const q = String(artistName || '').trim();
  if (!q) return [];
  const ck = `top:${q.toLowerCase()}:${limit}`;
  const hit = cGet(ck);
  if (hit) return hit;
  try {
    const j = await fetchTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${limit * 2}&attribute=artistTerm`,
    );
    const seen = new Set();
    const list = (j.results || [])
      .filter((s) => s.trackId && s.trackName)
      .filter((s) => artistMatches(q, s.artistName))
      .filter((s) => {
        const k = norm(`${s.artistName} ${s.trackName}`);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, limit)
      .map((s) => ({
        id: `s_top_${s.trackId}`,
        trackId: s.trackId,
        collectionId: s.collectionId,
        title: s.trackName,
        artist: s.artistName,
        art: bigArt(s.artworkUrl100 || '', 300),
        duration: Math.round((s.trackTimeMillis || 0) / 1000),
        genre: s.primaryGenreName || '',
        preview: s.previewUrl || '',
      }));
    cSet(ck, list);
    return list;
  } catch {
    return [];
  }
}

/**
 * Paquete completo del perfil para una búsqueda: artista + top + álbumes.
 * Nunca lanza: ante cualquier fallo devuelve { artist: null, top: [], albums: [] }.
 * Con tope global para no frenar la lista de videos.
 */
export async function getArtistProfile(term, ms = 9000) {
  const done = (async () => {
    const artist = await searchArtist(term);
    if (!artist) return { artist: null, top: [], albums: [] };
    const [top, albums] = await Promise.all([
      getArtistTopSongs(artist.name, 8).catch(() => []),
      getArtistAlbums(artist.artistId, 12).catch(() => []),
    ]);
    return { artist, top, albums };
  })().catch(() => ({ artist: null, top: [], albums: [] }));
  return Promise.race([
    done,
    new Promise((res) => setTimeout(() => res({ artist: null, top: [], albums: [] }), ms)),
  ]);
}

/** Canciones genéricas por término (para categorías): iTunes entity=song. */
export async function searchSongs(term, limit = 12) {
  const q = String(term || '').trim();
  if (!q) return [];
  const ck = `ss:${q.toLowerCase()}:${limit}`;
  const hit = cGet(ck);
  if (hit) return hit;
  try {
    const j = await fetchTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${limit * 2}`,
    );
    const seen = new Set();
    const list = (j.results || [])
      .filter((s) => s.trackId && s.trackName)
      .filter((s) => {
        const k = norm(`${s.artistName} ${s.trackName}`);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .slice(0, limit)
      .map((s) => ({
        id: `g_${s.trackId}`,
        trackId: s.trackId,
        collectionId: s.collectionId,
        title: s.trackName,
        artist: s.artistName,
        art: bigArt(s.artworkUrl100 || '', 300),
        duration: Math.round((s.trackTimeMillis || 0) / 1000),
        genre: s.primaryGenreName || '',
        preview: s.previewUrl || '',
      }));
    cSet(ck, list);
    return list;
  } catch {
    return [];
  }
}

/** Álbumes genéricos por término (para categorías): iTunes entity=album. */
export async function searchAlbums(term, limit = 12) {
  const q = String(term || '').trim();
  if (!q) return [];
  const ck = `sal:${q.toLowerCase()}:${limit}`;
  const hit = cGet(ck);
  if (hit) return hit;
  try {
    const j = await fetchTimeout(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=album&limit=${limit * 2}`,
    );
    const seen = new Set();
    const list = (j.results || [])
      .filter((a) => a.collectionId && a.collectionName && !seen.has(a.collectionId) && seen.add(a.collectionId))
      .slice(0, limit)
      .map((a) => ({
        id: `gal_${a.collectionId}`,
        collectionId: a.collectionId,
        title: a.collectionName || 'Álbum',
        artist: a.artistName || '',
        artistId: a.artistId,
        art: bigArt(a.artworkUrl100 || a.artworkUrl60 || '', 400),
        trackCount: a.trackCount || 0,
        releaseDate: (a.releaseDate || '').slice(0, 4),
        genre: a.primaryGenreName || '',
      }));
    cSet(ck, list);
    return list;
  } catch {
    return [];
  }
}

/**
 * Paquete de categoría: canciones + álbumes iTunes en paralelo.
 * Nunca lanza; con tope global para no frenar los videos de YouTube.
 */
export async function getCategoryPack(term, ms = 9000) {
  const done = (async () => {
    const [songs, albums] = await Promise.all([
      searchSongs(term, 12).catch(() => []),
      searchAlbums(term, 12).catch(() => []),
    ]);
    return { songs, albums };
  })().catch(() => ({ songs: [], albums: [] }));
  return Promise.race([
    done,
    new Promise((res) => setTimeout(() => res({ songs: [], albums: [] }), ms)),
  ]);
}
