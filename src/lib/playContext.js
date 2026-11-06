// "Reproduciendo desde …": de qué pantalla salió la canción que suena (Buscar, Álbum, Playlist…).
// Las pantallas publican su contexto con setPageContext; al tocar algo se guarda como pendiente
// y, cuando cambia la canción, queda ligado a ella (así no cambia si luego navegas a otro lado).
let page = null;      // { from, title } de la pantalla actual
let pending = null;   // { ctx, at }
const byTrack = new Map();

export const setPageContext = (c) => { page = c || null; };
export const markPending = () => { pending = { ctx: page || { from: 'Inicio', title: 'Para ti' }, at: Date.now() }; };
export function bindContext(trackId) {
  if (!trackId) return;
  if (pending && Date.now() - pending.at < 10000) { byTrack.set(trackId, pending.ctx); pending = null; }
  if (byTrack.size > 200) byTrack.delete(byTrack.keys().next().value);
}
export function contextOf(track) {
  const c = track?.id ? byTrack.get(track.id) : null;
  if (c) return c;
  if (track?.source === 'Local') return { from: 'Biblioteca', title: 'Música local' };
  return { from: 'Hermes', title: 'Radio automática' };
}
