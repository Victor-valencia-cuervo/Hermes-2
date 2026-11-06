import { AlertTriangle, ExternalLink, X } from 'lucide-react';

/** Aviso con salida a YouTube para el tema que prohíbe el embed. */
export default function BlockedBar({ p }) {
  const b = p.blocked;
  if (!b) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-2xl border text-[13px] min-h-[52px]"
      role="alert"
      style={{ borderColor: 'var(--bd)', background: 'var(--s)' }}>
      <AlertTriangle size={16} className="shrink-0" style={{ color: 'var(--a)' }} aria-hidden="true" />
      <p className="flex-1 min-w-0 truncate" title={`${b.title} · solo en YouTube`}>
        <span className="font-medium">{b.title}</span>
        <span style={{ color: 'var(--m)' }}> · solo en YouTube</span>
      </p>
      <button className="btn !py-2 !px-3.5 !text-[12px] shrink-0 !min-h-[40px]" onClick={p.openBlocked}>
        <ExternalLink size={14} /> Ver
      </button>
      <button className="ico-btn shrink-0 !min-w-[40px] !min-h-[40px]" onClick={p.dismissBlocked} aria-label="Descartar aviso"><X size={16} /></button>
    </div>
  );
}
