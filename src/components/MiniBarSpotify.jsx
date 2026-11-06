import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Plus, ChevronDown, SkipBack, SkipForward, Heart, Volume2, VolumeX } from 'lucide-react';
import Cover from './Cover';
import Marquee from './Marquee';
import useArtColors from '../hooks/useArtColors';
import { fmtTime } from '../lib/format';

// Mini barra fija estilo Spotify: compacta, con el color de la canción.
// El + abre ajustes rápidos con las mismas funciones del flotante:
// progreso, anterior/siguiente, favorita, volumen y la cola completa.
export default function MiniBarSpotify({ p, onOpenFull, onMin, queuePop }) {
  const t = p.track;
  const colors = useArtColors(t?.art);
  const [leaving, setLeaving] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  useEffect(() => { setOpen(false); }, [t?.id]);
  if (!t) return null;
  const hide = () => {
    if (leaving) return;
    setLeaving(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onMin?.(), 200);
  };
  const cur0 = p.time?.cur || 0;
  const dur0 = p.time?.dur;
  const dur = (isFinite(dur0) && dur0 > 0 ? dur0 : t.duration) || 0;
  const pct = dur > 0 ? Math.min(100, (cur0 / dur) * 100) : 0;
  const bg = colors
    ? `linear-gradient(rgba(0,0,0,.38), rgba(0,0,0,.38)), linear-gradient(135deg, ${colors.main}, ${colors.deep})`
    : '#2b100dee';
  return (
    <div className="fixed inset-x-0 z-30 px-2 bottom-[calc(62px+env(safe-area-inset-bottom))] lg:bottom-2" role="region" aria-label={`Mini ${t.title}`}>
      <div className="relative mx-auto max-w-3xl">
        {open && (
          <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 rounded-2xl p-3 modal-in"
            style={{ background: 'rgba(20,20,23,.96)', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 -8px 30px rgba(0,0,0,.5)', '--t': '#fafafa', '--m': 'rgba(255,255,255,.65)', '--s': '#26262b', '--s2': '#333338', '--bd': 'rgba(255,255,255,.12)', color: '#fafafa' }}>
            <div className="flex items-center gap-2 text-[12px] tabular-nums" style={{ color: 'rgba(255,255,255,.82)' }}>
              <span>{fmtTime(cur0)}</span>
              <div className="flex-1 rounded-full cursor-pointer py-3 -my-3" style={{ backgroundClip: 'content-box', background: 'rgba(255,255,255,.28)' }}
                onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); if (r.width && dur) p.seek(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * dur); }}
                onKeyDown={(e) => { if (!dur) return; if (e.key === 'ArrowRight') { e.preventDefault(); p.seek(Math.min(dur, cur0 + 10)); } else if (e.key === 'ArrowLeft') { e.preventDefault(); p.seek(Math.max(0, cur0 - 10)); } }}
                tabIndex={0}
                role="slider" aria-label={`Progreso de ${t.title}`} aria-valuenow={Math.round(cur0)} aria-valuemin={0} aria-valuemax={Math.round(dur)}>
                <div className="h-1.5 rounded-full bg-white pointer-events-none" style={{ width: `${pct}%` }} />
              </div>
              <span>{fmtTime(dur)}</span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-0.5">
              <button className="min-w-[44px] min-h-[44px] grid place-items-center text-white/90" onClick={p.prev} aria-label="Anterior"><SkipBack size={21} /></button>
              <button className="min-w-[44px] min-h-[44px] grid place-items-center text-white/90" onClick={() => p.toggleFav(t)} aria-label={p.isFav(t) ? 'Quitar de favoritas' : 'Marcar favorita'} aria-pressed={p.isFav(t) ? 'true' : 'false'}>
                <Heart size={21} fill={p.isFav(t) ? '#fff' : 'none'} />
              </button>
              <button className="min-w-[44px] min-h-[44px] grid place-items-center text-white/90" onClick={() => p.toggleMute} aria-label={p.muted ? 'Activar sonido' : 'Silenciar'}>
                {p.muted || p.volume === 0 ? <VolumeX size={21} /> : <Volume2 size={21} />}
              </button>
              <input type="range" min="0" max="1" step="0.05" value={p.muted ? 0 : p.volume}
                onChange={(e) => p.setVolume(+e.target.value)} className="w-24" style={{ accentColor: '#fff' }} aria-label="Volumen" />
              <button className="min-w-[44px] min-h-[44px] grid place-items-center text-white/90" onClick={() => p.next(false)} aria-label="Siguiente"><SkipForward size={21} /></button>
            </div>
            <div className="max-h-56 overflow-y-auto mt-1">{queuePop}</div>
          </div>
        )}
        <div className={`flex items-center gap-1.5 rounded-2xl pl-1.5 pr-1 py-1.5${leaving ? ' card-out' : ' card-in'}`}
          style={{ background: bg, border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 -8px 30px rgba(0,0,0,.45)' }}>
          <button onClick={() => onOpenFull?.()} className="flex items-center gap-2.5 flex-1 min-w-0 text-left rounded-xl min-h-[52px] px-1" aria-label={`Abrir sonando: ${t.title} de ${t.artist}`}>
            <Cover src={t.art} className="w-11 h-11 !rounded-xl shrink-0" iconSize={15} alt={t.title} />
            <span className="flex-1 min-w-0">
              <Marquee className="text-[14px] font-semibold text-white leading-tight">{t.title}</Marquee>
              <Marquee className="text-[12px] leading-tight" style={{ color: 'rgba(255,255,255,.72)' }}>{t.artist}</Marquee>
            </span>
          </button>
          <button className="text-white/85 min-w-[44px] min-h-[44px] grid place-items-center" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Cerrar ajustes y cola' : 'Abrir ajustes y cola'} aria-expanded={open ? 'true' : 'false'} title="Ajustes y cola"
            style={open ? { color: '#fff' } : undefined}>
            <Plus size={22} className={`transition-transform ${open ? 'rotate-45' : ''}`} />
          </button>
          <button className="text-white min-w-[52px] min-h-[52px] grid place-items-center" onClick={p.toggle} aria-label={p.playing ? `Pausar ${t.title}` : `Reproducir ${t.title}`}>
            {p.playing ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" className="ml-0.5" />}
          </button>
          <button className="min-w-[44px] min-h-[44px] grid place-items-center" style={{ color: 'rgba(255,255,255,.6)' }} onClick={hide} aria-label="Ocultar mini (sigue sonando)" title="Ocultar (sigue sonando)">
            <ChevronDown size={19} />
          </button>
        </div>
      </div>
    </div>
  );
}
