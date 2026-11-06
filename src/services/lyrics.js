// LyricsRepository multi-fuente optimizado para canciones y videos de YouTube.
// Prioridad: LRCLIB (line & word sync) > lrc.red (word-sync TTML/LRC) > PaxSenix (Apple Music TTML) > Unison.
// Extracción inteligente de artista y título desde nombres de video de YouTube.
// Cache localStorage + AbortController.

const CACHE_KEY = 'h_lyrics_cache_v2';
const QS = (s) => encodeURIComponent(s || '');

function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}

function saveCacheEntry(k, v) {
  try {
    const c = loadCache();
    c[k] = { ...v, at: Date.now() };
    const keys = Object.keys(c);
    if (keys.length > 150) {
      keys.sort((a, b) => (c[a].at || 0) - (c[b].at || 0));
      for (const old of keys.slice(0, keys.length - 150)) delete c[old];
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch { /* storage lleno */ }
}

/** Limpia nombres de canal de YouTube (elimina '- Topic', 'VEVO', 'Official', etc.) */
export function cleanArtistName(a) {
  return String(a || '')
    .replace(/\s*-\s*topic\s*$/i, '')
    .replace(/\s*(vevo|official channel|official music|official|records|music)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Limpia ruido común de videos de YouTube (Official Video, Audio, 4K, Remaster, etc.) */
export function cleanForSearch(s) {
  return String(s || '')
    .replace(/\s*[\(\[][^()\[\]]*?(official|video|lyric|audio|remaster|feat\.?|ft\.?|from .*|live|remix|acoustic|slowed|sped|8d|nightcore|visualizer|letra|videoclip|clip|en vivo|prod|explicit|hd|4k)[^()\[\]]*?[\)\]]\s*/gi, ' ')
    .replace(/^["'«“]|["'»”]$/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Extrae artista y título reales cuando el video de YouTube tiene formato "Artista - Título" o similar */
export function extractArtistAndTitle(rawTitle, rawArtist) {
  const cleanA = cleanArtistName(rawArtist);
  const title = String(rawTitle || '').trim();

  const seps = [' - ', ' – ', ' — ', ' // ', ' | ', ': '];
  let candArtist = cleanA;
  let candTitle = cleanForSearch(title);

  for (const sep of seps) {
    if (title.includes(sep)) {
      const parts = title.split(sep);
      if (parts.length >= 2) {
        const left = cleanArtistName(cleanForSearch(parts[0]));
        const right = cleanForSearch(parts.slice(1).join(sep));
        if (left && right) {
          candArtist = left;
          candTitle = right;
          break;
        }
      }
    }
  }

  return {
    primary: { artist: candArtist || cleanA, title: candTitle },
    secondary: { artist: cleanA, title: cleanForSearch(title) },
    query: `${candArtist || cleanA} ${candTitle}`.trim(),
  };
}

const coreOf = (s) => cleanForSearch(s).toLowerCase();
const versionOf = (s) => {
  const m = String(s || '').toLowerCase().match(/live|remix|acoustic|karaoke|cover|slowed|sped|nightcore|8d|extended|unplugged/);
  return m ? m[0] : '';
};

export function parseLRC(text) {
  const out = [];
  if (!text) return out;
  // Soporta [mm:ss.xx] y enhanced <mm:ss.xx>palabra
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)/);
    if (!m) continue;
    const t = (+m[1]) * 60 + (+m[2]);
    let rest = (m[3] || '').trim();
    if (!rest) continue;
    // Enhanced: <00:12.34>hola <00:13.00>mundo -> palabras con tiempo
    const words = [];
    const wRe = /<(\d+):(\d+(?:\.\d+)?)>([^<]*)/g;
    let wm; let hasWords = false;
    while ((wm = wRe.exec(rest)) !== null) {
      hasWords = true;
      const wt = (+wm[1]) * 60 + (+wm[2]);
      const wx = wm[3].trim();
      if (wx) words.push({ t: wt, x: wx });
    }
    const plain = rest.replace(/<\d+:\d+(?:\.\d+)?>/g, '').trim();
    out.push({ t, x: plain, words: hasWords ? words : undefined });
  }
  return out.sort((a, b) => a.t - b.t);
}

export function parseTTML(ttml) {
  // TTML Apple / lrc.red: <p begin="00:01.00" end="..."><span begin end>word</span>...</p>
  const out = [];
  if (!ttml || !ttml.includes('<p')) return out;
  const toSec = (s) => {
    if (s == null) return 0;
    const m = String(s).match(/(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)/);
    if (m) return (+m[1] || 0) * 3600 + (+m[2]) * 60 + (+m[3]);
    const n = parseFloat(s);
    return isFinite(n) ? n : 0;
  };
  const pRe = /<p[^>]*begin="([^"]*)"[^>]*>([\s\S]*?)<\/p>/gi;
  let pm;
  while ((pm = pRe.exec(ttml)) !== null) {
    const t = toSec(pm[1]);
    const inner = pm[2];
    const words = [];
    const sRe = /<span[^>]*begin="([^"]*)"[^>]*>([^<]*)<\/span>/gi;
    let sm;
    while ((sm = sRe.exec(inner)) !== null) {
      const wt = toSec(sm[1]);
      const wx = (sm[2] || '').trim();
      if (wx) words.push({ t: wt, x: wx });
    }
    const plain = inner.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (!plain) continue;
    out.push({ t, x: plain, words: words.length ? words : undefined });
  }
  return out.sort((a, b) => a.t - b.t);
}

async function fetchJSON(url, ms = 8000, signal) {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), ms);
  const onAbort = () => c.abort();
  try {
    signal?.addEventListener?.('abort', onAbort, { once: true });
    const r = await fetch(url, { signal: c.signal, headers: { 'User-Agent': 'Hermes/4.1 (musica; +https://hermes06.pages.dev)' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', onAbort);
  }
}

async function fetchText(url, ms = 8000, signal) {
  const c = new AbortController();
  const timer = setTimeout(() => c.abort(), ms);
  const onAbort = () => c.abort();
  try {
    signal?.addEventListener?.('abort', onAbort, { once: true });
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', onAbort);
  }
}

// --- Proveedores con soporte extendido para YouTube ---

async function fromLRCLIB(artist, title, durationSec, signal, queryFallback = '') {
  // 1. Intento exacto
  try {
    if (artist && title) {
      const j = await fetchJSON(`https://lrclib.net/api/get?artist_name=${QS(artist)}&track_name=${QS(title)}${durationSec ? `&duration=${Math.round(durationSec)}` : ''}`, 7000, signal);
      if (j?.syncedLyrics || j?.plainLyrics) {
        return {
          provider: 'LRCLIB',
          lines: j.syncedLyrics ? parseLRC(j.syncedLyrics) : [],
          plain: j.plainLyrics || '',
          wordSync: (j.syncedLyrics || '').includes('<'),
          duration: j.duration,
        };
      }
    }
  } catch { /* continuar a búsqueda */ }

  // 2. Búsqueda por track_name & artist_name
  let arr = [];
  try {
    arr = await fetchJSON(`https://lrclib.net/api/search?track_name=${QS(title)}&artist_name=${QS(artist)}`, 7000, signal);
  } catch {}

  // 3. Búsqueda por consulta completa `q=...` (fundamental para canciones de YouTube)
  if ((!Array.isArray(arr) || !arr.length) && queryFallback) {
    try {
      arr = await fetchJSON(`https://lrclib.net/api/search?q=${QS(queryFallback)}`, 7000, signal);
    } catch {}
  }

  // 4. Búsqueda por solo el título
  if ((!Array.isArray(arr) || !arr.length) && title) {
    try {
      arr = await fetchJSON(`https://lrclib.net/api/search?q=${QS(title)}`, 7000, signal);
    } catch {}
  }

  if (!Array.isArray(arr) || !arr.length) throw new Error('lrclib empty');

  const scored = arr
    .filter((x) => x.syncedLyrics || x.plainLyrics)
    .map((x) => ({
      x,
      hasSync: !!x.syncedLyrics,
      d: durationSec ? Math.abs((x.duration || 0) - durationSec) : 0,
    }))
    .sort((a, b) => (b.hasSync - a.hasSync) || (a.d - b.d));

  const best = scored[0]?.x;
  if (!best) throw new Error('lrclib empty');

  return {
    provider: 'LRCLIB',
    lines: best.syncedLyrics ? parseLRC(best.syncedLyrics) : [],
    plain: best.plainLyrics || '',
    wordSync: (best.syncedLyrics || '').includes('<'),
    duration: best.duration,
  };
}

function bestLrcRed(hits, title, artist, durationSec) {
  const ct = coreOf(title); const ca = coreOf(artist); const vv = versionOf(`${title} ${artist}`);
  let best = null; let bestScore = -1;
  for (const h of hits || []) {
    const ht = coreOf(h.title || h.trackName || '');
    const ha = coreOf(h.artist || h.artistName || '');
    if (!ht || !ha) continue;
    if (ht !== ct && !ht.includes(ct) && !ct.includes(ht)) continue;
    if ((ha || '').split(' ')[0] && !(ca.includes(ha.split(' ')[0]) || ha.includes(ca.split(' ')[0]))) continue;
    if (versionOf(`${h.title} ${h.version || ''}`) !== vv) continue;
    const hd = Number(h.duration ?? h.length ?? NaN);
    if (durationSec && isFinite(hd) && Math.abs(hd - durationSec) > 5) continue;
    const score = (h.synced ? 3 : 0) + (h.isrc ? 1 : 0);
    if (score > bestScore) { bestScore = score; best = h; }
  }
  return best || (hits || []).find((h) => h.isrc) || (hits || [])[0] || null;
}

async function fromLrcRed(artist, title, durationSec, signal, queryFallback = '') {
  const q = queryFallback || cleanForSearch(`${title} ${artist}`);
  const j = await fetchJSON(`https://lrc.red/search.json?q=${QS(q)}`, 8000, signal);
  const hits = j?.hits || j?.results || j || [];
  const list = Array.isArray(hits) ? hits : [];
  if (!list.length) throw new Error('lrc.red empty');
  const hit = bestLrcRed(list, title, artist, durationSec) || list[0];
  const isrc = hit?.isrc || hit?.ISRC;
  if (!isrc) throw new Error('lrc.red sin isrc');

  // TTML primero (word-sync), luego LRC
  try {
    const ttml = await fetchText(`https://lrc.red/s/${isrc}.ttml`, 8000, signal);
    const lines = parseTTML(ttml);
    if (lines.length) return { provider: 'lrc.red (Apple)', lines, plain: lines.map((l) => l.x).join('\n'), wordSync: lines.some((l) => l.words?.length) };
  } catch { /* prueba lrc */ }

  const lrc = await fetchText(`https://lrc.red/s/${isrc}.lrc`, 8000, signal);
  const lines = parseLRC(lrc);
  if (!lines.length) throw new Error('lrc.red sin lineas');
  return { provider: 'lrc.red', lines, plain: lines.map((l) => l.x).join('\n'), wordSync: lines.some((l) => l.words?.length) };
}

async function fromPaxSenix(artist, title, signal) {
  const cleanT = cleanForSearch(title);
  const cleanA = cleanArtistName(artist);
  const j = await fetchJSON(`https://lyrics.paxsenix.org/apple-music/lyrics?title=${QS(cleanT)}&artist=${QS(cleanA)}`, 9000, signal);
  const ttml = j?.lyrics || j?.data?.lyrics || (typeof j === 'string' ? j : null);
  if (!ttml || !String(ttml).includes('<')) throw new Error('paxsenix empty');
  const lines = parseTTML(String(ttml));
  if (!lines.length) throw new Error('paxsenix sin lineas');
  return { provider: 'Apple Music', lines, plain: lines.map((l) => l.x).join('\n'), wordSync: lines.some((l) => l.words?.length) };
}

async function fromUnison(artist, title, signal) {
  const cleanT = cleanForSearch(title);
  const cleanA = cleanArtistName(artist);
  const j = await fetchJSON(`https://unison.boidu.dev/lyrics?title=${QS(cleanT)}&artist=${QS(cleanA)}`, 8000, signal).catch(() => null);
  const lrc = j?.synced || j?.lrc || j?.lyrics;
  if (!lrc) throw new Error('unison empty');
  const lines = parseLRC(String(lrc));
  if (!lines.length) throw new Error('unison sin lineas');
  return { provider: 'Unison', lines, plain: j.plain || lines.map((l) => l.x).join('\n'), wordSync: false };
}

// API principal: búsqueda multi-fuente y multi-candidatos (para títulos de YouTube)
export async function getLyrics({ artist = '', title = '', duration = 0, signal } = {}) {
  const parsed = extractArtistAndTitle(title, artist);
  const { primary, secondary, query } = parsed;

  const key = `${primary.artist.toLowerCase()} — ${primary.title.toLowerCase()}`;
  const cached = loadCache()[key];
  if (cached?.lines?.length || cached?.plain) return { ...cached, cached: true };

  const ctrl = new AbortController();
  const onOuterAbort = () => ctrl.abort();
  signal?.addEventListener?.('abort', onOuterAbort, { once: true });
  const s = ctrl.signal;

  // Lista de trabajos paralelos con candidatos extraídos y secundarios
  const jobs = [
    // LRCLIB con el par extraído principal
    () => fromLRCLIB(primary.artist, primary.title, duration, s, query),
    // LRC.RED con el query limpio
    () => fromLrcRed(primary.artist, primary.title, duration, s, query),
    // PaxSenix (Apple Music) con par primario
    () => fromPaxSenix(primary.artist, primary.title, s),
    // Unison con par primario
    () => fromUnison(primary.artist, primary.title, s),
  ];

  // Si el título original y el extraído difieren, agregamos búsqueda con el par secundario
  if (secondary.title && secondary.title !== primary.title) {
    jobs.push(() => fromLRCLIB(secondary.artist, secondary.title, duration, s, `${secondary.artist} ${secondary.title}`));
    jobs.push(() => fromLrcRed(secondary.artist, secondary.title, duration, s, `${secondary.artist} ${secondary.title}`));
  }

  const results = await Promise.all(jobs.map((fn) => fn().then(
    (value) => ({ status: 'fulfilled', value }),
    (reason) => ({ status: 'rejected', reason }),
  )));
  signal?.removeEventListener?.('abort', onOuterAbort);

  let bestLineSync = null;
  let bestPlain = null;

  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    const v = r.value;
    // Si tiene sincronía palabra por palabra, gana inmediatamente
    if (v?.lines?.some((l) => l.words?.length)) {
      const out = { ...v, lines: v.lines, plain: v.plain || '' };
      saveCacheEntry(key, out);
      try { ctrl.abort(); } catch {}
      return out;
    }
    // Si tiene sincronía de línea, guardamos el primero
    if (!bestLineSync && v?.lines?.length) {
      bestLineSync = v;
    }
    // Si solo tiene texto plano
    if (!bestPlain && v?.plain) {
      bestPlain = v;
    }
  }

  if (bestLineSync) {
    saveCacheEntry(key, bestLineSync);
    return bestLineSync;
  }

  if (bestPlain) {
    saveCacheEntry(key, bestPlain);
    return bestPlain;
  }

  throw new Error('sin letra');
}

export function activeLineIndex(lines, cur) {
  let a = -1;
  for (let i = 0; i < (lines || []).length; i++) {
    if ((lines[i]?.t ?? 0) <= cur) a = i;
  }
  return a;
}
