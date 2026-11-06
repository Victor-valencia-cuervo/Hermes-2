import { useCallback, useEffect, useRef } from 'react';
import useStore from './useStore';
import { pushRow, deleteRow, removeFromOutbox } from '../services/supabase';

/**
 * Playlists locales (h_pls): [{ id, name, description, color, isPublic, tracks: [] }]
 * Con nube opcional: cada cambio se respalda en Supabase (tabla playlists).
 * Sin internet, sin configurar o sin login -> sigue 100% en local (cola outbox).
 */
let seq = Date.now();
const nid = () => `pl_${(seq++).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

const DEF_COLOR = '#6366f1';

// Compatibilidad: playlists viejas sin los campos nuevos.
export function normalizePl(pl) {
  if (!pl || typeof pl !== 'object') return null;
  return {
    id: pl.id,
    name: String(pl.name || 'Sin nombre').slice(0, 40),
    description: String(pl.description || '').slice(0, 140),
    color: typeof pl.color === 'string' && pl.color ? pl.color.slice(0, 30) : DEF_COLOR,
    isPublic: pl.isPublic !== false,
    vinyl: ['classic', 'neon', 'galaxy', 'gold'].includes(pl.vinyl) ? pl.vinyl : 'classic',
    label: typeof pl.label === 'string' ? pl.label.slice(0, 3) : '',
    tracks: Array.isArray(pl.tracks) ? pl.tracks : [],
  };
}

function getUid() {
  try {
    let u = localStorage.getItem('h_uid');
    if (!u) {
      u = `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem('h_uid', u);
    }
    return u;
  } catch {
    return 'u_local';
  }
}

export default function usePlaylists(toast) {
  const [raw, setPlaylists] = useStore('h_pls', []);
  const playlists = (Array.isArray(raw) ? raw : []).map(normalizePl).filter(Boolean);
  const first = useRef(true);

  // Respaldo a la nube con debounce: no bloquea la UI, si falla queda en cola.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      try {
        const uid = getUid();
        for (const pl of playlists) {
          pushRow('playlists', {
            id: pl.id,
            user_id: uid,
            name: pl.name,
            description: pl.description || '',
            color: pl.color || DEF_COLOR,
            is_public: pl.isPublic !== false,
            tracks_json: JSON.stringify((pl.tracks || []).map((x) => ({
              id: x.id, title: x.title, artist: x.artist, art: x.art,
            }))).slice(0, 45000),
            updated_at: Date.now(),
          }).catch(() => {});
        }
      } catch {
        /* offline: ya quedo en local */
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [raw]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = useCallback((name, opts = {}) => {
    const n = String(name || '').trim().slice(0, 40);
    if (!n) return null;
    // Nace como borrador (privada): se publica con publish().
    const pl = normalizePl({
      id: nid(),
      name: n,
      description: opts.description || '',
      color: opts.color || DEF_COLOR,
      isPublic: opts.isPublic === true,
      tracks: [],
    });
    setPlaylists((l) => [pl, ...(Array.isArray(l) ? l : [])]);
    toast?.(`Playlist "${n}" creada como borrador`);
    return pl;
  }, [setPlaylists, toast]);

  const rename = useCallback((id, name) => {
    const n = String(name || '').trim().slice(0, 40);
    if (!n) return;
    setPlaylists((l) => l.map((pl) => (pl.id === id ? { ...pl, name: n } : pl)));
  }, [setPlaylists]);

  const updateMeta = useCallback((id, patch = {}) => {
    setPlaylists((l) => l.map((pl) => {
      if (pl.id !== id) return pl;
      const next = { ...pl };
      if (patch.name !== undefined) next.name = String(patch.name).slice(0, 40);
      if (patch.description !== undefined) next.description = String(patch.description).slice(0, 140);
      if (patch.color !== undefined) next.color = String(patch.color).slice(0, 30);
      if (patch.isPublic !== undefined) next.isPublic = Boolean(patch.isPublic);
      if (patch.vinyl !== undefined && ['classic', 'neon', 'galaxy', 'gold'].includes(patch.vinyl)) next.vinyl = patch.vinyl;
      if (patch.label !== undefined) next.label = String(patch.label).slice(0, 3);
      return next;
    }));
  }, [setPlaylists]);

  const remove = useCallback((id) => {
    // Borrado total: cola + nube + local (no revive al sincronizar).
    removeFromOutbox('playlists', id);
    deleteRow('playlists', id).catch(() => {});
    setPlaylists((l) => l.filter((pl) => pl.id !== id));
    toast?.('Playlist eliminada');
  }, [setPlaylists, toast]);

  /** Publica un borrador: visible en el perfil + subida inmediata a la nube. */
  const publish = useCallback((id) => {
    let row = null;
    setPlaylists((l) => l.map((pl) => {
      if (pl.id !== id) return pl;
      const next = normalizePl({ ...pl, isPublic: true });
      row = {
        id: next.id,
        user_id: getUid(),
        name: next.name,
        description: next.description || '',
        color: next.color || DEF_COLOR,
        is_public: true,
        tracks_json: JSON.stringify((next.tracks || []).map((x) => ({
          id: x.id, title: x.title, artist: x.artist, art: x.art,
        }))).slice(0, 45000),
        updated_at: Date.now(),
      };
      return next;
    }));
    if (row) {
      pushRow('playlists', row).catch(() => {});
      toast?.(`Playlist "${row.name}" publicada`);
    }
  }, [setPlaylists, toast]);

  const addTrack = useCallback((id, track, quiet) => {
    if (!track) return false;
    let added = false;
    setPlaylists((l) => l.map((pl) => {
      if (pl.id !== id) return pl;
      if (pl.tracks.some((x) => x.id === track.id)) return pl;
      added = true;
      return { ...pl, tracks: [...pl.tracks, track] };
    }));
    if (!quiet) toast?.(added ? 'Agregada a la playlist' : 'Ya estaba en la playlist');
    return added;
  }, [setPlaylists, toast]);

  const removeTrack = useCallback((id, trackId) => {
    setPlaylists((l) => l.map((pl) => (
      pl.id === id ? { ...pl, tracks: pl.tracks.filter((x) => x.id !== trackId) } : pl
    )));
  }, [setPlaylists]);

  const inPlaylist = useCallback((id, trackId) =>
    (playlists.find((pl) => pl.id === id)?.tracks || []).some((x) => x.id === trackId),
  [playlists]);

  return { playlists, create, rename, updateMeta, publish, remove, addTrack, removeTrack, inPlaylist };
}
