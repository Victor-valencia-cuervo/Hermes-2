// Caritas extra dibujadas en pixel-art (12x12). Se pintan con el color del app (--a),
// asi que cambian solas con el acento / la carátula de la canción.
// Clave de color: # cuerpo · o oscuro · w blanco · s sombra/rosa · . vacío
const BASE = [
  '....####....', '..########..', '.##########.', '.##########.', '############', '############',
  '############', '############', '.##########.', '.##########.', '..########..', '....####....',
];
const EMPTY = Array(12).fill('............');
const merge = (over, base = BASE) => base.map((b, i) => {
  const o = over[i];
  if (!o) return b;
  return [...b].map((ch, j) => (o[j] === '.' ? ch : o[j])).join('');
});

export const PIXEL_FACES = {
  enojado: merge({
    2: '.#oo####oo#.', 3: '####oooo####', 4: '###oo##oo###', 5: '###oo##oo###', 7: '####oooo####', 8: '.##o####o##.',
  }),
  risa: merge({
    4: '###o####o###', 5: '##o#o##o#o##', 7: '##oooooooo##', 8: '.#owwwwwwo#.', 9: '.##owwwwo##.', 10: '..###oo###..',
  }),
  mareado: merge({
    4: '##o#o##o#o##', 5: '###o####o###', 6: '##o#o##o#o##', 8: '.##o#o#o#o#.',
  }),
  corazon: merge({
    4: '##o#o##o#o##', 5: '##ooo##ooo##', 6: '###o####o###', 7: '#ss######ss#', 8: '##o######o##', 9: '.##oooooo##.',
  }),
  asustado: merge({
    3: '##www##www##', 4: '##wow##wow##', 5: '##www##www##', 8: '#####oo#####', 9: '####o##o####', 10: '#####oo#####',
  }),
  robot: merge([
    '.....ss.....', '.##########.', '############', '############', '#wwww##wwww#', '#wwww##wwww#',
    '############', '#oooooooooo#', '#o#o#o#o#o##', '#oooooooooo#', '.##########.', '...ss..ss...',
  ], EMPTY),
  gato: merge([
    '.#........#.', '.##......##.', '.##########.', '############', '###oo##oo###', '###oo##oo###',
    '#####ss#####', '####o##o####', '.####oo####.', '.##########.', '..########..', '....####....',
  ], EMPTY),
  fantasma: merge([
    '....####....', '..########..', '.##########.', '############', '###oo##oo###', '###oo##oo###',
    '###oo##oo###', '############', '#####oo#####', '############', '############', '#.##.##.##.#',
  ], EMPTY),
  alien: merge([
    '..########..', '.##########.', '############', '############', '#ooo####ooo#', '#oooo##oooo#',
    '.#ooo##ooo#.', '..########..', '...######...', '....#oo#....', '.....##.....', '............',
  ], EMPTY),
};

export const PIXEL_FACE_NAMES = Object.keys(PIXEL_FACES);

const COLORS = {
  '#': 'color-mix(in srgb, var(--a) 72%, white)',
  o: '#1a1022',
  w: '#ffffff',
  s: 'color-mix(in srgb, var(--a) 55%, #ff7aa8)',
};

/** Rectángulos (x, y, ancho, color) fusionando píxeles contiguos por fila. */
export function pixelRects(name) {
  const rows = PIXEL_FACES[name];
  if (!rows) return [];
  const out = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (ch === '.' || !COLORS[ch]) { x++; continue; }
      let w = 1;
      while (x + w < row.length && row[x + w] === ch) w++;
      out.push({ x, y, w, fill: COLORS[ch] });
      x += w;
    }
  });
  return out;
}
