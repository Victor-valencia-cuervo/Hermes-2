import { useEffect, useState } from 'react';

/**
 * Extrae los colores principales de la carátula con canvas, sin dependencias.
 * Devuelve { main, deep, accent } o null si falla el CORS o no hay arte.
 * - main/deep: rgb() para fondos/gradientes del reproductor.
 * - accent: hex ajustado en luminancia para botones con texto blanco (--a global).
 * Si el host del arte no permite CORS (miniaturas proxificadas, favicons),
 * reintenta una vez vía wsrv.nl que sí envía ACAO:*.
 */
const css = (c) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
const hex = (c) => `#${c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

/** Ajusta el vibrante a una luminancia legible (0.22–0.55) sin cambiar el tono. */
function fitAccent([r, g, b]) {
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  let f = 1;
  if (lum > 0.55) f = 0.55 / lum;
  else if (lum < 0.22) f = 0.22 / Math.max(lum, 0.02);
  // No aclarar de más: mezcla hacia blanco en vez de escalar brillo puro
  if (f <= 1) return [r * f, g * f, b * f];
  const t = Math.min(1, (f - 1) * 0.7);
  return [r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t];
}
// Caché en memoria por URL: App + FullPlayers piden el mismo arte a la vez;
// sin esto cada uno decodifica y analiza la imagen por separado (jank en gama baja).
const artCache = new Map();
export default function useArtColors(src) {
  const [colors, setColors] = useState(() => (src && artCache.has(src) ? artCache.get(src) : null));

  useEffect(() => {
    if (!src) { setColors(null); return; }
    if (artCache.has(src)) { setColors(artCache.get(src)); return; }
    let dead = false;
    const viaProxy = (() => {
      try {
        const u = String(src).replace(/^https?:\/\//, '').replace(/^\/\//, '');
        if (!u || /^data:|blob:/.test(String(src))) return null;
        return `https://wsrv.nl/?url=${encodeURIComponent(u)}&w=48&h=48&fit=cover&output=jpg`;
      } catch { return null; }
    })();
    const analyze = (img) => {
      try {
        const S = 48;
        const cv = document.createElement('canvas');
        cv.width = S; cv.height = S;
        const cx = cv.getContext('2d', { willReadFrequently: true });
        cx.drawImage(img, 0, 0, S, S);
        const d = cx.getImageData(0, 0, S, S).data;
        let r = 0, g = 0, b = 0, n = 0;
        let br = 0, bg = 0, bb = 0, bs = -1;
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] < 128) continue;
          const R = d[i], G = d[i + 1], B = d[i + 2];
          r += R; g += G; b += B; n++;
          const mx = Math.max(R, G, B), mn = Math.min(R, G, B);
          const sat = mx - mn, lum = mx + mn;
          if (sat > bs && lum > 40 && lum < 460) { bs = sat; br = R; bg = G; bb = B; }
        }
        if (!n || dead) return false;
        const avg = [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
        const vib = bs >= 0 ? [br, bg, bb] : avg;
        const out = { main: css(vib), deep: css(avg), accent: hex(fitAccent(vib)) };
        try { if (src) artCache.set(src, out); } catch { /* noop */ }
        if (artCache.size > 60) { try { artCache.delete(artCache.keys().next().value); } catch {} }
        setColors(out);
        return true;
      } catch {
        return false; // canvas contaminado (sin CORS): toca repliegue
      }
    };
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let proxied = false;
    img.onload = () => {
      if (dead) return;
      if (analyze(img)) return;
      if (viaProxy && !proxied) {
        proxied = true;
        const img2 = new Image();
        img2.crossOrigin = 'anonymous';
        img2.onload = () => { if (!dead && !analyze(img2)) setColors(null); };
        img2.onerror = () => { if (!dead) setColors(null); };
        img2.src = viaProxy;
      } else if (!dead) setColors(null);
    };
    img.onerror = () => {
      if (dead) return;
      if (viaProxy && !proxied) {
        proxied = true;
        const img2 = new Image();
        img2.crossOrigin = 'anonymous';
        img2.onload = () => { if (!dead && !analyze(img2)) setColors(null); };
        img2.onerror = () => { if (!dead) setColors(null); };
        img2.src = viaProxy;
      } else setColors(null);
    };
    img.src = src;
    return () => { dead = true; };
  }, [src]);

  return colors;
}
