import { useEffect } from 'react';
import { X, ExternalLink, Music2, Link2, AlertTriangle } from 'lucide-react';
import Cover from './Cover';

/**
 * Panel in-app para el video que prohíbe reproducción externa.
 * No se puede incrustar (YouTube lo bloquea), así que se muestra
 * como mini-navegador: portada, datos y salidas oficiales.
 * La música sigue sonando con el siguiente por debajo.
 */
export default function BlockedSheet({ p, toast, onClose }) {
  const b = p.blocked;
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  if (!b) return null;

  const watchUrl = b.videoId
    ? `https://www.youtube.com/watch?v=${b.videoId}`
    : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${b.artist} ${b.title}`.trim())}`;
  const musicUrl = b.videoId
    ? `https://music.youtube.com/watch?v=${b.videoId}`
    : watchUrl;
  const thumb = b.videoId ? `https://i.ytimg.com/vi/${b.videoId}/hqdefault.jpg` : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(watchUrl);
      toast?.('Enlace copiado');
    } catch {
      toast?.('No se pudo copiar', AlertTriangle);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center p-4" role="dialog" aria-modal="true" aria-label="Video solo en YouTube">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative card w-full max-w-md !rounded-3xl sheet">
        <div className="flex items-center justify-between mb-3">
          <p className="flex items-center gap-2 text-sm font-bold">
            <AlertTriangle size={15} style={{ color: 'var(--a)' }} /> Solo en YouTube
          </p>
          <button className="ico-btn" onClick={onClose} aria-label="Cerrar"><X size={17} /></button>
        </div>

        <div className="rounded-2xl overflow-hidden relative">
          <Cover src={thumb} className="w-full aspect-video" iconSize={40} />
          <span className="absolute bottom-2 right-2 text-[10px] px-2 py-1 rounded-full text-white bg-black/60">
            El dueño no permite verlo aquí
          </span>
        </div>

        <p className="font-semibold mt-3 leading-snug">{b.title}</p>
        {!!b.artist && <p className="text-xs mt-0.5" style={{ color: 'var(--m)' }}>{b.artist}</p>}

        <div className="grid gap-2 mt-4">
          <a href={watchUrl} target="_blank" rel="noopener noreferrer" className="btn w-full">
            <ExternalLink size={15} /> Abrir en YouTube
          </a>
          <div className="flex gap-2">
            <a href={musicUrl} target="_blank" rel="noopener noreferrer" className="btn btn-o flex-1">
              <Music2 size={15} /> Music
            </a>
            <button className="btn btn-o flex-1" onClick={copy}>
              <Link2 size={15} /> Copiar enlace
            </button>
          </div>
        </div>
        <p className="text-[11px] mt-3 text-center" style={{ color: 'var(--m)' }}>
          {p.stuck
            ? 'Se pausó el avance tras varios bloqueos — dale siguiente o abre en YouTube'
            : 'Tu música sigue sonando con el siguiente tema'}
        </p>
      </div>
    </div>
  );
}
