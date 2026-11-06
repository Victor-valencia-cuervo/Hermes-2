import { useEffect, useRef, useState } from 'react';

/** "Clips" estilo Apple Music: de vez en cuando, sobre la carátula aparece unos segundos el VIDEO REAL
 *  de la canción (sin sonido: el audio sigue siendo el de siempre) y vuelve a la imagen con un fundido.
 *  - Solo canciones de YouTube (tienen videoId). Con Audius / local no hay video: queda el movimiento
 *    lento de la carátula, que lo pone el contenedor.
 *  - Se salta si el usuario pidió "reducir movimiento" o lo apagó en Ajustes (h_clips).
 *  - El video solo se ve cuando YouTube confirma que de verdad está reproduciendo; si no se puede
 *    incrustar o falla, se cancela en silencio (nunca se ve un recuadro de error).
 *  Uso: dentro de un contenedor con `position: relative; overflow: hidden`:
 *       <ClipLayer track={t} playing={p.playing} getTime={p.getCurrentTime} enabled={clips} /> */
export default function ClipLayer({ track, playing, getTime, enabled = true, first = 14, every = 55, length = 9 }) {
  const videoId = track?.source === 'YouTube' ? track.videoId : null;
  const [phase, setPhase] = useState('idle'); // idle | loading | show | out
  const [start, setStart] = useState(0);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const box = useRef(null);
  const frame = useRef(null);
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const ok = !!videoId && enabled && playing && !reduced;
  const getRef = useRef(getTime); getRef.current = getTime;

  // Medidas del contenedor para que el video 16:9 lo llene sin franjas negras
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [ok]);

  // Ciclo completo: espera → carga → (si YouTube confirma) muestra → fundido → espera…
  useEffect(() => {
    setPhase('idle');
    if (!ok) return undefined;
    let dead = false;
    let ready = false;
    const timers = [];
    const later = (fn, ms) => { const id = setTimeout(() => { if (!dead) fn(); }, ms); timers.push(id); };

    const startClip = () => {
      if (document.hidden) { later(startClip, 8000); return; }
      ready = false;
      setStart(Math.max(0, Math.floor(Number(getRef.current?.()) || 0)) + 2); // +2 s = lo que tarda en cargar
      setPhase('loading');
      later(() => { if (!ready) { setPhase('idle'); later(startClip, every * 1000); } }, 6000); // no arrancó: se cancela
    };
    const onMsg = (e) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      let d = e.data;
      try { if (typeof d === 'string') d = JSON.parse(d); } catch { return; }
      if (d?.event === 'onError') { ready = true; setPhase('idle'); later(startClip, every * 1000); return; }
      const st = d?.event === 'onStateChange' ? d.info : d?.info?.playerState;
      if (st === 1 && !ready) {
        ready = true;
        setPhase('show');
        later(() => setPhase('out'), length * 1000);
        later(() => { setPhase('idle'); later(startClip, every * 1000); }, length * 1000 + 800);
      }
    };
    window.addEventListener('message', onMsg);
    later(startClip, first * 1000);
    return () => { dead = true; timers.forEach(clearTimeout); window.removeEventListener('message', onMsg); };
  }, [ok, videoId, first, every, length]);

  if (!ok) return null;
  const vw = size.w && size.h ? Math.max(size.w, (size.h * 16) / 9) : 0;
  const vh = vw ? (vw * 9) / 16 : 0;
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&enablejsapi=1&start=${start}&end=${start + length + 3}`;
  return (
    <div ref={box} aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity: phase === 'show' ? 1 : 0, transition: 'opacity .8s ease' }}>
      {phase !== 'idle' && vw > 0 && (
        <iframe ref={frame} title="Clip de la canción" src={src} tabIndex={-1} allow="autoplay; encrypted-media"
          onLoad={(e) => { try { e.currentTarget.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch { /* noop */ } }}
          style={{ position: 'absolute', left: '50%', top: '50%', width: vw, height: vh, transform: 'translate(-50%, -50%) scale(1.08)', border: 0, pointerEvents: 'none' }} />
      )}
    </div>
  );
}
