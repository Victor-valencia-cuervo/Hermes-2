// Herramientas web externas para bajar MP3 de YouTube.
// La app es 100% estática: no puede descargar de YouTube por sí misma, así que
// copia el link y abre la herramienta; el usuario baja el MP3 en su carpeta
// escaneada y el auto-rescan lo importa solo al entrar.

export const DL_TOOLS = {
  savefrom: { name: 'SaveFrom', url: 'https://es.savefrom.net/21-youtube-to-mp4-32xm.html' },
  y2mate: { name: 'Y2Mate', url: 'https://y2mate.gs/es/' },
};

export const videoUrlOf = (t) => {
  if (!t) return '';
  if (t.videoId) return `https://www.youtube.com/watch?v=${t.videoId}`;
  const m = String(t.src || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube.com/watch?v=${m[1]}` : '';
};
