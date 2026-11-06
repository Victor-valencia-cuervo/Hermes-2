// ¿Esta canción sigue sonando con la pantalla apagada / en otra app?
//  bg  → audio normal (Audius, archivos locales…): el sistema lo deja sonar en segundo plano.
//  fg  → YouTube embebido: se pausa al ocultar la página (política de YouTube).
export const playMode = (t) => (t && t.source === 'YouTube' && t.videoId ? 'fg' : 'bg');
