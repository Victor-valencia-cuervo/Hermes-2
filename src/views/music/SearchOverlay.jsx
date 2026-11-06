import { useMemo } from 'react';
import { Search, ArrowUpLeft, History, X, Loader2, Play } from 'lucide-react';
import Cover from '../../components/Cover';
import Marquee from '../../components/Marquee';
import { CATEGORIES, MOODS } from './data';

// Paleta para las tarjetas de "Explorar todo" (degradados de las categorías + momentos)
const TILES = [
  ...MOODS.map(([label, query, bg]) => ({ label, bg, kind: 'mood', query })),
  ...CATEGORIES.map(([name, , bg]) => ({ label: name, bg, kind: 'cat', query: name })),
];

/** Barra de búsqueda ÚNICA de Música (misma píldora del inicio). Se monta una sola vez y NO
 *  desaparece al pasar de inicio → búsqueda → resultados: queda en su lugar (ya NO sigue la pantalla al
 *  desplazar) con el texto y el foco intactos, así no hay saltos ni transiciones raras. `dropdown` son las sugerencias
 *  flotantes cuando se edita desde los resultados. */
export function SearchBar({ q, onType, onSubmit, onFocus, onBlur, loading, inputRef, dropdown }) {
  return (
    <div className="relative z-20 py-2">
      <form onSubmit={onSubmit} role="search">
        <div className="flex items-center gap-3 pl-4 pr-1.5 py-1 rounded-full min-h-[3.25rem]" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
          <Search size={17} className="shrink-0" style={{ color: 'var(--a)' }} />
          <input ref={inputRef} type="search" value={q} onChange={(e) => onType(e.target.value)}
            onFocus={onFocus} onBlur={onBlur}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm py-2.5"
            style={{ color: 'var(--t)' }}
            placeholder="Artistas, canciones o álbumes…" aria-label="Buscar música"
            autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" />
          {loading
            ? <span className="w-10 h-10 grid place-items-center shrink-0"><Loader2 size={18} className="animate-spin" style={{ color: 'var(--m)' }} /></span>
            : !!q && <button type="button" onClick={() => onType('')} onPointerDown={(e) => e.preventDefault()} aria-label="Borrar" className="w-10 h-10 grid place-items-center rounded-full shrink-0"><X size={18} style={{ color: 'var(--m)' }} /></button>}
        </div>
      </form>
      {dropdown}
    </div>
  );
}

const norm = (x) => String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const mainArtist = (a) => String(a || '').split(/,| & | feat\.?| ft\.?| x /i)[0].trim();

/** Carátula que mejor representa una búsqueda: la de la canción/artista del historial que coincide. */
function artFor(query, pool) {
  const n = norm(query);
  if (!n) return null;
  for (const t of pool) {
    const ti = norm(t.title); const ar = norm(mainArtist(t.artist));
    if (t.art && (ti === n || ar === n || (n.length > 3 && (ti.includes(n) || ar.includes(n) || n.includes(ar) && ar.length > 3)))) return t.art;
  }
  return null;
}

function Heading({ children, action }) {
  return (
    <div className="flex items-end justify-between mb-2 px-1">
      <h3 className="serif text-[1.7rem] font-semibold leading-none">{children}</h3>
      {action}
    </div>
  );
}

/** Contenido de la página de búsqueda (la barra vive aparte, en SearchBar), estilo Spotify / Apple Music:
 *  sin cuadros: recientes con su carátula, tus artistas en círculos, tendencias en lista numerada y
 *  géneros como etiquetas. Todo sale de lo que de verdad has escuchado y de los charts. */
export default function SearchPage({ q, sugs, onPick, hist, onPickHist, onDelHist, onClearHist, onTile, tracks = [], trending = [], onPlay, onArtist }) {
  const typing = q.trim().length >= 2;

  const pool = useMemo(() => {
    const seen = new Set(); const out = [];
    for (const t of [...tracks, ...trending]) { if (!t || !t.art || seen.has(t.id)) continue; seen.add(t.id); out.push(t); }
    return out;
  }, [tracks, trending]);

  // Tus artistas: los que más sonaron en tu historial, con la carátula de su canción
  const myArtists = useMemo(() => {
    const m = new Map();
    for (const t of tracks) {
      const a = mainArtist(t.artist); if (!a) continue;
      const k = norm(a); const e = m.get(k) || { name: a, art: t.art, n: 0 };
      e.n += 1; if (!e.art && t.art) e.art = t.art; m.set(k, e);
    }
    return [...m.values()].sort((a, b) => b.n - a.n).slice(0, 10);
  }, [tracks]);

  return (
    <div className="space-y-7">
      {typing && (
        <div>
          {!sugs.length && <p className="text-sm px-1 py-3" style={{ color: 'var(--m)' }}>Pulsa Enter para buscar “{q.trim().slice(0, 30)}”.</p>}
          {sugs.map((s, i) => (
            <button key={`${s.label}-${i}`} type="button" onClick={() => onPick(s.label)}
              className="w-full flex items-center gap-4 px-2 py-2.5 text-left rounded-2xl hover:bg-[var(--s2)] active:scale-[.99] transition">
              <Cover src={artFor(s.label, pool)} alt="" className="w-14 h-14 rounded-2xl" iconSize={18} />
              <span className="flex-1 min-w-0"><Marquee className="text-[15px]">{s.label}</Marquee><span className="block text-[12px]" style={{ color: 'var(--m)' }}>{s.from === 'web' ? 'Sugerencia' : 'De tu historial'}</span></span>
              <ArrowUpLeft size={17} className="shrink-0" style={{ color: 'var(--m)' }} />
            </button>
          ))}
        </div>
      )}

      {!typing && (
        <>
          {!!hist.length && (
            <section>
              <Heading action={<button className="text-xs px-3 py-2 rounded-full" style={{ color: 'var(--a)' }} onClick={onClearHist}>Limpiar</button>}>Recientes</Heading>
              <div className="space-y-2">
                {hist.slice(0, 6).map((s) => (
                  <div key={s} className="flex items-center rounded-2xl hover:bg-[var(--s2)]">
                    <button onClick={() => onPickHist(s)} className="flex-1 min-w-0 flex items-center gap-4 px-2 py-2 text-left" title={s}>
                      <span className="relative shrink-0">
                        <Cover src={artFor(s, pool)} alt="" className="w-14 h-14 rounded-2xl" iconSize={18} />
                        <span className="absolute -right-1 -bottom-1 w-5 h-5 rounded-full grid place-items-center" style={{ background: 'var(--bg)', border: '1px solid var(--bd)' }}><History size={11} style={{ color: 'var(--m)' }} /></span>
                      </span>
                      <Marquee className="text-[15px] flex-1">{s}</Marquee>
                    </button>
                    <button className="w-11 h-11 grid place-items-center shrink-0" aria-label={`Borrar ${s}`} onClick={() => onDelHist(s)}><X size={16} style={{ color: 'var(--m)' }} /></button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {myArtists.length > 1 && (
            <section>
              <Heading>Tus artistas</Heading>
              <div className="flex gap-4 overflow-x-auto pb-1 -mx-5 px-5 lg:-mx-10 lg:px-10 scroll-x">
                {myArtists.map((a) => (
                  <button key={a.name} onClick={() => onArtist?.(a.name)} className="shrink-0 w-[4.9rem] text-center active:scale-95 transition-transform" aria-label={`Buscar a ${a.name}`}>
                    <Cover src={a.art} alt="" className="w-[4.9rem] h-[4.9rem] rounded-full" iconSize={22} />
                    <Marquee className="text-[13px] mt-1.5">{a.name}</Marquee>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!!tracks.length && (
            <section>
              <Heading>Para volver a oír</Heading>
              {tracks.slice(0, 4).map((t) => (
                <button key={t.id} onClick={() => onPlay?.(t, tracks)} className="w-full flex items-center gap-4 px-2 py-2 text-left rounded-2xl hover:bg-[var(--s2)] active:scale-[.99] transition">
                  <Cover src={t.art} alt="" className="w-14 h-14 rounded-2xl" iconSize={18} />
                  <span className="flex-1 min-w-0"><Marquee className="text-[15px]">{t.title}</Marquee><Marquee className="text-[13px]" style={{ color: 'var(--m)' }}>{t.artist}</Marquee></span>
                  <Play size={17} className="shrink-0" style={{ color: 'var(--m)' }} />
                </button>
              ))}
            </section>
          )}

          {!!trending.length && (
            <section>
              <Heading>Tendencias</Heading>
              {trending.slice(0, 6).map((t, i) => (
                <button key={`${t.id}-${i}`} onClick={() => onPlay?.(t, trending)} className="w-full flex items-center gap-3 px-2 py-2 text-left rounded-xl hover:bg-[var(--s2)] active:scale-[.99] transition">
                  <span className="w-5 text-center text-sm tabular-nums shrink-0" style={{ color: i < 3 ? 'var(--a)' : 'var(--m)', fontWeight: i < 3 ? 700 : 500 }}>{i + 1}</span>
                  <Cover src={t.art} alt="" className="w-14 h-14 rounded-2xl" iconSize={18} />
                  <span className="flex-1 min-w-0"><Marquee className="text-[15px]">{t.title}</Marquee><Marquee className="text-[13px]" style={{ color: 'var(--m)' }}>{t.artist}</Marquee></span>
                </button>
              ))}
            </section>
          )}

          <section>
            <Heading>Explorar</Heading>
            <div className="flex flex-wrap gap-2">
              {TILES.map((tl) => (
                <button key={`${tl.kind}-${tl.label}`} onClick={() => onTile(tl)}
                  className="inline-flex items-center gap-2 pl-2 pr-4 py-2 rounded-full text-[14px] active:scale-95 transition-transform"
                  style={{ background: 'var(--s2)', border: '1px solid var(--bd)', color: 'var(--t)' }}>
                  <span aria-hidden="true" className="w-5 h-5 rounded-full shrink-0" style={{ background: tl.bg }} />{tl.label}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
