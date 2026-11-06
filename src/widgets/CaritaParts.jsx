/** Globo de diálogo y fila del clima: los comparten la carita del día y la mascota de puntos. */
export function Bubble({ children }) {
  return (
    <div className="relative w-full rounded-2xl px-5 py-4 text-center" style={{ background: 'var(--s2)' }} aria-live="polite">
      <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45" style={{ background: 'var(--s2)' }} aria-hidden="true" />
      <p className="serif text-[1.35rem] sm:text-2xl leading-snug text-balance">{children}</p>
    </div>
  );
}

export function WeatherRow({ weather, onClick }) {
  if (!weather) return null;
  const WI = weather.I;
  return (
    <button onClick={onClick} className="w-full flex items-center justify-center gap-3 pt-3 hover:opacity-80 transition" style={{ borderTop: '1px solid var(--bd)' }} aria-label="Ver detalles del clima">
      <WI size={26} style={{ color: 'var(--a)' }} />
      <span className="text-left leading-tight">
        <span className="block text-xl font-semibold tabular-nums">{weather.temp}{weather.sym || '°C'} <span className="text-sm font-normal" style={{ color: 'var(--m)' }}>{weather.t}</span></span>
        <span className="block text-xs" style={{ color: 'var(--m)' }}>máx {weather.max}° · mín {weather.min}°{weather.pop >= 30 ? ` · ☂ ${weather.pop}%` : ''}</span>
      </span>
    </button>
  );
}
