import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart, AlertTriangle, Radio } from 'lucide-react';
import useStore from './useStore';
import { getStreamUrl, randomStations } from '../services/radios';

const HIST_MAX = 30;

/**
 * Radios del mundo: <audio> propio (streams infinitos, sin duración),
 * separado de la cola musical para no cortarla. Al sonar, pausa la música.
 */
export default function useRadio(toast, music) {
  const audio = useRef(null);
  const [favs, setFavs] = useStore('h_radio_favs', []);
  const [history, setHistory] = useStore('h_radio_hist', []);
  const [current, setCurrent] = useStore('h_radio_current', null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const req = useRef(0);

  const musicRef = useRef(music);
  musicRef.current = music;

  // El volumen es global: sigue al de música.
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const m = musicRef.current;
    const muted = !!m?.muted;
    const vol = Number(m?.rawVolume ?? m?.volume ?? 0.9);
    a.volume = muted ? 0 : Math.min(1, Math.max(0, vol));
    a.muted = muted;
  }, [music?.muted, music?.rawVolume, music?.volume, current]);

  const pushHistory = useCallback((st) => {
    if (!st) return;
    setHistory((h) => {
      if (h[0]?.uuid === st.uuid) return h;
      return [{ ...st, at: Date.now() }, ...h].slice(0, HIST_MAX);
    });
  }, [setHistory]);

  const stopAudio = useCallback(() => {
    try { audio.current?.pause(); } catch { /* noop */ }
  }, []);

  const play = useCallback(async (st) => {
    if (!st) return;
    // Si ya suena esa misma, alterna pausa/sigue
    if (musicRef.current) {
      try { musicRef.current.pause(); } catch { /* noop */ }
      try { musicRef.current.ytRef?.current?.stop(); } catch { /* noop */ }
    }
    const a = audio.current;
    if (current?.uuid === st.uuid && a && !a.paused) {
      a.pause();
      setPlaying(false);
      return;
    }
    const my = ++req.current;
    setCurrent(st);
    setLoading(true);
    try {
      const url = await getStreamUrl(st.uuid);
      if (my !== req.current) return;
      const src = url || st.stream;
      if (!src) throw new Error('sin stream');
      if (a) {
        if (a.src !== src) a.src = src;
        await a.play();
      }
      if (my !== req.current) return;
      setPlaying(true);
      pushHistory(st);
      toast(`Radio: ${st.name}`, Radio);
    } catch {
      if (my !== req.current) return;
      setPlaying(false);
      toast('Esa radio no responde, prueba otra', AlertTriangle);
    } finally {
      if (my === req.current) setLoading(false);
    }
  }, [current, pushHistory, setCurrent, toast]);

  const toggle = useCallback(() => {
    const a = audio.current;
    if (!a || !current) return;
    if (a.paused) {
      if (musicRef.current) {
        try { musicRef.current.pause(); } catch { /* noop */ }
        try { musicRef.current.ytRef?.current?.stop(); } catch { /* noop */ }
      }
      a.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      a.pause();
      setPlaying(false);
    }
  }, [current]);

  const stop = useCallback(() => {
    req.current++;
    stopAudio();
    setPlaying(false);
    setLoading(false);
  }, [stopAudio]);

  /** Radio aleatoria del mundo: trae una tanda y suena la primera. */
  const playRandom = useCallback(async () => {
    const my = ++req.current;
    setLoading(true);
    try {
      const list = await randomStations(10);
      if (my !== req.current) return;
      if (!list.length) {
        toast('Sin radios por ahora, intenta de nuevo', AlertTriangle);
        return;
      }
      const st = list[Math.floor(Math.random() * list.length)];
      setLoading(false);
      await play(st);
    } catch {
      if (my !== req.current) return;
      toast('Las radios no responden, intenta de nuevo', AlertTriangle);
    } finally {
      if (my === req.current) setLoading(false);
    }
  }, [play, toast]);

  const isFav = useCallback((st) => favs.some((f) => f.uuid === st?.uuid), [favs]);
  const toggleFav = useCallback((st) => {
    if (!st) return;
    const has = favs.some((f) => f.uuid === st.uuid);
    toast(has ? 'Radio quitada de favoritas' : 'Radio en favoritas', Heart);
    setFavs(has ? favs.filter((f) => f.uuid !== st.uuid) : [{ ...st }, ...favs]);
  }, [favs, setFavs, toast]);

  const clearHistory = useCallback(() => setHistory([]), [setHistory]);

  // MediaSession: mientras la radio suena mandan sus controles;
  // al parar, se devuelven a la música para no robárselos.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      const m = musicRef.current;
      if (playing && current) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: current.name || 'Radio del mundo',
          artist: current.country || '',
          album: (current.tags || []).join(', ') || 'Radio mundial',
          artwork: current.art ? [{ src: current.art, sizes: '512x512', type: 'image/jpeg' }] : [],
        });
        navigator.mediaSession.setActionHandler('play', () => toggle());
        navigator.mediaSession.setActionHandler('pause', () => toggle());
        // En segundo plano: siguiente/anterior = otra aleatoria del mundo
        navigator.mediaSession.setActionHandler('previoustrack', () => playRandom());
        navigator.mediaSession.setActionHandler('nexttrack', () => playRandom());
      } else if (m?.track) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: m.track.title || 'Hermes',
          artist: m.track.artist || '',
          album: m.track.genre || 'Hermes',
          artwork: m.track.art ? [{ src: m.track.art, sizes: '512x512', type: 'image/jpeg' }] : [],
        });
        navigator.mediaSession.setActionHandler('play', () => m.resume());
        navigator.mediaSession.setActionHandler('pause', () => m.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => m.prev());
        navigator.mediaSession.setActionHandler('nexttrack', () => m.next(false));
        navigator.mediaSession.playbackState = m.playing ? 'playing' : 'paused';
        try { navigator.mediaSession.setActionHandler('seekto', (d) => { if (d?.seekTime != null) m.seek?.(d.seekTime); }); } catch { /* sin seekto */ }
      }
    } catch { /* noop */ }
  }, [playing, current, toggle, playRandom, musicRef.current?.track?.id, musicRef.current?.playing]);

  return {
    audio, current, playing, loading, setPlaying,
    play, toggle, stop, playRandom,
    favs, isFav, toggleFav, history, clearHistory,
  };
}
