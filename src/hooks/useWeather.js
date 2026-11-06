import { useState, useEffect } from 'react';
import { fetchWeather, DEFAULT_PLACE } from '../services/weather';

export default function useWeather(place, unit = 'c') {
  const [weather, setWeather] = useState(null);
  const p = place || DEFAULT_PLACE;
  useEffect(() => {
    const ctrl = new AbortController();
    const load = () => fetchWeather(p.lat, p.lon, unit, ctrl.signal).then(setWeather).catch(() => {});
    load();
    const i = setInterval(load, 600000);
    return () => { clearInterval(i); ctrl.abort(); };
  }, [p.lat, p.lon, unit]);
  return weather;
}
