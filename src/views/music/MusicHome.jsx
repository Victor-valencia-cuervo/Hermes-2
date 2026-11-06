import { useMemo, useState } from 'react';
import { Play, Pause, Loader2, Plus, Shuffle, Heart } from 'lucide-react';
import Cover from '../../components/Cover';
import Marquee from '../../components/Marquee';
import { Section, SectionTitle, Shelf, SquareCard, SongRow, ShelfSkeleton, RowsSkeleton } from './ui';
import { PlaylistCard, RoomPlCard } from './RoomCards';
import HeroCarousel from './HeroCarousel';
import { FilterMenu, HistoryRow, TrendRow, AlbumTile } from './FigmaBits';
import { CATEGORIES, MOODS } from './data';
import { albumPath, artistPath } from '../../services/catalog';
import { getFollowed } from '../../lib/follow';
import { CHART_COUNTRIES } from '../../services/charts';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, '').trim();
const keyOf = (t) => `${norm(t?.title)}|${norm(String(t?.artist || '').split(',')[0])}`;
const mainArtist = (a) => String(a || '').split(/,| & | feat\.?| ft\.?| x /i)[0].trim();

function ago(ts) {
  if (!ts) return '';
  const m = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

/** Pantalla de inicio de música. Todo sale de datos reales: tu historial, tus playlists,
 *  los charts de iTunes/Deezer y búsquedas de YouTube. Nada inventado ni repetido entre secciones. */
export default function MusicHome({ h }) {
  const { p, toast, nav, fuente, resolvingId, playEntry, playTrack, openMenu, goSearch, openCategory, openPl, onCreatePl,
    recs, recAlbums, charts, chartsLoading, cc, changeCountry, randomSongs, randomLoading, reshuffle,
    popTracks, popAlbums, audTrend, roomPls, peers, myAvatar, onOpenRoom, openRoom, pls, plStats, heroList, favEntry } = h;
  const [replayF, setReplayF] = useState('all');
  const [histF, setHistF] = useState('recent');
  const [showAll, setShowAll] = useState(false);

  // ---- Volver a escuchar: Me gusta + lo que más oyes + álbumes de tus artistas + tus playlists + Crear ----
  const replay = useMemo(() => {
    const hist = p.history || [];
    const count = new Map();
    const first = new Map();
    for (const t of hist) { const k = keyOf(t); count.set(k, (count.get(k) || 0) + 1); if (!first.has(k)) first.set(k, t); }
    // Más escuchadas primero; a igualdad, la más reciente (orden de aparición en el historial).
    return [...first.entries()].sort((a, b) => (count.get(b[0]) - count.get(a[0]))).map(([, t]) => t).slice(0, 10);
  }, [p.history]);

  // Historial (Figma): 5 filas por columna; 1 columna en celular, 2 en tablet, 3 en PC.
  const histList = useMemo(() => {
    const list = (p.history || []).slice(0, 60);
    if (histF === 'top') {
      const c = new Map(); const f = new Map();
      for (const t of list) { const k = keyOf(t); c.set(k, (c.get(k) || 0) + 1); if (!f.has(k)) f.set(k, t); }
      return [...f.entries()].sort((x, y) => c.get(y[0]) - c.get(x[0])).map(([, t]) => t).slice(0, 15);
    }
    const seen = new Set();
    return list.filter((t) => { const k = keyOf(t); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 15);
  }, [p.history, histF]);

  // ---- Sin repetir entre secciones de descubrimiento ----
  const used = new Set();
  const take = (list, n) => {
    const out = [];
    for (const t of list || []) {
      const k = keyOf(t);
      if (!k || used.has(k)) continue;
      used.add(k); out.push(t);
      if (out.length >= n) break;
    }
    return out;
  };
  const quick = take([...(recs || []), ...(popTracks || [])], 8);
  const discover = take(randomSongs, 12);
  const popular = take(popTracks, 14);

  // ---- Tendencias: datos simples calculados del chart real del país ----
  const trend = useMemo(() => {
    if (!charts?.length) return null;
    const art = new Map(); const gen = new Map();
    for (const c of charts) {
      const a = mainArtist(c.artist); if (a) art.set(a, (art.get(a) || 0) + 1);
      const g = c.genre; if (g && !/^music$/i.test(g)) gen.set(g, (gen.get(g) || 0) + 1);
    }
    const topA = [...art.entries()].sort((a, b) => b[1] - a[1])[0];
    const topG = [...gen.entries()].sort((a, b) => b[1] - a[1])[0];
    return { n1: charts[0], topA, topG, total: charts.length };
  }, [charts]);

  const play = (t, list) => (p.track?.id === t.id ? p.openFull?.() : (playTrack ? playTrack(t, list) : p.play(t, list)));
  const countryName = (CHART_COUNTRIES.find(([v]) => v === cc) || [cc, cc])[1];

  const hasReplay = !!(p.favs || []).length || getFollowed().length || replay.length || (recAlbums || []).length || pls.playlists.length;

  return (
    <div className="space-y-9">
      <HeroCarousel p={p} feats={heroList} onPlayFeat={h.playFeat} resolving={!!resolvingId} />

      {fuente === 'audius' && (
        <Section title="Tendencias en Audius" sub="Completas y descargables · catálogo independiente">
          <Shelf>
            {audTrend.map((c) => <SquareCard key={c.id} art={c.art} title={c.title} sub={c.artist} onClick={() => p.play(c, audTrend)} badge="Audius" label={`Reproducir ${c.title}`} />)}
            {!audTrend.length && <ShelfSkeleton n={4} />}
          </Shelf>
        </Section>
      )}

      {/* ===== Volver a escuchar ===== */}
      <Section title="Volver a escuchar" action={
        <FilterMenu value={replayF} onChange={setReplayF} options={[['all', 'Todo'], ['songs', 'Canciones'], ['albums', 'Álbumes'], ['playlists', 'Playlists'], ['artists', 'Artistas']]} />
      }>
        <Shelf>
          {(replayF === 'all' || replayF === 'playlists') && !!(p.favs || []).length && (
            <PlaylistCard pl={{ id: 'fav', name: 'Tus Me Gusta', tracks: p.favs }} plays={plStats.fav || 0} onClick={() => openPl('fav')} />
          )}
          {(replayF === 'all' || replayF === 'artists') && getFollowed().slice(0, 8).map((a) => (
            <SquareCard key={`f-${a.ref}`} art={a.art} title={a.name} sub="Artista" badge="Sigues" onClick={() => nav(artistPath(a))} />
          ))}
          {(replayF === 'all' || replayF === 'songs') && replay.map((t) => (
            <SquareCard key={`r-${t.id}`} art={t.art} title={t.title} sub={t.artist} label={`Reproducir ${t.title}`}
              onClick={() => play(t)} active={p.track?.id === t.id} playing={p.playing} />
          ))}
          {(replayF === 'all' || replayF === 'albums') && (recAlbums || []).map((a) => (
            <SquareCard key={a.ref || a.id} art={a.art} title={a.title} sub={a.artist} badge="Álbum" onClick={() => nav(albumPath(a))} />
          ))}
          {(replayF === 'all' || replayF === 'playlists') && pls.playlists.map((pl) => (
            <PlaylistCard key={pl.id} pl={pl} plays={plStats[pl.id] || 0} onClick={() => openPl(pl.id)} />
          ))}
          {(replayF === 'all' || replayF === 'playlists') && (
            <button onClick={onCreatePl} aria-label="Crear playlist" className="snap-start w-[10.25rem] sm:w-[12.5rem] shrink-0 text-left group">
              <span className="grid place-items-center w-[10.25rem] h-[10.25rem] sm:w-[12.5rem] sm:h-[12.5rem] rounded-2xl transition group-active:scale-95"
                style={{ border: '2px dashed var(--bd)', background: 'var(--s)' }}>
                <span className="w-12 h-12 rounded-full grid place-items-center text-white" style={{ background: 'var(--a)' }}><Plus size={24} /></span>
              </span>
              <p className="text-[15px] font-semibold mt-2">Crear playlist</p>
            </button>
          )}
        </Shelf>
        {!hasReplay && <p className="text-sm mt-1" style={{ color: 'var(--m)' }}>Aún no hay nada aquí: reproduce una canción o dale ♥ y aparece.</p>}
      </Section>

      {/* ===== Tu Historial (Figma) ===== */}
      {(p.history || []).length > 0 && (
        <Section title="Tu Historial" action={
          <div className="flex items-center gap-1">
            <FilterMenu value={histF} onChange={setHistF} options={[['recent', 'Recientes'], ['top', 'Más escuchadas']]} />
            <button className="text-xs px-3 h-8 rounded-lg active:scale-95" style={{ color: 'var(--m)' }} onClick={() => p.clearHistory()}>Limpiar</button>
          </div>
        }>
          <div className="md:grid md:grid-flow-col md:grid-rows-5 md:grid-cols-2 lg:grid-cols-3 md:gap-x-6">
            {histList.map((t, i) => (
              <div key={`${t.id}-${i}`} className={i >= 10 ? 'hidden lg:block' : i >= 5 ? 'hidden md:block' : ''}>
                <HistoryRow t={t} active={p.track?.id === t.id} playing={p.playing} loading={resolvingId === t.id}
                  onPlay={() => play(t)} onMenu={() => openMenu(t, p.history, { kind: 'yt' })} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ===== Descubre tus canciones ===== */}
      <Section title="Descubre tus canciones" action={
        <button className="text-xs px-3 h-8 rounded-lg inline-flex items-center gap-1.5 active:scale-95" style={{ color: 'var(--m)' }} onClick={reshuffle} aria-label="Mezclar descubrimiento">
          <Shuffle size={13} /> Mezclar
        </button>
      }>
        {discover.length ? (
          <Shelf>
            {discover.map((t) => (
              <SquareCard key={t.id} art={t.art} title={t.title} sub={t.artist} label={`Reproducir ${t.title}`}
                active={p.track?.id === t.id} playing={p.playing} badge={t.official ? 'Oficial' : undefined} onClick={() => play(t, discover)} />
            ))}
          </Shelf>
        ) : (randomLoading ? <ShelfSkeleton n={5} /> : <p className="text-sm" style={{ color: 'var(--m)' }}>Toca Mezclar para traer canciones.</p>)}
      </Section>

      {/* ===== Top Albums ===== */}
      {(popAlbums || []).length > 0 && (
        <Section title="Top Albums">
          <Shelf>{popAlbums.map((a) => <AlbumTile key={a.ref} a={a} onClick={() => nav(albumPath(a))} />)}</Shelf>
        </Section>
      )}

      {/* ===== Canciones en Tendencia (con el país del top) ===== */}
      <section>
        <SectionTitle title="Canciones en Tendencia" action={
          <select className="inp !w-auto !py-1.5 !min-h-[36px] !rounded-full text-xs" value={cc} aria-label="País del top" onChange={(e) => changeCountry(e.target.value)}>
            {CHART_COUNTRIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        } />
        {chartsLoading && !charts?.length && <RowsSkeleton n={5} numbered />}
        {!!charts?.length && (
          <div className="space-y-2">
            {charts.slice(0, showAll ? 25 : 7).map((c) => (
              <TrendRow key={c.id} rank={c.rank} t={c} active={p.track?.id === c.id || (p.track && keyOf(p.track) === keyOf(c))} playing={p.playing}
                loading={resolvingId === c.id} fav={(p.favs || []).some((f) => keyOf(f) === keyOf(c))}
                onPlay={() => playEntry(c)} onFav={() => favEntry(c)} />
            ))}
            {charts.length > 7 && (
              <button onClick={() => setShowAll((v) => !v)} className="w-full h-11 rounded-2xl text-sm font-semibold active:scale-[.98] transition" style={{ background: 'var(--s2)', color: 'var(--m)' }}>
                {showAll ? 'Ver menos' : `+ Ver todo (${Math.min(25, charts.length)})`}
              </button>
            )}
          </div>
        )}
        {!chartsLoading && !charts?.length && <p className="text-sm" style={{ color: 'var(--m)' }}>No se pudo cargar el top de {countryName}. Prueba con otro país.</p>}
      </section>

      {/* ===== Comunidad (playlists de grupos y de a 2) ===== */}
      {!!roomPls.length && (
        <Section title="Comunidad" sub="Playlists de tus grupos y chats">
          <Shelf>
            {roomPls.map((pl) => (
              <RoomPlCard key={pl.id} pl={pl} peer={peers[pl.roomId]} myAvatar={myAvatar}
                onOpen={() => nav(`/musica/sala/${pl.roomId}`)}
                onPlay={() => { const l = (pl.tracks || []).filter((t) => t.videoId || t.src); if (l.length) p.play(l[0], l); else toast('Esa playlist no tiene temas reproducibles'); }}
                onChat={() => (onOpenRoom ? onOpenRoom(pl.roomId) : toast('Abre Comunidad para chatear'))} />
            ))}
          </Shelf>
        </Section>
      )}

      {/* ===== Para cada momento ===== */}
      <Section title="Para cada momento">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {MOODS.map(([label, query, bg]) => (
            <button key={label} onClick={() => goSearch(query, label)}
              className="relative overflow-hidden rounded-2xl px-4 h-[4.5rem] text-left text-white active:scale-95 transition-transform flex items-end pb-3"
              style={{ background: bg }}>
              <span className="serif text-xl font-semibold leading-tight" style={{ textShadow: '0 2px 10px rgba(0,0,0,.4)' }}>{label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* ===== Selecciones rápidas ===== */}
      {quick.length > 0 && (
        <Section title="Selecciones rápidas" sub={(recs || []).length ? 'Basadas en lo que más escuchas' : 'Lo que más suena ahora'}>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {quick.map((t) => {
              const on = p.track?.id === t.id;
              return (
                <button key={t.id} onClick={() => play(t)} className="flex items-center gap-3 rounded-xl overflow-hidden text-left active:scale-[.98] transition pr-2"
                  style={{ background: on ? 'color-mix(in srgb, var(--a) 18%, var(--s2))' : 'var(--s2)' }} aria-label={`Reproducir ${t.title}`}>
                  <Cover src={t.art} className="w-16 h-16 shrink-0" />
                  <span className="min-w-0 flex-1 py-1">
                    <Marquee className="text-[13px] font-semibold leading-tight" style={{ color: on ? 'var(--a)' : undefined }}>{t.title}</Marquee>
                    <Marquee className="text-[12px]" style={{ color: 'var(--m)' }}>{t.artist}</Marquee>
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* ===== Categorías ===== */}
      <Section title="Categorías">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {CATEGORIES.map(([name, query, bg, term]) => (
            <button key={name} onClick={() => openCategory(name)}
              className="cat-btn rounded-[1.25rem] px-4 h-20 flex flex-col items-center justify-center text-center text-white relative overflow-hidden" style={{ background: bg }}>
              <span className="cat-glow" aria-hidden="true" />
              <span className="relative text-lg font-bold leading-tight tracking-wide" style={{ textShadow: '0 2px 10px rgba(0,0,0,.45)' }}>{name}</span>
              <Play size={15} className="cat-play absolute top-2.5 right-2.5" fill="currentColor" />
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}
