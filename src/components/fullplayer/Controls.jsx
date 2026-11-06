import { Loader2, Volume1, Volume2, VolumeX, MessageSquareQuote, Airplay, ListMusic, Star, MoreHorizontal, Video } from 'lucide-react';
import { useState } from 'react';
import { fmtTime } from '../../lib/format';
import Marquee from '../Marquee';
import { Slider, IconRew, IconFwd, IconPlay, IconPause, GlassBtn } from './ui';

export const sourceLabel = (t) => (t?.source === 'Local' ? 'Local' : t?.source === 'Audius' ? 'Audius' : t?.source === 'YouTube' ? 'YouTube' : (t?.source || ''));

/** Barra de progreso con tiempo transcurrido / restante. Se arrastra sin saltar la canción hasta soltar. */
export function Progress({ p, bits, dur, onVideo, videoOn }) {
  const [drag, setDrag] = useState(null);
  const cur = drag != null ? drag * dur : bits.tReal;
  const pct = dur > 0 ? Math.min(1, cur / dur) : 0;
  return (
    <div>
      <Slider value={pct} label="Progreso" valueText={`${fmtTime(cur)} de ${fmtTime(dur)}`} disabled={!dur} step={dur ? Math.min(0.2, 10 / dur) : 0.05}
        onInput={setDrag} onCommit={(n) => { p.seek(n * dur); setDrag(null); }} />
      <div className="mt-2 grid grid-cols-3 items-center text-[12px] tabular-nums" style={{ color: 'rgba(255,255,255,.62)' }}>
        <span>{fmtTime(cur)}</span>
        {onVideo && p.track?.source === 'YouTube' && p.track?.videoId && !p.resolving ? (
          <button onClick={onVideo} aria-pressed={!!videoOn} aria-label={videoOn ? 'Volver a la carátula' : 'Ver el video de la canción'} title={videoOn ? 'Volver a la carátula' : 'Ver el video'}
            className="justify-self-center inline-flex items-center gap-1 text-[10px] font-bold tracking-wide px-2 py-[3px] rounded-full active:scale-95 transition"
            style={videoOn ? { background: '#fff', color: '#111' } : { background: 'rgba(255,255,255,.22)', color: '#fff' }}><Video size={11} />YOUTUBE</button>
        ) : (
          <span className="justify-self-center text-[10px] font-bold tracking-wide px-1.5 py-[1px] rounded" style={{ background: 'rgba(255,255,255,.16)', color: 'rgba(255,255,255,.8)' }}>{p.resolving ? 'CARGANDO' : sourceLabel(p.track).toUpperCase()}</span>
        )}
        <span className="justify-self-end">{dur ? `-${fmtTime(Math.max(0, dur - cur))}` : '--:--'}</span>
      </div>
    </div>
  );
}

export function Transport({ p, size = 1 }) {
  const btn = 'text-white grid place-items-center active:scale-90 transition disabled:opacity-40';
  return (
    <div className="flex items-center justify-center gap-8 sm:gap-12">
      <button onClick={p.prev} aria-label="Anterior" className={`${btn} min-w-[72px] min-h-[72px]`}><IconRew s={40 * size} /></button>
      <button onClick={p.toggle} aria-label={p.playing ? 'Pausar' : 'Reproducir'} aria-busy={p.resolving ? 'true' : undefined} className={`${btn} min-w-[84px] min-h-[84px]`}>
        {p.resolving ? <Loader2 size={50 * size} className="animate-spin" /> : p.playing ? <IconPause s={58 * size} /> : <IconPlay s={58 * size} />}
      </button>
      <button onClick={() => p.next(false)} aria-label="Siguiente" className={`${btn} min-w-[72px] min-h-[72px]`}><IconFwd s={40 * size} /></button>
    </div>
  );
}

export function VolumeRow({ p }) {
  const v = p.muted ? 0 : p.volume;
  const Low = v === 0 ? VolumeX : Volume1;
  return (
    <div className="flex items-center gap-3 mx-auto w-full">
      <button onClick={p.toggleMute} aria-label={p.muted ? 'Quitar silencio' : 'Silenciar'} className="text-white/70 active:scale-90 transition"><Low size={16} /></button>
      <div className="flex-1"><Slider value={v} label="Volumen" valueText={`${Math.round(v * 100)}%`} thin={5} thick={9} onInput={(n) => p.setVolume(n)} /></div>
      <Volume2 size={18} className="text-white/70" />
    </div>
  );
}

/** Fila inferior: letra · dispositivos · cola (iconos iguales a Apple Music). */
export function Toolbar({ view, onView, p, onCast }) {
  const item = (on) => ({ background: on ? 'rgba(255,255,255,.9)' : 'transparent', color: on ? '#111' : 'rgba(255,255,255,.88)' });
  const cls = 'min-w-[52px] min-h-[44px] px-4 rounded-full grid place-items-center active:scale-90 transition';
  return (
    <div className="flex items-center justify-between px-3">
      <button onClick={() => onView('lyrics')} aria-pressed={view === 'lyrics'} aria-label={view === 'lyrics' ? 'Cerrar la letra' : 'Ver la letra'} className={cls} style={item(view === 'lyrics')}><MessageSquareQuote size={22} /></button>
      <button onClick={onCast} aria-label="Enviar a otro dispositivo" title="Enviar a otro dispositivo" className={cls} style={item(false)}><Airplay size={22} /></button>
      <button onClick={() => onView('queue')} aria-pressed={view === 'queue'} aria-label={view === 'queue' ? 'Cerrar la cola' : `Cola, ${p.queue.length} canciones`} className={cls} style={item(view === 'queue')}><ListMusic size={22} /></button>
    </div>
  );
}

/** Título + artista + estrella + ⋯ (Apple Music). */
export function MetaRow({ p, onMore, onArtist, compact }) {
  const t = p.track; const fav = p.isFav(t);
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <Marquee className={`${compact ? 'text-[15px]' : 'text-[22px]'} font-bold leading-tight`}>{t.title}</Marquee>
        <button onClick={onArtist} className="block w-full text-left leading-snug" style={{ color: 'rgba(255,255,255,.66)' }} title={`Ver a ${t.artist}`}>
          <Marquee className={`${compact ? 'text-[13px]' : 'text-[20px]'}`}>{t.artist}</Marquee>
        </button>
      </div>
      <GlassBtn label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'} pressed={!!fav} onClick={() => p.toggleFav(t)} size={compact ? 32 : 36}><Star size={compact ? 16 : 18} fill={fav ? 'currentColor' : 'none'} /></GlassBtn>
      <GlassBtn label="Más opciones de la canción" onClick={onMore} size={compact ? 32 : 36}><MoreHorizontal size={compact ? 16 : 18} /></GlassBtn>
    </div>
  );
}
