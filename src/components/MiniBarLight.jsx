import { useEffect, useRef, useState } from 'react';
import { Play, Pause, ChevronDown, SkipForward } from 'lucide-react';
import Cover from './Cover';
import Marquee from './Marquee';

// Mini reproductor estilo Spotify: barra recta de borde a borde (sin esquinas redondeadas) que toma los colores
// del tema claro u oscuro. Solo lo esencial: carátula y título (tocar abre el reproductor), pausar/reproducir,
// siguiente y ocultar (sigue sonando). Una línea fina de progreso arriba.
const BAR_H = 64;

export default function MiniBarLight({ p, onOpenFull, onMin }) {
  const t = p.track;
  const [leaving, setLeaving] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  // El menú lateral de PC deja libre el espacio que ocupa la barra
  useEffect(() => {
    if (!t) return undefined;
    document.documentElement.style.setProperty('--minibar-h', `${BAR_H}px`);
    return () => document.documentElement.style.removeProperty('--minibar-h');
  }, [!!t]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!t) return null;
  const hide = () => {
    if (leaving) return;
    setLeaving(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onMin?.(), 200);
  };
  const cur0 = p.time?.cur || 0;
  const dur0 = p.time?.dur;
  const dur = (isFinite(dur0) && dur0 > 0 ? dur0 : t.duration) || 0;
  const pct = dur > 0 ? Math.min(100, (cur0 / dur) * 100) : 0;
  const btn = 'grid place-items-center min-w-[44px] min-h-[44px] active:scale-90 transition';
  return (
    <div className="fixed inset-x-0 z-30 bottom-[calc(62px+env(safe-area-inset-bottom))] lg:bottom-0" role="region" aria-label={`Mini ${t.title}`}>
      <div className={`relative flex items-center gap-2.5 px-3 lg:px-5 ${leaving ? 'card-out' : 'card-in'}`}
        style={{ height: BAR_H, background: 'var(--s)', color: 'var(--t)', borderTop: '1px solid var(--bd)', boxShadow: '0 -8px 24px rgba(0,0,0,.16)' }}>
        <div className="absolute top-0 inset-x-0 h-[2px]" style={{ background: 'var(--bd)' }} aria-hidden="true"><div className="h-full" style={{ width: `${pct}%`, background: 'var(--a)' }} /></div>
        <button onClick={() => onOpenFull?.()} className="flex items-center gap-3 flex-1 min-w-0 text-left h-full" aria-label={`Abrir sonando: ${t.title} de ${t.artist}`}>
          <Cover src={t.art} className="w-11 h-11 !rounded-md shrink-0" iconSize={15} alt={t.title} />
          <span className="flex-1 min-w-0">
            <Marquee className="text-[14px] font-semibold leading-tight">{t.title}</Marquee>
            <Marquee className="text-[12px] leading-tight" style={{ color: 'var(--m)' }}>{t.artist}</Marquee>
          </span>
        </button>
        <button className={btn} onClick={p.toggle} aria-label={p.playing ? `Pausar ${t.title}` : `Reproducir ${t.title}`}>
          {p.playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-0.5" />}
        </button>
        <button className={btn} onClick={() => p.next(false)} aria-label="Siguiente"><SkipForward size={24} fill="currentColor" /></button>
        <button className={btn} style={{ color: 'var(--m)' }} onClick={hide} aria-label="Ocultar mini (sigue sonando)" title="Ocultar (sigue sonando)"><ChevronDown size={22} /></button>
      </div>
    </div>
  );
}
