import { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Search, AlertTriangle, BadgeCheck, Check, Loader2, Play, Plus, Pencil,
  Trash2, X, ListMusic, History, Sparkles, Disc3, Shuffle, LayoutGrid,
  TrendingUp, Heart, ChevronLeft, Radio, Pause, User, Library, MessageCircle,
  FolderOpen, HardDrive, Trophy, Users, Download, Dumbbell, Wind, BookOpen, PartyPopper, Car, ArrowUpDown, MoreVertical, ImageIcon, RefreshCw,
  Radar, FolderSearch, RotateCw,
} from 'lucide-react';
import Cover from '../components/Cover';
import TrackRow from '../components/TrackRow';
import TrackMenu from '../components/TrackMenu';
import PlaylistHero from '../components/PlaylistHero';
import RoomIcon from '../components/RoomIcon';
import useArtColors from '../hooks/useArtColors';
import { fmtTime } from '../lib/format';
import usePlaylists from '../hooks/usePlaylists';
import useStore from '../hooks/useStore';
import { searchYouTube, rankCandidates, filterPublic, resolveOfficial, getSuggestions, prewarmYouTube } from '../services/youtube';
import { searchTracks as searchAudius, trendingTracks as trendingAudius } from '../services/audius';
import { topSongs, newMusic, CHART_COUNTRIES } from '../services/charts';
import { getCategoryPack } from '../services/artist';
import { searchCatalog, chartTracks, chartAlbums, albumsOfArtists, newReleases, artistPath, albumPath } from '../services/catalog';
import { Section as UISection, SectionTitle, Shelf, SquareCard, BackBar, SongRow, ImmersivePage, ActionRow, GlassBackdrop } from './music/ui';
import LibraryPage from './music/LibraryPage';
import { FAV_ART, FAV_COLORS, playlistArt } from '../lib/vectorArt';
import { PlaylistCard } from './music/RoomCards';
import MusicHome from './music/MusicHome';
import SearchResults from './music/SearchResults';
import SearchPage, { SearchBar } from './music/SearchOverlay';
import { markPending, setPageContext } from '../lib/playContext';
import ArtistPage from './music/ArtistPage';
import AlbumPage from './music/AlbumPage';
import { CATEGORIES, RANDOM_POOL } from './music/data';
import { slug, isNow } from './music/helpers';
import { notifyJob } from '../lib/notify';
import { DL_TOOLS, videoUrlOf } from '../lib/dltools';
import { loadRoomPlaylists, loadRooms, loadProfileCloud } from '../services/social';
import { enrichOnlineCovers } from '../services/covers';

const compact = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n || 0));


function Meta({ t }) {
  const parts = [
    t.duration ? fmtTime(t.duration) : '',
    t.views ? `${compact(t.views)} vistas` : '',
    t.official ? 'Oficial' : t.source === 'YouTube' ? 'YouTube' : t.source || '',
    t.full === false ? 'vista previa 30s' : 'completa',
  ].filter(Boolean);
  if (!parts.length) return null;
  return (
    <p className="text-[11px] pl-[3.75rem] leading-relaxed break-words" style={{ color: 'var(--m)' }}>
      {t.official && <BadgeCheck size={11} className="inline mr-1 -mt-0.5" style={{ color: 'var(--a)' }} />}
      {parts.join(' · ')}
    </p>
  );
}

/** Selector de fuente: texto Local | YouTube | Audius; la activa toma el color de la canción. */
function FuenteTabs({ fuente, setFuente, art }) {
  const colors = useArtColors(art);
  const accent = colors?.accent || 'var(--a)';
  const tabs = [['local', 'Local'], ['youtube', 'YouTube'], ['audius', 'Audius']];
  return (
    <div className="flex items-center justify-center gap-5 sm:gap-7 select-none" role="group" aria-label="Fuente de música">
      {tabs.map(([id, label]) => {
        const on = fuente === id;
        return (
          <button key={id} onClick={() => setFuente(id)} aria-pressed={on}
            className="relative text-sm font-semibold tracking-wide transition-all pb-1.5 active:scale-95"
            style={on
              ? { color: accent, textShadow: `0 0 14px ${accent}` }
              : { color: 'var(--m)' }}>
            {label}
            {on && <span className="absolute left-1/2 -translate-x-1/2 -bottom-0.5 w-1.5 h-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />}
          </button>
        );
      })}
    </div>
  );
}

export default function MusicView({ p, toast, local, auth, onOpenRoom }) {
  // ---- Rutas de Música (React Router) ----
  //  /musica                      inicio
  //  /musica/buscar               pantalla de búsqueda
  //  /musica/resultados?q=…       resultados estilo Spotify
  //  /musica/artista/dz-123       perfil de artista · /musica/album/dz-77 álbum
  //  /musica/categoria/rock       categoría · /musica/playlist/:id · /musica/sala/:roomId
  const nav = useNavigate();
  const loc = useLocation();
  const parts = loc.pathname.replace(/^\/musica\/?/, '').split('/').filter(Boolean);
  const route = parts[0] || 'home';
  const routeParam = decodeURIComponent(parts[1] || '');
  const qParam = new URLSearchParams(loc.search).get('q') || '';
  const mode = ({ resultados: 'results', artista: 'artist', album: 'album', categoria: 'category', playlist: 'playlist', sala: 'roompl', biblioteca: 'library' })[route] || 'home';
  const searchOpen = route === 'buscar';
  const goHome = () => nav('/musica');
  // Volver: atrás real del historial; si se abrió directo la URL, al inicio de Música.
  const goBack = () => { if (window.history.state && window.history.state.idx > 0) nav(-1); else nav('/musica', { replace: true }); };
  const [q, setQ] = useState(qParam);
  const searchInputRef = useRef(null);
  const [barFocus, setBarFocus] = useState(false);
  const blurTimer = useRef(null);
  useEffect(() => {
    if (!searchOpen) return undefined;
    const t = setTimeout(() => { try { searchInputRef.current?.focus(); } catch {} }, 80);
    return () => clearTimeout(t);
  }, [searchOpen]);
  const selRoom = route === 'sala' ? routeParam : null; // roomId de playlist de comunidad abierta
  // Menú único (⋮ o long-press) para cualquier canción: { t, list, asRadio, kind }
  // kind: 'local' | 'yt' | 'audius' | 'pl' | 'fav' | 'chart' | 'room'
  const [menuTrack, setMenuTrack] = useState(null);
  const openMenu = (t, list, opts = {}) => setMenuTrack({ t, list: list || [], ...opts });
  const [pendingDel, setPendingDel] = useState(null); // id de carpeta esperando elección de borrado
  const [artBusy, setArtBusy] = useState(null); // {done,total} buscando carátulas
  /** Busca carátulas reales con wifi para la biblioteca local. */
  const buscarCaratulas = async () => {
    if (artBusy || local?.importing) return;
    if (!navigator.onLine) { toast('Necesitas wifi para buscar carátulas', AlertTriangle); return; }
    setArtBusy({ done: 0, total: 0 });
    try {
      const r = await local?.enrichAllArt?.((p) => setArtBusy({ done: p.done, total: p.total }));
      setArtBusy(null);
      if (r?.offline) { toast('Necesitas wifi para buscar carátulas', AlertTriangle); return; }
      if (!r?.total) { toast('Todo con carátula real', Check); return; }
      toast(r.done ? `Carátulas listas: ${r.done} de ${r.total}` : 'Sin carátulas nuevas', r.done ? Check : AlertTriangle);
    } catch {
      setArtBusy(null);
      toast('No se pudo completar', AlertTriangle);
    }
  };
  useEffect(() => { if (route === 'home') setQ(''); }, [route]); // eslint-disable-line react-hooks/exhaustive-deps
  const [fuenteRaw, setFuenteRaw] = useStore('h_fuente', 'youtube'); // local | youtube | audius
  // Migra valores viejos y guarda la posición actual (persiste en este dispositivo)
  const fuente = fuenteRaw === 'audius' || fuenteRaw === 'local' || fuenteRaw === 'youtube' ? fuenteRaw : 'youtube';
  const setFuente = (v) => setFuenteRaw(v);
  const lampOn = fuente !== 'local';
  const [autoArt, setAutoArt] = useStore('h_auto_art', true); // auto-actualizar carátulas
  // Auto: cada 5 min en Local con wifi, busca carátulas a lo nuevo sin arte real.
  // Nunca junto a un escaneo (comparten red + IndexedDB y se traba todo).
  useEffect(() => {
    if (lampOn || !autoArt) return undefined;
    let dead = false;
    let iv = null;
    const run = () => {
      if (dead || !navigator.onLine || artBusy || local?.importing) return;
      local?.enrichAllArt?.().catch(() => {});
    };
    const t = setTimeout(run, 15000);
    iv = setInterval(run, 5 * 60 * 1000);
    return () => { dead = true; clearTimeout(t); if (iv) clearInterval(iv); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lampOn, autoArt, local?.importing]);
  const [results, setResults] = useState([]); // videos/canciones de YouTube o Audius para la búsqueda
  const [resultsLabel, setResultsLabel] = useState('');
  const [sCat, setSCat] = useState({ artists: [], albums: [], tracks: [] }); // catálogo real (artistas con foto, álbumes, canciones)
  const [sCatBusy, setSCatBusy] = useState(false);
  const [videosBusy, setVideosBusy] = useState(false);
  const [searchedFor, setSearchedFor] = useState(''); // término al que corresponden los resultados cargados
  // Categoría abierta: sale de la URL (/musica/categoria/rock)
  const selCat = useMemo(() => {
    if (route !== 'categoria') return null;
    const hit = CATEGORIES.find(([n]) => slug(n) === routeParam);
    return hit ? { name: hit[0], query: hit[1], bg: hit[2], term: hit[3] || hit[1] } : null;
  }, [route, routeParam]);
  const [catSongs, setCatSongs] = useState([]);
  const [catAlbums, setCatAlbums] = useState([]);
  const [catVideos, setCatVideos] = useState([]);
  const [catLoading, setCatLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cc, setCc] = useState('CO');
  const [charts, setCharts] = useState([]);
  const [releases, setReleases] = useState([]);
  const [randomSongs, setRandomSongs] = useState([]);
  const [randomLoading, setRandomLoading] = useState(false);
  const [randomKey, setRandomKey] = useState(0);
  const [recs, setRecs] = useState([]);
  const [recAlbums, setRecAlbums] = useState([]);
  const [audTrend, setAudTrend] = useState([]); // tendencias Audius (solo se cargan en esa fuente)
  const [plStats, setPlStats] = useStore('h_pl_stats', {}); // { plId: reproducciones }
  const [popTracks, setPopTracks] = useState([]); // chart global real (Deezer)
  const [popAlbums, setPopAlbums] = useState([]);
  const [chartsLoading, setChartsLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const selectedPl = route === 'playlist' ? routeParam : null;
  const [createOpen, setCreateOpen] = useState(false); // hoja "Crear playlist"
  const [addTarget, setAddTarget] = useState(null);
  const [selPls, setSelPls] = useState([]); // multi-seleccion en la hoja de agregar
  useEffect(() => { setSelPls([]); }, [addTarget]);
  const [newPlName, setNewPlName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [sugs, setSugs] = useState([]); // predicciones (remotas + historial)
  const [sugOpen, setSugOpen] = useState(false);
  const sugTimer = useRef(null);
  const fileRef = useRef(null); // input de carpeta local
  const [localSort, setLocalSort] = useStore('h_local_sort', 'recent'); // recent | title | artist | duration
  const [localTab, setLocalTab] = useStore('h_local_tab', 'songs'); // songs | playlists | covers | add
  const [autoRescan, setAutoRescan] = useStore('h_auto_rescan', true); // actualiza carpetas al entrar (activable)
  const [localShown, setLocalShown] = useState(48);
  const autoRescanDone = useRef(false);
  // Auto-rescan al entrar: en segundo plano (sin barra de progreso ni racha de
  // toasts), solo carpetas con permiso ya concedido (sin pedir nada).
  // Espera a que la app se asiente para no competir con la hidratación.
  useEffect(() => {
    if (autoRescanDone.current || !autoRescan || !local?.ready) return;
    const dirs = local?.dirs || [];
    if (!dirs.length) return;
    autoRescanDone.current = true;
    const t = setTimeout(() => {
      (async () => {
        try {
          if (local?.importing) return;
          let added = 0;
          for (const d of dirs) {
            const h = d.handle;
            if (!h?.queryPermission) continue;
            let granted = false;
            try { granted = (await h.queryPermission({ mode: 'read' }).catch(() => 'prompt')) === 'granted'; } catch { granted = false; }
            if (!granted) continue;
            try {
              const r = await local?.scanDirectory?.(h, null, { silent: true, background: true }).catch(() => null);
              if (r?.busy) break;
              added += r?.added || 0;
            } catch { /* sigue con la siguiente */ }
          }
          if (added > 0) toast?.(`Actualizado: ${added} nueva${added > 1 ? 's' : ''}`, Check);
        } catch { /* silencioso */ }
      })();
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRescan, local?.ready]);
  const [roomPls, setRoomPls] = useState([]);
  const [peers, setPeers] = useState({}); // roomId -> { name, handle, avatar } del otro en DMs
  const myId = auth?.user?.id || null;
  const myAvatar = auth?.user?.user_metadata?.avatar_url || '';
  useEffect(() => {
    let dead = false;
    (async () => {
      const list = await loadRoomPlaylists(myId).catch(() => []);
      if (dead) return;
      setRoomPls(list);
      // Dúos: foto y nombre del otro (perfil nube = espejo de su Google)
      if (myId) {
        const rooms = await loadRooms().catch(() => []);
        if (dead) return;
        const out = {};
        await Promise.all(list.filter((x) => x.kind === 'dm').map(async (x) => {
          const r = rooms.find((r) => r.id === x.roomId);
          const other = r ? (r.member_a === myId ? r.member_b : r.member_a) : null;
          if (!other) return;
          const prof = await loadProfileCloud(other).catch(() => null);
          if (prof && !dead) out[x.roomId] = { name: prof.name || prof.handle || '', handle: prof.handle || '', avatar: prof.avatar || '' };
        }));
        if (!dead) setPeers(out);
      } else if (!dead) setPeers({});
    })();
    return () => { dead = true; };
  }, [myId]);
  const [searchHist, setSearchHist] = useStore('h_search_hist', []);
  const pls = usePlaylists(toast);
  // Lo último que oíste (sin repetir) para el inicio de la búsqueda
  const recentTracks = useMemo(() => {
    const seen = new Set(); const out = [];
    for (const t of p.history || []) { if (!t || seen.has(t.id)) continue; seen.add(t.id); out.push(t); if (out.length >= 24) break; }
    return out;
  }, [p.history]);

  // Predicciones al escribir: en modo local filtra tus archivos;
  // en YouTube, remotas primero e historial como repliegue.
  const sugTok = useRef(0);
  /** Sugerencias que no necesitan red (tus búsquedas y lo que has escuchado): salen al instante. */
  const localSugs = (v) => {
    const low = v.trim().toLowerCase();
    const seen = new Set();
    const out = [];
    const add = (label, from) => { const k = label.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push({ label, from }); } };
    for (const past of searchHist || []) { if (past.toLowerCase().includes(low)) add(past, 'search'); if (out.length >= 8) return out; }
    for (const h of p.history || []) {
      for (const cand of [h.title, h.artist]) { if (cand && cand.toLowerCase().includes(low)) add(cand, 'hist'); }
      if (out.length >= 8) break;
    }
    return out.slice(0, 8);
  };
  const onTypeQ = (v) => {
    setQ(v);
    clearTimeout(sugTimer.current);
    const tok = ++sugTok.current;
    if (v.trim().length < 2) { setSugs([]); setSugOpen(false); return; }
    if (!lampOn) {
      const lowL = v.trim().toLowerCase();
      const seen = new Set();
      const out = [];
      for (const t of local?.tracks || []) {
        for (const cand of [t.title, t.artist]) {
          if (cand && cand.toLowerCase().includes(lowL)) {
            const k = cand.toLowerCase();
            if (!seen.has(k)) { seen.add(k); out.push({ label: cand, from: 'hist' }); }
          }
        }
        if (out.length >= 8) break;
      }
      setSugs(out);
      setSugOpen(out.length > 0);
      return;
    }
    // 1) Al instante: tus búsquedas pasadas y lo que has escuchado.
    const instant = localSugs(v);
    setSugs(instant); setSugOpen(instant.length > 0);
    // 2) En YouTube, las predicciones de la web llegan enseguida y se mezclan (primero las de la web).
    if (fuente !== 'youtube') return;
    sugTimer.current = setTimeout(async () => {
      let web = [];
      try { web = await getSuggestions(v.trim()); } catch { /* solo lo local */ }
      if (tok !== sugTok.current || !web.length) return;
      const seen = new Set();
      const out = [];
      for (const w of web) { const k = w.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push({ label: w, from: 'web' }); } }
      for (const l of instant) { const k = l.label.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(l); } }
      setSugs(out.slice(0, 8)); setSugOpen(true);
    }, 180);
  };
  const pickSug = (label) => {
    setSugs([]); setSugOpen(false);
    setQ(label);
    if (lampOn) goSearch(label); // en local, el filtro es en vivo
  };

  // Carga inicial: top + lanzamientos + aleatorias (en paralelo, cada uno con repliegue)
  const loadRandom = async () => {
    setRandomLoading(true);
    try {
      const pool = [...RANDOM_POOL].sort(() => Math.random() - 0.5).slice(0, 3);
      const out = [];
      await Promise.all(pool.map(async (qry) => {
        try {
          const items = await searchYouTube(qry, 5);
          const ranked = rankCandidates(items, { title: qry });
          const pub = await filterPublic(ranked);
          out.push(...pub.filter((x) => (x.duration || 0) < 600).slice(0, 4));
        } catch { /* salta esta query */ }
      }));
      const seen = new Set();
      const final = out.filter((x) => !seen.has(x.id) && seen.add(x.id)).sort(() => Math.random() - 0.5).slice(0, 10);
      setRandomSongs(final);
      enrichOnlineCovers(final, setRandomSongs).catch(() => {});
    } catch { /* sin aleatorias por ahora */ }
    setRandomLoading(false);
  };
  useEffect(() => {
    prewarmYouTube(); // instancia Piped en fondo desde el arranque (primera canción más rápida)
    let dead = false;
    topSongs(cc, 25).then((l) => { if (!dead) setCharts(l); }).catch(() => {}).finally(() => { if (!dead) setChartsLoading(false); });
    newMusic('CO', 10).then(setReleases).catch(() => {});
    chartTracks(24).then((l) => { if (!dead) setPopTracks(l); });
    chartAlbums(16).then((l) => { if (!dead) setPopAlbums(l); });
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Descubrimiento rápido: solo en el inicio, y 1.5 s después de entrar (en 4G competía con
  // la primera canción y la dejaba "cargando"). La música primero, el resto después.
  useEffect(() => {
    if (route !== 'home' || randomSongs.length || randomLoading) return undefined;
    const t = setTimeout(() => loadRandom(), 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route]);
  const changeCountry = (v) => {
    setCc(v); setChartsLoading(true);
    topSongs(v, 25).then(setCharts).catch(() => toast('No se cargó el top', AlertTriangle)).finally(() => setChartsLoading(false));
  };
  useEffect(() => { if (randomKey > 0) loadRandom(); }, [randomKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Tendencias Audius: solo se piden al pararse en esa fuente (con cache de 5 min).
  useEffect(() => {
    if (fuente !== 'audius' || audTrend.length) return undefined;
    let dead = false;
    trendingAudius({ limit: 12, time: 'week' }).then((l) => { if (!dead) setAudTrend(l || []); }).catch(() => {});
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuente]);

  // Recomendaciones desde el historial (top artistas escuchados)
  // + álbumes recomendados del artista más escuchado.
  useEffect(() => {
    let dead = false;
    (async () => {
      const count = {};
      for (const h of p.history || []) {
        const a = String(h.artist || '').split(',')[0].trim();
        if (a && a !== 'YouTube' && a !== 'Desconocido') count[a] = (count[a] || 0) + 1;
      }
      const tops = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => a);
      const queries = tops.length ? tops : (charts.slice(0, 3).map((c) => c.artist));
      const out = [];
      await Promise.all(queries.map(async (a) => {
        try {
          const items = await searchYouTube(`${a} greatest hits`, 4);
          const ranked = rankCandidates(items, { artist: a });
          const pub = await filterPublic(ranked);
          if (!dead) out.push(...pub.filter((x) => (x.duration || 0) < 600).slice(0, 3).map((x) => ({ ...x, why: a })));
        } catch { /* salta este artista */ }
      }));
      if (!dead) { const seen = new Set(); setRecs(out.filter((x) => !seen.has(x.id) && seen.add(x.id)).slice(0, 9)); }
    })();
    return () => { dead = true; };
  }, [charts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Álbumes que te gustan: los más nuevos de tus artistas más escuchados (o del top si aún no hay historial).
  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const count = {};
        for (const h of p.history || []) {
          const a = String(h.artist || '').split(',')[0].trim();
          if (a && a !== 'YouTube' && a !== 'Desconocido') count[a] = (count[a] || 0) + 1;
        }
        let names = Object.entries(count).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a]) => a);
        if (!names.length) names = charts.slice(0, 2).map((c) => String(c.artist || '').split(',')[0].trim()).filter(Boolean);
        if (!names.length) return;
        const list = await albumsOfArtists(names, 3);
        if (!dead) setRecAlbums(list.slice(0, 8));
      } catch { /* sin álbumes por ahora */ }
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charts, (p.history || []).length]);

  const searchTok = useRef(0);
  /** Navega a los resultados (la URL es la fuente de verdad: /musica/resultados?q=…). */
  const goSearch = (term) => {
    const t = String(term || '').trim();
    if (!t) return;
    setSugs([]); setSugOpen(false);
    nav(`/musica/resultados?q=${encodeURIComponent(t)}`, { replace: route === 'buscar' });
  };
  /** Carga lo que coincide: catálogo real (artistas con foto, álbumes, canciones) + videos. Se dispara desde la URL. */
  const runSearch = async (term) => {
    const tt = String(term || '').trim();
    if (!tt) return;
    const tok = ++searchTok.current;
    const live = () => tok === searchTok.current;
    setSugs([]); setSugOpen(false);
    // Guarda la búsqueda (máx 12, sin duplicados, la reciente primero)
    const clean = tt.slice(0, 60);
    setSearchHist((h) => [clean, ...(h || []).filter((x) => x.toLowerCase() !== clean.toLowerCase())].slice(0, 12));
    setLoading(true); setSCatBusy(true); setVideosBusy(true);
    setSearchedFor(tt); setResultsLabel(tt);
    setResults([]); setSCat({ artists: [], albums: [], tracks: [] });
    // El catálogo nunca frena los videos (y al revés): cada uno llega cuando esté.
    searchCatalog(tt).then((c) => { if (live()) setSCat(c); }).catch(() => {}).finally(() => { if (live()) setSCatBusy(false); });
    try {
      if (fuente === 'audius') {
        // Audius: canciones completas de catálogo independiente. Suenan directo.
        const tracks = await searchAudius(tt, { limit: 20 }).catch(() => []);
        if (!live()) return;
        setResults(tracks || []);
        if (!(tracks || []).length) toast('Audius no trajo nada: prueba con indie o electrónica', AlertTriangle);
      } else {
        const items = await searchYouTube(tt, 15);
        const ranked = rankCandidates(items, { title: tt, artist: tt });
        if (!live()) return;
        // Se muestran YA (antes esperaban hasta 5 s a verificar cada video con oEmbed).
        const bad = new Set();
        const upd = (l) => { if (live()) setResults(l.filter((t) => !bad.has(t.id))); };
        setResults(ranked);
        setVideosBusy(false); setLoading(false);
        enrichOnlineCovers(ranked, upd).catch(() => {}); // carátulas originales en segundo plano
        // Verificación en segundo plano: si algún video no existe o es privado, simplemente desaparece.
        filterPublic(ranked).then((pub) => {
          if (!live() || !pub.length) return;
          const ok = new Set(pub.map((t) => t.id));
          ranked.forEach((t) => { if (!ok.has(t.id)) bad.add(t.id); });
          if (bad.size) setResults((cur) => cur.filter((t) => !bad.has(t.id)));
        }).catch(() => {});
      }
    } catch {
      if (live()) toast(fuente === 'audius' ? 'Audius no responde, intenta de nuevo' : 'YouTube no responde, intenta de nuevo', AlertTriangle);
    }
    if (live()) { setVideosBusy(false); setLoading(false); }
  };
  // La URL manda: al entrar a /musica/resultados?q=… (o recargar / volver) se cargan los resultados.
  useEffect(() => {
    if (route !== 'resultados' || !qParam.trim()) return;
    setQ(qParam);
    if (qParam.trim() !== searchedFor || !(results.length || sCat.tracks.length || sCat.artists.length)) runSearch(qParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, qParam, fuente]);
  const submit = (e) => { e.preventDefault(); if (lampOn) goSearch(q); };

  // Herramienta web para bajar MP3 (ver ../lib/dltools): copia el link y abre
  // la herramienta elegida en Ajustes; el MP3 va a la carpeta escaneada.
  const [dlTool] = useStore('h_dl_tool', 'savefrom');
  /** Descargar MP3 vía web: copia el link y abre la herramienta.
   *  El usuario baja el MP3 en su carpeta escaneada y al entrar aparece en Local. */
  const descargarWeb = async (t) => {
    const url = videoUrlOf(t);
    if (!url) { toast('Este tema no tiene link de YouTube para descargar', AlertTriangle); return; }
    let copied = false;
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch {
      try {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand('copy');
        ta.remove();
      } catch { copied = false; }
    }
    const tool = DL_TOOLS[dlTool] || DL_TOOLS.savefrom;
    try { window.open(tool.url, '_blank', 'noopener'); } catch { /* popup bloqueado */ }
    toast(copied
      ? `Link copiado: pégalo en ${tool.name}, baja el MP3 a tu carpeta escaneada`
      : `Copia este link en ${tool.name}: ${url}`, copied ? Check : AlertTriangle);
    if (!copied) {
      try { window.prompt?.(`Copia el link y pégalo en ${tool.name}:`, url); } catch {}
    }
  };
  /** Router de descarga: audio directo (Audius) se baja tal cual;
   *  YouTube va a la herramienta web (el gemelo nunca acertaba y se quitó). */
  const descargarSong = (t) => {
    if (!t) return;
    if (t.src) guardarOffline(t);
    else descargarWeb(t);
  };

  // Descarga directa para oír sin wifi: guarda el audio en tu biblioteca Local.
  // Solo audios directos (Audius/Local). YouTube usa descargarWeb (herramienta externa).
  const [dlId, setDlId] = useState(null);
  const guardarOffline = async (t) => {
    if (!t || dlId) return;
    const src = t.src || '';
    const art = t.art || '';
    if (!src) {
      // Sin audio directo (tema YouTube): va por herramienta web.
      descargarWeb(t);
      return;
    }
    setDlId(t.id);
    try {
      toast('Descargando…');
      let blob = null;
      try {
        const r = await fetch(src);
        if (!r.ok) throw new Error(`http${r.status}`);
        blob = await r.blob();
      } catch (e) {
        const msg = String(e?.message || '');
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || e?.name === 'TypeError') {
          toast('El servidor bloqueó la descarga directa: suena con internet, pero no se puede guardar', AlertTriangle);
        } else {
          toast('No se pudo descargar (red)', AlertTriangle);
        }
        return;
      }
      if (!blob?.size) { toast('La descarga llegó vacía, intenta de nuevo', AlertTriangle); return; }
      const mt = blob.type || 'audio/mpeg';
      const ext = mt.includes('flac') ? 'flac' : mt.includes('wav') ? 'wav' : mt.includes('ogg') ? 'ogg' : mt.includes('mp4') || mt.includes('m4a') ? 'm4a' : 'mp3';
      const file = new File([blob], `${t.artist || 'Desconocido'} - ${t.title || 'Tema'}.${ext}`, { type: mt });
      const res = await local?.importFiles([file]).catch(() => null);
      if (res?.added) {
        toast('Guardada en Local: ya suena sin wifi');
        setFuente('local');
        goHome();
      } else if ((res?.skipped || 0) > 0 && !res?.added) {
        toast('Esa ya estaba en Local', AlertTriangle);
        setFuente('local');
        goHome();
      } else {
        toast('No se pudo guardar en Local', AlertTriangle);
      }
    } catch {
      toast('No se pudo descargar', AlertTriangle);
    } finally {
      setDlId(null);
    }
  };

  /** Descarga una entrada de chart/lanzamiento: la resuelve a video y abre la herramienta web. */
  const downloadEntry = async (entry) => {
    if (!entry || dlId || resolvingId) return;
    setResolvingId(entry.id);
    try {
      const t = await resolveOfficial(entry.artist, entry.title);
      if (!t) { toast('No se encontró versión descargable de ese tema', AlertTriangle); return; }
      setResolvingId(null);
      await descargarWeb(t);
    } catch {
      toast('No se pudo descargar ese tema', AlertTriangle);
    } finally {
      setResolvingId(null);
    }
  };

  /** Resuelve metadata (chart/lanzamiento/álbum) a video oficial y suena en modo radio. */
  const playEntry = async (entry) => {
    if (resolvingId) return;
    setResolvingId(entry.id);
    try {
      const t = await resolveOfficial(entry.artist, entry.title);
      if (!t) { toast('No se encontró versión reproducible', AlertTriangle); return; }
      // La carátula original del catálogo va por encima de la miniatura de YouTube (revertible en el reproductor).
      const orig = entry.art && !/i\.ytimg\.com/.test(entry.art) ? entry.art : '';
      const tt = orig ? { ...t, art: orig, artOriginal: true, ytArt: t.art } : t;
      if (p.playRadio) p.playRadio(tt);
      else p.play(tt);
      if (!t.official) toast('Versión no oficial (la oficial no está disponible)');
    } catch {
      toast('No se pudo abrir ese tema', AlertTriangle);
    } finally {
      setResolvingId(null);
    }
  };

  /** Corazón de una canción del top (aún sin versión reproducible): la resuelve y la guarda en Me gusta. */
  const favEntry = async (entry) => {
    const have = (p.favs || []).find((f) => f.title === entry.title && String(f.artist).split(',')[0] === String(entry.artist).split(',')[0]);
    if (have) { p.toggleFav(have); return; }
    try {
      const t = await resolveOfficial(entry.artist, entry.title);
      if (!t) { toast('No se encontró versión reproducible', AlertTriangle); return; }
      p.toggleFav(entry.art ? { ...t, art: entry.art, artOriginal: true, ytArt: t.art } : t);
    } catch { toast('No se pudo guardar ese tema', AlertTriangle); }
  };

  /** Reproduce el álbum completo en orden: aviso cargando → listo/fallo. */
  const playAlbum = async (album, tracks) => {
    const list = tracks || [];
    if (!list.length) return toast('Ese álbum no trajo canciones', AlertTriangle);
    if (resolvingId) return;
    setResolvingId(album.id);
    try {
      const job = Promise.all(
        list.map((s) => resolveOfficial(s.artist || album.artist, s.title, 6).catch(() => null)),
      ).then((r) => {
        const ok = r.filter(Boolean);
        if (!ok.length) throw new Error('empty');
        return ok;
      });
      const resolved = await notifyJob(job, {
        loading: { title: 'Buscando el álbum…', description: `Resolviendo ${list.length} temas` },
        ok: (ok) => (ok.length < list.length
          ? { title: 'Álbum casi listo', description: `${ok.length} de ${list.length} tenían versión` }
          : { title: 'Álbum listo', description: `${ok.length} temas en cola` }),
        fail: { title: 'Ese álbum no se dejó', description: 'Prueba con otro' },
      });
      p.play(resolved[0], resolved);
    } catch {
      /* el aviso de fallo ya lo mostró sileo */
    } finally {
      setResolvingId(null);
    }
  };

  /** Radio a partir de una canción del catálogo: la resuelve a YouTube y sigue la radio. */
  const playRadioOf = (entry) => playEntry(entry);

  const openCategory = (name) => nav(`/musica/categoria/${slug(name)}`);
  /** Carga la categoría de la URL: canciones + álbumes (iTunes) + videos (YouTube). Si una falla, las otras muestran. */
  useEffect(() => {
    if (!selCat) return undefined;
    let dead = false;
    setCatSongs([]); setCatAlbums([]); setCatVideos([]); setCatLoading(true);
    (async () => {
      try {
        const [pack, vids] = await Promise.all([
          getCategoryPack(selCat.term).catch(() => ({ songs: [], albums: [] })),
          (async () => {
            try {
              const items = await searchYouTube(selCat.query, 12);
              return await filterPublic(rankCandidates(items, { title: selCat.query }));
            } catch { return []; }
          })(),
        ]);
        if (dead) return;
        setCatSongs(pack.songs || []); setCatAlbums(pack.albums || []); setCatVideos(vids || []);
        if (!(pack.songs?.length || pack.albums?.length || vids?.length)) toast('Esa categoría no trajo nada, intenta de nuevo', AlertTriangle);
      } finally { if (!dead) setCatLoading(false); }
    })();
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selCat?.name]);

  const playPlaylist = (pl) => {
    if (!pl.tracks.length) return toast('Playlist vacía, agrega temas primero', AlertTriangle);
    if (pl.id) setPlStats((s) => ({ ...s, [pl.id]: (s[pl.id] || 0) + 1 }));
    p.play(pl.tracks[0], pl.tracks);
  };

  /** Local en aleatorio: baraja lo visible y suena sin conexión. */
  const playLocalShuffle = () => {
    const pool = (localVisible.length ? localVisible : (local?.tracks || [])).slice();
    if (!pool.length) return toast('Vacío por aquí. Toca Escanear canciones', AlertTriangle);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    p.play(pool[0], pool);
    toast('Modo aleatorio');
  };

  const createPl = (e) => {
    e?.preventDefault();
    const pl = pls.create(newPlName);
    if (pl) { setNewPlName(''); setCreateOpen(false); nav(`/musica/playlist/${pl.id}`); }
  };

  const openPl = (id) => { setRenaming(false); nav(`/musica/playlist/${id}`); };
  // Me Gusta cuenta como playlist (id 'fav') con su propio detalle.
  const sel = selectedPl === 'fav'
    ? { id: 'fav', name: 'Tus Me Gusta', tracks: p.favs || [] }
    : pls.playlists.find((x) => x.id === selectedPl);
  const isFavPl = sel?.id === 'fav';
  // Portada del hero de la playlist: Favoritos lleva su imagen vectorial; las demás, la carátula o una generada.
  const plArt = sel ? (isFavPl ? FAV_ART : (sel.tracks[0]?.art || playlistArt(sel.name, sel.color))) : null;
  const plColorsRaw = useArtColors(plArt && !isFavPl && !/^data:/.test(plArt) ? plArt : null);
  const plColors = isFavPl ? FAV_COLORS : plColorsRaw;
  // Customs ordenadas por escuchas (Me Gusta va fija de primera).
  const topPls = [...pls.playlists]
    .sort((a, b) => ((plStats[b.id] || 0) - (plStats[a.id] || 0)) || (b.tracks.length - a.tracks.length))
    .slice(0, 5);

  // --- modo local: filtro en vivo + utilidades de carpeta ---
  const lowQ = q.trim().toLowerCase();
  const localVisible = useMemo(() => {
    const list = ((local?.tracks) || []).filter((t) =>
      !lowQ || `${t.title || ''} ${t.artist || ''}`.toLowerCase().includes(lowQ));
    if (localSort === 'title') return [...list].sort((a, b) => String(a.title).localeCompare(String(b.title), 'es'));
    if (localSort === 'artist') return [...list].sort((a, b) => String(a.artist).localeCompare(String(b.artist), 'es') || String(a.title).localeCompare(String(b.title), 'es'));
    if (localSort === 'duration') return [...list].sort((a, b) => (Number(b.duration) || 0) - (Number(a.duration) || 0));
    // Recientes = orden de llegada al dispositivo (addedAt al importar/descargar).
    // Lo nuevo siempre de primero; desempate por título para orden estable.
    return [...list].sort((a, b) => ((Number(b.addedAt) || 0) - (Number(a.addedAt) || 0))
      || String(a.title || '').localeCompare(String(b.title || ''), 'es'));
  }, [local?.tracks, lowQ, localSort]);
  useEffect(() => { setLocalShown(48); }, [lowQ, localSort, localTab]);
  // Scroll infinito: al ver el final, muestra 48 más (sin botón).
  const moreRef = useRef(null);
  useEffect(() => {
    const el = moreRef.current;
    if (!el || mode !== 'home' || lampOn) return undefined;
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) setLocalShown((n) => (n < localVisible.length ? n + 48 : n));
    }, { rootMargin: '400px' });
    io.observe(el);
    return () => io.disconnect();
  }, [mode, lampOn, localVisible.length, localTab]);
  const fmtMB = (b) => (b || 0) >= 1048576
    ? `${(b / 1048576).toFixed(1)} MB`
    : `${Math.max(1, Math.round((b || 0) / 1024))} KB`;
  const pickFolder = () => {
    const el = fileRef.current;
    if (!el) return;
    try { el.setAttribute('webkitdirectory', ''); } catch { /* solo archivos */ }
    el.click();
  };
  // Escaneo con 1 toque: pide acceso y busca sola en subcarpetas.
  const scanning = !!local?.scan?.active || !!local?.importing;
  const scanPct = local?.scan?.total
    ? Math.round((local.scan.done / Math.max(1, local.scan.total)) * 100) : 0;
  const handleEscanear = async () => {
    if (scanning) return;
    if (!window.showDirectoryPicker) {
      // iPhone/Firefox: no hay acceso a carpeta, se usa el selector clásico.
      toast('Elige una carpeta y acepta: puedes repetir para agregar varias', Check);
      pickFolder();
      return;
    }
    toast('Elige una carpeta y acepta: se suma a tu lista (puedes agregar varias)', Check);
    await local?.requestScan?.(pickFolder);
  };
  const handleRescan = async () => {
    if (scanning) return;
    await local?.rescanSaved?.();
  };

  /** Canción que ya es un video de YouTube/Audius/Local: suena (con radio si es de YouTube). */
  const playTrack = (t, list) => (t?.source === 'YouTube' && p.playRadio ? p.playRadio(t) : p.play(t, list));

  // "Reproduciendo desde …": contexto de las pantallas que no lo publican solas.
  useEffect(() => {
    if (mode === 'artist' || mode === 'album' || mode === 'results') return;
    setPageContext(
      mode === 'category' && selCat ? { from: 'Categoría', title: selCat.name }
        : mode === 'playlist' && sel ? { from: 'Playlist', title: sel.name }
        : mode === 'roompl' ? { from: 'Playlist', title: 'Comunidad' }
        : searchOpen ? { from: 'Buscar', title: 'Búsquedas recientes' }
        : { from: 'Inicio', title: 'Para ti' });
  }, [mode, searchOpen, selCat?.name, sel?.name]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setPageContext(null), []);

  // Contexto común de las pantallas internas (resultados, artista, álbum).
  const ctx = { p, nav, playEntry, playAlbum, playRadioOf, resolvingId, onBack: goBack, toast,
    openMenu: (t, list, opts) => openMenu(t, list, opts) };
  const inHome = mode === 'home' && !searchOpen;
  // Título, fuentes y barra se quedan IGUAL (mismo lugar) en inicio, búsqueda y resultados:
  // solo cambia el contenido de abajo. Nada desaparece ni se reconstruye.
  const showHead = mode === 'home' || mode === 'results' || searchOpen;
  const onBarFocus = () => {
    clearTimeout(blurTimer.current);
    setBarFocus(true);
    if (route === 'home') nav('/musica/buscar'); // desde el inicio: abre recientes y "Explorar todo"
  };
  const onBarBlur = () => { blurTimer.current = setTimeout(() => setBarFocus(false), 120); };
  const submitBar = (e) => {
    e?.preventDefault?.();
    if (!lampOn) return;
    goSearch(q);
    try { searchInputRef.current?.blur(); } catch { /* noop */ } // baja el teclado: se ven los resultados
  };
  // Sugerencias: solo en la lista (nada flotante). En resultados, al editar el texto la lista reemplaza a los resultados.
  const editingResults = mode === 'results' && barFocus && q.trim().length >= 2 && q.trim() !== (qParam || '').trim();
  const showSugList = lampOn && (searchOpen || editingResults);
  const dropdown = null;

  return (
    <div className="space-y-4" onClickCapture={markPending}>
      {showHead && <h2 className="serif text-4xl tracking-wide mb-1">Música</h2>}

      {/* Fuente Local | YouTube | Audius: texto que toma el color de la canción */}
      {showHead && <FuenteTabs fuente={fuente} setFuente={setFuente} art={p.track?.art} />}

      {showHead && (!lampOn ? (
        inHome && (
          <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
            <div className="relative flex-1">
              <input className="inp" placeholder="Filtrar tu música local…" value={q}
                onChange={(e) => onTypeQ(e.target.value)}
                aria-label="Filtrar música local" autoComplete="off" />
            </div>
          </form>
        )
      ) : (
        <SearchBar q={q} onType={onTypeQ} onSubmit={submitBar} loading={loading && mode === 'results'}
          onFocus={onBarFocus} onBlur={onBarBlur} inputRef={searchInputRef} dropdown={dropdown} />
      ))}

      {showSugList && (
        <SearchPage
          q={q} sugs={sugs}
          onPick={pickSug}
          hist={searchHist || []}
          onPickHist={(s) => { setQ(s); goSearch(s); }}
          onDelHist={(s) => setSearchHist((h) => (h || []).filter((x) => x !== s))}
          onClearHist={() => setSearchHist([])}
          onTile={(tl) => (tl.kind === 'cat' ? openCategory(tl.query) : goSearch(tl.query))}
          tracks={recentTracks} trending={charts || []}
          onPlay={(t, list) => (playTrack ? playTrack(t, list) : p.play(t, list))}
          onArtist={(name) => { setQ(name); goSearch(name); }}
        />
      )}

      {mode === 'results' && !editingResults && (
        <SearchResults q={qParam || resultsLabel} cat={sCat} catLoading={sCatBusy} videos={results} videosLoading={videosBusy}
          fuente={fuente} ctx={ctx} fallback={popTracks} />
      )}
      {mode === 'library' && (
        <LibraryPage p={p} playlists={pls.playlists} plStats={plStats} onCreate={() => setCreateOpen(true)} openPl={openPl} />
      )}
      {mode === 'artist' && <ArtistPage refId={routeParam} ctx={ctx} />}
      {mode === 'album' && <AlbumPage refId={routeParam} ctx={ctx} />}

      {mode === 'category' && !selCat && (
        <div className="space-y-4">
          <BackBar title="Categoría" onBack={goBack} />
          <div className="card"><p className="text-sm" style={{ color: 'var(--m)' }}>Esa categoría no existe.</p></div>
        </div>
      )}
      {mode === 'category' && selCat && (
        <div className="space-y-8">
          <BackBar title={selCat.name} onBack={goBack} />
          <div className="relative overflow-hidden rounded-[2rem] p-6 text-white" style={{ background: selCat.bg }}>
            <span className="cat-glow" aria-hidden="true" />
            <div className="relative flex items-center gap-4">
              <div className="w-20 h-20 rounded-full grid place-items-center shrink-0 bg-black/30 border border-white/30">
                <Disc3 size={38} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold tracking-[0.2em] uppercase opacity-80">Categoría</p>
                <p className="serif text-4xl font-semibold leading-tight truncate">{selCat.name}</p>
                <p className="text-xs opacity-80 truncate">
                  {[catSongs.length ? `${catSongs.length} canciones` : '', catAlbums.length ? `${catAlbums.length} álbumes` : '', catVideos.length ? `${catVideos.length} videos` : ''].filter(Boolean).join(' · ') || 'Buscando…'}
                </p>
                {!!catSongs.length && (
                  <button className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-sm active:scale-95 transition-transform"
                    onClick={() => playEntry(catSongs[0])} disabled={!!resolvingId}>
                    {resolvingId ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} fill="currentColor" />} Escuchar
                  </button>
                )}
              </div>
            </div>
          </div>

          {!!catAlbums.length && (
            <UISection title="Álbumes">
              <Shelf>
                {catAlbums.map((a) => (
                  <SquareCard key={a.id} art={a.art} title={a.title} sub={a.artist || a.releaseDate || ''} badge={a.releaseDate || undefined}
                    onClick={() => nav(`/musica/album/it-${a.collectionId}`)} />
                ))}
              </Shelf>
            </UISection>
          )}

          {!!catSongs.length && (
            <UISection title="Canciones">
              <div className="card !p-2">
                {catSongs.map((s, i) => {
                  const on = isNow(p.track, s);
                  return (
                    <SongRow key={s.id} n={i + 1} art={s.art} title={s.title} sub={s.artist} duration={s.duration}
                      active={on} playing={p.playing} loading={resolvingId === s.id}
                      onPlay={() => (on ? p.openFull?.() : playEntry(s))}
                      onMenu={() => openMenu({ ...s, source: s.source || 'YouTube' }, catSongs, { kind: 'chart', onPlay: playEntry })} />
                  );
                })}
              </div>
            </UISection>
          )}

          <UISection title="Videos" sub="Toca uno y sigue la radio">
            {catLoading && !catVideos.length && !catSongs.length && (
              <p className="text-xs py-2 flex items-center gap-2" style={{ color: 'var(--m)' }}><Loader2 size={14} className="animate-spin" /> Buscando en la categoría…</p>
            )}
            <div className="card !p-2">
              {catVideos.map((t) => (
                <TrackRow key={t.id} t={t} p={p} list={catVideos}
                  onMenu={(x) => openMenu(x, catVideos, { asRadio: true, kind: fuente })} asRadio meta={<Meta t={t} />} />
              ))}
              {!catVideos.length && !catLoading && <p className="text-xs p-2" style={{ color: 'var(--m)' }}>Videos no disponibles por ahora; arriba tienes canciones y álbumes.</p>}
            </div>
          </UISection>
        </div>
      )}

      {mode === 'playlist' && !sel && (
        <div className="space-y-4"><BackBar title="Playlist" onBack={goBack} /><div className="card"><p className="text-sm" style={{ color: 'var(--m)' }}>Esa playlist ya no existe.</p></div></div>
      )}
      {mode === 'playlist' && sel && (
        <>
          <div className="relative isolate">
            <GlassBackdrop img={plArt} />
            <ImmersivePage img={plArt} alt={sel.name} colors={plColors} tint={plColors ? `color-mix(in srgb, ${plColors.main} 70%, #000)` : undefined} onBack={goBack}>
              <div className="text-center">
                <p className="text-[11px] font-bold tracking-[0.25em] uppercase" style={{ color: 'var(--m)' }}>{isFavPl ? 'Favoritos' : 'Playlist'}</p>
                <h2 className="text-[2.4rem] sm:text-5xl font-bold leading-[1.05] line-clamp-2 mt-1" style={{ textShadow: '0 2px 14px rgba(0,0,0,.35)' }}>{sel.name}</h2>
                <p className="text-sm mt-2" style={{ color: 'var(--m)' }}>{sel.tracks.length} canciones</p>
              </div>
              <ActionRow disabled={!sel.tracks.length} onPlay={() => playPlaylist(sel)}
                onShuffle={() => { if (sel.tracks.length) playPlaylist({ ...sel, tracks: [...sel.tracks].sort(() => Math.random() - 0.5) }); }} />
            </ImmersivePage>
          </div>
          <div className="glass-panel !p-4">
            <div className="flex items-center gap-2 mb-2">
              {renaming ? (
                <form onSubmit={(e) => { e.preventDefault(); pls.rename(sel.id, renameVal); setRenaming(false); }} className="flex gap-1 flex-1">
                  <input className="inp !py-1.5" value={renameVal} onChange={(e) => setRenameVal(e.target.value)} maxLength={40} aria-label="Nombre" />
                  <button className="btn !py-1.5 shrink-0">OK</button>
                </form>
              ) : (
                <p className="text-xs flex-1 truncate" style={{ color: 'var(--m)' }}>
                  {isFavPl ? 'Tus me gusta en un solo lugar.' : 'Tu playlist, lista para sonar.'}
                </p>
              )}
              {!isFavPl && (
                <button className="ico-btn shrink-0" onClick={() => { setRenameVal(sel.name); setRenaming((r) => !r); }} aria-label="Renombrar"><Pencil size={16} /></button>
              )}
              {!isFavPl && (
                <button className="ico-btn shrink-0" onClick={() => { pls.remove(sel.id); goHome(); }} aria-label="Eliminar playlist"><Trash2 size={16} /></button>
              )}
            </div>
          {sel.tracks.map((t) => (
            <div key={t.id} className="flex items-center gap-1">
              <div className="flex-1 min-w-0"><TrackRow t={t} p={p} list={sel.tracks} onMenu={(x) => openMenu(x, sel.tracks, { kind: isFavPl ? 'fav' : 'pl' })} /></div>
              {!isFavPl && (
                <button className="ico-btn shrink-0" onClick={() => pls.removeTrack(sel.id, t.id)} aria-label={`Quitar ${t.title}`}><X size={15} /></button>
              )}
            </div>
          ))}
          {!sel.tracks.length && <p className="text-sm" style={{ color: 'var(--m)' }}>{isFavPl ? 'Vacía. Dale corazón a lo que te guste y aparece aquí.' : 'Vacía. Agrega temas con ＋ desde cualquier lista.'}</p>}
          </div>
        </>
      )}

      {mode === 'roompl' && (() => {
        const pl = roomPls.find((x) => x.roomId === selRoom);
        if (!pl) return (
          <>
            <BackBar title="Playlist" onBack={goBack} />
            <div className="card"><p className="text-sm" style={{ color: 'var(--m)' }}>Esa playlist ya no está disponible.</p></div>
          </>
        );
        const isDuo = pl.kind === 'dm';
        const peer = peers[pl.roomId];
        const title = isDuo ? (peer?.name || peer?.handle || pl.name) : pl.name;
        const list = (pl.tracks || []).filter((t) => t.videoId || t.src);
        return (
          <>
            <BackBar title={title} onBack={goBack} />
            <PlaylistHero
              art={pl.tracks[0]?.art}
              icon={isDuo ? <Users size={30} /> : (pl.icon || <Users size={30} />)}
              eyebrow={isDuo ? 'Playlist de a 2' : 'Playlist del grupo'}
              title={title}
              meta={`${pl.tracks.length} canciones`}
              actions={
                <>
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-sm active:scale-95 transition-transform"
                    onClick={() => { if (list.length) p.play(list[0], list); else toast('Esa playlist no tiene temas reproducibles', AlertTriangle); }}
                    disabled={!list.length}>
                    <Play size={16} fill="currentColor" /> Escuchar
                  </button>
                  <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm border border-white/35 backdrop-blur active:scale-95 transition-transform"
                    onClick={() => { if (onOpenRoom) onOpenRoom(pl.roomId); else toast('Abre Comunidad para chatear', AlertTriangle); }}>
                    <MessageCircle size={15} /> Chatear
                  </button>
                </>
              }
            />
            <div className="card">
              {!pl.tracks.length && <p className="text-sm" style={{ color: 'var(--m)' }}>Vacía por ahora: comparte temas en el chat y aparecen aquí.</p>}
              {pl.tracks.map((t) => (
                <TrackRow key={t.id} t={t} p={p} list={pl.tracks}
                  onMenu={(x) => openMenu(x, pl.tracks, { kind: 'room' })}
                  meta={<Meta t={t} />} />
              ))}
            </div>
          </>
        );
      })()}

      {mode === 'home' && !searchOpen && lampOn && (
        <MusicHome h={{
          p, toast, nav, fuente, resolvingId, playEntry, playFeat: (t) => (t?.videoId || t?.src ? playTrack(t) : playEntry(t)),
          playTrack, openMenu, goSearch, openCategory, openPl, onCreatePl: () => setCreateOpen(true),
          recs, recAlbums, charts, chartsLoading, cc, changeCountry, randomSongs, randomLoading, reshuffle: () => setRandomKey((k) => k + 1),
          popTracks, popAlbums, audTrend, roomPls, peers, myAvatar, onOpenRoom, pls, plStats,
          heroList: [recs[0], releases[0], charts[0], recs[1], releases[1], charts[1]].filter(Boolean), favEntry,
        }} />
      )}

      {mode === 'home' && !searchOpen && !lampOn && (
        <>
          {(() => {
            const lastLocal = (p.history || []).map((h) => (local?.tracks || []).find((t) => t.id === h.id)).find(Boolean)
              || (local?.tracks || [])[0] || null;
            if (!lastLocal) return null;
            return (
              <PlaylistHero
                art={lastLocal.art}
                icon={<FolderOpen size={30} />}
                eyebrow="Local sin conexión"
                title={lastLocal.title}
                meta={`${lastLocal.artist || 'Desconocido'} · ${(local?.tracks.length || 0)} temas en este dispositivo`}
                actions={
                  <>
                    <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-black font-semibold text-sm active:scale-95 transition-transform"
                      onClick={() => p.play(lastLocal, localVisible.length ? localVisible : local.tracks)}>
                      <Play size={16} fill="currentColor" /> Escuchar
                    </button>
                    {!!localVisible.length && (
                      <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm border border-white/35 backdrop-blur active:scale-95 transition-transform"
                        onClick={playLocalShuffle}>
                        <Shuffle size={15} /> Aleatorio
                      </button>
                    )}
                  </>
                }
              />
            );
          })()}
          {/* Tabs: Lista | Playlists | Carátulas | + */}
          <div className="flex rounded-full p-0.5 overflow-x-auto" style={{ background: 'var(--s2)' }} role="tablist" aria-label="Vista local">
            {[['songs', 'Lista'], ['playlists', 'Playlists'], ['covers', 'Carátulas'], ['add', '＋']].map(([id, label]) => (
              <button key={id} role="tab" aria-selected={localTab === id} onClick={() => setLocalTab(id)}
                className={`flex-1 px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${localTab === id ? 'text-white' : ''}`}
                style={localTab === id ? { background: 'var(--a)' } : { color: 'var(--m)' }}>{label}</button>
            ))}
          </div>
          <input ref={fileRef} type="file" accept="audio/*,video/*,.mp3,.m4a,.mp4,.m4v,.mov,.webm,.flac,.ogg,.oga,.opus,.wav,.aac,.wma" multiple className="hidden" aria-label="Elegir carpeta de música y videos"
            onChange={(e) => { local?.importFiles(e.target.files); e.target.value = ''; }} />

          {localTab === 'songs' && (
          <div className="card">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {!!localVisible.length && (
                <button className="btn btn-o !py-1.5 !px-2.5 !text-[11px] shrink-0" onClick={() => p.play(localVisible[0], localVisible)} aria-label="Reproducir todo lo local">
                  <Play size={13} /> Todo
                </button>
              )}
              {!!localVisible.length && (
                <button className="btn btn-o !py-1.5 !px-2.5 !text-[11px] shrink-0" onClick={playLocalShuffle} aria-label="Local en aleatorio">
                  <Shuffle size={13} /> Mezclar
                </button>
              )}
              <span className="flex-1" />
              <span className="text-[11px] self-center truncate" style={{ color: 'var(--m)' }}>
                {(local?.tracks.length || 0)} temas{q ? ` · “${q.trim()}”` : ''}
              </span>
            </div>
            {!!(local?.tracks.length) && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[11px] font-semibold shrink-0" style={{ color: 'var(--m)' }}>Ordenar:</span>
                <div className="flex rounded-full p-0.5 flex-1 overflow-x-auto" style={{ background: 'var(--s2)' }}>
                  {[['recent', 'Recientes'], ['title', 'Título'], ['artist', 'Artista'], ['duration', 'Duración']].map(([id, label]) => (
                    <button key={id} onClick={() => setLocalSort(id)}
                      className={`flex-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${localSort === id ? 'text-white' : ''}`}
                      style={localSort === id ? { background: 'var(--a)' } : { color: 'var(--m)' }}>{label}</button>
                  ))}
                </div>
              </div>
            )}
            {localVisible.slice(0, localShown).map((t) => (
              <TrackRow key={t.id} t={t} p={p} list={localVisible}
                onMenu={(x) => openMenu(x, localVisible.length ? localVisible : local.tracks, { kind: 'local' })}
                meta={<Meta t={t} />} wrap />
            ))}
            {localVisible.length > localShown && <div ref={moreRef} className="h-2" aria-hidden="true" />}
            {!localVisible.length && (
              <p className="text-sm py-2" style={{ color: 'var(--m)' }}>
                {q ? `Nada local coincide con “${q.trim()}”.` : 'Vacío por aquí. Toca Escanear canciones y suena sin internet.'}
              </p>
            )}
          </div>
          )}

          {localTab === 'covers' && (
          <div className="card">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {!!localVisible.length && (
                <button className="btn btn-o !py-1.5 !px-2.5 !text-[11px] shrink-0" onClick={playLocalShuffle} aria-label="Local en aleatorio">
                  <Shuffle size={13} /> Mezclar
                </button>
              )}
              <span className="flex-1" />
              <span className="text-[11px] self-center truncate" style={{ color: 'var(--m)' }}>
                {(local?.tracks.length || 0)} temas
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {localVisible.slice(0, localShown).map((t) => {
                const on = p.track?.id === t.id;
                return (
                  <div key={t.id} className="group relative [content-visibility:auto] [contain-intrinsic-size:auto_160px]">
                    <button onClick={() => p.play(t, localVisible)} className="block w-full text-left" aria-label={`Reproducir ${t.title}`} title={`${t.title} — ${t.artist}`}>
                      <div className="relative aspect-square rounded-2xl overflow-hidden" style={{ background: 'var(--s2)', boxShadow: on ? '0 0 0 2px var(--a)' : 'none' }}>
                        {t.art
                          ? <img src={t.art} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                          : (
                            <div className="w-full h-full grid place-items-center text-2xl font-bold text-white"
                              style={{ background: `linear-gradient(135deg, hsl(${(String(t.title).charCodeAt(0) * 37) % 360} 60% 45%), hsl(${(String(t.artist).charCodeAt(0) * 53) % 360} 60% 25%))` }}>
                              {(String(t.title || '?').trim()[0] || '?').toUpperCase()}
                            </div>
                          )}
                          <span className="absolute inset-0 grid place-items-center bg-black/35 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                            {on && p.playing ? <Pause size={22} /> : <Play size={22} />}
                          </span>
                          {t.kind === 'video' && (
                            <span className="absolute bottom-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ background: 'rgba(0,0,0,.6)' }}>VIDEO</span>
                          )}
                      </div>
                      <p className="text-[12px] font-semibold mt-1.5 line-clamp-2 min-h-[2.2em] leading-snug" title={t.title}>{t.title}</p>
                      <p className="text-[10px] truncate" style={{ color: 'var(--m)' }} title={t.artist}>{t.artist}</p>
                    </button>
                    <button className="absolute top-1 right-1 w-7 h-7 rounded-full grid place-items-center bg-black/55 text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      onClick={() => openMenu(t, localVisible.length ? localVisible : local.tracks, { kind: 'local' })} aria-label={`Opciones de ${t.title}`} title="Opciones"><MoreVertical size={14} /></button>
                  </div>
                );
              })}
            </div>
            {localVisible.length > localShown && <div ref={moreRef} className="h-2" aria-hidden="true" />}
            {!localVisible.length && (
              <p className="text-sm py-2" style={{ color: 'var(--m)' }}>
                {q ? `Nada local coincide con “${q.trim()}”.` : 'Vacío por aquí. Toca Escanear canciones y suena sin internet.'}
              </p>
            )}
          </div>
          )}
          {localTab === 'playlists' && (
          <div>
            <div className="flex items-center gap-3 px-1 mb-2">
              <Heart size={22} fill="currentColor" className="shrink-0" style={{ color: 'var(--a)' }} />
              <button onClick={() => openPl('fav')} className="flex-1 text-left" aria-label="Abrir me gusta">
                <p className="font-bold text-[15px]">Tus Me Gusta</p>
                <p className="text-xs" style={{ color: 'var(--m)' }}>{p.favs.length} canciones · sin conexión</p>
              </button>
              <button className="ico-btn" aria-label="Reproducir me gusta"
                onClick={() => p.favs.length ? playPlaylist({ id: 'fav', tracks: p.favs }) : toast('Aún no tienes favoritos', AlertTriangle)}>
                <Play size={18} />
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
              {topPls.map((pl) => (
                <span key={pl.id} className="snap-start shrink-0">
                  <PlaylistCard pl={pl} plays={plStats[pl.id] || 0} onClick={() => openPl(pl.id)} />
                </span>
              ))}
              {!topPls.length && (
                <p className="text-xs py-2" style={{ color: 'var(--m)' }}>Aún no creas playlists.</p>
              )}
            </div>
            <form onSubmit={createPl} className="flex gap-2 mt-1">
              <input className="inp" placeholder="Nueva playlist…" value={newPlName}
                onChange={(e) => setNewPlName(e.target.value)} maxLength={40} aria-label="Nombre de playlist" />
              <button className="btn shrink-0" aria-label="Crear playlist"><Plus size={16} />Crear</button>
            </form>
          </div>
          )}

          {localTab === 'add' && (
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl grid place-items-center text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--a), #4c1d95)' }}>
                {scanning ? <Loader2 size={22} className="animate-spin" /> : <Radar size={22} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[15px]">Tu música local</p>
                <p className="text-xs truncate" style={{ color: 'var(--m)' }}>
                  {(local?.tracks.length || 0)} temas{(local?.bytes || 0) > 0 ? ` · ${fmtMB(local.bytes)}` : ''}{(local?.dirs?.length || 0) > 0 ? ` · ${local.dirs.length} carpeta${local.dirs.length > 1 ? 's' : ''}` : ''}
                </p>
              </div>
            </div>
            {/* Progreso del escaneo en vivo: X de Y + cancelar */}
            {scanning && (
              <div className="mb-3 rounded-2xl p-3" style={{ background: 'var(--s2)' }} role="status" aria-live="polite">
                <p className="text-xs font-semibold">
                  {local?.scan?.total
                    ? `Escaneando ${local.scan.done} de ${local.scan.total}… ${local.scan.added} nuevas`
                    : 'Buscando canciones…'}
                </p>
                {!!local?.scan?.total && (
                  <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bd)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${scanPct}%`, background: 'var(--a)' }} />
                  </div>
                )}
                {!!local?.scan?.name && (
                  <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--m)' }}>{local.scan.name}</p>
                )}
                <button className="btn btn-o w-full mt-2 !py-1.5 text-xs" onClick={() => local?.cancelScan?.()}
                  aria-label="Cancelar escaneo">
                  <X size={14} /> Cancelar
                </button>
              </div>
            )}
            {/* Lista de carpetas escaneadas (multi-carpeta) */}
            {(local?.dirs?.length || 0) > 0 && (
              <div className="mb-3 rounded-2xl overflow-hidden" style={{ border: '1px solid var(--bd)' }} aria-label="Carpetas escaneadas">
                <p className="text-[11px] font-bold tracking-wide uppercase px-3 pt-2.5 pb-1" style={{ color: 'var(--m)' }}>
                  Carpetas ({local.dirs.length})
                </p>
                <div className="divide-y" style={{ borderColor: 'var(--bd)' }}>
                  {local.dirs.map((d) => {
                    const n = String(d.name || 'carpeta');
                    const count = (local?.tracks || []).filter((t) => String(t.dir || '').toLowerCase() === n.toLowerCase()).length;
                    const canRescan = !!d.handle;
                    const confirming = pendingDel === (d.id || n);
                    return (
                      <div key={d.id || n} className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-8 h-8 rounded-xl grid place-items-center shrink-0" style={{ background: 'var(--s2)' }}>
                            <FolderOpen size={15} style={{ color: 'var(--a)' }} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-[13px] font-semibold truncate" title={n}>{n}</span>
                            <span className="block text-[11px] truncate" style={{ color: 'var(--m)' }}>
                              {count} tema{count === 1 ? '' : 's'}{d.kind === 'picker' ? ' · manual' : ''}{!count ? ' · vacía' : ''}
                            </span>
                          </span>
                          <button className="ico-btn shrink-0" disabled={scanning || !canRescan}
                            title={canRescan ? `Re-escanear ${n}` : 'Carpeta manual: usa Elegir carpeta para actualizar'}
                            aria-label={`Re-escanear ${n}`}
                            onClick={() => local?.rescanDir?.(d.id || d.name)}>
                            <RotateCw size={15} />
                          </button>
                          <button className="ico-btn shrink-0" disabled={scanning}
                            title={`Quitar ${n} de la lista`}
                            aria-label={`Quitar ${n}`}
                            onClick={() => {
                              if (!count) { local?.removeDir?.(d.id || d.name, false); return; }
                              setPendingDel(confirming ? null : (d.id || n));
                            }}>
                            <X size={15} />
                          </button>
                        </div>
                        {confirming && !!count && (
                          <div className="mt-2 rounded-xl p-2 flex flex-col gap-1.5" style={{ background: 'var(--s2)' }} role="group" aria-label={`Quitar ${n}`}>
                            <p className="text-[11px] font-semibold">Quitar “{n}” ({count} temas): ¿solo el acceso o también la música?</p>
                            <div className="flex gap-1.5">
                              <button className="btn btn-o flex-1 !py-1.5 !text-[11px]" disabled={scanning}
                                onClick={async () => { setPendingDel(null); await local?.removeDir?.(d.id || d.name, false); }}>
                                Solo acceso
                              </button>
                              <button className="btn btn-o flex-1 !py-1.5 !text-[11px]" disabled={scanning}
                                style={{ borderColor: '#ef444488', color: '#ef4444' }}
                                onClick={async () => { setPendingDel(null); await local?.removeDir?.(d.id || d.name, true); }}>
                                Borrar todo
                              </button>
                              <button className="ico-btn shrink-0" aria-label="Cancelar" onClick={() => setPendingDel(null)}><X size={14} /></button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="grid gap-2">
              {/* Botón único: en PC abre el picker de carpeta, en iPhone/Firefox el selector manual */}
              <button className="btn w-full" onClick={handleEscanear} disabled={scanning}>
                {scanning ? <Loader2 size={15} className="animate-spin" /> : <FolderSearch size={15} />} {(local?.dirs?.length || 0) > 0 ? 'Agregar otra carpeta' : 'Elegir carpeta'}
              </button>
              {(local?.dirs?.length || 0) > 1 && (
                <button className="btn btn-o w-full" onClick={handleRescan} disabled={scanning}
                  title="Vuelve a revisar todas las carpetas sin buscarlas">
                  {scanning ? <Loader2 size={15} className="animate-spin" /> : <RotateCw size={15} />} Re-escanear todo ({local.dirs.length})
                </button>
              )}
              {(local?.dirs?.length || 0) === 1 && !!local?.lastDir && (
                <button className="btn btn-o w-full" onClick={handleRescan} disabled={scanning}
                  title="Vuelve a revisar la misma carpeta sin buscarla">
                  {scanning ? <Loader2 size={15} className="animate-spin" /> : <RotateCw size={15} />} Re-escanear {local.lastDir.slice(0, 24)}
                </button>
              )}
              {(local?.dirs?.length || 0) > 0 && (
                <button className="btn btn-o w-full" onClick={() => local?.clearEmptyDirs?.()} disabled={scanning}
                  title="Borra de la lista las carpetas que quedaron con 0 canciones">
                  <Trash2 size={15} /> Limpiar vacías
                </button>
              )}
              <div className="rounded-2xl p-3" style={{ background: 'var(--s2)' }} aria-label="Descargar MP3 de YouTube">
                <p className="text-xs font-bold mb-1">Descargar MP3 de YouTube</p>
                <p className="text-[11px]" style={{ color: 'var(--m)' }}>
                  En ⋮ de una canción → Descargar MP3: se copia el link y se abre la herramienta elegida en <b>Ajustes</b>. Baja el MP3 <b>dentro de una carpeta ya escaneada</b> (ej. Download) y al entrar aparece solo en Local.
                </p>
              </div>
              {!!(local?.tracks.length) && (
                <button className="btn btn-o w-full" onClick={buscarCaratulas} disabled={!!artBusy || scanning}
                  aria-label="Buscar carátulas reales con wifi" title="Con wifi: busca la imagen real del álbum o tema">
                  {artBusy ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
                  {artBusy && artBusy.total ? `Buscando ${artBusy.done}/${artBusy.total}` : 'Buscar carátulas'}
                </button>
              )}
              <button className="btn btn-o w-full" onClick={() => setAutoArt(!autoArt)}
                aria-pressed={!!autoArt} aria-label="Auto-actualizar carátulas"
                title="Si está activo, cada cierto tiempo busca carátulas a lo nuevo sin imagen real"
                style={autoArt ? { borderColor: 'var(--a)', color: 'var(--a)' } : undefined}>
                <RefreshCw size={15} /> Auto-carátulas {autoArt ? 'on' : 'off'}
              </button>
              <button className="btn btn-o w-full" onClick={() => setAutoRescan(!autoRescan)}
                aria-pressed={!!autoRescan} aria-label="Actualizar carpetas al entrar"
                title="Si está activo, al entrar re-escanea tus carpetas (solo con permiso ya dado, sin pedir nada)"
                style={autoRescan ? { borderColor: 'var(--a)', color: 'var(--a)' } : undefined}>
                <RotateCw size={15} /> Actualizar al entrar {autoRescan ? 'on' : 'off'}
              </button>
              {!!(local?.tracks.length) && (
                <button className="btn btn-o w-full" style={{ borderColor: '#ef444488', color: '#ef4444' }}
                  onClick={() => { if (window.confirm('¿Vaciar toda tu música local?')) { local?.clearLocal(); local?.clearDirs?.(); } }}>
                  <Trash2 size={15} /> Vaciar música local
                </button>
              )}
            </div>
            <p className="text-[11px] flex items-center gap-1.5 mt-3" style={{ color: 'var(--m)' }}>
              <HardDrive size={12} /> Un botón agrega carpetas (se suman) · lo nuevo entra de primero en Recientes · sigue ahí aunque recargues.
            </p>
          </div>
          )}
        </>
      )}

      {/* Hoja: crear playlist (desde el final de "Volver a escuchar") */}
      {createOpen && (
        <div className="fixed inset-0 z-40 grid place-items-end sm:place-items-center p-4" role="dialog" aria-modal="true" aria-label="Crear playlist">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCreateOpen(false)} />
          <form onSubmit={createPl} className="relative card w-full max-w-sm !rounded-3xl">
            <div className="flex items-center justify-between mb-3">
              <p className="serif text-2xl font-semibold">Nueva playlist</p>
              <button type="button" className="ico-btn" onClick={() => setCreateOpen(false)} aria-label="Cerrar"><X size={17} /></button>
            </div>
            <input className="inp" autoFocus placeholder="Nombre de la playlist" value={newPlName} onChange={(e) => setNewPlName(e.target.value)} maxLength={40} aria-label="Nombre de playlist" />
            <button className="btn w-full mt-3" disabled={!newPlName.trim()}><Plus size={16} /> Crear</button>
          </form>
        </div>
      )}

      {/* Hoja: agregar a playlists (multi-seleccion + crear) */}
      {addTarget && (
        <div className="fixed inset-0 z-40 grid place-items-end sm:place-items-center p-4" role="dialog" aria-modal="true" aria-label="Agregar a playlists">
          <div className="absolute inset-0 bg-black/60" onClick={() => setAddTarget(null)} />
          <div className="relative card w-full max-w-sm !rounded-3xl">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-sm truncate">Agregar “{addTarget.title}”</p>
              <button className="ico-btn" onClick={() => setAddTarget(null)} aria-label="Cerrar"><X size={17} /></button>
            </div>
            {!pls.playlists.length && <p className="text-xs mb-2" style={{ color: 'var(--m)' }}>Crea tu primera playlist abajo.</p>}
            <div className="max-h-56 overflow-y-auto -mx-1 px-1">
              {pls.playlists.map((pl) => {
                const has = pl.tracks.some((x) => x.id === addTarget.id);
                const checked = selPls.includes(pl.id);
                return (
                  <button key={pl.id} disabled={has}
                    onClick={() => setSelPls((s) => (checked ? s.filter((id) => id !== pl.id) : [...s, pl.id]))}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--s2)] text-left disabled:opacity-50">
                    <span className="w-5 h-5 rounded-md grid place-items-center shrink-0 transition"
                      style={{ border: '1px solid var(--bd)', background: checked ? 'var(--a)' : 'transparent' }}>
                      {(checked || has) && <span className="w-2.5 h-2.5 rounded-sm bg-white" />}
                    </span>
                    <span className="flex-1 min-w-0 text-sm truncate">{pl.name}</span>
                    <span className="text-[11px] shrink-0" style={{ color: 'var(--m)' }}>{has ? 'ya está' : pl.tracks.length}</span>
                  </button>
                );
              })}
            </div>
            <button className="btn w-full mt-2" disabled={!selPls.length}
              onClick={() => {
                let n = 0;
                for (const id of selPls) { if (pls.addTrack(id, addTarget, true)) n++; }
                toast?.(n ? `Agregada a ${n} playlist${n > 1 ? 's' : ''}` : 'Ya estaba en esas playlists');
                setAddTarget(null);
              }}>
              <Plus size={15} /> Agregar{selPls.length ? ` (${selPls.length})` : ''}
            </button>
            <form onSubmit={(e) => { e.preventDefault(); const pl = pls.create(newPlName); if (pl) { setSelPls((s) => [...s, pl.id]); setNewPlName(''); } }} className="flex gap-2 mt-2">
              <input className="inp !py-2" placeholder="Nueva playlist…" value={newPlName}
                onChange={(e) => setNewPlName(e.target.value)} maxLength={40} aria-label="Nueva playlist" />
              <button className="btn !py-2 shrink-0" aria-label="Crear y seleccionar playlist"><Plus size={15} /></button>
            </form>
          </div>
        </div>
      )}

      {/* Menú único ⋮ / long-press para cualquier canción */}
      {menuTrack && (
        <TrackMenu
          entry={menuTrack}
          p={p}
          toast={toast}
          local={local}
          onAdd={(t) => { setAddTarget(t); setMenuTrack(null); }}
          onClose={() => setMenuTrack(null)}
          onRadio={(t) => {
            if (menuTrack?.kind === 'chart' && menuTrack?.onPlay) menuTrack.onPlay(t);
            else p.startRadio?.(t);
          }}
          onDownload={(t) => {
            if (menuTrack?.kind === 'chart' && t && !t.src && !t.videoId) { downloadEntry(t); return; }
            descargarSong(t);
          }}
          onEnrich={(t) => (async () => {
            if (!navigator.onLine) { toast('Necesitas wifi para buscar carátulas', AlertTriangle); return; }
            toast('Buscando carátula…');
            const ok = await local?.enrichArt?.(t.id).catch(() => false);
            toast(ok ? 'Carátula real lista' : 'Sin carátula real, queda la generada', ok ? Check : AlertTriangle);
          })()}
          onDelete={(t) => local?.removeTrack?.(t.id)}
          canRadio={menuTrack?.kind !== 'local' && menuTrack?.kind !== 'pl' && menuTrack?.kind !== 'fav'}
          canDownload={menuTrack?.kind !== 'local'}
          canEnrich={menuTrack?.kind === 'local'}
          canDelete={menuTrack?.kind === 'local'}
        />
      )}

      <p className="text-[11px]" style={{ color: 'var(--m)' }}>
        Solo YouTube, siempre completo: oficiales primero, no disponibles ocultos. Playlists en este dispositivo.
      </p>
    </div>
  );
}
