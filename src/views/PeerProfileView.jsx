import { useEffect, useState } from 'react';
import {
  Play, Heart, Copy, UserRound, ListMusic,
  Loader2, MessageCircle, Disc3, Users,
} from 'lucide-react';
import Title from '../components/Title';
import Cover from '../components/Cover';
import usePlaylists from '../hooks/usePlaylists';
import {
  loadProfileCloud, getFollowCounts, followUser, unfollowUser,
  isFollowing, loadPeerPlaylists, trackFromRow, getOrCreateDM,
} from '../services/social';
import { resolveOfficial } from '../services/youtube';

/** Perfil ajeno en pantalla completa, igual que Mi perfil pero sin editar:
 * hero, stats, lo que escucha ahora, seguir, mensaje, publicadas y clonar. */
export default function PeerProfileView({ uid, p, toast, auth, onOpenRoom }) {
  const pls = usePlaylists(toast);
  const [prof, setProf] = useState(null);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });
  const [following, setFollowing] = useState(false);
  const [published, setPublished] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    let dead = false;
    setLoading(true);
    const load = async () => {
      const [pr, fo, ing, pubs] = await Promise.all([
        loadProfileCloud(uid).catch(() => null),
        getFollowCounts(uid).catch(() => ({ followers: 0, following: 0 })),
        isFollowing(uid).catch(() => false),
        loadPeerPlaylists(uid).catch(() => []),
      ]);
      if (dead) return;
      setProf(pr);
      setCounts(fo);
      setFollowing(ing);
      setPublished(pubs);
      setLoading(false);
    };
    load();
    const t = setInterval(load, 20000);
    return () => { dead = true; clearInterval(t); };
  }, [uid]);

  const toggleFollow = async () => {
    if (following) {
      await unfollowUser(uid).catch(() => {});
      setFollowing(false);
      setCounts((c) => ({ ...c, followers: Math.max(0, c.followers - 1) }));
    } else {
      const r = await followUser(uid).catch(() => ({ ok: false }));
      if (r?.ok) {
        setFollowing(true);
        setCounts((c) => ({ ...c, followers: c.followers + 1 }));
      } else toast?.('No se pudo seguir');
    }
  };

  const openDM = async () => {
    if (!auth?.user?.id) { toast?.('Entra con Google para chatear'); return; }
    const room = await getOrCreateDM(
      { id: uid, name: prof?.name, handle: prof?.handle }, auth.user.id,
    ).catch(() => null);
    if (room) onOpenRoom?.(room.id);
    else toast?.('No se pudo abrir el directo');
  };

  const playTrack = (t) => {
    if (!t) return;
    if (t.videoId || t.src) {
      if (p.playRadio && t.videoId) p.playRadio(t);
      else p.play(t, [t]);
    }
  };

  const playNow = async (np) => {
    if (!np) return;
    const t = trackFromRow({
      track_id: `np_${uid}_${np.videoId || 'a'}`,
      title: np.title, artist: np.artist, art: np.art,
      url: np.videoId || np.src || '', duration: np.duration || 0,
    });
    if (t.videoId || t.src) { playTrack(t); return; }
    toast?.('Buscando versión reproducible…');
    const r = await resolveOfficial(np.artist, np.title).catch(() => null);
    if (r) playTrack(r);
    else toast?.('No se encontró versión reproducible');
  };

  const playPublished = async (raw) => {
    const t = trackFromRow({
      track_id: raw.id || `pp_${Date.now().toString(36)}`,
      title: raw.title, artist: raw.artist, art: raw.art,
      url: raw.videoId || raw.src || raw.url || '', duration: raw.duration || 0,
    });
    if (t.videoId || t.src) { playTrack(t); return; }
    toast?.('Buscando versión reproducible…');
    const r = await resolveOfficial(t.artist, t.title, 4).catch(() => null);
    if (r) playTrack({ ...r, id: t.id });
    else toast?.('No se encontró versión reproducible');
  };

  const clone = async (pl) => {
    if (cloning) return;
    setCloning(pl.id);
    try {
      const created = pls.create(`${pl.name}`.slice(0, 30), { isPublic: false });
      if (!created) { toast?.('No se pudo clonar'); return; }
      let n = 0;
      for (const raw of (pl.tracks || []).slice(0, 25)) {
        const t = trackFromRow({
          track_id: raw.id || `c_${Date.now().toString(36)}_${n}`,
          title: raw.title, artist: raw.artist, art: raw.art,
          url: raw.videoId || raw.src || raw.url || '', duration: raw.duration || 0,
        });
        if (!t.videoId && !t.src && !t.title) continue;
        if (pls.addTrack(created.id, { ...t, id: t.id || `c_${n}` }, true)) n++;
      }
      toast?.(n ? `Clonada con ${n} temas (borrador)` : 'No se pudo clonar ningún tema');
    } finally {
      setCloning(null);
    }
  };

  const np = prof?.now_playing || null;
  const fresh = np && np.title && prof?.now_playing_at && Date.now() - Number(prof.now_playing_at) < 10 * 60 * 1000;
  const showNow = prof?.show_nowplaying !== false;

  return (
    <>
      <Title>Perfil</Title>

      {loading && <div className="card"><p className="text-sm text-center" style={{ color: 'var(--m)' }}>Cargando perfil…</p></div>}
      {!loading && !prof && <div className="card"><p className="text-sm text-center" style={{ color: 'var(--m)' }}>Ese perfil no está disponible.</p></div>}
      {!!prof && (
        <>
          {/* Hero */}
          <div className="card !p-0 overflow-hidden">
            <div className="relative h-24" style={{ background: 'linear-gradient(135deg, var(--a), #0b0b12)' }}>
              {prof.avatar && <img src={prof.avatar} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xl scale-125" />}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, var(--s))' }} />
            </div>
            <div className="px-4 pb-4 -mt-10 relative">
              <div className="flex items-end gap-3">
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-full p-[3px]" style={{ background: 'var(--a)', boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
                    {prof.avatar
                      ? <img src={prof.avatar} alt={prof.name || ''} className="w-full h-full object-cover rounded-full" style={{ border: '3px solid var(--s)' }} />
                      : <div className="w-full h-full rounded-full grid place-items-center" style={{ background: 'var(--s2)' }}><UserRound size={30} style={{ color: 'var(--m)' }} /></div>}
                  </div>
                  {np?.playing && fresh && (
                    <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 animate-pulse" style={{ border: '2px solid var(--s)' }} title="Escuchando ahora" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <p className="serif text-2xl font-semibold leading-tight truncate">{prof.name || prof.handle || 'Contacto'}</p>
                  {!!prof.handle && <p className="text-xs" style={{ color: 'var(--a)' }}>{prof.handle}</p>}
                </div>
              </div>
              {!!prof.bio && <p className="text-sm mt-3 italic" style={{ color: 'var(--m)' }}>&ldquo;{prof.bio}&rdquo;</p>}
              <div className="flex gap-2 mt-4">
                <button className={`flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold ${following ? '' : 'text-white'}`}
                  style={following ? { background: 'var(--s2)', color: 'var(--m)' } : { background: 'var(--a)' }}
                  onClick={toggleFollow}>
                  <Heart size={15} fill={following ? 'currentColor' : 'none'} />{following ? 'Siguiendo' : 'Seguir'}
                </button>
                <button className="btn btn-o flex-1" onClick={openDM}>
                  <MessageCircle size={15} /> Mensaje
                </button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { I: Disc3, v: String(published.length), l: 'Publicadas' },
              { I: Users, v: String(counts.followers), l: 'Seguidores' },
              { I: Heart, v: String(counts.following), l: 'Siguiendo' },
            ].map(({ I, v, l }) => (
              <div key={l} className="rounded-2xl py-3 text-center" style={{ background: 'linear-gradient(160deg, color-mix(in srgb, var(--a) 22%, var(--s)), var(--s))', border: '1px solid var(--bd)' }}>
                <I size={15} className="mx-auto mb-1.5" style={{ color: 'var(--a)' }} />
                <p className="text-base font-semibold leading-none">{v}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--m)' }}>{l}</p>
              </div>
            ))}
          </div>

          {/* Sonando ahora */}
          {showNow && (
            <div className="relative rounded-3xl overflow-hidden" style={{ border: '1px solid var(--bd)' }}>
              {np?.art && <img src={np.art} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-125 blur-2xl opacity-50" />}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, rgba(0,0,0,.55), rgba(0,0,0,.2))' }} />
              <div className="relative p-3.5 flex items-center gap-3.5 text-white">
                <div className="relative shrink-0">
                  <Cover src={np?.art} className="w-16 h-16 rounded-2xl shadow-xl" iconSize={24} />
                  {np?.playing && fresh && (
                    <span className="absolute -bottom-1.5 -right-1.5 flex items-end gap-[2px] h-4 px-1.5 py-1 rounded-full" style={{ background: 'var(--a)' }} aria-hidden>
                      {[0, 1, 2].map((i) => <i key={i} className="w-[3px] rounded-full bg-white" style={{ height: '100%', animation: `eq 0.9s ${i * 0.15}s ease-in-out infinite alternate` }} />)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-[0.2em] uppercase flex items-center gap-1.5 opacity-90">
                    {np?.playing && fresh && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    {np?.playing && fresh ? 'Escuchando ahora' : 'Último tema'}
                  </p>
                  <p className="serif text-lg font-semibold leading-tight truncate" title={np?.title}>{np?.title || 'Aún no comparte su música'}</p>
                  {!!np?.artist && <p className="text-xs truncate opacity-80" title={np.artist}>{np.artist}</p>}
                </div>
                {!!np?.title && (
                  <button className="w-11 h-11 rounded-full grid place-items-center shrink-0 text-white" style={{ background: 'var(--a)' }}
                    onClick={() => playNow(np)} aria-label={`Escuchar ${np.title}`}>
                    <Play size={20} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Publicadas */}
          <div className="card !p-2">
            <div className="flex items-center justify-between px-2 py-1">
              <p className="text-xs font-semibold">Publicadas · {published.length}</p>
            </div>
            {!published.length && <p className="text-sm p-3" style={{ color: 'var(--m)' }}>Sin playlists publicadas.</p>}
            {published.map((pl) => (
              <div key={pl.id} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-[var(--s2)]">
                {pl.tracks[0]?.art
                  ? <Cover src={pl.tracks[0].art} className="w-11 h-11 rounded-xl shrink-0" iconSize={17} />
                  : <span className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: 'var(--s2)' }}><ListMusic size={17} /></span>}
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium truncate" title={pl.name}>{pl.name}</span>
                  <span className="block text-xs" style={{ color: 'var(--m)' }}>{(pl.tracks || []).length} temas</span>
                </span>
                <button className="ico-btn shrink-0" aria-label={`Escuchar ${pl.name}`}
                  onClick={() => {
                    const list = (pl.tracks || []).map((raw, i) => trackFromRow({
                      track_id: raw.id || `pp_${i}`, title: raw.title, artist: raw.artist,
                      art: raw.art, url: raw.videoId || raw.src || raw.url || '', duration: raw.duration || 0,
                    })).filter((t) => t.videoId || t.src);
                    if (list.length) playTrack(list[0]);
                    else if ((pl.tracks || []).length) playPublished(pl.tracks[0]);
                    else toast?.('Sin temas reproducibles');
                  }}>
                  <Play size={17} />
                </button>
                <button className="btn !py-1.5 !px-3 text-[11px] shrink-0" disabled={cloning === pl.id}
                  onClick={() => clone(pl)} aria-label={`Clonar ${pl.name}`}>
                  {cloning === pl.id ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />} Clonar
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
