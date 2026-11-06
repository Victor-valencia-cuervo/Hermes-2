import { useEffect, useState } from 'react';
import { FACE_FILES } from '../data/faces';
import { PIXEL_FACES, pixelRects } from '../data/pixelFaces';
import { hexToHue, imageHue, watchAccent } from '../lib/faceTint';

// Ruta relativa: funciona en dev, en build servido y abriendo el dist local.
const fileOf = (face) => `caritas/${FACE_FILES[face] || FACE_FILES.feliz}.png`;

// Precarga las 12 caritas para que el cambio de reacción sea instantáneo.
let preloaded = false;
function preloadFaces() {
  if (preloaded || typeof Image === 'undefined') return;
  preloaded = true;
  Object.values(FACE_FILES).forEach((f) => {
    const im = new Image();
    im.src = `caritas/${f}.png`;
  });
}

// Solo imágenes: sin máscaras, sin emojis, sin marcos.
export default function PixelFace({ face = 'feliz', kind, onClick }) {
  const [err, setErr] = useState(false);
  const [accent, setAccent] = useState('');
  const [baseHue, setBaseHue] = useState(null);
  const isPixel = Boolean(PIXEL_FACES[face]);
  const src = fileOf(face);
  const anim = kind === 'music' ? 'face-bop' : kind === 'sleep' ? 'face-sleep' : 'face-float';

  useEffect(() => { preloadFaces(); }, []);
  useEffect(() => watchAccent(setAccent), []);
  useEffect(() => { setBaseHue(null); }, [face]);
  const accHue = hexToHue(accent);
  // Las caritas PNG toman el tono del acento (color del app / de la canción).
  const tint = !isPixel && accHue != null && baseHue != null
    ? `hue-rotate(${Math.round(accHue - baseHue)}deg) saturate(1.05)` : undefined;
  // Al cambiar de cara se resetea el estado de error (y la animación con key).
  useEffect(() => { setErr(false); }, [face]);

  // Si un PNG falla, se reintenta con la feliz. Solo imágenes, nada más.
  const showSrc = err ? fileOf('feliz') : src;
  const cls = 'face-pop w-36 h-36 sm:w-44 sm:h-44 transition active:scale-95';

  const pixelBody = (
    <svg viewBox="0 0 12 12" className={`w-full h-full ${anim}`} shapeRendering="crispEdges" aria-hidden style={{ filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.35))' }}>
      {pixelRects(face).map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height="1" fill={r.fill} />)}
    </svg>
  );

  const body = isPixel ? pixelBody : (
    <img
      key={showSrc}
      src={showSrc}
      alt=""
      draggable={false}
      onError={() => setErr(true)}
      onLoad={(e) => setBaseHue(imageHue(e.currentTarget))}
      className={`w-full h-full object-contain ${anim}`}
      style={{ imageRendering: 'pixelated', filter: tint, transition: 'filter .6s' }}
    />
  );

  // key=face → al cambiar de reacción se vuelve a montar con animación "pop"
  if (typeof onClick === 'function') {
    return (
      <button key={face} type="button" onClick={onClick} title="¡Tócame!" aria-label={`Carita ${face}. Tócame para una sorpresa`} className={cls}>
        {body}
      </button>
    );
  }
  return (
    <div key={face} className={cls} role="img" aria-label={`Carita ${face}`}>
      {body}
    </div>
  );
}
