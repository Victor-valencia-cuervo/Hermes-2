import { useEffect, useMemo, useState } from 'react';
import { GlassBackdrop, SongHead, Section, Shelf, SquareCard, SongRow, RowsSkeleton, ImmersivePage, ActionRow } from './ui';
import useArtColors from '../../hooks/useArtColors';
import { setPageContext } from '../../lib/playContext';
import { getAlbumBundle, getArtistBundle, artistPath, albumPath } from '../../services/catalog';
import { fmtTime } from '../../lib/format';
import { isNow } from './helpers';

/** Detalle de álbum: carátula original, datos, lista numerada y más del artista. */
export default function AlbumPage({ refId, ctx }) {
  const { p, nav, playEntry, playAlbum, resolvingId, openMenu, onBack } = ctx;
  const [data, setData] = useState(undefined);
  const [more, setMore] = useState([]);
  useEffect(() => {
    setData(undefined); setMore([]);
    let dead = false;
    (async () => {
      const b = await getAlbumBundle(refId).catch(() => null);
      if (dead) return;
      setData(b || null);
      if (b?.album?.artistRef) {
        const ab = await getArtistBundle(b.album.artistRef).catch(() => null);
        if (!dead && ab) setMore([...(ab.albums || []), ...(ab.singles || [])].filter((x) => x.ref !== b.album.ref).slice(0, 14));
      }
    })();
    return () => { dead = true; };
  }, [refId]);

  const album = data?.album;
  useEffect(() => { if (album?.title) setPageContext({ from: 'Álbum', title: album.title }); return () => setPageContext(null); }, [album?.title]);
  const colors = useArtColors(album?.art);
  const tint = colors?.main ? `color-mix(in srgb, ${colors.main} 70%, #000)` : undefined;
  const tracks = data?.tracks || [];
  const total = useMemo(() => tracks.reduce((s, t) => s + (t.duration || 0), 0), [tracks]);

  if (data === null) {
    return (
      <div className="card text-center py-10"><p className="serif text-2xl font-semibold">No se pudo abrir el álbum</p>
        <p className="text-sm mt-1" style={{ color: 'var(--m)' }}>Revisa tu conexión e intenta de nuevo.</p>
        <button className="btn btn-o mt-4" onClick={onBack}>Volver</button></div>
    );
  }
  const busy = !!resolvingId && resolvingId === album?.id;
  const playAll = () => album && playAlbum({ ...album }, tracks);
  const shuffleAll = () => { if (!album || !tracks.length) return; playAlbum({ ...album }, [...tracks].sort(() => Math.random() - 0.5)); };

  return (
    <div className="space-y-7 relative isolate">
      <GlassBackdrop img={album?.art} />
      <ImmersivePage img={album?.art} alt={album?.title} tint={tint} colors={colors} onBack={onBack}>
        <div className="text-center">
          <p className="text-[11px] font-bold tracking-[0.25em] uppercase" style={{ color: 'var(--m)' }}>{album?.type === 'single' ? 'Sencillo' : album?.type === 'ep' ? 'EP' : 'Álbum'}</p>
          <h2 className="text-[2.3rem] sm:text-5xl font-bold leading-[1.05] line-clamp-3 mt-1" style={{ textShadow: '0 2px 14px rgba(0,0,0,.35)' }}>{album?.title || '…'}</h2>
          {album && (
            <p className="text-sm mt-2" style={{ color: 'var(--m)' }}>
              {album.artistRef
                ? <button className="font-semibold hover:underline" style={{ color: 'var(--t)' }} onClick={() => nav(artistPath({ ref: album.artistRef }))}>{album.artist}</button>
                : <span style={{ color: 'var(--t)' }}>{album.artist}</span>}
              {album.year ? ` · ${album.year}` : ''}{tracks.length ? ` · ${tracks.length} canciones` : ''}{total ? ` · ${Math.max(1, Math.round(total / 60))} min` : ''}
            </p>
          )}
          {!!album?.genre && <p className="text-xs mt-0.5" style={{ color: 'var(--m)' }}>{album.genre}</p>}
        </div>
        <ActionRow disabled={!tracks.length || !!resolvingId} busy={busy} onPlay={playAll} onShuffle={shuffleAll} />
      </ImmersivePage>

      {data === undefined ? <RowsSkeleton n={8} /> : (
        <div>
          <SongHead />
          {tracks.map((t, i) => {
            const on = isNow(p.track, t);
            return (
              <SongRow key={t.id} n={t.trackNumber || i + 1} art={t.art} title={t.title} sub={t.artist} duration={t.duration} explicit={t.explicit} noArt
                active={on} playing={p.playing} loading={resolvingId === t.id}
                onPlay={() => (on ? p.openFull?.() : playEntry(t))}
                onMenu={() => openMenu({ ...t, source: 'YouTube' }, tracks, { kind: 'chart', onPlay: playEntry })} />
            );
          })}
          {!tracks.length && <p className="text-sm p-3" style={{ color: 'var(--m)' }}>Ese álbum no trajo canciones.</p>}
          {!!total && <p className="text-xs px-3 pt-2 pb-1" style={{ color: 'var(--m)' }}>{tracks.length} canciones · {fmtTime(total)}</p>}
        </div>
      )}

      {!!more.length && (
        <Section title={`Más de ${album?.artist || 'este artista'}`}>
          <Shelf>{more.map((al) => <SquareCard key={al.ref} art={al.art} title={al.title} sub={al.year} onClick={() => nav(albumPath(al))} />)}</Shelf>
        </Section>
      )}
    </div>
  );
}
