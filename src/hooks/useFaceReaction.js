import { useCallback, useEffect, useRef, useState } from 'react';
import { FACE_FILES, POKE_FACES, POKE_MS, POKE_SAYS, REMINDER_FLASH_MS } from '../data/faces';
import { reactTo } from '../lib/faceMood';

const pickRandom = (list, exclude) => {
  const pool = list.filter((f) => f !== exclude);
  return pool[Math.floor(Math.random() * pool.length)] ?? list[0];
};
const pickSay = (list) => list[Math.floor(Math.random() * list.length)];

// Cerebro único de la carita. Prioridad:
// recordatorio disparado (10 s) > click (6 s) > dormido > música > pendientes > clima.
export default function useFaceReaction({ weather, hour, playing, track, idle, seed, name, pendingCount }) {
  const [poke, setPoke] = useState(null);       // { face, say, until }
  const [flash, setFlash] = useState(null);     // { text, until }
  const timers = useRef([]);

  const later = useCallback((ms, fn) => {
    const id = setTimeout(fn, ms);
    timers.current.push(id);
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Evento global disparado por useReminders / useNotes al vencer un aviso.
  useEffect(() => {
    const onReminder = (e) => {
      const text = e?.detail?.text || 'Recordatorio';
      setFlash({ text, until: Date.now() + REMINDER_FLASH_MS });
      later(REMINDER_FLASH_MS, () => setFlash((f) => (f && Date.now() >= f.until - 50 ? null : f)));
    };
    window.addEventListener('hermes:reminder', onReminder);
    return () => window.removeEventListener('hermes:reminder', onReminder);
  }, [later]);

  // Click en la carita → cara aleatoria temporal.
  const doPoke = useCallback((currentFace) => {
    const face = pickRandom(POKE_FACES.length ? POKE_FACES : Object.keys(FACE_FILES), currentFace);
    setPoke({ face, say: pickSay(POKE_SAYS), until: Date.now() + POKE_MS });
    later(POKE_MS, () => setPoke((p) => (p && Date.now() >= p.until - 50 ? null : p)));
  }, [later]);

  const auto = reactTo({ weather, hour, playing, track, idle, seed, name });

  // 1) Flash de recordatorio: sorpresa con el texto del aviso.
  if (flash && Date.now() < flash.until) {
    return {
      react: { face: 'sorpresa', kind: 'alert', say: `¡Ey! ${flash.text}` },
      poke: () => doPoke('sorpresa'),
    };
  }
  // 2) Click temporal.
  if (poke && Date.now() < poke.until) {
    return { react: { face: poke.face, kind: 'poke', say: poke.say }, poke: () => doPoke(poke.face) };
  }
  // 3) Pendientes sin vencer → travieso (solo si lo automático no es dormido/música).
  if (pendingCount > 0 && auto.kind !== 'sleep' && auto.kind !== 'music') {
    return {
      react: {
        face: 'travieso',
        kind: auto.kind,
        say: `${auto.say} Tienes ${pendingCount} pendiente${pendingCount > 1 ? 's' : ''} por ahí.`,
      },
      poke: () => doPoke('travieso'),
    };
  }
  return { react: auto, poke: () => doPoke(auto.face) };
}
