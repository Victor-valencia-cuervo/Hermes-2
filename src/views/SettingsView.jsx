import { useState } from 'react';
import { Moon, Sun, Disc3, Cloud, CloudOff, CloudRain, LogIn, LogOut, Download, AudioLines, Music2, Check, Trash2, Maximize2 } from 'lucide-react';
import Title from '../components/Title';
import CloudStatus from '../components/CloudStatus';
import { ACCENTS } from '../data/constants';
import { DL_TOOLS } from '../lib/dltools';
import useStore from '../hooks/useStore';
import PetsSettings from '../pets/PetsSettings';
import { WidgetManager } from '../widgets/WidgetUI';
import { useNavigate } from 'react-router-dom';
import { validateLBToken } from '../services/scrobble';
import { loginSpotify, disconnectSpotify, spotifyConnected } from '../services/spotify';

export default function SettingsView({ dark, setDark, accent, setAccent, name, setName, pets, setPets, toast, autoLand, setAutoLand, wxAlerts, setWxAlerts, auth, cloud }) {
  const user = auth?.user || null;
  const navigate = useNavigate();
  const [dlTool, setDlTool] = useStore('h_dl_tool', 'savefrom');
  const [lbToken, setLbToken] = useStore('h_lb_token', '');
  const [lbState, setLbState] = useState(null); // null | checking | ok | bad
  const [spTick, setSpTick] = useState(0);
  const spOn = spotifyConnected();
  const [playerThemeRaw, setPlayerTheme] = useStore('h_player_theme', 'apple-1'); // apple-1 (inmersivo) | apple-2 (en cuadro)
  const playerTheme = playerThemeRaw === 'apple-2' || playerThemeRaw === 'hermes-03' || playerThemeRaw === 'spotify' ? 'apple-2' : 'apple-1';
  const [lyricsFont, setLyricsFont] = useStore('h_lyrics_font', 'apple'); // apple (sans) | hermes (serif de Hermes)
  const [autoCover, setAutoCover] = useStore('h_auto_cover', true);
  const [miniTheme, setMiniTheme] = useStore('h_mini_theme', 'float'); // float | bar | light
  const [clips, setClips] = useStore('h_clips', true); // clips de video de la canción en el reproductor
  const [heroVideo, setHeroVideo] = useStore('h_hero_video', true); // video de fondo en el hero de música
  const [fsBtn, setFsBtn] = useStore('h_fs_btn', true); // botón de pantalla completa en la cabecera
  const checkLB = async () => {
    if (!lbToken.trim()) { toast?.('Pega tu token ListenBrainz primero'); return; }
    setLbState('checking');
    const r = await validateLBToken(lbToken.trim());
    setLbState(r.ok ? 'ok' : 'bad');
    toast?.(r.ok ? 'ListenBrainz conectado: scrobbling activo' : `Token inválido (${r.msg})`);
  };
  return (
    <>
      <Title>Ajustes</Title>
      <div className="card">
        <p className="text-sm mb-1 font-semibold flex items-center gap-2">
          {cloud?.configured ? <Cloud size={16} style={{ color: 'var(--a)' }} /> : <CloudOff size={16} />}
          Cuenta y respaldo
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--m)' }}>
          {user
            ? `Conectado como ${user.email || user.user_metadata?.full_name || 'Google'} · respaldo en Supabase`
            : cloud?.configured
              ? 'Modo local · entra para respaldar en la nube'
              : 'Modo local · configura Supabase en .env para respaldo'}
        </p>
        {cloud?.pending > 0 && (
          <p className="text-xs mb-3" style={{ color: 'var(--m)' }}>
            {cloud.pending} cambios por subir{cloud.online ? '' : ' (sin internet)'}.
          </p>
        )}
        {auth && (
          <div className="flex items-center gap-2 flex-wrap">
            {user ? (
              <button className="btn btn-o flex-1" onClick={() => auth.logout()}>
                <LogOut size={15} /> Salir
              </button>
            ) : (
              <button className="btn flex-1" onClick={() => auth.login()} disabled={!cloud?.configured}>
                <LogIn size={15} /> Entrar con Google
              </button>
            )}
            <CloudStatus sync={cloud} inline />
          </div>
        )}
      </div>
      <WidgetManager onEditHome={() => navigate('/?editar=1')} />
      <div className="card flex items-center justify-between">
        <span className="flex items-center gap-3 text-sm">{dark ? <Moon size={18} /> : <Sun size={18} />}Tema oscuro</span>
        <button onClick={() => setDark(!dark)} role="switch" aria-checked={dark} aria-label="Tema oscuro" className="w-12 h-7 rounded-full relative transition-colors" style={{ background: dark ? 'var(--a)' : 'var(--s2)', border: '1px solid var(--bd)' }}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${dark ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>
      <div className="card">
        <p className="text-sm mb-3">Color de acento</p>
        <div className="flex gap-3 flex-wrap">
          {ACCENTS.map((c) => <button key={c} onClick={() => setAccent(c)} aria-label={`Acento ${c}`} className="w-10 h-10 rounded-full" style={{ background: c, outline: accent === c ? '2px solid var(--t)' : 'none', outlineOffset: 2 }} />)}
        </div>
      </div>
      <div className="card">
        <p className="text-sm mb-1 font-semibold">Estilo del reproductor</p>
        <p className="text-xs mb-3" style={{ color: 'var(--m)' }}>Dos diseños con las mismas funciones. Cambia sin cortar la música.</p>
        <p className="text-xs mb-1 font-semibold">Sonando full</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[['apple-1', 'Tema 1 · inmersivo'], ['apple-2', 'Tema 2 · en cuadro']].map(([id, label]) => (
            <button key={id} onClick={() => { setPlayerTheme(id); toast?.(`Sonando: ${label}`); }}
              className={`flex-1 px-3 py-2 rounded-full text-xs font-semibold ${playerTheme === id ? 'btn' : 'btn btn-o'}`}>{label}</button>
          ))}
        </div>
        <p className="text-xs mb-1 font-semibold">Tipografía de la letra</p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[['apple', 'Moderna (Apple Music)'], ['hermes', 'Hermes (serif)']].map(([id, label]) => (
            <button key={id} onClick={() => setLyricsFont(id)} aria-pressed={lyricsFont === id}
              className={`flex-1 px-3 py-2 rounded-full text-xs font-semibold ${lyricsFont === id ? 'btn' : 'btn btn-o'}`}>{label}</button>
          ))}
        </div>
        <button onClick={() => setAutoCover(!autoCover)} role="switch" aria-checked={!!autoCover} className="w-full flex items-center justify-between gap-3 mb-3 text-left">
          <span><span className="block text-xs font-semibold">Buscar la carátula oficial automáticamente</span><span className="block text-xs" style={{ color: 'var(--m)' }}>Cambia la imagen de YouTube por la del lanzamiento original. El audio no cambia.</span></span>
          <span className="w-11 h-6 rounded-full relative shrink-0" style={{ background: autoCover ? 'var(--a)' : 'var(--bd)' }}><span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: autoCover ? 22 : 2 }} /></span>
        </button>
        <button onClick={() => setClips(!clips)} role="switch" aria-checked={!!clips} className="w-full flex items-center justify-between gap-3 mb-3 text-left">
          <span><span className="block text-xs font-semibold">Clips de video de la canción</span><span className="block text-xs" style={{ color: 'var(--m)' }}>De vez en cuando, unos segundos del video real sobre la carátula (sin sonido). Gasta algo de datos.</span></span>
          <span className="w-11 h-6 rounded-full relative shrink-0" style={{ background: clips ? 'var(--a)' : 'var(--bd)' }}><span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: clips ? 22 : 2 }} /></span>
        </button>
        <button onClick={() => setHeroVideo(!heroVideo)} role="switch" aria-checked={!!heroVideo} className="w-full flex items-center justify-between gap-3 mb-3 text-left">
          <span><span className="block text-xs font-semibold">Video de fondo en «Sonando ahora»</span><span className="block text-xs" style={{ color: 'var(--m)' }}>En Música, la tarjeta de arriba usa el video de la canción (sin sonido) en lugar de la carátula de fondo.</span></span>
          <span className="w-11 h-6 rounded-full relative shrink-0" style={{ background: heroVideo ? 'var(--a)' : 'var(--bd)' }}><span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: heroVideo ? 22 : 2 }} /></span>
        </button>
        <p className="text-xs mb-1 font-semibold">Mini reproductor</p>
        <div className="flex gap-2 flex-wrap">
          {[['float', 'Flotante'], ['bar', 'Barra Spotify'], ['light', 'Spotify claro/oscuro']].map(([id, label]) => (
            <button key={id} onClick={() => { setMiniTheme(id); toast?.(`Mini: ${label}`); }}
              className={`flex-1 px-3 py-2 rounded-full text-xs font-semibold ${miniTheme === id ? 'btn' : 'btn btn-o'}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="card">
        <p className="text-sm mb-3">Tu nombre</p>
        <input className="inp" value={name} placeholder="Sin nombre" onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="card flex items-center justify-between gap-3">
        <span className="flex items-center gap-3 text-sm">
          <Maximize2 size={18} style={{ color: 'var(--a)' }} />
          <span>Botón de pantalla completa<span className="block text-[11px]" style={{ color: 'var(--m)' }}>Muéstralo u ocúltalo en la barra de arriba</span></span>
        </span>
        <button onClick={() => { setFsBtn(!fsBtn); toast?.(fsBtn ? 'Botón de pantalla completa oculto' : 'Botón de pantalla completa activo'); }} role="switch" aria-checked={!!fsBtn} aria-label="Botón de pantalla completa" className="w-12 h-7 rounded-full relative transition-colors shrink-0" style={{ background: fsBtn ? 'var(--a)' : 'var(--s2)', border: '1px solid var(--bd)' }}>
          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${fsBtn ? 'left-6' : 'left-0.5'}`} />
        </button>
      </div>
      {setAutoLand && (
        <div className="card flex items-center justify-between gap-3">
          <span className="flex items-center gap-3 text-sm">
            <Disc3 size={18} style={{ color: 'var(--a)' }} />
            <span>Abrir Sonando al girar el celular<span className="block text-[11px]" style={{ color: 'var(--m)' }}>Solo música, se cierra al volver a vertical</span></span>
          </span>
          <button onClick={() => setAutoLand(!autoLand)} role="switch" aria-checked={!!autoLand} aria-label="Abrir Sonando al girar" className="w-12 h-7 rounded-full relative transition-colors shrink-0" style={{ background: autoLand ? 'var(--a)' : 'var(--s2)', border: '1px solid var(--bd)' }}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${autoLand ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
      )}
      {setWxAlerts && (
        <div className="card flex items-center justify-between gap-3">
          <span className="flex items-center gap-3 text-sm">
            <CloudRain size={18} style={{ color: 'var(--a)' }} />
            <span>Avisos del clima<span className="block text-[11px]" style={{ color: 'var(--m)' }}>Lluvia, tormenta, calor, frío y UV · aquí y en notificaciones</span></span>
          </span>
          <button onClick={async () => {
            const on = !wxAlerts;
            // Fuera de la app avisa la notificación del sistema: pide permiso al activar.
            if (on && 'Notification' in window && Notification.permission === 'default') {
              try { await Notification.requestPermission(); } catch { /* sigue solo con sileo */ }
            }
            setWxAlerts(on);
            if (on) toast?.('Avisos del clima activados', CloudRain);
          }} role="switch" aria-checked={!!wxAlerts} aria-label="Avisos del clima" className="w-12 h-7 rounded-full relative transition-colors shrink-0" style={{ background: wxAlerts ? 'var(--a)' : 'var(--s2)', border: '1px solid var(--bd)' }}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${wxAlerts ? 'left-6' : 'left-0.5'}`} />
          </button>
        </div>
      )}
      <div className="card">
        <p className="text-sm mb-1 font-semibold flex items-center gap-2">
          <Download size={16} style={{ color: 'var(--a)' }} />
          Descargar MP3 de YouTube
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--m)' }}>
          En ⋮ de una canción → Descargar MP3: se copia el link y se abre la herramienta. Pégalo ahí, baja el MP3 dentro de una carpeta ya escaneada (ej. Download) y al entrar aparece solo en Local.
        </p>
        <div className="flex rounded-full p-0.5" style={{ background: 'var(--s2)' }} role="radiogroup" aria-label="Herramienta de descarga">
          {Object.entries(DL_TOOLS).map(([id, tool]) => (
            <button key={id} role="radio" aria-checked={dlTool === id} onClick={() => { setDlTool(id); toast?.(`Herramienta: ${tool.name}`, Download); }}
              className={`flex-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold ${dlTool === id ? 'text-white' : ''}`}
              style={dlTool === id ? { background: 'var(--a)' } : { color: 'var(--m)' }}>{tool.name}</button>
          ))}
        </div>
      </div>
      <PetsSettings pets={pets} setPets={setPets} toast={toast} />
      <div className="card">
        <p className="text-sm mb-1 font-semibold flex items-center gap-2">
          <AudioLines size={16} style={{ color: 'var(--a)' }} />
          Scrobble ListenBrainz
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--m)' }}>
          Registra lo que escuchas (a los 30s del tema). El token queda solo en este dispositivo, nunca se sube al repo.
          Consíguelo en listenbrainz.org → Settings → Add Token.
        </p>
        <div className="flex gap-2">
          <input type="password" className="inp flex-1" value={lbToken} placeholder="Token ListenBrainz"
            onChange={(e) => { setLbToken(e.target.value); setLbState(null); }} autoComplete="off" />
          <button className="btn" onClick={checkLB}>{lbState === 'checking' ? '…' : lbState === 'ok' ? <Check size={15} /> : 'Validar'}</button>
          {!!lbToken && (
            <button className="btn btn-o" onClick={() => { setLbToken(''); setLbState(null); toast?.('Token borrado'); }} aria-label="Borrar token"><Trash2 size={15} /></button>
          )}
        </div>
        {lbState === 'ok' && <p className="text-xs mt-2" style={{ color: 'var(--a)' }}>Conectado · scrobbling activo</p>}
        {lbState === 'bad' && <p className="text-xs mt-2" style={{ color: '#f87171' }}>Token inválido · genera uno nuevo en ListenBrainz</p>}
      </div>
      <div className="card" key={spTick}>
        <p className="text-sm mb-1 font-semibold flex items-center gap-2">
          <Music2 size={16} style={{ color: '#1DB954' }} />
          Spotify: descubrir e importar
        </p>
        <p className="text-xs mb-3" style={{ color: 'var(--m)' }}>
          {spOn
            ? 'Conectado · usa Buscar Spotify en Música para traer temas y resolverlos a YouTube.'
            : 'Conecta para buscar temas, ver tus Liked y playlists y reproducirlas vía YouTube. Solo lectura.'}
        </p>
        {spOn ? (
          <div className="flex gap-2">
            <button className="btn btn-o flex-1" onClick={() => { disconnectSpotify(); setSpTick((x) => x + 1); toast?.('Spotify desconectado'); }}>Desconectar</button>
            <button className="btn flex-1" onClick={() => { window.location.hash = '#/music-spotify'; toast?.('Ve a Música → Buscar Spotify'); }}>Ir a importar</button>
          </div>
        ) : (
          <button className="btn flex-1 w-full" onClick={() => loginSpotify()}>
            Conectar Spotify
          </button>
        )}
        <p className="text-[11px] mt-2" style={{ color: 'var(--m)' }}>
          Si falla en local, agrega http://localhost:5173/ en Dashboard → Redirect URIs.
        </p>
      </div>
    </>
  );
}
