import { useEffect, useState } from 'react';
import { Search, Shuffle, Loader2, Heart, History, Trophy, AlertTriangle, X } from 'lucide-react';
import Title from '../components/Title';
import RadioRow from '../components/RadioRow';
import { searchStations, topStations } from '../services/radios';

export default function RadiosView({ r, toast }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [label, setLabel] = useState('Las más escuchadas');
  const [loading, setLoading] = useState(false);

  // Al abrir: top mundial (sin filtros, como pediste).
  useEffect(() => {
    let dead = false;
    topStations(12).then((list) => { if (!dead && list.length) setResults(list); }).catch(() => {});
    return () => { dead = true; };
  }, []);

  const runSearch = async (term) => {
    const t = term.trim();
    if (!t) return;
    setLoading(true);
    try {
      let list = await searchStations({ name: t, order: 'clickcount', reverse: 'true', limit: 20 });
      if (!list.length) list = await searchStations({ tag: t, order: 'clickcount', reverse: 'true', limit: 20 });
      setResults(list);
      setLabel(list.length ? `Resultados de “${t}”` : `Sin resultados para “${t}”`);
      if (!list.length) toast('Prueba con otro nombre o género', AlertTriangle);
    } catch {
      toast('Las radios no responden, intenta de nuevo', AlertTriangle);
    }
    setLoading(false);
  };
  const submit = (e) => { e.preventDefault(); runSearch(q); };

  return (
    <>
      <Title>Radios del mundo</Title>

      <form onSubmit={submit} className="flex gap-2" role="search" aria-label="Buscar radios">
        <input className="inp flex-1 min-w-0" placeholder="Nombre o género… (ej. salsa, BBC, rock)"
          value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar radios por nombre o género" autoComplete="off" enterKeyHint="search" />
        <button className="btn shrink-0 whitespace-nowrap" aria-label="Buscar radios" aria-busy={loading ? 'true' : undefined}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}<span className="hidden xs:inline sm:inline">Buscar</span>
        </button>
      </form>

      <button className="btn w-full !py-3.5 !text-[15px]" onClick={() => r.playRandom?.()} disabled={r.loading} aria-busy={r.loading ? 'true' : undefined}>
        {r.loading ? <Loader2 size={18} className="animate-spin" /> : <Shuffle size={18} />}
        {r.loading ? 'Buscando radio…' : 'Radio aleatoria del mundo'}
      </button>

      <div className="card !p-2" aria-live="polite">
        <p className="text-[12px] px-2 pt-1 pb-2 truncate" title={`${label}`} style={{ color: 'var(--m)' }}>
          <Trophy size={11} className="inline mr-1 -mt-0.5" />{label} · toca una y sigue sonando en toda la app
        </p>
        {loading && !results.length && (
          <div className="px-2 py-2 space-y-2" aria-hidden="true">
            {[0, 1, 2].map((i) => <div key={i} className="skel h-14" />)}
          </div>
        )}
        {results.map((st) => <RadioRow key={st.uuid} st={st} r={r} />)}
        {!results.length && !loading && (
          <div className="text-center px-2 py-5">
            <p className="text-sm font-semibold">Sin radios por aquí</p>
            <p className="text-xs mt-1" style={{ color: 'var(--m)' }}>Prueba con otro nombre o pulsa aleatoria.</p>
          </div>
        )}
      </div>

      {!!r.favs.length && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Heart size={16} style={{ color: 'var(--a)' }} />Favoritas
            </h3>
          </div>
          <div className="card !p-2">
            {r.favs.map((st) => (
              <div key={st.uuid} className="flex items-center gap-1">
                <div className="flex-1 min-w-0"><RadioRow st={st} r={r} /></div>
                <button className="ico-btn shrink-0" onClick={() => r.toggleFav(st)} aria-label={`Quitar ${st.name}`}>
                  <X size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {!!r.history.length && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold flex items-center gap-2">
              <History size={16} style={{ color: 'var(--a)' }} />Historial de radios
            </h3>
            <button className="text-[11px]" style={{ color: 'var(--m)' }} onClick={() => r.clearHistory()}>Limpiar</button>
          </div>
          <div className="card !p-2">
            {r.history.slice(0, 10).map((st) => <RadioRow key={`${st.uuid}-${st.at}`} st={st} r={r} />)}
          </div>
        </section>
      )}

      <p className="text-[11px]" style={{ color: 'var(--m)' }}>
        Más de 40.000 estaciones gratis vía Radio-Browser. Sin imagen: se muestra el logo de la estación cuando tiene.
      </p>
    </>
  );
}
