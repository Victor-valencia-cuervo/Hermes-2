// Servicio Audius robusto — Fase 0/1.
// Gateway principal + fallback discovery, timeout, cache en memoria,
// metadatos extendidos y búsqueda avanzada (tracks / users / playlists).
// Docs: https://docs.audius.co/api — read-only con ?app_name=&api_key=

const HOSTS = [
  'https://api.audius.co',
  'https://discoveryprovider.audius.co',
];
const VER = '/v1';
const APP = import.meta.env.VITE_AUDIUS_APP_NAME || 'hermesproyec';
const KEY = import.meta.env.VITE_AUDIUS_API_KEY;

export const AUDIUS_GENRES = [
  'Electronic', 'Hip-Hop/Rap', 'Alternative', 'Pop', 'Rock',
  'R&B/Soul', 'Country', 'Folk', 'Jazz', 'Classical',
  'Reggae', 'Punk', 'Metal', 'Techno', 'House', 'Ambient',
];
export const TRENDING_TIMES = [
  ['week', 'Semana'], ['month', 'Mes'], ['year', 'Año'], ['allTime', 'Histórico'],
];

const qs = (o = {}) =>
  new URLSearchParams({
    app_name: APP,
    ...(KEY ? { api_key: KEY } : {}),
    ...Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null)),
  }).toString();

// --- fetch con timeout + retry por hosts ---
async function fetchTimeout(url, ms = 12000) {
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

async function getJson(path, params = {}) {
  let lastErr;
  for (const h of HOSTS) {
    try {
      return await fetchTimeout(`${h}${VER}${path}?${qs(params)}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Audius no responde');
}

// --- cache simple 5 min ---
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
  if (cache.size > 120) cache.delete(cache.keys().next().value);
}

// --- mappers ---
const artOf = (a = {}, fb = '') =>
  a['1000x1000'] || a['480x480'] || a['150x150'] || fb || '';

export const streamUrl = (id) => `${HOSTS[0]}${VER}/tracks/${id}/stream?${qs()}`;

export function fromAudius(t) {
  if (!t) return null;
  const rawId = String(t.id);
  return {
    id: `a_${rawId}`,
    rawId,
    title: t.title || 'Sin título',
    artist: t.user?.name || 'Desconocido',
    artistId: t.user?.id ? `u_${t.user.id}` : null,
    artistHandle: t.user?.handle || '',
    art: artOf(t.artwork),
    artLarge: artOf(t.artwork),
    src: streamUrl(rawId),
    full: true,
    source: 'Audius',
    duration: t.duration || 0,
    genre: t.genre || '',
    mood: t.mood || '',
    bpm: t.bpm || null,
    playCount: t.play_count || 0,
    favCount: t.favorite_count || 0,
    repostCount: t.repost_count || 0,
    permalink: t.permalink ? `https://audius.co${t.permalink}` : '',
    releaseDate: t.release_date || '',
    streamable: t.is_streamable !== false,
    availability: t.is_streamable === false ? 'unavailable' : 'streaming',
    libraryState: 'saved',
    downloaded: false,
    localAvailable: false,
    available: t.is_streamable !== false,
  };
}

export function fromUser(u) {
  if (!u) return null;
  return {
    id: `u_${u.id}`,
    rawId: String(u.id),
    name: u.name || u.handle || 'Artista',
    handle: u.handle || '',
    bio: u.bio || '',
    location: u.location || '',
    followers: u.follower_count || 0,
    trackCount: u.track_count || 0,
    playlistCount: u.playlist_count || 0,
    verified: !!u.is_verified,
    art: artOf(u.profile_picture, u.profile_picture?.['150x150'] || ''),
  };
}

export function fromPlaylist(pl) {
  if (!pl) return null;
  return {
    id: `p_${pl.id}`,
    rawId: String(pl.id),
    title: pl.playlist_name || 'Playlist',
    artist: pl.user?.name || '',
    artistHandle: pl.user?.handle || '',
    art: artOf(pl.artwork),
    trackCount: pl.total_play_count ?? pl.playlist_contents?.track_ids?.length ?? 0,
    tracks: (pl.tracks || []).map(fromAudius).filter(Boolean),
  };
}

const fromItunes = (t) => ({
  id: `i_${t.trackId}`,
  rawId: String(t.trackId),
  title: t.trackName,
  artist: t.artistName,
  art: (t.artworkUrl100 || '').replace('100x100', '300x300'),
  src: t.previewUrl,
  full: false,
  source: 'iTunes',
  duration: Math.round((t.trackTimeMillis || 30000) / 1000),
  genre: t.primaryGenreName || '',
});

async function searchItunes(term, limit = 25) {
  const r = await fetchTimeout(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit}`,
  );
  return (r.results || []).filter((t) => t.previewUrl).map(fromItunes);
}

// --- API pública ---
export async function searchTracks(term, { limit = 25, genre = '' } = {}) {
  const ck = `st:${term}:${limit}:${genre}`;
  const hit = cGet(ck);
  if (hit) return hit;
  const d = await getJson('/tracks/search', { query: term, limit, ...(genre ? { genre } : {}) });
  const list = (d.data || [])
    .filter((t) => t.is_streamable !== false)
    .map(fromAudius)
    .filter(Boolean);
  cSet(ck, list);
  return list;
}

export async function searchArtists(term, limit = 10) {
  const ck = `sa:${term}:${limit}`;
  const hit = cGet(ck);
  if (hit) return hit;
  const d = await getJson('/users/search', { query: term, limit });
  const list = (d.data || []).map(fromUser).filter(Boolean);
  cSet(ck, list);
  return list;
}

export async function searchPlaylists(term, limit = 10) {
  const ck = `sp:${term}:${limit}`;
  const hit = cGet(ck);
  if (hit) return hit;
  const d = await getJson('/playlists/search', { query: term, limit });
  const list = (d.data || []).map(fromPlaylist).filter(Boolean);
  cSet(ck, list);
  return list;
}

/** Búsqueda avanzada: tracks + artists + playlists en paralelo. */
export async function searchAll(term, { limit = 15, genre = '' } = {}) {
  const [tracks, artists, playlists] = await Promise.all([
    searchTracks(term, { limit, genre }).catch(() => []),
    searchArtists(term, 8).catch(() => []),
    searchPlaylists(term, 8).catch(() => []),
  ]);
  return { tracks, artists, playlists };
}

export async function trendingTracks({ limit = 20, genre = '', time = 'week' } = {}) {
  // Compat: trendingTracks() sin args sigue funcionando.
  const ck = `tr:${limit}:${genre}:${time}`;
  const hit = cGet(ck);
  if (hit) return hit;
  const d = await getJson('/tracks/trending', { limit, ...(genre ? { genre } : {}), time });
  const list = (d.data || [])
    .filter((t) => t.is_streamable !== false)
    .map(fromAudius)
    .filter(Boolean);
  cSet(ck, list);
  return list;
}

export async function getArtistTracks(userId, limit = 20) {
  const d = await getJson(`/users/${userId}/tracks`, { limit });
  return (d.data || []).filter((t) => t.is_streamable !== false).map(fromAudius).filter(Boolean);
}

export async function getArtist(rawIdOrHandle) {
  const d = await getJson(`/users/${rawIdOrHandle}`);
  return fromUser(d.data);
}

export async function getPlaylist(rawId) {
  const d = await getJson(`/playlists/${rawId}`);
  const pl = Array.isArray(d.data) ? d.data[0] : d.data;
  return fromPlaylist(pl);
}

/** Respaldo iTunes solo para metadata cuando Audius está vacío (previews 30s). */
export { searchItunes };
