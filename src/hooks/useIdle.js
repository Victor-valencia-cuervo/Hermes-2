import { useEffect, useRef, useState } from 'react';

// Segundos sin que toques nada (mouse, teclado, touch, scroll).
// Se actualiza cada 5 s y se reinicia al instante cuando vuelves a interactuar.
export default function useIdle() {
  const last = useRef(Date.now());
  const [idle, setIdle] = useState(0);
  useEffect(() => {
    const poke = () => { last.current = Date.now(); setIdle((v) => (v === 0 ? v : 0)); };
    const evs = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, poke, { passive: true, capture: true }));
    const i = setInterval(() => setIdle(Math.floor((Date.now() - last.current) / 1000)), 5000);
    return () => { evs.forEach((e) => window.removeEventListener(e, poke, { capture: true })); clearInterval(i); };
  }, []);
  return idle;
}
