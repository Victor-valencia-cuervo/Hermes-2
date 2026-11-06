import { useRef } from 'react';
import { Play, Pause, Heart, MoreVertical } from 'lucide-react';
import { Eq } from '../views/music/ui';
import { fmtTime } from '../lib/format';
import Cover from './Cover';
import Marquee from './Marquee';
import ModeBadge from './ModeBadge';

// Long-press 550ms: suficiente para no chocar con scroll, sin cansar el dedo.
const LONG_MS = 550;
const MOVE_PX = 12;

export default function TrackRow({ t, p, list, onMenu, asRadio, meta, wrap }) {
  const active = p.track?.id === t.id;
  const fav = p.isFav(t);
  // Tocar la canción que ya suena abre el Sonando en grande;
  // otra cualquiera suena (en orden o por radio según la lista).
  const go = () => {
    if (active) { p.openFull?.(); return; }
    (asRadio && p.playRadio ? p.playRadio(t) : p.play(t, list));
  };
  const openMenu = () => {
    try { navigator.vibrate?.(10); } catch {}
    if (typeof onMenu === 'function') onMenu(t);
  };

  // Long-press: mantiene 900ms sin mover el dedo -> abre el menú.
  const timer = useRef(null);
  const moved = useRef(false);
  const fired = useRef(false);
  const sx = useRef(0);
  const sy = useRef(0);
  const clear = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };
  const onDown = (e) => {
    fired.current = false;
    moved.current = false;
    try {
      const pt = e.touches?.[0] || e;
      sx.current = pt.clientX || 0;
      sy.current = pt.clientY || 0;
    } catch { sx.current = 0; sy.current = 0; }
    clear();
    timer.current = setTimeout(() => {
      if (!moved.current) {
        fired.current = true;
        openMenu();
      }
    }, LONG_MS);
  };
  const onMove = (e) => {
    try {
      const pt = e.touches?.[0] || e;
      const dx = Math.abs((pt.clientX || 0) - sx.current);
      const dy = Math.abs((pt.clientY || 0) - sy.current);
      if (dx > MOVE_PX || dy > MOVE_PX) { moved.current = true; clear(); }
    } catch { /* noop */ }
  };
  const onUp = () => { clear(); };
  const onClickGo = () => {
    // Si acaba de disparar el long-press, no reproducir.
    if (fired.current) { fired.current = false; return; }
    go();
  };

  const toggleActive = () => {
    if (fired.current) { fired.current = false; return; }
    if (active) { p.toggle?.(); return; }
    go();
  };

  return (
    <div className={`srow ${active ? 'on' : ''}`} aria-current={active ? 'true' : undefined}>
      <div className="group flex items-center gap-2.5 px-2 py-1.5 sm:px-3">
        {/* Carátula: tocarla reproduce/pausa; si suena, muestra el ecualizador */}
        <button onClick={toggleActive} className="relative shrink-0 rounded-[5px]" aria-label={active && p.playing ? `Pausar ${t.title}` : `Reproducir ${t.title}`} aria-pressed={active && p.playing ? 'true' : 'false'} title={active && p.playing ? 'Pausar' : 'Reproducir'}>
          <Cover src={t.art} className="w-12 h-12 !rounded-[5px]" alt={t.title} />
          <span className="absolute inset-0 grid place-items-center rounded-[5px] bg-black/55 text-white transition-opacity opacity-0 group-hover:opacity-100 focus-visible:opacity-100" style={active ? { opacity: 1 } : undefined}>
            {active ? (p.playing ? <><span className="group-hover:hidden"><Eq /></span><Pause size={18} fill="currentColor" className="hidden group-hover:block" /></>  : <Play size={18} fill="currentColor" />) : <Play size={18} fill="currentColor" />}
          </span>
        </button>
        <button
          onClick={onClickGo}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onPointerCancel={onUp}
          onContextMenu={(e) => { e.preventDefault(); openMenu(); }}
          className="flex-1 min-w-0 text-left select-none rounded-xl px-1 py-1.5 focus-visible:outline-2 focus-visible:outline-[var(--a)]"
          title={`${t.title} — ${t.artist}`}
          aria-label={active ? `Abrir sonando: ${t.title}` : `Reproducir ${t.title} de ${t.artist}`}
          style={{ WebkitTouchCallout: 'none' }}
        >
          <div className="srow-t">
            {wrap
              ? <p className="text-[15px] font-medium line-clamp-2 leading-snug break-words">{t.title}</p>
              : <Marquee className="text-[15px] font-medium">{t.title}</Marquee>}
          </div>
          <div className="text-[13px] flex items-center gap-1.5 min-w-0" style={{ color: 'var(--m)' }}><ModeBadge t={t} compact /><Marquee className="flex-1">{t.artist}</Marquee></div>
        </button>
        <button className={`ico-btn shrink-0 !min-w-[40px] !min-h-[40px] srow-act ${fav ? 'keep' : ''}`} onClick={() => p.toggleFav(t)} aria-label={fav ? `Quitar de me gusta: ${t.title}` : `Me gusta: ${t.title}`} aria-pressed={fav ? 'true' : 'false'} title="Me gusta"><Heart size={18} fill={fav ? 'var(--a)' : 'none'} style={{ color: fav ? 'var(--a)' : 'var(--m)' }} /></button>
        {!!t.duration && <span className="text-[13px] tabular-nums shrink-0 hidden sm:block w-10 text-right" style={{ color: 'var(--m)' }}>{fmtTime(t.duration)}</span>}
        <button className="ico-btn shrink-0 !min-w-[40px] !min-h-[40px] srow-act keep" onClick={openMenu} aria-label={`Opciones de ${t.title}`} aria-haspopup="menu" title="Opciones" style={{ color: 'var(--m)' }}><MoreVertical size={18} /></button>
      </div>
      {meta && <div className="px-3 pb-2 -mt-1 min-w-0">{meta}</div>}
    </div>
  );
}
