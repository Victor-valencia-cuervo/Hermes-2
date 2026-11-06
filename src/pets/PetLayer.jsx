import { useCallback, useEffect, useRef, useState } from 'react';
import Pet from './Pet';
import { MAX_PETS } from './pets';
import { getPet, initCatalog, useCatalog } from './catalog';
import { FREQ, SIZES, clearSpots, readSpots, writeSpot } from './settings';
import { byHour, DIZZY, FUN, GREET, MUSIC, WAKE, WEATHER, pick } from './phrases';
import { SHAKE_EVENT } from '../hooks/useShake';
import { IDLE_SLEEP, IDLE_SLEEP_LATE } from '../data/faces';

const toC = (t, sym) => (sym === '°F' ? ((t - 32) * 5) / 9 : t);

/** Resume el clima en una "clase" para decidir cómo reaccionan. */
export function weatherKind(w) {
  if (!w) return null;
  const c = w.code; const t = toC(w.temp, w.sym);
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95) return 'rain';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'cold';
  if (t >= 27) return 'hot';
  if (t <= 15) return 'cold';
  if (c === 45 || c === 48) return 'fog';
  if (c === 3) return 'cloud';
  return w.isDay ? 'sun' : 'night';
}
const KIND_ACT = { rain: 'rain', hot: 'hot', cold: 'cold', sun: 'love', fog: 'jump', storm: 'alert', uv: 'love' };
// Alerta del clima (la dispara useWeatherAlerts): tipo -> frase de mascota.
const WX_SAY = { storm: 'storm', rain: 'rain', heat: 'hot', cold: 'cold', uv: 'uv' };

const getLast = () => { try { return +localStorage.getItem('h_pets_lastgreet') || 0; } catch { return 0; } };
const setLast = () => { try { localStorage.setItem('h_pets_lastgreet', String(Date.now())); } catch { /* noop */ } };

/**
 * Capa global de mascotas + "director" que decide cuándo saludan y a qué reaccionan:
 * saludo al abrir y cada cierto rato, clima, música/radio, recordatorios, sueño y mimos.
 */
export default function PetLayer({ cfg, weather, playing, mediaTitle, mediaKey, idle, hour, name, pendingCount }) {
  useCatalog(); // re-render cuando se crea / edita una mascota
  useEffect(() => { initCatalog(); }, []);
  const ids = (cfg.sel || []).filter((id) => getPet(id)).slice(0, MAX_PETS);
  const active = !!cfg.on && ids.length > 0;
  const scale = SIZES[cfg.size] || 1;

  const late = hour >= 23 || hour < 5;
  const sleeping = !playing && idle >= (late ? IDLE_SLEEP_LATE : IDLE_SLEEP);

  const refs = useRef({});
  const ctx = useRef({ playing: false, sleeping: false });
  ctx.current.playing = playing; ctx.current.sleeping = sleeping;
  const kind = weatherKind(weather);
  const live = useRef({});
  live.current = { weather, playing, mediaTitle, hour, name, pendingCount, sleeping, ids, kind };

  const spots = useRef(readSpots());
  const [gather, setGather] = useState(0);
  const onSpot = useCallback((id, spot) => { spots.current = { ...spots.current, [id]: spot }; writeSpot(id, spot); }, []);

  /* ───────── helpers del director ───────── */
  // Elige una mascota despierta para hablar; `all` hace que todas hagan la animación.
  const say = useCallback((text, { act, all, dur, who } = {}) => {
    const pets = live.current.ids.map((id) => [id, refs.current[id]]).filter(([, p]) => p);
    if (!pets.length) return;
    const awake = pets.filter(([, p]) => !p.isSleeping());
    const pool = awake.length ? awake : pets;
    const sp = (who && pool.find(([id]) => id === who)) || pool[Math.floor(Math.random() * pool.length)];
    if (text) sp[1].say(text, dur);
    if (act) pets.forEach(([id, p], i) => { if (all || id === sp[0]) setTimeout(() => p.act(act, dur && act === 'alert' ? dur : undefined), all ? i * 160 : 0); });
  }, []);

  const n = () => (live.current.name ? `, ${live.current.name}` : '');
  const fill = (s) => String(s).split('{n}').join(n());

  const greet = useCallback(() => {
    const h = live.current.hour;
    const period = h >= 5 && h < 12 ? 'morning' : h >= 12 && h < 19 ? 'afternoon' : 'evening';
    say(fill(pick(GREET[period])), { act: 'wave', all: true });
    setLast();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [say]);

  const weatherEvent = useCallback(() => {
    const { kind: k, weather: w, ids: lids } = live.current;
    if (!k || !WEATHER[k]) return false;
    // Mascotas con frases propias de clima (ej. Marine) hablan primero.
    const key = k === 'storm' ? 'rain' : k;
    const cand = (lids || []).map((id) => getPet(id)).find((p) => p?.weatherPhrases?.[key]?.length);
    if (cand) {
      say(pick(cand.weatherPhrases[key]), { act: KIND_ACT[k] || 'jump', who: cand.id });
      return true;
    }
    const temp = w && ['hot', 'cold'].includes(k) && Math.random() < 0.5 ? ` (${w.temp}${w.sym || '°C'})` : '';
    say(pick(WEATHER[k]) + temp, { act: KIND_ACT[k] || 'jump', all: k !== 'cloud' });
    return true;
  }, [say]);

  const fire = useCallback(() => {
    const L = live.current;
    const opts = [];
    if (L.kind && L.kind !== 'cloud') opts.push([3, weatherEvent]);
    if (Date.now() - getLast() > 25 * 60000) opts.push([3, greet]);
    else opts.push([2, () => say(fill(pick(byHour(L.hour))), { act: 'jump' })]);
    opts.push([3, () => {
      const id = pick(L.ids); const p = getPet(id) || { voice: FUN };
      // Con música sonando, las mascotas con frases propias de música las usan a veces.
      const mus = L.playing && p.musicPhrases?.length && Math.random() < 0.6;
      say(mus ? pick(p.musicPhrases) : Math.random() < 0.55 ? pick(p.voice) : pick(FUN), { who: id, act: mus ? 'love' : pick(['jump', 'love', 'wave']) });
    }]);
    if (L.playing && L.mediaTitle) opts.push([4, () => say(pick(MUSIC).replace('{t}', L.mediaTitle), { act: 'love', all: true })]);
    if (L.pendingCount > 0) opts.push([2, () => say(`Tienes ${L.pendingCount} pendiente${L.pendingCount > 1 ? 's' : ''} por ahí.`, { act: 'alert' })]);
    const total = opts.reduce((a, [w]) => a + w, 0);
    let r = Math.random() * total;
    for (const [w, fn] of opts) { r -= w; if (r <= 0) { fn(); return; } }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [say, greet, weatherEvent]);

  /* ───────── 1) Saludo al abrir / al activar ───────── */
  const wasActive = useRef(false);
  const firstRun = useRef(true);
  useEffect(() => {
    if (!active) { wasActive.current = false; firstRun.current = false; return undefined; }
    const toggled = !firstRun.current && !wasActive.current;
    const cool = Date.now() - getLast() > 20 * 60000;
    firstRun.current = false; wasActive.current = true;
    if (!toggled && !cool) return undefined;
    const t = setTimeout(greet, 2200);
    return () => clearTimeout(t);
  }, [active, gather, greet]);

  /* ───────── 2) Comentarios espontáneos cada cierto rato ───────── */
  useEffect(() => {
    if (!active) return undefined;
    const [lo, hi] = FREQ[cfg.freq] || FREQ.normal;
    let t;
    const next = () => { t = setTimeout(run, lo + Math.random() * (hi - lo)); };
    const run = () => { if (!document.hidden && !live.current.sleeping) fire(); next(); };
    next();
    return () => clearTimeout(t);
  }, [active, cfg.freq, fire]);

  /* ───────── 3) Cambia el clima ───────── */
  const prevKind = useRef(undefined);
  useEffect(() => {
    if (!active || !kind) return undefined;
    const first = prevKind.current === undefined;
    const changed = !first && prevKind.current !== kind;
    prevKind.current = kind;
    if (!(changed || (first && ['rain', 'hot', 'cold'].includes(kind)))) return undefined;
    const t = setTimeout(weatherEvent, first ? 7000 : 2000);
    return () => clearTimeout(t);
  }, [kind, active, weatherEvent]);

  /* ───────── 4) Cambia la canción / radio ───────── */
  const lastMusic = useRef(0);
  useEffect(() => {
    if (!active || !playing || !mediaTitle) return undefined;
    if (Date.now() - lastMusic.current < 45000 || Math.random() > 0.7) return undefined;
    const t = setTimeout(() => {
      lastMusic.current = Date.now();
      say(pick(MUSIC).replace('{t}', mediaTitle), { act: 'love', all: true });
    }, 1600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaKey, playing, active]);

  /* ───────── 5) Se duermen / despiertan ───────── */
  const sleptAt = useRef(0);
  useEffect(() => {
    if (sleeping) { sleptAt.current = Date.now(); return undefined; }
    if (!sleptAt.current) return undefined;
    const long = Date.now() - sleptAt.current > 25000;
    sleptAt.current = 0;
    if (!active || !long) return undefined;
    const t = setTimeout(() => say(pick(WAKE), { act: 'jump' }), 500);
    return () => clearTimeout(t);
  }, [sleeping, active, say]);

  /* ───────── 6) Eventos globales ───────── */
  useEffect(() => {
    const onReminder = (e) => say(`¡Ey! ${e?.detail?.text || 'Recordatorio'}`, { act: 'alert', all: true, dur: 9000 });
    // Alerta del clima: la mascota reacciona con frase acorde.
    const onWx = (e) => {
      const k = WX_SAY[e?.detail?.type];
      if (!k || !WEATHER[k]) return;
      const key = k === 'storm' ? 'rain' : k;
      const cand = (live.current.ids || []).map((id) => getPet(id)).find((p) => p?.weatherPhrases?.[key]?.length);
      if (cand) { say(pick(cand.weatherPhrases[key]), { act: KIND_ACT[k] || 'jump', who: cand.id, all: true }); return; }
      say(pick(WEATHER[k]), { act: KIND_ACT[k] || 'jump', all: true });
    };
    const onGreet = () => greet();
    // «Probar trucos»: cada mascota hace el suyo, escalonadas.
    const onSpecial = () => {
      live.current.ids.map((id) => refs.current[id]).filter(Boolean).forEach((pt, i) => setTimeout(() => pt.special(), i * 1400));
    };
    const onGather = () => { clearSpots(); spots.current = {}; setGather((g) => g + 1); };
    // Sacudida: cada mascota sale volando en cadena; las dormidas solo se despiertan.
    const onShake = (e) => {
      const power = e?.detail?.power ?? 0.7;
      const list = live.current.ids
        .map((id) => [id, refs.current[id]])
        .filter(([, p]) => p);
      list.forEach(([, p], i) => {
        setTimeout(() => {
          if (p.isSleeping()) { p.say(pick(WAKE), 2500); p.act('alert', 900); }
          else { p.toss(power); if (Math.random() < 0.5) p.say(pick(DIZZY), 2600); }
        }, i * 130);
      });
    };
    window.addEventListener('hermes:reminder', onReminder);
    window.addEventListener('hermes:wx', onWx);
    window.addEventListener('hermes:pet-greet', onGreet);
    window.addEventListener('hermes:pet-special', onSpecial);
    window.addEventListener('hermes:pet-gather', onGather);
    window.addEventListener(SHAKE_EVENT, onShake);
    return () => {
      window.removeEventListener('hermes:reminder', onReminder);
      window.removeEventListener('hermes:wx', onWx);
      window.removeEventListener('hermes:pet-greet', onGreet);
      window.removeEventListener('hermes:pet-special', onSpecial);
      window.removeEventListener('hermes:pet-gather', onGather);
      window.removeEventListener(SHAKE_EVENT, onShake);
    };
  }, [say, greet]);

  if (!active) return null;
  return (
    <div className="pet-layer" aria-hidden="true">
      {ids.map((id) => (
        <Pet key={`${id}-${gather}`} ref={(r) => { refs.current[id] = r; }}
          def={getPet(id)} scale={scale} mode={cfg.mode} ctx={ctx} talk={cfg.talk}
          spot={spots.current[id]} onSpot={onSpot} />
      ))}
    </div>
  );
}
