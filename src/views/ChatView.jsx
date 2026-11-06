import { useEffect, useRef, useState } from 'react';
import {
  MessageCircle, Send, Plus, Music, X, ChevronLeft, Play, Trash2,
  ExternalLink, ListMusic, Search, Lock, Heart, EyeOff, UserRound, LogIn,
  SmilePlus, ListPlus,
} from 'lucide-react';
import Title from '../components/Title';
import Cover from '../components/Cover';
import RoomIcon from '../components/RoomIcon';
import PlaylistHero from '../components/PlaylistHero';
import useStore from '../hooks/useStore';
import useRooms from '../hooks/useRooms';
import useRoomChat from '../hooks/useRoomChat';
import usePlaylists from '../hooks/usePlaylists';
import {
  getLocalMessages, trackFromRow, getHiddenDMs, hideDM,
  deleteMyDMessages, otherOf, loadProfileCloud,
} from '../services/social';
import { subscribeAllMessages } from '../services/supabase';

const fmtHour = (ts) => {
  try {
    return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const QUICK_EMOJIS = ['❤️', '🔥', '😂', '👏', '🎶', '😮'];

function SongCard({ song, onPlay, onAdd, mine }) {
  if (!song || (!song.url && !song.title)) return null;
  const btn = { background: mine ? 'rgba(255,255,255,.18)' : 'var(--s)', color: mine ? '#fff' : 'var(--a)' };
  return (
    <div className="mt-2 p-2.5 rounded-xl w-64 max-w-full"
      style={{ background: 'rgba(0,0,0,.28)', border: '1px solid var(--bd)' }}>
      <div className="flex items-center gap-3">
        {song.art
          ? <Cover src={song.art} className="w-10 h-10 rounded-lg shrink-0" iconSize={16} />
          : (
            <span className="w-10 h-10 rounded-lg grid place-items-center shrink-0" style={{ background: 'var(--a)', color: '#fff' }}>
              <Music size={18} />
            </span>
          )}
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold truncate" title={song.title}>{song.title || 'Tema compartido'}</span>
          <span className="block text-[10px] truncate opacity-70" title={song.artist}>{song.artist || ''}</span>
        </span>
      </div>
      <div className="flex gap-1.5 mt-2">
        {onPlay && (
          <button className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-semibold py-1.5 rounded-lg" style={btn} onClick={onPlay}>
            <Play size={13} /> Escuchar
          </button>
        )}
        {onAdd && (
          <button className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] font-semibold py-1.5 rounded-lg" style={btn} onClick={onAdd}>
            <ListPlus size={13} /> A la playlist
          </button>
        )}
        {song.url && /^https?:/.test(song.url) && (
          <button className="px-2 rounded-lg" style={btn} aria-label="Abrir enlace"
            onClick={() => { try { window.open(song.url, '_blank', 'noopener'); } catch {} }}>
            <ExternalLink size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Barra de reacciones bajo un mensaje + selector rapido. */
function Reactions({ list, meId, onReact, mine }) {
  const [open, setOpen] = useState(false);
  const groups = {};
  for (const r of list || []) {
    (groups[r.emoji] ||= { n: 0, me: false });
    groups[r.emoji].n++;
    if (r.user_id === (meId || 'local')) groups[r.emoji].me = true;
  }
  return (
    <div className={`flex flex-wrap items-center gap-1 mt-1 ${mine ? 'justify-end' : ''}`}>
      {Object.entries(groups).map(([e, g]) => (
        <button key={e} onClick={() => onReact(e)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] transition"
          style={{ background: g.me ? 'var(--a)' : 'var(--s2)', color: g.me ? '#fff' : 'var(--t)', border: '1px solid var(--bd)' }}>
          {e} {g.n}
        </button>
      ))}
      <button onClick={() => setOpen((v) => !v)} aria-label="Reaccionar" className="p-1 rounded-full opacity-60 hover:opacity-100" style={{ color: 'var(--m)' }}>
        <SmilePlus size={14} />
      </button>
      {open && (
        <span className="inline-flex gap-0.5 px-1.5 py-1 rounded-full" style={{ background: 'var(--s)', border: '1px solid var(--bd)' }}>
          {QUICK_EMOJIS.map((e) => (
            <button key={e} onClick={() => { onReact(e); setOpen(false); }} className="text-base px-0.5 hover:scale-125 transition">{e}</button>
          ))}
        </span>
      )}
    </div>
  );
}

/** Hoja para compartir: sonando ahora, playlists, favoritas o link. */
function ShareSheet({ p, pls, caption, setCaption, onPick, onClose }) {
  const [src, setSrc] = useState('now'); // now | playlists | favs | link
  const [openPl, setOpenPl] = useState(null);
  const [lt, setLt] = useState('');
  const [la, setLa] = useState('');
  const [lu, setLu] = useState('');

  const pick = (song) => {
    onPick({ text: caption.trim(), song });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[85dvh] flex flex-col sheet"
        style={{ background: 'var(--s)', border: '1px solid var(--bd)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 pb-2">
          <p className="serif text-xl">Compartir en la sala</p>
          <button className="ico-btn" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="px-4 pb-2">
          <input className="inp" value={caption} maxLength={200} placeholder="Un comentario (opcional)…"
            onChange={(e) => setCaption(e.target.value)} aria-label="Comentario" />
        </div>
        <div className="flex gap-2 px-4 pb-2 overflow-x-auto">
          {[
            { id: 'now', label: 'Sonando' },
            { id: 'playlists', label: 'Playlists' },
            { id: 'favs', label: 'Favoritas' },
            { id: 'link', label: 'Link' },
          ].map((t) => (
            <button key={t.id} onClick={() => setSrc(t.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 ${src === t.id ? 'text-white' : ''}`}
              style={src === t.id ? { background: 'var(--a)' } : { background: 'var(--s2)', color: 'var(--m)' }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-3 pt-1 overflow-y-auto flex-1">
          {src === 'now' && (
            !p?.track
              ? <p className="text-xs p-3" style={{ color: 'var(--m)' }}>No suena nada ahora.</p>
              : (
                <button onClick={() => pick({
                  title: p.track.title, artist: p.track.artist, art: p.track.art,
                  url: p.track.videoId || p.track.src || '', duration: p.track.duration || 0,
                })} className="w-full card !p-3 flex items-center gap-3 text-left">
                  <Cover src={p.track.art} className="w-11 h-11 rounded-xl shrink-0" iconSize={18} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold truncate">{p.track.title}</span>
                    <span className="block text-xs truncate" style={{ color: 'var(--m)' }}>{p.track.artist}</span>
                  </span>
                  <Plus size={17} style={{ color: 'var(--a)' }} />
                </button>
              )
          )}
          {src === 'playlists' && (
            <div className="grid gap-1.5">
              {!pls.playlists.length && <p className="text-xs p-3" style={{ color: 'var(--m)' }}>Sin playlists.</p>}
              {pls.playlists.map((pl) => (
                <div key={pl.id} className="rounded-2xl" style={{ border: '1px solid var(--bd)' }}>
                  <button onClick={() => setOpenPl(openPl === pl.id ? null : pl.id)}
                    className="w-full flex items-center gap-2.5 p-2.5 text-left">
                    <ListMusic size={16} style={{ color: 'var(--a)' }} />
                    <span className="flex-1 min-w-0 text-sm truncate">{pl.name}</span>
                    <span className="text-[11px]" style={{ color: 'var(--m)' }}>{(pl.tracks || []).length}</span>
                  </button>
                  {openPl === pl.id && (
                    <div className="px-2 pb-2 grid gap-1">
                      {!(pl.tracks || []).length && <p className="text-[11px] px-2" style={{ color: 'var(--m)' }}>Vacía.</p>}
                      {(pl.tracks || []).map((t) => (
                        <button key={t.id} onClick={() => pick({
                          title: t.title, artist: t.artist, art: t.art,
                          url: t.videoId || t.src || '', duration: t.duration || 0,
                        })} className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[var(--s2)] text-left">
                          <Cover src={t.art} className="w-9 h-9 rounded-lg shrink-0" iconSize={15} />
                          <span className="flex-1 min-w-0">
                            <span className="block text-xs font-semibold truncate">{t.title}</span>
                            <span className="block text-[11px] truncate" style={{ color: 'var(--m)' }}>{t.artist}</span>
                          </span>
                          <Plus size={15} style={{ color: 'var(--a)' }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {src === 'favs' && (
            <div className="grid gap-1">
              {!(p?.favs || []).length && <p className="text-xs p-3" style={{ color: 'var(--m)' }}>Sin favoritas: dale corazón a algo.</p>}
              {(p?.favs || []).map((t) => (
                <button key={t.id} onClick={() => pick({
                  title: t.title, artist: t.artist, art: t.art,
                  url: t.videoId || t.src || '', duration: t.duration || 0,
                })} className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-[var(--s2)] text-left">
                  <Cover src={t.art} className="w-9 h-9 rounded-lg shrink-0" iconSize={15} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold truncate">{t.title}</span>
                    <span className="block text-[11px] truncate" style={{ color: 'var(--m)' }}>{t.artist}</span>
                  </span>
                  <Heart size={15} style={{ color: 'var(--a)' }} />
                </button>
              ))}
            </div>
          )}
          {src === 'link' && (
            <div className="grid gap-2 p-1">
              <input className="inp" value={lt} maxLength={120} placeholder="Título de la canción"
                onChange={(e) => setLt(e.target.value)} aria-label="Título" />
              <input className="inp" value={la} maxLength={120} placeholder="Artista (opcional)"
                onChange={(e) => setLa(e.target.value)} aria-label="Artista" />
              <input className="inp" value={lu} maxLength={500} placeholder="https://… (YouTube, Spotify…)"
                onChange={(e) => setLu(e.target.value)} aria-label="Enlace" />
              <button className="btn w-full" disabled={!lu.trim()}
                onClick={() => pick({ title: lt.trim() || 'Tema compartido', artist: la.trim(), url: lu.trim() })}>
                Compartir link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatView({ p, toast, name, auth, initialRoom, onOpenPeer }) {
  const { rooms } = useRooms(toast);
  const pls = usePlaylists(toast);
  const [activeId, setActiveId] = useState(initialRoom || null);
  const [mode, setMode] = useState('chat'); // chat | playlist
  const [text, setText] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [confirmTrack, setConfirmTrack] = useState(null);
  const [dmSide, setDmSide] = useState('mine'); // mine | theirs (solo directos)
  const [q, setQ] = useState('');
  const [read, setRead] = useStore('h_chat_read', {});
  const [lastByRoom, setLastByRoom] = useState({});
  const [hiddenDMs, setHiddenDMs] = useState(() => getHiddenDMs());
  const [profiles, setProfiles] = useState({}); // uid -> { name, handle, avatar }
  const [confirmDelMsg, setConfirmDelMsg] = useState(false);
  const bottomRef = useRef(null);
  const meId = auth?.user?.id || null;

  useEffect(() => {
    if (initialRoom) {
      setActiveId(initialRoom);
      setMode('chat');
    }
  }, [initialRoom]);

  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;

  const chat = useRoomChat(activeId, toast, () => {
    setRead((r) => ({ ...r, [activeIdRef.current]: Date.now() }));
  }, meId);

  // Ultimo mensaje por sala (para la lista) + avisos de otras salas
  useEffect(() => {
    setLastByRoom((prev) => {
      const next = { ...prev };
      for (const r of roomsRef.current) {
        const local = getLocalMessages(r.id);
        const last = local[local.length - 1];
        if (last && (next[r.id]?.created_at || 0) < last.created_at) next[r.id] = last;
      }
      return next;
    });
    const off = subscribeAllMessages((m) => {
      setLastByRoom((prev) => (
        (prev[m.room_id]?.created_at || 0) >= m.created_at ? prev : { ...prev, [m.room_id]: m }
      ));
      if (m.room_id === activeIdRef.current) return; // la sub por sala lo muestra
      if (meId && m.author_id === meId) return;
      const room = roomsRef.current.find((r) => r.id === m.room_id);
      const preview = m.song ? `Compartió: ${m.song.title || 'una canción'}` : (m.text || '').slice(0, 70);
      toast?.(`${m.author} en ${room?.name || 'una sala'}: ${preview}`);
    });
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al abrir / llegar mensajes: marca leido + baja al final
  useEffect(() => {
    if (!activeId) return;
    setRead((r) => ({ ...r, [activeId]: Date.now() }));
    setText('');
    setMode('chat');
    setConfirmDelMsg(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chat.messages, activeId, mode]);

  const activeRoom = rooms.find((r) => r.id === activeId) || null;

  // Perfiles de los otros participantes (DMs)
  useEffect(() => {
    if (!meId) return undefined;
    const ids = [...new Set(rooms.filter((r) => r.kind === 'dm').map((r) => otherOf(r, meId)).filter(Boolean))];
    const missing = ids.filter((id) => !profiles[id]).slice(0, 20);
    if (!missing.length) return undefined;
    let dead = false;
    (async () => {
      const next = {};
      for (const id of missing) {
        const prof = await loadProfileCloud(id).catch(() => null);
        if (prof) next[id] = { name: prof.name, handle: prof.handle, avatar: prof.avatar };
      }
      if (!dead && Object.keys(next).length) setProfiles((prev) => ({ ...prev, ...next }));
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, meId]);

  const dmInfo = (r) => {
    const other = otherOf(r, meId);
    const prof = other ? profiles[other] : null;
    return { other, name: prof?.name || prof?.handle || r.name || 'Directo', avatar: prof?.avatar || '' };
  };
  const low = q.trim().toLowerCase();
  const byAct = (a, b) => (lastByRoom[b.id]?.created_at || b.created_at || 0) - (lastByRoom[a.id]?.created_at || a.created_at || 0);
  const groups = rooms
    .filter((r) => r.kind !== 'dm')
    .filter((r) => !low || `${r.name || ''} ${r.description || ''}`.toLowerCase().includes(low))
    .sort(byAct);
  const dms = rooms
    .filter((r) => r.kind === 'dm' && !hiddenDMs.includes(r.id))
    .filter((r) => {
      if (!low) return true;
      const info = dmInfo(r);
      return `${info.name} ${r.name || ''}`.toLowerCase().includes(low);
    })
    .sort(byAct);

  const lastPreview = (r) => {
    const last = lastByRoom[r.id];
    if (!last) return r.kind === 'dm' ? 'Sin mensajes' : (r.description || r.genre || 'Sin mensajes');
    return last.song ? `Canción: ${last.song.title || 'compartida'}` : last.text;
  };

  const roomRow = (r, label, avatar) => {
    const last = lastByRoom[r.id];
    const active = r.id === activeId;
    return (
      <button key={r.id} onClick={() => setActiveId(r.id)}
        className={`card !p-3 flex items-center gap-3 text-left w-full transition-colors ${active ? 'acc-soft' : ''}`}>
        {avatar
          ? <span className="w-10 h-10 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--s2)' }}><img src={avatar} alt={label} className="w-full h-full object-cover" /></span>
          : (
            r.kind === 'dm'
              ? <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0 text-white" style={{ background: 'var(--a)' }}><UserRound size={18} /></span>
              : <RoomIcon room={r} size={40} radius={14} />
          )}
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="text-sm font-semibold truncate">{label}</span>
            {r.kind !== 'dm' && !r.is_public && <Lock size={11} className="shrink-0" style={{ color: 'var(--m)' }} />}
            {unread(r.id) && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--a)' }} title="Nuevo" />}
          </span>
          <span className="block text-[11px] truncate" style={{ color: 'var(--m)' }}>{lastPreview(r)}</span>
        </span>
        {last && <span className="text-[10px] shrink-0" style={{ color: 'var(--m)' }}>{fmtHour(last.created_at)}</span>}
      </button>
    );
  };

  // Chat solo para logueados
  if (!meId) {
    return (
      <>
        <Title>Chat</Title>
        <div className="card text-center">
          <MessageCircle size={28} className="mx-auto mb-2" style={{ color: 'var(--a)' }} />
          <p className="text-sm font-semibold">El chat es solo para miembros</p>
          <p className="text-xs mb-4" style={{ color: 'var(--m)' }}>Entra para chatear en salas y directos.</p>
          <button className="btn" onClick={() => auth?.login?.()}>
            <LogIn size={15} /> Entrar con Google
          </button>
        </div>
      </>
    );
  }

  const visibleTracks = activeRoom?.kind === 'dm'
    ? chat.tracks.filter((r) => (dmSide === 'mine') === (!r.added_by || r.added_by === meId))
    : chat.tracks;

  const submit = (e) => {
    e?.preventDefault();
    if (!text.trim()) return;
    chat.send({ text: text.trim() });
    setText('');
  };

  const unread = (id) => {
    const last = lastByRoom[id];
    if (!last) return false;
    if (meId && last.author_id === meId) return false;
    if (last.mine) return false;
    return (read[id] || 0) < last.created_at;
  };

  return (
    <>
      <div className="flex gap-3 items-start">
        {/* Lista de salas */}
        <div className={`${activeId ? 'hidden md:flex' : 'flex'} flex-col gap-2 w-full md:w-72 shrink-0`}>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--m)' }} />
            <input className="inp !pl-9" placeholder="Buscar…" value={q}
              onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
          </div>
          {!!dms.length && (
            <p className="text-[10px] font-bold tracking-[0.2em] uppercase px-1" style={{ color: 'var(--m)' }}>Directos</p>
          )}
          {dms.map((r) => {
            const info = dmInfo(r);
            return roomRow(r, info.name, info.avatar);
          })}
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase px-1 pt-1" style={{ color: 'var(--m)' }}>Salas</p>
          {!groups.length && (
            <div className="card text-center">
              <MessageCircle size={24} className="mx-auto mb-2" style={{ color: 'var(--a)' }} />
              <p className="text-sm font-semibold">Sin salas</p>
              <p className="text-xs" style={{ color: 'var(--m)' }}>Créalas en Comunidad.</p>
            </div>
          )}
          {groups.map((r) => roomRow(r, r.name, null))}
        </div>

        {/* Hilo: marco fijo a todo lo ancho, solo los mensajes hacen scroll */}
        <div className={`${activeId ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0 card !p-0 overflow-hidden`} style={{ height: 'calc(100dvh - 150px)', minHeight: '60dvh' }}>
          {!activeRoom ? (
            <div className="flex-1 grid place-items-center p-8 text-center">
              <div>
                <MessageCircle size={30} className="mx-auto mb-2" style={{ color: 'var(--a)' }} />
                <p className="text-sm font-semibold">Elige una sala</p>
                <p className="text-xs" style={{ color: 'var(--m)' }}>Chatea y arma su playlist colectiva.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5 px-3.5 py-3" style={{ borderBottom: '1px solid var(--bd)' }}>
                <button className="ico-btn md:hidden" onClick={() => setActiveId(null)} aria-label="Volver"><ChevronLeft size={20} /></button>
                {(() => {
                  const isDM = activeRoom.kind === 'dm';
                  const info = isDM ? dmInfo(activeRoom) : null;
                  const headInner = (
                    <>
                      {isDM && info.avatar
                        ? <span className="w-9 h-9 rounded-full overflow-hidden shrink-0" style={{ background: 'var(--s2)' }}><img src={info.avatar} alt={info.name} className="w-full h-full object-cover" /></span>
                        : (
                          isDM
                            ? <span className="w-9 h-9 rounded-xl grid place-items-center shrink-0 text-white" style={{ background: 'var(--a)' }}><UserRound size={17} /></span>
                            : <RoomIcon room={activeRoom} size={36} radius={12} />
                        )}
                      <span className="flex-1 min-w-0 text-left">
                        <span className="flex items-center gap-1.5">
                          <span className="text-sm font-bold truncate">{isDM ? info.name : activeRoom.name}</span>
                          {!isDM && !activeRoom.is_public && <Lock size={12} style={{ color: 'var(--m)' }} />}
                        </span>
                        <span className="block text-[11px]" style={{ color: 'var(--m)' }}>
                          {isDM ? 'Directo · toca para ver su perfil' : `${chat.tracks.length} en la playlist colectiva`}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <>
                      {isDM
                        ? <button className="flex items-center gap-2.5 flex-1 min-w-0 active:opacity-70" onClick={() => { const o = dmInfo(activeRoom).other; if (o) onOpenPeer?.(o); }} aria-label={`Ver perfil de ${info.name}`}>{headInner}</button>
                        : <span className="flex items-center gap-2.5 flex-1 min-w-0">{headInner}</span>}
                      {isDM && (
                        <span className="flex shrink-0">
                          <button className="ico-btn" aria-label="Ocultar conversación" title="Ocultar de tu lista"
                            onClick={() => { hideDM(activeRoom.id); setHiddenDMs(getHiddenDMs()); setActiveId(null); }}>
                            <EyeOff size={17} />
                          </button>
                          <button className="ico-btn" aria-label={confirmDelMsg ? 'Confirmar borrado' : 'Borrar mis mensajes'}
                            title="Borrar mis mensajes" style={confirmDelMsg ? { color: '#ef4444' } : undefined}
                            onClick={async () => {
                              if (!confirmDelMsg) {
                                setConfirmDelMsg(true);
                                toast?.('Toca de nuevo para borrar tus mensajes');
                                return;
                              }
                              setConfirmDelMsg(false);
                              await deleteMyDMessages(activeRoom.id).catch(() => {});
                              toast?.('Tus mensajes fueron borrados');
                              setActiveId(null);
                            }}>
                            <Trash2 size={17} />
                          </button>
                        </span>
                      )}
                    </>
                  );
                })()}
                <span className="flex rounded-full p-0.5 shrink-0" style={{ background: 'var(--s2)' }}>
                  {[
                    { id: 'chat', label: 'Chat' },
                    { id: 'playlist', label: `Playlist · ${chat.tracks.length}` },
                  ].map((t) => (
                    <button key={t.id} onClick={() => setMode(t.id)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${mode === t.id ? 'text-white' : ''}`}
                      style={mode === t.id ? { background: 'var(--a)' } : { color: 'var(--m)' }}>
                      {t.label}
                    </button>
                  ))}
                </span>
              </div>

              {mode === 'chat' ? (
                <>
                  <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                    {chat.loading && <p className="text-xs" style={{ color: 'var(--m)' }}>Cargando mensajes…</p>}
                    {!chat.loading && !chat.messages.length && (
                      <p className="text-xs text-center py-6" style={{ color: 'var(--m)' }}>
                        Sé la primera persona en escribir o compartir un tema.
                      </p>
                    )}
                    {chat.messages.map((m) => (
                      <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm ${m.mine ? 'text-white rounded-br-md' : 'rounded-bl-md'}`}
                          style={m.mine
                            ? { background: 'var(--a)' }
                            : { background: 'var(--s2)' }}>
                          {!m.mine && (
                            <p className="text-[11px] font-bold mb-0.5" style={{ color: 'var(--a)' }}>{m.author}</p>
                          )}
                          {m.text && <p className="whitespace-pre-wrap break-words">{m.text}</p>}
                          {(() => {
                            const song = m.song || (m.song_url ? { title: '', artist: '', url: m.song_url } : null);
                            const t = song ? trackFromRow({ track_id: `s_${m.id}`, ...song }) : null;
                            const playable = Boolean(t && (t.videoId || t.src));
                            return (
                              <SongCard song={song} mine={m.mine}
                                onPlay={playable ? () => p.play(t, [t]) : null}
                                onAdd={song ? () => chat.addTrack({ ...t, id: `s_${m.id}`, videoId: t.videoId, src: t.src, url: song.url }) : null} />
                            );
                          })()}
                          <p className="text-[10px] mt-1 text-right opacity-70">{fmtHour(m.created_at)}</p>
                          <Reactions list={chat.reactions[m.id]} meId={meId} mine={m.mine} onReact={(e) => chat.react(m.id, e)} />
                        </div>
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>
                  <form onSubmit={submit} className="flex items-center gap-2 p-2.5 sticky bottom-0 z-10" style={{ borderTop: '1px solid var(--bd)', background: 'var(--s)' }}>
                    <button type="button" className="ico-btn shrink-0" onClick={() => setShareOpen(true)}
                      aria-label="Compartir canción" title="Compartir canción" style={{ color: 'var(--a)' }}>
                      <Plus size={20} />
                    </button>
                    <input className="inp !py-2.5" value={text} maxLength={1000}
                      onChange={(e) => setText(e.target.value)} placeholder="Escribe un mensaje…"
                      aria-label="Mensaje" autoComplete="off" />
                    <button className="btn !p-2.5 shrink-0" aria-label="Enviar"><Send size={16} /></button>
                  </form>
                </>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto p-2.5">
                    <PlaylistHero
                      art={chat.tracks[0]?.art}
                      icon={activeRoom.kind === 'dm' ? <UserRound size={26} /> : (activeRoom.icon || <ListMusic size={26} />)}
                      eyebrow={activeRoom.kind === 'dm' ? 'Playlist de a 2' : 'Playlist del grupo'}
                      title={activeRoom.kind === 'dm' ? dmInfo(activeRoom).name : activeRoom.name}
                      meta={`${chat.tracks.length} canciones`}
                    />
                    {!visibleTracks.length && (
                      <p className="text-xs text-center py-6" style={{ color: 'var(--m)' }}>
                        Playlist vacía: comparte temas con ＋ y se suman aquí.
                      </p>
                    )}
                    {activeRoom.kind === 'dm' && (
                      <div className="flex rounded-full p-0.5 mb-2 w-fit" style={{ background: 'var(--s2)' }}>
                        {[{ id: 'mine', label: 'Mi playlist' }, { id: 'theirs', label: `De ${dmInfo(activeRoom).name}` }].map((t) => (
                          <button key={t.id} onClick={() => setDmSide(t.id)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${dmSide === t.id ? 'text-white' : ''}`}
                            style={dmSide === t.id ? { background: 'var(--a)' } : { color: 'var(--m)' }}>{t.label}</button>
                        ))}
                      </div>
                    )}
                    {visibleTracks.map((r) => {
                      const t = trackFromRow(r);
                      const playable = Boolean(t.videoId || t.src);
                      return (
                        <div key={`${r.room_id}:${r.track_id}`} className="flex items-center gap-1 rounded-2xl hover:bg-[var(--s2)]">
                          <div className="flex-1 min-w-0 flex items-center gap-3 p-2">
                            <Cover src={t.art} className="w-11 h-11 rounded-xl shrink-0" iconSize={17} />
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm truncate">{t.title}</span>
                              <span className="block text-xs truncate" style={{ color: 'var(--m)' }}>{t.artist}</span>
                            </span>
                          </div>
                          {playable && (
                            <button className="ico-btn shrink-0" aria-label={`Reproducir ${t.title}`}
                              onClick={() => p.play(t, chat.playable)}>
                              <Play size={17} />
                            </button>
                          )}
                          <button className="ico-btn shrink-0"
                            style={confirmTrack === r.track_id ? { color: '#ef4444' } : undefined}
                            aria-label={confirmTrack === r.track_id ? 'Confirmar quitar' : `Quitar ${t.title}`}
                            onClick={() => {
                              if (confirmTrack !== r.track_id) {
                                setConfirmTrack(r.track_id);
                                toast?.('Toca de nuevo para quitarlo');
                                return;
                              }
                              setConfirmTrack(null);
                              chat.removeTrack(r.track_id);
                            }}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 p-2.5" style={{ borderTop: '1px solid var(--bd)' }}>
                    <button className="btn btn-o flex-1" onClick={() => setShareOpen(true)}>
                      <Plus size={15} /> Agregar tema
                    </button>
                    <button className="btn flex-1" disabled={!visibleTracks.map(trackFromRow).filter((t) => t.videoId || t.src).length}
                      onClick={() => {
                        const list = visibleTracks.map(trackFromRow).filter((t) => t.videoId || t.src);
                        if (list.length) p.play(list[0], list);
                      }}>
                      <Play size={15} /> Reproducir todo
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {shareOpen && activeRoom && (
        <ShareSheet p={p} pls={pls} caption={caption} setCaption={setCaption}
          onPick={(pick) => chat.send(pick)} onClose={() => setShareOpen(false)} />
      )}
    </>
  );
}
