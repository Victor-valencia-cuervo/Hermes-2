// Radios del mundo vía Radio-Browser (100% gratis, sin key).
// https://docs.radio-browser.info — mirrors con respaldo como en youtube.js.

const MIRRORS = [
  'https://de1.api.radio-browser.info',
  'https://de2.api.radio-browser.info',
  'https://nl1.api.radio-browser.info',
  'https://at1.api.radio-browser.info',
];
const LS_KEY = 'h_radio_mirror';

async function fetchTimeout(url, ms = 12000, opts = {}) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: c.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } finally {
    clearTimeout(t);
  }
}

function savedMirror() {
  try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; }
}
function saveMirror(u) {
  try { localStorage.setItem(LS_KEY, u); } catch { /* noop */ }
}

const ordered = () => [savedMirror(), ...MIRRORS].filter(Boolean);

// Las listas .m3u/.pls/.xspf/.m3u8 no suenan en <audio> directo: fuera.
const PLAYLIST_RE = /\.(m3u8?|pls|xspf)(\?|$)/i;

export function fromStation(s) {
  if (!s?.stationuuid) return null;
  const stream = s.url_resolved || s.url || '';
  if (!stream || !/^https:\/\//i.test(stream)) return null; // solo https (contenido mixto)
  if (PLAYLIST_RE.test(stream)) return null;
  if (s.lastcheckok === 0) return null; // rota: fuera
  return {
    id: `r_${s.stationuuid}`,
    uuid: s.stationuuid,
    name: s.name?.trim() || 'Sin nombre',
    country: s.country || '',
    countrycode: s.countrycode || '',
    state: s.state || '',
    language: (s.language || '').split(',')[0].trim(),
    tags: String(s.tags || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 5),
    codec: s.codec || '',
    bitrate: Number(s.bitrate) || 0,
    votes: Number(s.votes) || 0,
    clicks: Number(s.clickcount) || 0,
    art: s.favicon || '', // Cover muestra icono si falla
    stream,
    homepage: s.homepage || '',
  };
}

/** Búsqueda avanzada: pasa { name, countrycode, language, tag, order, limit }. */
export async function searchStations(params = {}) {
  const q = new URLSearchParams({
    hidebroken: 'true',
    limit: '20',
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
  }).toString();
  for (const base of ordered()) {
    try {
      const d = await fetchTimeout(`${base}/json/stations/search?${q}`);
      const list = (Array.isArray(d) ? d : []).map(fromStation).filter(Boolean);
      if (list.length) saveMirror(base);
      return list;
    } catch { /* siguiente mirror */ }
  }
  throw new Error('Las radios no responden, intenta de nuevo');
}

/** Las más votadas/clicadas del mundo. */
export async function topStations(limit = 12) {
  return searchStations({ order: 'clickcount', reverse: 'true', limit });
}

/** Tanda aleatoria del mundo (una distinta cada vez). */
export async function randomStations(limit = 10) {
  return searchStations({ order: 'random', limit });
}

/**
 * URL real de reproducción + cuenta el click en el servidor.
 * Devuelve { stream } o null si la estación cayó.
 */
export async function getStreamUrl(uuid) {
  for (const base of ordered()) {
    try {
      const d = await fetchTimeout(`${base}/json/url/${uuid}`, 10000);
      const stream = d?.url_resolved || d?.url || '';
      if (stream && /^https?:\/\//i.test(stream) && !PLAYLIST_RE.test(stream)) {
        saveMirror(base);
        return stream;
      }
      return null;
    } catch { /* siguiente mirror */ }
  }
  return null;
}
