/**
 * Analizador WebAudio singleton para el <audio> de temas directos (Audius/Local/Radio).
 * REGLA DE ORO: jamás silenciar el audio. Solo se engancha cuando el
 * AudioContext está corriendo (espera al resume hasta 2s); si no lo logra,
 * devuelve null (visual simulado) sin tocar el elemento.
 *
 * Cadena: src -> EQ 10 bandas -> gain (boost) -> analyser -> destino.
 * setBoost() ajusta ganancia. setEQBand/setEQPreset() ajustan ecualizador.
 * YT embed no pasa por aquí (no permite nodos): ahí EQ no aplica.
 */
let ctx = null;
const bound = new WeakMap();

export const EQ_FREQS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const EQ_PRESETS = {
  Plano: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  Rock: [4, 3, 2, 0, -1, 1, 3, 4, 4, 3],
  Pop: [-1, 1, 3, 4, 4, 2, 0, -1, -1, -1],
  Bass: [6, 5, 4, 2, 1, 0, 0, 0, 0, 0],
  Vocal: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
  Dance: [4, 3, 1, 0, 0, 1, 3, 4, 3, 2],
  Jazz: [2, 2, 1, 2, 3, 3, 2, 2, 1, 2],
  Agudos: [-2, -1, 0, 1, 2, 3, 4, 5, 5, 4],
};

export function getCtx() { return ctx; }

export async function attachAnalyser(element) {
  if (!element || typeof window === 'undefined') return null;
  if (bound.has(element)) return bound.get(element);
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = ctx || new AC();
    if (ctx.state === 'suspended') {
      try {
        await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 2000))]);
      } catch { /* se valida abajo */ }
    }
    if (ctx.state !== 'running') return null;
    const src = ctx.createMediaElementSource(element);
    // EQ 10 bandas en serie (peaking; lowshelf/highshelf en extremos)
    let node = src;
    const filters = EQ_FREQS.map((f, i) => {
      const fl = ctx.createBiquadFilter();
      if (i === 0) { fl.type = 'lowshelf'; }
      else if (i === EQ_FREQS.length - 1) { fl.type = 'highshelf'; }
      else { fl.type = 'peaking'; }
      fl.frequency.value = f;
      fl.Q.value = 1.1;
      fl.gain.value = 0;
      node.connect(fl);
      node = fl;
      return fl;
    });
    const gain = ctx.createGain();
    gain.gain.value = 1;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256; // 128 bines
    analyser.smoothingTimeConstant = 0.8;
    node.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);
    try {
      element._hermesGain = gain;
      element._hermesEQ = filters;
      // Aplica preset guardado si existe
      try {
        const saved = JSON.parse(localStorage.getItem('h_eq_gains') || 'null');
        if (Array.isArray(saved) && saved.length === 10) {
          filters.forEach((fl, i) => { fl.gain.value = Math.max(-12, Math.min(12, Number(saved[i]) || 0)); });
        }
      } catch { /* plano */ }
    } catch { /* noop */ }
    bound.set(element, analyser);
    return analyser;
  } catch {
    return null;
  }
}

/** Ajusta el boost (1 = normal, hasta 2.5). Devuelve false si no hay cadena activa. */
export function setBoost(element, g) {
  try {
    const gain = element?._hermesGain;
    if (!gain || !ctx || ctx.state !== 'running') return false;
    const v = Math.min(2.5, Math.max(1, Number(g) || 1));
    gain.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
    return true;
  } catch {
    return false;
  }
}

/** Ajusta una banda EQ (-12..+12 dB). Devuelve false si no hay cadena activa. */
export function setEQBand(element, index, db) {
  try {
    const fl = element?._hermesEQ?.[index];
    if (!fl || !ctx || ctx.state !== 'running') return false;
    fl.gain.setTargetAtTime(Math.max(-12, Math.min(12, Number(db) || 0)), ctx.currentTime, 0.02);
    return true;
  } catch {
    return false;
  }
}

/** Aplica preset completo (array 10). No falla si aún no hay cadena: se guarda y attach lo aplica. */
export function setEQPreset(element, gains) {
  try {
    const arr = Array.isArray(gains) ? gains.slice(0, 10) : null;
    if (!arr) return false;
    try { localStorage.setItem('h_eq_gains', JSON.stringify(arr)); } catch {}
    const filters = element?._hermesEQ;
    if (!filters || !ctx || ctx.state !== 'running') return true; // guardado, se aplica al enganchar
    filters.forEach((fl, i) => {
      try { fl.gain.setTargetAtTime(Math.max(-12, Math.min(12, Number(arr[i]) || 0)), ctx.currentTime, 0.02); } catch {}
    });
    return true;
  } catch {
    return false;
  }
}
