import { useState, useEffect } from 'react';

/** true si la pantalla está en horizontal (giro del teléfono). */
export default function useLandscape() {
  const get = () => {
    try {
      if (window.matchMedia) return window.matchMedia('(orientation: landscape)').matches;
      return window.innerWidth > window.innerHeight;
    } catch {
      return false;
    }
  };
  const [land, setLand] = useState(get);
  useEffect(() => {
    try {
      const mq = window.matchMedia?.('(orientation: landscape)');
      if (mq?.addEventListener) {
        const onC = (e) => setLand(e.matches);
        mq.addEventListener('change', onC);
        return () => mq.removeEventListener('change', onC);
      }
    } catch { /* repliegue resize */ }
    const onR = () => {
      try { setLand(window.innerWidth > window.innerHeight); } catch { /* noop */ }
    };
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
  }, []);
  return land;
}
