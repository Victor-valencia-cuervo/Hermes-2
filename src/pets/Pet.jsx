import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { DIZZY, PICKED_UP, POKE, pick } from './phrases';
import { SPECIALS } from './specials';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Estado → fila de frames del manifiesto.
const KEY = { fall: 'jump', drag: 'jump', land: 'idle', rain: 'idle', toss: 'jump' };
// Fotogramas por segundo según el estado.
const FPS = { idle: 2.2, walk: 6, run: 9, love: 2.6, alert: 8 };
// Duración (ms) de las acciones puntuales.
const SPECIAL = { wave: 2600, hot: 7000, cold: 7000, rain: 7500, love: 3000, jump: 950, alert: 3500 };
const RUNNERS = new Set(['deportivo', 'gato', 'perro', 'caballo', 'dragon', 'rick', 'morty', 'loky', 'dex']);
const CANCEL = Symbol('cancel');
// Pausa global entre trucos de distintas mascotas (para que no se pisen en pantalla).
let lastGlobalSp = 0;
const SP_GAP = 9000;      // ms mínimos entre trucos automáticos de cualquier mascota
const SP_SELF_GAP = 50000; // ms mínimos entre trucos de la misma mascota

const reduced = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } };

// Suelo = borde inferior de la pantalla (encima de la barra inferior en móvil
// y de los reproductores fijos cuando están visibles).
function calcFloor() {
  let b = 6;
  const nav = document.querySelector('nav[aria-label="Principal móvil"]');
  if (nav && getComputedStyle(nav).display !== 'none') b = Math.max(b, nav.offsetHeight + 4);
  // Reproductores fijos abajo (música / radio): las mascotas caminan por encima.
  try {
    for (const sel of ['[data-playerbar]', '[data-radiobar]']) {
      const el = document.querySelector(sel);
      if (el && getComputedStyle(el).display !== 'none' && el.offsetHeight > 0) {
        b = Math.max(b, el.offsetHeight + 8);
      }
    }
  } catch { /* noop */ }
  return window.innerHeight - b;
}

// Factor de escala por ancho: en PC las distancias/velocidades de móvil
// se ven como si estuvieran quietas, así que se amplían.
function wideK() {
  try {
    return Math.min(2.4, Math.max(1, window.innerWidth / 480));
  } catch {
    return 1;
  }
}

const Pet = forwardRef(function Pet({ def, scale, mode, ctx, spot, onSpot, talk }, ref) {
  const rootRef = useRef(null);
  const flipRef = useRef(null);
  const animRef = useRef(null);
  const spriteRef = useRef(null);
  const bubbleRef = useRef(null);
  const shadowRef = useRef(null);
  const [bubble, setBubble] = useState(null);
  const [rain, setRain] = useState(false);
  // Diagnóstico: ?petdebug=1 muestra estado/posición/velocidad sobre la mascota.
  const [dbg, setDbg] = useState(null);
  const bubbleTimer = useRef(0);
  const rainTimer = useRef(0);
  const bubbleId = useRef(0);

  const W = Math.round(def.disp[0] * scale);
  const H = Math.round(def.disp[1] * scale);
  const bw = Math.round(def.body[0] * scale);
  const bh = Math.round(def.body[1] * scale);
  const P = useRef({});
  // `hover`: mascotas de GIF que solo flotan y hablan (siempre en modo flotante).
  P.current = { def, scale, mode: def.hover ? 'float' : mode, talk, W, H, bw, bh };

  const S = useRef({
    x: 0, y: -999, vx: 0, vy: 0, dir: 1, state: 'fall', t0: 0, until: 0, frames: [0], fps: 1, fi: 0, ft: 0,
    tx: 0, ty: null, speed: 30, fallTo: 0, shown: -1, flip: 1, modeSeen: null, drag: null, taps: [],
    wildLoop: 0, wildF: null, wildUntil: 0, lastWild: -1, trick: 0, trickSet: -1, trickT: 0,
    lastWalk: 0, lastDir: 1,
    spTok: 0, spEls: [], spAnims: [], mv: null, hop: null, yoff: 0, lastSp: 0,
  });

  /* ───────────── acciones (solo usan refs: son seguras entre renders) ───────────── */
  const E = useRef({});
  E.current = {
    setState(name, dur = 0) {
      const s = S.current; const { def: d, mode: m } = P.current;
      const now = performance.now();
      // Salir de un truco (agarrón, sacudida, sueño…) lo cancela y limpia todo lo que dibujó.
      if (s.state === 'special' && name !== 'special') E.current.endSpecial();
      s.state = name; s.t0 = now; s.until = dur ? now + dur : 0;
      // Agarre / caída personalizados por mascota (Rick: shock) sin tocar a las demás.
      if ((name === 'drag' || name === 'fall') && Number.isInteger(d.grabFrame)) {
        s.frames = [d.grabFrame]; s.fps = 1; s.fi = 0; s.ft = now;
      } else {
        const key = KEY[name] || name;
        const base = d.frames[key] || d.frames.idle;
        const ex = d.extra?.[key];
        // Mascotas propias: una imagen al azar de las de esa acción. De fábrica con extras: a veces una extra.
        s.frames = d.pickRandom ? [pick(base)] : (ex?.length && Math.random() < 0.45 ? [pick(ex)] : base);
        s.fps = d.fps || FPS[name] || FPS[key] || 1;
        s.fi = 0; s.ft = now;
      }
      if (name === 'idle') { s.wildLoop = 0; s.wildF = null; }
      const floaty = m === 'float' && (name === 'idle' || name === 'walk' || name === 'run' || name === 'land') ? ' pet-a-floaty' : '';
      if (animRef.current) animRef.current.className = `pet-a pet-a-${name}${floaty}`;
    },
    bounds() {
      const { W: w, H: h } = P.current;
      const vw = window.innerWidth;
      const mx = Math.max(w * 0.3, 24);
      return { mx, minX: mx, maxX: Math.max(mx + 1, vw - mx), minY: h + 12, maxY: calcFloor() - 8 };
    },
    startWalk(run) {
      const s = S.current; const { mode: m, scale: sc } = P.current;
      const b = E.current.bounds();
      const k = wideK();
      const dist = run ? rand(220, 520) * k : rand(90, 320) * k;
      // Alterna el lado: 70% va al contrario del último paseo (se nota el ir y venir).
      const side = Math.random() < 0.7 ? -s.lastDir : s.lastDir;
      let tx = s.x + dist * side;
      if (tx < b.minX || tx > b.maxX) tx = s.x - (tx - s.x);
      // Si aun así queda casi en el sitio (pantalla ancha), fuerza el otro lado.
      if (Math.abs(tx - s.x) < 60 * k) tx = clamp(s.x + (s.x < (b.minX + b.maxX) / 2 ? dist : -dist), b.minX, b.maxX);
      s.tx = clamp(tx, b.minX, b.maxX);
      s.lastDir = s.tx >= s.x ? 1 : -1;
      s.lastWalk = performance.now();
      s.ty = m === 'float' ? rand(b.minY, Math.max(b.minY + 1, b.maxY)) : null;
      s.speed = (run ? rand(120, 170) : rand(46, 78)) * k * Math.max(0.85, sc);
      E.current.setState(run ? 'run' : 'walk');
    },
    choose() {
      const c = ctx.current; const { def: d } = P.current;
      if (c.sleeping) { E.current.setState('sleep'); return; }
      const r = Math.random();
      const k = wideK();
      if (c.playing && r < 0.72) { E.current.setState('music', rand(5000, 9000)); return; }
      // Movimiento reducido: igual camina (la traslación no es animación CSS),
      // solo que sin saltito y con pausas un poco más largas.
      if (reduced()) {
        if (Math.random() < 0.65) { E.current.startWalk(RUNNERS.has(d.id) && Math.random() < 0.2); return; }
        E.current.setState('idle', rand(2000, 4000));
        return;
      }
      // Truco especial de la mascota: raro, solo despierta y con pausas entre mascotas.
      if (d.sp && r < d.sp.chance && E.current.canSpecial()) { E.current.startSpecial(); return; }
      // En PC caminan más seguido y descansan menos para que no parezcan quietas.
      const walkP = k > 1.4 ? 0.74 : 0.58;
      const runP = walkP + (RUNNERS.has(d.id) ? (k > 1.4 ? 0.14 : 0.10) : 0);
      if (r < walkP) { E.current.startWalk(false); return; }
      if (r < runP) { E.current.startWalk(true); return; }
      if (r < runP + 0.10 && !c.playing) { E.current.setState('love', 2600); return; }
      E.current.setState('idle', k > 1.4 ? rand(1400, 3200) : rand(2500, 6000));
    },
    canSpecial() {
      const s = S.current; const now = performance.now();
      return !!P.current.def.sp && SPECIALS[P.current.def.sp.id] && !ctx.current.sleeping
        && now - lastGlobalSp > SP_GAP && now - s.lastSp > SP_SELF_GAP;
    },
    // Quita lo que dibujó el truco y devuelve el sprite a la normalidad.
    endSpecial() {
      const s = S.current;
      s.spTok++;
      s.spEls.forEach((el) => { try { el.remove(); } catch { /* noop */ } });
      s.spEls = [];
      s.spAnims.forEach((an) => { try { an.cancel(); } catch { /* noop */ } });
      s.spAnims = [];
      if (s.mv?.res) s.mv.res(); s.mv = null;
      if (s.hop?.res) s.hop.res(); s.hop = null; s.yoff = 0;
      if (flipRef.current) { flipRef.current.style.transition = ''; flipRef.current.style.opacity = ''; flipRef.current.style.transformOrigin = ''; }
    },
    startSpecial(id) {
      const s = S.current; const d = P.current.def;
      const key = id || d.sp?.id; const fn = SPECIALS[key];
      if (!fn || ['drag', 'toss', 'fall', 'sleep', 'special'].includes(s.state)) return false;
      E.current.setState('special');
      const now = performance.now(); s.lastSp = now; lastGlobalSp = now;
      const tok = ++s.spTok;
      const alive = () => s.spTok === tok && s.state === 'special';
      const chk = () => { if (!alive()) throw CANCEL; };
      const layer = rootRef.current.parentElement;
      const track = (el, parent) => { parent.appendChild(el); s.spEls.push(el); return el; };
      const std = (k) => (d.frames[k] || d.frames.idle)[0];
      const F = Object.fromEntries(['idle', 'walk', 'music', 'love', 'hot', 'cold', 'wave', 'jump', 'alert', 'sleep'].map((k) => [k, std(k)]));
      const a = {
        def: d, f: d.sp?.sf || {}, F, mode: P.current.mode, W: P.current.W, H: P.current.H,
        get x() { return s.x; }, get y() { return s.y; }, get dir() { return s.dir; },
        get vw() { return window.innerWidth; }, get vh() { return window.innerHeight; }, get floorY() { return calcFloor(); },
        R: rand, pick, alive, bounds: () => E.current.bounds(),
        face: (dr) => { s.dir = dr >= 0 ? 1 : -1; },
        frame: (list, fps = 1) => {
          s.frames = Array.isArray(list) ? list : [list]; s.fps = fps; s.fi = 0; s.ft = performance.now();
        },
        say: (t, ms) => { if (alive()) E.current.say(t, ms); },
        wait: (ms) => new Promise((res, rej) => setTimeout(() => (alive() ? res() : rej(CANCEL)), ms)),
        moveTo: (tx, speed) => new Promise((res, rej) => {
          chk(); const b = E.current.bounds();
          s.mv = { tx: clamp(tx, b.minX, b.maxX), speed, res: () => (alive() ? res() : rej(CANCEL)) };
        }),
        hop: (h, ms) => new Promise((res, rej) => { chk(); s.hop = { h, ms, t0: performance.now(), res: () => (alive() ? res() : rej(CANCEL)) }; }),
        fade: (v, ms = 200) => { if (!flipRef.current) return; flipRef.current.style.transition = `opacity ${ms}ms`; flipRef.current.style.opacity = String(v); },
        teleport: (x, y) => { const b = E.current.bounds(); s.x = clamp(x, b.minX, b.maxX); if (y != null) s.y = P.current.mode === 'walk' ? calcFloor() : clamp(y, b.minY, Math.max(b.minY, b.maxY)); },
        layer: (el) => track(el, layer),
        screen: (el, x, y) => { el.style.left = `${x}px`; el.style.top = `${y}px`; return track(el, layer); },
        local: (el, l, t, raw) => { if (!raw) { el.style.left = `${P.current.W / 2 + l}px`; el.style.top = `${P.current.H + t}px`; } return track(el, rootRef.current); },
        anim: (el, kf, opts) => {
          chk();
          const an = el.animate(kf, opts); s.spAnims.push(an);
          return an.finished.then(() => chk(), (e) => { if (e?.name === 'AbortError') throw CANCEL; throw e; });
        },
        shakeSprite: (ms, amp = 2) => {
          if (!flipRef.current) return;
          const an = flipRef.current.animate([{ transform: `translateX(${-amp}px) scaleX(${s.flip})` }, { transform: `translateX(${amp}px) scaleX(${s.flip})` }], { duration: 70, iterations: Math.max(2, Math.round(ms / 70)), direction: 'alternate' });
          s.spAnims.push(an);
        },
        // Agranda (k>1) o encoge el sprite desde los pies; se limpia solo al terminar el truco.
        grow: (k, ms = 600, from = 1) => {
          if (!flipRef.current) return Promise.resolve();
          chk();
          const el = flipRef.current; el.style.transformOrigin = '50% 100%';
          const an = el.animate([{ transform: `scaleX(${s.flip}) scale(${from})` }, { transform: `scaleX(${s.flip}) scale(${k})` }], { duration: ms, easing: 'cubic-bezier(.2,1.25,.4,1)', fill: 'forwards' });
          s.spAnims.push(an);
          return an.finished.then(() => chk(), (e) => { if (e?.name === 'AbortError') throw CANCEL; throw e; });
        },
        spriteEl: () => spriteRef.current,
        // Copia del sprite (con su cuadro actual) lista para animar como "clon" o ilusión.
        cloneSprite: () => {
          const w = document.createElement('div'); const c = spriteRef.current.cloneNode(false);
          c.style.transform = `scaleX(${s.dir < 0 ? -1 : 1})`; w.appendChild(c); return w;
        },
      };
      Promise.resolve().then(() => fn(a))
        .catch((e) => { if (e !== CANCEL) console.warn('[pet special]', key, e); })
        .finally(() => {
          if (!alive()) return;
          E.current.endSpecial();
          E.current.save();
          E.current.choose();
        });
      return true;
    },
    act(type, ms) {
      const s = S.current;
      if (s.state === 'drag' || s.state === 'fall' || s.state === 'toss') return;
      if (ctx.current.sleeping && type !== 'alert') return;
      const dur = ms || SPECIAL[type] || 2500;
      if (type === 'rain') {
        setRain(true);
        clearTimeout(rainTimer.current);
        rainTimer.current = setTimeout(() => setRain(false), dur);
      }
      E.current.setState(type, dur);
    },
    say(text, ms) {
      if (!P.current.talk || !text) return;
      setBubble({ text, id: ++bubbleId.current });
      clearTimeout(bubbleTimer.current);
      bubbleTimer.current = setTimeout(() => setBubble(null), ms || Math.min(9000, 3200 + text.length * 55));
    },
    // Sacudida: la mascota sale volando con fuerza `power` (0…1) y la
    // física del bucle (`toss`) se encarga de la caída y los rebotes.
    toss(power = 0.7) {
      const s = S.current;
      if (s.state === 'drag' || s.state === 'toss') return;
      if (reduced()) { E.current.act('alert', 900); return; }
      s.until = 0;
      const k = 0.6 + Math.min(1, Math.max(0, power));
      const dir = Math.random() < 0.5 ? -1 : 1;
      s.vx = dir * rand(140, 320) * k;
      s.vy = -rand(480, 850) * k;
      s.dir = dir;
      E.current.setState('toss');
    },
    save() {
      const s = S.current;
      onSpot?.(P.current.def.id, { fx: s.x / window.innerWidth, fy: s.y / window.innerHeight });
    },
  };

  useImperativeHandle(ref, () => ({
    say: (t, ms) => E.current.say(t, ms),
    act: (t, ms) => E.current.act(t, ms),
    toss: (p) => E.current.toss(p),
    isSleeping: () => S.current.state === 'sleep',
    special: () => E.current.startSpecial(),
  }), []);

  // Si cambia el tamaño, forzar a repintar el frame con las medidas nuevas.
  useLayoutEffect(() => { S.current.shown = -1; }, [W, H]);

  // Precarga de la tira de frames (v=4 rompe la caché de las tiras viejas).
  useEffect(() => { const im = new Image(); im.src = def.url || `pets/${def.id}.webp?v=4`; }, [def.id, def.url]);

  useEffect(() => {
    let q = null;
    try { q = new URLSearchParams(window.location.search).get('petdebug'); } catch { q = null; }
    if (!q) return undefined;
    const i = setInterval(() => {
      const s = S.current;
      setDbg(`${s.state} x=${Math.round(s.x)} v=${Math.round(s.speed)} f=[${s.frames.join(',')}]`);
    }, 500);
    return () => clearInterval(i);
  }, []);

  // Frases propias de la mascota (series, etc.) de vez en cuando, aparte de las del director.
  useEffect(() => {
    const q = def.quotes; if (!q?.list?.length) return undefined;
    let t; let last = '';
    const next = () => { t = setTimeout(run, rand(q.every[0], q.every[1])); };
    const run = () => {
      const st = S.current.state;
      if (!document.hidden && P.current.talk && !ctx.current.sleeping && st !== 'sleep' && st !== 'drag') {
        const opts = q.list.filter((x) => x !== last); last = pick(opts); E.current.say(last, 3400);
      }
      next();
    };
    next();
    return () => clearTimeout(t);
  }, [def]);

  /* ───────────── bucle de animación ───────────── */
  useEffect(() => {
    const s = S.current;
    const root = rootRef.current;
    const e = () => E.current;
    const b0 = e().bounds();
    const vw0 = window.innerWidth;
    s.x = clamp(spot?.fx != null ? spot.fx * vw0 : rand(vw0 * 0.15, vw0 * 0.85), b0.minX, b0.maxX);
    s.y = -P.current.H - 30;
    s.fallTo = P.current.mode === 'float'
      ? clamp(spot?.fy != null ? spot.fy * window.innerHeight : rand(b0.minY, b0.maxY), b0.minY, b0.maxY)
      : calcFloor();
    s.modeSeen = P.current.mode;
    e().setState('fall');
    root.style.transform = `translate3d(${s.x - P.current.W / 2}px, ${s.y - P.current.H}px, 0)`;

    let raf = 0; let last = performance.now(); let floor = calcFloor(); let floorT = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const { W: w, H: h, mode } = P.current;
      const c = ctx.current;
      if (now - floorT > 600) { floor = calcFloor(); floorT = now; }
      const b = e().bounds();

      // Cambio de modo en caliente.
      if (s.modeSeen !== mode) {
        s.modeSeen = mode;
        if (s.state !== 'drag') {
          if (mode === 'walk') { s.vy = 0; e().setState('fall'); }
          else { s.fallTo = clamp(s.y, b.minY, b.maxY); e().choose(); }
        }
      }

      // Acción puntual terminada → siguiente cosa.
      if (s.until && now >= s.until && s.state !== 'drag') { s.until = 0; e().choose(); }

      // Vigilante anti-quietud: si lleva >12s despierto sin caminar, fuerza
      // un paseo. Paridad móvil/PC por construcción.
      if (mode === 'walk' && !c.sleeping
        && !['walk', 'run', 'drag', 'fall', 'land', 'toss', 'sleep', 'special'].includes(s.state)
        && now - (s.lastWalk || s.t0 || now) > 12000) {
        e().startWalk(false);
      }

      // Se duerme / despierta según la app (en pleno vuelo no se interrumpe).
      if (c.sleeping && !['sleep', 'drag', 'fall', 'land', 'alert', 'toss'].includes(s.state)) e().setState('sleep');

      switch (s.state) {
        case 'sleep':
          if (!c.sleeping) e().setState('alert', 700);
          break;
        case 'walk':
        case 'run': {
          const dx = s.tx - s.x; const step = s.speed * dt;
          if (mode === 'float' && s.ty != null) {
            const dy = s.ty - s.y; const dist = Math.hypot(dx, dy);
            if (dist <= step) { s.x = s.tx; s.y = s.ty; e().setState('idle', rand(1500, 4500)); break; }
            s.x += (dx / dist) * step; s.y += (dy / dist) * step;
          } else {
            if (Math.abs(dx) <= step) { s.x = s.tx; e().setState('idle', rand(1500, 4000)); break; }
            s.x += Math.sign(dx) * step;
          }
          if (Math.abs(dx) > 2) s.dir = dx >= 0 ? 1 : -1;
          break;
        }
        case 'fall': {
          const stop = mode === 'walk' ? floor : s.fallTo;
          s.vy += 1900 * dt; s.y += s.vy * dt;
          if (s.y >= stop) { s.y = stop; s.vy = 0; e().setState('land', 300); }
          break;
        }
        case 'toss': {
          // Vuelo por sacudida: gravedad + rebotes con pérdida de energía.
          s.vy += 2300 * dt;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          const ground = mode === 'walk' ? floor : b.maxY;
          const ceil = mode === 'walk' ? h + 12 : b.minY;
          if (s.y >= ground) {
            s.y = ground;
            if (Math.abs(s.vy) > 160) { s.vy = -s.vy * 0.55; s.vx *= 0.7; }
            else {
              s.vy = 0; s.vx *= Math.pow(0.15, dt);
              if (Math.abs(s.vx) < 24) {
                if (mode === 'walk') e().setState('land', 300);
                else { s.fallTo = clamp(s.y, b.minY, b.maxY); e().setState('idle', rand(1500, 3500)); }
              }
            }
          }
          if (s.y <= ceil) { s.y = ceil; s.vy = Math.abs(s.vy) * 0.5; }
          if (s.x < b.minX) { s.x = b.minX; s.vx = Math.abs(s.vx) * 0.6; s.dir = 1; }
          else if (s.x > b.maxX) { s.x = b.maxX; s.vx = -Math.abs(s.vx) * 0.6; s.dir = -1; }
          else if (Math.abs(s.vx) > 4) s.dir = s.vx >= 0 ? 1 : -1;
          break;
        }
        case 'special': {
          // Los trucos mueven a la mascota con moveTo / hop / teleport (ver specials.js).
          if (s.mv) {
            const dx = s.mv.tx - s.x; const step = s.mv.speed * dt;
            if (Math.abs(dx) <= step) { s.x = s.mv.tx; const r = s.mv.res; s.mv = null; r?.(); }
            else { s.x += Math.sign(dx) * step; s.dir = dx >= 0 ? 1 : -1; }
          }
          break;
        }
        default: break;
      }

      // En modo suelo, si quedó en el aire (resize, cambio de modo) vuelve a caer.
      if (mode === 'walk' && s.state !== 'drag' && s.state !== 'fall' && s.state !== 'toss' && s.y < floor - 1.5) { s.vy = 0; e().setState('fall'); }
      if (s.state !== 'drag' && s.state !== 'fall') {
        s.x = clamp(s.x, b.minX, b.maxX);
        s.y = mode === 'walk' ? floor : clamp(s.y, b.minY, Math.max(b.minY, b.maxY));
      }

      // Salto de truco (parábola): sube y baja `h` px en `ms`.
      if (s.hop) {
        const t = (now - s.hop.t0) / s.hop.ms;
        if (t >= 1) { s.yoff = 0; const r = s.hop.res; s.hop = null; r?.(); } else s.yoff = 4 * s.hop.h * t * (1 - t);
      }

      // Frame actual (con comodines de reposo: gestos raros, nunca seguidos).
      const wild = P.current.def.idleWild;
      if (s.state === 'idle' && wild) {
        if (s.wildF != null && now >= s.wildUntil) s.wildF = null;
        if (s.frames.length > 1) {
          const raw = ((now - s.ft) / 1000) * s.fps;
          const loop = Math.floor(raw / s.frames.length);
          if (loop > s.wildLoop) {
            s.wildLoop = loop;
            const pool = wild.pool.filter((f) => f !== s.lastWild);
            if (pool.length && Math.random() < (wild.chance ?? 0.15)) {
              const wf = pool[(Math.random() * pool.length) | 0];
              s.lastWild = wf; s.wildF = wf; s.wildUntil = now + 1400;
            }
          }
        }
      } else if (s.wildF != null) s.wildF = null;
      if (s.frames.length > 1) s.fi = Math.floor(((now - s.ft) / 1000) * s.fps) % s.frames.length;
      const idx = s.wildF ?? s.frames[s.fi] ?? s.frames[0];
      if (idx !== s.shown) { spriteRef.current.style.backgroundPosition = `${-idx * w}px 0`; s.shown = idx; }
      const flip = s.dir < 0 ? -1 : 1;
      if (flip !== s.flip) { flipRef.current.style.transform = `scaleX(${flip})`; s.flip = flip; }
      root.style.transform = `translate3d(${s.x - w / 2}px, ${s.y - h - s.yoff}px, 0)`;
      if (shadowRef.current) shadowRef.current.style.opacity = s.y >= floor - 2 && s.state !== 'drag' ? '1' : '0';

      // Globo: se mantiene dentro de la pantalla y se pasa abajo si no cabe arriba.
      const bub = bubbleRef.current;
      if (bub) {
        const bwid = bub.offsetWidth; const vw = window.innerWidth;
        const left = s.x - bwid / 2;
        const dx = left < 8 ? 8 - left : left + bwid > vw - 8 ? vw - 8 - (left + bwid) : 0;
        bub.style.setProperty('--dx', `${dx}px`);
        bub.classList.toggle('below', s.y - h < bub.offsetHeight + 14);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); clearTimeout(bubbleTimer.current); clearTimeout(rainTimer.current); E.current.endSpecial?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ───────────── arrastrar / tocar ───────────── */
  const onDown = (ev) => {
    ev.preventDefault();
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    const s = S.current;
    s.drag = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, ox: s.x - ev.clientX, oy: s.y - ev.clientY, moved: false, t: performance.now() };
  };
  const onMove = (ev) => {
    const s = S.current; const d = s.drag;
    if (!d || d.id !== ev.pointerId) return;
    if (!d.moved) {
      if (Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) < 6) return;
      d.moved = true; s.until = 0; E.current.setState('drag');
      if (Math.random() < 0.3) E.current.say(pick(PICKED_UP), 1800);
    }
    const b = E.current.bounds();
    s.x = clamp(ev.clientX + d.ox, 8, window.innerWidth - 8);
    s.y = clamp(ev.clientY + d.oy, b.minY - 8, window.innerHeight);
  };
  const onUp = (ev) => {
    const s = S.current; const d = s.drag;
    if (!d || d.id !== ev.pointerId) return;
    s.drag = null;
    try { ev.currentTarget.releasePointerCapture?.(ev.pointerId); } catch { /* noop */ }
    if (d.moved) {
      const b = E.current.bounds();
      if (P.current.mode === 'walk') { s.vy = 0; E.current.setState('fall'); }
      else { s.fallTo = clamp(s.y, b.minY, b.maxY); E.current.setState('idle', 1500); }
      E.current.save();
      return;
    }
    // Toque simple: cariño. Muchos toques seguidos: se marea.
    const now = performance.now();
    s.taps = s.taps.filter((t) => now - t < 2500).concat(now);
    if (ctx.current.sleeping) { E.current.act('alert', 900); E.current.say('Zzz… ¿eh? ¡Ya voy!', 2500); return; }
    if (s.taps.length >= 5) { s.taps = []; E.current.act('alert', 2200); E.current.say(pick(DIZZY), 2600); return; }
    if (P.current.def.sp && Math.random() < 0.14 && E.current.startSpecial()) return;
    E.current.act(Math.random() < 0.6 ? 'love' : 'jump');
    E.current.say(Math.random() < 0.35 ? pick(P.current.def.voice) : pick(POKE), 2800);
  };

  return (
    <div ref={rootRef} className="pet-root" style={{ width: W, height: H }}>
      {mode === 'walk' && <div ref={shadowRef} className="pet-shadow" style={{ width: Math.max(24, bw * 0.85) }} />}
      <div ref={flipRef} className="pet-flip" style={{ overflow: 'hidden' }}>
        <div ref={animRef} className="pet-a pet-a-fall">
          <div ref={spriteRef} className="pet-sprite"
            style={{ width: W, height: H, backgroundImage: `url(${def.url || `pets/${def.id}.webp?v=4`})`, backgroundSize: `${def.n * W}px ${H}px`, clipPath: 'inset(0 1px 0 1px)' }} />
        </div>
      </div>
      {rain && (
        <div className="pet-rain" style={{ bottom: bh + 4 }} aria-hidden="true">
          <span className="pet-cloud" />
          {[0, 1, 2, 3].map((i) => <i key={i} style={{ left: 8 + i * 9, animationDelay: `${i * 0.18}s` }} />)}
        </div>
      )}
      {bubble && <div ref={bubbleRef} key={bubble.id} className="pet-bubble" role="status">{bubble.text}</div>}
      {dbg != null && <div className="pet-debug" aria-hidden="true">{def.id}: {dbg}</div>}
      <div className="pet-hit" style={{ width: bw + 14, height: bh + 12 }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        title={def.name} />
    </div>
  );
});

export default Pet;
