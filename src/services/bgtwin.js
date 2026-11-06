// "Gemelo de segundo plano": YouTube pausa el video embebido cuando la pantalla se apaga o
// cambias de app (sus términos lo exigen y no hay forma legítima de evitarlo). Lo que sí se puede
// es buscar la MISMA canción en una fuente con audio normal (<audio>), que el sistema deja
// sonar con la pantalla apagada y con controles en la pantalla de bloqueo. Hoy: Audius.
// Solo se acepta una coincidencia fuerte (título + artista + duración parecida); si no hay, no
// se inventa nada y el tema sigue por YouTube.
import { searchTracks } from './audius';
import { nativeYtAvailable, resolveNativeAudio } from '../lib/yt-native';

const TTL = 30 * 60 * 1000;
const cache = new Map();   // id YouTube -> { t, twin|null }
const inflight = new Map();

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const junk = /\b(official|oficial|video|videoclip|audio|lyrics?|letra|hd|4k|visualizer|clip|topic|remastered|version|ft|feat|featuring)\b.*$/i;
const toks = (s) => norm(s).replace(/\(.*?\)|\[.*?\]/g, ' ').replace(junk, ' ').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 1);

/** Del título de YouTube saca (artista, canción): "Artista - Canción (Official Video)". */
function split(t) {
  const ch = String(t.artist || t.channel || '').replace(/\s*-\s*topic$/i, '').replace(/vevo$/i, '');
  const parts = String(t.title || '').split(/\s[-–—]\s/);
  if (parts.length >= 2) return { artist: parts[0], song: parts.slice(1).join(' ') };
  return { artist: ch, song: t.title || '' };
}
const overlap = (a, b) => {
  if (!a.length || !b.length) return 0;
  const B = new Set(b); const hit = a.filter((w) => B.has(w)).length;
  return hit / Math.max(a.length, b.length);
};

export function peekBgTwin(id) {
  const e = cache.get(id);
  return e && Date.now() - e.t < TTL ? e.twin : undefined; // undefined = aún no se sabe
}

export function findBgTwin(t, timeout = 4000) {
  if (!t?.videoId) return Promise.resolve(null);
  const hit = peekBgTwin(t.id);
  if (hit !== undefined) return Promise.resolve(hit);
  if (inflight.has(t.id)) return inflight.get(t.id);
  // APK: audio directo de ESA MISMA canción de YouTube (100 % igual, sin buscar parecidos). Si falla, sigue Audius.
  if (nativeYtAvailable()) {
    const pn = resolveNativeAudio(t.videoId).then((r) => {
      if (!r) return findAudiusTwin(t, timeout);
      const twin = { ...t, src: r.url, native: true, twinOf: t.id, twinTitle: t.title };
      cache.set(t.id, { t: Date.now(), twin });
      return twin;
    }).finally(() => inflight.delete(t.id));
    inflight.set(t.id, pn);
    return pn;
  }
  return findAudiusTwin(t, timeout);
}

function findAudiusTwin(t, timeout) {
  const { artist, song } = split(t);
  const ts = toks(song); const as = toks(artist);
  const q1 = `${artist} ${song}`.replace(/\s+/g, ' ').trim().slice(0, 80);
  // 2ª variante: solo la canción (atrapa subidas donde el artista va en el canal, no en el título)
  const q2 = String(song || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  const search = (q) => searchTracks(q, { limit: 8 }).catch(() => []);
  const p = Promise.race([
    (async () => {
      const [a, b] = await Promise.all([search(q1), q2 && q2 !== q1 ? search(q2) : Promise.resolve([])]);
      const seen = new Set(); const out = [];
      for (const c of [...(a || []), ...(b || [])]) {
        const k = c.rawId || c.id;
        if (!k || seen.has(k)) continue;
        seen.add(k); out.push(c);
      }
      return out;
    })(),
    new Promise((r) => setTimeout(() => r(null), timeout)),
  ]).then((list) => {
    if (list === null) return null; // se acabó el tiempo: no se cachea como "no existe"
    let best = null; let bs = 0;
    let soft = null; let ss = 0;
    for (const c of list) {
      if (c.full === false || c.streamable === false) continue;
      const ct = toks(c.title);
      const to = overlap(ts, ct);
      const ao = Math.max(overlap(as, toks(c.artist)), ct.some((w) => as.includes(w)) ? 0.5 : 0);
      const durDiff = t.duration && c.duration ? Math.abs(t.duration - c.duration) : 0;
      const s = to * 0.7 + ao * 0.3;
      if (to >= 0.75 && ao >= 0.5 && (!durDiff || durDiff <= 12) && s > bs) { best = c; bs = s; }
      // Respaldo para temas comerciales (ej. The Weeknd - Starboy): acepta título
      // casi igual + artista mencionado, con duración cercana aunque no exacta.
      else if (to >= 0.5 && (ao >= 0.5 || (as.length && as[0].length > 2 && ct.includes(as[0]))) && (!durDiff || durDiff <= 25) && s > ss) { soft = c; ss = s; }
    }
    const pick = best || soft;
    const twin = pick ? { ...pick, twinOf: t.id, twinTitle: t.title } : null;
    cache.set(t.id, { t: Date.now(), twin });
    if (cache.size > 300) cache.delete(cache.keys().next().value);
    return twin;
  }).finally(() => inflight.delete(t.id));
  inflight.set(t.id, p);
  return p;
}
