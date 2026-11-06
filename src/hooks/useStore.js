import { useState, useEffect, useRef, useCallback } from 'react';

// Guarda en localStorage con un pequeño retraso: antes cada cambio (la cola con 40 temas,
// el progreso, etc.) serializaba y escribía al instante, lo que en celulares lentos congelaba
// la apertura de canciones. Se vacía siempre al ocultar/cerrar la página para no perder nada.
//
// Sincronía entre instancias: varias pantallas usan la MISMA clave (p. ej. el tema del mini
// reproductor lo cambian Ajustes y lo lee la barra de música). Antes cada hook tenía su copia y
// solo se enteraba al recargar la página. Ahora cada cambio se avisa al resto en vivo.
const bus = typeof EventTarget !== 'undefined' ? new EventTarget() : null;

export default function useStore(key, initial) {
  const [v, setV] = useState(() => { try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; } catch { return initial; } });
  const latest = useRef(v); latest.current = v;
  const dirty = useRef(false);
  const me = useRef({});
  const write = () => {
    if (!dirty.current) return;
    dirty.current = false;
    try { localStorage.setItem(key, JSON.stringify(latest.current)); } catch { /* storage lleno o bloqueado */ }
  };

  // Setter estable: actualiza esta instancia y avisa a las demás que usan la misma clave.
  const set = useCallback((next) => {
    const val = typeof next === 'function' ? next(latest.current) : next;
    latest.current = val;
    setV(val);
    try { bus?.dispatchEvent(new CustomEvent(`store:${key}`, { detail: { val, from: me.current } })); } catch { /* sin bus */ }
  }, [key]);

  useEffect(() => {
    if (!bus) return undefined;
    const on = (e) => {
      if (e.detail.from === me.current) return;
      latest.current = e.detail.val;
      setV(e.detail.val);
    };
    bus.addEventListener(`store:${key}`, on);
    return () => bus.removeEventListener(`store:${key}`, on);
  }, [key]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return undefined; }
    dirty.current = true;
    const t = setTimeout(write, 300);
    return () => clearTimeout(t);
  }, [key, v]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const flush = () => write();
    const vis = () => { if (document.hidden) write(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', vis);
    return () => { window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', vis); write(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return [v, set];
}
