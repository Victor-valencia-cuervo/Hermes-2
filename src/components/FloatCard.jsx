import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import Marquee from './Marquee';
import { Play, Pause, SkipBack, SkipForward, Heart, X, Loader2, Minus } from 'lucide-react';

/* Tarjeta flotante estilo Spotify: arrastrable, se queda donde la dejas,
   X para ocultarla hasta el próximo play, color del tema + chip MÚSICA/RADIO. */

const StyledWrapper = styled.div`
  position: fixed;
  z-index: 30;
  left: ${(p) => (p.$pos ? `${p.$pos.x}px` : '12px')};
  top: ${(p) => (p.$pos ? `${p.$pos.y}px` : 'auto')};
  bottom: ${(p) => (p.$pos ? 'auto' : p.$defaultBottom)};
  touch-action: pinch-zoom;
  user-select: none;

  .card {
    position: relative; width: 300px; height: 184px; padding: 0;
    background: color-mix(in srgb, ${(p) => p.$accent} 40%, #141416); border-radius: 26px; color: #fff; overflow: hidden;
    border: 1px solid rgba(255,255,255,.14);
    box-shadow: 0 20px 44px -14px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.18);
    cursor: grab;
  }
  .card.dragging { cursor: grabbing; }
  .card.dragging * { pointer-events: none; }
  /* Imagen completa de la canción (con movimiento lento tipo Apple Music mientras suena) */
  .art { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
  .art img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .art.kb img { animation: fckb 26s ease-in-out infinite alternate; }
  @keyframes fckb { from { transform: scale(1.02) translate(0, 0); } to { transform: scale(1.14) translate(-2.5%, -2%); } }
  .art::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.34) 0%, transparent 30%, transparent 52%, rgba(0,0,0,.5) 100%); }
  .noart { position: absolute; inset: 0; background: radial-gradient(120% 90% at 20% 10%, color-mix(in srgb, ${(p) => p.$accent} 75%, #fff) 0%, color-mix(in srgb, ${(p) => p.$accent} 45%, #101012) 60%, #101012 100%); }
  .medialayer { position: absolute; inset: 0; z-index: 1; pointer-events: none; }

  /* Etiqueta de arriba (vidrio) */
  .kind {
    position: absolute; top: 10px; left: 10px; z-index: 2;
    display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 800; letter-spacing: .14em;
    color: #fff; padding: 5px 9px 5px 8px; border-radius: 99px; line-height: 1;
    background: rgba(20,20,24,.34); border: 1px solid rgba(255,255,255,.18);
    -webkit-backdrop-filter: blur(14px) saturate(1.5); backdrop-filter: blur(14px) saturate(1.5);
  }
  .kind .dot { display: inline-block; width: 5px; height: 5px; border-radius: 99px; background: ${(p) => p.$accent}; box-shadow: 0 0 8px ${(p) => p.$accent}; }
  .kind .dot.pulse { animation: kindpulse 1.2s ease-in-out infinite; }
  @keyframes kindpulse { 0%,100% { opacity: 1; } 50% { opacity: .25; } }

  .corner { position: absolute; top: 8px; right: 8px; display: flex; gap: 4px; z-index: 3; }
  .corner button { background: rgba(20,20,24,.34); border: 1px solid rgba(255,255,255,.14); color: rgba(255,255,255,.9); cursor: pointer; width: 30px; height: 30px; min-width: 30px; min-height: 30px; padding: 0; border-radius: 99px; display: grid; place-items: center;
    -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); }
  .corner button:hover { color: ${(p) => p.$accent}; }
  .corner button:focus-visible, .controls button:focus-visible { outline: 2px solid ${(p) => p.$accent}; outline-offset: 2px; }

  /* Barra de vidrio inferior: nombre + artista + controles */
  .glassbar {
    position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 2;
    padding: 9px 8px 9px 14px; border-radius: 20px; overflow: hidden;
    background: linear-gradient(155deg, rgba(255,255,255,.2) 0%, rgba(30,30,36,.34) 55%, rgba(20,20,24,.42) 100%);
    border: 1px solid rgba(255,255,255,.2);
    -webkit-backdrop-filter: blur(22px) saturate(1.7); backdrop-filter: blur(22px) saturate(1.7);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.28), 0 10px 26px -12px rgba(0,0,0,.6);
    display: flex; align-items: center; gap: 6px;
  }
  .texts { flex: 1; min-width: 0; }
  .title-1 { color: #fff; font-size: 16px; font-weight: 700; line-height: 1.2; text-shadow: 0 1px 8px rgba(0,0,0,.3); }
  .title-2 { color: rgba(255,255,255,.74); font-size: 13px; font-weight: 500; margin-top: 1px; line-height: 1.2; }
  .controls { display: flex; align-items: center; gap: 0; flex-shrink: 0; }
  .controls button { background: none; border: none; color: #fff; cursor: pointer; width: 36px; height: 40px; min-width: 36px; min-height: 40px; padding: 0; border-radius: 12px; display: grid; place-items: center; transition: transform .15s, opacity .15s; }
  .controls button:active { transform: scale(.9); }
  .controls button:disabled { opacity: .5; cursor: default; }
  .controls .mainbtn { width: 40px; height: 40px; border-radius: 99px; background: rgba(255,255,255,.92); color: #111; margin: 0 2px; }
  /* Progreso: línea finita en el borde inferior de la barra */
  .prog { position: absolute; left: 14px; right: 14px; bottom: 3px; height: 3px; z-index: 3; }
  .time { position: relative; width: 100%; background-color: rgba(255,255,255,.22); height: 3px; border-radius: 3px; cursor: pointer; touch-action: none; }
  .time::before { content: ''; position: absolute; left: 0; right: 0; top: -12px; bottom: -8px; }
  .time.live { cursor: default; }
  .elapsed { height: 100%; border-radius: 3px; background-color: #fff; }
  .elapsed.indet { width: 35% !important; animation: liveslide 1.6s ease-in-out infinite; }
  @keyframes liveslide { 0% { margin-left: -35%; } 100% { margin-left: 100%; } }
  .livechip { color: #ff6b6b; font-weight: 800; letter-spacing: .08em; font-size: 9px; }
  @media (prefers-reduced-motion: reduce) {
    .kind .dot.pulse, .playing.on .greenline, .elapsed.indet, .art.kb img { animation: none !important; }
  }
  .fav-on { color: ${(p) => p.$accent} !important; }

  .live-tag { color: #ff6b6b; font-weight: 800; letter-spacing: .08em; }

  .playing { display: flex; position: relative; justify-content: center; gap: 1px; width: 30px; height: 20px; }
  .greenline {
    background-color: ${(p) => p.$accent};
    height: 20px; width: 2px; position: relative; transform-origin: bottom;
    transform: scaleY(0.1);
  }
  .playing.on .greenline { animation: infinite playing 1s ease-in-out; }
  .playing.on .line-1 { animation-delay: 0.2s; }
  .playing.on .line-2 { animation-delay: 0.5s; }
  .playing.on .line-3 { animation-delay: 0.6s; }
  .playing.on .line-4 { animation-delay: 0s; }
  .playing.on .line-5 { animation-delay: 0.4s; }
  @keyframes playing {
    0% { transform: scaleY(0.1); }
    33% { transform: scaleY(0.6); }
    66% { transform: scaleY(0.9); }
    100% { transform: scaleY(0.1); }
  }

  .queuepop {
    position: absolute; bottom: calc(100% + 8px); right: 0;
    width: 300px; max-height: min(320px, 52dvh); overflow-y: auto; overscroll-behavior: contain;
    background: var(--s); border: 1px solid var(--bd); border-radius: 14px;
    padding: 8px; color: var(--t); cursor: default;
    box-shadow: 0 -12px 32px rgba(0,0,0,.35);
  }

  .cardbanner {
    width: 300px; margin-bottom: 8px; cursor: default;
  }

  .card-in { animation: cardin .28s ease-out; }
  .card-out { animation: cardout .2s ease-in forwards; }
  @keyframes cardin { from { opacity: 0; transform: translateY(16px) scale(.96); } to { opacity: 1; transform: none; } }
  @keyframes cardout { to { opacity: 0; transform: translateY(16px) scale(.95); } }

  @media (max-width: 640px) {
    .card { width: min(300px, calc(100vw - 24px)); }
    .queuepop, .cardbanner { width: min(300px, calc(100vw - 24px)); }
  }
`;

function clampPos(x, y) {
  const w = typeof window !== 'undefined' ? window.innerWidth : 400;
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;
  const cw = Math.min(300, w - 24);
  const ch = 184;
  return {
    x: Math.min(Math.max(0, x), Math.max(0, w - cw)),
    y: Math.min(Math.max(0, y), Math.max(0, h - ch)),
  };
}

// La posición se guarda en px Y como fracción de la pantalla: si recargas con otra
// altura (barra del navegador, giro del celular) la tarjeta queda en el mismo sitio relativo.
function posFromFrac(fx, fy) {
  const w = typeof window !== 'undefined' ? window.innerWidth : 400;
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;
  const cw = Math.min(300, w - 24);
  return clampPos(fx * Math.max(0, w - cw), fy * Math.max(0, h - 184));
}
function toSaved(p) {
  const w = window.innerWidth; const h = window.innerHeight; const cw = Math.min(300, w - 24);
  return { x: p.x, y: p.y, fx: w - cw > 0 ? p.x / (w - cw) : 0, fy: h - 184 > 0 ? p.y / (h - 184) : 0 };
}
function loadPos(key) {
  try {
    const s = JSON.parse(localStorage.getItem(key));
    if (s && typeof s.fx === 'number' && typeof s.fy === 'number') return posFromFrac(s.fx, s.fy);
    if (s && typeof s.x === 'number' && typeof s.y === 'number') return clampPos(s.x, s.y);
  } catch { /* sin posición */ }
  return null;
}

/**
 * Props: accent, kind, art, title, sub, statusText, playing, loading,
 * onToggle, onPrev, onNext, fav, onFav, volume, muted, onVolume, onMute,
 * progress {cur,dur} | null (null = en vivo), onSeek(frac), liveRight,
 * posKey, defaultBottom, resetKey (reaparece al cambiar), onClose,
 * onArtClick, toggleLabel, queuePop + QueueIcon (botón cola),
 * minKey (persiste minimizado), min + onMinChange (modo controlado).
 */
export default function FloatCard(props) {
  const {
    accent = '#1db954', kind = 'MÚSICA', art, title, sub, statusText,
    playing, loading, onToggle, onPrev, onNext, fav, onFav,
    volume = 0.9, muted = false, onVolume, onMute,
    progress = null, onSeek, liveRight = '',
    posKey, defaultBottom = '12px', resetKey, onClose,
    onArtClick, toggleLabel, kindPulse, queuePop, QueueIcon,
    minKey, miniBottom,
  } = props;

  const [pos, setPos] = useState(() => loadPos(posKey));
  // «Quitada» (X) también se recuerda: al recargar no reaparecen las dos tarjetas.
  // Vuelve sola al reproducir algo (play / tema nuevo).
  const hideKey = posKey ? `${posKey}_hidden` : null;
  const [hidden, setHiddenState] = useState(() => { try { return !!hideKey && localStorage.getItem(hideKey) === '1'; } catch { return false; } });
  const setHidden = (v) => {
    setHiddenState(v);
    try { if (hideKey) localStorage.setItem(hideKey, v ? '1' : '0'); } catch { /* noop */ }
  };
  const firstRun = useRef(true);
  // Minimizado: la tarjeta se oculta (el audio sigue) y se reabre desde los
  // botones de icono junto al de mascotas (header móvil / sidebar PC).
  // Controlado si se pasan `min` + `onMinChange`; si no, interno con `minKey`.
  const [innerMin, setInnerMin] = useState(() => { try { return !!minKey && localStorage.getItem(minKey) === '1'; } catch { return false; } });
  const min = props.min ?? innerMin;
  const setMinPersist = (v) => {
    if (props.onMinChange) props.onMinChange(v);
    else setInnerMin(v);
    try { if (minKey) localStorage.setItem(minKey, v ? '1' : '0'); } catch {}
  };
  const [showQueue, setShowQueue] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Salida animada (X / minimizar): se encoge 200ms y recién ahí se oculta
  const [leaving, setLeaving] = useState(false);
  const leavingTimer = useRef(null);
  const animateOut = (fn) => {
    if (leaving) return;
    setLeaving(true);
    if (leavingTimer.current) clearTimeout(leavingTimer.current);
    leavingTimer.current = setTimeout(() => { fn(); setLeaving(false); }, 200);
  };
  useEffect(() => () => { if (leavingTimer.current) clearTimeout(leavingTimer.current); }, []);
  const drag = useRef(null);
  const cardRef = useRef(null);
  // Scrub del timeline: tocar o arrastrar sobre la línea (incluye el aire invisible)
  const scrub = useRef(false);
  const seekFromX = (el, clientX) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    onSeek?.(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };

  // Reaparece sola al reproducir algo nuevo (o al dar play de nuevo)
  // (el primer render NO cuenta: al recargar se respeta lo que dejaste)
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    setHidden(false); setLeaving(false);
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (playing) { setHidden(false); setLeaving(false); } }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps
  // Si cambia el tamaño de ventana, mantiene la posición relativa
  useEffect(() => {
    const onRs = () => setPos(() => loadPos(posKey));
    window.addEventListener('resize', onRs);
    return () => window.removeEventListener('resize', onRs);
  }, []);

  const onPointerDown = (e) => {
    if (e.target.closest('button, input, a, select, .queuepop, .time')) return;
    const wr = cardRef.current.parentElement.getBoundingClientRect(); // el contenedor (incluye el aviso de arriba)
    const startX = e.clientX - (pos ? pos.x : wr.left);
    const startY = e.clientY - (pos ? pos.y : wr.top);
    drag.current = { startX, startY, moved: false, cx: e.clientX, cy: e.clientY };
    setDragging(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const nx = e.clientX - drag.current.startX;
    const ny = e.clientY - drag.current.startY;
    if (!drag.current.moved && Math.hypot(e.clientX - drag.current.cx, e.clientY - drag.current.cy) > 6) {
      drag.current.moved = true;
    }
    const c = clampPos(nx, ny);
    setPos(c);
  };
  const endDrag = (e) => {
    if (!drag.current) return;
    const wasTap = !drag.current.moved && e?.type === 'pointerup';
    drag.current = null;
    if (wasTap) onArtClick?.();
    setDragging(false);
    setPos((pp) => {
      if (pp) { try { localStorage.setItem(posKey, JSON.stringify(toSaved(pp))); } catch { /* noop */ } }
      return pp;
    });
  };

  if (hidden) return null;

  const close = () => animateOut(() => { setHidden(true); onClose?.(); });
  // Minimizado: no se muestra nada aquí (ni flecha ni píldora); el audio
  // sigue y la tarjeta se reabre desde el botón de icono correspondiente.
  if (min) return null;

  const pct = progress && progress.dur > 0
    ? Math.min(100, (progress.cur / progress.dur) * 100) : 0;

  return (
    <StyledWrapper $accent={accent} $pos={pos} $defaultBottom={defaultBottom}>
      {props.banner && <div className="cardbanner">{props.banner}</div>}
      <div
        ref={cardRef}
        className={`card${dragging ? ' dragging' : ''}${leaving ? ' card-out' : ' card-in'}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="region"
        aria-label={`${kind} ${title}`}
      >
        {art
          ? <div className={`art${playing ? ' kb' : ''}`} aria-hidden="true"><img src={art} alt="" draggable={false} onError={(e) => { e.currentTarget.style.display = 'none'; }} /></div>
          : <div className="noart" aria-hidden="true" />}
        {props.mediaLayer && <div className="medialayer" aria-hidden="true">{props.mediaLayer}</div>}

        <span className="kind">
          <span className={`playing${playing ? ' on' : ''}`} aria-hidden="true" style={{ width: 14, height: 10 }}>
            <span className="greenline line-1" /><span className="greenline line-2" /><span className="greenline line-3" />
          </span>
          {kind}
        </span>

        <div className="corner">
          {queuePop && QueueIcon && (
            <button onClick={() => setShowQueue((s) => !s)} aria-label={showQueue ? 'Ocultar cola' : 'Ver cola'} aria-expanded={showQueue ? 'true' : 'false'} title="Cola"
              style={showQueue ? { color: accent } : undefined}>
              <QueueIcon size={14} />
            </button>
          )}
          <button onClick={onFav} aria-label={fav ? `Quitar de favoritos: ${title}` : `Marcar favorito: ${title}`} aria-pressed={fav ? 'true' : 'false'} title="Favorito" className={fav ? 'fav-on' : ''}>
            <Heart size={14} fill={fav ? accent : 'none'} />
          </button>
          <button onClick={() => animateOut(() => setMinPersist(true))} aria-label="Minimizar (sigue sonando)" title="Minimizar (sigue sonando)"><Minus size={14} /></button>
          <button onClick={close} aria-label="Pausar y quitar tarjeta" title="Quitar"><X size={14} /></button>
        </div>

        <div className="glassbar">
          <div className="texts">
            <Marquee className="title-1" speed={26}>{title}</Marquee>
            <Marquee className="title-2" speed={26}>{statusText || sub}</Marquee>
          </div>
          <div className="controls">
            <button onClick={onPrev} aria-label="Anterior" title="Anterior"><SkipBack size={20} fill="currentColor" /></button>
            <button className="mainbtn" onClick={onToggle} aria-label={loading ? 'Cargando audio' : toggleLabel} title={loading ? 'Cargando…' : toggleLabel} aria-busy={loading ? 'true' : undefined} disabled={!!loading}>
              {loading
                ? <Loader2 size={20} className="animate-spin" />
                : playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <button onClick={onNext} aria-label="Siguiente" title="Siguiente"><SkipForward size={20} fill="currentColor" /></button>
          </div>
          <div className="prog">
            {progress ? (
              <div className="time"
                onPointerDown={(e) => {
                  if (!onSeek) return;
                  scrub.current = true;
                  e.currentTarget.setPointerCapture?.(e.pointerId);
                  seekFromX(e.currentTarget, e.clientX);
                }}
                onPointerMove={(e) => { if (scrub.current) seekFromX(e.currentTarget, e.clientX); }}
                onPointerUp={() => { scrub.current = false; }}
                onPointerCancel={() => { scrub.current = false; }}
                onKeyDown={(e) => {
                  if (!onSeek || !progress?.dur) return;
                  const d = progress.dur;
                  if (e.key === 'ArrowRight') { e.preventDefault(); onSeek(Math.min(1, (progress.cur + 10) / d)); }
                  else if (e.key === 'ArrowLeft') { e.preventDefault(); onSeek(Math.max(0, (progress.cur - 10) / d)); }
                  else if (e.key === 'Home') { e.preventDefault(); onSeek(0); }
                  else if (e.key === 'End') { e.preventDefault(); onSeek(1); }
                }}
                tabIndex={onSeek ? 0 : -1}
                role="slider" aria-label={`Progreso de ${title}`} aria-valuemin={0} aria-valuemax={Math.round(progress.dur || 0)} aria-valuenow={Math.round(progress.cur || 0)} aria-valuetext={`${progress.curText} de ${progress.durText}`}
                title={`${progress.curText} / ${progress.durText}`}><div className="elapsed" style={{ width: `${pct}%` }} /></div>
            ) : (
              <div className="time live" aria-hidden="true"><div className="elapsed indet" /></div>
            )}
          </div>
        </div>

      </div>
      {/* La cola va fuera de la tarjeta (la tarjeta recorta lo que se sale de su borde redondeado) */}
      {showQueue && (
        <div className="queuepop" onPointerDown={(e) => e.stopPropagation()}>
          {props.queuePop}
        </div>
      )}
    </StyledWrapper>
  );
}

