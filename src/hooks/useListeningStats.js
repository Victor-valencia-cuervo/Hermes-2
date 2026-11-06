import { useEffect, useRef } from 'react';
import useStore from './useStore';

// Minutos estimados por tema para sembrar historial viejo (una sola vez).
const SEED_MIN_PER_TRACK = 3.5;

/**
 * Horas de musica: semilla desde el historial + conteo en vivo.
 * - Solo suma mientras `playing` es true (intervalo de 5s, barato).
 * - useStore ya vacia al ocultar/cerrar, no se pierde nada.
 * @returns ms totales acumulados
 */
export default function useListeningStats(playing, history) {
  const [ms, setMs] = useStore('h_listen_ms', 0);
  const [seeded, setSeeded] = useStore('h_listen_seeded', false);

  // Semilla unica con lo ya escuchado antes de existir el contador.
  useEffect(() => {
    if (seeded || !Array.isArray(history)) return;
    setSeeded(true);
    if (history.length) {
      setMs((m) => (m || 0) + Math.round(history.length * SEED_MIN_PER_TRACK * 60 * 1000));
    }
  }, [seeded, history, setSeeded, setMs]);

  useEffect(() => {
    if (!playing) return undefined;
    const i = setInterval(() => setMs((m) => (m || 0) + 5000), 5000);
    return () => clearInterval(i);
  }, [playing, setMs]);

  return ms || 0;
}

/** Top N mas escuchados contando repeticiones del historial. */
export function topTracks(history, n = 3) {
  const count = new Map();
  for (const h of Array.isArray(history) ? history : []) {
    if (!h?.id) continue;
    const e = count.get(h.id) || { track: h, plays: 0 };
    e.plays += 1;
    count.set(h.id, e);
  }
  return [...count.values()].sort((a, b) => b.plays - a.plays).slice(0, n);
}

/** "12.4 h" / "3 h" para mostrar. */
export function fmtHours(ms) {
  const h = (ms || 0) / 3600000;
  if (h < 0.1) return '0 h';
  return h >= 20 ? `${Math.round(h)} h` : `${(Math.round(h * 10) / 10).toString().replace('.', ',')} h`;
}
