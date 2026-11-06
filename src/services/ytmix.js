// Mezcla oficial YouTube Music vía Worker propio (RDAMVM).
// Worker: POST music.youtube.com/youtubei/v1/next {videoId, playlistId: RDAMVM+videoId}
// Respuesta: contents.singleColumnMusicWatchNextResultsRenderer...playlistPanelRenderer.contents[]
// Sin backend directo da CORS 403, por eso va por Worker con CORS *.

const BASE = (import.meta?.env?.VITE_YTMIX_URL || 'https://mute-credit-bec0.septicossb.workers.dev').replace(/\/$/, '');
const cache = new Map(); // videoId -> { t, items }

const parseDur = (s) => {
  if (s == null) return 0;
  if (typeof s === 'number') return Math.round(s);
  const parts = String(s).split(':').map(Number);
  if (parts.some((n) => !isFinite(n))) return 0;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};
const textOf = (node) => {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node.runs)) return node.runs.map((r) => r.text || '').join('');
  return node.simpleText || '';
};

function fromPanelRenderer(r) {
  const videoId = r?.videoId || r?.navigationEndpoint?.watchEndpoint?.videoId;
  if (!videoId) return null;
  const title = textOf(r.title) || 'Sin título';
  const artist = textOf(r.shortBylineText) || textOf(r.longBylineText).split('•')[0].trim() || 'YouTube';
  const dur = parseDur(textOf(r.lengthText));
  if (dur > 20 * 60) return null;
  return {
    id: `y_${videoId}`,
    videoId,
    title,
    artist,
    channel: artist,
    verified: false,
    official: false,
    mix: true, // viene de RDAMVM oficial
    views: 0,
    art: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    src: null,
    full: true,
    source: 'YouTube',
    duration: dur,
    genre: '',
    availability: 'streaming',
    libraryState: 'saved',
    downloaded: false,
    localAvailable: false,
    available: true,
  };
}

export function parseMixResponse(json) {
  try {
    const tabs = json?.contents?.singleColumnMusicWatchNextResultsRenderer
      ?.tabbedRenderer?.watchNextTabbedResultsRenderer?.tabs || [];
    for (const tab of tabs) {
      const contents = tab?.tabRenderer?.content?.musicQueueRenderer
        ?.content?.playlistPanelRenderer?.contents || [];
      if (!contents.length) continue;
      const items = contents.map((c) => fromPanelRenderer(c?.playlistPanelVideoRenderer)).filter(Boolean);
      if (items.length) return items;
    }
  } catch { /* formato inesperado */ }
  return [];
}

export async function getYTMix(videoId, limit = 20, ms = 9000) {
  if (!videoId) return [];
  const c = cache.get(videoId);
  if (c && Date.now() - c.t < 10 * 60 * 1000) return c.items.slice(0, limit);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(`${BASE}/?videoId=${encodeURIComponent(videoId)}`, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const items = parseMixResponse(j).slice(0, limit);
    if (items.length) {
      cache.set(videoId, { t: Date.now(), items });
      if (cache.size > 40) cache.delete(cache.keys().next().value);
    }
    return items;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export function mixBase() { return BASE; }
