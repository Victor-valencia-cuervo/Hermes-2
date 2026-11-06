import { useEffect, useRef } from 'react';

/**
 * Parallax ligero: scroll del contenedor + giroscopio/mouse con lerp por rAF.
 * - Respeta prefers-reduced-motion (devuelve estilos nulos).
 * - Sin re-renders: escribe CSS vars --px/--py directo al DOM.
 * - Uso: const { trackRef, bgRef, fgRef } = useParallax({ bg: 22, fg: 10 })
 *   bgRef -> capa fondo full-bleed (overscan scale 1.18 en CSS)
 *   fgRef -> carátula frontal (overscan scale 1.10 en CSS)
 */
export default function useParallax({ bg = 22, fg = 10, gyro = true } = {}) {
  const trackRef = useRef(null); // scroller (overflow-y-auto). Si null, usa window scroll.
  const bgRef = useRef(null);
  const fgRef = useRef(null);

  useEffect(() => {
    let reduced = false;
    try {
      reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    } catch {}
    if (reduced) return undefined;

    const target = { x: 0, y: 0, s: 0 }; // s = offset por scroll
    const cur = { x: 0, y: 0, s: 0 };
    let raf = 0;
    let alive = true;

    const apply = () => {
      if (!alive) return;
      // lerp suave: 0.12 converge sin temblor
      cur.x += (target.x - cur.x) * 0.12;
      cur.y += (target.y - cur.y) * 0.12;
      cur.s += (target.s - cur.s) * 0.15;
      const bx = cur.x.toFixed(2);
      const by = (cur.y + cur.s).toFixed(2);
      const fx = (cur.x * (fg / Math.max(1, bg))).toFixed(2);
      const fy = ((cur.y + cur.s) * (fg / Math.max(1, bg))).toFixed(2);
      if (bgRef.current) {
        bgRef.current.style.setProperty('--px', `${bx}px`);
        bgRef.current.style.setProperty('--py', `${by}px`);
      }
      if (fgRef.current) {
        fgRef.current.style.setProperty('--px', `${fx}px`);
        fgRef.current.style.setProperty('--py', `${fy}px`);
      }
      raf = requestAnimationFrame(apply);
    };
    raf = requestAnimationFrame(apply);

    // Scroll: usa el scroller del player si existe, si no window
    const scroller = trackRef.current;
    const onScroll = () => {
      const y = scroller ? scroller.scrollTop : window.scrollY || 0;
      // factor pequeño: 0.08 -> máx ~24px con clamp
      target.s = Math.max(-24, Math.min(24, y * 0.08));
    };

    // Mouse (desktop) + touch-drag sutil
    const onMouse = (e) => {
      if (!gyro) return;
      try {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        target.x = Math.max(-bg, Math.min(bg, nx * bg));
        target.y = Math.max(-bg, Math.min(bg, ny * bg));
      } catch {}
    };

    // Giroscopio: solo si hay permiso / evento
    const onOrient = (e) => {
      if (!gyro || e.gamma == null || e.beta == null) return;
      try {
        target.x = Math.max(-bg, Math.min(bg, (e.gamma / 45) * bg * 0.7));
        target.y = Math.max(-bg, Math.min(bg, ((e.beta - 45) / 45) * bg * 0.7));
      } catch {}
    };

    if (scroller) scroller.addEventListener('scroll', onScroll, { passive: true });
    else window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('mousemove', onMouse, { passive: true });
    window.addEventListener('deviceorientation', onOrient, { passive: true });
    onScroll();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      if (scroller) scroller.removeEventListener('scroll', onScroll);
      else window.removeEventListener('scroll', onScroll);
      window.removeEventListener('mousemove', onMouse);
      window.removeEventListener('deviceorientation', onOrient);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bg, fg, gyro]);

  return { trackRef, bgRef, fgRef };
}
