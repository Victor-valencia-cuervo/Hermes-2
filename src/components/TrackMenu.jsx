import { useEffect, useState } from 'react';
import { Play, ListPlus, Heart, Radio, Download, ImageIcon, Trash2, Plus, X } from 'lucide-react';
import Cover from './Cover';

/**
 * Hoja inferior única para cualquier canción (Local / YouTube / Audius / playlist).
 * Se abre con ⋮ o con long-press. El tap en la fila reproduce; aquí van las opciones.
 */
export default function TrackMenu({ entry, p, toast, local, onAdd, onClose, onRadio, onDownload, onEnrich, onDelete, canRadio, canDownload, canEnrich, canDelete, addLabel }) {
  const t = entry?.t;
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => { setConfirmDel(false); }, [t?.id]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  if (!t) return null;
  const fav = p.isFav(t);
  const list = entry?.list || [];
  const asRadio = entry?.asRadio;

  const playNow = () => {
    if (typeof entry?.onPlay === 'function') { entry.onPlay(t); onClose?.(); return; }
    if (p.track?.id === t.id) p.openFull?.();
    else if (asRadio && p.playRadio) p.playRadio(t);
    else p.play(t, list.length ? list : undefined);
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-40 grid place-items-end sm:place-items-center p-4" role="dialog" aria-modal="true" aria-label={`Opciones de ${t.title}`}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative card w-full max-w-sm !rounded-3xl">
        <div className="flex items-center gap-3 mb-2">
          <Cover src={t.art} className="w-11 h-11 rounded-xl shrink-0" iconSize={17} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate" title={t.title}>{t.title}</p>
            <p className="text-xs truncate" style={{ color: 'var(--m)' }} title={t.artist}>{t.artist}</p>
          </div>
          <button className="ico-btn shrink-0" onClick={onClose} aria-label="Cerrar"><X size={17} /></button>
        </div>
        <div className="grid gap-1.5">
          <button className="btn w-full" onClick={playNow}>
            <Play size={15} /> Reproducir
          </button>
          <button className="btn btn-o w-full" onClick={() => { p.addNext?.(t); onClose?.(); }}>
            <ListPlus size={15} /> Suena después
          </button>
          <button className="btn btn-o w-full" onClick={() => { p.toggleFav(t); }}>
            <Heart size={15} fill={fav ? 'currentColor' : 'none'} /> {fav ? 'Quitar de Me gusta' : 'Me gusta'}
          </button>
          <button className="btn btn-o w-full" onClick={() => { onAdd?.(t); }}>
            <Plus size={15} /> {addLabel || 'Agregar a playlist'}
          </button>
          {(canRadio || t.videoId) && (
            <button className="btn btn-o w-full" onClick={() => { if (onRadio) onRadio(t); else p.startRadio?.(t); onClose?.(); }}>
              <Radio size={15} /> Iniciar radio
            </button>
          )}
          {(canDownload || onDownload) && (
            <button className="btn btn-o w-full" onClick={() => { onDownload?.(t); onClose?.(); }}>
              <Download size={15} /> {t.src ? 'Guardar en Local' : 'Descargar MP3 (web)'}
            </button>
          )}
          {(canEnrich || onEnrich) && (
            <button className="btn btn-o w-full" onClick={async () => {
              const fn = onEnrich || (async (x) => {
                if (!navigator.onLine) { toast?.('Necesitas wifi para buscar carátulas'); return; }
                toast?.('Buscando carátula…');
                const ok = await local?.enrichArt?.(x.id).catch(() => false);
                toast?.(ok ? 'Carátula real lista' : 'Sin carátula real, queda la generada');
              });
              await fn(t);
              onClose?.();
            }}>
              <ImageIcon size={15} /> Buscar carátula
            </button>
          )}
          {p.track?.id === t.id && p.toggleArt && (t.ytArt || t.origArt || /i\.ytimg\.com/.test(String(t.art || ''))) && (
            <button className="btn btn-o w-full" onClick={async () => {
              const r = await p.toggleArt();
              toast?.(r === 'yt' ? 'Carátula de YouTube' : r === 'original' ? 'Carátula original' : 'No hay otra carátula disponible');
              onClose?.();
            }}>
              <ImageIcon size={15} /> {t.artOriginal ? 'Revertir a carátula de YouTube' : 'Usar carátula original'}
            </button>
          )}
          {(canDelete || onDelete) && (
            <button className="btn btn-o w-full" style={confirmDel ? { borderColor: '#ef4444', color: '#ef4444' } : undefined}
              onClick={() => {
                if (!confirmDel) { setConfirmDel(true); toast?.('Toca de nuevo para eliminar de verdad'); return; }
                if (onDelete) onDelete(t);
                else local?.removeTrack?.(t.id);
                onClose?.();
              }}>
              <Trash2 size={15} /> {confirmDel ? '¿Eliminar de verdad?' : 'Eliminar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
