// Spotify Web API vía PKCE (sin secret en frontend).
// Client ID público en VITE_SPOTIFY_CLIENT_ID. Flujo:
// login() -> redirect accounts.spotify.com/authorize (code_challenge S256)
// handleCallback() -> canjea ?code por access_token en api/token + code_verifier
// Uso en Hermes: descubrir (search, top, playlists, liked) y resolver a YT para sonar.

const CLIENT_ID = (import.meta?.env?.VITE_SPOTIFY_CLIENT_ID || 'da62420866b548cd8107525f63ac8a0e').trim();
const REDIRECT_URI = () => {
  // En prod usa el origin actual (debe estar en Redirect URIs del dashboard).
  // Agrega http://localhost:5173/ en el dashboard para dev.
  try { return `${window.location.origin}/`; } catch { return 'https://hermes06.pages.dev/'; }
};
const SCOPES = ['user-library-read', 'playlist-read-private', 'playlist-read-collaborative', 'user-read-private', 'user-read-email'].join(' ');
const AUTH_KEY = 'h_sp_auth';
const VER_KEY = 'h_sp_verifier';

function b64url(buf) {
  const s = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function challenge(verifier) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return b64url(d);
}

export function spotifyConfigured() { return !!CLIENT_ID; }
export function getSpotifyAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch { return null; }
}
export function spotifyConnected() {
  const a = getSpotifyAuth();
  return !!(a?.access_token && a?.expires_at > Date.now() + 60000);
}
export function disconnectSpotify() {
  meCache = null;
  try { localStorage.removeItem(AUTH_KEY); sessionStorage.removeItem(VER_KEY); } catch {}
}

export async function loginSpotify() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(64)));
  try { sessionStorage.setItem(VER_KEY, verifier); } catch {}
  const ch = await challenge(verifier);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI(),
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: ch,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function handleSpotifyCallback() {
  let code = null;
  try {
    const u = new URL(window.location.href);
    code = u.searchParams.get('code');
  } catch { return null; }
  if (!code) return null;
  const verifier = (() => { try { return sessionStorage.getItem(VER_KEY) || ''; } catch { return ''; } })();
  if (!verifier) return null;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI(),
    code_verifier: verifier,
  });
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) throw new Error(`Spotify token HTTP ${r.status}`);
  const j = await r.json();
  const auth = {
    access_token: j.access_token,
    refresh_token: j.refresh_token || getSpotifyAuth()?.refresh_token || null,
    expires_at: Date.now() + (Number(j.expires_in) || 3600) * 1000,
    token_type: j.token_type || 'Bearer',
  };
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(auth)); } catch {}
  try { sessionStorage.removeItem(VER_KEY); } catch {}
  // Limpia ?code de la URL
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete('code');
    u.searchParams.delete('state');
    u.searchParams.delete('error');
    window.history.replaceState({}, '', u.toString());
  } catch {}
  return auth;
}

async function refreshSpotify() {
  const a = getSpotifyAuth();
  if (!a?.refresh_token) return null;
  const body = new URLSearchParams({
    client_id: CLIENT_ID,
    grant_type: 'refresh_token',
    refresh_token: a.refresh_token,
  });
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!r.ok) return null;
  const j = await r.json();
  const na = {
    access_token: j.access_token,
    refresh_token: j.refresh_token || a.refresh_token,
    expires_at: Date.now() + (Number(j.expires_in) || 3600) * 1000,
    token_type: j.token_type || 'Bearer',
  };
  try { localStorage.setItem(AUTH_KEY, JSON.stringify(na)); } catch {}
  return na;
}

async function spFetch(path) {
  let a = getSpotifyAuth();
  if (!a?.access_token) throw new Error('Spotify no conectado');
  if (a.expires_at < Date.now() + 60000) {
    a = (await refreshSpotify()) || a;
  }
  const doFetch = (token) => fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let r = await doFetch(a.access_token);
  if (r.status === 401) {
    const na = await refreshSpotify();
    if (!na) throw new Error('Spotify expirado, reconecta en Ajustes');
    r = await doFetch(na.access_token);
    if (r.status === 401) throw new Error('Spotify expirado, reconecta en Ajustes');
  }
  if (!r.ok) {
    let detail = '';
    try {
      const j = await r.json();
      detail = j?.error?.message || j?.error?.reason || '';
    } catch { /* sin cuerpo */ }
    if (r.status === 403) {
      throw new Error(`Spotify 403${detail ? `: ${detail}` : ''}. Causas: 1) tu cuenta no está en Dashboard → User Management (modo Development solo deja 25 usuarios), 2) conectaste antes de dar permisos Liked/Playlists. Solución: Ajustes → Desconectar → Conectar de nuevo y acepta todos los permisos.`);
    }
    throw new Error(`Spotify HTTP ${r.status}${detail ? `: ${detail}` : ''}`);
  }
  return r.json();
}

let meCache = null;
export async function getSpotifyMe() {
  if (meCache) return meCache;
  const j = await spFetch('/me');
  meCache = j;
  return j;
}

const imgOf = (images, fb = '') => images?.[0]?.url || images?.[1]?.url || fb;

export async function searchSpotifyTracks(q, limit = 10) {
  // market evita 403 por relinking/región: usa país del usuario, fallback US.
  let market = 'US';
  try {
    const me = await getSpotifyMe().catch(() => null);
    if (me?.country) market = me.country;
  } catch { /* fallback US */ }
  const j = await spFetch(`/search?q=${encodeURIComponent(q)}&type=track&limit=${Math.min(20, limit)}&market=${market}`);
  return (j?.tracks?.items || []).map((t) => ({
    id: `sp_${t.id}`,
    spotifyId: t.id,
    title: t.name,
    artist: (t.artists || []).map((a) => a.name).join(', '),
    album: t.album?.name || '',
    art: imgOf(t.album?.images),
    duration: Math.round((t.duration_ms || 0) / 1000),
    source: 'Spotify',
    external_url: t.external_urls?.spotify || '',
    preview_url: t.preview_url || null,
  }));
}

export async function getSpotifyLiked(limit = 20) {
  const j = await spFetch(`/me/tracks?limit=${Math.min(50, limit)}`);
  return (j?.items || []).map((it) => {
    const t = it.track || {};
    return {
      id: `sp_${t.id}`, spotifyId: t.id, title: t.name,
      artist: (t.artists || []).map((a) => a.name).join(', '),
      album: t.album?.name || '', art: imgOf(t.album?.images),
      duration: Math.round((t.duration_ms || 0) / 1000),
      source: 'Spotify', external_url: t.external_urls?.spotify || '',
    };
  });
}

export async function getSpotifyPlaylists(limit = 20) {
  const j = await spFetch(`/me/playlists?limit=${Math.min(50, limit)}`);
  return (j?.items || []).map((pl) => ({
    id: pl.id, name: pl.name, desc: pl.description || '',
    art: imgOf(pl.images), count: pl.tracks?.total || 0,
    url: pl.external_urls?.spotify || '',
  }));
}

export async function getSpotifyPlaylistTracks(playlistId, limit = 30) {
  const j = await spFetch(`/playlists/${encodeURIComponent(playlistId)}/tracks?limit=${Math.min(50, limit)}`);
  return (j?.items || []).map((it) => {
    const t = it.track || {};
    if (!t?.id) return null;
    return {
      id: `sp_${t.id}`, spotifyId: t.id, title: t.name,
      artist: (t.artists || []).map((a) => a.name).join(', '),
      album: t.album?.name || '', art: imgOf(t.album?.images),
      duration: Math.round((t.duration_ms || 0) / 1000),
      source: 'Spotify', external_url: t.external_urls?.spotify || '',
    };
  }).filter(Boolean);
}
