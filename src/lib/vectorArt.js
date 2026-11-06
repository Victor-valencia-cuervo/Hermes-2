// Imágenes vectoriales (SVG en data URI) para los Favoritos y las playlists sin carátula.
const uri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
const hash = (s) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };

/** Favoritos: corazón en cristal sobre degradado violeta → azul, con destellos. */
export const FAV_COLORS = { main: 'rgb(99, 72, 220)', deep: 'rgb(38, 56, 150)' };
export const FAV_ART = uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset=".55" stop-color="#4b46d8"/><stop offset="1" stop-color="#2dc4f0"/></linearGradient>
<linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".98"/><stop offset="1" stop-color="#fff" stop-opacity=".72"/></linearGradient>
<radialGradient id="r" cx=".3" cy=".2" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<filter id="b"><feGaussianBlur stdDeviation="26"/></filter>
</defs>
<rect width="800" height="800" fill="url(#g)"/>
<circle cx="140" cy="660" r="190" fill="#ff7ad9" opacity=".35" filter="url(#b)"/>
<circle cx="680" cy="140" r="170" fill="#7af0ff" opacity=".35" filter="url(#b)"/>
<rect width="800" height="800" fill="url(#r)"/>
<g transform="translate(400 420)"><path d="M0 190 C-250 20 -190 -170 -80 -170 C-30 -170 0 -135 0 -110 C0 -135 30 -170 80 -170 C190 -170 250 20 0 190Z" fill="url(#h)"/>
<path d="M-120 -120 C-160 -100 -170 -40 -140 0" stroke="#fff" stroke-opacity=".7" stroke-width="14" stroke-linecap="round" fill="none"/></g>
<g fill="#fff"><circle cx="150" cy="190" r="7" opacity=".8"/><circle cx="640" cy="560" r="9" opacity=".6"/><circle cx="610" cy="250" r="5" opacity=".9"/><circle cx="210" cy="590" r="5" opacity=".7"/></g>
</svg>`);

const PALS = [['#ff6b6b', '#c84bff'], ['#ffb347', '#ff5f6d'], ['#43e97b', '#1fa2ff'], ['#f093fb', '#5b6cff'], ['#30cfd0', '#6a3df0'], ['#fbc2eb', '#f6416c']];
/** Portada generada para una playlist sin carátula: formas suaves con colores según su nombre. */
export function playlistArt(name = '', color) {
  const h = hash(name); const [a, b] = PALS[h % PALS.length]; const c1 = color || a;
  const x = (n) => 120 + ((h >> n) % 560);
  return uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${b}"/></linearGradient><filter id="b"><feGaussianBlur stdDeviation="30"/></filter></defs>
<rect width="800" height="800" fill="url(#g)"/><circle cx="${x(3)}" cy="${x(7)}" r="230" fill="#fff" opacity=".18" filter="url(#b)"/><circle cx="${x(11)}" cy="${x(5)}" r="180" fill="#000" opacity=".2" filter="url(#b)"/>
<g fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="22" stroke-linecap="round"><path d="M300 520 V300 L520 260 V480"/></g><g fill="#fff"><circle cx="262" cy="530" r="52"/><circle cx="482" cy="490" r="52"/></g></svg>`);
}
