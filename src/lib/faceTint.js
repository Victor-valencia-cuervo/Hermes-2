// Tinte de las caritas PNG: calcula el tono dominante de cada imagen (una vez) y
// el tono del acento actual, y devuelve los grados para hue-rotate().
const cache = new Map();

export function hexToHue(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) / 255; const g = ((n >> 8) & 255) / 255; const b = (n & 255) / 255;
  const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); const d = mx - mn;
  if (d < 0.08) return null; // gris: no se tiñe
  let h;
  if (mx === r) h = ((g - b) / d) % 6;
  else if (mx === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** Tono dominante (0-360) de una imagen, ignorando píxeles grises/oscuros/transparentes. */
export function imageHue(img) {
  const key = img.currentSrc || img.src;
  if (cache.has(key)) return cache.get(key);
  let hue = null;
  try {
    const S = 32;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, S, S);
    const d = ctx.getImageData(0, 0, S, S).data;
    let x = 0; let y = 0; let w = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 200) continue;
      const mx = Math.max(d[i], d[i + 1], d[i + 2]); const mn = Math.min(d[i], d[i + 1], d[i + 2]);
      const sat = mx ? (mx - mn) / mx : 0;
      if (sat < 0.3 || mx < 70) continue;
      const hh = hexToHue(`#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`);
      if (hh == null) continue;
      x += Math.cos((hh * Math.PI) / 180) * sat; y += Math.sin((hh * Math.PI) / 180) * sat; w += sat;
    }
    if (w > 0) hue = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  } catch { /* sin canvas: sin tinte */ }
  cache.set(key, hue);
  return hue;
}

/** Observa --a del <html> y avisa del hex actual. */
export function watchAccent(cb) {
  const read = () => cb(getComputedStyle(document.documentElement).getPropertyValue('--a').trim());
  read();
  const mo = new MutationObserver(read);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  return () => mo.disconnect();
}
