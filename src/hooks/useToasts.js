import { useCallback } from 'react';
import { notify } from '../lib/notify';

// Misma API de antes ([, toast]) pero por detrás usa Sileo.
// El <Toaster> vive en App y sigue tu modo claro/oscuro.
export default function useToasts() {
  const toast = useCallback((msg, I) => notify(msg, I), []);
  return [[], toast];
}
