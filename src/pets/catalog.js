// Catálogo de mascotas = las de fábrica (pets.js) + las que crea el usuario + extras
// (frases y fotogramas) que el usuario añade a las de fábrica.
// Metadatos en localStorage ('h_cpets'); las imágenes, en IndexedDB (cabe mucho más que localStorage).
// Cada mascota propia se "compone" en una tira de frames al arrancar, así funciona igual que las demás.
import { useSyncExternalStore } from 'react';
import { PETS as BASE } from './pets';

export const STATES = ['idle', 'walk', 'music', 'love', 'hot', 'cold', 'wave', 'jump', 'alert', 'sleep', 'run'];
export const STATE_LABEL = {
  idle: 'Reposo', walk: 'Caminar', music: 'Escuchando música', love: 'Cariño', hot: 'Calor', cold: 'Frío',
  wave: 'Saludo', jump: 'Salto', alert: 'Alerta', sleep: 'Dormir', run: 'Correr',
};
export const MAX_CUSTOM = 12;
export const MAX_IMGS = 40;
const KEY = 'h_cpets';
const RATIO = 0.63;

/* ───────── IndexedDB ───────── */
let dbp;
const db = () => (dbp ||= new Promise((res, rej) => {
  const r = indexedDB.open('hermes-pets', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('imgs');
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
}));
const tx = async (mode, fn) => {
  const d = await db();
  return new Promise((res, rej) => { const t = d.transaction('imgs', mode); const rq = fn(t.objectStore('imgs')); t.oncomplete = () => res(rq?.result); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); });
};
export const putImg = (k, blob) => tx('readwrite', (s) => s.put(blob, k));
export const getImg = (k) => tx('readonly', (s) => s.get(k));
export const delImg = (k) => tx('readwrite', (s) => s.delete(k));

/* ───────── metadatos ───────── */
const readMeta = () => { try { const m = JSON.parse(localStorage.getItem(KEY)); return { custom: m?.custom || [], extra: m?.extra || {} }; } catch { return { custom: [], extra: {} }; } };
let meta = readMeta();
const writeMeta = () => { try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch { /* sin espacio */ } };

/* ───────── store reactivo ───────── */
let customDefs = {}; let extraDefs = {}; let list = null; let ver = 0;
const subs = new Set();
const notify = () => { list = null; ver++; subs.forEach((f) => f()); };
export const subscribe = (f) => { subs.add(f); return () => subs.delete(f); };
export const getPets = () => (list ||= [...BASE.map((b) => extraDefs[b.id] || b), ...meta.custom.map((c) => customDefs[c.id]).filter(Boolean)]);
export const getPet = (id) => getPets().find((p) => p.id === id);
/** ¿Existe (o existirá en cuanto cargue)? Sirve para no borrar de la selección una mascota propia aún sin componer. */
export const knownPet = (id) => BASE.some((b) => b.id === id) || meta.custom.some((c) => c.id === id);
export const isCustom = (id) => meta.custom.some((c) => c.id === id);
export const getMeta = (id) => meta.custom.find((c) => c.id === id) || null;
export const getExtra = (id) => meta.extra[id] || null;
export const useCatalog = () => { useSyncExternalStore(subscribe, () => ver); return getPets(); };

/* ───────── composición de tiras ───────── */
const loadBitmap = async (key) => { const b = await getImg(key); return b ? createImageBitmap(b) : null; };
const toBlobUrl = (cv) => new Promise((res) => cv.toBlob((b) => res(URL.createObjectURL(b)), 'image/png'));
const urls = {}; // id -> urls vigentes (para revocar)
const swapUrl = (id, ...next) => { (urls[id] || []).forEach((u) => URL.revokeObjectURL(u)); urls[id] = next.filter(Boolean); };

async function composeCustom(c) {
  const keys = []; const idxOf = {};
  STATES.forEach((s) => (c.actions[s] || []).forEach((k) => { if (!(k in idxOf)) { idxOf[k] = keys.length; keys.push(k); } }));
  const bms = await Promise.all(keys.map(loadBitmap));
  const ok = keys.map((k, i) => (bms[i] ? i : -1)).filter((i) => i >= 0);
  if (!ok.length) return null;
  const CH = 110;
  const aspect = Math.min(1.8, Math.max(0.5, Math.max(...ok.map((i) => bms[i].width / bms[i].height))));
  const CW = Math.min(190, Math.max(72, Math.round(CH * aspect) + 8));
  const cv = document.createElement('canvas'); cv.width = CW * keys.length; cv.height = CH;
  const g = cv.getContext('2d');
  bms.forEach((bm, i) => {
    if (!bm) return;
    const s = Math.min((CW - 8) / bm.width, (CH - 8) / bm.height);
    g.drawImage(bm, i * CW + (CW - bm.width * s) / 2, CH - 4 - bm.height * s, bm.width * s, bm.height * s);
  });
  const url = await toBlobUrl(cv);
  const idle = (c.actions.idle || []).map((k) => idxOf[k]).filter((i) => bms[i]);
  const frames = {};
  STATES.forEach((s) => { const f = (c.actions[s] || []).map((k) => idxOf[k]).filter((i) => bms[i]); frames[s] = f.length ? f : idle; });
  let powerUrl = null;
  if (c.power?.key) { const b = await getImg(c.power.key); if (b) powerUrl = URL.createObjectURL(b); }
  swapUrl(c.id, url, powerUrl);
  const voice = c.phrases?.length ? c.phrases : ['¡Hola!'];
  return {
    id: c.id, name: c.name || 'Mascota', n: keys.length, cell: [CW, CH], disp: [+(CW * RATIO).toFixed(1), +(CH * RATIO).toFixed(1)],
    body: [Math.max(34, Math.round(CW * RATIO * 0.5)), Math.round(CH * RATIO * 0.88)],
    frames, voice, musicPhrases: c.musicPhrases || [], pickRandom: true, url, custom: true,
    ...(powerUrl ? { sp: { id: 'power', chance: 0.05, sf: {} }, powerUrl, powerPhrases: c.power?.phrases?.length ? c.power.phrases : ['¡Mi poder!'] } : {}),
  };
}

async function composeExtra(base, x) {
  const keys = []; const idxOf = {};
  STATES.forEach((s) => (x.actions?.[s] || []).forEach((k) => { if (!(k in idxOf)) { idxOf[k] = base.n + keys.length; keys.push(k); } }));
  const out = { ...base, voice: [...base.voice, ...(x.phrases || [])], musicPhrases: [...(base.musicPhrases || []), ...(x.musicPhrases || [])] };
  if (!keys.length) { swapUrl(base.id); return out; }
  const bms = await Promise.all(keys.map(loadBitmap));
  const [CW, CH] = base.cell;
  const img = new Image(); img.src = `pets/${base.id}.webp?v=4`; await img.decode();
  const cv = document.createElement('canvas'); cv.width = CW * (base.n + keys.length); cv.height = CH;
  const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
  bms.forEach((bm, i) => {
    if (!bm) return;
    const s = Math.min((CW - 8) / bm.width, (CH - 8) / bm.height);
    g.drawImage(bm, (base.n + i) * CW + (CW - bm.width * s) / 2, CH - 4 - bm.height * s, bm.width * s, bm.height * s);
  });
  const url = await toBlobUrl(cv); swapUrl(base.id, url);
  const extra = {};
  STATES.forEach((s) => { const f = (x.actions?.[s] || []).map((k) => idxOf[k]); if (f.length) extra[s] = f; });
  return { ...out, n: base.n + keys.length, url, extra };
}

/* ───────── API ───────── */
const rebuildCustom = async (c) => { try { const d = await composeCustom(c); if (d) customDefs[c.id] = d; else delete customDefs[c.id]; } catch { delete customDefs[c.id]; } };
const rebuildExtra = async (id) => {
  const x = meta.extra[id]; const b = BASE.find((p) => p.id === id);
  if (!b) return;
  if (!x || (!x.phrases?.length && !x.musicPhrases?.length && !Object.values(x.actions || {}).some((a) => a.length))) { delete extraDefs[id]; swapUrl(id); return; }
  try { extraDefs[id] = await composeExtra(b, x); } catch { delete extraDefs[id]; }
};

let started;
export function initCatalog() {
  return (started ||= (async () => {
    meta = readMeta();
    await Promise.all([...meta.custom.map(rebuildCustom), ...Object.keys(meta.extra).map(rebuildExtra)]);
    notify();
  })());
}

const uid = () => Math.random().toString(36).slice(2, 8);
export const newImgKey = (id) => `${id}:${uid()}${uid()}`;

/** data: { id?, name, phrases[], musicPhrases[], actions:{state:[key]}, power:{key,phrases[]}|null } — las imágenes nuevas ya van en IDB. */
export async function saveCustom(data) {
  const id = data.id || `c_${uid()}`;
  const prev = meta.custom.find((c) => c.id === id);
  const c = { id, name: data.name.trim().slice(0, 24) || 'Mascota', phrases: data.phrases, musicPhrases: data.musicPhrases, actions: data.actions, power: data.power || null };
  const used = new Set([...Object.values(c.actions).flat(), c.power?.key].filter(Boolean));
  const old = prev ? [...Object.values(prev.actions).flat(), prev.power?.key].filter(Boolean) : [];
  await Promise.all(old.filter((k) => !used.has(k)).map(delImg));
  meta.custom = prev ? meta.custom.map((x) => (x.id === id ? c : x)) : [...meta.custom, c];
  writeMeta(); await rebuildCustom(c); notify();
  return id;
}
export async function removeCustom(id) {
  const c = getMeta(id); if (!c) return;
  await Promise.all([...Object.values(c.actions).flat(), c.power?.key].filter(Boolean).map(delImg));
  meta.custom = meta.custom.filter((x) => x.id !== id); delete customDefs[id]; swapUrl(id);
  writeMeta(); notify();
}
export async function saveExtra(id, data) {
  const prev = meta.extra[id];
  const used = new Set(Object.values(data.actions || {}).flat());
  await Promise.all((prev ? Object.values(prev.actions || {}).flat() : []).filter((k) => !used.has(k)).map(delImg));
  meta.extra = { ...meta.extra, [id]: { phrases: data.phrases, musicPhrases: data.musicPhrases, actions: data.actions } };
  writeMeta(); await rebuildExtra(id); notify();
}
export async function resetExtra(id) {
  const prev = meta.extra[id];
  if (prev) await Promise.all(Object.values(prev.actions || {}).flat().map(delImg));
  const { [id]: _drop, ...rest } = meta.extra; meta.extra = rest; // eslint-disable-line no-unused-vars
  writeMeta(); await rebuildExtra(id); notify();
}

/* ───────── imágenes: reducir y (opcional) quitar fondo liso ───────── */
export async function prepImage(file, { removeBg = false, max = 256 } = {}) {
  const bm = await createImageBitmap(file);
  const s = Math.min(1, max / Math.max(bm.width, bm.height));
  const w = Math.max(1, Math.round(bm.width * s)); const h = Math.max(1, Math.round(bm.height * s));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(bm, 0, 0, w, h);
  if (removeBg) {
    const im = g.getImageData(0, 0, w, h); const d = im.data;
    const c0 = [d[0], d[1], d[2]]; const tol = 34;
    const near = (i) => Math.abs(d[i] - c0[0]) + Math.abs(d[i + 1] - c0[1]) + Math.abs(d[i + 2] - c0[2]) < tol * 3 / 1.5 && d[i + 3] > 0;
    const seen = new Uint8Array(w * h); const st = [0, w - 1, (h - 1) * w, h * w - 1];
    while (st.length) {
      const p = st.pop(); if (seen[p]) continue; seen[p] = 1;
      if (!near(p * 4)) continue;
      d[p * 4 + 3] = 0;
      const x = p % w; const y = (p / w) | 0;
      if (x > 0) st.push(p - 1); if (x < w - 1) st.push(p + 1); if (y > 0) st.push(p - w); if (y < h - 1) st.push(p + w);
    }
    g.putImageData(im, 0, 0);
  }
  return new Promise((res) => cv.toBlob(res, 'image/png'));
}
