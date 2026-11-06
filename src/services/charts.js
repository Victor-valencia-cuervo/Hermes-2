// Tops de lo más escuchado por país, vía Apple RSS (público, sin key).
// Es la misma clase de dato que los charts de Spotify (lo más sonado),
// y cada entrada se resuelve al video oficial verificado al reproducir.
export const CHART_COUNTRIES = [
  ['CO', 'Colombia'], ['US', 'EE. UU.'], ['MX', 'México'],
  ['ES', 'España'], ['AR', 'Argentina'], ['GB', 'Reino Unido'],
];

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

export async function topSongs(cc = 'CO', limit = 25) {
  const j = await fetchTimeout(`https://itunes.apple.com/${cc.toLowerCase()}/rss/topsongs/limit=${limit}/json`);
  return mapEntries(j, cc, 'c');
}

/** Nuevos lanzamientos por país (top de álbumes; se resuelve al tema oficial). */
export async function newMusic(cc = 'CO', limit = 15) {
  const j = await fetchTimeout(`https://itunes.apple.com/${cc.toLowerCase()}/rss/topalbums/limit=${limit}/json`);
  return mapEntries(j, cc, 'n');
}

function mapEntries(j, cc, prefix) {
  const entries = j.feed?.entry || [];
  return entries.map((e, i) => {
    const imgs = e['im:image'] || [];
    return {
      id: `${prefix}_${cc}_${e.id?.attributes?.['im:id'] || i}`,
      rank: i + 1,
      title: e['im:name']?.label || 'Sin título',
      artist: e['im:artist']?.label || 'Desconocido',
      art: imgs[imgs.length - 1]?.label || '',
      genre: e.category?.attributes?.label || '',
      rights: e.rights?.label || '',
    };
  });
}
