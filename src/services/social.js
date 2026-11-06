// HERMES - Chat social con Supabase + local
// ------------------------------------------
// Guarda mensajes, salas y perfil. Sin internet -> local + cola,
// con internet + login -> Supabase (tablas users | rooms | messages).
//
// Tablas:
//   rooms:    { id, name, description, genre, is_public, created_by, created_at }
//   messages: { id, room_id, author, author_id, text, song_url, created_at }
//   users:    { id, handle, name, bio, avatar, updated_at }

import {
  pushRow,
  pullRows,
  getSessionUser,
  getOutbox,
  removeFromOutbox,
  filterOutbox,
  subscribeMessages as _subscribeMessages,
  subscribeRooms as _subscribeRooms,
  supabase,
} from './supabase';

const MSG_KEY = 'h_chat_local';
const ROOMS_KEY = 'h_rooms_local';

export function getLocalMessages(roomId) {
  try {
    const all = JSON.parse(localStorage.getItem(MSG_KEY) || '{}');
    const list = all[roomId] || [];
    // Sanea duplicados viejos por id (eco que se guardó doble): conserva el último.
    const byId = new Map();
    for (const m of list) {
      if (!m || !m.id) continue;
      const prev = byId.get(m.id);
      byId.set(m.id, prev ? { ...m, mine: Boolean(prev.mine || m.mine) } : m);
    }
    const clean = [...byId.values()].slice(-300);
    if (clean.length !== list.length) {
      all[roomId] = clean;
      try { localStorage.setItem(MSG_KEY, JSON.stringify(all)); } catch { /* noop */ }
    }
    return clean;
  } catch {
    return [];
  }
}

function saveLocalMessage(roomId, msg) {
  try {
    const all = JSON.parse(localStorage.getItem(MSG_KEY) || '{}');
    const list = all[roomId] || [];
    const i = list.findIndex((m) => m && m.id === msg.id);
    if (i >= 0) {
      // Reemplaza sin duplicar; nunca degrada mine:true (eco del realtime propio).
      list[i] = { ...msg, mine: Boolean(list[i].mine || msg.mine) };
    } else {
      list.push(msg);
    }
    all[roomId] = list.slice(-300);
    localStorage.setItem(MSG_KEY, JSON.stringify(all));
  } catch {
    /* noop */
  }
}

export function getLocalRooms() {
  try {
    const arr = JSON.parse(localStorage.getItem(ROOMS_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveLocalRoom(room) {
  try {
    const arr = getLocalRooms().filter((r) => r.id !== room.id);
    localStorage.setItem(ROOMS_KEY, JSON.stringify([room, ...arr].slice(0, 100)));
  } catch {
    /* noop */
  }
}

const nid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Crea una sala: siempre en local, y a la nube si hay internet + login. */
export async function createRoom({ name, description = '', genre = '', isPublic = true, icon = '', color = '' }) {
  const user = await getSessionUser().catch(() => null);
  const room = {
    id: nid('room'),
    name: String(name || '').trim().slice(0, 40),
    description: String(description || '').slice(0, 140),
    genre: String(genre || '').slice(0, 25),
    is_public: Boolean(isPublic),
    icon: String(icon || '').slice(0, 8),
    color: /^#[0-9a-fA-F]{6}$/.test(color || '') ? color : '',
    created_by: user?.id || null,
    created_at: Date.now(),
  };
  if (!room.name) return null;
  saveLocalRoom(room);
  pushRow('rooms', room).catch(() => {});
  return room;
}

/** Lee salas: locales primero + nube. */
export async function loadRooms() {
  const local = getLocalRooms();
  const { ok, rows } = await pullRows('rooms', 0).catch(() => ({ ok: false, rows: [] }));
  if (!ok) return local;
  const remote = rows.map((r) => ({
    id: String(r.id),
    kind: r.kind === 'dm' ? 'dm' : 'group',
    member_a: r.member_a ? String(r.member_a) : null,
    member_b: r.member_b ? String(r.member_b) : null,
    name: String(r.name || ''),
    description: String(r.description || ''),
    genre: String(r.genre || ''),
    icon: String(r.icon || ''),
    color: String(r.color || ''),
    is_public: r.is_public !== false,
    created_at: Number(r.created_at || 0),
  }));
  const seen = new Set(local.map((r) => r.id));
  return [...local, ...remote.filter((r) => !seen.has(r.id))];
}

/** Guarda un mensaje: siempre en local, y a la nube si hay internet + login.
 *  song opcional: { title, artist, url } -> tarjeta de cancion + suma a la playlist de la sala. */
export async function sendChatMessage(roomId, { author, text, songUrl = '', song = null }) {
  const user = await getSessionUser().catch(() => null);
  const s = song || (songUrl ? { title: '', artist: '', url: songUrl } : null);
  const msg = {
    id: nid('m'),
    room_id: roomId,
    author: String(author || user?.user_metadata?.full_name || user?.email || 'Yo').slice(0, 40),
    author_id: user?.id || null,
    text: String(text || '').trim().slice(0, 1000),
    song_title: String(s?.title || '').slice(0, 120),
    song_artist: String(s?.artist || '').slice(0, 120),
    song_art: String(s?.art || '').slice(0, 500),
    song_url: String(s?.url || songUrl || '').slice(0, 500),
    created_at: Date.now(),
  };
  saveLocalMessage(roomId, { ...toLocalMsg(msg), mine: true });
  // pushRow encola solo si no hay internet, no hay config o no hay sesion (RLS)
  pushRow('messages', msg).catch(() => {});
  return msg;
}

/** Fila nube -> mensaje local (misma forma en cache, realtime y lectura). */
export function toLocalMsg(r) {
  const url = String(r.song_url || '');
  return {
    id: String(r.id),
    room_id: String(r.room_id),
    author: String(r.author || ''),
    author_id: r.author_id ? String(r.author_id) : null,
    text: String(r.text || ''),
    song: url || r.song_title ? { title: String(r.song_title || ''), artist: String(r.song_artist || ''), art: String(r.song_art || ''), url } : null,
    created_at: Number(r.created_at || 0),
    mine: false,
  };
}

/** Lee mensajes: locales primero (instantaneo) + nube para lo nuevo. */
export async function loadChatMessages(roomId) {
  const local = getLocalMessages(roomId);
  const { ok, rows } = await pullRows('messages', 0).catch(() => ({ ok: false, rows: [] }));
  if (!ok) return local;
  const remote = rows
    .filter((r) => String(r.room_id) === String(roomId))
    .map(toLocalMsg)
    .sort((a, b) => a.created_at - b.created_at)
    .slice(-300);
  // Fusion sin duplicados por id; lo local manda (mine: true)
  const seen = new Set(local.map((m) => m.id));
  return [...local, ...remote.filter((m) => !seen.has(m.id))];
}

/** Tiempo real: avisa cada mensaje nuevo de la sala (para toasts). */
export function subscribeRoomMessages(roomId, onInsert) {
  return _subscribeMessages(roomId, (m) => {
    saveLocalMessage(roomId, m);
    onInsert?.(m);
  });
}

/** Tiempo real: avisa cuando cambian las salas. */
export function subscribeRoomList(onChange) {
  return _subscribeRooms(onChange);
}

/** Guarda/actualiza tu perfil en la nube (tabla users, id = uid de Auth). */
export async function saveProfileCloud({ handle, name, bio = '', avatar = '', visibility, showStats, showActivity, showNowplaying }) {
  const user = await getSessionUser().catch(() => null);
  // Sin login no hay uuid valido para users(id): no se encola (evita
  // items imposibles en la cola); al entrar se sincroniza (ver useAuth).
  if (!user?.id) return { ok: false, queued: false, reason: 'no_session' };
  const row = {
    id: user.id,
    handle: String(handle || name || user?.email || user.id).slice(0, 40),
    name: String(name || user?.user_metadata?.full_name || '').slice(0, 60),
    bio: String(bio || '').slice(0, 160),
    avatar: String(avatar || user?.user_metadata?.avatar_url || '').slice(0, 500),
    updated_at: Date.now(),
  };
  // Solo se mandan si vienen definidos (upsert conserva el resto).
  if (visibility) row.visibility = visibility;
  if (showStats !== undefined) row.show_stats = Boolean(showStats);
  if (showActivity !== undefined) row.show_activity = Boolean(showActivity);
  if (showNowplaying !== undefined) row.show_nowplaying = Boolean(showNowplaying);
  return pushRow('users', row).catch(() => ({ ok: false, queued: true }));
}

/** Lee un perfil de la nube por id (para respetar su privacidad). */
export async function loadProfileCloud(uid) {
  try {
    if (!supabase || !uid) return null;
    const { data, error } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
    if (error) throw error;
    return data || null;
  } catch {
    return null;
  }
}

// ---- Presencia: lo que suena ahora (lo escribe tu app, lo lee el perfil ajeno) ----
export async function touchPresence(uid, np) {
  try {
    if (!supabase || !uid || !navigator.onLine) return { ok: false };
    const { error } = await supabase.from('users').update({
      now_playing: np || null,
      now_playing_at: Date.now(),
      updated_at: Date.now(),
    }).eq('id', uid);
    if (error) throw error;
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Playlists públicas de un usuario (para ver y clonar desde su perfil). */
export async function loadPeerPlaylists(uid) {
  try {
    if (!supabase || !uid) return [];
    const { data, error } = await supabase.from('playlists')
      .select('*').eq('user_id', uid).eq('is_public', true)
      .order('updated_at', { ascending: false }).limit(20);
    if (error) throw error;
    return (data || []).map((r) => {
      let tracks = r.tracks_json;
      if (typeof tracks === 'string') {
        try { tracks = JSON.parse(tracks); } catch { tracks = []; }
      }
      return {
        id: String(r.id),
        name: String(r.name || 'Sin nombre').slice(0, 40),
        description: String(r.description || '').slice(0, 140),
        color: String(r.color || '#6366f1').slice(0, 30),
        tracks: Array.isArray(tracks) ? tracks : [],
      };
    });
  } catch {
    return [];
  }
}

// ---- Follows (grafo social real) ----
async function myUid() {
  const user = await getSessionUser().catch(() => null);
  return user?.id || null;
}

export async function followUser(targetId) {
  const uid = await myUid();
  if (!uid || !targetId || uid === targetId) return { ok: false };
  try {
    const { error } = await supabase
      .from('follows')
      .upsert({ follower_id: uid, following_id: targetId, created_at: Date.now() }, { onConflict: 'follower_id,following_id' });
    if (error) throw error;
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function unfollowUser(targetId) {
  const uid = await myUid();
  if (!uid || !targetId) return { ok: false };
  try {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', uid)
      .eq('following_id', targetId);
    if (error) throw error;
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function isFollowing(targetId) {
  const uid = await myUid();
  if (!uid || !targetId) return false;
  try {
    const { data, error } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', uid)
      .eq('following_id', targetId)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  } catch {
    return false;
  }
}

/** { followers, following } de un usuario. */
export async function getFollowCounts(uid) {
  if (!supabase || !uid) return { followers: 0, following: 0 };
  try {
    const [a, b] = await Promise.all([
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', uid),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('follower_id', uid),
    ]);
    return { followers: a.count || 0, following: b.count || 0 };
  } catch {
    return { followers: 0, following: 0 };
  }
}

/** Re-suscribe conteos cuando cambia la tabla follows. */
export function subscribeFollows(onChange) {
  if (!supabase) return () => {};
  const ch = supabase
    .channel('follows')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, () => {
      try {
        onChange?.();
      } catch {
        /* noop */
      }
    })
    .subscribe();
  return () => {
    try {
      supabase.removeChannel(ch);
    } catch {
      /* noop */
    }
  };
}

// ---- Playlist colectiva de la sala (todos agregan/quitan) ----
export function rowFromTrack(roomId, t, uid) {
  return {
    room_id: roomId,
    track_id: String(t?.id || `t_${Date.now().toString(36)}`),
    title: String(t?.title || 'Sin título').slice(0, 120),
    artist: String(t?.artist || '').slice(0, 120),
    art: String(t?.art || '').slice(0, 500),
    url: String(t?.videoId || t?.src || t?.url || '').slice(0, 500),
    duration: Number(t?.duration) || 0,
    added_by: uid || null,
    added_at: Date.now(),
  };
}

/** Convierte fila en tema reproducible (videoId/src si se puede deducir). */
export function trackFromRow(r) {
  const url = String(r.url || '');
  const m11 = url.match(/^[A-Za-z0-9_-]{11}$/);
  const ym = url.match(/(?:youtube\.com\/watch\?[^#]*v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  const t = {
    id: String(r.track_id),
    title: String(r.title || 'Sin título'),
    artist: String(r.artist || ''),
    art: String(r.art || ''),
    duration: Number(r.duration) || 0,
  };
  if (m11) {
    t.videoId = url;
    t.source = 'YouTube';
  } else if (ym) {
    t.videoId = ym[1];
    t.source = 'YouTube';
  } else if (/^https?:/.test(url) && !/youtube\.com|youtu\.be/.test(url)) {
    t.src = url;
  }
  return t;
}

export async function addRoomTrack(roomId, track) {
  const user = await getSessionUser().catch(() => null);
  const row = rowFromTrack(roomId, track, user?.id);
  try {
    if (!supabase) throw new Error('no_config');
    const { error } = await supabase
      .from('room_tracks')
      .upsert(row, { onConflict: 'room_id,track_id' });
    if (error) throw error;
    return { ok: true, row };
  } catch {
    // Sin internet/sesion: queda en cola y sube solo (upsert idempotente).
    pushRow('room_tracks', row).catch(() => {});
    return { ok: false, queued: true, row };
  }
}

export async function removeRoomTrack(roomId, trackId) {
  // No revive: saca de la cola lo pendiente de este track
  removeFromOutbox('room_tracks', `${roomId}:${trackId}`);
  try {
    if (!supabase) throw new Error('no_config');
    const { error } = await supabase.from('room_tracks').delete().eq('room_id', roomId).eq('track_id', trackId);
    if (error) throw error;
  } catch {
    /* sin sesion/red: el borrado local manda */
  }
}

const ROOM_TRACKS_KEY = 'h_room_tracks';

export function getLocalRoomTracks(roomId) {
  try {
    const all = JSON.parse(localStorage.getItem(ROOM_TRACKS_KEY) || '{}');
    return all[roomId] || [];
  } catch {
    return [];
  }
}

function saveLocalRoomTracks(roomId, rows) {
  try {
    const all = JSON.parse(localStorage.getItem(ROOM_TRACKS_KEY) || '{}');
    all[roomId] = rows.slice(-300);
    localStorage.setItem(ROOM_TRACKS_KEY, JSON.stringify(all));
  } catch {
    /* noop */
  }
}

export async function loadRoomTracks(roomId) {
  const { ok, rows } = await pullRows('room_tracks', 0).catch(() => ({ ok: false, rows: [] }));
  const remote = ok ? rows.filter((r) => String(r.room_id) === String(roomId)) : [];
  const seen = new Set(remote.map((r) => `${r.room_id}:${r.track_id}`));
  // Fusiona cola local pendiente (aun no subida) sin duplicar
  let pending = [];
  try {
    pending = getOutbox()
      .filter((o) => o.tab === 'room_tracks' && String(o.row?.room_id) === String(roomId))
      .map((o) => o.row)
      .filter((r) => !seen.has(`${r.room_id}:${r.track_id}`));
  } catch {
    /* noop */
  }
  const all = [...remote, ...pending].sort((a, b) => (a.added_at || 0) - (b.added_at || 0));
  saveLocalRoomTracks(roomId, all);
  return all;
}

export function subscribeRoomTracks(roomId, onChange) {
  if (!supabase) return () => {};
  const ch = supabase
    .channel(`room-tracks:${roomId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_tracks', filter: `room_id=eq.${roomId}` },
      () => {
        try {
          onChange?.();
        } catch {
          /* noop */
        }
      },
    )
    .subscribe();
  return () => {
    try {
      supabase.removeChannel(ch);
    } catch {
      /* noop */
    }
  };
}

// ---- Directos 1-a-1 (salas kind='dm', id deterministico) ----
const DM_HIDE_KEY = 'h_dm_hidden';

export function dmRoomId(a, b) {
  const [x, y] = [String(a), String(b)].sort();
  return `dm_${x}_${y}`;
}

export function otherOf(room, myId) {
  if (!room) return null;
  if (room.member_a && String(room.member_a) !== String(myId)) return String(room.member_a);
  if (room.member_b && String(room.member_b) !== String(myId)) return String(room.member_b);
  return null;
}

export function getHiddenDMs() {
  try {
    const arr = JSON.parse(localStorage.getItem(DM_HIDE_KEY) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function hideDM(id) {
  try {
    const arr = getHiddenDMs().filter((x) => x !== id);
    localStorage.setItem(DM_HIDE_KEY, JSON.stringify([...arr, id].slice(-100)));
  } catch {
    /* noop */
  }
}

export function unhideDM(id) {
  try {
    localStorage.setItem(DM_HIDE_KEY, JSON.stringify(getHiddenDMs().filter((x) => x !== id)));
  } catch {
    /* noop */
  }
}

async function fetchRoomCloud(id) {
  try {
    if (!supabase || !id) return null;
    const { data, error } = await supabase.from('rooms').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data || null;
  } catch {
    return null;
  }
}

/** Abre (o crea) el DM con otro usuario. Devuelve la sala siempre, aun offline. */
export async function getOrCreateDM(other, myId) {
  const me = myId || (await getSessionUser().catch(() => null))?.id;
  if (!me || !other?.id || String(other.id) === String(me)) return null;
  const [a, b] = [String(me), String(other.id)].sort();
  const id = dmRoomId(a, b);
  // 1. Local
  const local = getLocalRooms().find((r) => r.id === id);
  if (local) {
    unhideDM(id);
    return { ...local, kind: 'dm', member_a: a, member_b: b };
  }
  // 2. Nube
  const cloud = await fetchRoomCloud(id);
  if (cloud) {
    const room = {
      id: cloud.id, kind: 'dm', name: String(cloud.name || other.name || other.handle || 'Directo'),
      description: '', genre: '', is_public: false,
      member_a: cloud.member_a || a, member_b: cloud.member_b || b,
      created_at: Number(cloud.created_at) || Date.now(),
    };
    saveLocalRoom(room);
    unhideDM(id);
    return room;
  }
  // 3. Crear
  const room = {
    id,
    kind: 'dm',
    name: String(other.name || other.handle || 'Directo').slice(0, 40),
    description: '',
    genre: '',
    is_public: false,
    member_a: a,
    member_b: b,
    created_by: me,
    created_at: Date.now(),
  };
  saveLocalRoom(room);
  unhideDM(id);
  pushRow('rooms', room).catch(() => {});
  return room;
}

/** Borra solo MIS mensajes del DM (nube + local + cola). El otro conserva los suyos. */
export async function deleteMyDMessages(roomId) {
  const me = (await getSessionUser().catch(() => null))?.id;
  // Cola: fuera lo mio pendiente de esa sala
  filterOutbox((item) => !(
    item.tab === 'messages'
    && String(item?.row?.room_id) === String(roomId)
    && (!me || String(item?.row?.author_id) === String(me))
  ));
  // Nube: solo los mios
  try {
    if (supabase && me) {
      await supabase.from('messages').delete().eq('room_id', roomId).eq('author_id', me);
    }
  } catch {
    /* sin sesion/red */
  }
  // Local: fuera los mios
  try {
    const all = JSON.parse(localStorage.getItem(MSG_KEY) || '{}');
    all[roomId] = (all[roomId] || []).filter((m) => !(m.mine || (me && String(m.author_id) === String(me))));
    localStorage.setItem(MSG_KEY, JSON.stringify(all));
  } catch {
    /* noop */
  }
}
export async function loadMembers() {
  if (!supabase) return [];
  try {
    const me = await getSessionUser().catch(() => null);
    const { data: users, error } = await supabase
      .from('users')
      .select('id,handle,name,bio,avatar,updated_at')
      .eq('visibility', 'public')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    const list = (users || []).filter((u) => u.id !== me?.id);
    if (!list.length) return [];
    const ids = list.map((u) => u.id);
    const inList = `in.(${ids.join(',')})`;
    const { data: rel } = await supabase
      .from('follows')
      .select('follower_id,following_id')
      .or(`follower_id.${inList},following_id.${inList}`);
    const followers = {};
    const following = {};
    const followedByMe = new Set();
    for (const r of rel || []) {
      following[r.follower_id] = (following[r.follower_id] || 0) + 1;
      followers[r.following_id] = (followers[r.following_id] || 0) + 1;
      if (me?.id && r.follower_id === me.id) followedByMe.add(r.following_id);
    }
    return list.map((u) => ({
      ...u,
      followers: followers[u.id] || 0,
      following: following[u.id] || 0,
      followed: followedByMe.has(u.id),
    }));
  } catch {
    return [];
  }
}


// ---- Reacciones con emoji (local + nube; si la tabla no existe queda solo local) ----
const REACT_KEY = 'h_reactions';

function readReactAll() {
  try {
    return JSON.parse(localStorage.getItem(REACT_KEY) || '{}');
  } catch {
    return {};
  }
}

/** { [messageId]: [{ emoji, user_id }] } de una sala. */
export function getLocalReactions(roomId) {
  return readReactAll()[roomId] || {};
}

function writeLocalReactions(roomId, map) {
  try {
    const all = readReactAll();
    all[roomId] = map;
    localStorage.setItem(REACT_KEY, JSON.stringify(all));
  } catch {
    /* noop */
  }
}

export async function loadReactions(roomId) {
  const local = getLocalReactions(roomId);
  if (!supabase) return local;
  try {
    const { data, error } = await supabase.from('message_reactions').select('*').eq('room_id', roomId).limit(1000);
    if (error) throw error;
    const map = {};
    for (const r of data || []) {
      (map[r.message_id] ||= []).push({ emoji: r.emoji, user_id: String(r.user_id) });
    }
    writeLocalReactions(roomId, map);
    return map;
  } catch {
    return local;
  }
}

/** Pone o quita (toggle) tu reaccion. Devuelve el mapa actualizado. */
export async function toggleReaction(roomId, messageId, emoji) {
  const user = await getSessionUser().catch(() => null);
  const uid = user?.id || 'local';
  const map = { ...getLocalReactions(roomId) };
  const list = [...(map[messageId] || [])];
  const idx = list.findIndex((x) => x.emoji === emoji && x.user_id === uid);
  const adding = idx < 0;
  if (adding) list.push({ emoji, user_id: uid });
  else list.splice(idx, 1);
  map[messageId] = list;
  writeLocalReactions(roomId, map);
  if (supabase && user?.id) {
    const id = `${messageId}:${uid}:${emoji}`;
    try {
      const q = adding
        ? supabase.from('message_reactions').upsert({ id, room_id: roomId, message_id: messageId, user_id: uid, emoji, created_at: Date.now() }, { onConflict: 'id' })
        : supabase.from('message_reactions').delete().eq('id', id);
      await q;
    } catch {
      /* sin tabla/red: queda local */
    }
  }
  return map;
}

export function subscribeReactions(roomId, onChange) {
  if (!supabase) return () => {};
  const ch = supabase
    .channel(`reactions:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions', filter: `room_id=eq.${roomId}` }, () => {
      try { onChange?.(); } catch { /* noop */ }
    })
    .subscribe();
  return () => {
    try { supabase.removeChannel(ch); } catch { /* noop */ }
  };
}

/** Playlists colectivas de todas tus salas y directos (para mostrarlas en Música). */
export async function loadRoomPlaylists(meId) {
  const rooms = await loadRooms().catch(() => []);
  const { ok, rows } = await pullRows('room_tracks', 0).catch(() => ({ ok: false, rows: [] }));
  const byRoom = {};
  for (const r of ok ? rows : []) (byRoom[String(r.room_id)] ||= []).push(r);
  const out = [];
  for (const room of rooms) {
    const rowsR = (ok ? byRoom[room.id] : getLocalRoomTracks(room.id)) || [];
    if (!rowsR.length) continue;
    const isDM = room.kind === 'dm';
    if (isDM && meId && room.member_a !== meId && room.member_b !== meId) continue;
    const sorted = [...rowsR].sort((a, b) => (a.added_at || 0) - (b.added_at || 0)).map(trackFromRow);
    out.push({ id: `room:${room.id}`, roomId: room.id, name: room.name || (isDM ? 'Directo' : 'Sala'), icon: room.icon || '', kind: isDM ? 'dm' : 'group', tracks: sorted });
  }
  return out;
}
