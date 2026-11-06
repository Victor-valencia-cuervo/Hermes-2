import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadChatMessages,
  sendChatMessage,
  subscribeRoomMessages,
  loadRoomTracks,
  addRoomTrack,
  removeRoomTrack,
  subscribeRoomTracks,
  trackFromRow,
  toLocalMsg,
  loadReactions,
  toggleReaction,
  subscribeReactions,
  getLocalReactions,
} from '../services/social';

/**
 * Chat de una sala: mensajes + playlist colectiva, realtime.
 * - onRemote(msg): avisa mensajes ajenos (para toasts en la vista).
 */
export default function useRoomChat(roomId, toast, onRemote, meId = null) {
  const [messages, setMessages] = useState([]);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState({});
  const onRemoteRef = useRef(onRemote);
  onRemoteRef.current = onRemote;
  const myIds = useRef(new Set());
  const meRef = useRef(meId);
  meRef.current = meId;
  // Marca como míos los de mi autoría (cubre mensajes enviados desde otro dispositivo).
  const markMine = (list) => {
    const me = meRef.current;
    if (!me) return list;
    let changed = false;
    const out = list.map((m) => {
      if (!m.mine && m.author_id && String(m.author_id) === String(me)) { changed = true; return { ...m, mine: true }; }
      return m;
    });
    return changed ? out : list;
  };

  useEffect(() => {
    if (!roomId) {
      setMessages([]);
      setTracks([]);
      setLoading(false);
      return undefined;
    }
    let dead = false;
    setLoading(true);
    myIds.current = new Set();
    loadChatMessages(roomId)
      .then((list) => {
        if (dead) return;
        setMessages(markMine(list));
        for (const m of list) if (m.mine) myIds.current.add(m.id);
        setLoading(false);
      })
      .catch(() => { if (!dead) setLoading(false); });
    loadRoomTracks(roomId)
      .then((rows) => { if (!dead) setTracks(rows); })
      .catch(() => {});
    setReactions(getLocalReactions(roomId));
    loadReactions(roomId).then((m) => { if (!dead) setReactions(m); }).catch(() => {});
    const offReact = subscribeReactions(roomId, () => {
      loadReactions(roomId).then((m) => { if (!dead) setReactions(m); }).catch(() => {});
    });
    const offMsg = subscribeRoomMessages(roomId, (m) => {
      if (dead) return;
      const me = meRef.current;
      const norm = (!m.mine && me && m.author_id && String(m.author_id) === String(me)) ? { ...m, mine: true } : m;
      setMessages((l) => (l.some((x) => x.id === norm.id) ? l : [...l, norm].slice(-300)));
      if (!norm.mine && !myIds.current.has(norm.id)) onRemoteRef.current?.(norm);
    });
    const offTracks = subscribeRoomTracks(roomId, () => {
      if (dead) return;
      loadRoomTracks(roomId).then((rows) => { if (!dead) setTracks(rows); }).catch(() => {});
    });
    return () => { dead = true; offMsg(); offTracks(); offReact(); };
  }, [roomId, toast]);

  const send = useCallback(async ({ text, song }) => {
    if (!roomId) return null;
    if (!String(text || '').trim() && !song) return null;
    const msg = await sendChatMessage(roomId, { text: String(text || '').trim(), song }).catch(() => null);
    if (!msg) {
      toast?.('No se pudo enviar');
      return null;
    }
    myIds.current.add(msg.id);
    setMessages((l) => (l.some((x) => x.id === msg.id) ? l : [...l, { ...toLocalMsg(msg), mine: true }].slice(-300)));
    // Compartir cancion tambien la suma a la playlist de la sala
    if (song && (song.title || song.url)) {
      const row = {
        room_id: roomId,
        track_id: `s_${msg.id}`,
        title: song.title || 'Tema compartido',
        artist: song.artist || msg.author || '',
        art: song.art || '',
        url: song.url || '',
        duration: Number(song.duration) || 0,
        added_by: msg.author_id || null,
        added_at: Date.now(),
      };
      setTracks((l) => (l.some((r) => r.track_id === row.track_id) ? l : [...l, row]));
      addRoomTrack(roomId, {
        id: row.track_id, title: row.title, artist: row.artist, art: row.art,
        url: row.url, duration: row.duration,
      }).catch(() => {});
    }
    return msg;
  }, [roomId, toast]);

  const addTrack = useCallback(async (track) => {
    if (!roomId || !track) return;
    const res = await addRoomTrack(roomId, track).catch(() => null);
    if (res?.row) {
      setTracks((l) => (l.some((r) => r.track_id === res.row.track_id) ? l : [...l, res.row]));
    } else {
      loadRoomTracks(roomId).then(setTracks).catch(() => {});
    }
    toast?.(res?.ok ? 'Agregada a la playlist de la sala' : 'Se agregará al sincronizar');
  }, [roomId, toast]);

  const removeTrack = useCallback(async (trackId) => {
    if (!roomId) return;
    setTracks((l) => l.filter((r) => String(r.track_id) !== String(trackId)));
    await removeRoomTrack(roomId, trackId).catch(() => {});
    toast?.('Quitado de la playlist de la sala');
  }, [roomId, toast]);

  const react = useCallback(async (messageId, emoji) => {
    if (!roomId) return;
    const map = await toggleReaction(roomId, messageId, emoji).catch(() => null);
    if (map) setReactions({ ...map });
  }, [roomId]);

  const playable = tracks.map(trackFromRow);

  return { messages, tracks, playable, loading, send, addTrack, removeTrack, reactions, react };
}
