// Videos de la pantalla Zen (public/videos/zen-01.mp4 … zen-10.mp4).
// Etiquetas cortas: los nombres originales eran títulos largos sin valor descriptivo.
export const ZEN_VIDEOS = Array.from({ length: 10 }, (_, i) => {
  const n = `zen-${String(i + 1).padStart(2, '0')}.mp4`;
  return { file: n, src: `/videos/${n}`, label: `Zen ${i + 1}` };
});
