import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

export const FONT = "'Inter', system-ui, -apple-system, Roboto, 'SF Pro Display', sans-serif";
export const SERIF = "'Cormorant Garamond', Georgia, serif";

/** Hook de media query (reacciona al girar/redimensionar). */
export function useMedia(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false);
  const [m, setM] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener ? mq.addEventListener('change', on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener('change', on) : mq.removeListener(on); };
  }, [query]);
  return m;
}
export const useReducedMotion = () => useMedia('(prefers-reduced-motion: reduce)');

// ---------- Iconos (mismas formas redondeadas de Apple Music) ----------
const poly = { stroke: 'currentColor', strokeWidth: 3, strokeLinejoin: 'round', fill: 'currentColor' };
export const IconRew = ({ s = 38 }) => (
  <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden="true"><polygon {...poly} points="15,8.5 15,23.5 4.5,16" /><polygon {...poly} points="27.5,8.5 27.5,23.5 17,16" /></svg>
);
export const IconFwd = ({ s = 38 }) => (
  <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden="true"><polygon {...poly} points="4.5,8.5 4.5,23.5 15,16" /><polygon {...poly} points="17,8.5 17,23.5 27.5,16" /></svg>
);
export const IconPlay = ({ s = 52 }) => (
  <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden="true"><polygon {...poly} points="9,6 9,26 26,16" /></svg>
);
export const IconPause = ({ s = 52 }) => (
  <svg width={s} height={s} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"><rect x="7" y="5" width="6.4" height="22" rx="2.2" /><rect x="18.6" y="5" width="6.4" height="22" rx="2.2" /></svg>
);

/** Botón de vidrio circular (estrella / ⋯). */
export function GlassBtn({ children, onClick, label, size = 34, active, pressed, className = '' }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} aria-pressed={pressed}
      className={`grid place-items-center rounded-full shrink-0 active:scale-90 transition ${className}`}
      style={{ width: size, height: size, background: active ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.22)', color: active ? '#111' : '#fff', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
      {children}
    </button>
  );
}

/** Fondo dinámico: degradado + versión desenfocada de la carátula con los colores de ESA canción.
 *  Al cambiar de canción, la capa nueva aparece sobre la vieja (fundido), sin saltos. */
export function Backdrop({ art, colors, reduced }) {
  const [layers, setLayers] = useState(() => [{ k: 0, art, colors }]);
  const kref = useRef(0);
  useEffect(() => {
    setLayers((ls) => {
      const last = ls[ls.length - 1];
      if (last.art === art && last.colors?.main === colors?.main) return ls;
      return [...ls.slice(-1), { k: ++kref.current, art, colors }];
    });
    const t = setTimeout(() => setLayers((ls) => ls.slice(-1)), 1000);
    return () => clearTimeout(t);
  }, [art, colors?.main]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true" style={{ background: '#1c1c1e' }}>
      {layers.map((l) => {
        const main = l.colors?.main || '#3a3a3c'; const deep = l.colors?.deep || '#1c1c1e';
        return (
          <div key={l.k} className="absolute inset-0" style={{ animation: reduced ? 'none' : 'fpFade .9s ease both' }}>
            <div className="absolute inset-0" style={{ background: `linear-gradient(165deg, color-mix(in srgb, ${main} 78%, #000) 0%, color-mix(in srgb, ${deep} 55%, #000) 100%)` }} />
            {l.art && <img src={l.art} alt="" draggable={false} referrerPolicy="no-referrer" className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'blur(60px) saturate(1.7) brightness(.82)', transform: 'scale(1.55)', opacity: 0.7 }} />}
            <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,.12), transparent 62%), linear-gradient(180deg, rgba(0,0,0,.08) 0%, rgba(0,0,0,.38) 100%)' }} />
          </div>
        );
      })}
    </div>
  );
}

/** Deslizador estilo Apple (progreso y volumen): fino, crece al tocarlo, arrastre con puntero. */
export function Slider({ value, onInput, onCommit, label, valueText, max = 1, step = 0.05, thin = 6, thick = 12, disabled }) {
  const ref = useRef(null);
  const [local, setLocal] = useState(null);
  const calc = (x) => { const r = ref.current?.getBoundingClientRect(); return r && r.width ? Math.min(1, Math.max(0, (x - r.left) / r.width)) : 0; };
  const v = local ?? value;
  const h = local != null ? thick : thin;
  return (
    <div ref={ref} role="slider" tabIndex={disabled ? -1 : 0} aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.round(v * max * 100) / 100} aria-valuetext={valueText}
      aria-disabled={disabled || undefined}
      className="relative touch-none select-none cursor-pointer py-4 -my-4 outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-full"
      onPointerDown={(e) => { if (disabled) return; e.currentTarget.setPointerCapture?.(e.pointerId); const n = calc(e.clientX); setLocal(n); onInput?.(n); }}
      onPointerMove={(e) => { if (local == null) return; const n = calc(e.clientX); setLocal(n); onInput?.(n); }}
      onPointerUp={(e) => { if (local == null) return; const n = calc(e.clientX); onCommit?.(n); setLocal(null); }}
      onPointerCancel={() => setLocal(null)}
      onKeyDown={(e) => {
        if (disabled) return;
        const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? step : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -step : 0;
        if (!d) return; e.preventDefault(); e.stopPropagation();
        const n = Math.min(1, Math.max(0, value + d)); onInput?.(n); onCommit?.(n);
      }}>
      <div className="rounded-full overflow-hidden pointer-events-none" style={{ height: h, background: 'rgba(255,255,255,.28)', transition: 'height .18s ease' }}>
        <div className="h-full rounded-full" style={{ width: `${v * 100}%`, background: 'rgba(255,255,255,.95)' }} />
      </div>
    </div>
  );
}

/** Hoja inferior (móvil) / modal centrado (escritorio). */
export function Sheet({ title, onClose, children, wide, full }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end lg:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/55" style={{ animation: 'fpFade .25s ease both' }} onClick={onClose} />
      <div className={`relative w-full ${wide ? 'lg:max-w-[640px]' : 'lg:max-w-[520px]'} ${full ? 'h-[92dvh]' : 'max-h-[88dvh]'} lg:max-h-[86dvh] flex flex-col rounded-t-[28px] lg:rounded-[28px] overflow-hidden`}
        style={{ background: 'rgba(36,36,40,.82)', backdropFilter: 'blur(28px) saturate(1.6)', WebkitBackdropFilter: 'blur(28px) saturate(1.6)', border: '1px solid rgba(255,255,255,.12)', color: '#fff', animation: 'fpSheet .35s cubic-bezier(.32,.72,0,1) both' }}>
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2 shrink-0">
          <p className="text-[17px] font-bold truncate">{title}</p>
          <button onClick={onClose} aria-label="Cerrar" className="w-9 h-9 rounded-full grid place-items-center bg-white/15 active:scale-90 transition shrink-0"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] min-h-0">{children}</div>
      </div>
    </div>
  );
}

export const FP_CSS = `
@property --fade { syntax: '<percentage>'; inherits: false; initial-value: 0%; }
@keyframes fpFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes fpKb { from { transform: scale(1.02) translate(0, 0) } to { transform: scale(1.13) translate(-2.2%, -1.8%) } }
@keyframes fpSheet { from { transform: translateY(40px); opacity: 0 } to { transform: none; opacity: 1 } }
@keyframes fpEq { 0%,100% { transform: scaleY(.35) } 50% { transform: scaleY(1) } }
@keyframes fpUp { from { transform: translateY(10px); opacity: 0 } to { transform: none; opacity: 1 } }
/* La regla global "button { font: inherit }" de Hermes (sin capa) pisaba los text-[..]/font-* de Tailwind en los botones. */
.fp-root button { font: revert-layer; padding: revert-layer; background: revert-layer; border: revert-layer; color: revert-layer; }
.fp-root input { font: revert-layer; }
.fp-root button:focus-visible { outline: 2px solid rgba(255,255,255,.85); outline-offset: 2px; border-radius: 10px; }
.fp-lyric:hover { opacity: .85 !important; filter: none !important; }
.fp-scroll::-webkit-scrollbar { width: 0; height: 0; }
.fp-scroll { scrollbar-width: none; }
.fp-rm *, .fp-rm *::before, .fp-rm *::after { animation-duration: 0s !important; transition-duration: 0s !important; }
`;
