import { useRef } from 'react';

/**
 * Timeline recta → zigzag: lo no sonado es línea recta tenue,
 * lo sonado se dibuja como zigzag en color con glow + punto.
 * Clic/toque en la línea = seek.
 */
const W = 350, H = 28, MID = H / 2, AMP = 8, STEP = 16;

function zigPath(px) {
  if (px <= 0) return '';
  let d = `M0 ${MID}`;
  let i = 1;
  for (let x = STEP; x < px; x += STEP, i++) {
    d += ` L${x} ${i % 2 ? MID - AMP : MID + AMP}`;
  }
  d += ` L${px} ${MID}`;
  return d;
}

export default function ZigZag({ cur, dur, color = 'var(--a)', onSeek }) {
  const ref = useRef(null);
  const scrub = useRef(false);
  const ratio = dur > 0 ? Math.min(1, Math.max(0, cur / dur)) : 0;
  const px = ratio * W;

  const seekEvt = (clientX) => {
    const el = ref.current;
    if (!el || !dur) return;
    const r = el.getBoundingClientRect();
    const rel = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    onSeek?.(rel * dur);
  };
  const seekMouse = (e) => seekEvt(e.clientX);
  const seekTouch = (e) => { if (e.touches?.[0]) seekEvt(e.touches[0].clientX); };

  return (
    <div ref={ref}
      onClick={seekMouse}
      onTouchStart={seekTouch}
      onPointerDown={(e) => {
        if (!dur || !onSeek) return;
        scrub.current = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        seekEvt(e.clientX);
      }}
      onPointerMove={(e) => { if (scrub.current) seekEvt(e.clientX); }}
      onPointerUp={() => { scrub.current = false; }}
      onPointerCancel={() => { scrub.current = false; }}
      onKeyDown={(e) => {
        if (!dur || !onSeek) return;
        if (e.key === 'ArrowRight') { e.preventDefault(); onSeek(Math.min(dur, cur + 10)); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); onSeek(Math.max(0, cur - 10)); }
        else if (e.key === 'Home') { e.preventDefault(); onSeek(0); }
        else if (e.key === 'End') { e.preventDefault(); onSeek(dur); }
      }}
      tabIndex={dur && onSeek ? 0 : -1}
      className="cursor-pointer touch-none select-none py-3 -my-2" role="slider"
      aria-label="Progreso" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(cur)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-7 overflow-visible" fill="none">
        {/* recta: lo que falta */}
        <line x1={px} y1={MID} x2={W} y2={MID} stroke="currentColor" strokeWidth="3"
          strokeLinecap="round" opacity="0.25" />
        {/* zigzag: lo sonado */}
        {px > 0 && (
          <path d={zigPath(px)} stroke={color} strokeWidth="3.5"
            strokeLinecap="round" strokeLinejoin="round"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
        )}
        {/* punto deslizante */}
        <circle cx={Math.max(3, px)} cy={MID} r="6" fill={color} />
        <circle cx={Math.max(3, px)} cy={MID} r="2.2" fill="#fff" />
      </svg>
    </div>
  );
}
