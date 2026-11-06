import { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause, Loader2, MoreVertical, User, Shuffle } from 'lucide-react';
import Cover from '../../components/Cover';
import Marquee from '../../components/Marquee';
import { fmtTime } from '../../lib/format';

/** Título de sección: grande y llamativo, solo tipografía Hermes y el color actual (sin iconos). */
export function SectionTitle({ title, sub, action, className = '' }) {
  return (
    <div className={`flex items-end justify-between gap-3 mb-3 ${className}`}>
      <div className="min-w-0">
        <h3 className="serif text-[2rem] sm:text-4xl font-semibold leading-none tracking-tight truncate">
          {(() => { const w = String(title).trim().split(/\s+/); if (w.length < 2) return title; const last = w.pop(); return <>{w.join(' ')} <span style={{ color: 'var(--a)' }}>{last}</span></>; })()}
        </h3>
        {/* Sin subtítulo descriptivo: las secciones solo llevan el título (el parámetro `sub` se ignora a propósito) */}
      </div>
      {action}
    </div>
  );
}

export function Section({ title, sub, action, children, className = '', glass = false }) {
  return (
    <section className={className}>
      <SectionTitle title={title} sub={sub} action={action} />
      {glass ? <GlassPanel>{children}</GlassPanel> : children}
    </section>
  );
}

/** Panel de vidrio degradado (blur + brillo), el mismo efecto del modo inmersivo del reproductor. */
export function GlassPanel({ children, className = '' }) {
  return <div className={`glass-panel ${className}`}>{children}</div>;
}

/** Fondo de la página con la imagen difuminada, para que el vidrio tenga color que traspasar. */
export function GlassBackdrop({ img }) {
  if (!img) return null;
  return <div className="glass-backdrop" aria-hidden="true"><img src={img} alt="" referrerPolicy="no-referrer" /></div>;
}

/** Carrusel horizontal (overflow): se desliza con el dedo/trackpad y en PC tiene flechas. */
export function Shelf({ children, className = '' }) {
  const ref = useRef(null);
  const [edge, setEdge] = useState({ l: false, r: false });
  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setEdge({ l: el.scrollLeft > 8, r: el.scrollLeft + el.clientWidth < el.scrollWidth - 8 });
  }, []);
  useEffect(() => {
    measure();
    const el = ref.current;
    if (!el) return undefined;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [measure, children]);
  const go = (dir) => ref.current?.scrollBy({ left: dir * Math.max(240, ref.current.clientWidth * 0.8), behavior: 'smooth' });
  const arrow = 'hidden lg:grid absolute top-[38%] -translate-y-1/2 z-10 w-10 h-10 rounded-full place-items-center glass shadow-lg active:scale-90 transition';
  return (
    <div className={`relative group/shelf ${className}`}>
      <div ref={ref} onScroll={measure}
        className="flex gap-4 overflow-x-auto pb-2 -mx-5 px-5 lg:-mx-10 lg:px-10 snap-x snap-proximity overscroll-x-contain">
        {children}
      </div>
      {edge.l && <button className={`${arrow} left-1`} onClick={() => go(-1)} aria-label="Anterior"><ChevronLeft size={20} /></button>}
      {edge.r && <button className={`${arrow} right-1`} onClick={() => go(1)} aria-label="Siguiente"><ChevronRight size={20} /></button>}
    </div>
  );
}

/** Tarjeta cuadrada (álbum, canción, playlist). Sin botón de descargar: eso vive en el menú ⋮. */
export function SquareCard({ art, title, sub, onClick, spinning, badge, active, playing, label }) {
  return (
    <button onClick={onClick} aria-label={label || `Abrir ${title}`}
      className="snap-start w-[10.25rem] sm:w-[12.5rem] text-left shrink-0 group rounded-2xl focus-visible:outline-2 focus-visible:outline-[var(--a)] focus-visible:outline-offset-2">
      <div className="relative w-[10.25rem] h-[10.25rem] sm:w-[12.5rem] sm:h-[12.5rem] rounded-2xl overflow-hidden shadow-xl transition-transform group-hover:-translate-y-0.5 group-active:scale-[.97]"
        style={active ? { boxShadow: '0 0 0 2px var(--a)' } : undefined}>
        <Cover src={art} className="w-full h-full" iconSize={28} alt={title} />
        <span className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity" aria-hidden="true">
          {spinning ? <Loader2 size={26} className="animate-spin text-white" /> : active && playing ? <Pause size={26} className="text-white" fill="currentColor" /> : <Play size={26} className="text-white" fill="currentColor" />}
        </span>
        {!!badge && <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-2 py-1 rounded-full text-white max-w-[calc(100%-12px)] truncate" style={{ background: 'color-mix(in srgb, var(--a) 88%, #000)' }}>{badge}</span>}
      </div>
      <Marquee className="text-[15px] font-semibold mt-2 leading-snug">{title}</Marquee>
      <Marquee className="text-[13px] leading-snug" style={{ color: 'var(--m)' }}>{sub}</Marquee>
    </button>
  );
}

/** Artista: foto real redonda + nombre (como Spotify). */
export function ArtistBubble({ artist, onClick, size = 'md' }) {
  const d = size === 'lg' ? 'w-[10.25rem] h-[10.25rem] sm:w-[12.5rem] sm:h-[12.5rem]' : 'w-[8.5rem] h-[8.5rem] sm:w-[10.5rem] sm:h-[10.5rem]';
  const w = size === 'lg' ? 'w-[10.25rem] sm:w-[12.5rem]' : 'w-[8.5rem] sm:w-[10.5rem]';
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [artist?.art]);
  const initial = (String(artist?.name || '?').trim()[0] || '?').toUpperCase();
  return (
    <button onClick={onClick} aria-label={`Abrir artista ${artist?.name}`} className={`snap-start ${w} shrink-0 group text-center focus-visible:outline-2 focus-visible:outline-[var(--a)] rounded-2xl`}>
      {artist?.art && !err ? (
        <img src={artist.art} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setErr(true)}
          className={`${d} mx-auto rounded-full object-cover shadow-lg transition-transform group-hover:scale-[1.03] group-active:scale-95`} style={{ background: 'var(--s2)' }} />
      ) : (
        <span className={`${d} mx-auto rounded-full grid place-items-center text-white text-4xl font-bold shadow-lg`}
          style={{ background: 'linear-gradient(135deg, var(--a), #312e81)' }}>{initial || <User />}</span>
      )}
      <Marquee className="text-[15px] font-semibold mt-2.5 leading-snug">{artist?.name}</Marquee>
      <p className="text-[12px]" style={{ color: 'var(--m)' }}>Artista</p>
    </button>
  );
}

/** Barras de ecualizador (canción sonando) con el color de la app. */
export function Eq({ paused }) { return <span className={`eqb ${paused ? 'paused' : ''}`} aria-hidden="true"><i /><i /><i /></span>; }

/** Encabezado de lista estilo Spotify: # · Título · duración. */
export function SongHead({ numbered = true }) {
  return (
    <div className="srow-head hidden sm:flex items-center gap-3.5 px-3 pb-2 mb-1" aria-hidden="true">
      {numbered && <span className="w-6 text-center">#</span>}
      <span className="flex-1">Título</span>
      <span className="w-10 text-right">Dur.</span>
      <span className="w-[44px]" />
    </div>
  );
}

/** Fila de canción estilo Spotify: limpia, sin cajas. n.º (o ecualizador si suena) / carátula chica, título,
 *  artista, duración y ⋮. La que suena se pinta con el color de la app. */
export function SongRow({ n, art, title, sub, duration, explicit, active, playing, loading, onPlay, onMenu, extra, noArt }) {
  return (
    <div className={`srow group flex items-center gap-3 sm:gap-3.5 px-2 sm:px-3 py-1.5 ${active ? 'on' : ''}`}>
      {n != null && (
        <button onClick={onPlay} className="w-6 shrink-0 grid place-items-center text-sm tabular-nums h-10" style={{ color: active ? 'var(--a)' : 'var(--m)' }} aria-label={`Reproducir ${title}`}>
          {loading ? <Loader2 size={15} className="animate-spin" />
            : active ? <><span className="group-hover:hidden"><Eq paused={!playing} /></span><span className="hidden group-hover:block">{playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" />}</span></>
              : <><span className="group-hover:hidden">{n}</span><Play size={15} fill="currentColor" className="hidden group-hover:block" style={{ color: 'var(--t)' }} /></>}
        </button>
      )}
      {!noArt && (
        <button onClick={onPlay} className="relative shrink-0" aria-label={`Reproducir ${title}`}>
          <Cover src={art} className="w-12 h-12 !rounded-[5px]" alt={title} />
          {n == null && (
            <span className="absolute inset-0 grid place-items-center rounded-[5px] bg-black/55 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity" style={active ? { opacity: 1 } : undefined}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : active ? (playing ? <Eq /> : <Pause size={18} fill="currentColor" />) : <Play size={18} fill="currentColor" />}
            </span>
          )}
        </button>
      )}
      <button onClick={onPlay} className="flex-1 min-w-0 text-left py-1">
        <div className="srow-t flex items-center gap-1.5 min-w-0">
          <Marquee className="text-[15px] font-medium flex-1">{title}</Marquee>
          {explicit && <span className="text-[9px] font-bold px-1 rounded-sm shrink-0" style={{ background: 'var(--m)', color: 'var(--bg)' }}>E</span>}
        </div>
        <Marquee className="text-[13px]" style={{ color: 'var(--m)' }}>{sub}</Marquee>
      </button>
      {extra}
      {!!duration && <span className="text-[13px] tabular-nums shrink-0 w-10 text-right" style={{ color: 'var(--m)' }}>{fmtTime(duration)}</span>}
      {onMenu && (
        <button className="ico-btn shrink-0 !min-w-[40px] !min-h-[40px] srow-act keep" onClick={onMenu} aria-label={`Opciones de ${title}`} style={{ color: 'var(--m)' }}><MoreVertical size={19} /></button>
      )}
    </div>
  );
}

/** (Antes: barra con botón de volver.) Ahora la flecha de volver vive en la cabecera de la app, junto al menú. */
export function BackBar() { return null; }

/** Filtros (Todo / Canciones / Artistas / Álbumes): cuadritos compactos, con el activo relleno del color de la app. */
export function Chips({ items, value, onChange, counts }) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-5 px-5 lg:mx-0 lg:px-0 scroll-x" role="tablist">
      {items.map(([id, label]) => {
        const on = value === id; const n = counts?.[id];
        return (
          <button key={id} role="tab" aria-selected={on} onClick={() => onChange(id)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-[10px] text-[13px] font-semibold tracking-[.01em] transition active:scale-95"
            style={on
              ? { background: 'var(--a)', color: '#fff', boxShadow: '0 4px 12px -6px var(--a)' }
              : { background: 'var(--s2)', color: 'var(--t)', border: '1px solid var(--bd)' }}>
            {label}
            {n > 0 && <span className="text-[10.5px] leading-none px-1.5 py-[3px] rounded-md tabular-nums" style={{ background: on ? 'rgba(255,255,255,.22)' : 'var(--bd)', color: on ? '#fff' : 'var(--m)' }}>{n > 99 ? '99+' : n}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function ShelfSkeleton({ round = false, n = 6 }) {
  return (
    <div className="flex gap-3.5 overflow-hidden -mx-5 px-5" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="shrink-0">
          <div className={`skel ${round ? 'rounded-full w-[7.5rem] h-[7.5rem] sm:w-[9.5rem] sm:h-[9.5rem]' : 'rounded-2xl w-[8.75rem] h-[8.75rem] sm:w-[11rem] sm:h-[11rem]'}`} />
          <div className="skel h-3.5 w-24 mt-3" />
          <div className="skel h-3 w-16 mt-2" />
        </div>
      ))}
    </div>
  );
}

/** Esqueleto en forma de LISTA (igual que las filas de canciones): carátula cuadrada, título, subtítulo y duración. */
const SK_W = [62, 48, 70, 55, 66, 44, 58, 72];
export function RowsSkeleton({ n = 6, numbered = false }) {
  return (
    <div className="space-y-1" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-2 py-1.5" style={{ animationDelay: `${i * 70}ms` }}>
          {numbered && <div className="skel w-4 h-3 shrink-0" />}
          <div className="skel w-14 h-14 rounded-xl shrink-0" style={{ animationDelay: `${i * 70}ms` }} />
          <div className="flex-1 min-w-0">
            <div className="skel h-3.5" style={{ width: `${SK_W[i % SK_W.length]}%`, animationDelay: `${i * 70}ms` }} />
            <div className="skel h-3 mt-2" style={{ width: `${Math.max(24, SK_W[(i + 3) % SK_W.length] - 22)}%`, animationDelay: `${i * 70}ms` }} />
          </div>
          <div className="skel h-3 w-8 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Cabecera inmersiva (artista/álbum), igual que el Apple Music del reproductor completo:
 *  fondo de color con la imagen difuminada, la imagen nítida arriba que se funde hacia abajo con una máscara
 *  (sin bandas ni cortes) y todo se disuelve en el fondo de la app. El menú y la flecha flotan sobre la imagen. */
export function ImmersivePage({ img, tint, colors, children, alt = '' }) {
  const main = colors?.main || tint || 'var(--s2)';
  const deep = colors?.deep || tint || 'var(--s)';
  const fade = 'linear-gradient(180deg, #000 0%, #000 46%, rgba(0,0,0,.72) 62%, rgba(0,0,0,.28) 82%, transparent 100%)';
  return (
    <div className="immersive relative isolate -mx-5 -mt-4 lg:mx-0 lg:mt-0 lg:rounded-[2rem] overflow-hidden pb-6" style={{ background: 'var(--bg)' }}>
      {/* 1) Color de la imagen: de arriba hacia abajo hasta el fondo de la app */}
      <div className="absolute inset-x-0 top-0 h-[46rem] -z-10 pointer-events-none" aria-hidden="true"
        style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${main} 70%, #000) 0%, color-mix(in srgb, ${deep} 46%, var(--bg)) 42%, var(--bg) 100%)` }} />
      {/* 2) La misma imagen muy difuminada para que el color "respire" detrás */}
      {img && (
        <div className="absolute inset-x-0 top-0 h-[40rem] -z-10 pointer-events-none overflow-hidden" aria-hidden="true"
          style={{ WebkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 85%)', maskImage: 'linear-gradient(180deg, #000 0%, transparent 85%)' }}>
          <img src={img} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" style={{ filter: 'blur(48px) saturate(1.6) brightness(.8)', transform: 'scale(1.6)', opacity: 0.55 }} />
        </div>
      )}
      {/* 3) Imagen nítida: se funde con una máscara larga y suave (el degradado de Apple Music) */}
      <div className="relative h-[54dvh] max-h-[34rem] min-h-[20rem] lg:h-[26rem]">
        {img
          ? <img src={img} alt={alt} referrerPolicy="no-referrer" fetchPriority="high" decoding="async" className="absolute inset-0 w-full h-full object-cover object-top"
              style={{ WebkitMaskImage: fade, maskImage: fade }} />
          : <div className="absolute inset-0 skel" />}
        {/* sombra suave arriba para que se lean el menú y la flecha */}
        <div className="absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.45), transparent)' }} />
      </div>
      <div className="relative -mt-16 px-5 lg:px-8">{children}</div>
    </div>
  );
}

/** Botones redondos de acción: aleatorio · reproducir (grande) · seguir/estrella. */
export function ActionRow({ onShuffle, onPlay, busy, extra, disabled }) {
  return (
    <div className="flex items-center justify-center gap-5 mt-4">
      <button onClick={onShuffle} disabled={disabled} aria-label="Aleatorio" className="w-14 h-14 rounded-full grid place-items-center active:scale-90 transition disabled:opacity-40" style={{ background: 'rgba(255,255,255,.14)', color: 'var(--t)' }}><Shuffle size={22} /></button>
      <button onClick={onPlay} disabled={disabled} aria-label="Reproducir" className="w-[4.6rem] h-[4.6rem] rounded-full grid place-items-center active:scale-95 transition disabled:opacity-40" style={{ background: '#fff', color: '#000' }}>
        {busy ? <Loader2 size={30} className="animate-spin" /> : <Play size={32} fill="currentColor" style={{ marginLeft: 3 }} />}
      </button>
      {extra}
    </div>
  );
}
