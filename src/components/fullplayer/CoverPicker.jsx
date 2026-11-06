import { useEffect, useRef, useState } from 'react';
import { Search, Loader2, ImageIcon, RotateCcw, Check, Sparkles } from 'lucide-react';
import { searchCoverCandidates } from '../../services/coverSearch';
import { cleanTrack } from '../../services/covers';
import { Sheet } from './ui';

const MODES = [['both', 'Canción + artista'], ['title', 'Solo canción'], ['artist', 'Solo artista']];
const cleanArtist = (s) => String(s || '').replace(/\s*-\s*topic\s*$/i, '').replace(/vevo\s*$/i, '').trim();

/** Buscador de carátulas oficiales (Deezer · iTunes · MusicBrainz/Cover Art Archive).
 *  Al elegir una, cambia YA en el reproductor (fondo y colores incluidos) sin tocar el audio.
 *  Se recuerda para esa canción y se puede restaurar la anterior. */
export default function CoverPicker({ p, toast, onClose }) {
  const t = p.track;
  const [title, setTitle] = useState(() => cleanTrack(t?.title));
  const [artist, setArtist] = useState(() => cleanArtist(t?.artist));
  const [mode, setMode] = useState('both');
  const [st, setSt] = useState({ phase: 'idle', items: [], errors: [] });
  const [bad, setBad] = useState(() => new Set()); // imágenes que no cargaron (se ocultan)
  const ctrl = useRef(null);

  const run = (m = mode) => {
    ctrl.current?.abort();
    const c = new AbortController(); ctrl.current = c;
    setSt({ phase: 'loading', items: [], errors: [] }); setBad(new Set());
    searchCoverCandidates({ title, artist, mode: m, signal: c.signal }).then((r) => { if (!c.signal.aborted) setSt({ phase: 'done', ...r }); });
  };
  useEffect(() => { run('both'); return () => ctrl.current?.abort(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = st.items.filter((x) => !bad.has(x.id));
  const current = t?.art;
  const apply = (x) => { if (p.setArt(x.url, { album: x.album, source: x.source })) toast?.(`Carátula aplicada · ${x.album || x.source}`, ImageIcon); };
  const restore = () => { toast?.(p.restoreArt() ? 'Carátula anterior restaurada' : 'No hay carátula anterior', ImageIcon); };
  const best = () => { if (visible[0]) apply(visible[0]); };
  const inp = 'w-full rounded-xl px-3 h-11 text-[15px] outline-none bg-white/12 placeholder:text-white/40 focus:bg-white/18';

  return (
    <Sheet title="Cambiar carátula" onClose={onClose} wide full>
      <p className="text-[13px] text-white/65 mb-3">Elige la carátula oficial. El audio sigue sonando sin interrupciones.</p>
      <form onSubmit={(e) => { e.preventDefault(); run(); }} className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inp} placeholder="Canción" aria-label="Nombre de la canción" disabled={mode === 'artist'} style={mode === 'artist' ? { opacity: 0.45 } : undefined} />
          <input value={artist} onChange={(e) => setArtist(e.target.value)} className={inp} placeholder="Artista" aria-label="Nombre del artista" disabled={mode === 'title'} style={mode === 'title' ? { opacity: 0.45 } : undefined} />
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          {MODES.map(([id, label]) => (
            <button type="button" key={id} onClick={() => { setMode(id); run(id); }} aria-pressed={mode === id} className="px-3 h-9 rounded-full text-[12px] font-semibold" style={mode === id ? { background: '#fff', color: '#111' } : { background: 'rgba(255,255,255,.16)' }}>{label}</button>
          ))}
          <button type="submit" className="ml-auto px-4 h-9 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5" style={{ background: '#fff', color: '#111' }}><Search size={14} /> Buscar</button>
        </div>
      </form>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <button onClick={best} disabled={!visible.length} className="px-3 h-9 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 bg-white/16 disabled:opacity-40"><Sparkles size={13} /> Usar la mejor coincidencia</button>
        <button onClick={restore} disabled={!t?.artCustom} className="px-3 h-9 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 bg-white/16 disabled:opacity-40"><RotateCcw size={13} /> Restaurar anterior</button>
        <button onClick={() => p.setAutoCover(!p.autoCover)} role="switch" aria-checked={!!p.autoCover} className="ml-auto flex items-center gap-2 text-[12px] font-semibold">
          Automático
          <span className="w-10 h-6 rounded-full relative transition-colors" style={{ background: p.autoCover ? '#34c759' : 'rgba(255,255,255,.25)' }}><span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: p.autoCover ? 18 : 2 }} /></span>
        </button>
      </div>
      <p className="text-[11px] text-white/50 mt-1">{p.autoCover ? 'Hermes busca solo la carátula oficial cuando suena una versión de YouTube.' : 'Búsqueda automática desactivada: solo cambia cuando tú elijas.'}</p>

      <div className="mt-4" aria-live="polite">
        {st.phase === 'loading' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="status" aria-label="Buscando carátulas">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="aspect-square rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,.12)' }} />)}
          </div>
        )}
        {st.phase === 'done' && !visible.length && (
          <div className="text-center py-8">
            <ImageIcon size={30} className="mx-auto mb-2 opacity-70" />
            <p className="text-[15px] font-semibold">{st.errors.length >= 3 ? 'No se pudo conectar con las fuentes' : 'No encontramos carátulas'}</p>
            <p className="text-[13px] text-white/60 mt-1">{st.errors.length >= 3 ? 'Revisa tu conexión e inténtalo de nuevo.' : 'Prueba con «Solo canción» o «Solo artista», o corrige los nombres.'}</p>
            <button onClick={() => run()} className="mt-3 px-4 h-10 rounded-full text-[13px] font-semibold bg-white/16">Reintentar</button>
          </div>
        )}
        {st.phase === 'done' && visible.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {visible.map((x) => {
                const on = current === x.url;
                return (
                  <button key={x.id} onClick={() => apply(x)} aria-pressed={on} aria-label={`Usar carátula de ${x.album || x.artist}, ${x.source}`} className="text-left group active:scale-[.97] transition">
                    <span className="relative block aspect-square rounded-xl overflow-hidden bg-white/10" style={on ? { outline: '3px solid #fff', outlineOffset: 2 } : undefined}>
                      <img src={x.thumb || x.url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="w-full h-full object-cover"
                        onError={() => setBad((s) => new Set(s).add(x.id))} />
                      {on && <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full grid place-items-center bg-white text-black"><Check size={14} /></span>}
                      <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,.6)' }}>{x.size}</span>
                    </span>
                    <span className="block mt-1.5 text-[13px] font-semibold truncate">{x.album || 'Sin título de álbum'}</span>
                    <span className="block text-[11px] text-white/55 truncate">{x.artist}{x.year ? ` · ${x.year}` : ''} · {x.source}</span>
                  </button>
                );
              })}
            </div>
            {st.errors.length > 0 && <p className="text-[11px] text-white/45 mt-3">No respondió: {st.errors.join(', ')}. Los demás resultados sí se muestran.</p>}
          </>
        )}
        {st.phase === 'loading' && <p className="sr-only"><Loader2 /> Buscando</p>}
      </div>
    </Sheet>
  );
}
