import { lazy } from 'react';

// Chunks lazy con autosanación: si falla la carga (deploy nuevo invalidó los hashes,
// index viejo en caché), recarga una sola vez para traer el index.html fresco.
const FLAG = 'hermes:chunk-recovered';

export const lazyRetry = (fn) =>
  lazy(() =>
    fn().catch((err) => {
      if (sessionStorage.getItem(FLAG) !== '1') {
        sessionStorage.setItem(FLAG, '1');
        location.reload();
      }
      throw err;
    }),
  );

// La app arrancó bien: limpiar la bandera para que el próximo deploy vuelva a poder autoresanarse.
export const clearChunkRecovery = () => {
  try { sessionStorage.removeItem(FLAG); } catch {}
};
