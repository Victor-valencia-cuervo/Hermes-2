import { useEffect, useRef, useState } from 'react';

/** Video real de la canción EN LUGAR de la carátula, sin parar la música.
 *  El audio sigue siendo el del reproductor de siempre: este video va sin sonido y se mantiene sincronizado
 *  (empieza en el segundo actual, se pausa/reanuda con la canción y se corrige si se desfasa).
 *  Si YouTube no deja incrustarlo o no arranca en 9 s, avisa con onFail y vuelve la carátula. */
export default function VideoLayer({ videoId, playing, getTime, onFail }) {
  const box = useRef(null);
  const frame = useRef(null);
  const start = useRef(Math.max(0, Math.floor(Number(getTime?.()) || 0)) + 1);
  const vt = useRef({ t: 0, at: 0, state: -1 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [shown, setShown] = useState(false);
  const failRef = useRef(onFail); failRef.current = onFail;
  const getRef = useRef(getTime); getRef.current = getTime;
  const playRef = useRef(playing); playRef.current = playing;
  const cmd = (func, args = []) => { try { frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*'); } catch { /* sin iframe */ } };

  useEffect(() => {
    const el = box.current; if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let dead = false;
    const onMsg = (e) => {
      if (!frame.current || e.source !== frame.current.contentWindow) return;
      let d = e.data; try { if (typeof d === 'string') d = JSON.parse(d); } catch { return; }
      if (d?.event === 'onError') { if (!dead) failRef.current?.(); return; }
      const st = d?.event === 'onStateChange' ? d.info : d?.info?.playerState;
      if (typeof st === 'number') {
        vt.current.state = st;
        if (st === 1) { setShown(true); if (!playRef.current) cmd('pauseVideo'); }
      }
      if (d?.event === 'infoDelivery' && typeof d.info?.currentTime === 'number') { vt.current.t = d.info.currentTime; vt.current.at = performance.now(); }
    };
    window.addEventListener('message', onMsg);
    const guard = setTimeout(() => { if (!dead && vt.current.state !== 1) failRef.current?.(); }, 9000);
    // Corrige el desfase cada par de segundos (también cuando el usuario salta en la barra).
    const iv = setInterval(() => {
      const v = vt.current; if (v.state < 0 || !playRef.current) return;
      const mine = v.t + (performance.now() - v.at) / 1000; const real = Number(getRef.current?.()) || 0;
      if (Math.abs(mine - real) > 1.2) cmd('seekTo', [real + 0.3, true]);
    }, 2500);
    return () => { dead = true; clearTimeout(guard); clearInterval(iv); window.removeEventListener('message', onMsg); };
  }, [videoId]);

  useEffect(() => { if (vt.current.state < 0) return; if (playing) { cmd('seekTo', [Number(getRef.current?.()) || 0, true]); cmd('playVideo'); } else cmd('pauseVideo'); }, [playing]);

  const vw = size.w && size.h ? Math.max(size.w, (size.h * 16) / 9) : 0;
  const vh = vw ? (vw * 9) / 16 : 0;
  const src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&disablekb=1&fs=0&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3&enablejsapi=1&start=${start.current}`;
  return (
    <div ref={box} aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', opacity: shown ? 1 : 0, transition: 'opacity .5s ease', background: '#000' }}>
      {vw > 0 && (
        <iframe ref={frame} key={videoId} title="Video de la canción" src={src} tabIndex={-1} allow="autoplay; encrypted-media"
          onLoad={(e) => { try { e.currentTarget.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'); } catch { /* noop */ } }}
          style={{ position: 'absolute', left: '50%', top: '50%', width: vw, height: vh, transform: 'translate(-50%, -50%) scale(1.04)', border: 0, pointerEvents: 'none' }} />
      )}
    </div>
  );
}
