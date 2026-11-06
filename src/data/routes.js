// Rutas de la app (React Router). id interno -> ruta URL.
export const PATHS = {
  home: '/',
  weather: '/clima',
  music: '/musica',
  search: '/musica/buscar',
  library: '/musica/biblioteca',
  profile: '/perfil',
  community: '/comunidad',
  chat: '/chat',
  radios: '/radios',
  reminders: '/recordatorios',
  notes: '/notas',
  shortcuts: '/atajos',
  tools: '/herramientas',
  finance: '/finanzas',
  zen: '/zen',
  settings: '/ajustes',
};

/** Ruta -> id de vista (para marcar el menú activo y ajustar el layout). */
export function viewFromPath(pathname = '/') {
  const seg = '/' + (String(pathname).split('/')[1] || '');
  if (seg === '/') return 'home';
  const hit = Object.entries(PATHS).find(([, p]) => p === seg);
  // /perfil/:uid es el perfil de otra persona (vista "peer")
  if (hit?.[0] === 'profile' && String(pathname).split('/')[2]) return 'peer';
  return hit ? hit[0] : 'home';
}
