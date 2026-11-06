import { useEffect, useState } from 'react';
import { Users, ListMusic, Plus, Search, Lock, ChevronRight, X, UserRound, MessageCircle, LogIn, Heart, Eye } from 'lucide-react';
import Title from '../components/Title';
import RoomIcon, { ROOM_ICONS, ROOM_COLORS } from '../components/RoomIcon';
import useRooms from '../hooks/useRooms';
import { loadMembers, followUser, unfollowUser, subscribeFollows, getOrCreateDM, loadProfileCloud, getFollowCounts } from '../services/social';

function MemberRow({ m, onToggle, onMessage, onProfile }) {
  return (
    <div className="card !p-3 flex items-center gap-3">
      <button onClick={() => onProfile(m)} className="w-11 h-11 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--s2)' }} aria-label={`Ver perfil de ${m.name || m.handle}`}>
        {m.avatar
          ? <img src={m.avatar} alt={m.name || m.handle} className="w-full h-full object-cover" />
          : <div className="w-full h-full grid place-items-center"><UserRound size={20} style={{ color: 'var(--m)' }} /></div>}
      </button>
      <button onClick={() => onProfile(m)} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold truncate">{m.name || m.handle || 'Sin nombre'}</p>
        <p className="text-[11px] truncate" style={{ color: 'var(--m)' }}>
          {m.handle || ''}{m.followers > 0 || m.following > 0 ? ` · ${m.followers} seguidores` : ''}
        </p>
        {m.bio ? <p className="text-xs truncate italic" style={{ color: 'var(--m)' }}>&ldquo;{m.bio}&rdquo;</p> : null}
      </button>
      <button className="ico-btn shrink-0" onClick={() => onMessage(m)} aria-label={`Mensaje a ${m.name || m.handle}`} title="Mensaje directo" style={{ color: 'var(--a)' }}>
        <MessageCircle size={18} />
      </button>
      <button
        className={m.followed ? 'btn btn-o !py-2 !px-3 !text-xs shrink-0' : 'btn !py-2 !px-3 !text-xs shrink-0'}
        onClick={() => onToggle(m)}>
        {m.followed ? 'Siguiendo' : 'Seguir'}
      </button>
    </div>
  );
}

export default function CommunityView({ toast, auth, p, onOpenRoom, onOpenPeer }) {
  const { rooms, create } = useRooms(toast);
  const [tab, setTab] = useState('rooms');
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Form crear sala
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [genre, setGenre] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [icon, setIcon] = useState(ROOM_ICONS[0]);
  const [color, setColor] = useState(ROOM_COLORS[0]);

  const loadM = async () => {
    setLoadingMembers(true);
    try {
      setMembers(await loadMembers());
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (tab !== 'members') return undefined;
    loadM();
    const off = subscribeFollows(() => loadM());
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, auth?.user?.id]);

  const [selProfile, setSelProfile] = useState(null); // mini-perfil ajeno
  const [selCounts, setSelCounts] = useState({ followers: 0, following: 0 });

  const openDM = async (m) => {
    if (!auth?.user?.id) {
      toast?.('Entra con Google para chatear');
      return;
    }
    const room = await getOrCreateDM({ id: m.id, name: m.name, handle: m.handle }, auth.user.id).catch(() => null);
    if (room) onOpenRoom?.(room.id);
    else toast?.('No se pudo abrir el directo');
  };

  const openProfile = async (m) => {
    setSelProfile(m);
    setSelCounts({ followers: m.followers || 0, following: m.following || 0 });
    try {
      const full = await loadProfileCloud(m.id);
      if (full) setSelProfile((prev) => (prev?.id === m.id ? { ...prev, ...full } : prev));
      const c = await getFollowCounts(m.id);
      setSelCounts(c);
    } catch {
      /* con lo local basta */
    }
  };

  const toggleFollow = async (m) => {
    if (!auth?.user?.id) {
      toast?.('Entra con Google para seguir gente');
      return;
    }
    const r = m.followed
      ? await unfollowUser(m.id).catch(() => ({ ok: false }))
      : await followUser(m.id).catch(() => ({ ok: false }));
    if (r?.ok) {
      setMembers((l) => l.map((x) => (x.id === m.id
        ? { ...x, followed: !x.followed, followers: Math.max(0, (x.followers || 0) + (x.followed ? -1 : 1)) }
        : x)));
      toast?.(m.followed ? `Dejaste de seguir a ${m.name || m.handle}` : `Siguiendo a ${m.name || m.handle}`);
    } else {
      toast?.('No se pudo actualizar');
    }
  };

  const low = q.trim().toLowerCase();
  const visibleRooms = rooms
    .filter((r) => r.kind !== 'dm')
    .filter((r) => !low || `${r.name || ''} ${r.description || ''} ${r.genre || ''}`.toLowerCase().includes(low));
  const visibleMembers = members
    .filter((m) => !low || `${m.name || ''} ${m.handle || ''} ${m.bio || ''}`.toLowerCase().includes(low));

  const submitRoom = async (e) => {
    e?.preventDefault();
    if (!auth?.user?.id) {
      toast?.('Entra con Google para crear salas');
      return;
    }
    const room = await create({ name, description: desc, genre, isPublic, icon, color });
    if (room) {
      setName('');
      setDesc('');
      setGenre('');
      setIsPublic(true);
      setIcon(ROOM_ICONS[0]);
      setColor(ROOM_COLORS[0]);
      setCreateOpen(false);
    }
  };

  // Chat solo para logueados: sin sesion se pide entrar
  if (!auth?.user?.id) {
    return (
      <>
        <Title>Comunidad</Title>
        <div className="card text-center">
          <Users size={28} className="mx-auto mb-2" style={{ color: 'var(--a)' }} />
          <p className="text-sm font-semibold">La comunidad es solo para miembros</p>
          <p className="text-xs mb-4" style={{ color: 'var(--m)' }}>Entra para ver salas, gente y chatear.</p>
          <button className="btn" onClick={() => auth?.login?.()}>
            <LogIn size={15} /> Entrar con Google
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Title>Comunidad</Title>
      <div className="flex gap-2">
        {[
          { id: 'rooms', label: 'Salas', I: ListMusic },
          { id: 'members', label: 'Miembros', I: Users },
        ].map(({ id, label, I }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition ${tab === id ? 'text-white' : ''}`}
            style={tab === id ? { background: 'var(--a)' } : { background: 'var(--s2)', color: 'var(--m)' }}>
            <I size={14} />{label}
          </button>
        ))}
        {tab === 'rooms' && (
          <button className="btn !py-2 ml-auto" onClick={() => setCreateOpen(true)}>
            <Plus size={15} /> Crear sala
          </button>
        )}
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--m)' }} />
        <input className="inp !pl-9" placeholder={tab === 'rooms' ? 'Buscar salas…' : 'Buscar gente…'}
          value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
      </div>

      {tab === 'rooms' && (
        <div className="grid gap-2">
          {!visibleRooms.length && (
            <div className="card text-center">
              <ListMusic size={26} className="mx-auto mb-2" style={{ color: 'var(--a)' }} />
              <p className="text-sm font-semibold">Sin salas todavía</p>
              <p className="text-xs" style={{ color: 'var(--m)' }}>Crea la primera y su playlist colectiva.</p>
            </div>
          )}
          {visibleRooms.map((r) => (
            <button key={r.id} onClick={() => onOpenRoom?.(r.id)}
              className="card !p-3 flex items-center gap-3 text-left hover:border-[var(--a)] transition-colors w-full">
              <RoomIcon room={r} />
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold truncate">{r.name}</span>
                  {!r.is_public && <Lock size={12} className="shrink-0" style={{ color: 'var(--m)' }} />}
                </span>
                <span className="block text-xs truncate" style={{ color: 'var(--m)' }}>
                  {r.description || r.genre || 'Sala de música'}
                </span>
              </span>
              <ChevronRight size={17} style={{ color: 'var(--m)' }} />
            </button>
          ))}
        </div>
      )}

      {tab === 'members' && (
        <div className="grid gap-2">
          {loadingMembers && !members.length && (
            <p className="text-xs p-2" style={{ color: 'var(--m)' }}>Buscando gente…</p>
          )}
          {!loadingMembers && !visibleMembers.length && (
            <div className="card text-center">
              <Users size={26} className="mx-auto mb-2" style={{ color: 'var(--a)' }} />
              <p className="text-sm font-semibold">Nadie por aquí aún</p>
              <p className="text-xs" style={{ color: 'var(--m)' }}>Solo se muestran perfiles públicos.</p>
            </div>
          )}
          {visibleMembers.map((m) => (
            <MemberRow key={m.id} m={m} onToggle={toggleFollow} onMessage={openDM} onProfile={openProfile} />
          ))}
        </div>
      )}

      {/* Mini-perfil ajeno: seguir + mensaje */}
      {selProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelProfile(null)}>
          <div className="w-full max-w-sm card sheet text-center" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end">
              <button className="ico-btn" onClick={() => setSelProfile(null)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <div className="w-20 h-20 rounded-full overflow-hidden mx-auto -mt-2" style={{ background: 'var(--s2)', border: '2px solid var(--a)' }}>
              {selProfile.avatar
                ? <img src={selProfile.avatar} alt={selProfile.name || selProfile.handle} className="w-full h-full object-cover" />
                : <div className="w-full h-full grid place-items-center"><UserRound size={30} style={{ color: 'var(--m)' }} /></div>}
            </div>
            <p className="serif text-xl mt-2">{selProfile.name || selProfile.handle || 'Sin nombre'}</p>
            <p className="text-xs font-mono" style={{ color: 'var(--a)' }}>{selProfile.handle || ''}</p>
            {selProfile.bio && <p className="text-xs mt-2 italic" style={{ color: 'var(--m)' }}>&ldquo;{selProfile.bio}&rdquo;</p>}
            <p className="text-[11px] mt-2" style={{ color: 'var(--m)' }}>
              {selCounts.followers} seguidores · {selCounts.following} siguiendo
            </p>
            <div className="flex gap-2 mt-4">
              <button
                className={selProfile.followed ? 'btn btn-o flex-1' : 'btn flex-1'}
                onClick={async () => {
                  await toggleFollow(selProfile);
                  setSelProfile((prev) => (prev ? { ...prev, followed: !prev.followed } : prev));
                }}>
                <Heart size={15} /> {selProfile.followed ? 'Siguiendo' : 'Seguir'}
              </button>
              <button className="btn btn-o flex-1" onClick={() => { setSelProfile(null); openDM(selProfile); }}>
                <MessageCircle size={15} /> Mensaje
              </button>
            </div>
            <button className="btn btn-o w-full mt-2"
              onClick={() => { onOpenPeer?.(selProfile.id); setSelProfile(null); }}>
              <Eye size={15} /> Ver perfil completo
            </button>
          </div>
        </div>
      )}

      {/* Crear sala */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setCreateOpen(false)}>
          <form onSubmit={submitRoom} className="w-full max-w-md card sheet" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="serif text-xl">Nueva sala</p>
              <button type="button" className="ico-btn" onClick={() => setCreateOpen(false)} aria-label="Cerrar"><X size={18} /></button>
            </div>
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-2xl p-3" style={{ background: 'var(--s2)' }}>
                <RoomIcon room={{ icon, color }} size={56} radius={20} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{name.trim() || 'Tu sala'}</p>
                  <p className="text-[11px]" style={{ color: 'var(--m)' }}>Así se verá en la lista</p>
                </div>
              </div>
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--m)' }}>Ícono</p>
                <div className="grid grid-cols-8 gap-1.5">
                  {ROOM_ICONS.map((e) => (
                    <button key={e} type="button" onClick={() => setIcon(e)} aria-label={`Ícono ${e}`}
                      className="aspect-square rounded-xl grid place-items-center text-lg transition"
                      style={icon === e ? { background: color, boxShadow: `0 0 0 2px ${color}` } : { background: 'var(--s2)' }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs mb-1.5" style={{ color: 'var(--m)' }}>Color</p>
                <div className="flex flex-wrap items-center gap-2">
                  {ROOM_COLORS.map((c) => (
                    <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Color ${c}`}
                      className="w-7 h-7 rounded-full transition"
                      style={{ background: c, boxShadow: color === c ? `0 0 0 2px var(--s), 0 0 0 4px ${c}` : 'none' }} />
                  ))}
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Color personalizado"
                    className="w-7 h-7 rounded-full cursor-pointer" style={{ background: 'transparent', border: 0, padding: 0 }} />
                </div>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--m)' }}>Nombre</p>
                <input className="inp" value={name} maxLength={40} placeholder="Ej. Synthwave Nights"
                  onChange={(e) => setName(e.target.value)} autoFocus />
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--m)' }}>Descripción (opcional)</p>
                <textarea className="inp" rows={2} maxLength={140} value={desc} placeholder="¿Qué se comparte aquí?"
                  onChange={(e) => setDesc(e.target.value)} />
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--m)' }}>Género (opcional)</p>
                <input className="inp" value={genre} maxLength={25} placeholder="Ej. Lo-Fi"
                  onChange={(e) => setGenre(e.target.value)} />
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm">Sala pública</span>
                <button type="button" onClick={() => setIsPublic((v) => !v)} role="switch" aria-checked={isPublic} aria-label="Sala pública"
                  className="w-12 h-7 rounded-full relative transition-colors shrink-0"
                  style={{ background: isPublic ? 'var(--a)' : 'var(--s2)', border: '1px solid var(--bd)' }}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isPublic ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>
              <button className="btn w-full" type="submit"><Plus size={15} /> Crear sala</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
