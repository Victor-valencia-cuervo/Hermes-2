import { useCallback, useEffect, useState } from 'react';
import { loadRooms, createRoom, subscribeRoomList } from '../services/social';

/**
 * Salas: locales primero + nube + realtime.
 * - rooms: [{ id, name, description, genre, is_public, created_at }]
 */
export default function useRooms(toast) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const list = await loadRooms();
      setRooms(Array.isArray(list) ? list : []);
    } catch {
      /* local ya esta */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const off = subscribeRoomList(() => reload());
    return off;
  }, [reload]);

  const create = useCallback(async (data) => {
    const room = await createRoom(data).catch(() => null);
    if (!room) {
      toast?.('Ponle nombre a la sala');
      return null;
    }
    setRooms((l) => [room, ...l.filter((r) => r.id !== room.id)]);
    toast?.(`Sala "${room.name}" creada`);
    return room;
  }, [toast]);

  return { rooms, loading, reload, create };
}
