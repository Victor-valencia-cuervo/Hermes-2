import { useEffect, useRef, useState } from 'react';
import { Music2, RotateCw } from 'lucide-react';
import { FONT, SERIF } from './ui';

/** Letra estilo Apple Music & Spotify con resaltado de alta precisión:
 *  - Palabra por palabra (word-sync) cuando la fuente lo incluye (TTML / enhanced LRC).
 *  - Relleno progresivo fluido en tiempo real cuando es sincronía por línea (LRC).
 *  - Indicador visual luminoso de posición exacta y seguimiento automático suave.
 *  - Tocar cualquier línea salta al instante a ese momento.
 *  - Tocar zona vacía muestra/oculta los controles inferiores.
 */
/** Si la fuente solo trae la hora de cada línea, repartimos el tiempo entre sus palabras según su largo.
 *  Así se resalta palabra por palabra SIN usar "background-clip:text" (en algunos navegadores/celulares
 *  esa técnica dibuja un rectángulo sólido que tapa el texto de la letra). */
function wordsOf(line, nextT) {
  if (line.words && line.words.length) return line.words;
  const parts = String(line.x || '♪').split(/\s+/).filter(Boolean);
  const total = parts.reduce((a, w) => a + w.length + 1, 0) || 1;
  const t0 = line.t ?? 0;
  // La voz casi siempre termina antes de que empiece la siguiente línea
  const dur = Math.max(0.6, Math.min((nextT ?? t0 + 4.5) - t0, 9)) * 0.9;
  let acc = 0;
  return parts.map((x) => { const t = t0 + (dur * acc) / total; acc += x.length + 1; return { x, t }; });
}

export default function LyricsPane({ p, bits, fontKey = 'apple', onEmptyTap, bottomPad = 24, fadePx = 0, big = false }) {
  const box = useRef(null);
  const els = useRef([]);
  const userScroll = useRef(0);
  const [userBrowsing, setUserBrowsing] = useState(false);
  const { lrc, lines, activeIdx, effectiveTime = bits.tReal || 0 } = bits;
  const synced = lrc?.state === 'ok' && lines.length > 0;
  const serif = fontKey === 'hermes';
  const font = serif ? SERIF : FONT;
  const size = big ? (serif ? 'clamp(34px, 3.6vw, 58px)' : 'clamp(30px, 3.2vw, 52px)') : serif ? 'clamp(30px, 8.4vw, 42px)' : 'clamp(26px, 7.2vw, 36px)';

  // Sigue la letra: la línea actual queda suavemente centrada en el tercio superior (~32%)
  useEffect(() => {
    const el = box.current; const ln = els.current[activeIdx];
    if (!el || !ln || Date.now() < userScroll.current) return;
    el.scrollTo({ top: Math.max(0, ln.offsetTop - el.clientHeight * 0.32), behavior: 'smooth' });
  }, [activeIdx]);

  const pauseAutoScroll = () => {
    userScroll.current = Date.now() + 4000;
    setUserBrowsing(true);
    setTimeout(() => {
      if (Date.now() >= userScroll.current) setUserBrowsing(false);
    }, 4100);
  };

  const resumeSync = (e) => {
    e?.stopPropagation?.();
    userScroll.current = 0;
    setUserBrowsing(false);
    const el = box.current; const ln = els.current[activeIdx];
    if (el && ln) {
      el.scrollTo({ top: Math.max(0, ln.offsetTop - el.clientHeight * 0.32), behavior: 'smooth' });
    }
  };

  const tapBackground = (e) => {
    if (e.target.closest('[data-nohide],button,a,input')) return;
    onEmptyTap?.();
  };

  // Con los controles visibles, la letra se desvanece con elegancia antes de llegar a la barra
  const mask = fadePx
    ? `linear-gradient(180deg, transparent 0, #000 6%, #000 calc(100% - ${fadePx + 44}px), transparent calc(100% - ${fadePx - 6}px))`
    : 'linear-gradient(180deg, transparent 0, #000 6%, #000 94%, transparent 100%)';

  return (
    <div ref={box} onClick={tapBackground} onWheel={pauseAutoScroll} onTouchMove={pauseAutoScroll}
      className={`fp-scroll absolute inset-0 overflow-y-auto select-none ${big ? 'px-4' : 'px-6'}`} aria-label="Letra"
      style={{ paddingTop: big ? '30vh' : '1.2rem', paddingBottom: big ? Math.max(bottomPad, 160) : bottomPad, transition: 'padding-bottom .4s cubic-bezier(.32,.72,0,1)', maskImage: mask, WebkitMaskImage: mask, fontFamily: font }}>

      {(!lrc || lrc.state === 'loading') && (
        <div className="pt-20 text-center text-white" role="status">
          <div className="flex justify-center gap-2 mb-4" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <Music2 key={i} size={22} style={{ animation: `fpEq 1.2s ease-in-out ${i * 0.2}s infinite` }} />
            ))}
          </div>
          <p className="text-[24px] font-bold">Buscando la letra…</p>
          <p className="text-sm text-white/60 mt-1">Sincronizando con la música.</p>
        </div>
      )}

      {(lrc?.state === 'empty' || (lrc?.state === 'ok' && !lines.length && !lrc.plain)) && (
        <div className="pt-20 text-center text-white">
          <Music2 size={34} className="mx-auto mb-4 opacity-80" />
          <p className="text-[24px] font-bold leading-snug">Esta canción aún no tiene letra</p>
          <p className="text-sm text-white/60 mt-2">La música sigue sonando. Si la encontramos, aparecerá aquí.</p>
        </div>
      )}

      {synced && lines.map((l, i) => {
        const on = i === activeIdx;
        const d = activeIdx < 0 ? 2 : Math.min(6, Math.abs(i - activeIdx));

        const words = on ? wordsOf(l, lines[i + 1]?.t) : null;

        return (
          <p key={i} ref={(el) => { els.current[i] = el; }} data-nohide="1" role="button" tabIndex={0}
            aria-current={on ? 'true' : undefined}
            aria-label={`${l.x || 'Instrumental'}. Saltar a este momento`}
            onClick={(e) => { e.stopPropagation(); p.seek(Math.max(0, (l.t ?? 0) - bits.lrcOffset - 0.15)); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.seek(Math.max(0, (l.t ?? 0) - bits.lrcOffset - 0.15)); } }}
            className={`fp-lyric relative cursor-pointer origin-left leading-[1.2] outline-none transition-all duration-300 ${on ? 'py-2.5 my-1.5' : 'py-1'}`}
            style={{
              fontSize: size,
              fontWeight: serif ? (on ? 700 : 600) : (on ? 800 : 700),
              color: on ? '#fff' : 'rgba(255,255,255,0.42)',
              opacity: on ? 1 : Math.max(0.18, 0.44 - d * 0.05),
              filter: on ? 'none' : `blur(${Math.min(2.2, d * 0.55)}px)`,
              transform: on ? 'scale(1.02)' : 'scale(.97)',
            }}>

            {/* Indicador luminoso en la línea activa */}
            {on && (
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_12px_#fff] mr-3 -translate-y-0.5 align-middle shrink-0 animate-pulse" aria-hidden="true" />
            )}

            {/* Resaltado palabra por palabra (real si la fuente lo trae, estimado si no) */}
            {on ? (
              <span>
                {words.map((w, wi) => {
                  const sung = effectiveTime >= w.t;
                  return (
                    <span key={wi} className="inline-block mr-[0.22em] transition-colors duration-200"
                      style={{
                        color: sung ? '#ffffff' : 'rgba(255,255,255,0.4)',
                        textShadow: sung ? '0 0 16px rgba(255,255,255,0.55)' : 'none',
                      }}>
                      {w.x}
                    </span>
                  );
                })}
              </span>
            ) : (
              <span>{l.x || '♪'}</span>
            )}
          </p>
        );
      })}

      {lrc?.state === 'ok' && !synced && !!lrc.plain && (
        <div className="pb-4">
          <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-white/55">Letra sin sincronizar</p>
          <p className="whitespace-pre-line text-white/90" data-nohide="1" style={{ fontSize: serif ? 26 : 22, fontWeight: serif ? 600 : 600, lineHeight: 1.4 }}>{lrc.plain}</p>
        </div>
      )}

      {lrc?.provider && lrc.state === 'ok' && (
        <p className="mt-8 mb-2 text-[11px] text-white/40" style={{ fontFamily: 'system-ui' }}>
          Letra vía {lrc.provider}{lrc.wordSync ? ' · Sincronizada palabra por palabra' : ' · Sincronizada'}
        </p>
      )}

      {/* Botón para reanudar el seguimiento automático si el usuario se desplazó */}
      {userBrowsing && synced && (
        <div className="sticky flex justify-end pointer-events-none" style={{ bottom: Math.max(12, bottomPad - 36), height: 0 }}>
          <button onClick={resumeSync}
            className="pointer-events-auto -translate-y-full inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white shadow-lg active:scale-95 transition-all"
            style={{ background: 'rgba(30,30,34,.78)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,.18)' }}>
            <RotateCw size={13} />
            Sincronizar
          </button>
        </div>
      )}
    </div>
  );
}
