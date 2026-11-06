import {
  Sun, Moon, CloudSun, CloudMoon, Cloud, Cloudy,
  CloudFog, CloudDrizzle, CloudRain, CloudHail,
  CloudLightning, Snowflake,
} from 'lucide-react';

// Santa Bárbara, Antioquia (respaldo si no hay GPS)
export const DEFAULT_PLACE = { name: 'Santa Bárbara, Antioquia', lat: 5.8747, lon: -75.5667 };

/** Mapeo completo WMO weather_code → español + icono (variante día/noche). */
export function describe(code, isDay = true) {
  const D = isDay;
  if (code === 0) return { t: 'Despejado', I: D ? Sun : Moon, mood: 'happy', say: 'Día lindo, aprovéchalo.' };
  if (code === 1) return { t: 'Casi despejado', I: D ? CloudSun : CloudMoon, mood: 'happy', say: 'Casi despejado, buen momento.' };
  if (code === 2) return { t: 'Parcialmente nublado', I: D ? CloudSun : CloudMoon, mood: 'happy', say: 'Nubecitas, pero todo bien.' };
  if (code === 3) return { t: 'Nublado', I: Cloudy, mood: 'sleepy', say: 'Cielo tapado, tranqui.' };
  if (code === 45 || code === 48) return { t: 'Neblina', I: CloudFog, mood: 'sleepy', say: 'Hay neblina, ve con cuidado.' };
  if (code >= 51 && code <= 57) return { t: 'Llovizna', I: CloudDrizzle, mood: 'rain', say: 'Llovizna suave, lleva algo.' };
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return { t: 'Lluvia', I: CloudRain, mood: 'rain', say: 'Lleva paraguas, va a llover.' };
  if (code === 66 || code === 67) return { t: 'Lluvia engelante', I: CloudHail, mood: 'rain', say: 'Lluvia engelante, mejor adentro.' };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { t: 'Nieve', I: Snowflake, mood: 'sleepy', say: 'Está nevando, abrígate.' };
  if (code >= 95) return { t: 'Tormenta', I: CloudLightning, mood: 'rain', say: 'Tormenta cerca. Mejor adentro.' };
  return { t: 'Variable', I: Cloud, mood: 'happy', say: 'El clima anda indeciso.' };
}

/** Grupo de condición para el gradiente del hero. */
export function groupOf(code) {
  if (code === 0 || code === 1) return 'sun';
  if (code === 2) return 'part';
  if (code === 3) return 'cloud';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 67) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 80 && code <= 82) || code >= 95) return 'storm';
  return 'part';
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
export const compass = (deg) => COMPASS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];

async function getJson(url, signal, ms = 12000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  const onAbort = () => c.abort();
  signal?.addEventListener('abort', onAbort, { once: true });
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  } finally {
    clearTimeout(t);
    signal?.removeEventListener('abort', onAbort);
  }
}

/** Resumen actual (forma compatible con el Home). */
export async function fetchWeather(lat, lon, unit = 'c', signal) {
  const u = UNITS[unit] || UNITS.c;
  const d = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,is_day,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max&forecast_days=1&temperature_unit=${u.temp}&timezone=auto`,
    signal,
  );
  const cur = d.current;
  const isDay = cur.is_day === 1;
  const desc = describe(cur.weather_code, isDay);
  const max = Math.round(d.daily?.temperature_2m_max?.[0] ?? cur.temperature_2m);
  const min = Math.round(d.daily?.temperature_2m_min?.[0] ?? cur.temperature_2m);
  const pop = d.daily?.precipitation_probability_max?.[0] ?? 0;
  const uv = Math.round(d.daily?.uv_index_max?.[0] ?? 0);
  // Consejo según lo que vivirá la persona hoy
  const tips = [];
  if (pop >= 60) tips.push('lleva paraguas');
  else if (pop >= 30) tips.push('podría llover, ten un paraguas a mano');
  if (uv >= 8) tips.push('protector solar');
  const hot = unit === 'f' ? 86 : 30; const cold = unit === 'f' ? 57 : 14;
  if (max >= hot) tips.push('toma bastante agua');
  if (min <= cold) tips.push('abrígate en la mañana');
  const advice = tips.length ? tips[0][0].toUpperCase() + tips.join(', ').slice(1) + '.' : desc.say;
  return {
    temp: Math.round(cur.temperature_2m),
    max, min, pop, uv, advice,
    feels: Math.round(cur.apparent_temperature),
    sym: u.sym,
    code: cur.weather_code,
    isDay,
    ...desc,
    say: `${advice} · Sensación ${Math.round(cur.apparent_temperature)}${u.sym}`,
  };
}

const UNITS = {
  c: { temp: 'celsius', wind: 'kmh', sym: '°C', wspd: 'km/h' },
  f: { temp: 'fahrenheit', wind: 'mph', sym: '°F', wspd: 'mph' },
};

/** Todo lo importante: actual + 24h + 7 días. */
export async function fetchFullWeather(lat, lon, unit = 'c', signal) {
  const u = UNITS[unit] || UNITS.c;
  const d = await getJson(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl` +
    `&hourly=temperature_2m,weather_code,precipitation_probability` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max` +
    `&temperature_unit=${u.temp}&wind_speed_unit=${u.wind}&timezone=auto&forecast_days=8`,
    signal,
  );
  const cur = d.current;
  const isDay = cur.is_day === 1;

  // Próximas 24h desde la hora actual
  const nowH = String(cur.time).slice(0, 13); // "2026-10-08T14"
  let start = d.hourly.time.findIndex((t) => t.slice(0, 13) >= nowH);
  if (start < 0) start = 0;
  const hours = d.hourly.time.slice(start, start + 24).map((t, i) => ({
    time: t,
    temp: Math.round(d.hourly.temperature_2m[start + i]),
    code: d.hourly.weather_code[start + i],
    pop: d.hourly.precipitation_probability?.[start + i] ?? 0,
  }));

  const days = d.daily.time.slice(0, 7).map((t, i) => ({
    date: t,
    code: d.daily.weather_code[i],
    max: Math.round(d.daily.temperature_2m_max[i]),
    min: Math.round(d.daily.temperature_2m_min[i]),
    sunrise: d.daily.sunrise[i],
    sunset: d.daily.sunset[i],
    pop: d.daily.precipitation_probability_max?.[i] ?? 0,
  }));

  return {
    sym: u.sym,
    wspd: u.wspd,
    current: {
      temp: Math.round(cur.temperature_2m),
      feels: Math.round(cur.apparent_temperature),
      humidity: cur.relative_humidity_2m,
      wind: Math.round(cur.wind_speed_10m),
      windDir: compass(cur.wind_direction_10m),
      windDeg: cur.wind_direction_10m,
      pressure: Math.round(cur.pressure_msl),
      code: cur.weather_code,
      isDay,
      time: cur.time,
      ...describe(cur.weather_code, isDay),
    },
    hours,
    days,
  };
}

/** Busca lugares por nombre (coordenadas para Open-Meteo). */
export async function searchPlaces(text, signal) {
  const d = await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(text)}&count=6&language=es&format=json`,
    signal,
  );
  return (d.results || []).map((r) => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}
