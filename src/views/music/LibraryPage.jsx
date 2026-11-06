import { useMemo } from 'react';
import { Plus, LayoutGrid, List, Pin } from 'lucide-react';
import Cover from '../../components/Cover';
import Marquee from '../../components/Marquee';
import useStore from '../../hooks/useStore';
import { FAV_ART, playlistArt } from '../../lib/vectorArt';

/** Biblioteca (estilo Spotify): solo el cuadro de Tus Me Gusta (fijado arriba) y las playlists que tú creas.
 *  Cuadrícula o lista. Buscar ya tiene su propio acceso en el menú, así que aquí no se repite. */
export default function LibraryPage({ p, playlists = [], plStats = {}, onCreate, openPl }) {
  const [view, setView] = useStore('h_lib_view', 'list');
  const favs = p.favs || [];
  const grid = view === 'grid';

  const items = useMemo(() => [
    { key: 'fav', pinned: true, title: 'Tus Me Gusta', sub: `Playlist · ${favs.length} canciones`, art: FAV_ART, onOpen: () => openPl('fav') },
    ...[...playlists].sort((a, b) => ((plStats[b.id] || 0) - (plStats[a.id] || 0)) || (b.tracks.length - a.tracks.length)).map((pl) => ({
      key: pl.id, title: pl.name, sub: `Playlist · ${pl.tracks.length} canciones`, art: pl.tracks[0]?.art || playlistArt(pl.name, pl.color), onOpen: () => openPl(pl.id),
    })),
  ], [favs.length, playlists, plStats]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between pt-1">
        <h2 className="serif text-4xl tracking-wide">Biblioteca</h2>
        <div className="flex items-center gap-1">
          <button className="ico-btn" aria-label={grid ? 'Ver como lista' : 'Ver como cuadrícula'} onClick={() => setView(grid ? 'list' : 'grid')}>{grid ? <List size={20} /> : <LayoutGrid size={20} />}</button>
          <button className="ico-btn" aria-label="Crear playlist" onClick={onCreate}><Plus size={23} /></button>
        </div>
      </div>

      {grid ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-5">
          {items.map((i) => (
            <button key={i.key} onClick={i.onOpen} className="text-left active:scale-[.97] transition-transform min-w-0">
              <Cover src={i.art} alt="" className="w-full aspect-square rounded-2xl shadow-lg" iconSize={30} />
              <Marquee className="text-[14px] font-semibold mt-2">{i.title}</Marquee>
              <p className="text-[12px] truncate flex items-center gap-1" style={{ color: 'var(--m)' }}>{i.pinned && <Pin size={11} style={{ color: 'var(--a)' }} fill="currentColor" />}{i.sub}</p>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-0.5">
          {items.map((i) => (
            <button key={i.key} onClick={i.onOpen} className="w-full flex items-center gap-3.5 px-1.5 py-2 text-left rounded-2xl hover:bg-[var(--s2)] active:scale-[.99] transition">
              <Cover src={i.art} alt="" className="w-16 h-16 shrink-0 rounded-xl" iconSize={22} />
              <span className="flex-1 min-w-0">
                <Marquee className="text-[15px] font-semibold">{i.title}</Marquee>
                <span className="flex items-center gap-1.5 text-[12.5px] mt-0.5" style={{ color: 'var(--m)' }}>
                  {i.pinned && <Pin size={12} style={{ color: 'var(--a)' }} fill="currentColor" />}<span className="truncate">{i.sub}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
      {playlists.length === 0 && <p className="text-sm px-1" style={{ color: 'var(--m)' }}>Crea tu primera playlist con el botón +.</p>}
    </div>
  );
}
