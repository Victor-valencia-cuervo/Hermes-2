import { useCallback, useEffect, useRef, useState } from 'react';
import 'jsmediatags/dist/jsmediatags.min.js'; // UMD: expone window.jsmediatags
import { Check, AlertTriangle } from 'lucide-react';
import { getAllLocalSongs, getLocalSong, putLocalSong, deleteLocalSong, clearLocalSongs, putDirHandle, getDirHandle, getAllDirHandles, removeDirHandle, touchDirHandle, dirId, dirShort } from '../lib/localdb';
import { shrinkArt, findRemoteArt } from '../lib/artwork';
import { SAFE } from '../lib/safe';

const AUDIO_EXT = /\.(mp3|m4a|mp4|flac|ogg|oga|opus|wav|aac|wma|webm)$/i;
const VIDEO_EXT = /\.(mp4|m4v|mov|webm)$/i;
const isVideoFile = (f) => (f?.type || '').startsWith('video/') || VIDEO_EXT.test(f?.name || '');

// Id estable por archivo: re-agregar la misma carpeta no duplica.
const stableId = (f) => {
  const s = `${f.name}|${f.size}|${f.lastModified}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return `l_${(h >>> 0).toString(36)}_${Number(f.size || 0).toString(36)}`;
};

function parseName(fileName) {
  const base = String(fileName || '').replace(/\.[^.]+$/, '');
  const parts = base.split(' - ');
  if (parts.length >= 2) {
    return { artist: parts[0].trim() || 'Local', title: parts.slice(1).join(' - ').trim() || base };
  }
  return { artist: 'Local', title: base };
}

/** Portada de un video local: captura un fotograma (como Namida). Nunca lanza. */
function captureVideoPoster(file) {
  return new Promise((resolve) => {
    let done = false;
    const fin = (v) => { if (!done) { done = true; resolve(v); } };
    try {
      const url = URL.createObjectURL(file);
      const v = document.createElement('video');
      v.preload = 'auto';
      v.muted = true;
      v.playsInline = true;
      const cleanup = () => { try { URL.revokeObjectURL(url); } catch {} };
      v.onloadedmetadata = () => {
        try {
          const t = Math.min(1.5, Math.max(0.3, (v.duration || 0) * 0.1));
          v.currentTime = Number.isFinite(t) ? t : 0.5;
        } catch { fin(''); cleanup(); }
      };
      v.onseeked = () => {
        try {
          const w = v.videoWidth, h = v.videoHeight;
          if (!w || !h) { fin(''); cleanup(); return; }
          const k = Math.min(1, 512 / Math.max(w, h));
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(w * k));
          cv.height = Math.max(1, Math.round(h * k));
          cv.getContext('2d').drawImage(v, 0, 0, cv.width, cv.height);
          const du = cv.toDataURL('image/jpeg', 0.82);
          fin(du && du.length > 1000 ? du : '');
        } catch { fin(''); }
        cleanup();
      };
      v.onerror = () => { fin(''); cleanup(); };
      v.src = url;
      setTimeout(() => { fin(''); cleanup(); }, 9000);
    } catch {
      fin('');
    }
  });
}

/** ¿El blob trae imagen real incrustada? (para no pisarla con arte generada/remota). */
function blobHasArt(blob) {
  return new Promise((resolve) => {
    try {
      const lib = window.jsmediatags;
      if (!lib?.read) { resolve(false); return; }
      lib.read(blob, {
        onSuccess: (tag) => {
          const pic = tag?.tags?.picture;
          resolve(!!(pic && Array.isArray(pic.data) && pic.data.length));
        },
        onError: () => resolve(false),
      });
    } catch {
      resolve(false);
    }
  });
}

/** Etiquetas + carátula incrustada (si trae). Nunca lanza. */
function readTags(file) {
  return new Promise((resolve) => {
    try {
      const lib = window.jsmediatags;
      if (!lib?.read) { resolve({}); return; }
      lib.read(file, {
        onSuccess: async (tag) => {
          const t = tag.tags || {};
          let art = '';
          let embedded = false;
          try {
            const pic = t.picture;
            // Hasta ~1MB directo; si es más grande se reduce a 512px en vez de perderla.
            if (pic && Array.isArray(pic.data) && pic.data.length) {
              embedded = true;
              if (pic.data.length < 1000000) {
                let b64 = '';
                const d = pic.data;
                const CH = 8192;
                for (let i = 0; i < d.length; i += CH) {
                  b64 += String.fromCharCode.apply(null, d.slice(i, i + CH));
                }
                art = `data:${pic.format || 'image/jpeg'};base64,${btoa(b64)}`;
              } else {
                let b64 = '';
                const d = pic.data;
                const CH = 8192;
                for (let i = 0; i < d.length; i += CH) {
                  b64 += String.fromCharCode.apply(null, d.slice(i, i + CH));
                }
                const raw = `data:${pic.format || 'image/jpeg'};base64,${btoa(b64)}`;
                art = await shrinkArt(raw).catch(() => '');
              }
            }
          } catch { /* sin carátula */ }
          resolve({ title: t.title || '', artist: t.artist || '', art, embedded });
        },
        onError: () => resolve({}),
      });
    } catch {
      resolve({});
    }
  });
}

/** Carátula generada por nombre (degradado + inicial): para los que no traen
 * imagen incrustada. Se guarda en IndexedDB como cualquier arte. */
function makeNameArt(title, artist, size = 512) {
  try {
    const str = (s) => String(s || '');
    let h1 = 0;
    const key = `${str(title)}|${str(artist)}`;
    for (let i = 0; i < key.length; i++) h1 = ((h1 << 5) - h1 + key.charCodeAt(i)) | 0;
    const hue1 = ((h1 >>> 0) * 37) % 360;
    const hue2 = (hue1 + 60 + (((h1 >>> 8) % 80))) % 360;
    const cv = document.createElement('canvas');
    cv.width = size; cv.height = size;
    const cx = cv.getContext('2d');
    const g = cx.createLinearGradient(0, 0, size, size);
    g.addColorStop(0, `hsl(${hue1} 62% 46%)`);
    g.addColorStop(1, `hsl(${hue2} 60% 26%)`);
    cx.fillStyle = g;
    cx.fillRect(0, 0, size, size);
    // brillo suave
    const r = cx.createRadialGradient(size * 0.3, size * 0.25, 10, size * 0.3, size * 0.25, size * 0.9);
    r.addColorStop(0, 'rgba(255,255,255,.28)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    cx.fillStyle = r;
    cx.fillRect(0, 0, size, size);
    const letter = (str(title).trim()[0] || '?').toUpperCase();
    cx.fillStyle = 'rgba(255,255,255,.95)';
    cx.font = `700 ${Math.round(size * 0.42)}px Georgia, serif`;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(letter, size / 2, size * 0.54);
    return cv.toDataURL('image/jpeg', 0.85);
  } catch {
    return '';
  }
}

/** Duración vía elemento Audio temporal. Nunca lanza. */
function readDuration(blob) {
  return new Promise((resolve) => {
    let done = false;
    const fin = (v) => { if (!done) { done = true; resolve(v); } };
    try {
      const url = URL.createObjectURL(blob);
      const a = new Audio();
      a.preload = 'metadata';
      a.onloadedmetadata = () => { try { URL.revokeObjectURL(url); } catch {} fin(Math.round(a.duration || 0)); };
      a.onerror = () => { try { URL.revokeObjectURL(url); } catch {} fin(0); };
      a.src = url;
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch {} fin(0); }, 8000);
    } catch {
      fin(0);
    }
  });
}

const byTitle = (a, b) => String(a.title || '').localeCompare(String(b.title || ''));

/** ¿El handle sigue con permiso de lectura? Pide solo si hace falta (requiere gesto). */
async function ensureReadPermission(handle, request = false) {
  try {
    if (!handle) return false;
    if (handle.queryPermission) {
      const q = await handle.queryPermission({ mode: 'read' }).catch(() => 'prompt');
      if (q === 'granted') return true;
      if (!request) return false;
    }
    if (request && handle.requestPermission) {
      const r = await handle.requestPermission({ mode: 'read' }).catch(() => 'denied');
      return r === 'granted';
    }
    // Sin API de permisos (Firefox/Safari): se asume que sí al tener el handle.
    return !handle.queryPermission;
  } catch {
    return false;
  }
}

/** Recorre una carpeta recursivamente y junta archivos de audio/video (máx cap).
 *  Anota en cada File: _dir (carpeta raíz) y _rel (ruta relativa) para agrupar por carpeta. */
async function collectAudioFiles(dirHandle, cap = 1200) {
  const out = [];
  const root = String(dirHandle?.name || 'carpeta');
  const stack = [{ h: dirHandle, path: '' }];
  try {
    while (stack.length && out.length < cap) {
      const { h: dir, path } = stack.pop();
      let entries = null;
      try {
        entries = dir.values ? dir.values() : null;
      } catch { entries = null; }
      if (!entries) continue;
      for await (const entry of entries) {
        if (out.length >= cap) break;
        try {
          if (entry.kind === 'directory') {
            // Evita carpetas del sistema que alentan el escaneo.
            const n = String(entry.name || '').toLowerCase();
            if (n === 'android' || n.startsWith('.')) continue;
            stack.push({ h: entry, path: path ? `${path}/${entry.name}` : String(entry.name || '') });
          } else if (entry.kind === 'file') {
            const nm = entry.name || '';
            if (AUDIO_EXT.test(nm) || VIDEO_EXT.test(nm)) {
              try {
                const f = await entry.getFile();
                if (f) {
                  try {
                    Object.defineProperties(f, {
                      _dir: { value: root, enumerable: false },
                      _rel: { value: path ? `${path}/${nm}` : nm, enumerable: false },
                    });
                  } catch { /* File no extensible en algunos navegadores */ }
                  out.push(f);
                }
              } catch { /* sin acceso a ese archivo */ }
            }
          }
        } catch { /* entrada ilegible: se salta */ }
        if (out.length >= cap) break;
      }
    }
  } catch { /* carpeta ilegible */ }
  return out;
}

/**
 * Música local: carpeta/archivos → IndexedDB → suena por <audio>.
 * El reproductor ya la acepta (source Local con src objectURL).
 */
export default function useLocalTracks(toast) {
  const [tracks, setTracks] = useState([]);
  const [ready, setReady] = useState(false);
  const [importing, setImporting] = useState(false);
  // Escaneo con acceso a carpeta: progreso visible + sileo con conteo al final.
  const [scan, setScan] = useState({ active: false, done: 0, total: 0, added: 0, name: '' });
  const [lastDir, setLastDir] = useState('');
  const [dirs, setDirs] = useState([]); // [{id,name,at,total,added,kind,handle?}]
  const dirHandle = useRef(null);
  const dirHandles = useRef(new Map()); // nameLower -> handle (sesión)
  const urls = useRef(new Map()); // id -> objectURL vigente
  const sizes = useRef(new Map()); // id -> bytes
  const tracksRef = useRef([]);
  tracksRef.current = tracks;

  const urlFor = useCallback((id) => urls.current.get(id) || null, []);

  const refreshDirs = useCallback(async () => {
    try {
      const list = await getAllDirHandles().catch(() => []);
      // reinyecta handles vivos de la sesión (IndexedDB los devuelve, pero por si acaso)
      const merged = (list || []).map((d) => ({
        ...d,
        handle: d.handle || dirHandles.current.get(String(d.name || '').toLowerCase()) || null,
      }));
      setDirs(merged);
      if (merged.length) setLastDir(merged[0].name || '');
      return merged;
    } catch {
      return [];
    }
  }, []);

  // Carga inicial: regenera URLs y marca listo (para rehidratar la cola).
  // A los que no tienen arte se les asigna uno por nombre y se guarda en local.
  // En modo seguro se omite por completo.
  useEffect(() => {
    if (SAFE) { setReady(true); return; }
    let dead = false;
    (async () => {
      try {
        const rows = await getAllLocalSongs();
        if (dead) return;
        const list = [];
        const heal = [];
        for (const r of rows) {
          try {
            const url = URL.createObjectURL(r.blob);
            urls.current.set(r.id, url);
            sizes.current.set(r.id, r.blob?.size || 0);
            let art = r.art || '';
            let artKind = r.artKind || '';
            if (!art) {
              art = makeNameArt(r.title, r.artist);
              artKind = 'generated';
              if (art) heal.push(putLocalSong({ ...r, art, artKind }).catch(() => {}));
            }
            list.push({
              id: r.id, title: r.title, artist: r.artist, art,
              kind: r.kind || 'audio', addedAt: r.addedAt || 0, fileMod: r.fileMod || 0,
              src: url, full: true, source: 'Local',
              duration: r.duration || 0, genre: '',
              dir: r.dir || r.dirName || '',
              rel: r.rel || '',
              downloaded: true, localAvailable: true, available: true,
              libraryState: 'downloaded', availability: 'downloaded',
            });
          } catch { /* archivo corrupto: se salta */ }
        }
        list.sort(byTitle);
        setTracks(list);
        if (heal.length) Promise.all(heal).catch(() => {});
      } catch { /* sin IndexedDB: lista vacía */ }
      finally { if (!dead) setReady(true); }
    })();
    return () => { dead = true; };
  }, []);

  // Recupera todas las carpetas (multi-carpeta, con migración de la vieja de 1).
  useEffect(() => {
    if (SAFE) return;
    refreshDirs().then((list) => {
      const first = (list || []).find((d) => d.handle) || list?.[0];
      if (first?.handle) {
        dirHandle.current = first.handle;
        setLastDir(first.name || first.handle?.name || '');
      } else {
        // Compat: vieja clave única
        getDirHandle().then((r) => {
          if (r?.handle) {
            dirHandle.current = r.handle;
            setLastDir(r.name || r.handle?.name || '');
          }
        }).catch(() => {});
      }
    }).catch(() => {});
  }, [refreshDirs]);

/** Carrera con tope: si una lectura se cuelga (tags corruptos), no frena el escaneo. */
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    Promise.resolve(promise).catch(() => fallback),
    new Promise((res) => setTimeout(() => res(fallback), ms)),
  ]);
}

  /** Importa UN archivo a IndexedDB. Devuelve { st: 'added'|'skipped', t }.
   *  opts: { skipRemote, skipPoster, collect } — en escaneos masivos se difiere
   *  el arte remoto/poster (lo hace el auto-enriquecido) y el llamador lotea
   *  los setTracks; si collect es un array, el tema se acumula ahí sin setState. */
  const importOne = useCallback(async (f, dirName = '', opts = {}) => {
    const id = stableId(f);
    if (urls.current.has(id)) {
      // Si ya existía pero ahora sabemos su carpeta, curarlo (1 lectura puntual, no getAll).
      if (dirName) {
        try {
          const prev = await getLocalSong(id).catch(() => null);
          if (prev && !prev.dir) {
            const healed = { ...prev, dir: dirName, rel: f._rel || prev.rel || '' };
            await putLocalSong(healed).catch(() => {});
            setTracks((t) => t.map((x) => (x.id === id ? { ...x, dir: dirName, rel: healed.rel } : x)));
          }
        } catch { /* noop */ }
      }
      return { st: 'skipped' };
    }
    const folder = String(dirName || f?._dir || '').trim();
    const rel = String(f?._rel || '').trim();
    const isVid = isVideoFile(f);
    // Con tope: readTags sin callback (archivo raro) no cuelga el escaneo.
    const [tags, dur] = await Promise.all([withTimeout(readTags(f), 8000, {}), readDuration(f)]);
    const parsed = parseName(f.name);
    const title = tags.title || parsed.title;
    const artist = tags.artist || parsed.artist;
    let art = tags.art || '';
    let artKind = tags.embedded ? 'embedded' : 'generated';
    if (!art && isVid && !opts.skipPoster) {
      const poster = await captureVideoPoster(f).catch(() => '');
      if (poster) { art = poster; artKind = 'embedded'; }
    }
    if (!art) art = makeNameArt(title, artist);
    // Fecha real de agregado al cel (nuevas primero) + fecha del archivo.
    const rec = {
      id, title, artist, fileName: f.name, blob: f,
      kind: isVid ? 'video' : 'audio', art, artKind,
      duration: dur || 0, addedAt: Date.now(),
      fileMod: Number(f?.lastModified || 0),
      dir: folder, rel,
    };
    await putLocalSong(rec);
    // En escaneo masivo NO se busca arte remoto por tema (N peticiones de red):
    // lo hace el auto-enriquecido después, sin bloquear la lista.
    if (artKind === 'generated' && !opts.skipRemote && navigator.onLine) {
      findRemoteArt(title, artist).then((du) => {
        if (!du) return;
        putLocalSong({ ...rec, art: du, artKind: 'remote' }).catch(() => {});
        setTracks((prev) => prev.map((x) => (x.id === id ? { ...x, art: du } : x)));
      }).catch(() => {});
    }
    const url = URL.createObjectURL(f);
    urls.current.set(id, url);
    sizes.current.set(id, f.size || 0);
    const t = {
      id, title: rec.title, artist: rec.artist, art: rec.art,
      kind: rec.kind, addedAt: rec.addedAt, fileMod: rec.fileMod,
      src: url, full: true, source: 'Local', duration: rec.duration, genre: '',
      dir: rec.dir, rel: rec.rel,
      downloaded: true, localAvailable: true, available: true,
      libraryState: 'downloaded', availability: 'downloaded',
    };
    if (Array.isArray(opts.collect)) opts.collect.push(t);
    else setTracks((prev) => [...prev, t].sort(byTitle));
    return { st: 'added', t };
  }, []);

  // Candado anti-escaneos simultáneos: un segundo escaneo no pisa al primero
  // (antes dos escaneos a la vez dejaban importing/scan colgados).
  const scanBusy = useRef(false);
  // Cancelación cooperativa: el botón Cancelar la activa y los bucles la revisan.
  const cancelRef = useRef(false);

  /** Cancela el escaneo en curso (termina el archivo actual y suelta el candado). */
  const cancelScan = useCallback(() => {
    if (!scanBusy.current) return false;
    cancelRef.current = true;
    toast?.('Cancelando escaneo…');
    return true;
  }, [toast]);

  /** Vuelca un lote acumulado a la lista con un solo setState ordenado. */
  const flushBatch = useCallback((batch) => {
    if (!batch?.length) return;
    const chunk = batch.splice(0, batch.length);
    setTracks((prev) => [...prev, ...chunk].sort(byTitle));
  }, []);

  const importFiles = useCallback(async (fileList, onProgress) => {
    const files = [...(fileList || [])].filter(
      (f) => (f.type || '').startsWith('audio/') || (f.type || '').startsWith('video/')
        || AUDIO_EXT.test(f.name || '') || VIDEO_EXT.test(f.name || ''),
    );
    if (!files.length) { toast?.('Sin audio en esa carpeta', AlertTriangle); return { added: 0, total: 0, skipped: 0 }; }
    if (scanBusy.current) { toast?.('Ya hay un escaneo en curso, espera a que termine', AlertTriangle); return { added: 0, total: files.length, skipped: 0, busy: true }; }
    scanBusy.current = true;
    cancelRef.current = false;
    // Detecta la carpeta base (webkitRelativePath: "MiMusica/sub/tema.mp3").
    // Así la lista de carpetas también funciona en iPhone/Firefox (sin File System API).
    const tops = files.map((f) => String(f.webkitRelativePath || '').split('/')[0] || '').filter(Boolean);
    const topName = tops.length ? [...tops.reduce((m, n) => m.set(n, (m.get(n) || 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1])[0][0] : '';
    const dirName = String(topName || files[0]?._dir || 'Archivos elegidos').trim() || 'Archivos elegidos';
    setImporting(true);
    const batch = [];
    let added = 0;
    let skipped = 0;
    let cancelled = false;
    try {
      for (let i = 0; i < files.length; i++) {
        if (cancelRef.current) { cancelled = true; break; }
        try {
          const r = await importOne(files[i], files[i]?._dir || dirName, { collect: batch, skipRemote: files.length > 8, skipPoster: files.length > 8 });
          if (r?.st === 'added') added += 1;
          else skipped += 1;
        } catch {
          skipped += 1;
        }
        // Un solo setState cada 25 temas (antes era uno por tema: cientos de renders).
        if (batch.length >= 25) flushBatch(batch);
        try { onProgress?.({ done: i + 1, total: files.length, added }); } catch {}
      }
      flushBatch(batch);
      // Solo se registra la carpeta si aportó algo (adiós entradas fantasma de 0).
      if (added > 0) {
        try {
          await putDirHandle(null, dirName).catch(() => {});
          await touchDirHandle(dirName, { total: files.length, added }).catch(() => {});
          await refreshDirs().catch(() => {});
          setLastDir(dirName);
        } catch {}
      }
    } finally {
      flushBatch(batch);
      scanBusy.current = false;
      cancelRef.current = false;
      setImporting(false);
    }
    if (cancelled) { toast?.(`Escaneo cancelado: ${added} agregadas`, AlertTriangle); return { added, total: files.length, skipped, cancelled: true }; }
    if (added) toast?.(`Escaneo: ${added} de ${files.length} agregadas`, Check);
    else toast?.('Esos temas ya estaban', Check);
    return { added, total: files.length, skipped };
  }, [toast, importOne, refreshDirs, flushBatch]);

  /**
   * Escanea un FileSystemDirectoryHandle recursivamente con progreso en vivo.
   * ACUMULA: cada carpeta nueva se suma a la lista, no reemplaza la anterior.
   * Muestra sileo tipo tarjeta al final: "Agregadas X de Y".
   * opts: { silent, background } — background (auto al entrar) no toca la UI
   * de progreso ni los toasts salvo que haya nuevas.
   */
  const scanDirectory = useCallback(async (handle, onProgress, opts = {}) => {
    if (!handle) return { added: 0, total: 0, skipped: 0 };
    if (scanBusy.current) {
      if (!opts?.background) toast?.('Ya hay un escaneo en curso, espera a que termine', AlertTriangle);
      return { added: 0, total: 0, skipped: 0, busy: true };
    }
    scanBusy.current = true;
    cancelRef.current = false;
    const silent = !!opts?.silent;
    const background = !!opts?.background;
    const showUI = !background;
    const name = String(handle.name || 'carpeta').trim() || 'carpeta';
    if (showUI) {
      setScan({ active: true, done: 0, total: 0, added: 0, name });
      setImporting(true);
    }
    const batch = [];
    try {
      const files = await collectAudioFiles(handle);
      if (cancelRef.current) {
        if (!silent) toast?.('Escaneo cancelado', AlertTriangle);
        return { added: 0, total: files.length, skipped: 0, cancelled: true };
      }
      if (!files.length) {
        if (!silent) toast?.('Sin audio en esa carpeta', AlertTriangle);
        // No se registra: una carpeta sin audio no deja entrada fantasma.
        // (Si ya existía de antes, se actualiza su conteo a 0 para purgarla.)
        try {
          const prev = await getAllDirHandles().catch(() => []);
          if ((prev || []).some((d) => d.id === dirId(name))) {
            await touchDirHandle(name, { total: 0, added: 0 }).catch(() => {});
            await refreshDirs().catch(() => {});
          }
        } catch {}
        return { added: 0, total: 0, skipped: 0 };
      }
      if (showUI) setScan({ active: true, done: 0, total: files.length, added: 0, name });
      const bulk = files.length > 8;
      let added = 0;
      let skipped = 0;
      let cancelled = false;
      let lastTick = 0;
      for (let i = 0; i < files.length; i++) {
        if (cancelRef.current) { cancelled = true; break; }
        try {
          const r = await importOne(files[i], name, { collect: batch, skipRemote: bulk, skipPoster: bulk });
          if (r?.st === 'added') added += 1;
          else skipped += 1;
        } catch {
          skipped += 1;
        }
        if (batch.length >= 25) flushBatch(batch);
        // Progreso limitado: máx ~1 render cada 5 archivos o 250ms (antes 1 por archivo).
        const now = Date.now();
        if (showUI && (i === files.length - 1 || i % 5 === 0 || now - lastTick > 250)) {
          lastTick = now;
          const st = { active: true, done: i + 1, total: files.length, added, name };
          setScan(st);
          try { onProgress?.(st); } catch {}
        }
      }
      flushBatch(batch);
      // Guarda/actualiza el handle en la LISTA (acumula, no reemplaza).
      // Si se canceló antes de aportar nada y la carpeta es nueva, no se registra.
      const isNew = !(await getAllDirHandles().catch(() => [])).some((d) => d.id === dirId(name));
      if (!cancelled || added > 0 || !isNew) {
        try {
          dirHandles.current.set(name.toLowerCase(), handle);
          dirHandle.current = handle;
          setLastDir(name);
          await putDirHandle(handle, name).catch(() => {});
          await touchDirHandle(name, { total: files.length, added }).catch(() => {});
          await refreshDirs().catch(() => {});
        } catch {}
      } else {
        try { await refreshDirs().catch(() => {}); } catch {}
      }
      // Toast estilo tarjeta con conteo (ver RULES en notify.js).
      // En silencioso (auto al entrar) solo avisa si hay nuevas.
      if (cancelled) {
        if (!silent) toast?.(`Escaneo cancelado: ${added} agregadas`, AlertTriangle);
        return { added, total: files.length, skipped, cancelled: true };
      }
      if (added > 0) toast?.(`Escaneo: ${added} de ${files.length} agregadas`, Check);
      else if (!silent) toast?.('Esos temas ya estaban', Check);
      return { added, total: files.length, skipped };
    } finally {
      flushBatch(batch);
      scanBusy.current = false;
      cancelRef.current = false;
      if (showUI) {
        setImporting(false);
        setScan((s) => ({ ...s, active: false }));
      }
    }
  }, [toast, importOne, refreshDirs, flushBatch]);

  /** Botón principal: pide acceso 1 vez y escanea sola (con fallback si no hay API). */
  const requestScan = useCallback(async (fallbackPicker) => {
    try {
      if (window.showDirectoryPicker) {
        let handle = null;
        try {
          handle = await window.showDirectoryPicker({ mode: 'read' });
        } catch (e) {
          // Usuario canceló: no es error.
          if (e?.name === 'AbortError') return { added: 0, total: 0, cancelled: true };
          throw e;
        }
        if (handle) return scanDirectory(handle);
      }
      // Sin File System Access API (iPhone/Firefox): abre el input webkitdirectory.
      if (typeof fallbackPicker === 'function') fallbackPicker();
      else toast?.('Tu navegador pide elegir archivos: usa Agregar carpeta', AlertTriangle);
      return { added: 0, total: 0, fallback: true };
    } catch {
      toast?.('No se pudo abrir la carpeta', AlertTriangle);
      return { added: 0, total: 0 };
    }
  }, [scanDirectory, toast]);

  /** Re-escanea UNA carpeta de la lista por nombre/id (pide permiso, no buscar). */
  const rescanDir = useCallback(async (idOrName, opts = {}) => {
    try {
      const list = await getAllDirHandles().catch(() => []);
      const key = String(idOrName || '').toLowerCase();
      const found = (list || []).find((d) => String(d.id || '').toLowerCase() === key || String(d.name || '').toLowerCase() === key.replace(/^dir_/, ''));
      let h = found?.handle || dirHandles.current.get(String(found?.name || idOrName || '').toLowerCase()) || null;
      if (!h && (!found || key === String(lastDir || '').toLowerCase())) h = dirHandle.current;
      if (!found && !h) { if (!opts?.silent) toast?.('Primero escanea una carpeta', AlertTriangle); return { added: 0, total: 0 }; }
      if (!h) { if (!opts?.silent) toast?.('Esa carpeta se agregó manual: elige de nuevo la carpeta para actualizar', AlertTriangle); return { added: 0, total: 0, needsPick: true }; }
      const ok = await ensureReadPermission(h, true);
      if (!ok) { if (!opts?.silent) toast?.('Sin permiso, no se pudo re-escanear', AlertTriangle); return { added: 0, total: 0 }; }
      return scanDirectory(h, null, opts);
    } catch {
      if (!opts?.silent) toast?.('No se pudo re-escanear', AlertTriangle);
      return { added: 0, total: 0 };
    }
  }, [scanDirectory, toast, lastDir]);

  /** Re-escanea TODAS las carpetas guardadas (las manuales se saltan). */
  const rescanSaved = useCallback(async (opts = {}) => {
    try {
      const list = await refreshDirs().catch(() => []);
      const withHandle = (list || []).filter((d) => d.handle || dirHandles.current.get(String(d.name || '').toLowerCase()));
      if (!withHandle.length) {
        // Compat: intenta la vieja clave única
        let h = dirHandle.current;
        if (!h) {
          const saved = await getDirHandle().catch(() => null);
          h = saved?.handle || null;
          if (h) { dirHandle.current = h; setLastDir(saved?.name || h.name || ''); }
        }
        if (!h) { if (!opts?.silent) toast?.('Primero escanea una carpeta', AlertTriangle); return { added: 0, total: 0 }; }
        const ok = await ensureReadPermission(h, true);
        if (!ok) { if (!opts?.silent) toast?.('Sin permiso, no se pudo re-escanear', AlertTriangle); return { added: 0, total: 0 }; }
        return scanDirectory(h, null, opts);
      }
      let added = 0;
      let total = 0;
      for (const d of withHandle) {
        const h = d.handle || dirHandles.current.get(String(d.name || '').toLowerCase());
        if (!h) continue;
        const ok = await ensureReadPermission(h, true).catch(() => false);
        if (!ok) continue;
        try {
          const r = await scanDirectory(h, null, opts);
          if (r?.busy) break; // otro escaneo tomó el candado: no pelear
          added += r.added || 0;
          total += r.total || 0;
        } catch { /* sigue con la siguiente */ }
      }
      return { added, total };
    } catch {
      if (!opts?.silent) toast?.('No se pudo re-escanear', AlertTriangle);
      return { added: 0, total: 0 };
    }
  }, [scanDirectory, toast, refreshDirs]);

  /** Quita una carpeta de la lista (100% funcional: verifica que se borró).
   *  deleteSongs=true borra también sus temas; false los conserva como "Sin carpeta". */
  const removeDir = useCallback(async (idOrName, deleteSongs = false) => {
    const raw = dirShort(idOrName);
    try {
      const list = await getAllDirHandles().catch(() => []);
      const found = (list || []).find((d) => d.id === dirId(raw) || String(d.name || '').toLowerCase() === raw.toLowerCase());
      const name = found?.name || raw || 'carpeta';
      const id = dirId(name);
      const short = String(name).toLowerCase();
      await removeDirHandle(id).catch(() => {});
      dirHandles.current.delete(short);
      if (short) {
        const rows = await getAllLocalSongs().catch(() => []);
        const victims = (rows || []).filter((r) => String(r.dir || '').toLowerCase() === short);
        if (deleteSongs) {
          for (const v of victims) {
            try { await deleteLocalSong(v.id); } catch {}
            const url = urls.current.get(v.id);
            if (url) { try { URL.revokeObjectURL(url); } catch {} urls.current.delete(v.id); }
            sizes.current.delete(v.id);
          }
          if (victims.length) setTracks((prev) => prev.filter((t) => String(t.dir || '').toLowerCase() !== short));
        } else if (victims.length) {
          // Sin carpeta: la música se queda y sigue visible en la lista general.
          for (const v of victims) {
            try { await putLocalSong({ ...v, dir: '' }).catch(() => {}); } catch {}
          }
          setTracks((prev) => prev.map((t) => (String(t.dir || '').toLowerCase() === short ? { ...t, dir: '' } : t)));
        }
      }
      const after = await refreshDirs().catch(() => []);
      if ((after || []).some((d) => d.id === id)) {
        toast?.('No se pudo quitar la carpeta, intenta de nuevo', AlertTriangle);
        return false;
      }
      if (name && name !== 'carpeta') setLastDir((prev) => (prev === name ? '' : prev));
      toast?.(deleteSongs ? `Carpeta quitada: “${name}” y su música eliminadas` : `Carpeta quitada: “${name}” (la música se queda)`, Check);
      return true;
    } catch {
      toast?.('No se pudo quitar la carpeta, intenta de nuevo', AlertTriangle);
      return false;
    }
  }, [refreshDirs, toast]);

  /** Purga las entradas de la lista que quedaron con 0 canciones. */
  const clearEmptyDirs = useCallback(async () => {
    try {
      const list = await getAllDirHandles().catch(() => []);
      const counts = new Map();
      for (const t of tracksRef.current || []) {
        const k = String(t.dir || '').toLowerCase();
        if (k) counts.set(k, (counts.get(k) || 0) + 1);
      }
      let n = 0;
      for (const d of list || []) {
        const k = String(d.name || '').toLowerCase();
        if (!k || counts.get(k)) continue;
        await removeDirHandle(d.id || d.name).catch(() => {});
        dirHandles.current.delete(k);
        n += 1;
      }
      await refreshDirs().catch(() => {});
      toast?.(n ? `${n} carpeta${n > 1 ? 's' : ''} vacía${n > 1 ? 's' : ''} eliminada${n > 1 ? 's' : ''}` : 'No hay carpetas vacías', n ? Check : AlertTriangle);
      return n;
    } catch {
      return 0;
    }
  }, [refreshDirs, toast]);

  const removeTrack = useCallback(async (id) => {
    try { await deleteLocalSong(id); } catch { /* noop */ }
    const url = urls.current.get(id);
    if (url) { try { URL.revokeObjectURL(url); } catch {} urls.current.delete(id); }
    sizes.current.delete(id);
    setTracks((prev) => prev.filter((t) => t.id !== id));
    toast?.('Tema local eliminado', Check);
  }, [toast]);

  const clearLocal = useCallback(async () => {
    try { await clearLocalSongs(); } catch { /* noop */ }
    for (const u of urls.current.values()) { try { URL.revokeObjectURL(u); } catch {} }
    urls.current.clear();
    sizes.current.clear();
    setTracks([]);
  }, []);

  const clearDirs = useCallback(async () => {
    try {
      const list = await getAllDirHandles().catch(() => []);
      for (const d of list || []) {
        try { await removeDirHandle(d.id || d.name); } catch {}
      }
    } catch {}
    dirHandles.current.clear();
    setDirs([]);
    setLastDir('');
  }, []);

  /** Enriquece UN tema con carátula real (con wifi). Respeta la incrustada. */
  const enrichOne = useCallback(async (rec) => {
    try {
      if (!rec || rec.artKind === 'embedded' || rec.artKind === 'remote') return false;
      if (!navigator.onLine) return false;
      // ¿El archivo trae imagen real? Marca y no se toca.
      let has = false;
      try { has = await blobHasArt(rec.blob); } catch { has = false; }
      if (has) {
        await putLocalSong({ ...rec, artKind: 'embedded' }).catch(() => {});
        return false;
      }
      const du = await findRemoteArt(rec.title, rec.artist).catch(() => '');
      if (!du) return false;
      await putLocalSong({ ...rec, art: du, artKind: 'remote' }).catch(() => {});
      setTracks((prev) => prev.map((x) => (x.id === rec.id ? { ...x, art: du } : x)));
      return true;
    } catch {
      return false;
    }
  }, []);

  const enrichArt = useCallback(async (id) => {
    const rec = await getLocalSong(id).catch(() => null);
    if (!rec) return false;
    return enrichOne(rec);
  }, [enrichOne]);

  /** Enriquece toda la biblioteca sin imagen real. onProgress({done, total}).
   *  No corre durante un escaneo (comparten red + IndexedDB y se traba todo). */
  const enrichAllArt = useCallback(async (onProgress) => {
    if (!navigator.onLine) return { done: 0, total: 0, offline: true };
    if (scanBusy.current) return { done: 0, total: 0, busy: true };
    const rows = await getAllLocalSongs().catch(() => []);
    const cands = (rows || []).filter((r) => r.artKind !== 'embedded' && r.artKind !== 'remote');
    let done = 0;
    for (const rec of cands) {
      if (scanBusy.current) break; // empezó un escaneo: soltar sin pelear
      let ok = false;
      try { ok = await enrichOne(rec); } catch { ok = false; }
      if (ok) done += 1;
      try { onProgress?.({ done, total: cands.length, current: rec }); } catch { /* noop */ }
    }
    return { done, total: cands.length };
  }, [enrichOne]);

  const bytes = [...sizes.current.values()].reduce((a, b) => a + (b || 0), 0);

  return { tracks, ready, importing, importFiles, removeTrack, clearLocal, clearDirs, clearEmptyDirs, cancelScan, urlFor, bytes, enrichArt, enrichAllArt, scan, lastDir, dirs, refreshDirs, scanDirectory, requestScan, rescanSaved, rescanDir, removeDir };
}
