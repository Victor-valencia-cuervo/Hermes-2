import { useEffect, useRef } from 'react';

/**
 * Candado de pantalla mientras suena algo: evita que el celular se
 * duerma solo con Hermes abierto. El sistema lo suelta al ocultar la
 * página; se re-pide al volver. Sin soporte = no hace nada.
 */
export default function useWakeLock(active) {
  const lock = useRef(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    const req = async () => {
      if (!activeRef.current || document.hidden) return;
      if (!('wakeLock' in navigator)) return;
      if (lock.current) return;
      try {
        lock.current = await navigator.wakeLock.request('screen');
        lock.current.addEventListener('release', () => { lock.current = null; });
      } catch { lock.current = null; }
    };
    const rel = async () => {
      try { await lock.current?.release(); } catch { /* noop */ }
      lock.current = null;
    };
    if (active) req();
    else rel();
    const onVis = () => {
      if (document.hidden) lock.current = null; // el sistema lo libera
      else req();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [active]);
}
