import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import useStore from '../hooks/useStore';
import { ZEN_VIDEOS } from '../data/zenVideos';

const HIDE_MS = 3000;

/**
 * Pantalla Zen: solo videos + mascotas flotantes (PetLayer global).
 * - Video a pantalla limpia: sin controles, sin sonido, loop infinito.
 * - El video no se puede pausar ni mover (sin controles, pointer-events none).
 * - UI (selector + botones) se auto-oculta a los 3s y reaparece al tocar/mover.
 */
export default function ZenView({ onExit }) {
  const [idx, setIdx] = useStore('h_zen_idx', 0);
  const safeIdx = ZEN_VIDEOS[idx] ? idx : 0;
  const current = ZEN_VIDEOS[safeIdx];
  const [showUI, setShowUI] = useState(true);
  const [fs, setFs] = useState(false);
  const boxRef = useRef(null);
  const timer = useRef(null);

  const poke = useCallback(() => {
    setShowUI(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShowUI(false), HIDE_MS);
  }, []);

  useEffect(() => {
    poke();
    return () => clearTimeout(timer.current);
  }, [poke, safeIdx]);

  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const toggleFs = async () => {
    poke();
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      // Fullscreen sobre toda la página (no sobre el contenedor del video):
      // así PetLayer —que vive fuera de este contenedor— sigue visible.
      // El overlay Zen (fijo, negro, z-32) igual tapa el resto de la app.
      else await document.documentElement.requestFullscreen?.();
    } catch { /* no soportado */ }
  };

  return (
    <div
      ref={boxRef}
      onMouseMove={poke}
      onTouchStart={poke}
      onClick={poke}
      onContextMenu={(e) => e.preventDefault()}
      className={`zen-wrap fixed inset-0 z-[32] bg-black flex items-center justify-center overflow-hidden ${showUI ? '' : 'zen-hide'}`}
      aria-label="Pantalla Zen"
    >
      <video
        key={current.src}
        src={current.src}
        className="zen-video pointer-events-none"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        controls={false}
        tabIndex={-1}
        aria-label={current.label}
      />

      {/* Botones: pantalla completa + salir */}
      <div className={`zen-ui absolute top-[max(1rem,env(safe-area-inset-top))] right-4 flex items-center gap-2 ${showUI ? 'zen-ui-on' : 'zen-ui-off'}`}>
        <button className="zen-btn" onClick={(e) => { e.stopPropagation(); toggleFs(); }} aria-label={fs ? 'Salir de pantalla completa' : 'Pantalla completa'}>
          {fs ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
        {onExit && (
          <button className="zen-btn" onClick={(e) => { e.stopPropagation(); onExit(); }} aria-label="Salir de la pantalla Zen">
            <X size={20} />
          </button>
        )}
      </div>

      {/* Selector manual de videos */}
      <div className={`zen-ui absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-0 right-0 flex justify-center px-4 ${showUI ? 'zen-ui-on' : 'zen-ui-off'}`}>
        <div className="zen-strip" role="listbox" aria-label="Elegir video" onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          {ZEN_VIDEOS.map((v, i) => (
            <button
              key={v.src}
              role="option"
              aria-selected={i === safeIdx}
              aria-label={v.label}
              title={v.label}
              onClick={() => { setIdx(i); poke(); }}
              className={`zen-thumb ${i === safeIdx ? 'zen-thumb-on' : ''}`}
            >
              <video src={v.src} muted playsInline preload="metadata" tabIndex={-1} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
