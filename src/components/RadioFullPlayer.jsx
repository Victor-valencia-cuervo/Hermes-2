import { useEffect, useState } from 'react';
import {
  ChevronDown, Play, Pause, Shuffle, Heart, Volume2, VolumeX,
  Timer, Loader2, Globe, Radio, Square,
} from 'lucide-react';
import { fmtTime } from '../lib/format';
import Cover from './Cover';
import useArtColors from '../hooks/useArtColors';
import ElegantParticles from './ElegantParticles';
import ParticleSettings, { useParticleCfg } from './ParticleSettings';
import { cssToRgb } from '../lib/particle-color';

const SLEEPS = [0, 5, 10, 15, 30, 45, 60];

/** Sonando de radios del mundo: carátula grande, controles y temporizador. */
export default function RadioFullPlayer({ r, p, toast, dark, onClose }) {
  const st = r.current;
  const colors = useArtColors(st?.art);
  const [sleepMin, setSleepMin] = useState(0);
  const [sleepLeft, setSleepLeft] = useState(0);
  const [pcfg, setPcfg] = useParticleCfg();
  const prgb = cssToRgb(colors?.main || colors?.deep);

  // Cierra con Escape
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);

  // Sleep timer: apaga la radio al terminar
  useEffect(() => {
    if (!sleepMin) return;
    const end = Date.now() + sleepMin * 60000;
    setSleepLeft(sleepMin * 60);
    const iv = setInterval(() => {
      const s = Math.max(0, Math.round((end - Date.now()) / 1000));
      setSleepLeft(s);
      if (s <= 0) {
        clearInterval(iv);
        setSleepMin(0);
        r.stop();
        toast?.('Temporizador: radio apagada', Timer);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [sleepMin]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!st) return null;
  const wash = colors?.main || 'var(--a)';
  const bg = colors
    ? dark
      ? `linear-gradient(180deg, ${colors.main}66 0%, rgba(9,9,11,.86) 55%, #09090b 100%)`
      : `linear-gradient(180deg, ${colors.main}55 0%, rgba(244,244,245,.92) 55%, #f4f4f5 100%)`
    : undefined;

  return (
    <div className="fixed inset-0 z-40 sheet overflow-hidden" role="dialog" aria-modal="true" aria-label="Radio sonando">
      {st.art && <img src={st.art} alt="" className="absolute inset-0 w-full h-full object-cover blur-3xl scale-125 opacity-60" />}
      <div className="absolute inset-0" style={bg ? { background: bg } : { background: 'var(--bg)' }} />

      <div className="relative h-full overflow-y-auto">
        <ElegantParticles rgb={prgb} enabled={pcfg.enabled !== false} density={pcfg.density} radius={pcfg.radius}
          force={pcfg.force} showLines={pcfg.showLines} maxOpacity={pcfg.maxOpacity} />
        <div className="relative max-w-md lg:max-w-4xl mx-auto px-5 lg:px-8 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] min-h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between">
            <button className="ico-btn !p-2" onClick={onClose} aria-label="Cerrar sonando"><ChevronDown size={24} /></button>
            <div className="text-center">
              <span className="flex items-center justify-center gap-1.5 text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: wash }}>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />En vivo
              </span>
              <span className="block text-sm font-semibold mt-0.5">Radio del mundo</span>
            </div>
            <div className="flex items-center gap-1">
              <ParticleSettings cfg={pcfg} setCfg={setPcfg} />
              <button className="ico-btn !p-2" onClick={() => r.toggleFav(st)} aria-label="Favorita">
                <Heart size={22} fill={r.isFav(st) ? 'var(--a)' : 'none'} style={{ color: r.isFav(st) ? 'var(--a)' : undefined }} />
              </button>
            </div>
          </div>

          <div className="lg:grid lg:grid-cols-2 lg:gap-10 lg:items-center lg:flex-1">
            <div className="lg:sticky lg:top-0">
              {/* Carátula grande */}
              <div className="mt-4 lg:mt-6 mx-auto w-full aspect-square max-w-[310px] lg:max-w-[380px] rounded-[28px] overflow-hidden shadow-2xl shrink-0 border border-white/10 relative">
                <Cover src={st.art} alt={st.name} iconSize={56} className={`w-full h-full ${r.playing ? 'breathe' : ''}`} />
              </div>

              {/* Título */}
              <div className="mt-5 text-center lg:text-left">
                <p className="text-xl lg:text-2xl font-semibold leading-tight">{st.name}</p>
                <p className="text-sm mt-1" style={{ color: 'var(--m)' }}>
                  {[st.country, st.language].filter(Boolean).join(' · ') || 'Mundial'}
                </p>
                {!!(st.tags || []).length && (
                  <p className="text-[11px] mt-1" style={{ color: 'var(--m)' }}>{st.tags.join(' · ')}</p>
                )}
                {(st.codec || st.bitrate > 0) && (
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--m)' }}>
                    {[st.codec, st.bitrate > 0 ? `${st.bitrate} kbps` : ''].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
            </div>

            <div className="min-w-0">
              {/* Estado */}
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs" style={{ color: 'var(--m)' }}>
                {r.loading
                  ? <><Loader2 size={14} className="animate-spin" /> Conectando…</>
                  : r.playing
                    ? <><Radio size={14} style={{ color: wash }} /> Sonando en vivo</>
                    : 'En pausa'}
              </p>

              {/* Controles */}
              <div className="mt-3 flex items-center justify-center gap-3">
                <button className="glass-btn w-14 h-14 rounded-2xl grid place-items-center" onClick={() => r.playRandom()}
                  aria-label="Otra radio aleatoria" title="Otra aleatoria">
                  <Shuffle size={20} />
                </button>
                <button onClick={() => r.toggle()} aria-label={r.playing ? 'Pausar' : 'Escuchar'}
                  className="w-20 h-16 rounded-[22px] grid place-items-center text-white shadow-xl active:scale-95 transition-transform"
                  style={{ background: wash, boxShadow: `0 0 25px ${wash}66` }}>
                  {r.loading ? <Loader2 size={26} className="animate-spin" /> : r.playing ? <Pause size={26} /> : <Play size={26} className="ml-1" />}
                </button>
                <button className="glass-btn w-14 h-14 rounded-2xl grid place-items-center" onClick={() => r.stop()} aria-label="Detener" title="Detener">
                  <Square size={20} />
                </button>
              </div>

              {/* Secundarios: volumen + sleep + web */}
              <div className="mt-3 flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--m)' }}>
                <button className="ico-btn" onClick={p.toggleMute} aria-label="Silenciar">
                  {p.muted || p.volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                </button>
                <input type="range" min="0" max="1" step="0.05" value={p.muted ? 0 : p.volume}
                  onChange={(e) => p.setVolume(+e.target.value)} className="w-24 h-1"
                  style={{ accentColor: wash }} aria-label="Volumen" />
                <span className="w-px h-4 mx-1" style={{ background: 'var(--bd)' }} />
                {st.homepage && (
                  <a className="ico-btn" href={st.homepage} target="_blank" rel="noreferrer" aria-label="Web de la estación" title="Web">
                    <Globe size={17} />
                  </a>
                )}
                <div className="flex items-center gap-1">
                  <Timer size={16} style={sleepMin ? { color: wash } : undefined} />
                  <select value={sleepMin} onChange={(e) => { setSleepMin(+e.target.value); if (+e.target.value) toast?.(`Apago en ${e.target.value} min`, Timer); }}
                    className="bg-transparent text-xs outline-none" aria-label="Temporizador de apagado" style={{ color: 'var(--m)' }}>
                    {SLEEPS.map((m) => <option key={m} value={m}>{m === 0 ? 'Sleep' : `${m}m`}</option>)}
                  </select>
                  {sleepMin > 0 && <span className="tabular-nums">{fmtTime(sleepLeft)}</span>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
