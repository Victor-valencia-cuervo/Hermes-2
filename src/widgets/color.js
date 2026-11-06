// Color de los widgets: toma el acento vivo de la app (--a) y lo deja con brillo suficiente
// para que se vea bien sobre el fondo negro de las pantallas de puntos.
let cvs = null;
export function toHex(c) {
  try {
    cvs = cvs || document.createElement('canvas').getContext('2d');
    cvs.fillStyle = '#000'; cvs.fillStyle = String(c || '#6366f1');
    const v = cvs.fillStyle; // «#rrggbb» o «rgba(...)»
    if (v[0] === '#') return v.length === 7 ? v : '#6366f1';
    const m = v.match(/\d+(\.\d+)?/g) || [];
    return `#${[0, 1, 2].map((i) => Math.round(+m[i] || 0).toString(16).padStart(2, '0')).join('')}`;
  } catch { return '#6366f1'; }
}
export function ledColor(c) {
  const hex = toHex(c).slice(1);
  let [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); const d = mx - mn;
  let h = 0; let l = (mx + mn) / 2; let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  l = Math.min(0.74, Math.max(0.6, l)); s = Math.max(s, 0.45);
  const f = (n) => { const k = (n + h * 2) % 12; const a = s * Math.min(l, 1 - l); return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
  return `#${[f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}
