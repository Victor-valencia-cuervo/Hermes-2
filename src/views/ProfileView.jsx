import { useEffect, useMemo, useState } from 'react';
import {
  Pencil, Play, Pause, Disc3, Clock3, Users, Heart, Lock, Globe,
  UserRound, ChevronRight, X, ListMusic, Flame, Upload, Trash2,
} from 'lucide-react';
import Title from '../components/Title';
import Cover from '../components/Cover';
import TrackRow from '../components/TrackRow';
import usePlaylists from '../hooks/usePlaylists';
import useProfile from '../hooks/useProfile';
import useListeningStats, { topTracks, fmtHours } from '../hooks/useListeningStats';
import { getFollowCounts, subscribeFollows } from '../services/social';

const VINYL_STYLES = {
  classic: { label: 'Clásico', groove: 'repeating-radial-gradient(circle at center, #1a161d 0 2px, #070608 2px 4px)' },
  neon: { label: 'Neón', groove: 'repeating-radial-gradient(circle at center, #0b1020 0 2px, #02030a 2px 4px)' },
  galaxy: { label: 'Galaxia', groove: 'repeating-radial-gradient(circle at center, #1b1033 0 2px, #07040f 2px 4px)' },
  gold: { label: 'Dorado', groove: 'repeating-radial-gradient(circle at center, #2a2210 0 2px, #0b0904 2px 4px)' },
};

/** Vinilo: surcos, brillo, etiqueta con el color/inicial de la playlist y giro opcional. */
function Vinyl({ color, size = 72, style = 'classic', label = '', spin = false }) {
  const v = VINYL_STYLES[style] || VINYL_STYLES.classic;
  const c = /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : '#6366f1';
  const ring = style === 'neon' ? `0 0 ${size / 4}px ${c}aa, 0 0 2px ${c}` : style === 'gold' ? '0 0 0 2px #d4af37' : 'none';
  return (
    <div className="relative rounded-full shrink-0" style={{
      width: size, height: size, boxShadow: `0 10px 24px rgba(0,0,0,.5), ${ring}`,
      animation: spin ? 'vinylspin 5s linear infinite' : undefined,
    }}>
      <div className="absolute inset-0 rounded-full" style={{ background: v.groove }} />
      {style === 'galaxy' && (
        <div className="absolute inset-0 rounded-full opacity-60" style={{ background: `conic-gradient(from 30deg, ${c}00, ${c}99, #ec489900, #06b6d488, ${c}00)` }} />
      )}
      {/* brillo */}
      <div className="absolute inset-0 rounded-full pointer-events-none" style={{ background: 'conic-gradient(from 0deg, transparent 0 20%, rgba(255,255,255,.14) 25%, transparent 30% 70%, rgba(255,255,255,.1) 75%, transparent 80%)' }} />
      <div className="absolute rounded-full grid place-items-center text-white font-bold" style={{
        inset: '31%', background: `radial-gradient(circle at 30% 30%, ${c}, ${c}bb)`, border: '2px solid rgba(0,0,0,.65)',
        fontSize: Math.max(8, size * 0.15),
      }}>
        {label}
      </div>
      <div className="absolute rounded-full" style={{
        width: size * 0.07, height: size * 0.07, left: '50%', top: '50%', marginLeft: -size * 0.035, marginTop: -size * 0.035,
        background: '#0a0a0a', border: '1.5px solid rgba(255,255,255,.3)',
      }} />
    </div>
  );
}

/** Duracion estimada: suma real si hay datos, ~3.5 min por tema si no. */
function plDuration(tracks) {
  const list = Array.isArray(tracks) ? tracks : [];
  if (!list.length) return '0 temas';
  let secs = 0;
  let known = 0;
  for (const t of list) {
    const d = Number(t?.duration);
    if (Number.isFinite(d) && d > 0) {
      secs += d;
      known++;
    }
  }
  const est = known === 0;
  if (est) secs = list.length * 210;
  const m = Math.round(secs / 60);
  const h = Math.floor(m / 60);
  const txt = h ? `${h} h ${m % 60} min` : `${Math.max(1, m)} min`;
  return `${list.length} temas · ${est ? '~' : ''}${txt}`;
}

function Switch({ on, onChange, label }) {
  return (
    <button onClick={() => onChange(!on)} role="switch" aria-checked={!!on} aria-label={label}
      className="w-12 h-7 rounded-full relative transition-colors shrink-0"
      style={{ background: on ? 'var(--a)' : 'var(--s2)', border: '1px solid var(--bd)' }}>
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-0.5'}`} />
    </button>
  );
}

const TABS = [
  { id: 'playlists', label: 'Playlists', I: ListMusic },
  { id: 'top', label: 'Top 3', I: Flame },
  { id: 'favs', label: 'Favoritas', I: Heart },
];

export default function ProfileView({ p, toast, name, setName, auth, cloud }) {
  const pls = usePlaylists(toast);
  const prof = useProfile(name, auth);
  const listenMs = useListeningStats(p?.playing, p?.history);
  const [tab, setTab] = useState('playlists');
  const [editOpen, setEditOpen] = useState(false);
  const [selPl, setSelPl] = useState(null);
  const [metaPl, setMetaPl] = useState(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  useEffect(() => { setConfirmDel(false); }, [selPl]);

  const uid = auth?.user?.id || null;
  useEffect(() => {
    if (!uid) {
      setCounts({ followers: 0, following: 0 });
      return undefined;
    }
    let dead = false;
    const load = () => getFollowCounts(uid).then((c) => { if (!dead) setCounts(c); }).catch(() => {});
    load();
    const off = subscribeFollows(load);
    return () => { dead = true; off(); };
  }, [uid]);

  const top = useMemo(() => topTracks(p?.history, 3), [p?.history]);
  const favs = p?.favs || [];
  const published = pls.playlists.filter((x) => x.isPublic);
  const drafts = pls.playlists.filter((x) => !x.isPublic);
  const now = p?.track || null;

  const visBadge = prof.visibility === 'private'
    ? { I: Lock, label: 'Privado' }
    : prof.visibility === 'friends'
      ? { I: Users, label: 'Solo amigos' }
      : { I: Globe, label: 'Público' };

  return (
    <>
      <Title>Perfil</Title>

      {/* Hero */}
      <div className="card !p-0 overflow-hidden">
        <div className="relative h-24" style={{ background: 'linear-gradient(135deg, var(--a), #0b0b12)' }}>
          {prof.avatar && <img src={prof.avatar} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xl scale-125" />}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--s))' }} />
          <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full backdrop-blur-md text-white" style={{ background: 'rgba(0,0,0,.35)' }}>
            <visBadge.I size={11} />{visBadge.label}
          </span>
        </div>
        <div className="px-4 pb-4 -mt-10 relative">
          <div className="flex items-end gap-3">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full p-[3px]" style={{ background: 'var(--a)', boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
                {prof.avatar
                  ? <img src={prof.avatar} alt={name || 'Perfil'} className="w-full h-full object-cover rounded-full" style={{ border: '3px solid var(--s)' }} />
                  : <div className="w-full h-full rounded-full grid place-items-center" style={{ background: 'var(--s2)' }}><UserRound size={30} style={{ color: 'var(--m)' }} /></div>}
              </div>
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500" style={{ border: '2px solid var(--s)' }} title="En línea" />
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <p className="serif text-2xl font-semibold leading-tight truncate">{name || 'Sin nombre'}</p>
              <p className="text-xs" style={{ color: 'var(--a)' }}>{prof.handle}</p>
            </div>
          </div>
          {prof.bio
            ? <p className="text-sm mt-3 italic" style={{ color: 'var(--m)' }}>&ldquo;{prof.bio}&rdquo;</p>
            : <p className="text-xs mt-3" style={{ color: 'var(--m)' }}>Agrega tu bio musical…</p>}
          <div className="flex gap-2 mt-4">
            <button className="btn btn-o flex-1" onClick={() => setEditOpen(true)}><Pencil size={15} /> Editar perfil</button>
            {!uid && (
              <button className="btn flex-1" onClick={() => auth?.login?.()} disabled={!cloud?.configured}>
                Entrar con Google
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      {prof.showStats && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { I: Clock3, v: fmtHours(listenMs), l: 'Música' },
            { I: Disc3, v: String(published.length), l: 'Publicadas' },
            { I: Users, v: String(counts.followers), l: 'Seguidores' },
            { I: Heart, v: String(favs.length), l: 'Favoritas' },
          ].map(({ I, v, l }) => (
            <div key={l} className="rounded-2xl py-3 text-center" style={{ background: 'linear-gradient(160deg, color-mix(in srgb, var(--a) 22%, var(--s)), var(--s))', border: '1px solid var(--bd)' }}>
              <I size={15} className="mx-auto mb-1.5" style={{ color: 'var(--a)' }} />
              <p className="text-base font-semibold leading-none">{v}</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--m)' }}>{l}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sonando ahora */}
      {prof.showNow && now && (() => {
        const dur = Number(now.duration) || 0;
        const pct = dur > 0 ? Math.min(100, Math.max(0, ((Number(p.time) || 0) / dur) * 100)) : 0;
        return (
          <div className="relative rounded-3xl overflow-hidden" style={{ border: '1px solid var(--bd)' }}>
            {now.art && <img src={now.art} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-50" />}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, rgba(0,0,0,.55), rgba(0,0,0,.2))' }} />
            <div className="relative p-3.5 flex items-center gap-3.5 text-white">
              <div className="relative shrink-0">
                <Cover src={now.art} className="w-16 h-16 rounded-2xl shadow-xl" iconSize={24} />
                {p.playing && (
                  <span className="absolute -bottom-1.5 -right-1.5 flex items-end gap-[2px] h-4 px-1.5 py-1 rounded-full" style={{ background: 'var(--a)' }} aria-hidden>
                    {[0, 1, 2].map((i) => <i key={i} className="w-[3px] rounded-full bg-white" style={{ height: '100%', animation: `eq 0.9s ${i * 0.15}s ease-in-out infinite alternate` }} />)}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-1.5 opacity-90">
                  {p.playing && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                  {p.playing ? 'Sonando ahora' : 'En pausa'}
                </p>
                <p className="serif text-lg font-semibold leading-tight truncate">{now.title}</p>
                <p className="text-xs truncate opacity-80">{now.artist}</p>
                {dur > 0 && (
                  <div className="mt-2 h-1 rounded-full bg-white/20 overflow-hidden"><div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} /></div>
                )}
              </div>
              <button className="w-11 h-11 rounded-full grid place-items-center shrink-0 text-white" style={{ background: 'var(--a)' }}
                onClick={() => p.toggle?.()} aria-label={p.playing ? 'Pausar' : 'Continuar'}>
                {p.playing ? <Pause size={20} /> : <Play size={20} />}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ id, label, I }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition ${tab === id ? 'text-white' : ''}`}
            style={tab === id ? { background: 'var(--a)' } : { background: 'var(--s2)', color: 'var(--m)' }}>
            <I size={14} />{label}
          </button>
        ))}
      </div>

      {/* Playlists con vinilo personalizado */}
      {tab === 'playlists' && (
        <div className="grid grid-cols-2 gap-3">
          {!!drafts.length && (
            <p className="col-span-2 text-[10px] font-bold tracking-[0.2em] uppercase px-1" style={{ color: 'var(--m)' }}>
              Borradores · se publican desde el detalle
            </p>
          )}
          {[...drafts, ...published].map((pl) => {
            const c = /^#[0-9a-fA-F]{6}$/.test(pl.color || '') ? pl.color : '#6366f1';
            const playingHere = !!p?.playing && (pl.tracks || []).some((t) => t.id === p?.track?.id);
            return (
              <div key={pl.id} className="relative rounded-3xl overflow-hidden group"
                style={{ background: `linear-gradient(160deg, ${c}55, var(--s) 70%)`, border: '1px solid var(--bd)' }}>
                <button onClick={() => setSelPl(pl.id)} className="block w-full text-left p-3 pb-3.5" aria-label={`Abrir ${pl.name}`}>
                  <div className="relative h-28 mb-2.5">
                    <Cover src={(pl.tracks || [])[0]?.art} className="absolute left-0 top-1 w-24 h-24 rounded-2xl shadow-xl" iconSize={26} />
                    <div className="absolute right-0 top-2 transition-transform group-hover:translate-x-1">
                      <Vinyl color={c} size={84} style={pl.vinyl} label={pl.label} spin={playingHere} />
                    </div>
                  </div>
                  <p className="text-sm font-semibold truncate">{pl.name}</p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--m)' }}>{plDuration(pl.tracks)}</p>
                  {!pl.isPublic && (
                    <span className="inline-block mt-1.5 text-[9px] px-1.5 py-0.5 rounded-md font-semibold" style={{ background: 'var(--s2)', color: 'var(--m)' }}>Borrador</span>
                  )}
                </button>
                <button className="ico-btn absolute top-2 right-2 !bg-black/30 backdrop-blur-md !text-white" onClick={() => setMetaPl(pl.id)} aria-label={`Editar ${pl.name}`}><Pencil size={14} /></button>
              </div>
            );
          })}
          {!pls.playlists.length && (
            <div className="card text-center col-span-2">
              <Disc3 size={26} className="mx-auto mb-2" style={{ color: 'var(--a)' }} />
              <p className="text-sm font-semibold">Sin playlists todavía</p>
              <p className="text-xs" style={{ color: 'var(--m)' }}>Créalas en Música: nacen como borrador y las publicas aquí.</p>
            </div>
          )}
        </div>
      )}

      {/* Top 3 (historial, se puede vaciar) */}
      {tab === 'top' && (
        <div className="grid gap-3 w-full max-w-full min-w-0 overflow-hidden">
          <div className="flex items-center justify-between px-1 min-w-0">
            <p className="text-xs truncate" style={{ color: 'var(--m)' }}>Las que más repites</p>
            {!!(p?.history || []).length && (
              <button className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full shrink-0" style={{ background: 'var(--s2)', color: 'var(--m)' }}
                onClick={() => { p.clearHistory?.(); toast?.('Historial vaciado'); }}>
                <Trash2 size={12} /> Vaciar historial
              </button>
            )}
          </div>
          {!top.length && <div className="card"><p className="text-sm" style={{ color: 'var(--m)' }}>Escucha algo y aquí sale tu top 3.</p></div>}
          {!!top.length && (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {top.map(({ track, plays }, i) => {
                const medal = ['#facc15', '#cbd5e1', '#d97706'][i] || '#a1a1aa';
                return (
                  <button key={track.id} onClick={() => p.play(track, top.map((x) => x.track))}
                    className="text-center group min-w-[9rem] w-[9rem] sm:min-w-[10rem] sm:w-[10rem] shrink-0 snap-center"
                    aria-label={`Reproducir ${track.title}`} title={`${track.title} — ${track.artist}`}>
                    <div className="relative w-[9rem] h-[9rem] sm:w-[10rem] sm:h-[10rem] rounded-3xl overflow-hidden shadow-xl transition-transform group-hover:-translate-y-0.5 group-active:scale-[.97]">
                      <Cover src={track.art} className="w-full h-full" iconSize={26} />
                      <span className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full grid place-items-center text-xs font-extrabold text-black" style={{ background: medal, boxShadow: `0 4px 12px ${medal}88` }}>{i + 1}</span>
                      <span className="absolute bottom-1.5 right-1.5 text-[10px] px-2 py-0.5 rounded-full text-white font-semibold" style={{ background: 'rgba(0,0,0,.6)' }}>{plays} {plays === 1 ? 'vez' : 'veces'}</span>
                    </div>
                    <p className="text-xs font-semibold mt-2 px-1 line-clamp-2 min-h-[2em]">{track.title}</p>
                    <p className="text-[10px] px-1 truncate" style={{ color: 'var(--m)' }}>{track.artist}</p>
                  </button>
                );
              })}
            </div>
          )}
          {!!top.length && (
            <div className="card !p-2">
              {top.map(({ track }) => <TrackRow key={track.id} t={track} p={p} list={top.map((x) => x.track)} />)}
            </div>
          )}
        </div>
      )}

      {/* Favoritas (se pueden quitar todas) */}
      {tab === 'favs' && (
        <div className="card !p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs" style={{ color: 'var(--m)' }}>{favs.length} guardadas</p>
            {!!favs.length && (
              <button className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full" style={{ background: 'var(--s2)', color: 'var(--m)' }}
                onClick={() => p.clearFavs?.()}>
                <Trash2 size={12} /> Quitar todas
              </button>
            )}
          </div>
          {!favs.length && <p className="text-sm p-3" style={{ color: 'var(--m)' }}>Dale corazón a lo que te guste y sale aquí.</p>}
          {favs.map((t) => <TrackRow key={t.id} t={t} p={p} list={favs} />)}
        </div>
      )}

      {/* Detalle de playlist */}
      {selPl && (() => {
        const pl = pls.playlists.find((x) => x.id === selPl);
        if (!pl) return null;
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setSelPl(null)}>
            <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85dvh] flex flex-col sheet" style={{ background: 'var(--s)', border: '1px solid var(--bd)' }} onClick={(e) => e.stopPropagation()}>
              <div className="p-5 rounded-t-3xl relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${pl.color}, #101014)` }}>
                <button className="absolute top-3 right-3 ico-btn !text-white" onClick={() => setSelPl(null)} aria-label="Cerrar"><X size={18} /></button>
                <div className="flex items-center gap-4">
                  <Vinyl color={pl.color} size={96} style={pl.vinyl} label={pl.label} spin={!!p?.playing && (pl.tracks || []).some((t) => t.id === p?.track?.id)} />
                  <div className="min-w-0 text-white">
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase opacity-80">
                      {pl.isPublic ? 'Playlist publicada' : 'Borrador · solo tú la ves'}
                    </p>
                    <p className="serif text-2xl font-semibold leading-tight truncate">{pl.name}</p>
                    <p className="text-xs opacity-80">{plDuration(pl.tracks)}</p>
                  </div>
                </div>
                {pl.description && <p className="text-xs text-white/85 mt-3">{pl.description}</p>}
              </div>
              <div className="p-3 overflow-y-auto flex-1">
                {!(pl.tracks || []).length && <p className="text-sm p-3" style={{ color: 'var(--m)' }}>Vacía por ahora.</p>}
                {(pl.tracks || []).map((t) => <TrackRow key={t.id} t={t} p={p} list={pl.tracks} />)}
              </div>
              <div className="p-3 grid gap-2" style={{ borderTop: '1px solid var(--bd)' }}>
                {!pl.isPublic ? (
                  <button className="btn w-full" onClick={() => pls.publish(pl.id)}>
                    <Upload size={15} /> Publicar playlist
                  </button>
                ) : (
                  <button className="btn w-full" disabled={!(pl.tracks || []).length}
                    onClick={() => { p.play(pl.tracks[0], pl.tracks); setSelPl(null); }}>
                    <Play size={15} /> Reproducir
                  </button>
                )}
                <div className="flex gap-2">
                  <button className="btn btn-o flex-1" onClick={() => { setSelPl(null); setMetaPl(pl.id); }}><Pencil size={15} /> Editar</button>
                  {pl.isPublic && (
                    <button className="btn btn-o flex-1" onClick={() => pls.updateMeta(pl.id, { isPublic: false })}>
                      Pasar a borrador
                    </button>
                  )}
                  <button
                    className="btn btn-o flex-1"
                    style={confirmDel ? { borderColor: '#ef4444', color: '#ef4444' } : undefined}
                    onClick={() => {
                      if (!confirmDel) {
                        setConfirmDel(true);
                        toast?.('Toca de nuevo para eliminar de verdad');
                        return;
                      }
                      pls.remove(pl.id);
                      setSelPl(null);
                    }}>
                    <Trash2 size={15} /> {confirmDel ? '¿Eliminar?' : 'Eliminar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Editar playlist: nombre, descripcion, color libre, publica/privada */}
      {metaPl && (() => {
        const pl = pls.playlists.find((x) => x.id === metaPl);
        if (!pl) return null;
        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setMetaPl(null)}>
            <div className="w-full max-w-md card sheet" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <p className="serif text-xl">Editar playlist</p>
                <button className="ico-btn" onClick={() => setMetaPl(null)} aria-label="Cerrar"><X size={18} /></button>
              </div>
              <div className="grid gap-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--m)' }}>Nombre</p>
                  <input className="inp" value={pl.name} maxLength={40} onChange={(e) => pls.updateMeta(pl.id, { name: e.target.value })} />
                </div>
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--m)' }}>Descripción (opcional)</p>
                  <textarea className="inp" rows={2} maxLength={140} value={pl.description || ''} placeholder="¿De qué va este vinilo?"
                    onChange={(e) => pls.updateMeta(pl.id, { description: e.target.value })} />
                </div>
                <div className="rounded-2xl p-3 grid gap-3" style={{ background: 'var(--s2)' }}>
                  <div className="flex items-center gap-4">
                    <Vinyl color={pl.color} size={84} style={pl.vinyl} label={pl.label} spin />
                    <div className="flex-1 min-w-0 grid gap-2">
                      <div className="flex items-center gap-2">
                        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(pl.color || '') ? pl.color : '#6366f1'}
                          onChange={(e) => pls.updateMeta(pl.id, { color: e.target.value })} aria-label="Color del vinilo"
                          className="w-10 h-10 rounded-xl cursor-pointer shrink-0" style={{ background: 'var(--s)', border: '1px solid var(--bd)', padding: 2 }} />
                        <input className="inp !py-2 w-16 text-center" value={pl.label || ''} maxLength={3} placeholder="Aa"
                          onChange={(e) => pls.updateMeta(pl.id, { label: e.target.value })} aria-label="Texto de la etiqueta" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['#6366f1', '#ec4899', '#f97316', '#22c55e', '#06b6d4', '#ef4444', '#eab308'].map((c) => (
                          <button key={c} onClick={() => pls.updateMeta(pl.id, { color: c })} aria-label={`Color ${c}`}
                            className="w-6 h-6 rounded-full" style={{ background: c, boxShadow: pl.color === c ? `0 0 0 2px var(--s2), 0 0 0 4px ${c}` : 'none' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs mb-1.5" style={{ color: 'var(--m)' }}>Estilo del vinilo</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {Object.entries(VINYL_STYLES).map(([id, v]) => (
                        <button key={id} onClick={() => pls.updateMeta(pl.id, { vinyl: id })}
                          className="py-2 rounded-xl text-[11px] font-semibold transition"
                          style={(pl.vinyl || 'classic') === id ? { background: 'var(--a)', color: '#fff' } : { background: 'var(--s)', color: 'var(--m)' }}>
                          {v.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm flex items-center gap-2">
                    {pl.isPublic ? <Globe size={16} style={{ color: 'var(--a)' }} /> : <Lock size={16} style={{ color: 'var(--m)' }} />}
                    {pl.isPublic ? 'Pública (cuenta en tu perfil)' : 'Privada (solo tú)'}
                  </span>
                  <Switch on={pl.isPublic} onChange={(v) => pls.updateMeta(pl.id, { isPublic: v })} label="Playlist pública" />
                </div>
                <button className="btn w-full" onClick={() => { setMetaPl(null); toast?.('Playlist actualizada'); }}>Listo</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Editar perfil */}
      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditOpen(false)}>
          <div className="w-full max-w-md card sheet" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="serif text-xl">Editar perfil</p>
              <button className="ico-btn" onClick={() => setEditOpen(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <div className="grid gap-3">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--m)' }}>Nombre</p>
                <input className="inp" value={name} maxLength={60} placeholder="Tu nombre"
                  onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--m)' }}>Usuario (handle)</p>
                <input className="inp font-mono" value={prof.handle} maxLength={40} placeholder="@tu_handle"
                  onChange={(e) => {
                    const v = e.target.value.trim().replace(/\s+/g, '_');
                    prof.setHandle(v && !v.startsWith('@') ? `@${v}` : v);
                  }} />
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--m)' }}>Bio / frase musical</p>
                <textarea className="inp" rows={2} maxLength={160} value={prof.bio} placeholder="¿Qué música te mueve?"
                  onChange={(e) => prof.setBio(e.target.value)} />
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--m)' }}>Foto (vacío = la de Google)</p>
                <input className="inp" maxLength={500} placeholder={prof.googleAvatar ? 'Usando tu foto de Google' : 'https://… (URL de tu foto)'}
                  defaultValue={prof.avatar && prof.avatar !== prof.googleAvatar ? prof.avatar : ''}
                  onBlur={(e) => prof.setAvatarUrl(e.target.value.trim())} />
              </div>
              <div className="rounded-2xl p-3" style={{ background: 'var(--s2)' }}>
                <p className="text-xs mb-2 font-semibold">Privacidad del perfil</p>
                <div className="grid grid-cols-3 gap-2 mb-1">
                  {[
                    { id: 'public', label: 'Público', I: Globe },
                    { id: 'friends', label: 'Amigos', I: Users },
                    { id: 'private', label: 'Privado', I: Lock },
                  ].map(({ id, label, I }) => (
                    <button key={id} onClick={() => prof.setVisibility(id)}
                      className={`flex flex-col items-center gap-1 py-2 rounded-xl text-[11px] font-semibold transition ${prof.visibility === id ? 'text-white' : ''}`}
                      style={prof.visibility === id ? { background: 'var(--a)' } : { background: 'var(--s)', color: 'var(--m)' }}>
                      <I size={15} />{label}
                    </button>
                  ))}
                </div>
                {[
                  { label: 'Mostrar estadísticas', value: prof.showStats, set: prof.setShowStats },
                  { label: 'Mostrar sonando ahora', value: prof.showNow, set: prof.setShowNow },
                ].map((r) => (
                  <div key={r.label} className="flex items-center justify-between py-2" style={{ borderTop: '1px solid var(--bd)' }}>
                    <span className="text-xs">{r.label}</span>
                    <Switch on={r.value} onChange={r.set} label={r.label} />
                  </div>
                ))}
              </div>
              <button className="btn w-full" onClick={() => { setEditOpen(false); toast?.('Perfil actualizado'); }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
