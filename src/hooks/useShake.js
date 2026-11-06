import { useEffect } from 'react';

/** Evento global que hace volar a las mascotas. detail: { power } (0…1). */
export const SHAKE_EVENT = 'hermes:pet-shake';

/** Aceleración (m/s², sin gravedad) mínima para contar como sacudida. */
export const SHAKE_THRESHOLD = { soft: 20, normal: 14, strong: 9 };
export const SHAKE_LABEL = { soft: 'Suave', normal: 'Normal', strong: 'Fuerte' };

// En iOS el sensor exige permiso con gesto del usuario; en el resto va directo.
export function motionPermissionNeeded() {
  try {
    return typeof DeviceMotionEvent !== 'undefined'
      && typeof DeviceMotionEvent.requestPermission === 'function';
  } catch { return false; }
}

export async function requestMotionPermission() {
  if (!motionPermissionNeeded()) return 'granted';
  try { return await DeviceMotionEvent.requestPermission(); }
  catch { return 'denied'; }
}

/** Dispara una sacudida manual (botón "Probar", PC sin acelerómetro). */
export function fireShake(power = 0.7) {
  try {
    window.dispatchEvent(new CustomEvent(SHAKE_EVENT, { detail: { power } }));
  } catch { /* noop */ }
}

/**
 * Escucha el acelerómetro solo cuando el modo está activado.
 * enabled=false → ni siquiera registra el listener (ahorra batería).
 */
export default function useShake({ enabled, sensitivity = 'normal', onShake }) {
  useEffect(() => {
    if (!enabled) return undefined;
    const th = SHAKE_THRESHOLD[sensitivity] ?? SHAKE_THRESHOLD.normal;
    let last = 0;
    const onMotion = (e) => {
      const a = e.acceleration;
      let mag = 0;
      if (a && (a.x != null || a.y != null || a.z != null)) {
        mag = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
      } else if (e.accelerationIncludingGravity) {
        const g = e.accelerationIncludingGravity;
        mag = Math.abs(Math.hypot(g.x || 0, g.y || 0, g.z || 0) - 9.81);
      }
      if (mag < th) return;
      const now = performance.now();
      if (now - last < 1500) return;
      last = now;
      onShake?.(Math.min(1, ((mag - th) / 12) + 0.45));
    };
    window.addEventListener('devicemotion', onMotion);
    return () => window.removeEventListener('devicemotion', onMotion);
  }, [enabled, sensitivity, onShake]);
}
