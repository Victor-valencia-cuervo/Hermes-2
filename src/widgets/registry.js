import { AlarmClock, CloudSun, Clock3, Cpu, Flower2, Grid3x3, Quote, Smile, Sparkles, Sun } from 'lucide-react';
import zenHtml from './led/zen.html?raw';
import mascotaHtml from './led/mascota.html?raw';
import pantallaHtml from './led/pantalla.html?raw';
import climaHtml from './led/clima.html?raw';
import relojHtml from './led/reloj.html?raw';

export const ZEN_SCENES = ['Palmera y mar', 'Árbol de las estaciones', 'Trébol de la suerte', 'Fuego', 'Día soleado', 'Noche de luna', 'Ciudad de noche', 'Cangrejito en la isla', 'Noche estrellada'];
const LED_MODES = [['auto', 'Automático'], ['text', 'Texto'], ['bars', 'Barras'], ['dots', 'Puntos'], ['mirror', 'Espejo'], ['wave', 'Onda'], ['heart', 'Corazón'], ['pac', 'Pac-Man'], ['form', 'Armar letras'], ['seg', 'Segmentos'], ['sol', 'Sólidas'], ['fin', 'Finas']];

/** Catálogo de widgets del inicio. `kind: 'led'` = pantalla de puntos en un iframe; `kind: 'native'` = tarjeta de React.
 *  settings: campos que se editan (seg = botones, select = lista, toggle, text, range). */
export const WIDGETS = {
  saludo: { kind: 'native', name: 'Saludo y hora', icon: Sun, desc: 'Nombre de la app, día, hora y frase de saludo.', size: 'xl', multi: false, cfg: {}, settings: [] },
  carita: { kind: 'native', name: 'Carita del día', icon: Smile, desc: 'La carita que reacciona a la música, la hora y el clima.', size: 'm', multi: false, cfg: {}, settings: [] },
  frase: { kind: 'native', name: 'Frase del día', icon: Quote, desc: 'Una frase para empezar el día.', size: 'm', multi: false, cfg: {}, settings: [] },
  dispositivo: { kind: 'native', name: 'Estado del dispositivo', icon: Cpu, desc: 'Batería, conexión, ping y memoria.', size: 'xl', multi: false, cfg: {}, settings: [] },
  recordatorios: { kind: 'native', name: 'Próximos recordatorios', icon: AlarmClock, desc: 'Tus tres pendientes más cercanos.', size: 'xl', multi: false, cfg: {}, settings: [] },

  reloj: {
    kind: 'led', html: relojHtml, aspect: '148 / 78', name: 'Reloj LED', icon: Clock3, size: 'm', multi: true,
    desc: 'Reloj circular de puntos con calendario del mes. Toca para ver solo el reloj o solo el calendario.',
    cfg: { mode: 'auto', fmt: 12, view: 'both' },
    settings: [
      { key: 'view', label: 'Vista', type: 'seg', options: [['both', 'Reloj y calendario'], ['clock', 'Solo reloj'], ['cal', 'Solo calendario']] },
      { key: 'mode', label: 'Reloj', type: 'seg', options: [['auto', 'Automático'], ['hands', 'Agujas'], ['digits', 'Números']] },
      { key: 'fmt', label: 'Formato de hora', type: 'seg', options: [[12, '12 horas'], [24, '24 horas']] },
    ],
  },
  clima: {
    kind: 'led', html: climaHtml, aspect: '148 / 78', name: 'Clima LED', icon: CloudSun, size: 'm', multi: false,
    desc: 'El clima de tu ubicación en puntos: ahora, próximas horas y próximos días.',
    cfg: { view: 'auto', design: 'card', unit: 'app' },
    settings: [
      { key: 'view', label: 'Vista', type: 'seg', options: [['auto', 'Automática'], ['now', 'Ahora'], ['hours', 'Próximas horas'], ['days', 'Próximos días']] },
      { key: 'design', label: 'Diseño', type: 'seg', options: [['card', 'Tarjeta'], ['circ', 'Circular'], ['big', 'Icono grande']] },
      { key: 'unit', label: 'Unidad', type: 'seg', options: [['app', 'La de la app'], ['C', '°C'], ['F', '°F']] },
    ],
  },
  zen: {
    kind: 'led', html: zenHtml, aspect: '1 / 1', square: true, name: 'Zen LED', icon: Flower2, size: 'm', multi: true,
    desc: 'Dibujos pixel art animados. Elige uno fijo o que cambien solos cada cierto tiempo.',
    cfg: { scene: 'auto', every: 40, colorMode: 'original', style: 'dots' },
    settings: [
      { key: 'scene', label: 'Dibujo', type: 'select', options: [['auto', 'Cambiar solo'], ...ZEN_SCENES.map((n, i) => [i, n])] },
      { key: 'every', label: 'Cambiar cada', type: 'seg', when: (c) => c.scene === 'auto' || c.scene == null, options: [[20, '20 s'], [40, '40 s'], [60, '1 min'], [120, '2 min'], [300, '5 min']] },
      { key: 'colorMode', label: 'Color', type: 'seg', options: [['original', 'Original'], ['single', 'Color de la app']] },
      { key: 'style', label: 'Estilo', type: 'seg', options: [['dots', 'Puntos'], ['pixels', 'Píxeles']] },
    ],
  },
  mascota: {
    kind: 'led', html: mascotaHtml, aspect: '1 / 1', name: 'Mascota de puntos', icon: Sparkles, size: 'm', multi: false,
    desc: 'Una carita de puntos pequeñita con su diálogo y el clima. Cambia de cara con tu música, el clima, la hora y los avisos; se duerme si no haces nada.',
    cfg: { text: true, look: 'face', ring: 'normal', intensity: 'normal', hat: false, noLine: false, noDots: false, bored: true },
    settings: [
      { key: 'text', label: 'Mostrar diálogo y clima', type: 'toggle' },
      { key: 'look', label: 'Diseño', type: 'seg', options: [['face', 'Carita grande'], ['classic', 'Con círculo']] },
      { key: 'ring', label: 'Anillo (solo con círculo)', type: 'select', when: (c) => c.look === 'classic', options: [['normal', 'Normal'], ['onda', 'Onda'], ['giro', 'Giro'], ['ondas', 'Ondas'], ['chispas', 'Chispas'], ['respirar', 'Respirar'], ['latido', 'Latido'], ['filoso', 'Filoso'], ['luna', 'Luna']] },
      { key: 'intensity', label: 'Intensidad del ritmo', type: 'seg', options: [['bajo', 'Baja'], ['normal', 'Normal'], ['alto', 'Alta']] },
      { key: 'hat', label: 'Sombrero', type: 'toggle' },
      { key: 'bored', label: 'Juega cuando se aburre', type: 'toggle' },
      { key: 'noLine', label: 'Quitar la línea del fondo', type: 'toggle' },
      { key: 'noDots', label: 'Quitar los puntos de afuera', type: 'toggle' },
    ],
  },
  pantalla: {
    kind: 'led', html: pantallaHtml, aspect: '2 / 1', name: 'Pantalla LED', icon: Grid3x3, size: 'xl', multi: true,
    desc: 'Matriz de puntos personalizable: texto, visualizador de música, corazón, Pac-Man… Puedes agregar varias.',
    cfg: { mode: 'auto', text: '¡HOLA! HERMES', speed: 28, color: 'app', scheme: 'norm', gain: 1.4 },
    settings: [
      { key: 'mode', label: 'Modo', type: 'select', options: LED_MODES },
      { key: 'text', label: 'Texto que se desplaza', type: 'text', max: 80, when: (c) => c.mode === 'auto' || c.mode === 'text' || c.mode === 'form' },
      { key: 'speed', label: 'Velocidad del texto', type: 'range', min: 10, max: 70, step: 2, when: (c) => c.mode === 'auto' || c.mode === 'text' },
      { key: 'color', label: 'Color', type: 'seg', options: [['app', 'App'], ['blanco', 'Blanco'], ['verde', 'Verde'], ['ambar', 'Ámbar'], ['cian', 'Cian'], ['arcoiris', 'Arcoíris']] },
      { key: 'scheme', label: 'Esquema', type: 'seg', options: [['norm', 'Normal'], ['inv', 'Fondo de color']] },
      { key: 'gain', label: 'Sensibilidad al sonido', type: 'range', min: 0.5, max: 3, step: 0.1 },
    ],
  },
};
export const ORDER_CATALOG = ['saludo', 'carita', 'frase', 'dispositivo', 'recordatorios', 'reloj', 'clima', 'zen', 'mascota', 'pantalla'];

// Tamaños: muy pequeño · pequeño · normal · grande · muy grande (en el celular: 1/3 · 1/2 · fila completa)
export const SIZES = [['xs', 'Muy pequeño'], ['s', 'Pequeño'], ['m', 'Normal'], ['l', 'Grande'], ['xl', 'Muy grande']];
export const SIZE_KEYS = SIZES.map(([k]) => k);
export const sizeLabel = (k) => (SIZES.find(([x]) => x === k) || SIZES[2])[1];

let seq = 0;
export const newId = (type) => `${type}-${Date.now().toString(36)}${(seq++).toString(36)}`;
export const makeWidget = (type) => ({ id: newId(type), type, size: WIDGETS[type].size, cfg: { ...WIDGETS[type].cfg } });

// Inicio original (antes de los widgets): saludo, carita + frase, dispositivo y recordatorios.
export const DEFAULT_WIDGETS = [
  { id: 'saludo-0', type: 'saludo', size: 'xl', cfg: {} },
  { id: 'carita-0', type: 'carita', size: 'm', cfg: {} },
  { id: 'frase-0', type: 'frase', size: 'm', cfg: {} },
  { id: 'dispositivo-0', type: 'dispositivo', size: 'xl', cfg: {} },
  { id: 'recordatorios-0', type: 'recordatorios', size: 'xl', cfg: {} },
];
// Limpia lo guardado: tipos desconocidos fuera, config completada con los valores por defecto.
export function normalizeWidgets(raw) {
  if (!Array.isArray(raw)) return DEFAULT_WIDGETS;
  return raw.filter((w) => w && WIDGETS[w.type] && w.id)
    .map((w) => ({ id: String(w.id), type: w.type, size: SIZE_KEYS.includes(w.size) ? w.size : w.size === 2 ? 'xl' : w.size === 1 ? 'm' : WIDGETS[w.type].size, cfg: { ...WIDGETS[w.type].cfg, ...(w.cfg || {}) } }));
}
