// Carpeta: public/caritas/  (cambia aquí los nombres si renombras las imágenes)
export const FACE_FILES = {
  feliz: '01-feliz', llanto: '02-llanto', enamorado: '03-enamorado', musica: '04-musica',
  dormido: '05-dormido', guino: '06-guino', lentes: '07-lentes', travieso: '08-travieso',
  sorpresa: '09-sorpresa', neutral: '10-neutral', pensando: '11-pensando', diablito: '12-diablito',
};

// Tiempos de inactividad (segundos) para que se duerma.
export const IDLE_SLEEP = 180;      // 3 min sin tocar nada
export const IDLE_SLEEP_LATE = 45;  // de madrugada se duerme más rápido
export const isLate = (h) => h >= 23 || h < 5;

// Flashes temporales de la carita (milisegundos).
export const POKE_MS = 6000;       // click → cara aleatoria
export const REMINDER_FLASH_MS = 10000; // recordatorio disparado

// Frases juguetonas al tocar la carita.
export const POKE_SAYS = [
  '¡Ey! Esa me gusta.',
  '¡Cosquillas! ¿Otra vez?',
  'Mira, salgo en todas las fotos.',
  '¿Viste? Tengo 12 caras.',
  '¡Buena esa! Sigo aquí.',
];

import { PIXEL_FACE_NAMES } from './pixelFaces';

// Caras que el sistema automático no usa y el click puede mostrar (12 PNG + 9 pixel-art).
export const POKE_FACES = [...Object.keys(FACE_FILES), ...PIXEL_FACE_NAMES];
