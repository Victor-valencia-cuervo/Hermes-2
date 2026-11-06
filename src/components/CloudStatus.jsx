import { Cloud, CloudOff, RefreshCw } from 'lucide-react';

/** Pastilla de estado nube: pendiente de subir + boton sincronizar.
 *  inline: para usar dentro de Ajustes junto al login (sin posicion fija). */
export default function CloudStatus({ sync, inline }) {
  if (!sync) return null;
  const { online, pending, syncing, configured, syncNow, lastSync } = sync;
  if (!configured) return null;

  const hour = lastSync
    ? new Date(lastSync).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <button
      onClick={() => syncNow()}
      title={pending ? `${pending} cambios por subir. Toca para sincronizar` : `Nube al dia${hour ? ` · ${hour}` : ''}`}
      className={inline
        ? 'flex items-center gap-2 px-3 py-2 rounded-full text-xs shrink-0'
        : 'fixed bottom-3 right-3 z-[60] flex items-center gap-2 px-3 py-2 rounded-full text-xs glass'}
      style={inline
        ? { background: 'var(--s2)', border: '1px solid var(--bd)' }
        : { border: '1px solid var(--bd)' }}
    >
      {online ? <Cloud size={14} style={{ color: 'var(--a)' }} /> : <CloudOff size={14} />}
      <span>
        {!online ? 'Offline' : pending ? `${pending} por subir` : 'Nube OK'}
      </span>
      {syncing
        ? <RefreshCw size={13} className="animate-spin" />
        : pending > 0 && online
          ? <RefreshCw size={13} />
          : null}
    </button>
  );
}
