// Scrobble a ListenBrainz. Token del usuario en localStorage h_lb_token (nunca en código).
// POST https://api.listenbrainz.org/1/submit-listens { listen_type: single, payload: [{ listened_at, track_metadata }] }

export function getLBToken() {
  try { return localStorage.getItem('h_lb_token') || ''; } catch { return ''; }
}

export async function submitListen(token, track, ms = 8000) {
  const tk = (token || getLBToken() || '').trim();
  if (!tk || !track?.title) return false;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch('https://api.listenbrainz.org/1/submit-listens', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { Authorization: `Token ${tk}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        listen_type: 'single',
        payload: [{
          listened_at: Math.floor(Date.now() / 1000),
          track_metadata: {
            artist_name: track.artist || track.channel || 'Desconocido',
            track_name: track.title || 'Sin título',
            release_name: track.album || '',
            additional_info: {
              duration: Math.round(Number(track.duration) || 0) || undefined,
              origin_url: track.videoId ? `https://www.youtube.com/watch?v=${track.videoId}` : undefined,
              playing_from: 'Hermes',
            },
          },
        }],
      }),
    });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkLBToken(token) {
  const tk = (token || '').trim();
  if (!tk) return false;
  try {
    const r = await fetch(`https://api.listenbrainz.org/1/user/${encodeURIComponent('me')}`, {
      headers: { Authorization: `Token ${tk}` },
    });
    // validate-token es el endpoint correcto; si falla por red, intenta submit dry con GET user
    if (r.status === 404) return true; // token con formato válido pero sin usuario me: se valida al scrobblear
    return r.ok || r.status === 401 ? r.ok : false;
  } catch {
    return false;
  }
}

export async function validateLBToken(token, ms = 8000) {
  const tk = (token || '').trim();
  if (!tk) return { ok: false, msg: 'vacío' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch('https://api.listenbrainz.org/1/validate-token', {
      signal: ctrl.signal,
      headers: { Authorization: `Token ${tk}` },
    });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok && j?.valid === true, msg: j?.message || (r.ok ? 'ok' : `HTTP ${r.status}`) };
  } catch (e) {
    return { ok: false, msg: String(e?.message || e) };
  } finally {
    clearTimeout(timer);
  }
}
