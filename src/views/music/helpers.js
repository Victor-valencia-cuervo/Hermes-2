import { cleanTrack } from '../../services/covers';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** ¿La canción del catálogo (Deezer/iTunes) es la que está sonando (video de YouTube resuelto)? */
export function isNow(cur, t) {
  if (!cur || !t?.title) return false;
  if (cur.id === t.id) return true;
  const a = norm(cleanTrack(cur.title));
  const b = norm(cleanTrack(t.title));
  if (!a || !b) return false;
  if (!(a === b || a.includes(b))) return false;
  const art = norm(t.artist).split(' ').filter((w) => w.length > 2);
  if (!art.length) return true;
  const hay = `${norm(cur.artist)} ${a}`;
  return art.some((w) => hay.includes(w));
}

export const slug = (s) => norm(s).replace(/ /g, '-');
