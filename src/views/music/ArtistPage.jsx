import { useEffect, useState } from 'react';
import { Star, ChevronRight } from 'lucide-react';
import { GlassBackdrop, Section, Shelf, SquareCard, ArtistBubble, SongRow, ShelfSkeleton, RowsSkeleton, ImmersivePage, ActionRow } from './ui';
import Cover from '../../components/Cover';
import useArtColors from '../../hooks/useArtColors';
import { getArtistBundle, artistPath, albumPath, compactNum } from '../../services/catalog';
import { isFollowing, toggleFollow } from '../../lib/follow';
import { setPageContext } from '../../lib/playContext';
import { isNow } from './helpers';

/** Perfil de artista con el diseño de BitChord: foto que cubre la parte superior y se difumina con su color,
 *  botones redondos, último lanzamiento, canciones principales, discografía y artistas similares. */
export default function ArtistPage({ refId, ctx }) {
  const { p, nav, playEntry, resolvingId, openMenu, onBack, toast } = ctx;
  const [data, setData] = useState(undefined); // undefined = cargando · null = no existe
  const [showAll, setShowAll] = useState(false);
  const [disc, setDisc] = useState('albums');
  const [fol, setFol] = useState(() => isFollowing(refId));
  useEffect(() => {
    setData(undefined); setShowAll(false); setDisc('albums'); setFol(isFollowing(refId));
    let dead = false;
    getArtistBundle(refId).then((b) => { if (!dead) setData(b || null); }).catch(() => { if (!dead) setData(null); });
    return () => { dead = true; };
  }, [refId]);
  const a = data?.artist;
  useEffect(() => { if (a?.name) setPageContext({ from: 'Artista', title: a.name }); return () => setPageContext(null); }, [a?.name]);
  const colors = useArtColors(a?.art);
  const tint = colors?.main ? `color-mix(in srgb, ${colors.main} 70%, #000)` : undefined;

  if (data === null) {
    return (
      <div className="card text-center py-10">
        <p className="serif text-2xl font-semibold">No se pudo cargar el artista</p>
        <p className="text-sm mt-1" style={{ color: 'var(--m)' }}>Revisa tu conexión e intenta de nuevo.</p>
        <button className="btn btn-o mt-4" onClick={onBack}>Volver</button>
      </div>
    );
  }
  const top = data?.top || [];
  const shownTop = showAll ? top : top.slice(0, 5);
  const discList = disc === 'albums' ? (data?.albums || []) : (data?.singles || []);
  const newest = data?.latest?.[0];
  const follow = () => { if (!a) return; const on = toggleFollow(a); setFol(on); toast?.(on ? `Sigues a ${a.name}` : `Dejaste de seguir a ${a.name}`); };

  return (
    <div className="space-y-7 relative isolate">
      <GlassBackdrop img={a?.art} />
      <ImmersivePage img={a?.art} alt={a?.name} tint={tint} colors={colors} onBack={onBack}>
        <div className="text-center">
          <h2 className="text-[2.6rem] sm:text-5xl font-bold leading-[1.05] line-clamp-2" style={{ textShadow: '0 2px 14px rgba(0,0,0,.35)' }}>{a?.name || '…'}</h2>
          {!!a?.fans && <p className="text-sm mt-1.5" style={{ color: 'var(--m)' }}>{compactNum(a.fans)} seguidores</p>}
        </div>
        <ActionRow disabled={!top.length || !!resolvingId} busy={!!resolvingId}
          onPlay={() => playEntry(top[0])}
          onShuffle={() => { const t = top[Math.floor(Math.random() * top.length)]; if (t) playEntry(t); }}
          extra={(
            <button onClick={follow} aria-pressed={fol} aria-label={fol ? 'Dejar de seguir' : 'Seguir'} className="w-14 h-14 rounded-full grid place-items-center active:scale-90 transition"
              style={fol ? { background: 'var(--a)', color: '#fff' } : { background: 'rgba(255,255,255,.14)', color: 'var(--t)' }}>
              <Star size={22} fill={fol ? 'currentColor' : 'none'} />
            </button>
          )} />

        {newest && (
          <button onClick={() => nav(albumPath(newest))} className="mt-6 w-full flex items-center gap-4 rounded-[1.75rem] p-3.5 text-left active:scale-[.99] transition"
            style={{ background: 'linear-gradient(155deg, rgba(255,255,255,.18), rgba(255,255,255,.06))', border: '1px solid rgba(255,255,255,.18)', backdropFilter: 'blur(20px) saturate(1.5)', WebkitBackdropFilter: 'blur(20px) saturate(1.5)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22), 0 16px 40px -22px rgba(0,0,0,.6)' }}>
            <Cover src={newest.art} className="w-20 h-20 rounded-xl shrink-0" alt={newest.title} />
            <span className="flex-1 min-w-0">
              <span className="block text-sm" style={{ color: 'var(--m)' }}>{newest.type === 'single' ? 'Sencillo' : newest.type === 'ep' ? 'EP' : 'Álbum'}{newest.year ? ` • ${newest.year}` : ''}</span>
              <span className="block text-xl font-bold leading-tight truncate">{newest.title}</span>
              <span className="block text-sm" style={{ color: 'var(--m)' }}>Lanzamiento reciente</span>
            </span>
            <span className="w-11 h-11 rounded-full grid place-items-center shrink-0" style={{ background: 'rgba(255,255,255,.14)' }}><ChevronRight size={22} /></span>
          </button>
        )}
      </ImmersivePage>

      <Section title="Canciones principales" glass>
        {data === undefined ? <RowsSkeleton /> : (
          <>
            <div>
              {shownTop.map((t, i) => {
                const on = isNow(p.track, t);
                return (
                  <SongRow key={t.id} n={i + 1} art={t.art} title={t.title} sub={t.album} duration={t.duration} explicit={t.explicit}
                    active={on} playing={p.playing} loading={resolvingId === t.id}
                    onPlay={() => (on ? p.openFull?.() : playEntry(t))}
                    onMenu={() => openMenu({ ...t, source: 'YouTube' }, top, { kind: 'chart', onPlay: playEntry })} />
                );
              })}
              {!top.length && <p className="text-sm p-3" style={{ color: 'var(--m)' }}>Sin canciones populares todavía.</p>}
            </div>
            {top.length > 5 && (
              <button className="text-sm font-semibold mt-2 px-2 py-3" style={{ color: 'var(--m)' }} onClick={() => setShowAll((v) => !v)}>
                {showAll ? 'Ver menos' : `Ver ${top.length - 5} más`}
              </button>
            )}
          </>
        )}
      </Section>

      {data === undefined && <ShelfSkeleton />}

      {(!!data?.albums?.length || !!data?.singles?.length) && (
        <Section title="Discografía" action={
          <div className="flex rounded-full p-0.5 shrink-0" style={{ background: 'var(--s2)' }}>
            {[['albums', `Álbumes (${data.albums.length})`], ['singles', `Sencillos (${data.singles.length})`]].map(([id, label]) => (
              <button key={id} onClick={() => setDisc(id)} className={`px-3 py-2 rounded-full text-[11px] font-semibold whitespace-nowrap ${disc === id ? 'text-white' : ''}`}
                style={disc === id ? { background: 'var(--a)' } : { color: 'var(--m)' }}>{label}</button>
            ))}
          </div>
        }>
          <Shelf>
            {discList.map((al) => <SquareCard key={al.ref} art={al.art} title={al.title} sub={`${al.year}${al.trackCount ? ` · ${al.trackCount} temas` : ''}`} onClick={() => nav(albumPath(al))} />)}
            {!discList.length && <p className="text-sm py-6" style={{ color: 'var(--m)' }}>Nada en esta categoría.</p>}
          </Shelf>
        </Section>
      )}

      {!!data?.related?.length && (
        <Section title="Artistas similares">
          <Shelf>{data.related.map((r) => <ArtistBubble key={r.ref} artist={r} onClick={() => nav(artistPath(r))} />)}</Shelf>
        </Section>
      )}
    </div>
  );
}
