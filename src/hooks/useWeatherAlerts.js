import { useEffect, useRef } from 'react';
import { CloudRain, CloudLightning, Sun, ThermometerSnowflake, Glasses } from 'lucide-react';
import { APP_NAME } from '../lib/format';

// Avisos del clima: toast de sileo dentro de la app + notificación del
// sistema fuera de ella (como los Recordatorios: con la app abierta o en
// 2º plano; cerrada del todo no llega nada sin servidor push).
// Cada tipo sale máximo 1 vez por día: el clima se refresca cada 10 min y
// sin este freno spamearía lo mismo todo el día.
const dayKey = () => {
  try { return new Date().toISOString().slice(0, 10); } catch { return 'hoy'; }
};
const said = (type) => {
  try { return localStorage.getItem(`h_wx_${type}`) === dayKey(); } catch { return false; }
};
const mark = (type) => {
  try { localStorage.setItem(`h_wx_${type}`, dayKey()); } catch { /* noop */ }
};

// Reglas en orden de prioridad: solo la primera que aplique avisa por pasada.
function evaluate(w) {
  if (!w) return null;
  const sym = w.sym || '°C';
  const toC = (t) => (sym === '°F' ? ((t - 32) * 5) / 9 : Number(t || 0));
  const code = w.code ?? -1;
  const pop = Number(w.pop ?? 0);
  const uv = Number(w.uv ?? 0);
  const maxC = toC(w.max ?? w.temp ?? 0);
  const minC = toC(w.min ?? w.temp ?? 0);
  if (code >= 95) {
    return { type: 'storm', I: CloudLightning, msg: 'Tormenta eléctrica cerca: mejor adentro, que eso está feo' };
  }
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82) || pop >= 70) {
    return { type: 'rain', I: CloudRain, msg: `Lluvia ${pop}%: es muy probable que llueva hoy, si vas a salir te recomiendo que lleves algo por si` };
  }
  if (maxC >= 27) {
    return { type: 'heat', I: Sun, msg: `Calor ${Math.round(w.max ?? w.temp ?? 0)}${sym}: el día está muy caliente, lo mejor es usar bloqueador` };
  }
  if (uv >= 8) {
    return { type: 'uv', I: Glasses, msg: `UV ${uv} por las nubes: ni se te ocurra salir sin bloqueador` };
  }
  if (minC <= 14) {
    return { type: 'cold', I: ThermometerSnowflake, msg: `Frío de ${Math.round(w.min ?? w.temp ?? 0)}${sym}: abrígate bien que está haciendo un frío bravo` };
  }
  return null;
}

export default function useWeatherAlerts({ enabled, weather, toast }) {
  const toastRef = useRef(toast);
  toastRef.current = toast;
  useEffect(() => {
    if (!enabled || !weather) return;
    const hit = evaluate(weather);
    if (!hit || said(hit.type)) return;
    mark(hit.type);
    // 1) Dentro: toast de sileo.
    try { toastRef.current?.(hit.msg, hit.I); } catch { /* noop */ }
    // 2) Fuera: notificación del sistema (otra app / pantalla bloqueada).
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(APP_NAME, { body: hit.msg });
      }
    } catch { /* noop */ }
    // 3) Mascotas: reaccionan al alerta (lo escucha PetLayer).
    try { window.dispatchEvent(new CustomEvent('hermes:wx', { detail: hit })); } catch { /* noop */ }
  }, [enabled, weather]);
}
