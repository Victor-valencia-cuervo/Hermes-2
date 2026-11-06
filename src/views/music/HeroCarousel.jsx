import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Play, Pause, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import Cover from '../../components/Cover';
import VideoLayer from '../../components/VideoLayer';
import useStore from '../../hooks/useStore';

/** Una tarjeta del hero. Solo la activa carga el video y la luz ambiental (ahorra batería y datos);
 *  las demás muestran la carátula, así el deslizar es fluido incluso en celulares lentos. */
function Slide({ t, active, live, playing, busy, p, onGo, videoOn }) {
  const videoBg = active && videoOn && live && t.source === 'YouTube' && !!t.videoId;
  const isPlaying = active && live && playing;
  return (
    <section className="relative overflow-hidden rounded-[2rem] text-white h-full" style={{ background: '#0b0b0e', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)' }}>
      <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
        {videoBg
          ? <div className="absolute inset-0" style={{ filter: 'blur(38px) saturate(1.08) brightness(.95)', transform: 'scale(1.45)', opacity: 0.62 }}>
              <VideoLayer key={t.videoId} videoId={t.videoId} playing={p.playing} getTime={() => p.getCurrentTime?.() || p.time?.cur || 0} onFail={() => {}} />
            </div>
          : t.art && <img src={t.art} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ filter: 'blur(38px) saturate(1.05)', transform: 'scale(1.5)', opacity: 0.6 }} />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(10,10,14,.12), rgba(10,10,14,.4))' }} />
      </div>
      <div className="relative p-3 sm:p-4">
        <div className="relative aspect-video lg:aspect-[2.2/1] rounded-[1.4rem] overflow-hidden bg-black" style={{ boxShadow: '0 10px 34px -12px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.1)' }}>
          {t.art && <img src={t.art} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover select-none" />}
          {videoBg && (
            <div className="absolute inset-0">
              <VideoLayer key={`f-${t.videoId}`} videoId={t.videoId} playing={p.playing} getTime={() => p.getCurrentTime?.() || p.time?.cur || 0} onFail={() => {}} />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 pt-3.5 px-1">
          <div className="flex-1 min-w-0">
            <p className="text-[10.5px] font-bold tracking-[0.25em] uppercase opacity-80 flex items-center gap-2">
              {isPlaying && <span className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
              {active && live ? (playing ? 'Sonando ahora' : 'En pausa') : 'Siguiente'}
            </p>
            <h3 className="serif font-semibold leading-[1.1] mt-1 line-clamp-1 text-xl sm:text-3xl" title={t.title}>{t.title}</h3>
            <p className="mt-0.5 text-sm opacity-80 line-clamp-1" title={t.artist}>{t.artist}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => onGo(t)} disabled={busy} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-sm active:scale-95 transition-transform">
                {busy ? <Loader2 size={16} className="animate-spin" /> : isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
                {isPlaying ? 'Pausar' : active && live ? 'Continuar' : 'Reproducir'}
              </button>
              {active && live && <button onClick={() => p.openFull?.()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm border border-white/30 backdrop-blur active:scale-95 transition-transform">Abrir reproductor</button>}
            </div>
          </div>
          <Cover src={t.art} className={`rounded-2xl shadow-xl shrink-0 w-16 h-16 sm:w-24 sm:h-24 ${isPlaying ? 'breathe' : ''}`} iconSize={30} />
        </div>
      </div>
    </section>
  );
}

/** Hero deslizable (como las tarjetas de Google Play): se desliza a derecha o izquierda y al soltar suena esa canción.
 *  - Con música sonando: las tarjetas son la cola real (anterior · actual · siguientes). Deslizar = saltar a esa canción.
 *  - Sin música: son sugerencias; deslizar solo las recorre y "Reproducir" empieza desde la tarjeta mostrada. */
export default function HeroCarousel({ p, feats = [], onPlayFeat, resolving }) {
  const [videoOn] = useStore('h_hero_video', true);
  const live = !!p.track;
  const queue = p.queue || [];
  const qi = typeof p.index === 'number' ? p.index : -1;

  // Ventana de tarjetas: máx. 2 anteriores y 8 siguientes de la cola (liviano en celulares).
  const slides = useMemo(() => {
    if (live && queue.length && qi >= 0 && queue[qi]?.id === p.track?.id) {
      const from = Math.max(0, qi - 2);
      return queue.slice(from, qi + 9).map((t, k) => ({ t, qIndex: from + k }));
    }
    if (live) return [{ t: p.track, qIndex: -1 }];
    const seen = new Set();
    return feats.filter((t) => t && !seen.has(t.id) && seen.add(t.id)).slice(0, 6).map((t) => ({ t, qIndex: -1 }));
  }, [live, queue, qi, p.track, feats]);

  const activeIdx = live ? Math.max(0, slides.findIndex((s) => s.t.id === p.track?.id)) : 0;
  const [shown, setShown] = useState(0); // tarjeta centrada (en sugerencias sin música)
  const cur = live ? activeIdx : Math.min(shown, Math.max(0, slides.length - 1));

  const rail = useRef(null);
  const lock = useRef(0);
  const timer = useRef(0);

  const slideEl = (i) => rail.current?.children?.[i];
  const scrollToIdx = useCallback((i, smooth = true) => {
    const el = slideEl(i); const r = rail.current;
    if (!el || !r) return;
    lock.current = Date.now() + 700; // movimiento hecho por la app: no cuenta como deslizar del usuario
    r.scrollTo({ left: el.offsetLeft - (r.clientWidth - el.clientWidth) / 2, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  // Si la canción cambia por otro lado (siguiente, cola, etc.), el hero la sigue.
  const lastId = useRef(null);
  useEffect(() => {
    const id = p.track?.id || null;
    if (id !== lastId.current) { scrollToIdx(cur, false); lastId.current = id; }
  }, [p.track?.id, cur, scrollToIdx, slides.length]);

  const settle = useCallback(() => {
    const r = rail.current; if (!r || Date.now() < lock.current) return;
    const mid = r.scrollLeft + r.clientWidth / 2;
    let best = 0; let bd = Infinity;
    for (let i = 0; i < r.children.length; i++) {
      const c = r.children[i]; const d = Math.abs(c.offsetLeft + c.clientWidth / 2 - mid);
      if (d < bd) { bd = d; best = i; }
    }
    if (best === cur) return;
    if (live && slides[best]?.qIndex >= 0) p.playAt?.(slides[best].qIndex);
    else setShown(best);
  }, [cur, live, slides, p]);

  const onScroll = () => { clearTimeout(timer.current); timer.current = setTimeout(settle, 130); };
  useEffect(() => () => clearTimeout(timer.current), []);

  const go = (t) => {
    if (live && t.id === p.track?.id) p.toggle?.();
    else if (live) p.playAt?.(slides.find((s) => s.t.id === t.id)?.qIndex);
    else onPlayFeat?.(t);
  };
  const step = (d) => { const n = Math.min(slides.length - 1, Math.max(0, cur + d)); if (n !== cur) { scrollToIdx(n); if (live && slides[n].qIndex >= 0) p.playAt?.(slides[n].qIndex); else setShown(n); } };

  if (!slides.length) return <div className="h-60 rounded-[2rem] animate-pulse" style={{ background: 'var(--s2)' }} />;

  return (
    <div className="relative group/hero" role="region" aria-roledescription="carrusel" aria-label="Canciones destacadas">
      <div ref={rail} onScroll={onScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory overscroll-x-contain -mx-5 px-5 lg:mx-0 lg:px-0 items-stretch"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {slides.map((s, i) => (
          <div key={s.t.id} className="snap-center shrink-0 w-[90%] lg:w-full" aria-label={`${i + 1} de ${slides.length}`}>
            <Slide t={s.t} active={i === cur} live={live} playing={p.playing} busy={resolving && !live} p={p} onGo={go} videoOn={videoOn} />
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <>
          {cur > 0 && <button onClick={() => step(-1)} aria-label="Anterior" className="hidden lg:grid absolute left-3 top-[34%] w-10 h-10 rounded-full place-items-center glass shadow-lg active:scale-90 transition"><ChevronLeft size={20} /></button>}
          {cur < slides.length - 1 && <button onClick={() => step(1)} aria-label="Siguiente" className="hidden lg:grid absolute right-3 top-[34%] w-10 h-10 rounded-full place-items-center glass shadow-lg active:scale-90 transition"><ChevronRight size={20} /></button>}
          <div className="flex justify-center gap-1.5 mt-2.5" aria-hidden="true">
            {slides.map((s, i) => <span key={s.t.id} className="h-1.5 rounded-full transition-all" style={{ width: i === cur ? 18 : 6, background: i === cur ? 'var(--a)' : 'var(--bd)' }} />)}
          </div>
        </>
      )}
    </div>
  );
}
