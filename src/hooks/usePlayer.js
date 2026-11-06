import { useCallback, useEffect, useRef, useState } from 'react';
import { setNativePlayback } from '../lib/native-bg';
import { Heart, AlertTriangle, Radio, History, Headphones } from 'lucide-react';
import useStore from './useStore';
import { YT_STATE } from '../components/YTEmbed';
import { fmtTime } from '../lib/format';
import { markBlockedVideo, getRelated, searchYouTube } from '../services/youtube';
import { getYTMix } from '../services/ytmix';
import { submitListen } from '../services/scrobble';
import { getOriginalCover } from '../services/covers';
import { prefersYT, setPrefYT, getCustomArt, setCustomArt, clearCustomArt } from '../lib/artPref';
import { SAFE } from '../lib/safe';
import { findBgTwin, peekBgTwin } from '../services/bgtwin';
import { resolveNativeAudio } from '../lib/yt-native';
import { normalizeTrackState } from '../lib/music-state';

// Racha de errores YT seguidos antes de frenar el avance automático.
// Evita la cascada: toast + modal + siguiente por cada tema bloqueado.
const ERR_HALT = 4;

const HIST_MAX = 50;
// Un tema de YouTube con audio directo nativo (native) ya suena en <audio>, no en el iframe.
const isYT = (t) => t?.source === 'YouTube' && !!t?.videoId && !t?.native;

export default function usePlayer(toast, local = null) {
  const audio = useRef(null);
  const ytRef = useRef(null); // API del reproductor embebido YouTube

  // Persistencia (en modo seguro ?seguro=1 se usan claves aparte
  // para no tocar ni leer lo guardado)
  const K = (k) => (SAFE ? `${k}_seguro` : k);
  const [favs, setFavs] = useStore(K('h_favs2'), []);
  const [queue, setQueue] = useStore(K('h_queue'), []);
  const [index, setIndex] = useStore(K('h_qindex'), -1);
  const [savedTrack, setSavedTrack] = useStore(K('h_qtrack'), null);
  const [savedTime, setSavedTime] = useStore(K('h_qtime'), null); // { id, cur }: progreso para no perderlo al recargar
  const [volume, setVolumeState] = useStore(K('h_vol'), 0.9);
  const [muted, setMuted] = useStore(K('h_muted'), false);
  // Modos estilo Spotify/BitChord: shuffle + repeat off/all/one.
  const [shuffle, setShuffleState] = useStore(K('h_shuffle'), false);
  const [repeat, setRepeatState] = useStore(K('h_repeat'), 'off'); // off | all | one
  const [rate, setRateState] = useStore(K('h_rate'), 1); // 0.5 - 2.0
  const [eqPreset, setEqPresetState] = useStore(K('h_eq_preset'), 'Plano');
  const [eqGains, setEqGainsState] = useStore(K('h_eq_gains'), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const [xfade, setXfadeState] = useStore(K('h_xfade'), 1.5); // seg de fundido entre canciones (0 = apagado)
  const [autoCover, setAutoCover] = useStore('h_auto_cover', true); // buscar la carátula oficial sola
  const autoCoverRef = useRef(autoCover); autoCoverRef.current = autoCover;
  const shuffleRef = useRef(false); shuffleRef.current = shuffle;
  const repeatRef = useRef('off'); repeatRef.current = repeat;
  const rateRef = useRef(rate); rateRef.current = rate;
  const xfadeRef = useRef(xfade); xfadeRef.current = xfade;
  // Radio automática siempre activa estilo Spotify: al terminar la cola
  // siguen temas similares sin parar.
  const radio = true;
  const [radioBusy, setRadioBusy] = useState(false); // buscando similares…
  const [history, setHistory] = useStore('h_hist', []);
  // "Seguir en 2º plano": si hay una versión de la misma canción con audio normal (Audius) se usa,
  // y al apagar la pantalla un tema de YouTube intenta pasarse solo a ella. YouTube no deja más.
  const [bgPref, setBgPref] = useStore(K('h_bgpref'), true);
  const bgPrefRef = useRef(bgPref);
  bgPrefRef.current = bgPref;

  const [track, setTrack] = useState(savedTrack);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(() => ({
    cur: savedTime?.id && savedTrack && savedTime.id === savedTrack.id ? Math.max(0, +savedTime.cur || 0) : 0,
    dur: savedTrack?.duration || 0,
  }));
  // Seek pendiente tras recargar: se aplica una sola vez al montar el audio/YT.
  const nativeRetry = useRef(null);
  const pendingSeek = useRef(
    savedTime?.id && savedTrack && savedTime.id === savedTrack.id && +savedTime.cur > 5
      ? Math.max(0, +savedTime.cur || 0) : 0,
  );
  const seekToastShown = useRef(false);
  const [resolving, setResolving] = useState(false); // spinner: cargando YT / buffering
  const [blocked, setBlocked] = useState(null); // último tema que prohíbe reproducción externa
  const [blockedOpen, setBlockedOpen] = useState(false); // sheet in-app del bloqueado
  const [stuck, setStuck] = useState(false); // avance auto frenado tras racha de bloqueos
  const errStreak = useRef(0); // errores YT consecutivos (se resetea al sonar algo)
  const ytRetry = useRef({ id: null, n: 0 }); // reintentos del tema actual antes de saltarlo
  const YT_RETRIES = 3;

  const trackRef = useRef(track);
  trackRef.current = track;
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const indexRef = useRef(index);
  indexRef.current = index;
  const playingRef = useRef(playing);
  playingRef.current = playing;
  const localRef = useRef(local); // urlFor vigente (el objeto local cambia de identidad cada render)
  localRef.current = local;
  // Estado al ocultar la página: para reanudar en 2º plano sin pisar pausas manuales.
  const hideRef = useRef({ wasPlaying: false, userPaused: false });
  const stuckRef = useRef(stuck);
  stuckRef.current = stuck;
  const radioBusyRef = useRef(false);
  // El navegador bloqueó el play automático (típico en 2º plano sin gesto):
  // se reintenta al volver a la app o al primer toque en ▶.
  const needsTapRef = useRef(false);
  // ¿El usuario ya sonó algo esta sesión? Sin esto, un <audio> con URL muerta
  // al entrar disparaba onError → next → onError… pasando "rápido" por la cola.
  const engagedRef = useRef(false);
  // Cortacircuitos: racha de saltos automáticos por error en pocos segundos.
  const skipBurst = useRef({ n: 0, t: 0 });

  // Aplica volumen a <audio> y al embed YT
  useEffect(() => {
    const a = audio.current;
    if (a) {
      a.volume = muted ? 0 : Math.min(1, Math.max(0, volume));
      a.muted = muted;
    }
    try { ytRef.current?.applyVolume(volume, muted); } catch {}
  }, [volume, muted, track]);

  // Aplica velocidad a <audio> y al embed YT (podcasts / escucha rápida)
  useEffect(() => {
    const r = Math.min(2, Math.max(0.5, Number(rate) || 1));
    try { if (audio.current) audio.current.playbackRate = r; } catch {}
    try { ytRef.current?.setRate?.(r); } catch {}
  }, [rate, track]);

  // Progreso: solo actualiza el estado cuando cambia el segundo (antes eran 2-4 renders por
  // segundo de toda la app, que en celulares lentos se notaba al abrir canciones).
  const tick = useCallback((cur, dur) => {
    setTime((prev) => (Math.floor(prev.cur) === Math.floor(cur || 0) && prev.dur === (dur || 0) ? prev : { cur: cur || 0, dur: dur || 0 }));
  }, []);

  const normalizeTrack = useCallback((t) => {
    if (!t) return t;
    const normalized = normalizeTrackState(t);
    return normalized || t;
  }, []);

  const startPlayback = useCallback((attempt = 0) => {
    const t = trackRef.current;
    if (isYT(t)) {
      // Reproductor oficial: sin instancias, sin CORS, siempre completo
      setResolving(true);
      try { ytRef.current?.load(t.videoId, true); } catch {}
      try { ytRef.current?.applyVolume(volume, muted); } catch {}
      return;
    }
    try { ytRef.current?.stop(); } catch {}
    const tryPlay = (n) => {
      const a = audio.current;
      // El <audio> se remonta con la nueva src: si aún no existe, reintenta.
      if (!a) {
        if (n < 3) setTimeout(() => tryPlay(n + 1), n === 0 ? 150 : 400);
        else toast('No se pudo reproducir', AlertTriangle);
        return;
      }
      a.volume = muted ? 0 : Math.min(1, Math.max(0, volume));
      a.muted = muted;
      try { a.playbackRate = Math.min(2, Math.max(0.5, Number(rateRef.current) || 1)); } catch {}
      a.play().then(() => { needsTapRef.current = false; }).catch(() => {
        // Bloqueo de autoplay (2º plano sin gesto): se reanuda al volver / tocar ▶.
        needsTapRef.current = true;
        setPlaying(false);
        if (n === 0) toast('Toca ▶ para seguir en 2º plano (el navegador lo exige)', Headphones);
      });
    };
    setTimeout(() => tryPlay(0), 0);
  }, [muted, volume, toast]);

  const pushHistory = useCallback((t) => {
    if (!t) return;
    setHistory((h) => {
      if (h[0]?.id === t.id) return h;
      return [{ ...t, at: Date.now() }, ...h].slice(0, HIST_MAX);
    });
  }, [setHistory]);

  const playAt = useCallback((i, list) => {
    let q = list || queueRef.current;
    let t = q[i];
    if (!t) return;
    engagedRef.current = true;
    skipBurst.current = { n: 0, t: 0 }; // play explícito: racha nueva
    // Versión de segundo plano ya conocida (precargada): suena esa al instante.
    if (bgPrefRef.current && isYT(t)) {
      const tw = peekBgTwin(t.id);
      if (tw) { t = tw; q = q.slice(); q[i] = tw; list = q; }
    }
    // Local: los blob: URLs mueren al recargar (favs/cola guardada traen el
    // viejo). Se rehidrata con la URL vigente para que suene donde sea
    // (incluso desde Favoritos en la pestaña YouTube).
    let revived = false;
    if (t?.source === 'Local') {
      const lf = localRef.current;
      const fresh = lf?.urlFor?.(t.id) || null;
      if (fresh) {
        if (fresh !== t.src) {
          t = { ...t, src: fresh };
          revived = true;
          if (list) { const nl = list.slice(); nl[i] = t; list = nl; }
          else { q = q.slice(); q[i] = t; }
        }
      } else if (lf?.ready) {
        // El archivo ya no está en este dispositivo: avisa y sigue al siguiente.
        toast('Ese tema local ya no está en este dispositivo', AlertTriangle);
        if (q[i + 1]) playAt(i + 1, list || q);
        else setPlaying(false);
        return;
      }
    }
    const nextTrack = normalizeTrack(t);
    if (list) {
      const lf = localRef.current;
      let arr = list.map((entry) => {
        let e = normalizeTrack(entry);
        // Refresca los blob: locales de toda la cola (siguiente/anterior no fallan).
        if (e?.source === 'Local' && lf) {
          const f = lf.urlFor?.(e.id);
          if (f && f !== e.src) e = { ...e, src: f };
        }
        return e;
      });
      // Mezcla activa: una lista nueva también se mezcla (lo ya sonado y el tema actual se quedan).
      if (shuffleRef.current && arr.length > 2) {
        const head = arr.slice(0, i + 1); const rest = arr.slice(i + 1);
        for (let k = rest.length - 1; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [rest[k], rest[j]] = [rest[j], rest[k]]; }
        arr = [...head, ...rest];
      }
      setQueue(arr);
    }
    setIndex(i);
    setTrack(nextTrack);
    setSavedTrack(nextTrack);
    // Tema nuevo (distinto al guardado): arranca en 0 y descarta el seek viejo.
    // Mismo tema recargado: el estado inicial ya trae el progreso guardado.
    const sameAsSaved = savedTime?.id && t.id === savedTime.id;
    pendingSeek.current = sameAsSaved ? Math.max(0, +savedTime.cur || 0) : 0;
    seekToastShown.current = false;
    setTime({ cur: sameAsSaved ? Math.max(0, +savedTime.cur || 0) : 0, dur: t.duration || 0 });
    pushHistory(nextTrack);
    trackRef.current = nextTrack;
    // Local revivido (venía de favs/cola guardada): avisa que va en 2º plano.
    if (revived) toast('Tema local: suena sin wifi y en segundo plano', Headphones);
    // startPlayback lee trackRef; pequeño diferido para que PlayerBar monte YTEmbed
    setTimeout(() => startPlayback(), 0);
  }, [pushHistory, setIndex, setQueue, setSavedTrack, startPlayback, savedTime, normalizeTrack, toast]);

  const resume = useCallback(() => {
    const t = trackRef.current;
    engagedRef.current = true;
    if (isYT(t)) { try { ytRef.current?.play(); } catch {} return; }
    audio.current?.play().catch(() => {});
  }, []);

  const pause = useCallback(() => {
    // Pausa manual con la página oculta (botón BT, controles del sistema):
    // al volver no se reanuda sola.
    try { if (typeof document !== 'undefined' && document.hidden) hideRef.current.userPaused = true; } catch {}
    const t = trackRef.current;
    if (isYT(t)) { try { ytRef.current?.pause(); } catch {} return; }
    audio.current?.pause();
  }, []);

  const play = useCallback((t, list) => {
    if (!t) return;
    if (trackRef.current?.id === t.id) {
      if (isYT(t)) { try { ytRef.current?.toggle(); } catch {} return; }
      const a = audio.current;
      if (a) { a.paused ? a.play().catch(() => {}) : a.pause(); }
      return;
    }
    const q = list || queueRef.current;
    let i = q.findIndex((x) => x.id === t.id);
    let nextQ = q;
    let changed = !!list;
    if (i < 0) {
      const cur = indexRef.current;
      nextQ = [...q];
      nextQ.splice(cur + 1, 0, t);
      i = cur + 1;
      changed = true;
    }
    playAt(i, changed ? nextQ : undefined);
  }, [playAt]);

  const toggle = useCallback(() => {
    const t = trackRef.current;
    if (isYT(t)) { try { ytRef.current?.toggle(); } catch {} return; }
    const a = audio.current;
    if (!a) return;
    if (a.paused) { a.play().catch(() => {}); return; }
    try { if (typeof document !== 'undefined' && document.hidden) hideRef.current.userPaused = true; } catch {}
    a.pause();
  }, []);

  /** Radio: recomendados primero y luego descubrimiento aleatorio, sin parar. */
  // Fase 1 = mismo estilo (relacionados de YouTube + mismo artista).
  // Fase 2 = totalmente aleatorio: viejitas, otro género, populares.
  // Todo en paralelo con tope de tiempo para que se sienta instantáneo.
  const normRadioTitle = (t) => String(t?.title || '').toLowerCase()
    .replace(/\s*[\(\[].*?[\)\]]\s*/g, '').replace(/[^a-z0-9áéíóúñü ]/gi, '').trim();
  const shufflePick = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  // Mezcla para descubrir: viejitas, otros géneros y populares. Se rotan
  // para que cada tanda traiga algo distinto. Ampliado estilo Spotify/YT Mix.
  const DISCOVERY_POOL = [
    'oldies hits 70s 80s 90s',
    'rock en español clasicos 80s 90s',
    'salsa clasica hits',
    'cumbias famosas',
    'vallenato clasicos',
    'baladas romanticas 80s 90s',
    'pop hits 2000s',
    'reggaeton viejito hits',
    'musica popular colombiana despecho',
    'top global hits',
    'merengue clasico hits',
    'bachata hits famosas',
    'musica disco 70s 80s fiesta',
    'rancheras famosas',
    'tropical hits fiesta',
    'hip hop 90s 2000s hits',
    'top hits colombia 2026',
    'top hits mexico 2026',
    'top latin hits 2026',
    'rock hits clasicos y nuevos',
    'pop road trip hits',
    'lofi chill study beats',
    'electronic dance hits fiesta',
    'phonk drift music',
    'musica urbana latina hits',
  ];
  const recentDisc = useRef([]);
  const withTimeout = (promise, ms = 8500) => Promise.race([
    Promise.resolve(promise).catch(() => []),
    new Promise((res) => setTimeout(() => res([]), ms)),
  ]);
  // Candidatos distintos: fuera repetidos (id o título) y bloqueados, mezclados.
  const freshDifferent = useCallback((cands, count, extraIds, extraTitles) => {
    const q = queueRef.current;
    const seenIds = new Set(q.map((x) => x.id));
    const seenTitles = new Set(q.map(normRadioTitle));
    if (extraIds) for (const id of extraIds) seenIds.add(id);
    if (extraTitles) for (const tt of extraTitles) seenTitles.add(tt);
    const curTitle = normRadioTitle(trackRef.current);
    if (curTitle) seenTitles.add(curTitle);
    const out = [];
    for (const t of shufflePick(cands || [])) {
      if (!t?.videoId || seenIds.has(t.id)) continue;
      const nt = normRadioTitle(t);
      if (nt && seenTitles.has(nt)) continue; // misma canción con otro video: fuera
      seenIds.add(t.id);
      if (nt) seenTitles.add(nt);
      out.push(t);
      if (out.length >= count) break;
    }
    return out;
  }, []);

  // Reserva de radio en 3 fases: 1) mezcla oficial YTM (Worker RDAMVM),
  // 2) relacionados + mismo artista, 3) descubrimiento aleatorio.
  const fetchRadioCandidates = useCallback(async (seed, want = 20) => {
    if (!seed?.videoId) return [];
    const who = String(seed.artist || seed.channel || '').split(',')[0].trim();
    const validWho = who && who !== 'YouTube' && who !== 'Desconocido' ? who : '';
    // Elige 2 búsquedas de descubrimiento distintas a las recientes
    const bag = shufflePick(DISCOVERY_POOL).filter((x) => !recentDisc.current.includes(x));
    const discs = [...bag, ...shufflePick(DISCOVERY_POOL)].slice(0, 2);
    recentDisc.current = [...discs, ...recentDisc.current].slice(0, 6);
    const T = 5000;
    // Fase 1: mezcla oficial YTM (rápida, 9s máx). Si responde, manda.
    // El descubrimiento arranca diferido: antes salían 5 búsquedas a la vez y
    // le robaban ancho de banda a la canción que está arrancando (lag en 4G).
    const pMix = withTimeout(getYTMix(seed.videoId, 20, 9000), 9000);
    const pRel = withTimeout(getRelated(seed.videoId, 15), T);
    const pSame = validWho ? withTimeout(searchYouTube(`${validWho} canciones`, 8), T) : Promise.resolve([]);
    let pR = null;
    const getDiscovery = () => (pR || (pR = Promise.all([withTimeout(searchYouTube(discs[0] || DISCOVERY_POOL[0], 8), T), withTimeout(searchYouTube(discs[1] || DISCOVERY_POOL[1], 8), T)])));
    const nap = (ms) => new Promise((r) => setTimeout(r, ms));
    const [mix, rel] = await Promise.all([pMix, pRel]);
    const mixFresh = freshDifferent(mix || [], Math.min(want, 12));
    // Si la mezcla oficial trae suficiente, se completa con descubrimiento y listo
    if (mixFresh.length >= Math.ceil(want * 0.5)) {
      const rr = await Promise.race([getDiscovery(), nap(400)]);
      const r1 = rr?.[0] || []; const r2 = rr?.[1] || [];
      const ranFresh = freshDifferent(
        [...(r1 || []), ...(r2 || [])], want - mixFresh.length,
        new Set(mixFresh.map((t) => t.id)),
        new Set(mixFresh.map(normRadioTitle)),
      );
      return [...mixFresh, ...ranFresh];
    }
    const thin = (rel || []).length + mixFresh.length < Math.ceil(want * 0.5);
    const [same, rr] = await Promise.all([
      Promise.race([pSame, nap(thin ? 3000 : 350)]),
      Promise.race([getDiscovery(), nap(thin ? 3000 : 350)]),
    ]);
    const r1 = rr?.[0] || []; const r2 = rr?.[1] || [];
    const relatedPool = [...mixFresh, ...(rel || []), ...(same || [])];
    const randomPool = [...(r1 || []), ...(r2 || [])];
    const nRel = Math.ceil(want * 0.6);
    const nRan = Math.max(4, want - nRel);
    const relFresh = freshDifferent(relatedPool, nRel);
    const ranFresh = freshDifferent(
      randomPool, nRan,
      new Set(relFresh.map((t) => t.id)),
      new Set(relFresh.map(normRadioTitle)),
    );
    if (relFresh.length || ranFresh.length) return [...relFresh, ...ranFresh];
    // Repliegue: lo que haya, aunque sea poco
    return freshDifferent([...relatedPool, ...randomPool], want);
  }, [freshDifferent]);
  const autoRadio = useCallback(async () => {
    const t = trackRef.current;
    if (!isYT(t)) { setPlaying(false); return; }
    if (radioBusyRef.current) return;
    setRadioBusy(true);
    radioBusyRef.current = true;
    try {
      const fresh = await fetchRadioCandidates(t, 20);
      if (!fresh.length) { setPlaying(false); return; }
      const cur = indexRef.current;
      const q = queueRef.current;
      toast(fresh.some((x) => x.mix) ? `Mezcla YT: ${fresh.length} oficiales + descubrimiento` : `Radio: ${fresh.length} más (estilo + aleatorias)`, Radio);
      playAt(cur + 1, [...q, ...fresh]);
    } catch {
      setPlaying(false);
    } finally {
      setRadioBusy(false);
      radioBusyRef.current = false;
    }
  }, [playAt, toast, fetchRadioCandidates]);

  /** Inicia la radio desde un tema: encola similares y suena el primero. */
  const startRadio = useCallback(async (seed) => {
    const t = seed || trackRef.current;
    if (!t?.videoId) { toast('La radio necesita un tema de YouTube', AlertTriangle); return; }
    if (radioBusyRef.current) return;
    setRadioBusy(true);
    radioBusyRef.current = true;
    try {
      const fresh = await fetchRadioCandidates(t, 22);
      if (!fresh.length) { toast('Sin similares por ahora', AlertTriangle); return; }
      const cur = Math.max(0, indexRef.current);
      const q = queueRef.current;
      toast(fresh.some((x) => x.mix) ? `Mezcla YT: ${fresh.length} oficiales + descubrimiento` : `Radio: ${fresh.length} (recomendadas + aleatorias)`, Radio);
      playAt(cur + 1, [...q.slice(0, cur + 1), ...fresh]);
    } catch {
      toast('No se pudo armar la radio', AlertTriangle);
    } finally {
      setRadioBusy(false);
      radioBusyRef.current = false;
    }
  }, [playAt, toast, fetchRadioCandidates]);

  /**
   * Tocar un tema (buscador, tendencias, recomendados): suena ESE tema al
   * instante y la radio sigue sola: primero recomendadas del estilo y
   * después descubrimiento aleatorio (viejitas, otro género, populares).
   */
  const radioReq = useRef(0);
  const playRadio = useCallback(async (seed) => {
    const t = seed || trackRef.current;
    if (!t) return;
    if (trackRef.current?.id === t.id && isYT(t)) {
      try { ytRef.current?.toggle(); } catch {}
      return;
    }
    const my = ++radioReq.current;
    errStreak.current = 0;
    setStuck(false);
    playAt(0, [t]); // suena ya; la cola es solo este tema
    if (!isYT(t)) return;
    if (radioBusyRef.current) return;
    setRadioBusy(true);
    radioBusyRef.current = true;
    try {
      // La radio de fondo espera a que el video arranque (máx 6s): en 4G la
      // ráfaga de búsquedas le robaba ancho de banda a la primera canción y
      // se quedaba "cargando" hasta el error. Primero que suene, luego el resto.
      const t0 = Date.now();
      while (!playingRef.current && Date.now() - t0 < 6000) {
        if (my !== radioReq.current || trackRef.current?.id !== t.id) return;
        await new Promise((r) => setTimeout(r, 400));
      }
      if (my !== radioReq.current || trackRef.current?.id !== t.id) return;
      await new Promise((r) => setTimeout(r, 800)); // holgura para el buffer
      if (my !== radioReq.current || trackRef.current?.id !== t.id) return;
      const fresh = await fetchRadioCandidates(t, 16);
      if (my !== radioReq.current) return; // tocó otro tema mientras tanto
      if (!fresh.length) return;
      const q = queueRef.current;
      // Solo añade si seguimos en el mismo tema (no pisar otro play)
      if (trackRef.current?.id === t.id) {
        setQueue([...q.slice(0, 1), ...fresh]);
        toast(fresh.some((x) => x.mix) ? `Mezcla YT: ${fresh.length} oficiales` : `Radio: ${fresh.length} (estilo + aleatorias)`, Radio);
      }
    } catch { /* suena el tema; la radio reintenta al terminar */ }
    finally {
      if (my === radioReq.current) {
        setRadioBusy(false);
        radioBusyRef.current = false;
      }
    }
  }, [playAt, toast, fetchRadioCandidates, setQueue]);

  /** Avanza en orden o aleatorio. auto=true cuando lo llama onEnded/onError.
   *  Respeta repeat one/all + shuffle. Al terminar la cola la radio trae similares. */
  const pickShuffleIndex = useCallback((q, cur) => {
    if (!q.length) return -1;
    if (q.length === 1) return 0;
    let n = cur;
    let guard = 0;
    while (n === cur && guard++ < 8) n = Math.floor(Math.random() * q.length);
    return n;
  }, []);

  const next = useCallback((auto = false) => {
    if (!auto) { errStreak.current = 0; setStuck(false); } // salto manual: racha nueva
    const q = queueRef.current;
    const cur = indexRef.current;
    if (!q.length) return;
    // Repeat one: en auto repite el mismo; en manual avanza
    if (auto && repeatRef.current === 'one') {
      const t = trackRef.current;
      if (isYT(t)) { try { ytRef.current?.replay?.(); } catch {} return; }
      if (audio.current) { try { audio.current.currentTime = 0; audio.current.play().catch(() => {}); } catch {} return; }
      playAt(Math.max(0, cur));
      return;
    }
    // Con la mezcla activa la cola YA está reordenada (ver shuffleQueue): se avanza en orden,
    // así ninguna canción se repite hasta que hayan sonado las demás. Solo con 1-2 temas
    // (nada que reordenar) se conserva el salto aleatorio.
    if (shuffleRef.current && q.length > 1 && q.length < 3) {
      const ni = pickShuffleIndex(q, cur);
      if (ni >= 0) { playAt(ni); return; }
    }
    const atEnd = cur >= q.length - 1;
    if (atEnd) {
      if (repeatRef.current === 'all') { playAt(0); return; }
      if (!auto) {
        if (repeatRef.current === 'off') { playAt(0); return; }
        playAt(0); return;
      } // salto manual al final: vuelve al inicio
      if (!stuckRef.current && isYT(trackRef.current) && !radioBusyRef.current) {
        void autoRadio();
        return;
      }
      setPlaying(false);
      return;
    }
    playAt(cur + 1);
  }, [playAt, autoRadio, pickShuffleIndex]);

  const curTime = useCallback(() => {
    const t = trackRef.current;
    if (isYT(t)) { try { return ytRef.current?.getTime() || 0; } catch { return 0; } }
    return audio.current?.currentTime || 0;
  }, []);

  const prev = useCallback(() => {
    const q = queueRef.current;
    const cur = indexRef.current;
    if (!q.length) return;
    if (curTime() > 3) {
      // Reinicia el tema actual
      const t = trackRef.current;
      if (isYT(t)) { try { ytRef.current?.seekTo(0); } catch {} return; }
      if (audio.current) audio.current.currentTime = 0;
      return;
    }
    playAt(cur <= 0 ? q.length - 1 : cur - 1);
  }, [curTime, playAt]);

  /** Fin de tema: siempre avanza al siguiente (la radio sigue sola). */
  const handleEnded = useCallback(() => {
    setPlaying(false);
    next(true);
  }, [next]);

  /** Racha de fallos seguidos: si pasa de 5 en 4s se frena en vez de
   *  encadenar skips (evita el "pasando canciones rápido"). */
  const noteSkip = useCallback(() => {
    const now = Date.now();
    if (now - skipBurst.current.t > 4000) skipBurst.current = { n: 1, t: now };
    else skipBurst.current.n += 1;
    if (skipBurst.current.n >= 6) {
      skipBurst.current = { n: 0, t: 0 };
      setPlaying(false);
      toast('Varios temas fallaron seguidos — se pausó', AlertTriangle);
      return true;
    }
    return false;
  }, [toast]);

  /** Error del <audio>: en frío (preload sin haber sonado) se ignora para no
   *  saltar solo al entrar; en caliente intenta revivir la URL local y si no,
   *  salta con cortacircuitos. Así el fondo tampoco se come la cola. */
  const handleAudioError = useCallback(() => {
    const t = trackRef.current;
    if (!engagedRef.current && !playingRef.current) return;
    // Audio directo de YouTube con URL caducada: pide una nueva y sigue en el mismo segundo (una vez por tema).
    if (t?.native && t.videoId && nativeRetry.current !== t.id) {
      nativeRetry.current = t.id;
      const at = curTime();
      resolveNativeAudio(t.videoId, { force: true }).then((r) => {
        if (trackRef.current?.id !== t.id) return;
        if (!r) { nativeRetry.current = null; noteSkip(); next(true); return; }
        const nt = { ...t, src: r.url };
        setTrack(nt); setSavedTrack(nt); trackRef.current = nt;
        pendingSeek.current = at > 5 ? at : 0;
        setTimeout(() => startPlayback(), 0);
        setTimeout(() => { if (nativeRetry.current === t.id) nativeRetry.current = null; }, 20000);
      });
      return;
    }
    if (t?.source === 'Local') {
      try {
        const fresh = localRef.current?.urlFor?.(t.id) || null;
        if (fresh && fresh !== t.src) {
          const nt = { ...t, src: fresh };
          setTrack(nt); setSavedTrack(nt);
          trackRef.current = nt;
          setTimeout(() => startPlayback(), 0);
          return;
        }
      } catch { /* sigue al salto */ }
      // Aún hidratando URLs: no saltar, la hidratación remonta el audio.
      if (!localRef.current?.ready) return;
    }
    if (noteSkip()) return;
    toast('Ese stream falló, pasando al siguiente', AlertTriangle);
    next(true);
  }, [next, noteSkip, startPlayback, setSavedTrack, toast, curTime]);

  /** Reintenta el tema actual (YT bloqueado o stream caído). */
  const retryCurrent = useCallback(() => {
    const t = trackRef.current;
    if (!t) return;
    if (isYT(t)) {
      setResolving(true);
      try { ytRef.current?.load(t.videoId, true); } catch {}
      return;
    }
    playAt(Math.max(0, indexRef.current));
  }, [playAt]);

  /** Pasa el tema actual de YouTube a su versión de segundo plano (si existe), en el mismo minuto.
   * Gratis: YouTube embebido se pausa con pantalla apagada por sus términos;
   * por eso se usa el gemelo Audius (<audio> normal) que sí sigue en background. */
  const swapToBg = useCallback(async (manual = false) => {
    const t = trackRef.current;
    if (!isYT(t)) { if (manual) toast('Este tema ya suena en segundo plano', Headphones); return false; }
    if (manual) toast('Buscando versión gratis para segundo plano…', Headphones);
    const tw = await findBgTwin(t);
    if (!tw) { if (manual) toast('Sin versión de segundo plano gratis para este tema (YouTube exige pantalla encendida)', AlertTriangle); return false; }
    if (trackRef.current?.id !== t.id) return false;
    const cur = curTime();
    const q = [...queueRef.current];
    const i = Math.max(0, indexRef.current);
    q[i] = tw;
    try { ytRef.current?.stop(); } catch {}
    playAt(i, q);
    pendingSeek.current = cur > 5 ? cur : 0;
    if (!tw.native) toast('Segundo plano activado', Headphones);
    return true;
  }, [curTime, playAt, toast]);

  // Precarga: busca las versiones de segundo plano del tema actual y los próximos de la cola.
  // Solo tras el primer play de la sesión: al entrar no se dispara una ráfaga de
  // búsquedas (entrada suave). El pase manual a 2º plano sigue instantáneo.
  useEffect(() => {
    if (!engagedRef.current) return;
    if (track && isYT(track)) {
      // APK: en cuanto llega el audio directo, el tema pasa del iframe al <audio> (así ya está listo antes de apagar la pantalla)
      findBgTwin(track).then((tw) => {
        if (tw?.native && bgPrefRef.current && playingRef.current && trackRef.current?.id === track.id && isYT(trackRef.current)) swapToBg(false);
      }).catch(() => {});
    }
    if (!bgPref) return;
    const q = queueRef.current; const i = Math.max(0, indexRef.current);
    [...q.slice(i + 1, i + 4)].filter(isYT).forEach((t) => { findBgTwin(t).catch(() => {}); });
  }, [bgPref, track?.id, index, queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Al apagar la pantalla / cambiar de app con un tema de YouTube sonando: pasa a 2º plano si se puede.
  // Al volver, si el navegador bloqueó el play automático, se reanuda (el gesto de volver vale como interacción).
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        if (bgPrefRef.current && playingRef.current && isYT(trackRef.current)) swapToBg(false);
        return;
      }
      if (needsTapRef.current && !isYT(trackRef.current)) {
        needsTapRef.current = false;
        try {
          const a = audio.current;
          if (a && a.paused) a.play().then(() => setPlaying(true)).catch(() => { needsTapRef.current = true; });
        } catch { needsTapRef.current = true; }
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [swapToBg]);

  // --- eventos del embed YouTube ---
  // Restaura el progreso guardado: al primer PLAYING/CUED tras recargar,
  // salta al minuto guardado (una sola vez por tema).
  const applyYTSeek = useCallback(() => {
    const want = pendingSeek.current;
    if (!want || want < 5) { pendingSeek.current = 0; return; }
    const t = trackRef.current;
    try {
      const dur = ytRef.current?.getDuration?.() || t?.duration || 0;
      if (dur && want > dur - 10) { pendingSeek.current = 0; return; }
      ytRef.current?.seekTo?.(want);
      // La barra arranca ya ubicada aunque el sondeo tarde
      setTime((prev) => ({ cur: want, dur: prev.dur || dur || 0 }));
    } catch { /* reintenta en el próximo evento */ return; }
    pendingSeek.current = 0;
    if (!seekToastShown.current) {
      seekToastShown.current = true;
      toast(`Continuamos en ${fmtTime(want)}`, History);
    }
  }, [toast]);
  const onYTState = useCallback((s) => {
    if (s === YT_STATE.ENDED) { setResolving(false); handleEnded(); }
    // Al empezar a sonar (o quedar listo) re-ajusta el tamaño: si la API
    // cargó tarde, el player pudo quedar en 2px = pantalla negra.
    else if (s === YT_STATE.PLAYING) { setResolving(false); setPlaying(true); errStreak.current = 0; setStuck(false); ytRetry.current = { id: null, n: 0 }; applyYTSeek(); }
    else if (s === YT_STATE.PAUSED) { setResolving(false); setPlaying(false); }
    else if (s === YT_STATE.BUFFERING) { if (!playingRef.current) setResolving(true); }
    else if (s === YT_STATE.CUED) { setResolving(false); applyYTSeek(); }
  }, [handleEnded, applyYTSeek]);

  /** El <audio> llama esto al cargar metadata: restaura el minuto guardado. */
  const applyPendingSeek = useCallback(() => {
    const want = pendingSeek.current;
    const a = audio.current;
    if (!a) return;
    if (!want || want < 5) { pendingSeek.current = 0; return; }
    try {
      const dur = a.duration || trackRef.current?.duration || 0;
      if (dur && want > dur - 10) { pendingSeek.current = 0; return; }
      a.currentTime = want;
      setTime((prev) => ({ cur: want, dur: prev.dur || dur || 0 }));
    } catch { return; }
    pendingSeek.current = 0;
    if (!seekToastShown.current) {
      seekToastShown.current = true;
      toast(`Continuamos en ${fmtTime(want)}`, History);
    }
  }, [toast]);

  const onYTError = useCallback((code) => {
    setResolving(false);
    const t = trackRef.current;
    console.error('[hermes] YT embed error', code, t?.title);
    // La API de YouTube no cargó (red lenta, adblock, DNS): mensaje claro,
    // sin reintentos inútiles que solo alargan el "cargando".
    if (code === 'api') {
      errStreak.current = 0;
      ytRetry.current = { id: null, n: 0 };
      toast('YouTube no cargó (revisa tu conexión o desactiva el bloqueador) e intenta de nuevo', AlertTriangle);
      setPlaying(false);
      return;
    }
    const n = ++errStreak.current;
    if (code === 101 || code === 150) {
      // El dueño prohíbe el embed: se guarda para ofrecer salida a
      // YouTube y se marca para no volver a traerlo en búsquedas.
      if (t?.videoId) markBlockedVideo(t.videoId);
      setBlocked({
        id: t?.id || `b_${Date.now()}`,
        title: t?.title || 'Ese video',
        artist: t?.artist || '',
        videoId: t?.videoId || null,
      });
      if (n <= 1) {
        // Solo el primero avisa y abre el panel: los siguientes de la
        // misma racha avanzan en silencio para no llenar de avisos.
        setBlockedOpen(true);
        toast('Ese video no permite reproducción externa — siguiente', AlertTriangle);
      }
      if (n >= ERR_HALT) {
        // Tanda entera bloqueada: se frena el avance automático en vez
        // de encadenar un aviso por cada tema.
        setStuck(true);
        setPlaying(false);
        setBlockedOpen(true);
        toast('Varios videos bloqueados seguidos — ábrelos en YouTube o dale siguiente', AlertTriangle);
        return;
      }
    } else {
      // Fallo temporal (red, API, video lento): REINTENTA la misma canción
      // hasta 3 veces antes de pasar a otra. No se salta al primer fallo.
      if (ytRetry.current.id !== t?.id) ytRetry.current = { id: t?.id, n: 0 };
      if (ytRetry.current.n < YT_RETRIES && t?.videoId) {
        ytRetry.current.n += 1;
        const n = ytRetry.current.n;
        if (n <= 2) toast(`Fallo YouTube: reintentando (${n}/${YT_RETRIES})…`, AlertTriangle);
        setResolving(true);
        setTimeout(() => { if (trackRef.current?.id === t?.id) retryCurrent(); }, 1500);
        return;
      }
      ytRetry.current = { id: null, n: 0 };
      if (n <= 2) toast(`YouTube falló (${code}) — siguiente`, AlertTriangle);
      if (n >= ERR_HALT + 2) {
        setStuck(true);
        setPlaying(false);
        return;
      }
    }
    next(true);
  }, [next, toast, retryCurrent]);

  const dismissBlocked = useCallback(() => { setBlocked(null); setBlockedOpen(false); }, []);
  const openBlocked = useCallback(() => setBlockedOpen(true), []);
  const closeBlocked = useCallback(() => setBlockedOpen(false), []);

  // Perro guardián: a los 6s avisa suave (primera vez en 4G tarda), a los 20s
  // sin PLAYING/ERROR se suelta con aviso en vez de "cargando" eterno.
  const resolvingTimer = useRef(null);
  const resolvingGentle = useRef(null);
  useEffect(() => {
    if (!resolving) {
      if (resolvingTimer.current) { clearTimeout(resolvingTimer.current); resolvingTimer.current = null; }
      if (resolvingGentle.current) { clearTimeout(resolvingGentle.current); resolvingGentle.current = null; }
      return undefined;
    }
    if (resolvingTimer.current) clearTimeout(resolvingTimer.current);
    if (resolvingGentle.current) clearTimeout(resolvingGentle.current);
    resolvingGentle.current = setTimeout(() => {
      resolvingGentle.current = null;
      if (trackRef.current && isYT(trackRef.current) && !playingRef.current) {
        toast('Conectando con YouTube… la primera vez tarda unos segundos', Headphones);
      }
    }, 6000);
    resolvingTimer.current = setTimeout(() => {
      resolvingTimer.current = null;
      const t = trackRef.current;
      if (!t || !isYT(t)) return;
      // Si sigue sin sonar, corta el spinner y ofrece reintentar.
      setResolving(false);
      toast('Tarda demasiado en arrancar — toca Reintentar o Siguiente', AlertTriangle);
    }, 20000);
    return () => {};
  }, [resolving, toast]);

  // --- fundido entre canciones para <audio> (Local/Audius): sube al empezar y baja al terminar,
  // sin cortes ni saltos de volumen. (YouTube hace lo mismo con su propio sondeo, más abajo.) ---
  useEffect(() => {
    if (!track || track.source === 'YouTube') return undefined;
    let faded = false;
    const iv = setInterval(() => {
      const a = audio.current; const xf = xfadeRef.current || 0;
      if (!a || a.paused) return;
      const dur = a.duration; const cur = a.currentTime;
      const base = muted ? 0 : Math.min(1, Math.max(0, volume));
      if (xf > 0 && isFinite(dur) && dur > xf * 2 + 2) {
        let f = 1;
        if (dur - cur < xf) f = Math.max(0.03, (dur - cur) / xf);
        else if (cur < xf) f = Math.max(0.03, cur / xf);
        if (f < 0.995) { a.volume = base * f; faded = true; return; }
      }
      if (faded) { a.volume = base; faded = false; }
    }, 120);
    return () => clearInterval(iv);
  }, [track, volume, muted]);

  // --- sondeo de progreso para temas YouTube (el embed no emite timeupdate) ---
  // Cada 1s (antes 500ms) y sin re-aplicar el mismo volumen: la mitad de CPU.
  useEffect(() => {
    if (track?.source !== 'YouTube') return;
    let lastApplied = -1;
    const iv = setInterval(() => {
      try {
        const cur = ytRef.current?.getTime() || 0;
        const dur = ytRef.current?.getDuration() || track.duration || 0;
        tick(cur, dur);
        // Fundido YT (el embed no admite nodos WebAudio): rampa de volumen
        const xf = xfadeRef.current || 0;
        if (xf > 0 && dur > xf + 2) {
          const base = muted ? 0 : volume;
          let f = 1;
          if (dur - cur < xf) f = Math.max(0.05, (dur - cur) / xf);
          else if (cur < xf) f = Math.max(0.05, cur / xf);
          const v = Math.round((f < 0.99 ? base * f : base) * 200);
          if (v !== lastApplied) {
            lastApplied = v;
            try { ytRef.current?.applyVolume(f < 0.99 ? base * f : base, muted); } catch {}
          }
        } else lastApplied = -1;
      } catch {}
    }, 1000);
    return () => clearInterval(iv);
  }, [track, tick, volume, muted]);

  // --- progreso persistido: guarda el minuto cada ~5s y al cerrar/recargar,
  // para retomar donde quedaste aunque se recargue la app ---
  const timeRef = useRef(time);
  timeRef.current = time;
  const lastSavedCur = useRef(savedTime?.id && savedTime.id === savedTrack?.id ? +savedTime.cur || 0 : 0);
  useEffect(() => {
    const t = trackRef.current;
    const tc = time?.cur || 0;
    if (!t || tc < 5) return;
    if (Math.abs(tc - lastSavedCur.current) < 4 && savedTime?.id === t.id) return;
    lastSavedCur.current = Math.floor(tc);
    setSavedTime({ id: t.id, cur: Math.floor(tc) });
  }, [time?.cur, track?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const save = () => {
      const t = trackRef.current;
      const c = timeRef.current?.cur || 0;
      if (t && c > 5) {
        lastSavedCur.current = Math.floor(c);
        setSavedTime({ id: t.id, cur: Math.floor(c) });
      }
    };
    window.addEventListener('beforeunload', save);
    return () => window.removeEventListener('beforeunload', save);
  }, [setSavedTime]);

  // --- rehidrata temas locales: los blob: URLs mueren al recargar;
  // se reemplazan por las URLs frescas de la sesión (o se descartan) ---
  const localReady = !!local?.ready;
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!localReady || hydratedRef.current || !local) return;
    hydratedRef.current = true;
    const fix = (t) => {
      if (!t || t.source !== 'Local') return t;
      const url = local.urlFor(t.id);
      return url ? { ...t, src: url } : null;
    };
    const nq = queueRef.current.map(fix).filter(Boolean);
    if (nq.length !== queueRef.current.length || nq.some((t, i) => t.src !== queueRef.current[i]?.src)) {
      setQueue(nq);
    }
    const nt = fix(trackRef.current);
    if (trackRef.current?.source === 'Local') {
      setTrack(nt);
      setSavedTrack(nt);
      // Conserva el minuto guardado (antes lo reseteaba a 0 y se perdía
      // la posición al recargar). applyPendingSeek lo aplica al montar el audio.
      if (nt) {
        const keep = savedTime?.id && nt.id === savedTime.id ? Math.max(0, +savedTime.cur || 0) : 0;
        pendingSeek.current = keep > 5 ? keep : 0;
        setTime({ cur: keep, dur: nt.duration || 0 });
      }
      else setPlaying(false);
    }
    if (indexRef.current >= nq.length) setIndex(nq.length - 1);
  }, [localReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- scrobble ListenBrainz: a los 30s (o mitad si dura menos) del tema actual ---
  const scrobbledRef = useRef(new Set());
  useEffect(() => {
    const t = track;
    if (!t?.title) return undefined;
    let token = '';
    try { token = localStorage.getItem('h_lb_token') || ''; } catch { token = ''; }
    if (!token) return undefined;
    if (scrobbledRef.current.has(t.id)) return undefined;
    const wait = Math.min(30000, Math.max(10000, ((Number(t.duration) || 180) * 1000) / 2));
    const timer = setTimeout(() => {
      if (trackRef.current?.id !== t.id) return;
      scrobbledRef.current.add(t.id);
      submitListen(token, t).catch(() => {});
    }, wait);
    return () => clearTimeout(timer);
  }, [track?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- carátula del tema sonando ---
  // 1) Si el usuario eligió una a mano para esta canción, se vuelve a poner sola.
  // 2) Si no, y la búsqueda automática está activa, la thumb de YouTube se cambia por la
  //    oficial (Deezer / iTunes / MusicBrainz-CAA) en segundo plano. El audio no se toca.
  useEffect(() => {
    const t = track;
    if (!t?.id) return undefined;
    const custom = getCustomArt(t.id);
    const patch = (url, extra) => {
      if (trackRef.current?.id !== t.id) return;
      const nt = { ...trackRef.current, ...extra, art: url };
      setTrack(nt); setSavedTrack(nt);
      trackRef.current = nt;
      setQueue((qq) => qq.map((x) => (x.id === t.id ? { ...x, ...extra, art: url } : x)));
    };
    if (custom) {
      if (t.art !== custom) patch(custom, { artCustom: true, prevArt: t.prevArt || t.art, artOriginal: false });
      return undefined;
    }
    if (!autoCoverRef.current || !t.title || !/i\.ytimg\.com/.test(String(t.art || '')) || prefersYT(t.id)) return undefined;
    let dead = false;
    (async () => {
      try {
        const url = await getOriginalCover(t.title, t.artist, { videoId: t.videoId });
        if (dead || !url || /i\.ytimg\.com/.test(url)) return;
        patch(url, { artOriginal: true, ytArt: trackRef.current?.art });
      } catch { /* conserva thumb */ }
    })();
    return () => { dead = true; };
  }, [track?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- reserva de radio: cuando quedan ≤5 temas, trae ~14 más (estilo +
  // aleatorias) en segundo plano para que nunca se detenga ni repita.
  // Solo tras el primer play: al entrar no trae nada solo (entrada suave). ---
  useEffect(() => {
    if (!engagedRef.current) return;
    if (!track || !isYT(track)) return;
    if (queue.length - 1 - index > 8) return;
    if (radioBusyRef.current || stuckRef.current) return;
    let dead = false;
    (async () => {
      // No robar ancho de banda al video que está arrancando: espera a PLAYING (máx 6s)
      const t0 = Date.now();
      while (!playingRef.current && Date.now() - t0 < 6000) {
        if (dead) return;
        await new Promise((r) => setTimeout(r, 400));
      }
      if (dead) return;
      setRadioBusy(true);
      radioBusyRef.current = true;
      try {
        const lastQ = queueRef.current[queueRef.current.length - 1];
        const fresh = await fetchRadioCandidates(isYT(lastQ) ? lastQ : trackRef.current, 20);
        if (dead) return;
        if (!fresh.length) return;
        const q = queueRef.current;
        if (q.length - 1 - indexRef.current > 9) return;
        if (trackRef.current?.id !== track.id) return;
        setQueue([...q, ...fresh]);
      } catch { /* reintenta al avanzar */ }
      finally {
        if (!dead) {
          setRadioBusy(false);
          radioBusyRef.current = false;
        }
      }
    })();
    return () => { dead = true; };
  }, [index, queue.length, track, fetchRadioCandidates, setQueue]);

  // --- la cola no crece sin tope: la radio agrega ~20 por tanda y el queue
  // persistido (con carátulas) se volvía enorme -> parse/stringify lento al
  // entrar y la sensación de "carga muchas canciones". Se recorta a 150
  // alrededor del índice actual, sin tocar lo que suena. ---
  const trimRef = useRef(false);
  useEffect(() => {
    if (trimRef.current || queue.length <= 150 || index < 0) return;
    trimRef.current = true;
    try {
      const start = Math.max(0, index - 20);
      const nq = queue.slice(start, start + 150);
      setQueue(nq);
      setIndex(index - start);
    } catch { /* noop */ }
    finally {
      setTimeout(() => { trimRef.current = false; }, 1000);
    }
  }, [queue.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- cola ---
  const addNext = useCallback((t) => {
    const q = [...queueRef.current];
    q.splice(indexRef.current + 1, 0, t);
    setQueue(q);
    toast('Se reproducirá después', Heart);
  }, [setQueue, toast]);

  const addToEnd = useCallback((t) => {
    if (!t) return;
    setQueue([...queueRef.current, t]);
    toast('Añadida al final de la cola', Heart);
  }, [setQueue, toast]);

  const removeAt = useCallback((i) => {
    const q = queueRef.current;
    const cur = indexRef.current;
    const nq = q.filter((_, j) => j !== i);
    setQueue(nq);
    if (i === cur) {
      try { ytRef.current?.stop(); } catch {}
      audio.current?.pause();
      const nt = nq[Math.min(cur, nq.length - 1)] || null;
      setTrack(nt); setSavedTrack(nt);
      setIndex(nt ? Math.min(cur, nq.length - 1) : -1);
      if (!nt) setPlaying(false);
    } else if (i < cur) {
      setIndex(cur - 1);
    }
  }, [setIndex, setQueue, setSavedTrack]);

  const clearQueue = useCallback(() => {
    const cur = trackRef.current;
    setQueue(cur ? [cur] : []);
    setIndex(cur ? 0 : -1);
  }, [setIndex, setQueue]);

  // --- modos shuffle / repeat / velocidad ---
  // Mezcla: reordena SOLO lo que falta por sonar (la canción actual y lo ya reproducido se quedan).
  // El orden original se guarda para devolverlo al desactivar la mezcla.
  const ORIG_KEY = 'h_queue_orig';
  const shuffleQueue = useCallback((quiet = false) => {
    const q = queueRef.current; const cur = indexRef.current;
    const head = q.slice(0, Math.max(0, cur) + 1);
    const rest = q.slice(Math.max(0, cur) + 1);
    if (rest.length < 2) { if (!quiet) toast?.('Mezcla activada'); return; }
    try { localStorage.setItem(ORIG_KEY, JSON.stringify(q.map((x) => x.id))); } catch { /* noop */ }
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    setQueue([...head, ...rest]);
    if (!quiet) toast?.('Mezcla activada');
  }, [setQueue, toast]);
  const restoreQueueOrder = useCallback(() => {
    let ids = null;
    try { ids = JSON.parse(localStorage.getItem(ORIG_KEY) || 'null'); } catch { ids = null; }
    try { localStorage.removeItem(ORIG_KEY); } catch { /* noop */ }
    const q = queueRef.current;
    if (!Array.isArray(ids) || !ids.length) { toast?.('Mezcla desactivada'); return; }
    const byId = new Map(q.map((x) => [x.id, x]));
    const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
    const known = new Set(ids);
    const extra = q.filter((x) => !known.has(x.id)); // lo que se agregó mientras estaba mezclado va al final
    const nq = [...ordered, ...extra];
    const curId = trackRef.current?.id;
    setQueue(nq);
    const ni = nq.findIndex((x) => x.id === curId);
    if (ni >= 0) setIndex(ni);
    toast?.('Orden original');
  }, [setQueue, setIndex, toast]);
  const toggleShuffle = useCallback(() => {
    const on = !shuffleRef.current;
    shuffleRef.current = on;
    setShuffleState(on);
    if (on) shuffleQueue(); else restoreQueueOrder();
  }, [shuffleQueue, restoreQueueOrder]);
  const reshuffle = useCallback(() => { if (shuffleRef.current) shuffleQueue(); }, [shuffleQueue]);
  const cycleRepeat = useCallback(() => {
    setRepeatState((r) => {
      const n = r === 'off' ? 'all' : r === 'all' ? 'one' : 'off';
      toast?.(n === 'off' ? 'Repetir desactivado' : n === 'all' ? 'Repetir cola' : 'Repetir una');
      return n;
    });
  }, [toast]);
  const setRate = useCallback((v) => {
    const n = Math.min(2, Math.max(0.5, Number(v) || 1));
    setRateState(n);
  }, [setRateState]);
  const setXfade = useCallback((v) => {
    const n = [0, 1, 1.5, 2, 3, 5, 8, 12].includes(Number(v)) ? Number(v) : 1.5;
    setXfadeState(n);
  }, [setXfadeState]);
  const applyEQ = useCallback((preset, gains) => {
    setEqPresetState(preset);
    setEqGainsState(gains.slice(0, 10));
  }, [setEqPresetState, setEqGainsState]);

  // --- cola pro: mover, sin duplicados, duración ---
  const moveInQueue = useCallback((from, to) => {
    const q = [...queueRef.current];
    if (from < 0 || to < 0 || from >= q.length || to >= q.length || from === to) return;
    const [item] = q.splice(from, 1);
    q.splice(to, 0, item);
    const curId = trackRef.current?.id;
    setQueue(q);
    const ni = q.findIndex((x) => x.id === curId);
    if (ni >= 0) setIndex(ni);
  }, [setIndex, setQueue]);
  const dedupeQueue = useCallback(() => {
    const q = queueRef.current;
    const seen = new Set();
    const nq = [];
    let removed = 0;
    for (const t of q) {
      const k = t.videoId ? `v:${t.videoId}` : `t:${String(t.title || '').toLowerCase()}|${String(t.artist || '').toLowerCase()}`;
      if (seen.has(k)) { removed++; continue; }
      seen.add(k); nq.push(t);
    }
    if (!removed) { toast?.('Sin duplicados en la cola'); return 0; }
    const curId = trackRef.current?.id;
    setQueue(nq);
    const ni = nq.findIndex((x) => x.id === curId);
    if (ni >= 0) setIndex(ni);
    toast?.(`Cola: ${removed} duplicados fuera`);
    return removed;
  }, [setIndex, setQueue, toast]);
  const queueDuration = useCallback(() => {
    const q = queueRef.current; const cur = Math.max(0, indexRef.current);
    return q.slice(cur).reduce((a, t) => a + (Number(t.duration) || 0), 0);
  }, []);

  // --- volumen / modos ---
  const setVolume = useCallback((v) => {
    const n = Math.min(1, Math.max(0, v));
    setVolumeState(n);
    if (n > 0 && muted) setMuted(false);
  }, [muted, setMuted, setVolumeState]);

  const toggleMute = useCallback(() => setMuted((m) => !m), [setMuted]);

  const seek = useCallback((v) => {
    const t = trackRef.current;
    if (isYT(t)) { try { ytRef.current?.seekTo(v); } catch {} return; }
    if (audio.current) audio.current.currentTime = v;
  }, []);
  const seekBy = useCallback((d) => {
    const t = trackRef.current;
    if (isYT(t)) { try { ytRef.current?.seekBy(d); } catch {} return; }
    const a = audio.current;
    if (a && isFinite(a.duration)) a.currentTime = Math.min(Math.max(0, a.currentTime + d), a.duration || 0);
  }, []);

  // --- favoritos ---
  const isFav = useCallback((t) => favs.some((f) => f.id === t?.id), [favs]);
  const toggleFav = useCallback((t) => {
    if (!t) return;
    const has = favs.some((f) => f.id === t.id);
    toast(has ? 'Quitada de favoritos' : 'Añadida a favoritos', Heart);
    setFavs(has ? favs.filter((f) => f.id !== t.id) : [t, ...favs]);
  }, [favs, setFavs, toast]);

  const clearHistory = useCallback(() => setHistory([]), [setHistory]);
  const clearFavs = useCallback(() => { setFavs([]); toast?.('Favoritas vaciadas'); }, [setFavs, toast]);

  // --- MediaSession (controles sistema / bluetooth / lockscreen) ---
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title || 'Hermes',
        artist: track.artist || '',
        album: track.genre || 'Hermes',
        artwork: track.art ? [{ src: track.art, sizes: '512x512', type: 'image/jpeg' }] : [],
      });
    } catch { /* noop */ }
  }, [track]);

  // APK: servicio en primer plano mientras suena (segundo plano real con pantalla apagada)
  useEffect(() => {
    setNativePlayback(!!playing && !!track, { title: track?.title, artist: track?.artist });
  }, [playing, track]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
      navigator.mediaSession.setActionHandler('play', () => resume());
      navigator.mediaSession.setActionHandler('pause', () => pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => next(false));
      navigator.mediaSession.setActionHandler('seekto', (d) => { if (d.seekTime != null) seek(d.seekTime); });
      navigator.mediaSession.setActionHandler('seekbackward', () => seekBy(-10));
      navigator.mediaSession.setActionHandler('seekforward', () => seekBy(10));
    } catch { /* algunos navegadores no soportan seekto */ }
  }, [next, pause, playing, prev, resume, seek, seekBy]);

  // --- Si el sistema pausó el audio al ocultar la página (típico en Local
  // al salir a 2º plano), reanuda al volver. Si pausaste a mano, no toca nada.
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        hideRef.current = { wasPlaying: playingRef.current, userPaused: false };
        return;
      }
      const h = hideRef.current;
      hideRef.current = { wasPlaying: false, userPaused: false };
      const t = trackRef.current;
      if (!t || !h.wasPlaying || h.userPaused) return;
      try {
        if (!isYT(t)) {
          const a = audio.current;
          // El elemento sigue sonando: nada que hacer (evita re-disparos).
          if (a && !a.paused && playingRef.current) return;
          resume();
        } else if (!playingRef.current) {
          resume();
        }
      } catch { /* el navegador manda */ }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [resume]);

  // --- Atajos teclado globales (ignora inputs) ---
  useEffect(() => {
    const onKey = (e) => {
      const el = e.target;
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
      if (typing) return;
      if (!trackRef.current) return;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowRight') { seekBy(10); }
      else if (e.key === 'ArrowLeft') { seekBy(-10); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setVolume(Math.min(1, (muted ? 0 : volume) + 0.05)); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setVolume(Math.max(0, (muted ? 0 : volume) - 0.05)); }
      else if (e.key === 'm' || e.key === 'M') { toggleMute(); }
      else if (e.key === 'n' || e.key === 'N') { next(false); }
      else if (e.key === 'p' || e.key === 'P') { prev(); }
      else if (e.key === 's' || e.key === 'S') { toggleShuffle(); }
      else if (e.key === 'r' || e.key === 'R') { cycleRepeat(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [muted, next, prev, seekBy, setVolume, toggle, toggleMute, volume, toggleShuffle, cycleRepeat]);

  /** Botón "Revertir carátula": alterna entre la original y la miniatura de YouTube del tema que suena.
   *  Devuelve 'yt' | 'original' | null (null = no hay otra carátula que mostrar). */
  const toggleArt = useCallback(async () => {
    const t = trackRef.current;
    if (!t) return null;
    const apply = (nt) => {
      setTrack(nt); setSavedTrack(nt);
      trackRef.current = nt;
      setQueue((qq) => qq.map((x) => (x.id === nt.id ? { ...x, art: nt.art, artOriginal: nt.artOriginal, ytArt: nt.ytArt, origArt: nt.origArt } : x)));
    };
    if (t.artOriginal && t.ytArt) {
      setPrefYT(t.id, true);
      apply({ ...t, art: t.ytArt, origArt: t.art, artOriginal: false });
      return 'yt';
    }
    // Ya está la de YouTube: vuelve a la original (la guardada o la busca ahora).
    let orig = t.origArt;
    if (!orig && t.title) {
      try { orig = await getOriginalCover(t.title, t.artist, { videoId: t.videoId }); } catch { orig = ''; }
    }
    if (!orig || /i\.ytimg\.com/.test(orig)) return null;
    setPrefYT(t.id, false);
    if (trackRef.current?.id !== t.id) return null;
    apply({ ...trackRef.current, art: orig, ytArt: trackRef.current.art, artOriginal: true });
    return 'original';
  }, [setQueue, setSavedTrack]);

  /** Pone una carátula elegida (buscador de carátulas) SIN tocar el audio. Se recuerda por canción. */
  const setArt = useCallback((url, meta = {}) => {
    const t = trackRef.current;
    if (!t || !url) return false;
    setCustomArt(t.id, url);
    const nt = { ...t, art: url, artCustom: true, artOriginal: false, prevArt: t.artCustom ? t.prevArt : t.art, artMeta: meta };
    setTrack(nt); setSavedTrack(nt);
    trackRef.current = nt;
    setQueue((qq) => qq.map((x) => (x.id === nt.id ? { ...x, art: url, artCustom: true, artOriginal: false, prevArt: nt.prevArt } : x)));
    return true;
  }, [setQueue, setSavedTrack]);
  /** Restaura la carátula anterior a la elegida a mano. */
  const restoreArt = useCallback(() => {
    const t = trackRef.current;
    if (!t?.artCustom) return false;
    clearCustomArt(t.id);
    const back = t.prevArt || t.ytArt || t.origArt || '';
    if (!back) return false;
    const nt = { ...t, art: back, artCustom: false, prevArt: undefined, artMeta: undefined };
    setTrack(nt); setSavedTrack(nt);
    trackRef.current = nt;
    setQueue((qq) => qq.map((x) => (x.id === nt.id ? { ...x, art: back, artCustom: false, prevArt: undefined } : x)));
    return true;
  }, [setQueue, setSavedTrack]);

  return {
    toggleArt, setArt, restoreArt, autoCover, setAutoCover, shuffleQueue, reshuffle, addToEnd,
    audio, ytRef, onYTState, onYTError, applyPendingSeek, tick, bgPref, setBgPref, swapToBg,
    track, playing, setPlaying, time, setTime, resolving, retryCurrent, handleAudioError,
    blocked, blockedOpen, dismissBlocked, openBlocked, closeBlocked, stuck,
    favs, play, playAt, toggle, resume, pause, next: (a) => next(!!a), prev, handleEnded,
    queue, index,
    radio, startRadio, playRadio, radioBusy,
    shuffle, toggleShuffle, repeat, cycleRepeat, rate, setRate,
    eqPreset, eqGains, applyEQ, xfade, setXfade,
    moveInQueue, dedupeQueue, queueDuration, pickShuffleIndex,
    volume: muted ? 0 : volume, rawVolume: volume, muted, setVolume, toggleMute,
    history, clearHistory, clearFavs, addNext, removeAt, clearQueue,
    isFav, toggleFav, seek, seekBy,
  };
}
