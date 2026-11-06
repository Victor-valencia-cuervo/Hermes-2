// HERMES - Backend Supabase + cola offline local
// ------------------------------------------------
// Sin internet o sin configurar -> todo en local + cola h_outbox.
// Con internet + login -> upsert a Supabase y se vacia la cola.
//
// Tablas: users | rooms | playlists | messages  (ver SQL en el chat)
// Misma firma que el adapter anterior para no tocar el resto:
//   pushRow(tab, row) / pullRows(tab, since) / flushOutbox()

import { createClient } from '@supabase/supabase-js';

const OUTBOX_KEY = 'h_outbox';
const LAST_SYNC_KEY = 'h_last_sync';

const URL = import.meta.env.VITE_SUPABASE_URL || '';
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = URL && KEY ? createClient(URL, KEY) : null;

export function isCloudConfigured() {
  return Boolean(supabase);
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

// ---- Cola offline (outbox, igual que antes) ----
export function getOutbox() {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function setOutbox(arr) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(arr));
  } catch {
    /* storage lleno */
  }
  try {
    window.dispatchEvent(new CustomEvent('hermes:outbox', { detail: { pending: arr.length } }));
  } catch {
    /* noop */
  }
}

export function queueOffline(tab, row) {
  const box = getOutbox();
  box.push({ id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, tab, row, createdAt: Date.now() });
  setOutbox(box);
  return { ok: false, queued: true };
}

/** Saca de la cola todo lo pendiente de una fila (al borrarla: no revive en la nube).
 *  rowId es row.id, o "room_id:track_id" para room_tracks. */
export function removeFromOutbox(tab, rowId) {
  const box = getOutbox().filter((item) => {
    if (item.tab !== tab) return true;
    const r = item?.row || {};
    return r.id !== rowId && `${r.room_id}:${r.track_id}` !== String(rowId);
  });
  setOutbox(box);
}

/** Reescribe la cola con un filtro (true = conservar). */
export function filterOutbox(keep) {
  try {
    setOutbox(getOutbox().filter(keep));
  } catch {
    /* noop */
  }
}

/** Borrado real en la nube (complementa el borrado local). */
export async function deleteRow(tab, id) {
  if (!supabase || !isOnline()) return { ok: false, offline: true };
  try {
    const { error } = await supabase.from(tab).delete().eq('id', id);
    if (error) throw error;
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export function getLastSync() {
  try {
    return Number(localStorage.getItem(LAST_SYNC_KEY) || 0);
  } catch {
    return 0;
  }
}

/**
 * Al entrar con Google: reasigna la cola offline al uid real para que
 * las policies RLS (user_id = auth.uid()) acepten lo pendiente.
 */
export function reassignOutboxOwner(uid) {
  if (!uid) return 0;
  const box = getOutbox();
  let n = 0;
  for (const item of box) {
    if (!item?.row) continue;
    if (item.tab === 'playlists' && item.row.user_id !== uid) {
      item.row.user_id = uid;
      n++;
    }
    if (item.tab === 'messages' && !item.row.author_id) {
      item.row.author_id = uid;
      n++;
    }
    if (item.tab === 'rooms' && !item.row.created_by) {
      item.row.created_by = uid;
      n++;
    }
  }
  if (n) setOutbox(box);
  return n;
}

function setLastSync(t) {
  try {
    localStorage.setItem(LAST_SYNC_KEY, String(t));
  } catch {
    /* noop */
  }
}

// ---- Normalizacion por tabla ----
const TIME_COL = { users: 'updated_at', playlists: 'updated_at', messages: 'created_at', rooms: 'created_at', room_tracks: 'added_at' };

function toCloud(tab, row) {
  const r = { ...row };
  if (tab === 'playlists' && typeof r.tracks_json === 'string') {
    try {
      r.tracks_json = JSON.parse(r.tracks_json);
    } catch {
      r.tracks_json = [];
    }
  }
  return r;
}

function fromCloud(tab, r) {
  const o = { ...r };
  if (tab === 'playlists') {
    if (typeof o.tracks_json === 'string') {
      try {
        o.tracks_json = JSON.parse(o.tracks_json);
      } catch {
        o.tracks_json = [];
      }
    }
    if (!Array.isArray(o.tracks_json)) o.tracks_json = [];
  }
  return o;
}

// Columnas opcionales (v5/v6): si la migracion SQL aun no se corrio, se reintenta sin ellas.
const OPTIONAL_COLS = { rooms: ['icon', 'color'], messages: ['song_art'] };

async function upsertTolerant(tab, row) {
  let r = await supabase.from(tab).upsert(toCloud(tab, row), { onConflict: 'id' });
  const opt = OPTIONAL_COLS[tab];
  if (r.error && opt && /column|schema cache/i.test(String(r.error.message || ''))) {
    const slim = { ...row };
    for (const c of opt) delete slim[c];
    r = await supabase.from(tab).upsert(toCloud(tab, slim), { onConflict: 'id' });
  }
  return r;
}

// ---- Escritura (upsert idempotente por id) ----
export async function pushRow(tab, row) {
  if (!supabase || !isOnline()) return queueOffline(tab, row);
  try {
    const { error } = await upsertTolerant(tab, row);
    if (error) throw error;
    setLastSync(Date.now());
    return { ok: true, queued: false };
  } catch {
    // Sin sesion (RLS), sin red, etc: no se pierde, queda en cola.
    return queueOffline(tab, row);
  }
}

// ---- Lectura incremental ----
export async function pullRows(tab, since = 0) {
  if (!supabase || !isOnline()) return { ok: false, offline: true, rows: [] };
  try {
    const col = TIME_COL[tab] || 'created_at';
    let q = supabase.from(tab).select('*').order(col, { ascending: true }).limit(500);
    if (since) q = q.gte(col, Number(since));
    const { data, error } = await q;
    if (error) throw error;
    setLastSync(Date.now());
    return { ok: true, rows: (data || []).map((r) => fromCloud(tab, r)) };
  } catch {
    return { ok: false, offline: true, rows: [] };
  }
}

// ---- Vaciar cola cuando vuelve internet / sesion ----
export async function flushOutbox() {
  if (!supabase || !isOnline()) return { ok: false, offline: true, sent: 0 };
  const box = getOutbox();
  if (!box.length) return { ok: true, sent: 0 };
  let sent = 0;
  const rest = [];
  for (const item of box) {
    try {
      const { error } = await upsertTolerant(item.tab, item.row);
      if (error) throw error;
      sent++;
    } catch {
      rest.push(item);
    }
  }
  setOutbox(rest);
  if (sent) setLastSync(Date.now());
  return { ok: rest.length === 0, sent, pending: rest.length };
}

// ---- Auth (Google) ----
export async function getSessionUser() {
  try {
    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.user || null;
  } catch {
    return null;
  }
}

export async function signInWithGoogle() {
  if (!supabase) return { ok: false, reason: 'no_config' };
  // VITE_SITE_URL (opcional) = dominio canónico de producción, ej:
  // https://hermes06.pages.dev — si no existe, usa el origin actual.
  // Esto evita que en producción te devuelva a localhost.
  const siteUrl = (import.meta.env.VITE_SITE_URL || '').trim().replace(/\/+$/, '');
  const redirectTo = siteUrl || `${window.location.origin}/`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  });
  if (error) return { ok: false, error: String(error.message || error) };
  return { ok: true };
}

export async function signOut() {
  try {
    await supabase?.auth.signOut();
  } catch {
    /* noop */
  }
}

export function onAuthChange(cb) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_ev, session) => cb?.(session?.user || null));
  return () => data?.subscription?.unsubscribe?.();
}

// ---- Realtime ----
function mapMsg(r) {
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

/** Todos los mensajes nuevos (para avisos de otras salas). */
export function subscribeAllMessages(onInsert) {
  if (!supabase) return () => {};
  const ch = supabase
    .channel('messages-all')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      try {
        onInsert?.(mapMsg(payload.new));
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

export function subscribeMessages(roomId, onInsert) {
  if (!supabase) return () => {};
  const ch = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
      (payload) => {
        try {
          onInsert?.(mapMsg(payload.new));
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

export function subscribeRooms(onChange) {
  if (!supabase) return () => {};
  const ch = supabase
    .channel('rooms')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
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
