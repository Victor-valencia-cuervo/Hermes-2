// YouTube como única fuente (modo oficial + verificado).
// - Búsqueda vía Piped (pública, sin key) con instancias de respaldo.
// - Reproducción vía reproductor oficial embebido (sin streams, sin CORS).
// - Verificación previa vía oEmbed: solo existen/públicos llegan a la lista.
// - Ranking "oficial": canales - Topic (audio oficial) y verificados primero.

const INSTANCES = [
  'https://pipedapi.ducks.party',
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.reallyaweso.me',
  'https://pipedapi.drgns.space',
  'https://pipedapi.owo.si',
  'https://pipedapi.darkness.services',
  'https://piped-api.codespace.cz',
];
const LS_KEY = 'h_yt_instance';
const BLOCK_KEY = 'h_yt_blocked'; // videoIds que prohíben el embed (error 101/150)
const oembedCache = new Map(); // videoId -> bool (existe y público)
const resolveCache = new Map(); // "artist — title" -> track verificado

// --- Lista persistente de videos que bloquean reproducción externa ---
function loadBlockedIds() {
  try {
    const a = JSON.parse(localStorage.getItem(BLOCK_KEY));
    return Array.isArray(a) ? a : [];
  } catch { return []; }
}
const blockedIds = new Set(loadBlockedIds());
export function isBlockedVideo(videoId) { return !!videoId && blockedIds.has(videoId); }
export function markBlockedVideo(videoId) {
  if (!videoId || blockedIds.has(videoId)) return;
  blockedIds.add(videoId);
  try { localStorage.setItem(BLOCK_KEY, JSON.stringify([...blockedIds].slice(-500))); } catch { /* noop */ }
}

async function fetchTimeout(url, ms = 12000, ext = null) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  if (ext) { if (ext.aborted) c.abort(); else ext.addEventListener('abort', () => c.abort(), { once: true }); }
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } finally {
    clearTimeout(t);
  }
}

function savedInstance() {
  try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; }
}
function saveInstance(u) {
  try { localStorage.setItem(LS_KEY, u); } catch { /* noop */ }
}

/** Sugerencias de búsqueda (predicciones). [] si nada responde rápido. */
export async function getSuggestions(text) {
  const q = text.trim();
  if (q.length < 2) return [];
  // Carrera corta sobre pocas instancias: la primera con resultados gana.
  const ordered = [...new Set([savedInstance(), ...INSTANCES].filter(Boolean))].slice(0, 5);
  // Todas en paralelo (máx 3.5s): se queda con la primera que traiga algo.
  const settled = await Promise.all(ordered.map((base) =>
    fetchTimeout(`${base}/suggestions?query=${encodeURIComponent(q)}`, 3500)
      .then((d) => (Array.isArray(d) && d.length ? d.filter(Boolean).slice(0, 8) : null))
      .catch(() => null),
  ));
  return settled.find((r) => r?.length) || [];
}

/** Instancia viva en memoria (la que respondió última vez; se prueba primero). */
let memInstance = null; // { base, at }

/**
 * Pide `path` a las instancias de Piped con una carrera ESCALONADA ("hedged"):
 * salen 2 peticiones de inmediato (la última que funcionó + la siguiente) y una más
 * cada 700 ms, o en cuanto una falla. Gana la primera respuesta válida y cancela el resto.
 * Es la petición real (no un "ping" previo), así que no hay doble viaje: tras días sin abrir
 * la app, aunque la instancia guardada haya muerto, la búsqueda llega en ~1-3 s y no en ~10 s.
 */
function pipedGet(path, { ms = 7000, accept = () => true } = {}) {
  const ordered = [...new Set([memInstance?.base, savedInstance(), ...INSTANCES].filter(Boolean))];
  return new Promise((resolve, reject) => {
    let idx = 0; let failed = 0; let done = false;
    const timers = []; const ctrls = [];
    const finish = (fn, v) => {
      if (done) return; done = true;
      timers.forEach(clearTimeout); ctrls.forEach((c) => c.abort());
      fn(v);
    };
    const onFail = () => {
      if (done) return;
      if (++failed >= ordered.length) finish(reject, new Error('YouTube no responde (Piped caído)'));
      else launch();
    };
    function launch() {
      if (done || idx >= ordered.length) return;
      const base = ordered[idx++];
      const c = new AbortController(); ctrls.push(c);
      fetchTimeout(`${base}${path}`, ms, c.signal).then(
        (d) => {
          if (done) return;
          if (accept(d)) { memInstance = { base, at: Date.now() }; saveInstance(base); finish(resolve, { base, data: d }); }
          else onFail();
        },
        () => onFail(),
      );
      if (idx < ordered.length) timers.push(setTimeout(launch, 700));
    }
    if (!ordered.length) { finish(reject, new Error('Sin instancias de YouTube')); return; }
    launch(); launch();
  });
}
const validSearch = (d) => Array.isArray(d?.items) || Array.isArray(d);

/** Encuentra una instancia viva (compat): carrera sobre una búsqueda ligera. */
export async function workingInstance() {
  const { base } = await pipedGet('/search?q=musica&filter=videos', { accept: validSearch });
  return base;
}

let prewarmAt = 0;
/** Precalienta en fondo desde el arranque de la app: instancia viva + API de sugerencias. */
export function prewarmYouTube() {
  try {
    if (Date.now() - prewarmAt < 60 * 1000) return;
    prewarmAt = Date.now();
    workingInstance().catch(() => {});
    getSuggestions('musica').catch(() => {});
  } catch { /* noop */ }
}

const thumbOf = (th) => {
  if (!th) return '';
  if (Array.isArray(th)) return th[th.length - 1]?.url || th[0]?.url || '';
  return typeof th === 'string' ? th : th.url || '';
};
// Los proxies piped-proxy.* suelen estar caídos (502) y dejan sin carátula;
// i.ytimg.com directo es la fuente fiable.
const isDeadProxy = (u) => /piped-proxy|pipedproxy/i.test(String(u || ''));

export function fromPiped(item) {
  if (!item || item.type === 'playlist' || item.type === 'channel') return null;
  const m = String(item.url || '').match(/[?&]v=([^&]+)/);
  const videoId = m?.[1];
  if (!videoId) return null;
  if (item.isShort === true) return null;
  const dur = Number(item.duration) || 0;
  if (dur < 0) return null; // en vivo / estreno programado: fuera
  if (dur > 20 * 60) return null; // mezclas maratónicas: fuera
  const channel = item.uploaderName || item.uploader || 'YouTube';
  const verified = !!item.uploaderVerified;
  const official = /- topic$/i.test(channel) || verified;
  // Miniatura: directo de i.ytimg.com (fiable). Las de Piped vía piped-proxy
  // suelen dar 502; solo se usan si ya apuntan a i.ytimg.com.
  const pipedThumb = thumbOf(item.thumbnail);
  const art = videoId
    ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
    : (!isDeadProxy(pipedThumb) ? pipedThumb : '');
  return {
    id: `y_${videoId}`,
    videoId,
    title: item.title || 'Sin título',
    artist: channel,
    channel,
    verified,
    official,
    views: item.views || 0,
    art,
    src: null, // reproduce el embed oficial
    full: true,
    source: 'YouTube',
    duration: dur > 0 ? Math.round(dur) : 0,
    genre: '',
    availability: 'streaming',
    libraryState: 'saved',
    downloaded: false,
    localAvailable: false,
    available: true,
  };
}

const searchCache = new Map(); // "term|limit" -> { t, items }
const searchInflight = new Map();
export function searchYouTube(term, limit = 15) {
  const key = `${term}|${limit}`;
  const c = searchCache.get(key);
  if (c && Date.now() - c.t < 5 * 60 * 1000) return Promise.resolve(c.items);
  if (searchInflight.has(key)) return searchInflight.get(key);
  const p = searchYouTubeRaw(term, limit).then((items) => {
    if (items.length) { searchCache.set(key, { t: Date.now(), items }); if (searchCache.size > 60) searchCache.delete(searchCache.keys().next().value); }
    return items;
  }).finally(() => searchInflight.delete(key));
  searchInflight.set(key, p);
  return p;
}
async function searchYouTubeRaw(term, limit = 15) {
  const { data } = await pipedGet(`/search?q=${encodeURIComponent(term)}&filter=videos`, { ms: 8000, accept: validSearch });
  return ((data.items || data || []).slice(0, limit))
    .map(fromPiped)
    .filter(Boolean)
    .filter((t) => !blockedIds.has(t.videoId)); // fuera los que ya se sabe que bloquean embed
}

// --- Ranking "oficial" ---
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Ordena candidatos: Topic/verificado primero, remix/cover/karaoke al fondo. */
export function rankCandidates(items, want = {}) {
  const wt = norm(want.title);
  const wa = norm(want.artist);
  return items
    .map((t) => {
      let s = 0;
      if (/- topic$/i.test(t.channel || '')) s += 5; // audio oficial autogenerado
      if (t.verified) s += 3;
      const tt = norm(t.title);
      if (wt && tt.includes(wt.slice(0, 14))) s += 2;
      if (wa && norm(t.channel || '').includes(wa.slice(0, 10))) s += 2;
      if (/official\s*(music\s*)?(video|audio)/i.test(t.title)) s += 2;
      else if (/\(official/i.test(t.title)) s += 1;
      if (/(lyric|letra)/i.test(t.title)) s += 1;
      if (t.duration >= 90 && t.duration <= 600) s += 1;
      s += Math.min(2, Math.log10((t.views || 0) + 1) / 4);
      if (/remix|cover|karaoke|8d|slowed|reverb|nightcore|sped up|mashup/i.test(t.title)) s -= 2;
      return { t, s };
    })
    .sort((a, b) => b.s - a.s)
    .map((x) => x.t);
}

// --- Verificación previa vía oEmbed (existe y es público, con timeout 3.5s) ---
export async function verifyVideo(videoId) {
  if (oembedCache.has(videoId)) return oembedCache.get(videoId);
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 3500);
    let r;
    try {
      r = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
        { signal: c.signal },
      );
    } finally {
      clearTimeout(t);
    }
    // 404/401/403 = borrado/privado/restringido → inválido.
    // Otro fallo de red → fail-open (no vaciamos la lista por un bache).
    const valid = r.ok || (r.status !== 404 && r.status !== 401 && r.status !== 403);
    oembedCache.set(videoId, valid);
    return valid;
  } catch {
    return true;
  }
}

/** Filtra la lista a videos existentes/públicos (lotes de 4, tope global 5s).
 *  En 4G lento oEmbed puede tardar: se verifica por lotes para no saturar la
 *  conexión de la primera canción, y si se acaba el tiempo se muestra sin filtrar. */
export async function filterPublic(tracks) {
  if (!tracks.length) return tracks;
  const usable = tracks.filter((t) => !blockedIds.has(t.videoId));
  if (!usable.length) return usable;
  const batched = (async () => {
    const out = new Array(usable.length);
    for (let i = 0; i < usable.length; i += 4) {
      const slice = usable.slice(i, i + 4);
      const rs = await Promise.all(slice.map((t) => verifyVideo(t.videoId)));
      rs.forEach((v, k) => { out[i + k] = v; });
    }
    return out;
  })();
  // Tope global: si oEmbed tarda, se muestra sin filtrar en vez de colgar la lista.
  const res = await Promise.race([
    batched,
    new Promise((r) => setTimeout(() => r(null), 5000)),
  ]);
  if (!res) return usable;
  return usable.filter((_, i) => res[i]);
}

/**
 * Videos relacionados a uno dado (para la radio automática).
 * Piped los trae en `/streams/:id` como `relatedStreams`.
 * Carrera en paralelo: gana la primera instancia con resultados.
 */
const relCache = new Map(); // videoId -> { t, tracks }
export async function getRelated(videoId, limit = 10) {
  if (!videoId) return [];
  const c = relCache.get(videoId);
  if (c && Date.now() - c.t < 10 * 60 * 1000) return c.tracks.slice(0, limit);
  const ordered = [...new Set([memInstance?.base, savedInstance(), ...INSTANCES].filter(Boolean))];
  // "Hedged": salen 2 peticiones ya y una más cada 0.9s (o en cuanto una falla). Gana la
  // primera con resultados. Antes se disparaban las 10 juntas en cada canción.
  const tracks = await new Promise((res) => {
    let idx = 0; let failed = 0; let done = false; const timers = [];
    const finish = (v) => { if (done) return; done = true; timers.forEach(clearTimeout); res(v); };
    const launch = () => {
      if (done || idx >= ordered.length) return;
      const base = ordered[idx++];
      fetchTimeout(`${base}/streams/${videoId}`, 5500).then(
        (d) => {
          if (done) return;
          const rel = (Array.isArray(d.relatedStreams) ? d.relatedStreams : []).map(fromPiped).filter(Boolean).filter((t) => !blockedIds.has(t.videoId));
          if (rel.length) { memInstance = { base, at: Date.now() }; saveInstance(base); finish(rel); }
          else if (++failed >= ordered.length) finish([]); else launch();
        },
        () => { if (!done) { if (++failed >= ordered.length) finish([]); else launch(); } },
      );
      if (idx < ordered.length) timers.push(setTimeout(launch, 700));
    };
    if (!ordered.length) { finish([]); return; }
    launch(); launch();
  });
  if (tracks.length) { relCache.set(videoId, { t: Date.now(), tracks }); if (relCache.size > 80) relCache.delete(relCache.keys().next().value); }
  return tracks.slice(0, limit);
}

/**
 * Resuelve "artista — título" (ej. de un chart) al mejor video oficial
 * verificado. Cachea por tema para no re-buscar.
 */
export async function resolveOfficial(artist, title, n = 8) {
  const key = `${norm(artist)} — ${norm(title)}`;
  if (resolveCache.has(key)) return resolveCache.get(key);
  const items = await searchYouTube(`${artist} ${title} official audio`, n);
  const ranked = rankCandidates(items, { artist, title });
  const top = ranked.filter((t) => !blockedIds.has(t.videoId)).slice(0, 3);
  let best = top[0] || null;
  if (top.length > 1) {
    // En paralelo (antes uno por uno, hasta 3.5 s cada uno): gana el mejor candidato que exista.
    const oks = await Promise.all(top.map((t) => verifyVideo(t.videoId)));
    best = top.find((_, i) => oks[i]) || best;
  }
  if (best) resolveCache.set(key, best);
  return best;
}
