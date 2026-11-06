import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useNavigationType, useParams } from 'react-router-dom';
import { PATHS, viewFromPath } from './data/routes';
import { bindContext } from './lib/playContext';
import { Menu, ArrowLeft, Maximize2, Minimize2, PawPrint, Music, Radio } from 'lucide-react';
import useStore from './hooks/useStore';
import useToasts from './hooks/useToasts';
import useWeather from './hooks/useWeather';
import useGreeting from './hooks/useGreeting';
import useIdle from './hooks/useIdle';
import useFaceReaction from './hooks/useFaceReaction';
import useReminders from './hooks/useReminders';
import useWeatherAlerts from './hooks/useWeatherAlerts';
import useNotes from './hooks/useNotes';
import usePlayer from './hooks/usePlayer';
import useLocalTracks from './hooks/useLocalTracks';
import useWakeLock from './hooks/useWakeLock';
import useLandscape from './hooks/useLandscape';
import useRadio from './hooks/useRadio';
import useArtColors from './hooks/useArtColors';
import useCloudSync from './hooks/useCloudSync';
import useAuth from './hooks/useAuth';
import usePresence from './hooks/usePresence';
import { saveProfileCloud } from './services/social';
import { handleSpotifyCallback } from './services/spotify';
import useShake, { fireShake } from './hooks/useShake';
import { DEF_SHORTCUTS } from './data/constants';
import { DEFAULT_PLACE } from './services/weather';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'sileo';
import NameModal from './components/NameModal';
import PlayerBar from './components/PlayerBar';
import RadioPlayerBar from './components/RadioPlayerBar';
import YTEmbed from './components/YTEmbed';
import HomeView from './views/HomeView';
import { lazyRetry, clearChunkRecovery } from './lib/lazyRetry';
// Vistas pesadas en lazy: no van al bundle inicial, cargan al abrirlas.
const PeerProfileView = lazyRetry(() => import('./views/PeerProfileView'));
const BlockedSheet = lazyRetry(() => import('./components/BlockedSheet'));
const FullPlayer = lazyRetry(() => import('./components/FullPlayer'));
const RadioFullPlayer = lazyRetry(() => import('./components/RadioFullPlayer'));
const WeatherView = lazyRetry(() => import('./views/WeatherView'));
const MusicView = lazyRetry(() => import('./views/MusicView'));
const ProfileView = lazyRetry(() => import('./views/ProfileView'));
const CommunityView = lazyRetry(() => import('./views/CommunityView'));
const ChatView = lazyRetry(() => import('./views/ChatView'));
const RadiosView = lazyRetry(() => import('./views/RadiosView'));
const RemindersView = lazyRetry(() => import('./views/RemindersView'));
const NotesView = lazyRetry(() => import('./views/NotesView'));
const ShortcutsView = lazyRetry(() => import('./views/ShortcutsView'));
const ToolsView = lazyRetry(() => import('./views/ToolsView'));
const FinanceView = lazyRetry(() => import('./views/FinanceView'));
const ZenView = lazyRetry(() => import('./views/ZenView'));
const SettingsView = lazyRetry(() => import('./views/SettingsView'));
const ViewFallback = () => (
  <div className="card grid place-items-center py-10" aria-label="Cargando vista">
    <span className="text-sm" style={{ color: 'var(--m)' }}>Cargando…</span>
  </div>
);
import PetLayer from './pets/PetLayer';
import { DEFAULT_PETS, normalizePets } from './pets/settings';

// Rutas con parámetro: leen el :id de la URL y se lo pasan a la vista.
function ChatRoute({ render }) { const { roomId } = useParams(); return render(roomId || null); }
function PeerRoute({ render }) { const { uid } = useParams(); return render(uid || null); }

export default function App() {
  // Navegación real con React Router: cada opción del menú es una URL (/musica, /clima…).
  const location = useLocation();
  const navigate = useNavigate();
  const navType = useNavigationType();
  const view = viewFromPath(location.pathname);
  const setView = (id) => navigate(PATHS[id] || '/');
  const openRoom = (id) => navigate(`/chat/${id}`);
  const openPeer = (uid) => navigate(`/perfil/${uid}`);
  const goBack = (fallback) => { if (window.history.state && window.history.state.idx > 0) navigate(-1); else navigate(fallback || '/', { replace: true }); };
  // Flechita de volver junto al menú: en las pantallas internas de Música (resultados, artista, álbum…).
  const musicSub = /^\/musica\/[^/]+/.test(location.pathname);
  const immersive = /^\/musica\/(artista|album)\//.test(location.pathname); // cabecera con foto: el menú y la flecha flotan encima
  // Una sola flecha de volver para todas las pantallas internas: la de la cabecera, junto al menú.
  const peerSub = view === 'peer';
  const subScreen = musicSub || peerSub;
  const backFallback = peerSub ? '/comunidad' : '/musica';
  const mainRef = useRef(null);
  // Scroll: arriba al entrar a una pantalla; al volver atrás recupera dónde estabas.
  const scrollPos = useRef(new Map());
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return undefined;
    const key = location.key;
    const saved = navType === 'POP' ? scrollPos.current.get(key) : 0;
    requestAnimationFrame(() => { try { el.scrollTo(0, saved || 0); } catch { el.scrollTop = saved || 0; } });
    return () => { scrollPos.current.set(key, el.scrollTop); };
  }, [location.key]); // eslint-disable-line react-hooks/exhaustive-deps
  // La app está corriendo: la última recarga de recuperación sí sirvió; permitir la próxima.
  useEffect(() => { clearChunkRecovery(); }, []);
  const [menu, setMenu] = useState(false);
  const [full, setFull] = useState(false);
  const [radioFull, setRadioFull] = useState(false);
  const [now, setNow] = useState(new Date());
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  const [dark, setDark] = useStore('h_dark', true);
  const [accent, setAccent] = useStore('h_accent', '#6366f1');
  const [name, setName] = useStore('h_name', '');
  const [skipName, setSkipName] = useStore('h_skip', false);
  const [shortcuts, setShortcuts] = useStore('h_short2', DEF_SHORTCUTS);
  const [tx, setTx] = useStore('h_tx', []);
  const [place, setPlace] = useStore('h_place', DEFAULT_PLACE);
  const [unit, setUnit] = useStore('h_unit', 'c');
  const [geoAsked, setGeoAsked] = useStore('h_geo_asked', false);
  const [wxAlerts, setWxAlerts] = useStore('h_wx', false);
  // Dos temas: apple-1 (carátula inmersiva) y apple-2 (carátula en cuadro). Los viejos se migran:
  // BitChord (hermes-04) → Tema 1, Spotify (hermes-03) → Tema 2.
  const [playerThemeRaw, setPlayerTheme] = useStore('h_player_theme', 'apple-1');
  const playerTheme = playerThemeRaw === 'apple-2' || playerThemeRaw === 'hermes-03' || playerThemeRaw === 'spotify' ? 'apple-2' : 'apple-1';
  useEffect(() => {
    if (playerThemeRaw !== playerTheme) setPlayerTheme(playerTheme);
  }, [playerThemeRaw, playerTheme]); // eslint-disable-line react-hooks/exhaustive-deps
  const [petsRaw, setPets] = useStore('h_pets', DEFAULT_PETS);
  const pets = normalizePets(petsRaw);
  // Tarjetas flotantes minimizadas: se reabren desde los iconos junto al de
  // mascotas (misma key que usaba FloatCard para no perder lo guardado).
  const readMin = (k) => { try { return localStorage.getItem(k) === '1'; } catch { return false; } };
  const [musicMin, setMusicMin] = useState(() => readMin('h_music_min'));
  const [radioMin, setRadioMin] = useState(() => readMin('h_radio_min'));
  useEffect(() => { try { localStorage.setItem('h_music_min', musicMin ? '1' : '0'); } catch {} }, [musicMin]);
  useEffect(() => { try { localStorage.setItem('h_radio_min', radioMin ? '1' : '0'); } catch {} }, [radioMin]);

  const [, toast] = useToasts();
  const cloud = useCloudSync(toast);
  const auth = useAuth(toast);
  // Callback Spotify PKCE (?code=...): canjea token y limpia URL
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.get('code')) {
        handleSpotifyCallback()
          .then(() => toast?.('Spotify conectado'))
          .catch(() => toast?.('Spotify: no se pudo conectar'));
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Respaldo del perfil a Supabase (con debounce, no bloquea).
  // Sin internet, sin configurar o sin login -> sigue en local.
  useEffect(() => {
    if (!name) return;
    const t = setTimeout(() => {
      saveProfileCloud({ handle: name, name }).catch(() => {});
    }, 2000);
    return () => clearTimeout(t);
  }, [name]);
  const weather = useWeather(place, unit);
  const [reminders, setReminders] = useReminders(toast);
  useWeatherAlerts({ enabled: wxAlerts, weather, toast });
  const local = useLocalTracks(toast);
  const player = usePlayer(toast, local);
  useEffect(() => { bindContext(player.track?.id); }, [player.track?.id]);
  usePresence(auth, player); // publica lo que suena para tus contactos
  // Confirmar antes de salir/recargar SOLO si suena música (no se para por accidente).
  // El navegador pone su texto; en PWA instalada a veces no dispara (límite del sistema).
  const playingRef = useRef(false);
  playingRef.current = player.playing;
  useEffect(() => {
    const onBefore = (e) => {
      if (!playingRef.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBefore);
    return () => window.removeEventListener('beforeunload', onBefore);
  }, []);
  // Atajo global: tocar la canción actual en cualquier lista abre el Sonando.
  player.openFull = () => setFull(true);
  // Radios del mundo: player propio; si la música suena, la radio se detiene.
  const radio = useRadio(toast, player);
  // Pantalla despierta mientras suene música o radio
  useWakeLock(player.playing || radio.playing);
  useEffect(() => { if (player.playing) radio.stop(); }, [player.playing]); // eslint-disable-line react-hooks/exhaustive-deps
  // Tema dinámico: mientras suena, toda la app toma el color de la carátula.
  // Al pausar / sin tema, vuelve a tu accent de Ajustes.
  const artColors = useArtColors(player.track?.art);
  const liveAccent = player.playing && artColors?.accent ? artColors.accent : accent;
  // Sacudida por gravedad: apagada por defecto; solo escucha el sensor si se activa.
  useShake({ enabled: pets.on && pets.shake, sensitivity: pets.shakeSens, onShake: (power) => fireShake(power) });
  const { period, greeting, quote } = useGreeting(now, name);
  const idle = useIdle();
  const [faceSeed] = useState(Math.random);
  // Pantalla completa: oculta la barra del sistema (hora/wifi) donde el
  // dispositivo lo permite. Requiere gesto del usuario (el botón).
  const [fs, setFs] = useState(false);
  // Botón de pantalla completa de la cabecera: se activa/desactiva desde Ajustes.
  const [fsBtn] = useStore('h_fs_btn', true);
  useEffect(() => {
    const onFs = () => setFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);
  const toggleFs = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen?.();
    } catch { /* no soportado */ }
  };
  // Sonando automático al girar el celular (solo música, solo táctil pequeño).
  const [autoLand, setAutoLand] = useStore('h_auto_land', true);
  const landscape = useLandscape();
  const autoOpened = useRef(false);
  const vetoTrack = useRef(null);
  useEffect(() => {
    let mobile = false;
    try { mobile = !!window.matchMedia?.('(pointer: coarse) and (max-width: 1023px)').matches; } catch { mobile = false; }
    if (!mobile || !autoLand) { autoOpened.current = false; return; }
    const trackId = player.track?.id;
    if (vetoTrack.current && vetoTrack.current !== trackId) vetoTrack.current = null;
    if (landscape && player.playing && player.track && !full && !radioFull && vetoTrack.current !== trackId) {
      autoOpened.current = true;
      setFull(true);
    } else if (!landscape && autoOpened.current) {
      autoOpened.current = false;
      vetoTrack.current = null;
      setFull(false);
    }
  }, [landscape, player.playing, player.track?.id, full, radioFull, autoLand]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeFull = () => {
    // Si lo cierras a mano en horizontal, no se reabre solo hasta girar o cambiar de tema.
    if (autoOpened.current && landscape) vetoTrack.current = player.track?.id;
    autoOpened.current = false;
    setFull(false);
  };
  const notesApi = useNotes(toast);
  // Pendientes sin vencer: recordatorios + notas con aviso futuro.
  const pendingCount = reminders.filter((r) => !r.done).length
    + notesApi.notes.filter((n) => n.reminderAt && !n.reminderDone && !n.trashed).length;
  // Reacciones: recordatorio disparado > click > dormido > música > pendientes > clima
  const { react, poke } = useFaceReaction({
    weather, hour: now.getHours(), playing: player.playing, track: player.track,
    idle, seed: faceSeed, name, pendingCount,
  });

  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.style.setProperty('--a', liveAccent);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#09090b' : '#f4f4f5');
  }, [dark, liveAccent]);
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(i); }, []);
  // GPS una sola vez: si acepta, usa tu ubicación; si no, Santa Bárbara.
  useEffect(() => {
    if (geoAsked || !('geolocation' in navigator)) return;
    setGeoAsked(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => setPlace({
        name: 'Mi ubicación',
        lat: +pos.coords.latitude.toFixed(4),
        lon: +pos.coords.longitude.toFixed(4),
      }),
      () => {},
      { timeout: 8000, maximumAge: 3600000 },
    );
  }, [geoAsked, setGeoAsked, setPlace]);
  useEffect(() => { const k = (e) => { if (e.key !== 'Escape') return; if (full) closeFull(); else if (radioFull) setRadioFull(false); else setMenu(false); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [full, radioFull]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { document.body.style.overflow = (menu || full || radioFull) ? 'hidden' : ''; }, [menu, full, radioFull]);

  const viewsEl = (
    <Routes>
      <Route path="/" element={<HomeView {...{ now, greeting, quote, weather, react, reminders, place }} playing={player.playing || radio.playing} idle={idle} onPoke={poke} onOpenWeather={() => setView('weather')} />} />
      <Route path="/clima" element={<WeatherView {...{ place, setPlace, unit, setUnit, toast }} />} />
      <Route path="/musica/*" element={<MusicView p={player} toast={toast} local={local} auth={auth} onOpenRoom={openRoom} />} />
      <Route path="/perfil" element={<ProfileView p={player} toast={toast} name={name} setName={setName} auth={auth} cloud={cloud} />} />
      <Route path="/perfil/:uid" element={<PeerRoute render={(uid) => <PeerProfileView uid={uid} p={player} toast={toast} auth={auth} onOpenRoom={openRoom} />} />} />
      <Route path="/comunidad" element={<CommunityView toast={toast} auth={auth} p={player} onOpenRoom={openRoom} onOpenPeer={openPeer} />} />
      <Route path="/chat" element={<ChatView p={player} toast={toast} name={name} auth={auth} initialRoom={null} onOpenPeer={openPeer} />} />
      <Route path="/chat/:roomId" element={<ChatRoute render={(roomId) => <ChatView p={player} toast={toast} name={name} auth={auth} initialRoom={roomId} onOpenPeer={openPeer} />} />} />
      <Route path="/radios" element={<RadiosView r={radio} toast={toast} />} />
      <Route path="/recordatorios" element={<RemindersView {...{ reminders, setReminders, toast }} />} />
      <Route path="/notas" element={<NotesView api={notesApi} toast={toast} />} />
      <Route path="/atajos" element={<ShortcutsView {...{ shortcuts, setShortcuts }} />} />
      <Route path="/herramientas" element={<ToolsView />} />
      <Route path="/finanzas" element={<FinanceView {...{ tx, setTx }} toast={toast} />} />
      <Route path="/zen" element={<ZenView onExit={() => setView('home')} />} />
      <Route path="/ajustes" element={<SettingsView {...{ dark, setDark, accent, setAccent, name, setName, toast }} auth={auth} cloud={cloud} pets={pets} setPets={setPets} autoLand={autoLand} setAutoLand={setAutoLand} wxAlerts={wxAlerts} setWxAlerts={setWxAlerts} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );

  return (
    <div className="h-dvh flex overflow-hidden">
      {offline && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[60] px-3 py-1.5 rounded-full text-xs glass" role="status">
          Sin conexión · modo offline{cloud.pending ? ` · ${cloud.pending} por subir` : ''}
        </div>
      )}
      <ErrorBoundary label="menú"><Sidebar {...{ view, setView, menu, setMenu }} petsOn={pets.on} onTogglePets={() => setPets({ ...pets, on: !pets.on })}
        mini={{ music: player.track && musicMin ? { title: player.track.title, playing: player.playing } : null,
          radio: radio.current && radioMin ? { title: radio.current.name, playing: radio.playing } : null,
          onMusic: () => setMusicMin(false), onRadio: () => setRadioMin(false) }} /></ErrorBoundary>
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className={`lg:hidden flex items-center justify-between px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] ${immersive ? 'absolute top-0 inset-x-0 z-30 pointer-events-none' : ''}`}>
          <span className={`flex items-center gap-1 ${immersive ? 'pointer-events-auto' : ''}`}>
            <button className={`ico-btn ${immersive ? 'immersive-btn' : ''}`} onClick={() => setMenu(true)} aria-label="Abrir menú"><Menu size={22} /></button>
            {subScreen && <button className={`ico-btn ${immersive ? 'immersive-btn' : ''}`} onClick={() => goBack(backFallback)} aria-label="Volver"><ArrowLeft size={22} /></button>}
          </span>
          {!immersive && <span className="text-xs tracking-[0.2em] uppercase" style={{ color: 'var(--m)' }}>{now.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }).replace('.', '')}</span>}
          {!immersive && <span className="flex items-center">
            {player.track && musicMin && (
              <button className="ico-btn relative" onClick={() => setMusicMin(false)}
                aria-label={`Mostrar música: ${player.track.title}`} title={player.track.title}
                style={{ color: 'var(--a)' }}>
                <Music size={20} />
                {player.playing && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--a)' }} />}
              </button>
            )}
            {radio.current && radioMin && (
              <button className="ico-btn relative" onClick={() => setRadioMin(false)}
                aria-label={`Mostrar radio: ${radio.current.name}`} title={radio.current.name}
                style={{ color: '#f59e0b' }}>
                <Radio size={20} />
                {radio.playing && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
              </button>
            )}
            <button className="ico-btn" onClick={() => setPets({ ...pets, on: !pets.on })} aria-pressed={pets.on} aria-label={pets.on ? 'Ocultar mascotas' : 'Mostrar mascotas'} style={{ color: pets.on ? 'var(--a)' : undefined }}><PawPrint size={20} /></button>
            {fsBtn && (
              <button className="ico-btn" onClick={toggleFs} aria-label={fs ? 'Salir de pantalla completa' : 'Pantalla completa'} title={fs ? 'Salir de pantalla completa' : 'Pantalla completa'}>
                {fs ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
              </button>
            )}
          </span>}
        </header>
        <main ref={mainRef} className={`flex-1 overflow-y-auto ${view === 'chat' ? 'px-2 lg:px-6 py-2 lg:py-6' : 'px-5 lg:px-10 py-4 lg:py-10'} ${player.track && radio.current ? 'pb-72' : player.track || radio.current ? 'pb-36' : 'pb-24 lg:pb-10'}`}>
          <ErrorBoundary label="contenido" key={view}>
            <Suspense fallback={<ViewFallback />}>
              <div className={`${view === 'chat' ? 'max-w-none' : 'max-w-3xl lg:max-w-5xl'} mx-auto fin space-y-4`} key={view}>
                {subScreen && <div className="hidden lg:block"><button className="ico-btn !w-auto gap-2 px-3 text-sm" onClick={() => goBack(backFallback)} aria-label="Volver"><ArrowLeft size={18} /> Volver</button></div>}
                {viewsEl}
              </div>
            </Suspense>
          </ErrorBoundary>
        </main>
        <ErrorBoundary label="reproductor">
          <PlayerBar p={player} toast={toast} onOpenFull={() => setFull(true)} min={musicMin} onMinChange={setMusicMin} />
          <RadioPlayerBar r={radio} p={player} toast={toast} onOpenFull={() => setRadioFull(true)} min={radioMin} onMinChange={setRadioMin} />
        </ErrorBoundary>
      </div>
      <ErrorBoundary label="sonando">
        <Suspense fallback={null}>
          {full && player.track && <FullPlayer p={player} toast={toast} theme={playerTheme} setTheme={setPlayerTheme} onClose={closeFull} />}
          {radioFull && radio.current && (
            <RadioFullPlayer r={radio} p={player} toast={toast} dark={dark} onClose={() => setRadioFull(false)} />
          )}
          {player.blockedOpen && player.blocked && (
            <BlockedSheet p={player} toast={toast} onClose={player.closeBlocked} />
          )}
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary label="avisos">
        <YTEmbed apiRef={player.ytRef} onState={player.onYTState} onError={player.onYTError} />
      <Toaster position="top-center" offset={{ top: 12 }} theme={dark ? 'dark' : 'light'}
        options={dark
          ? { fill: '#171717', styles: { title: 'text-white!', description: 'text-white/75!', badge: 'bg-white/10!' } }
          : { fill: '#FFFFFF', styles: { title: 'text-neutral-900!', description: 'text-neutral-500!' } }} />
      </ErrorBoundary>
      <ErrorBoundary label="mascotas">
        <PetLayer cfg={pets} weather={weather} playing={player.playing || radio.playing}
          mediaTitle={player.playing ? player.track?.title : radio.current?.name}
          mediaKey={player.playing ? `m${player.track?.id}` : `r${radio.current?.id ?? radio.current?.name}`}
          idle={idle} hour={now.getHours()} name={name} pendingCount={pendingCount} />
      </ErrorBoundary>
      {!name && !skipName && <NameModal onSave={setName} onSkip={() => setSkipName(true)} />}
    </div>
  );
}
