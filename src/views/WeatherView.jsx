import { useState, useEffect, useRef } from 'react';
import {
  Search, AlertTriangle, Loader2, MapPin, LocateFixed,
  Thermometer, Droplets, Wind, Gauge, Sunrise, Sunset, Umbrella,
} from 'lucide-react';
import Title from '../components/Title';
import { fetchFullWeather, searchPlaces, describe, groupOf } from '../services/weather';

const HERO_BG = {
  sun: ['#38bdf8', '#fbbf24'],
  part: ['#7dd3fc', '#94a3b8'],
  cloud: ['#94a3b8', '#64748b'],
  fog: ['#a8a29e', '#78716c'],
  rain: ['#475569', '#312e81'],
  storm: ['#334155', '#1e1b4b'],
  snow: ['#bae6fd', '#cbd5e1'],
};
const heroBg = (code, isDay) => {
  if (!isDay && (groupOf(code) === 'sun' || groupOf(code) === 'part')) return 'linear-gradient(135deg, #1e1b4b, #0f172a)';
  const [a, b] = HERO_BG[groupOf(code)] || HERO_BG.part;
  return `linear-gradient(135deg, ${a}, ${b})`;
};

const hh = (iso) => new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
const dayName = (isoDate, i) => {
  if (i === 0) return 'Hoy';
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', '');
};

export default function WeatherView({ place, setPlace, unit, setUnit, toast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const deb = useRef(null);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    fetchFullWeather(place.lat, place.lon, unit, ctrl.signal)
      .then(setData)
      .catch(() => { if (!ctrl.signal.aborted) toast('No se pudo cargar el clima', AlertTriangle); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [place.lat, place.lon, unit]); // eslint-disable-line react-hooks/exhaustive-deps

  const onType = (v) => {
    setQ(v);
    clearTimeout(deb.current);
    if (v.trim().length < 3) { setResults([]); return; }
    deb.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await searchPlaces(v.trim()));
      } catch {
        toast('No se pudo buscar lugares', AlertTriangle);
      }
      setSearching(false);
    }, 400);
  };

  const pick = (r) => {
    setPlace(r);
    setQ('');
    setResults([]);
    toast(`Clima de ${r.name.split(',')[0]}`);
  };

  const locate = () => {
    if (!('geolocation' in navigator)) return toast('Sin GPS en este dispositivo', AlertTriangle);
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPlace({ name: 'Mi ubicación', lat: +pos.coords.latitude.toFixed(4), lon: +pos.coords.longitude.toFixed(4) });
        setGeoLoading(false);
      },
      () => { toast('No se pudo obtener tu ubicación', AlertTriangle); setGeoLoading(false); },
      { timeout: 10000 },
    );
  };

  const cur = data?.current;
  const CI = cur?.I;
  const wmin = data ? Math.min(...data.days.map((d) => d.min)) : 0;
  const wmax = data ? Math.max(...data.days.map((d) => d.max)) : 1;

  const stats = cur ? [
    [Thermometer, 'Sensación', `${cur.feels}${data.sym}`],
    [Droplets, 'Humedad', `${cur.humidity}%`],
    [Wind, 'Viento', `${cur.wind} ${data.wspd} ${cur.windDir}`],
    [Gauge, 'Presión', `${cur.pressure} hPa`],
    [Sunrise, 'Amanecer', data.days[0] ? hh(data.days[0].sunrise) : '—'],
    [Sunset, 'Atardecer', data.days[0] ? hh(data.days[0].sunset) : '—'],
  ] : [];

  return (
    <>
      <Title>Clima</Title>

      {/* Buscador + unidad */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input className="inp" placeholder="Buscar ciudad…" value={q} onChange={(e) => onType(e.target.value)} aria-label="Buscar ciudad" />
          {searching && <Loader2 size={15} className="animate-spin absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--m)' }} />}
          {!!results.length && (
            <div className="absolute z-20 left-0 right-0 mt-1 rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--bd)', background: 'var(--s)' }}>
              {results.map((r, i) => (
                <button key={`${r.lat}-${r.lon}-${i}`} onClick={() => pick(r)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-[var(--s2)]">
                  <MapPin size={14} className="shrink-0" style={{ color: 'var(--a)' }} />{r.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="btn btn-o !rounded-2xl shrink-0" onClick={locate} aria-label="Usar mi ubicación" title="Usar mi ubicación">
          {geoLoading ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
        </button>
        <div className="flex rounded-2xl border overflow-hidden shrink-0" style={{ borderColor: 'var(--bd)' }}>
          {[['c', '°C'], ['f', '°F']].map(([v, l]) => (
            <button key={v} onClick={() => setUnit(v)} aria-label={`Unidad ${l}`}
              className="px-3 text-sm" style={unit === v ? { background: 'var(--a)', color: '#fff' } : { color: 'var(--m)' }}>{l}</button>
          ))}
        </div>
      </div>

      {loading && !data && <div className="card"><p className="text-sm flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Cargando clima…</p></div>}

      {data && cur && (
        <>
          {/* Hero */}
          <div className="rounded-3xl p-6 text-white relative overflow-hidden" style={{ background: heroBg(cur.code, cur.isDay) }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-1.5 text-xs opacity-90"><MapPin size={13} />{place.name}</p>
                <p className="text-6xl font-light tabular-nums mt-1">{cur.temp}<span className="text-2xl">{data.sym}</span></p>
                <p className="mt-1 font-medium">{cur.t}</p>
                <p className="text-xs opacity-90">Sensación {cur.feels}{data.sym}{data.days[0]?.pop > 0 ? ` · ${data.days[0].pop}% lluvia hoy` : ''}</p>
              </div>
              {CI && <CI size={72} strokeWidth={1.2} className="shrink-0 opacity-95" />}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stats.map(([I, label, val]) => (
              <div key={label} className="card !p-3.5 !rounded-2xl">
                <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider" style={{ color: 'var(--m)' }}>
                  <I size={13} />{label}
                </p>
                <p className="text-lg font-medium tabular-nums mt-1">{val}</p>
              </div>
            ))}
          </div>

          {/* Próximas 24h */}
          <div className="card">
            <p className="text-xs tracking-widest mb-3" style={{ color: 'var(--m)' }}>PRÓXIMAS 24 HORAS</p>
            <div className="flex gap-1 overflow-x-auto pb-1">
              {data.hours.map((h, i) => {
                const HI = describe(h.code, new Date(h.time).getHours() >= 6 && new Date(h.time).getHours() < 18).I;
                return (
                  <div key={h.time} className="flex flex-col items-center gap-1 min-w-[3.25rem] py-2 px-1 rounded-xl" style={i === 0 ? { background: 'var(--s2)' } : undefined}>
                    <span className="text-[10px] tabular-nums" style={{ color: 'var(--m)' }}>{i === 0 ? 'Ahora' : hh(h.time)}</span>
                    <HI size={17} style={{ color: 'var(--a)' }} />
                    <span className="text-xs font-medium tabular-nums">{h.temp}°</span>
                    {h.pop > 0 && <span className="text-[10px] tabular-nums flex items-center gap-0.5" style={{ color: '#38bdf8' }}><Umbrella size={9} />{h.pop}%</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 7 días */}
          <div className="card">
            <p className="text-xs tracking-widest mb-1" style={{ color: 'var(--m)' }}>PRÓXIMOS 7 DÍAS</p>
            {data.days.map((d, i) => {
              const DI = describe(d.code, true).I;
              const l = ((d.min - wmin) / Math.max(1, wmax - wmin)) * 100;
              const w = Math.max(6, ((d.max - d.min) / Math.max(1, wmax - wmin)) * 100);
              return (
                <div key={d.date} className="flex items-center gap-3 py-2">
                  <span className="text-sm w-12 capitalize shrink-0">{dayName(d.date, i)}</span>
                  <span className="flex items-center gap-1 text-[11px] tabular-nums w-11 shrink-0" style={{ color: '#38bdf8' }}>
                    {d.pop > 0 ? <><Umbrella size={10} />{d.pop}%</> : ''}
                  </span>
                  <DI size={17} className="shrink-0" style={{ color: 'var(--a)' }} />
                  <span className="text-xs tabular-nums w-9 text-right shrink-0" style={{ color: 'var(--m)' }}>{d.min}°</span>
                  <span className="flex-1 h-1.5 rounded-full relative" style={{ background: 'var(--s2)' }}>
                    <span className="absolute h-full rounded-full" style={{ left: `${l}%`, width: `${w}%`, background: 'var(--a)' }} />
                  </span>
                  <span className="text-xs font-medium tabular-nums w-9 text-right shrink-0">{d.max}°</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px]" style={{ color: 'var(--m)' }}>Datos de Open-Meteo · {place.name} · se actualiza cada 10 min en el inicio.</p>
        </>
      )}
    </>
  );
}
