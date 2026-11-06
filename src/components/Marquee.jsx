import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/** Texto de una sola línea que, si NO cabe, se desplaza de derecha a izquierda en bucle
 *  (como en Spotify / Apple Music) para que se pueda leer completo en vez de cortarse con "…".
 *  Si cabe, queda quieto. Respeta "reducir movimiento" (ahí se queda con "…").
 *  Uso: <Marquee className="text-[15px] font-semibold">{titulo}</Marquee> */
export default function Marquee({ children, className = '', style, speed = 28, gap = 36, title }) {
  const text = Array.isArray(children) ? children.join('') : String(children ?? '');
  const box = useRef(null);
  const txt = useRef(null);
  const [w, setW] = useState(0); // ancho del texto cuando no cabe (0 = cabe)

  const measure = () => {
    const b = box.current; const t = txt.current;
    if (!b || !t) return;
    const full = t.offsetWidth;
    setW(full > b.clientWidth + 1 ? full : 0);
  };

  useLayoutEffect(() => { measure(); }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const b = box.current;
    if (!b || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(b);
    // Las fuentes web pueden cambiar el ancho después del primer render.
    try { document.fonts?.ready?.then(measure); } catch { /* sin fonts API */ }
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = w > 0;
  const dist = w + gap;
  return (
    <span ref={box} title={title ?? text} className={`mq ${run ? 'mq-run' : ''} ${className}`} style={style}>
      <span className="mq-track" style={run ? { '--mq-dist': `${dist}px`, '--mq-dur': `${(dist / speed + 2.4).toFixed(2)}s` } : undefined}>
        <span ref={txt} className="mq-txt">{text}</span>
        {run && <span className="mq-txt" aria-hidden="true" style={{ paddingLeft: gap }}>{text}</span>}
      </span>
    </span>
  );
}
