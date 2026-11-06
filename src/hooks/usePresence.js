import { useEffect, useRef } from 'react';
import { touchPresence } from '../services/social';

/**
 * Presencia: publica lo que suena ahora en tu fila de users para que tus
 * contactos lo vean en tu perfil. Solo escribe al cambiar de tema/pausa
 * + latido cada 60s mientras suena. Sin login no hace nada.
 */
export default function usePresence(auth, player) {
  const uid = auth?.user?.id || null;
  const track = player?.track || null;
  const playing = !!player?.playing;
  const lastSent = useRef('');

  useEffect(() => {
    if (!uid || !track) return undefined;
    const np = {
      title: track.title || '',
      artist: track.artist || '',
      art: track.art || '',
      videoId: track.videoId || '',
      src: track.src || '',
      duration: track.duration || 0,
      playing,
    };
    const key = `${track.id}|${playing}`;
    if (key !== lastSent.current) {
      lastSent.current = key;
      touchPresence(uid, np);
    }
    if (!playing) return undefined;
    const t = setInterval(() => touchPresence(uid, { ...np, playing: true }), 60000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, track?.id, playing]);
}
