// Color automático de partículas desde el vibrante de la carátula.
// useArtColors().main viene como `rgb(r, g, b)`; el canvas necesita {r,g,b}.
const CHAMPAGNE = { r: 235, g: 205, b: 155 }; // repliegue de la demo

export function cssToRgb(css) {
  if (!css) return CHAMPAGNE;
  const m = String(css).match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return CHAMPAGNE;
  const v = [ +m[1], +m[2], +m[3] ];
  if (v.some((n) => !Number.isFinite(n))) return CHAMPAGNE;
  return {
    r: Math.min(255, Math.max(0, Math.round(v[0]))),
    g: Math.min(255, Math.max(0, Math.round(v[1]))),
    b: Math.min(255, Math.max(0, Math.round(v[2]))),
  };
}
