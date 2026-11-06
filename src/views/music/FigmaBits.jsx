import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Heart, Play, Pause, Loader2, MoreVertical, Check } from 'lucide-react';
import Cover from '../../components/Cover';
import Marquee from '../../components/Marquee';
import { fmtTime } from '../../lib/format';

/** Menú "Filtrar por" del Figma: botón pequeño con flecha y lista desplegable. */
export function FilterMenu({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const off = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [open]);
  const label = options.find(([v]) => v === value)?.[1];
  return (
    <div className="relative shrink-0" ref={box}>
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open}
        className="inline-flex items-center gap-1 text-[12px] h-8 px-2 rounded-lg active:scale-95 transition" style={{ color: 'var(--m)' }}>
        <span>Filtrar por{label && value !== options[0][0] ? `: ${label}` : ''}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul role="listbox" className="absolute right-0 top-full mt-1 z-30 min-w-[10rem] rounded-xl p-1 glass shadow-xl fin">
          {options.map(([v, l]) => (
            <li key={v}>
              <button role="option" aria-selected={v === value} onClick={() => { onChange(v); setOpen(false); }}
                className="w-full flex items-center justify-between gap-3 text-left text-[13px] px-3 py-2 rounded-lg" style={{ background: v === value ? 'color-mix(in srgb, var(--a) 14%, transparent)' : undefined, color: v === value ? 'var(--a)' : 'var(--t)' }}>
                {l}{v === value && <Check size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Fila del historial (Figma): carátula, título, artista, duración y ⋯. */
export function HistoryRow({ t, active, playing, loading, onPlay, onMenu }) {
  return (
    <div className={`srow group flex items-center gap-3 px-2 py-1.5 ${active ? 'on' : ''}`}>
      <button onClick={onPlay} className="relative shrink-0" aria-label={`Reproducir ${t.title}`}>
        <Cover src={t.art} className="w-12 h-12 !rounded-lg" alt={t.title} />
        <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/55 text-white transition-opacity" style={{ opacity: active || loading ? 1 : 0 }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : active && playing ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </span>
      </button>
      <button onClick={onPlay} className="flex-1 min-w-0 text-left">
        <Marquee className="text-[15px] font-semibold" style={{ color: active ? 'var(--a)' : undefined }}>{t.title}</Marquee>
        <Marquee className="text-[12.5px]" style={{ color: 'var(--m)' }}>{t.artist}</Marquee>
      </button>
      {!!t.duration && <span className="text-[12px] tabular-nums shrink-0" style={{ color: 'var(--m)' }}>{fmtTime(t.duration)}</span>}
      {onMenu && <button className="ico-btn shrink-0 !min-w-[36px] !min-h-[36px]" onClick={onMenu} aria-label={`Opciones de ${t.title}`}><MoreVertical size={18} /></button>}
    </div>
  );
}

const RANK_COLOR = ['#8b5cf6', '#22c55e', '#facc15']; // #1 morado · #2 verde · #3 amarillo (Figma)

/** "Canciones en Tendencia": tarjetas con #posición de color, carátula, título, artista, línea de datos reales,
 *  duración (si existe) y corazón. */
export function TrendRow({ rank, t, active, playing, loading, fav, onPlay, onFav }) {
  const meta = [t.album, t.genre, t.date || t.year].filter(Boolean).join(' · ');
  return (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition active:scale-[.99]"
      style={{ background: active ? 'color-mix(in srgb, var(--a) 14%, var(--s2))' : 'var(--s2)' }}>
      <span className="w-8 shrink-0 text-center text-[13px] font-bold tabular-nums" style={{ color: RANK_COLOR[rank - 1] || 'var(--t)' }}>#{rank}</span>
      <button onClick={onPlay} className="relative shrink-0" aria-label={`Reproducir ${t.title}`}>
        <Cover src={t.art} className="w-12 h-12 !rounded-lg" alt={t.title} />
        {(loading || (active && playing)) && (
          <span className="absolute inset-0 grid place-items-center rounded-lg bg-black/55 text-white">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} fill="currentColor" />}
          </span>
        )}
      </button>
      <button onClick={onPlay} className="flex-1 min-w-0 text-left">
        <Marquee className="text-[15px] font-semibold" style={{ color: active ? 'var(--a)' : undefined }}>{t.title}</Marquee>
        <Marquee className="text-[12.5px]" style={{ color: 'var(--m)' }}>{t.artist}</Marquee>
        {!!meta && <p className="text-[11.5px] truncate mt-0.5 opacity-70" style={{ color: 'var(--m)' }}>{meta}</p>}
      </button>
      {!!t.duration && <span className="text-[12px] tabular-nums shrink-0" style={{ color: 'var(--m)' }}>{fmtTime(t.duration)}</span>}
      <button className="ico-btn shrink-0" onClick={onFav} aria-pressed={!!fav} aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'} style={{ color: '#ec4899' }}>
        <Heart size={19} fill={fav ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

/** Tarjeta de álbum con n.º de canciones (Top Albums del Figma). */
export function AlbumTile({ a, onClick }) {
  return (
    <button onClick={onClick} aria-label={`Abrir ${a.title}`} className="snap-start w-[10.25rem] sm:w-[12.5rem] shrink-0 text-left group">
      <div className="w-[10.25rem] h-[10.25rem] sm:w-[12.5rem] sm:h-[12.5rem] rounded-2xl overflow-hidden shadow-xl transition-transform group-hover:-translate-y-0.5 group-active:scale-[.97]">
        <Cover src={a.art} className="w-full h-full" iconSize={28} alt={a.title} />
      </div>
      <Marquee className="text-[15px] font-semibold mt-2 leading-snug">{a.title}</Marquee>
      <Marquee className="text-[13px] leading-snug" style={{ color: 'var(--m)' }}>{a.artist}</Marquee>
      {!!a.trackCount && <p className="text-[12px]" style={{ color: 'var(--m)' }}>{a.trackCount} canciones</p>}
    </button>
  );
}
