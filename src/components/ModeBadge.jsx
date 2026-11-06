import { Headphones, MonitorPlay } from 'lucide-react';
import { playMode } from '../lib/playMode';

/** Distintivo: 🎧 = suena en segundo plano · ▶ = solo con la pantalla encendida (YouTube). */
export default function ModeBadge({ t, compact = false }) {
  if (!t) return null;
  const bg = playMode(t) === 'bg';
  const title = bg ? 'Suena en segundo plano (pantalla apagada u otra app)' : 'YouTube: solo suena con la pantalla encendida y esta pestaña abierta';
  return (
    <span title={title} aria-label={title}
      className="inline-flex items-center gap-1 rounded-full align-middle"
      style={{ fontSize: 10, fontWeight: 700, padding: compact ? '1px 5px' : '1px 7px', lineHeight: 1.4,
        color: bg ? '#16a34a' : 'var(--m)', border: `1px solid ${bg ? 'rgba(22,163,74,.45)' : 'var(--bd)'}`, background: bg ? 'rgba(22,163,74,.1)' : 'transparent' }}>
      {bg ? <Headphones size={10} /> : <MonitorPlay size={10} />}
      {!compact && (bg ? '2º plano' : 'En pantalla')}
    </span>
  );
}
