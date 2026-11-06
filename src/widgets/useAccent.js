import { useEffect, useState } from 'react';
import { watchAccent } from '../lib/faceTint';
/** Color de acento vivo de la app (cambia con la carátula de la canción). */
export function useAccent() {
  const [a, setA] = useState('#6366f1');
  useEffect(() => watchAccent(setA), []);
  return a;
}
