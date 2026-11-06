import { Play, Pause, Heart } from 'lucide-react';
import Cover from './Cover';

export default function RadioRow({ st, r }) {
  const active = r.current?.uuid === st.uuid;
  const fav = r.isFav(st);
  return (
    <div className={`flex items-center gap-3 p-2 rounded-2xl hover:bg-[var(--s2)] ${active ? 'acc-soft' : ''}`}>
      <Cover src={st.art} className="w-12 h-12 rounded-xl" />
      <button onClick={() => r.play(st)} className="flex-1 min-w-0 text-left">
        <p className="text-sm truncate" style={{ color: active ? 'var(--a)' : undefined }}>{st.name}</p>
        <p className="text-xs truncate" style={{ color: 'var(--m)' }}>
          {[st.country, st.language, (st.tags || []).slice(0, 2).join(' · ')].filter(Boolean).join(' · ')}
        </p>
      </button>
      <button className="ico-btn" onClick={() => r.play(st)}
        aria-label={active && r.playing ? 'Pausar' : 'Escuchar'}>
        {active && r.playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <button className="ico-btn" onClick={() => r.toggleFav(st)} aria-label="Favorita">
        <Heart size={18} fill={fav ? 'var(--a)' : 'none'} style={{ color: fav ? 'var(--a)' : undefined }} />
      </button>
    </div>
  );
}
