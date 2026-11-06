import { useEffect, useRef, useState } from 'react';
import useStore from '../hooks/useStore';
import { DEFAULT_PLACE } from '../services/weather';
import { WIDGETS } from './registry';
import LedFrame from './LedFrame';
import { Bubble, WeatherRow } from './CaritaParts';

// Tamaño de la carita (el mismo para la carita del día y la mascota de puntos).
export const FACE_SIZE = 'w-36 h-36 sm:w-44 sm:h-44 shrink-0';

// Caritas del día (react.face) → expresiones de la mascota de puntos.
const FACE2EX = { feliz: 'happy', enamorado: 'love', lentes: 'cool', guino: 'wink', neutral: 'neutral', pensando: 'talking', llanto: 'sad', sorpresa: 'surprised', dormido: 'sleepy', musica: 'dance', travieso: 'wink', diablito: 'cool', enojado: 'angry', risa: 'happy', mareado: 'dizzy', corazon: 'love', asustado: 'surprised' };
// Mientras suena música va pasando por varias caritas (no solo bailando).
const MUSIC_FACES = ['dance', 'happy', 'love', 'wink', 'cool', 'dance', 'talking', 'happy'];

// Qué hace la mascota según lo que pasa en la app (prioridad: aviso > toque > música > dormida > clima > automática).
function petState({ playing, idle = 0, hour = 12, react }, beat = 0) {
  if (react?.kind === 'alert') return { e: 'surprised', music: false };
  if (react?.kind === 'poke') return { e: FACE2EX[react.face] || 'happy', music: false };
  if (playing) return { e: MUSIC_FACES[beat % MUSIC_FACES.length], music: true };
  if (react?.kind === 'sleep' || idle >= 90 || (hour < 5 && idle >= 30)) return { e: 'sleepy', music: false };
  if (react?.kind === 'weather' && FACE2EX[react.face]) return { e: FACE2EX[react.face], music: false };
  return { e: null, music: false }; // null = automática: va cambiando de carita sola
}

/** Un widget de puntos (reloj, clima, zen, mascota, pantalla LED) ya conectado a la app: color, ubicación, unidad y música. */
export default function LedWidget({ item, ctx = {}, interactive = true }) {
  const def = WIDGETS[item.type];
  const [place] = useStore('h_place', DEFAULT_PLACE);
  const [unit] = useStore('h_unit', 'c');
  const frame = useRef(null);
  const [beat, setBeat] = useState(0);
  const musicOn = item.type === 'mascota' && !!ctx.playing;
  useEffect(() => { if (!musicOn) return undefined; const iv = setInterval(() => setBeat((b) => b + 1), 4500); return () => clearInterval(iv); }, [musicOn]);
  let cfg = item.cfg; let extra; let extras;

  if (item.type === 'clima') {
    cfg = { ...cfg, unit: cfg.unit === 'app' ? (unit === 'f' ? 'F' : 'C') : cfg.unit, place: { lat: place.lat, lon: place.lon, name: String(place.name || '').split(',')[0] } };
  } else if (item.type === 'pantalla') {
    extra = { playing: !!ctx.playing };
  } else if (item.type === 'mascota') {
    const s = petState(ctx, beat);
    extras = { state: { k: 'state', ...s } };
  }

  // La mascota sigue el puntero aunque esté fuera de su cuadro.
  useEffect(() => {
    if (item.type !== 'mascota') return undefined;
    let last = 0;
    const on = (e) => {
      const now = performance.now(); if (now - last < 60) return; last = now;
      const f = frame.current; const r = f?.getBoundingClientRect(); if (!r || !r.width) return;
      try { f.contentWindow?.postMessage({ __hw: 1, k: 'ptr', x: (e.clientX - (r.left + r.width / 2)) / r.width, y: (e.clientY - (r.top + r.height / 2)) / r.height }, '*'); } catch { /* sin iframe */ }
    };
    window.addEventListener('pointermove', on, { passive: true });
    return () => window.removeEventListener('pointermove', on);
  }, [item.type]);

  const led = (cls = 'w-full') => (
    <div className={cls}><LedFrame html={def.html} cfg={cfg} extra={extra} extras={extras} aspect={def.aspect} title={def.name} interactive={interactive} frameRef={frame} transparent={item.type === 'mascota' && cfg.look !== 'classic'} /></div>
  );
  // La mascota de puntos ocupa el mismo lugar y tamaño que la carita del día; solo cambia la carita.
  if (item.type === 'mascota') return <PetCard tile={led(FACE_SIZE)} ctx={ctx} showText={cfg.text !== false} onWeather={ctx.onOpenWeather} />;
  return (
    <div className={def.square && (item.size === 'l' || item.size === 'xl') ? 'max-w-[560px] mx-auto w-full' : 'w-full'}>
      <LedFrame html={def.html} cfg={cfg} extra={extra} extras={extras} aspect={def.aspect} title={def.name} interactive={interactive} frameRef={frame} />
    </div>
  );
}

/** La mascota de puntos con el mismo diseño de la carita del día: carita arriba, diálogo y clima abajo. */
function PetCard({ tile, ctx, showText, onWeather }) {
  if (!showText) return <div className="flex justify-center">{tile}</div>;
  return (
    <div className="card h-full flex flex-col items-center gap-4">
      {tile}
      <Bubble>{ctx.react?.say || '¡Hola! Soy tu mascota de puntos.'}</Bubble>
      <WeatherRow weather={ctx.weather} onClick={onWeather} />
    </div>
  );
}
