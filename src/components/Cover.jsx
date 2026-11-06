import { memo, useEffect, useState } from 'react';
import { Music } from 'lucide-react';

/** Carátula con repliegue accesible: si la URL falla, muestra icono con label. */
function Cover({ src, alt = '', className = 'w-12 h-12 rounded-xl', iconSize = 18 }) {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [src]);
  if (!src || err) {
    return (
      <div className={`${className} grid place-items-center shrink-0`} style={{ background: 'var(--s2)', color: 'var(--m)' }} role="img" aria-label={alt ? `Sin carátula: ${alt}` : 'Sin carátula'}>
        <Music size={iconSize} aria-hidden="true" />
      </div>
    );
  }
  return (
    <img src={src} alt={alt} loading="lazy" decoding="async" draggable={false} onError={() => setErr(true)}
      className={`${className} object-cover object-center shrink-0 bg-[var(--s2)] select-none`} style={{ WebkitUserDrag: 'none' }} />
  );
}

export default memo(Cover);
