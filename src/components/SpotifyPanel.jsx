import { useState } from 'react';
import { Search, Play, Heart, ListMusic, Loader2, ExternalLink, ChevronDown, RefreshCw, LogOut } from 'lucide-react';
import Cover from './Cover';
import useStore from '../hooks/useStore';
import { searchSpotifyTracks, getSpotifyLiked, getSpotifyPlaylists, getSpotifyPlaylistTracks, spotifyConnected, loginSpotify, disconnectSpotify } from '../services/spotify';
import { resolveOfficial } from '../services/youtube';

// Spotify como una playlist más: cabecera colapsable + contenido adentro.
// Descubre en Spotify, suena vía YouTube (resolveOfficial). Solo lectura.
export default function SpotifyPanel({ p, toast }) {
  const [open, setOpen] = useStore('h_sp_open', false);
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('search'); // search | liked | playlists
  const [playlists, setPlaylists] = useState([]);
  const [resolvingId, setResolvingId] = useState(null);
  const [err, setErr] = useState('');

  const connected = spotifyConnected();

  const fail = (e, fallback) => {
    const msg = String(e?.message || fallback);
    setErr(msg);
    toast?.(msg.length > 140 ? `${msg.slice(0, 140)}…` : msg);
  };

  const runSearch = async (e) => {
    e?.preventDefault?.();
    if (!q.trim()) return;
    setLoading(true); setErr('');
    try {
      const r = await searchSpotifyTracks(q.trim(), 12);
      setItems(r);
      if (!r.length) toast?.('Sin resultados en Spotify');
    } catch (e) {
      fail(e, 'Spotify falló');
    } finally {
      setLoading(false);
    }
  };

  const loadLiked = async () => {
    setLoading(true); setErr('');
    try {
      const r = await getSpotifyLiked(20);
      setItems(r);
      if (!r.length) toast?.('Sin Liked: dale corazón a algo en Spotify primero');
    } catch (e) {
      fail(e, 'No se pudo leer Liked');
    } finally {
      setLoading(false);
    }
  };

  const loadPlaylists = async () => {
    setLoading(true); setErr('');
    try {
      const r = await getSpotifyPlaylists(20);
      setPlaylists(r);
      if (!r.length) toast?.('Sin playlists visibles en tu cuenta');
    } catch (e) {
      fail(e, 'No se pudo leer playlists');
    } finally {
      setLoading(false);
    }
  };

  const reconnect = () => {
    disconnectSpotify();
    loginSpotify();
  };

  const playSpotify = async (sp) => {
    if (!sp?.title) return;
    setResolvingId(sp.id);
    try {
      const yt = await resolveOfficial(sp.artist || '', sp.title);
      const track = yt || {
        id: `y_sp_${sp.spotifyId || Date.now()}`,
        videoId: null, title: sp.title, artist: sp.artist,
        art: sp.art, duration: sp.duration, source: 'YouTube',
      };
      if (!track.videoId) { toast?.('Sin versión YouTube para ese tema'); return; }
      if (p.playRadio) await p.playRadio(track);
      else p.play(track);
    } catch {
      toast?.('No se pudo reproducir desde Spotify');
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="rounded-3xl overflow-hidden" style={{ background: 'var(--s)', border: '1px solid var(--bd)' }}>
      <button onClick={() => setOpen(!open)} aria-expanded={open}
        className="w-full flex items-center gap-3 p-3 text-left active:scale-[.99] transition">
        <span className="w-12 h-12 rounded-2xl grid place-items-center shrink-0 text-white font-black"
          style={{ background: 'linear-gradient(135deg,#1DB954,#0d3b21)' }}>Sp</span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold truncate">Spotify · importar</span>
          <span className="block text-[11px] truncate" style={{ color: 'var(--m)' }}>
            {connected ? (items.length ? `${items.length} temas listos` : 'Buscar, Liked y playlists → suena en YouTube') : 'Conecta para traer tu biblioteca'}
          </span>
        </span>
        <span className="flex items-center gap-1 shrink-0" style={{ color: 'var(--m)' }}>
          <span className="w-2 h-2 rounded-full" style={{ background: connected ? '#1DB954' : 'var(--bd)' }} />
          <ChevronDown size={18} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3">
          {!connected ? (
            <div className="flex items-center gap-2 rounded-2xl p-3" style={{ background: 'var(--s2)' }}>
              <p className="flex-1 text-xs" style={{ color: 'var(--m)' }}>Conecta en Ajustes o aquí para buscar y ver Liked/playlists.</p>
              <button className="btn !py-1.5 !px-4 text-xs" onClick={() => loginSpotify()}>Conectar</button>
            </div>
          ) : (
            <>
              <div className="flex gap-1.5 mb-2.5 text-xs flex-wrap">
                {[['search', 'Buscar'], ['liked', 'Liked'], ['playlists', 'Playlists']].map(([id, label]) => (
                  <button key={id} onClick={() => { setTab(id); setErr(''); if (id === 'liked') loadLiked(); if (id === 'playlists') loadPlaylists(); }}
                    className={`px-3 py-1.5 rounded-full ${tab === id ? 'btn' : 'btn btn-o'}`}>
                    {id === 'liked' ? <span className="inline-flex items-center gap-1"><Heart size={12} />{label}</span> : label}
                  </button>
                ))}
                <button onClick={reconnect} className="ico-btn !p-1.5 ml-auto" title="Reconectar (pide permisos de nuevo)" aria-label="Reconectar Spotify">
                  <RefreshCw size={14} />
                </button>
                <button onClick={() => { disconnectSpotify(); setItems([]); setPlaylists([]); toast?.('Spotify desconectado'); }} className="ico-btn !p-1.5" title="Desconectar" aria-label="Desconectar Spotify">
                  <LogOut size={14} />
                </button>
              </div>

              {err ? (
                <div className="rounded-2xl p-3 mb-2 text-xs" style={{ background: 'var(--s2)', border: '1px solid #f8717155' }}>
                  <p className="font-semibold mb-1">Spotify no dejó leer</p>
                  <p className="mb-2 break-words" style={{ color: 'var(--m)' }}>{err}</p>
                  <div className="flex gap-2 flex-wrap">
                    <button className="btn !py-1.5 !px-4 text-xs" onClick={reconnect}>Reconectar y aceptar permisos</button>
                    <a className="btn btn-o !py-1.5 !px-4 text-xs" href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer">Abrir Dashboard</a>
                  </div>
                  <p className="mt-2" style={{ color: 'var(--m)' }}>En Dashboard → tu app → User Management agrega tu correo (modo Development bloquea a no registrados con 403).</p>
                </div>
              ) : null}

              {tab === 'search' && (
                <form onSubmit={runSearch} className="flex gap-2 mb-2.5">
                  <div className="relative flex-1">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--m)' }} />
                    <input className="inp !pl-9" placeholder="Buscar en Spotify…" value={q} onChange={(e) => setQ(e.target.value)} />
                  </div>
                  <button className="btn !px-4" disabled={loading}>{loading ? <Loader2 size={15} className="animate-spin" /> : 'Ir'}</button>
                </form>
              )}
              {tab === 'playlists' && !!playlists.length && (
                <div className="grid gap-2 mb-2.5">
                  {playlists.map((pl) => (
                    <button key={pl.id} className="flex items-center gap-3 p-2 rounded-2xl text-left hover:opacity-90"
                      style={{ background: 'var(--s2)' }}
                      onClick={async () => {
                        setLoading(true); setErr('');
                        try {
                          const tracks = await getSpotifyPlaylistTracks(pl.id, 30);
                          setItems(tracks);
                          setTab('search');
                          if (!tracks.length) toast?.('Playlist vacía o privada');
                        } catch (e) {
                          fail(e, 'No se pudo abrir playlist');
                        } finally {
                          setLoading(false);
                        }
                      }}>
                      <Cover src={pl.art} className="w-11 h-11 !rounded-xl shrink-0" iconSize={16} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold truncate">{pl.name}</span>
                        <span className="block text-[11px] truncate" style={{ color: 'var(--m)' }}>{pl.count} temas</span>
                      </span>
                      <ListMusic size={16} style={{ color: 'var(--m)' }} />
                    </button>
                  ))}
                </div>
              )}
              {(tab !== 'playlists' || items.length > 0) && (
                <div className="grid gap-1.5 max-h-80 overflow-y-auto pr-0.5">
                  {!items.length && !loading && !err && (
                    <p className="text-xs" style={{ color: 'var(--m)' }}>
                      {tab === 'liked' ? 'Toca Liked para cargar tus ♥.' : 'Busca algo para empezar.'}
                    </p>
                  )}
                  {loading && !items.length && (
                    <p className="text-xs inline-flex items-center gap-2" style={{ color: 'var(--m)' }}><Loader2 size={13} className="animate-spin" /> Cargando Spotify…</p>
                  )}
                  {items.map((sp) => (
                    <div key={sp.id} className="flex items-center gap-2 p-1.5 rounded-2xl" style={{ background: 'var(--s2)' }}>
                      <Cover src={sp.art} className="w-10 h-10 !rounded-lg shrink-0" iconSize={14} />
                      <button onClick={() => playSpotify(sp)} className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-semibold truncate">{sp.title}</p>
                        <p className="text-[11px] truncate" style={{ color: 'var(--m)' }}>{sp.artist}{sp.album ? ` · ${sp.album}` : ''}</p>
                      </button>
                      {resolvingId === sp.id
                        ? <Loader2 size={15} className="animate-spin shrink-0" />
                        : <button className="ico-btn" onClick={() => playSpotify(sp)} aria-label={`Reproducir ${sp.title}`}><Play size={15} /></button>}
                      {sp.external_url && (
                        <a href={sp.external_url} target="_blank" rel="noreferrer" className="ico-btn" aria-label="Abrir en Spotify"><ExternalLink size={14} /></a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
