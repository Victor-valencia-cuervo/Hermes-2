import { Play, ChevronLeft, MessageCircle, ListMusic } from 'lucide-react';
import Cover from '../../components/Cover';
import RoomIcon from '../../components/RoomIcon';

/** Tarjeta playlist: collage 2x2 con las 4 primeras carátulas agregadas. */
export function PlaylistCard({ pl, plays, onClick }) {
  const arts = (pl.tracks || []).slice(0, 4).map((t) => t.art);
  while (arts.length < 4) arts.push(null);
  return (
    <button onClick={onClick} className="min-w-[10.25rem] w-[10.25rem] sm:min-w-[12.5rem] sm:w-[12.5rem] text-left shrink-0 group">
      <div className="relative w-[10.25rem] h-[10.25rem] sm:w-[12.5rem] sm:h-[12.5rem] rounded-3xl overflow-hidden shadow-lg grid grid-cols-2 grid-rows-2 transition-transform group-hover:-translate-y-0.5 group-active:scale-[.97]" style={{ background: 'var(--s2)' }}>
        {arts.map((a, i) => (a
          ? <Cover key={i} src={a} className="w-full h-full min-w-0" iconSize={20} />
          : <div key={i} className="w-full h-full grid place-items-center" style={{ background: 'color-mix(in srgb, var(--a) 22%, var(--s2))' }}><ListMusic size={20} style={{ color: 'var(--a)' }} /></div>
        ))}
        <span className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity">
          <Play size={26} className="text-white" />
        </span>
      </div>
      <p className="text-[15px] font-semibold truncate mt-2">{pl.name}</p>
      <p className="text-[13px] truncate" style={{ color: 'var(--m)' }}>
        {(pl.tracks || []).length} temas{(plays || 0) > 0 ? ` · ${plays} escuchas` : ''}
      </p>
    </button>
  );
}

/** Tarjeta de playlist de sala: tocarla abre la lista de una;
 * los otros dos botones (escuchar / chatear) van encogidos. */
export function RoomPlCard({ pl, peer, myAvatar, onOpen, onPlay, onChat }) {
  const isDuo = pl.kind === 'dm';
  const title = isDuo ? (peer?.name || peer?.handle || pl.name) : pl.name;
  return (
    <div className="min-w-[13rem] w-[13rem] sm:min-w-[14rem] sm:w-[14rem] shrink-0 card !p-3 flex flex-col gap-2.5">
      <button onClick={onOpen} className="flex items-center gap-2.5 text-left active:opacity-70" aria-label={`Abrir ${title}`}>
        {isDuo ? (
          <span className="flex items-center shrink-0" aria-hidden="true">
            <AvatarImg src={myAvatar} label="Tú" size={40} />
            <AvatarImg src={peer?.avatar} label={title} size={40} overlap />
          </span>
        ) : (
          <RoomIcon room={{ icon: pl.icon, color: pl.color }} size={44} radius={16} />
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold truncate" title={title}>{title}</span>
          <span className="block text-[11px] truncate" style={{ color: 'var(--m)' }}>
            {isDuo ? 'De a 2' : 'Grupo'}{` · ${(pl.tracks || []).length} temas`}
          </span>
        </span>
        <ChevronLeft size={16} className="rotate-180 shrink-0" style={{ color: 'var(--m)' }} />
      </button>
      <div className="flex gap-2">
        <button className="ico-btn shrink-0" onClick={onPlay} aria-label={`Escuchar ${title}`} title="Escuchar">
          <Play size={16} />
        </button>
        <button className="ico-btn shrink-0" onClick={onChat} aria-label={`Chatear en ${title}`} title="Chatear" style={{ color: 'var(--a)' }}>
          <MessageCircle size={16} />
        </button>
        <button className="btn btn-o flex-1 !py-1.5 !px-3 text-[11px]" onClick={onOpen}>
          Abrir playlist
        </button>
      </div>
    </div>
  );
}

export function AvatarImg({ src, label, size = 40, overlap = false }) {
  const st = { width: size, height: size, ...(overlap ? { marginLeft: -size * 0.35, border: '2px solid var(--s)' } : {}) };
  if (src) return <img src={src} alt={label || ''} loading="lazy" className="rounded-full object-cover" style={st} />;
  return (
    <span className="rounded-full grid place-items-center text-white font-bold shrink-0"
      style={{ ...st, background: 'linear-gradient(135deg, var(--a), #4c1d95)', fontSize: size * 0.4 }}>
      {(String(label || '?').trim()[0] || '?').toUpperCase()}
    </span>
  );
}

