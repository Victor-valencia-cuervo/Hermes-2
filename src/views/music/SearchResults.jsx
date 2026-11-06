import { useEffect, useMemo, useState } from 'react';
import { SearchX } from 'lucide-react';
import TrackRow from '../../components/TrackRow';
import { Section, Shelf, SquareCard, ArtistBubble, SongRow, BackBar, Chips, ShelfSkeleton, RowsSkeleton } from './ui';
import { bestArtistFor, getArtistBundle, artistPath, albumPath } from '../../services/catalog';
import { isNow } from './helpers';
import { setPageContext } from '../../lib/playContext';

const TABS = [['all', 'Todo'], ['songs', 'Canciones'], ['artists', 'Artistas'], ['albums', 'Álbumes'], ['videos', 'Videos']];

/** Resultados de búsqueda estilo Spotify: mejor resultado, canciones, artistas con foto real,
 *  álbumes y últimos lanzamientos en carruseles, y debajo las canciones y videos que coinciden. */
export default function SearchResults({ q, cat, catLoading, videos, videosLoading, fuente, ctx, fallback }) {
  const { p, nav, playEntry, resolvingId, openMenu, onBack } = ctx;
  const [tab, setTab] = useState('all');
  useEffect(() => { setTab('all'); }, [q]);
  useEffect(() => { setPageContext({ from: 'Buscar', title: q }); return () => setPageContext(null); }, [q]);

  const best = useMemo(() => bestArtistFor(q, cat.artists), [q, cat.artists]);
  const [bundle, setBundle] = useState(null);
  useEffect(() => {
    setBundle(null);
    if (!best) return undefined;
    let dead = false;
    getArtistBundle(best.ref).then((b) => { if (!dead) setBundle(b); }).catch(() => {});
    return () => { dead = true; };
  }, [best?.ref]); // eslint-disable-line react-hooks/exhaustive-deps

  // Canciones: las del artista buscado primero (como Spotify), después el resto.
  const tracks = useMemo(() => {
    if (!best) return cat.tracks;
    const mine = cat.tracks.filter((t) => t.artistRef === best.ref);
    const rest = cat.tracks.filter((t) => t.artistRef !== best.ref);
    return [...mine, ...rest];
  }, [cat.tracks, best]);

  const latest = bundle?.latest || [];
  const latestRefs = new Set(latest.map((a) => a.ref));
  const albumsRest = cat.albums.filter((a) => !latestRefs.has(a.ref));
  const allAlbums = [...latest, ...albumsRest];
  const hasAny = cat.artists.length || cat.albums.length || cat.tracks.length || videos.length;
  const loading = catLoading && !hasAny;

  const trackRow = (t, i, list, n) => {
    const on = isNow(p.track, t);
    return (
      <SongRow key={t.id} n={n} art={t.art} title={t.title} sub={`${t.artist}${t.album ? ` · ${t.album}` : ''}`} duration={t.duration} explicit={t.explicit}
        active={on} playing={p.playing} loading={resolvingId === t.id}
        onPlay={() => (on ? p.openFull?.() : playEntry(t))}
        onMenu={() => openMenu({ ...t, source: 'YouTube' }, list, { kind: 'chart', onPlay: playEntry })} />
    );
  };

  const albumCards = (list) => list.map((a) => (
    <SquareCard key={a.ref} art={a.art} title={a.title} sub={`${a.year || ''}${a.year && a.artist ? ' · ' : ''}${a.artist}`} onClick={() => nav(albumPath(a))} />
  ));

  const videosBlock = !!videos.length && (
    <Section title="Videos">
      <div className="space-y-0.5">
        {videos.map((t) => (
          <TrackRow key={t.id} t={t} p={p} list={videos} asRadio={fuente === 'youtube' ? true : undefined}
            onMenu={(x) => openMenu(x, videos, { asRadio: fuente === 'youtube' ? true : undefined, kind: fuente })} />
        ))}
      </div>
    </Section>
  );

  return (
    <div className="space-y-7">
      <BackBar title={`“${q}”`} onBack={onBack} />
      <Chips items={TABS} value={tab} onChange={setTab} counts={{ songs: tracks.length, artists: cat.artists.length, albums: allAlbums.length, videos: videos.length }} />

      {loading && (
        <div className="space-y-3">
          <div className="skel h-4 w-28 ml-1" />
          <RowsSkeleton n={9} />
        </div>
      )}

      {!loading && !hasAny && !videosLoading && (
        <div className="card text-center py-10">
          <SearchX size={34} className="mx-auto mb-3" style={{ color: 'var(--m)' }} />
          <p className="serif text-2xl font-semibold">Sin resultados para “{q}”</p>
          <p className="text-sm mt-1" style={{ color: 'var(--m)' }}>Revisa la ortografía o prueba con otro artista o canción.</p>
        </div>
      )}
      {!hasAny && !loading && !!fallback?.length && (
        <Section title="Recomendado para ti">
          <div className="space-y-0.5">{fallback.slice(0, 6).map((t, i) => trackRow(t, i, fallback, i + 1))}</div>
        </Section>
      )}

      {/* ---- TODO: una sola lista de Canciones (la mejor coincidencia va de primera) y los Álbumes.
           Artistas, videos y lo demás solo aparecen con sus filtros. ---- */}
      {tab === 'all' && !loading && hasAny > 0 && (
        <>
          {tracks.length > 0 && (
            <Section title="Canciones" action={tracks.length > 10 ? <button className="text-xs px-3 py-2 rounded-full" style={{ color: 'var(--a)' }} onClick={() => setTab('songs')}>Ver todas</button> : null}>
              <div className="space-y-0.5">{tracks.slice(0, 10).map((t, i) => trackRow(t, i, tracks, null))}</div>
            </Section>
          )}

          {allAlbums.length > 0 && (
            <Section title="Álbumes" action={allAlbums.length > 8 ? <button className="text-xs px-3 py-2 rounded-full" style={{ color: 'var(--a)' }} onClick={() => setTab('albums')}>Ver todos</button> : null}>
              <Shelf>{albumCards(allAlbums.slice(0, 14))}</Shelf>
            </Section>
          )}

          {!tracks.length && !allAlbums.length && (
            <p className="text-sm px-1" style={{ color: 'var(--m)' }}>Sin canciones ni álbumes. Prueba los filtros de Artistas o Videos.</p>
          )}
        </>
      )}

      {/* ---- SOLO CANCIONES ---- */}
      {tab === 'songs' && !loading && (
        <div className="space-y-0.5">
          {tracks.map((t, i) => trackRow(t, i, tracks, null))}
          {!tracks.length && <p className="text-sm p-3" style={{ color: 'var(--m)' }}>Sin canciones para esta búsqueda.</p>}
        </div>
      )}
      {tab === 'artists' && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-6 gap-x-3 justify-items-center">
          {cat.artists.map((a) => <ArtistBubble key={a.ref} artist={a} size="md" onClick={() => nav(artistPath(a))} />)}
          {!cat.artists.length && <p className="text-sm col-span-full" style={{ color: 'var(--m)' }}>Sin artistas para esta búsqueda.</p>}
        </div>
      )}
      {tab === 'albums' && !loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-y-5 gap-x-3 justify-items-center">
          {[...latest.filter((a) => !cat.albums.some((x) => x.ref === a.ref)), ...cat.albums].map((a) => (
            <SquareCard key={a.ref} art={a.art} title={a.title} sub={`${a.year || ''}${a.year && a.artist ? ' · ' : ''}${a.artist}`} onClick={() => nav(albumPath(a))} />
          ))}
          {!cat.albums.length && <p className="text-sm col-span-full" style={{ color: 'var(--m)' }}>Sin álbumes para esta búsqueda.</p>}
        </div>
      )}
      {tab === 'videos' && (
        <>
          {videosBlock}
          {videosLoading && <RowsSkeleton n={4} />}
          {!videosLoading && !videos.length && <p className="text-sm" style={{ color: 'var(--m)' }}>Sin videos para esta búsqueda.</p>}
        </>
      )}
      {tab === 'songs' && videosBlock}
    </div>
  );
}
