import { useEffect, useMemo, useState } from 'react';

/** Luz ambiental estilo "Ambient light for YouTube": colores de las 4 esquinas del video.
 *  YouTube no deja leer los píxeles del video incrustado (otro origen), así que se toman de sus fotogramas oficiales
 *  (miniatura + 3 cuadros a ~25 %, 50 % y 75 %) y la luz va pasando de uno a otro según avanza la canción.
 *  Sin video (Audius / local) usa la carátula. Devuelve { tl, tr, bl, br } listos para CSS o null si no se pudo leer. */
const cache = new Map();
const proxy = (u) => `https://wsrv.nl/?url=${encodeURIComponent(String(u).replace(/^https?:\/\//, ''))}&w=64&output=jpg`;

function loadImg(src) {
  return new Promise((res) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}
// Promedia una zona (fracciones x0,y0,x1,y1) de la imagen; evita las franjas negras de las miniaturas 4:3.
function corners(img) {
  const W = 48; const H = 36;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, W, H);
  const zone = ([x0, y0, x1, y1]) => {
    const d = cx.getImageData(Math.floor(x0 * W), Math.floor(y0 * H), Math.max(1, Math.floor((x1 - x0) * W)), Math.max(1, Math.floor((y1 - y0) * H))).data;
    let r = 0; let g = 0; let b = 0; let n = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i] + d[i + 1] + d[i + 2] < 30) continue; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return n ? [r / n, g / n, b / n] : null;
  };
  return { tl: zone([0.02, 0.2, 0.3, 0.45]), tr: zone([0.7, 0.2, 0.98, 0.45]), bl: zone([0.02, 0.55, 0.3, 0.8]), br: zone([0.7, 0.55, 0.98, 0.8]) };
}
async function frameColors(url) {
  if (cache.has(url)) return cache.get(url);
  let out = null;
  for (const src of [url, proxy(url)]) {
    const im = await loadImg(src);
    if (!im) continue;
    try { out = corners(im); break; } catch { /* sin CORS: prueba el proxy */ }
  }
  cache.set(url, out); if (cache.size > 80) cache.delete(cache.keys().next().value);
  return out;
}

// Realza el color para que se note como luz (sin pasarse): más saturación y brillo medio.
function glow([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b); const mn = Math.min(r, g, b); const d = mx - mn;
  let h = 0; let l = (mx + mn) / 2; let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  s = Math.min(1, Math.max(s * 1.25, 0.5)); l = Math.min(0.62, Math.max(0.42, l * 1.15));
  return `hsl(${Math.round(h * 60)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}
const mix = (a, b, k) => (a && b ? a.map((v, i) => v + (b[i] - v) * k) : a || b);

export default function useAmbientColors({ videoId, art, progress = 0 }) {
  const [frames, setFrames] = useState(null); // [{tl,tr,bl,br}] en orden temporal
  useEffect(() => {
    let dead = false; setFrames(null);
    (async () => {
      let list;
      if (videoId) {
        const base = `https://i.ytimg.com/vi/${videoId}`;
        list = (await Promise.all([`${base}/mqdefault.jpg`, `${base}/1.jpg`, `${base}/2.jpg`, `${base}/3.jpg`].map(frameColors))).filter(Boolean);
      } else if (art && !/^(data|blob):/.test(art)) {
        const f = await frameColors(art); list = f ? [f] : [];
      } else list = [];
      if (!dead) setFrames(list.length ? list : null);
    })();
    return () => { dead = true; };
  }, [videoId, art]);

  // Cambia de fotograma cada ~2,5 % de la canción (las transiciones suaves las hace el CSS).
  const step = Math.round(Math.min(1, Math.max(0, progress)) * 40);
  return useMemo(() => {
    if (!frames) return null;
    const seq = frames.length >= 4 ? [frames[1], frames[2], frames[3], frames[0]] : frames; // 25 %, 50 %, 75 %, final ≈ miniatura
    const pos = (step / 40) * (seq.length - 1);
    const i = Math.min(seq.length - 2 < 0 ? 0 : seq.length - 2, Math.floor(pos)); const k = pos - i;
    const A = seq[i]; const B = seq[Math.min(seq.length - 1, i + 1)];
    const out = {};
    ['tl', 'tr', 'bl', 'br'].forEach((c) => { const m = mix(A[c], B[c], k) || [99, 102, 241]; out[c] = glow(m); });
    return out;
  }, [frames, step]);
}
