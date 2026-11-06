// Música local persistida en IndexedDB (los blob: URLs mueren al recargar,
// así que se guarda el archivo y se regenera la URL cada sesión).
// Registro: { id, title, artist, fileName, blob, art, duration, addedAt }

const DB = 'hermes-local';
const STORE = 'songs';
const HSTOREF = 'handles';
const HKEY = 'scan-dir';

/** Id único de carpeta: mismo cálculo al guardar, tocar y borrar
 *  (antes guardar minúsculas y borrar tal cual dejaba fantasmas). */
export const dirId = (name) => `dir_${String(name || 'carpeta').trim().toLowerCase() || 'carpeta'}`;
/** Quita el prefijo dir_ (insensible a mayúsculas) para comparar nombres. */
export const dirShort = (idOrName) => String(idOrName || '').replace(/^dir_/i, '');

function openDb() {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open(DB, 2);
      r.onupgradeneeded = () => {
        if (!r.result.objectStoreNames.contains(STORE)) {
          r.result.createObjectStore(STORE, { keyPath: 'id' });
        }
        if (!r.result.objectStoreNames.contains(HSTOREF)) {
          r.result.createObjectStore(HSTOREF, { keyPath: 'id' });
        }
      };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) {
      rej(e);
    }
  });
}

/** Guarda el FileSystemDirectoryHandle de una carpeta escaneada (multi-carpeta).
 *  id = nombre normalizado; si ya existe se actualiza el handle (re-escaneo).
 *  Mantiene compatibilidad con la versión de 1 sola carpeta (HKEY='scan-dir'). */
export async function putDirHandle(handle, name) {
  const clean = String(name || handle?.name || 'carpeta').trim() || 'carpeta';
  const id = dirId(clean);
  const db = await openDb();
  return new Promise((res, rej) => {
    try {
      const t = db.transaction(HSTOREF, 'readwrite');
      const st = t.objectStore(HSTOREF);
      const q = st.get(id);
      q.onsuccess = () => {
        const prev = q.result || {};
        st.put({ id, handle: handle || prev.handle || null, name: clean, at: Date.now(), total: prev.total || 0, added: prev.added || 0, kind: handle ? 'handle' : (prev.kind || 'picker') });
      };
      t.oncomplete = () => res(true);
      t.onerror = () => rej(t.error);
    } catch (e) {
      rej(e);
    }
  });
}

/** Actualiza contadores de una carpeta (total/added) sin tocar el handle. */
export async function touchDirHandle(name, info = {}) {
  const clean = String(name || 'carpeta').trim() || 'carpeta';
  const id = dirId(clean);
  try {
    const db = await openDb();
    return new Promise((res) => {
      try {
        const t = db.transaction(HSTOREF, 'readwrite');
        const st = t.objectStore(HSTOREF);
        const q = st.get(id);
        q.onsuccess = () => {
          const prev = q.result || { id, handle: null, name: clean };
          st.put({ ...prev, id, name: prev.name || clean, at: Date.now(), total: info.total ?? prev.total ?? 0, added: info.added ?? prev.added ?? 0, kind: prev.kind || (prev.handle ? 'handle' : 'picker') });
        };
        t.oncomplete = () => res(true);
        t.onerror = () => res(false);
      } catch {
        res(false);
      }
    });
  } catch {
    return false;
  }
}

/** Lista todas las carpetas escaneadas (migra la vieja de 1 sola si hace falta). */
export async function getAllDirHandles() {
  try {
    const db = await openDb();
    const all = await new Promise((res) => {
      try {
        const t = db.transaction(HSTOREF, 'readonly');
        const q = t.objectStore(HSTOREF).getAll();
        q.onsuccess = () => res(q.result || []);
        q.onerror = () => res([]);
      } catch {
        res([]);
      }
    });
    const legacy = all.find((r) => r?.id === HKEY);
    let list = all.filter((r) => r?.id !== HKEY && r?.name);
    if (legacy?.handle || legacy?.name) {
      const nm = String(legacy.name || legacy.handle?.name || 'carpeta');
      if (!list.some((d) => String(d.name).toLowerCase() === nm.toLowerCase())) {
        list = [{ id: dirId(nm), handle: legacy.handle || null, name: nm, at: legacy.at || Date.now(), kind: legacy.handle ? 'handle' : 'picker' }, ...list];
        // persiste la migración (sin borrar el legacy por compat)
        try {
          const t2 = db.transaction(HSTOREF, 'readwrite');
          t2.objectStore(HSTOREF).put(list[0]);
        } catch { /* noop */ }
      }
    }
    list.sort((a, b) => (b.at || 0) - (a.at || 0));
    return list;
  } catch {
    return [];
  }
}

/** Quita una carpeta de la lista (no borra la música, solo el acceso).
 *  Acepta id o nombre, con o sin prefijo, en cualquier mayúscula. */
export async function removeDirHandle(idOrName) {
  const id = dirId(dirShort(idOrName));
  try {
    const db = await openDb();
    return new Promise((res) => {
      try {
        const t = db.transaction(HSTOREF, 'readwrite');
        t.objectStore(HSTOREF).delete(id);
        t.oncomplete = () => res(true);
        t.onerror = () => res(false);
      } catch {
        res(false);
      }
    });
  } catch {
    return false;
  }
}

/** Recupera el handle guardado (o null si no hay / navegador sin soporte). */
export async function getDirHandle() {
  try {
    const db = await openDb();
    return new Promise((res) => {
      try {
        const t = db.transaction(HSTOREF, 'readonly');
        const q = t.objectStore(HSTOREF).get(HKEY);
        q.onsuccess = () => res(q.result || null);
        q.onerror = () => res(null);
      } catch {
        res(null);
      }
    });
  } catch {
    return null;
  }
}

/** Lee UN tema por id (evita getAll completo en bucles de escaneo). */
export async function getLocalSong(id) {
  try {
    const db = await openDb();
    return new Promise((res) => {
      try {
        const t = db.transaction(STORE, 'readonly');
        const q = t.objectStore(STORE).get(id);
        q.onsuccess = () => res(q.result || null);
        q.onerror = () => res(null);
      } catch {
        res(null);
      }
    });
  } catch {
    return null;
  }
}

export async function getAllLocalSongs() {  const db = await openDb();
  return new Promise((res, rej) => {
    try {
      const t = db.transaction(STORE, 'readonly');
      const q = t.objectStore(STORE).getAll();
      q.onsuccess = () => res(q.result || []);
      q.onerror = () => rej(q.error);
    } catch (e) {
      rej(e);
    }
  });
}

export async function putLocalSong(song) {
  const db = await openDb();
  return new Promise((res, rej) => {
    try {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).put(song);
      t.oncomplete = () => res(true);
      t.onerror = () => rej(t.error);
    } catch (e) {
      rej(e);
    }
  });
}

export async function deleteLocalSong(id) {
  const db = await openDb();
  return new Promise((res, rej) => {
    try {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).delete(id);
      t.oncomplete = () => res(true);
      t.onerror = () => rej(t.error);
    } catch (e) {
      rej(e);
    }
  });
}

export async function clearLocalSongs() {
  const db = await openDb();
  return new Promise((res, rej) => {
    try {
      const t = db.transaction(STORE, 'readwrite');
      t.objectStore(STORE).clear();
      t.oncomplete = () => res(true);
      t.onerror = () => rej(t.error);
    } catch (e) {
      rej(e);
    }
  });
}
