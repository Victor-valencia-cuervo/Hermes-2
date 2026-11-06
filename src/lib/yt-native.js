// Audio directo de YouTube en el APK (plugin nativo "YtAudio", NewPipeExtractor).
// Devuelve la URL de AUDIO para reproducirla en un <audio> normal: Android lo deja sonar con la pantalla
// apagada (servicio en primer plano + Media Session), cosa que el iframe de YouTube no permite.
// En web/PWA no existe: devuelve null y la app sigue como siempre (iframe + gemelo de Audius).
import { Capacitor, registerPlugin } from '@capacitor/core';

const isNative = () => { try { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'; } catch { return false; } };
let Plugin = null;
const cache = new Map();    // videoId -> { url, at }
const inflight = new Map();
const TTL = 3 * 60 * 60 * 1000; // las URLs de YouTube duran ~6 h; se renuevan antes
let failStreak = 0; let coolUntil = 0;

export const nativeYtAvailable = () => isNative();

export function peekNativeAudio(videoId) {
  const e = cache.get(videoId);
  return e && Date.now() - e.at < TTL ? e : null;
}

/** Resuelve la URL de audio de un video. `force` ignora la caché (URL caducada). */
export async function resolveNativeAudio(videoId, { force = false, timeout = 9000 } = {}) {
  if (!isNative() || !videoId) return null;
  if (!force) { const hit = peekNativeAudio(videoId); if (hit) return hit; }
  if (Date.now() < coolUntil) return null; // varios fallos seguidos: descansa un momento
  if (inflight.has(videoId) && !force) return inflight.get(videoId);
  if (!Plugin) Plugin = registerPlugin('YtAudio');
  const p = Promise.race([
    Plugin.resolve({ videoId }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), timeout)),
  ]).then((r) => {
    if (!r?.url) throw new Error('sin url');
    failStreak = 0;
    const e = { url: r.url, mime: r.mime || '', duration: r.duration || 0, at: Date.now() };
    cache.set(videoId, e);
    if (cache.size > 80) cache.delete(cache.keys().next().value);
    return e;
  }).catch(() => {
    if (++failStreak >= 4) { coolUntil = Date.now() + 60000; failStreak = 0; }
    return null;
  }).finally(() => inflight.delete(videoId));
  inflight.set(videoId, p);
  return p;
}
