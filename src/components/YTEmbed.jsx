import { useEffect, useRef } from 'react';
import { loadYTAPI as loadAPI } from '../lib/yt-api';
import { ensureContainer, ensureHidden, stage } from '../lib/yt-stage';

/**
 * Reproductor oficial de YouTube (IFrame API), siempre oculto (solo audio).
 * El modo video se eliminó: 2px fijos, sin controles, sin redimensionar.
 *
 * apiRef.current = { load, play, pause, toggle, stop, replay,
 *   seekTo, seekBy, applyVolume, getTime, getDuration }
 */

export default function YTEmbed({ apiRef, onState, onError }) {
  const playerRef = useRef(null);
  const pendingRef = useRef(null); // { videoId, autoplay }
  const cb = useRef({ onState, onError });
  cb.current = { onState, onError };

  useEffect(() => {
    let dead = false;
    loadAPI().then(() => {
      const host = ensureContainer();
      if (dead || !host) return;
      // El slot oculto puede montarse después: asegura la ubicación.
      ensureHidden();
      playerRef.current = new window.YT.Player(host, {
        width: '2',
        height: '2',
        playerVars: {
          autoplay: 0, controls: 0, disablekb: 1, fs: 0,
          iv_load_policy: 3, rel: 0, playsinline: 1,
        },
        events: {
          onReady: () => {
            try {
              const f = playerRef.current?.getIframe?.();
              if (f) stage.container = f;
            } catch { /* sigue con el div */ }
            ensureHidden();
            const p = pendingRef.current;
            pendingRef.current = null;
            if (p && playerRef.current) {
              try {
                if (p.autoplay) playerRef.current.loadVideoById(p.videoId);
                else playerRef.current.cueVideoById(p.videoId);
              } catch {}
            }
          },
          onStateChange: (e) => cb.current.onState?.(e.data),
          onError: (e) => cb.current.onError?.(e.data),
        },
      });
    }).catch(() => cb.current.onError?.('api'));

    const api = {
      load(videoId, autoplay = true) {
        const pl = playerRef.current;
        if (pl?.loadVideoById) {
          try {
            if (autoplay) pl.loadVideoById(videoId);
            else pl.cueVideoById(videoId);
          } catch {}
        } else {
          pendingRef.current = { videoId, autoplay };
        }
      },
      play() { try { playerRef.current?.playVideo(); } catch {} },
      pause() { try { playerRef.current?.pauseVideo(); } catch {} },
      stop() {
        pendingRef.current = null;
        try { playerRef.current?.stopVideo(); } catch {}
      },
      replay() {
        try { playerRef.current?.seekTo(0, true); playerRef.current?.playVideo(); } catch {}
      },
      toggle() {
        try {
          const pl = playerRef.current;
          if (!pl?.getPlayerState) return;
          const s = pl.getPlayerState();
          if (s === window.YT.PlayerState.PLAYING) pl.pauseVideo();
          else pl.playVideo();
        } catch {}
      },
      seekTo(sec) { try { playerRef.current?.seekTo(sec, true); } catch {} },
      seekBy(d) {
        try {
          const pl = playerRef.current;
          if (pl?.getCurrentTime) pl.seekTo(Math.max(0, pl.getCurrentTime() + d), true);
        } catch {}
      },
      applyVolume(v01, muted) {
        try {
          const pl = playerRef.current;
          if (!pl) return;
          if (muted) pl.mute();
          else { pl.unMute(); pl.setVolume(Math.round(Math.min(1, Math.max(0, v01)) * 100)); }
        } catch {}
      },
      setRate(r) {
        try {
          const v = Math.min(2, Math.max(0.5, Number(r) || 1));
          playerRef.current?.setPlaybackRate?.(v);
        } catch {}
      },
      getTime() { try { return playerRef.current?.getCurrentTime?.() || 0; } catch { return 0; } },
      getDuration() { try { return playerRef.current?.getDuration?.() || 0; } catch { return 0; } },
      // Compat: antes redimensionaba al banner; ahora no-op (siempre 2px).
      size() {},
    };
    if (apiRef) apiRef.current = api;
    return () => {
      dead = true;
      try { playerRef.current?.destroy(); } catch {}
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sin DOM propio: el player vive en el contenedor oculto (yt-stage).
  return null;
}

/** Estados YT (evita importar window.YT fuera del componente). */
export const YT_STATE = { ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3, CUED: 5 };
