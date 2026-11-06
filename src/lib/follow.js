// Artistas que sigues (guardados en este dispositivo): { ref, name, art }
const KEY = 'h_follow_artists_v1';
export const getFollowed = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch { return []; } };
export const isFollowing = (ref) => getFollowed().some((a) => a.ref === ref);
export function toggleFollow(a) {
  const list = getFollowed();
  const next = list.some((x) => x.ref === a.ref) ? list.filter((x) => x.ref !== a.ref) : [{ ref: a.ref, name: a.name, art: a.art || '' }, ...list].slice(0, 60);
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* sin almacenamiento */ }
  return next.some((x) => x.ref === a.ref);
}
