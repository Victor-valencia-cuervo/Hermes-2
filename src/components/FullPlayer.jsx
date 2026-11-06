import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Airplay, ChevronDown, ListMusic, MessageSquareQuote, Music2, Repeat, Repeat1, Shuffle } from 'lucide-react';
import { StatusBar } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import useArtColors from '../hooks/useArtColors';
import useStore from '../hooks/useStore';
import { usePlayerBits } from './fullplayer/bits';
import { Backdrop, FP_CSS, FONT, useMedia, useReducedMotion, IconRew, IconFwd, IconPlay, IconPause } from './fullplayer/ui';
import { Progress, Transport, VolumeRow, Toolbar, MetaRow } from './fullplayer/Controls';
import LyricsPane from './fullplayer/LyricsPane';
import QueuePane from './fullplayer/QueuePane';
import MoreSheet from './fullplayer/MoreSheet';
import CoverPicker from './fullplayer/CoverPicker';
import ClipLayer from './ClipLayer';
import VideoLayer from './VideoLayer';
import CastSheet from './fullplayer/CastSheet';

// Reproductor completo estilo Apple Music con dos presentaciones:
//   Tema 1 («apple-1»): carátula inmersiva a pantalla completa que se funde con el fondo.
//   Tema 2 («apple-2»): carátula en un cuadro redondeado.
// Mismas funciones en ambos. Vistas: reproductor · letra · cola. En letra y cola, tocar una zona
// vacía oculta/muestra los controles. Una sola instancia de audio: cambiar de vista no la toca.
const EASE = 'cubic-bezier(.32,.72,0,1)';
const SAFE_TOP = 'max(env(safe-area-inset-top, 0px), 8px)';

export default function FullPlayer({ p, toast, theme = 'apple-1', setTheme, onClose: onCloseProp }) {
  const t = p.track;
  const nav = useNavigate();
  const bits = usePlayerBits(p, toast, onCloseProp);
  const colors = useArtColors(t?.art);
  // PC y tableta en horizontal: carátula y controles a la izquierda, letra grande a la derecha
  const wide = useMedia('(min-width: 1024px) and (min-height: 480px), (min-width: 700px) and (min-height: 520px) and (orientation: landscape)');
  const reduced = useReducedMotion();
  const [lyFont] = useStore('h_lyrics_font', 'apple');
  const [clips] = useStore('h_clips', true); // clips de video de la canción (Ajustes)
  const [view, setView] = useState('player'); // móvil/tableta: player | lyrics | queue
  const [side, setSide] = useState('lyrics'); // escritorio: panel derecho
  const [hidden, setHidden] = useState(false); // controles ocultos (solo letra/cola)
  const [sheet, setSheet] = useState(null); // 'more' | 'cover' | 'cast'
  const [videoMode, setVideoMode] = useState(false); // ver el video en lugar de la carátula (sin parar la canción)
  const [bh, setBh] = useState(300);
  const blockRef = useRef(null);
  const colRef = useRef(null);
  const [col, setCol] = useState({ w: 390, h: 800 }); // tamaño real de la columna (para el cuadrado del Tema 2)
  const T1 = theme !== 'apple-2';
  const dur = p.time?.dur || t?.duration || 0;

  // Inmersivo: al abrir el full player oculta la barra de estado del celular (hora, batería, wifi).
  // Al salir o cerrar, la restaura automáticamente.
  useEffect(() => {
    try {
      if (Capacitor.isPluginAvailable('StatusBar')) {
        StatusBar.hide().catch(() => {});
      }
    } catch {}
    return () => {
      try {
        if (Capacitor.isPluginAvailable('StatusBar')) {
          StatusBar.show().catch(() => {});
        }
      } catch {}
    };
  }, []);

  // Al iniciar la animación de cierre, restauramos la barra para una transición suave
  useEffect(() => {
    if (bits.closing) {
      try {
        if (Capacitor.isPluginAvailable('StatusBar')) {
          StatusBar.show().catch(() => {});
        }
      } catch {}
    }
  }, [bits.closing]);

  useEffect(() => { setHidden(false); }, [view]);
  // En la letra, si pasan más de 4 s sin tocar nada, los controles bajan solos (tocar un vacío o la pista los trae de vuelta).
  const hideT = useRef(null);
  const bump = () => {
    clearTimeout(hideT.current);
    if (view !== 'lyrics' || hidden || sheet || wide) return;
    hideT.current = setTimeout(() => setHidden(true), 4000);
  };
  useEffect(() => { bump(); return () => clearTimeout(hideT.current); }, [view, hidden, sheet, wide]); // eslint-disable-line react-hooks/exhaustive-deps
  // Altura real del bloque de controles: la letra/cola deja ese espacio libre abajo.
  useEffect(() => {
    const el = blockRef.current; if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setBh(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [wide]);

  useEffect(() => {
    const el = colRef.current; if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setCol({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el); setCol({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, [wide]);

  const goView = (v) => setView((cur) => (cur === v ? 'player' : v));
  const goArtist = () => {
    const a = String(t.artist || '').replace(/\s*-\s*topic\s*$/i, '').trim();
    if (!a) return;
    bits.onClose();
    nav(`/musica/resultados?q=${encodeURIComponent(a)}`);
  };
  const openMore = () => setSheet('more');
  const openCast = () => setSheet('cast');
  const canVideo = t?.source === 'YouTube' && !!t?.videoId;
  const videoOn = videoMode && canVideo;
  const toggleVideo = () => setVideoMode((v) => !v);
  const getT = () => p.getCurrentTime?.() || p.time?.cur || 0;
  const videoFail = () => { setVideoMode(false); toast?.('YouTube no deja ver este video aquí', Music2); };
  const sheets = (onQueue) => (<>
    {sheet === 'more' && <MoreSheet p={p} toast={toast} bits={bits} theme={theme} setTheme={setTheme} onClose={() => setSheet(null)} onQueue={onQueue} onCover={() => setSheet('cover')} onCloseAll={bits.onClose} />}
    {sheet === 'cover' && <CoverPicker p={p} toast={toast} onClose={() => setSheet(null)} />}
    {sheet === 'cast' && <CastSheet p={p} toast={toast} onClose={() => setSheet(null)} />}
  </>);

  // Deslizar hacia abajo para cerrar (zona del asa y de la carátula).
  const sw = useRef(null);
  const [dy, setDy] = useState(0);
  const swipe = {
    onTouchStart: (e) => { sw.current = { y: e.touches[0].clientY, x: e.touches[0].clientX }; },
    onTouchMove: (e) => { if (!sw.current) return; const d = e.touches[0].clientY - sw.current.y; if (d > 0 && Math.abs(e.touches[0].clientX - sw.current.x) < 60) setDy(Math.min(d, 260)); },
    onTouchEnd: () => { if (dy > 110) bits.onClose(); setDy(0); sw.current = null; },
  };

  if (!t) return null;
  const rootStyle = {
    fontFamily: FONT, color: '#fff',
    transform: bits.closing ? 'translateY(100%)' : dy ? `translateY(${dy}px)` : 'none',
    transition: dy ? 'none' : `transform .3s ${EASE}`,
    borderRadius: dy || bits.closing ? '24px 24px 0 0' : 0,
  };

  // ============ PC / TABLETA HORIZONTAL (como Apple Music en iPad) ============
  // Izquierda: carátula grande + título + progreso + controles + volumen. Derecha: letra grande sin caja.
  if (wide) {
    const cs = T1 ? 'min(50vh, 36vw)' : 'min(46vh, 34vw)';
    const tool = (on) => ({ background: on ? 'rgba(255,255,255,.9)' : 'transparent', color: on ? '#111' : 'rgba(255,255,255,.9)' });
    const tcls = 'w-12 h-12 rounded-2xl grid place-items-center active:scale-90 transition hover:bg-white/15';
    const side2 = (id) => setSide((cur) => (cur === id ? 'lyrics' : id));
    const RepIcon = p.repeat === 'one' ? Repeat1 : Repeat;
    const small = 'grid place-items-center active:scale-90 transition w-10 h-10 rounded-full';
    return (
      <div className={`fp-root fixed inset-0 z-40 overflow-hidden ${reduced ? 'fp-rm' : ''}`} style={rootStyle} role="dialog" aria-label="Reproductor completo">
        <style>{FP_CSS}</style>
        <Backdrop art={t.art} colors={colors} reduced={reduced} />
        <button onClick={bits.onClose} aria-label="Cerrar el reproductor" className="absolute top-0 left-1/2 -translate-x-1/2 z-30 w-24 h-9 grid place-items-center"><span className="block w-10 h-[5px] rounded-full" style={{ background: 'rgba(255,255,255,.5)' }} /></button>
        <button onClick={bits.onClose} aria-label="Cerrar el reproductor" className="absolute top-4 left-5 z-30 w-10 h-10 rounded-full grid place-items-center active:scale-90 transition hover:bg-white/20" style={{ background: 'rgba(255,255,255,.14)' }}><ChevronDown size={22} /></button>
        <div className="absolute inset-0 flex items-center gap-[4vw] px-[5vw] pt-10 pb-20">
          <div className="shrink-0 flex flex-col gap-4" style={{ width: cs }}>
            <div className="relative overflow-hidden" style={{ width: cs, height: cs, borderRadius: T1 ? 20 : 14, boxShadow: T1 ? '0 30px 90px rgba(0,0,0,.55), 0 0 120px -10px rgba(255,255,255,.12)' : '0 24px 60px rgba(0,0,0,.45)', background: 'rgba(255,255,255,.1)' }}>
              {t.art ? <img key={t.art} src={t.art} alt={`Carátula de ${t.title}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" style={{ animation: reduced ? 'none' : (p.playing ? 'fpFade .6s ease both, fpKb 32s ease-in-out .6s infinite alternate' : 'fpFade .6s ease both') }} /> : <div className="w-full h-full grid place-items-center"><Music2 size={48} className="text-white/60" /></div>}
              {videoOn ? <VideoLayer key={t.videoId} videoId={t.videoId} playing={p.playing} getTime={getT} onFail={videoFail} /> : <ClipLayer track={t} playing={p.playing} getTime={getT} enabled={clips} />}
            </div>
            <MetaRow p={p} onMore={openMore} onArtist={goArtist} />
            <Progress p={p} bits={bits} dur={dur} onVideo={canVideo ? toggleVideo : undefined} videoOn={videoOn} />
            <div className="flex items-center justify-between">
              <button onClick={p.toggleShuffle} aria-pressed={!!p.shuffle} aria-label="Orden aleatorio" className={small} style={{ color: p.shuffle ? '#fff' : 'rgba(255,255,255,.55)', background: p.shuffle ? 'rgba(255,255,255,.2)' : 'transparent' }}><Shuffle size={18} /></button>
              <div className="flex items-center gap-6">
                <button onClick={p.prev} aria-label="Anterior" className="grid place-items-center active:scale-90 transition w-14 h-14"><IconRew s={38} /></button>
                <button onClick={p.toggle} aria-label={p.playing ? 'Pausar' : 'Reproducir'} className="grid place-items-center active:scale-90 transition w-16 h-16">{p.playing ? <IconPause s={54} /> : <IconPlay s={54} />}</button>
                <button onClick={() => p.next(false)} aria-label="Siguiente" className="grid place-items-center active:scale-90 transition w-14 h-14"><IconFwd s={38} /></button>
              </div>
              <button onClick={p.cycleRepeat} aria-pressed={p.repeat !== 'off'} aria-label="Repetir" className={small} style={{ color: p.repeat !== 'off' ? '#fff' : 'rgba(255,255,255,.55)', background: p.repeat !== 'off' ? 'rgba(255,255,255,.2)' : 'transparent' }}><RepIcon size={18} /></button>
            </div>
            <VolumeRow p={p} />
          </div>
          <div className="relative flex-1 min-w-0 h-full">
            {side === 'lyrics'
              ? <LyricsPane p={p} bits={bits} fontKey={lyFont} big bottomPad={120} />
              : <QueuePane p={p} toast={toast} bottomPad={120} />}
          </div>
        </div>
        <button onClick={openCast} aria-label="Enviar a otro dispositivo" title="Enviar a otro dispositivo" className={`${tcls} absolute left-[5vw] bottom-5 z-20`} style={tool(false)}><Airplay size={22} /></button>
        <div className="absolute right-[4vw] bottom-5 z-20 flex items-center gap-1">
          <button onClick={() => side2('lyrics')} aria-pressed={side === 'lyrics'} aria-label="Letra" className={tcls} style={tool(side === 'lyrics')}><MessageSquareQuote size={22} /></button>
          <button onClick={() => side2('queue')} aria-pressed={side === 'queue'} aria-label={`Cola, ${p.queue.length} canciones`} className={tcls} style={tool(side === 'queue')}><ListMusic size={22} /></button>
        </div>
        {sheets(() => setSide('queue'))}
      </div>
    );
  }

  // ============ MÓVIL / TABLETA ============
  // Con la barra de estado oculta, el reproductor aprovecha la pantalla completa en ambos temas
  const cw = Math.round(Math.max(160, Math.min(col.w - 40, col.h - bh - 60))); // lado del cuadro (Tema 2): más grande y aprovechado
  const inPlayer = view === 'player';
  const mini = !inPlayer;
  const coverStyle = mini
    ? { left: 16, top: `calc(${SAFE_TOP} + 14px)`, width: 52, height: 52, borderRadius: 9, '--fade': '0%', boxShadow: '0 4px 14px rgba(0,0,0,.35)' }
    : T1
      ? { left: 0, top: 0, width: '100%', height: 'min(62dvh, 720px)', borderRadius: 0, '--fade': '34%', boxShadow: 'none' }
      : { left: `calc(50% - ${cw / 2}px)`, top: `calc(${SAFE_TOP} + 28px + ${Math.max(0, (col.h - bh - 36 - cw) / 2)}px)`, width: cw, height: cw, borderRadius: 20, '--fade': '0%', boxShadow: '0 24px 60px rgba(0,0,0,.45)' };
  const tr = reduced ? 'none' : `left .55s ${EASE}, top .55s ${EASE}, width .55s ${EASE}, height .55s ${EASE}, border-radius .55s ${EASE}, --fade .55s ${EASE}, box-shadow .55s`;
  const maskV = 'linear-gradient(#000 calc(100% - var(--fade)), transparent 100%)';
  const controlsHidden = mini && hidden;

  return (
    <div className={`fp-root fixed inset-0 z-40 overflow-hidden ${reduced ? 'fp-rm' : ''}`} style={rootStyle} role="dialog" aria-label="Reproductor completo"
      onPointerDown={bump} onPointerMove={bump} onWheel={bump} onTouchMove={bump} onKeyDown={bump}>
      <style>{FP_CSS}</style>
      <Backdrop art={t.art} colors={colors} reduced={reduced} />
      {/* Degradado de lectura bajo los controles: de borde a borde (no se corta en tabletas) */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ height: bh + 70, opacity: controlsHidden ? 0 : 1, transition: reduced ? 'none' : 'opacity .35s', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.3) 45%)' }} />
      <div ref={colRef} className="absolute inset-0 mx-auto w-full max-w-[560px]">
        {/* Asa: tocar o deslizar cierra */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 z-30 h-9 grid place-items-center touch-none" style={{ paddingTop: SAFE_TOP }} {...swipe}>
          <button onClick={bits.onClose} aria-label="Cerrar el reproductor" className="w-12 h-6 grid place-items-center"><span className="block w-10 h-[5px] rounded-full" style={{ background: 'rgba(255,255,255,.5)' }} /></button>
        </div>

        {/* Carátula única: se achica y sube al abrir letra/cola; tocarla (en mini) vuelve al reproductor */}
        <div className="absolute z-20 overflow-hidden" style={{ ...coverStyle, transition: tr, WebkitMaskImage: maskV, maskImage: maskV, background: 'rgba(255,255,255,.1)' }} {...(inPlayer ? swipe : {})}>
          {mini
            ? <button onClick={() => setView('player')} aria-label="Volver al reproductor completo" className="block w-full h-full">{t.art ? <img src={t.art} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <Music2 className="m-auto" />}</button>
            : (t.art ? <img key={t.art} src={t.art} alt={`Carátula de ${t.title}`} referrerPolicy="no-referrer" draggable={false} className="w-full h-full object-cover" style={{ objectPosition: T1 ? 'center 30%' : 'center', animation: reduced ? 'none' : (p.playing ? 'fpFade .6s ease both, fpKb 32s ease-in-out .6s infinite alternate' : 'fpFade .6s ease both') }} /> : <div className="w-full h-full grid place-items-center"><Music2 size={48} className="text-white/60" /></div>)}
        {inPlayer && (videoOn ? <VideoLayer key={t.videoId} videoId={t.videoId} playing={p.playing} getTime={getT} onFail={videoFail} /> : <ClipLayer track={t} playing={p.playing} getTime={getT} enabled={clips} />)}
        </div>

        {/* Cabecera compacta (letra/cola): siempre visible aunque se oculten los controles */}
        <div className="absolute z-30 flex items-center" style={{ left: 82, right: 16, top: `calc(${SAFE_TOP} + 14px)`, height: 52, opacity: mini ? 1 : 0, pointerEvents: mini ? 'auto' : 'none', transform: mini ? 'none' : 'translateY(-6px)', transition: reduced ? 'none' : `opacity .35s, transform .45s ${EASE}` }} aria-hidden={!mini}>
          <div className="w-full"><MetaRow p={p} onMore={openMore} onArtist={goArtist} compact /></div>
        </div>

        {/* Contenido de letra / cola con mayor altura disponible */}
        {mini && (
          <div key={view} className="absolute inset-x-0 bottom-0" style={{ top: `calc(${SAFE_TOP} + 74px)`, animation: reduced ? 'none' : 'fpUp .45s ease both' }}>
            {view === 'lyrics'
              ? <LyricsPane p={p} bits={bits} fontKey={lyFont} onEmptyTap={() => setHidden((h) => !h)} bottomPad={controlsHidden ? 56 : bh + 16} fadePx={controlsHidden ? 0 : bh} />
              : <QueuePane p={p} toast={toast} onEmptyTap={() => setHidden((h) => !h)} bottomPad={controlsHidden ? 56 : bh + 16} fadePx={controlsHidden ? 0 : bh} />}
          </div>
        )}

        {/* Bloque inferior: título (solo en el reproductor) + progreso + transporte + volumen + barra */}
        <div ref={blockRef} className="absolute inset-x-0 bottom-0 z-30 px-6"
          style={{ paddingBottom: 'calc(max(env(safe-area-inset-bottom, 0px), 14px) + 22px)', paddingTop: 10, transform: controlsHidden ? 'translateY(105%)' : 'none', opacity: controlsHidden ? 0 : 1, pointerEvents: controlsHidden ? 'none' : 'auto', transition: reduced ? 'none' : `transform .45s ${EASE}, opacity .3s`}}
          aria-hidden={controlsHidden}>
          <div style={{ maxHeight: inPlayer ? 90 : 0, opacity: inPlayer ? 1 : 0, overflow: 'hidden', transition: reduced ? 'none' : `max-height .45s ${EASE}, opacity .3s`, marginBottom: inPlayer ? 14 : 0 }} aria-hidden={!inPlayer}>
            <MetaRow p={p} onMore={openMore} onArtist={goArtist} />
          </div>
          <Progress p={p} bits={bits} dur={dur} onVideo={canVideo ? toggleVideo : undefined} videoOn={videoOn} />
          <div className="my-0.5"><Transport p={p} /></div>
          <div className="mb-2"><VolumeRow p={p} /></div>
          <Toolbar view={view} onView={goView} p={p} onCast={openCast} />
        </div>

        {/* Pista para recuperar los controles cuando están ocultos */}
        {controlsHidden && (
          <button onClick={() => setHidden(false)} aria-label="Mostrar los controles" className="absolute z-30 left-1/2 -translate-x-1/2 bottom-[max(env(safe-area-inset-bottom,0px),10px)] w-16 h-8 grid place-items-center"><span className="block w-10 h-[5px] rounded-full" style={{ background: 'rgba(255,255,255,.45)' }} /></button>
        )}
      </div>

      {sheets(() => setView('queue'))}
    </div>
  );
}
