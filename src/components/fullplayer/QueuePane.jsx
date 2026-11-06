import { useMemo, useRef, useState } from 'react';
import { Shuffle, Repeat, Repeat1, Radio, X, GripVertical, Plus, Search, Trash2, Check } from 'lucide-react';
import { contextOf } from '../../lib/playContext';
import { fmtTime } from '../../lib/format';
import Cover from '../Cover';
import Marquee from '../Marquee';

const ROW_H = 60;

function EqBars({ playing }) {
  return (
    <span className="flex items-end gap-[2px] h-3.5 w-4" aria-hidden="true">
      {[0, 1, 2].map((i) => <span key={i} className="w-[3px] h-full rounded-sm bg-white origin-bottom" style={{ animation: playing ? `fpEq ${0.7 + i * 0.17}s ease-in-out ${i * 0.1}s infinite` : 'none', transform: playing ? undefined : 'scaleY(.4)' }} />)}
    </span>
  );
}

/** Cola «A continuación» estilo Apple Music: reproducidas recientemente · reproduciendo · siguiente.
 *  Arrastrar (≡) para reordenar, × para quitar, tocar para reproducir. Tocar zona vacía → onEmptyTap. */
export default function QueuePane({ p, toast, onEmptyTap, bottomPad = 24, fadePx = 0 }) {
  const t = p.track;
  const q = p.queue; const idx = Math.max(0, p.index);
  const upcoming = q.slice(idx + 1);
  const recent = idx > 0 ? q.slice(0, idx) : (p.history || []).filter((h) => h.id !== t?.id).slice(0, 6).reverse();
  const recentFromQueue = idx > 0;
  const ctx = contextOf(t);
  const box = useRef(null);
  const rows = useRef([]);
  const [drag, setDrag] = useState(null); // { from, over, dy }
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('');
  const [confirm, setConfirm] = useState(false);
  const total = useMemo(() => upcoming.reduce((a, x) => a + (Number(x.duration) || 0), 0), [upcoming]);

  const startDrag = (e, from) => {
    e.preventDefault(); e.stopPropagation();
    const el = box.current; if (!el) return;
    const rects = rows.current.map((r) => r?.getBoundingClientRect());
    const startY = e.clientY; const startScroll = el.scrollTop;
    const mid = (i) => rects[i].top + rects[i].height / 2;
    let state = { from, over: from, dy: 0 };
    setDrag(state);
    const move = (ev) => {
      // auto-scroll cerca de los bordes de la lista
      const b = el.getBoundingClientRect();
      if (ev.clientY < b.top + 70) el.scrollTop -= 10; else if (ev.clientY > b.bottom - 70) el.scrollTop += 10;
      const dy = ev.clientY - startY + (el.scrollTop - startScroll);
      const center = mid(from) + dy;
      let over = from; let best = Infinity;
      rects.forEach((r, i) => { if (!r) return; const d = Math.abs(center - mid(i)); if (d < best) { best = d; over = i; } });
      state = { from, over, dy };
      setDrag(state);
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      if (state.over !== from) p.moveInQueue(idx + 1 + from, idx + 1 + state.over);
      setDrag(null);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  const shift = (i) => {
    if (!drag || i === drag.from) return 0;
    if (drag.from < drag.over && i > drag.from && i <= drag.over) return -ROW_H;
    if (drag.from > drag.over && i >= drag.over && i < drag.from) return ROW_H;
    return 0;
  };

  const tapBackground = (e) => { if (!e.target.closest('[data-nohide],button,a,input')) onEmptyTap?.(); };
  const doClear = () => { p.clearQueue(); setConfirm(false); };
  const askClear = () => { if (upcoming.length > 3 || recentFromQueue) setConfirm(true); else doClear(); };

  const pool = useMemo(() => {
    if (!adding) return [];
    const inQ = new Set(q.map((x) => x.id));
    const seen = new Set(); const out = [];
    for (const x of [...(p.favs || []), ...(p.history || [])]) {
      if (!x?.id || seen.has(x.id)) continue; seen.add(x.id);
      out.push({ ...x, inQ: inQ.has(x.id) });
    }
    const f = filter.trim().toLowerCase();
    return (f ? out.filter((x) => `${x.title} ${x.artist}`.toLowerCase().includes(f)) : out).slice(0, 30);
  }, [adding, filter, q, p.favs, p.history]);

  const chip = (on) => ({ background: on ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.18)', color: on ? '#111' : '#fff', fontSize: 12, lineHeight: 1 });
  const small = 'w-9 h-9 rounded-full grid place-items-center active:scale-90 transition';

  return (
    <div ref={box} onClick={tapBackground} className="fp-scroll absolute inset-0 overflow-y-auto px-5 text-white"
      style={{ paddingTop: '.4rem', paddingBottom: bottomPad, transition: 'padding-bottom .4s cubic-bezier(.32,.72,0,1)', ...(fadePx ? { maskImage: `linear-gradient(180deg, #000 0, #000 calc(100% - ${fadePx + 44}px), transparent calc(100% - ${fadePx - 6}px))`, WebkitMaskImage: `linear-gradient(180deg, #000 0, #000 calc(100% - ${fadePx + 44}px), transparent calc(100% - ${fadePx - 6}px))` } : {}) }} aria-label="Cola de reproducción">
      {/* Cabecera de la cola: modos de reproducción */}
      <div className="flex items-center gap-2 mb-1">
        <p className="flex-1 text-[19px] font-bold">Cola</p>
        <button onClick={p.toggleShuffle} aria-pressed={!!p.shuffle} aria-label={p.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'} className={small} style={chip(p.shuffle)}><Shuffle size={16} /></button>
        <button onClick={p.cycleRepeat} aria-label={p.repeat === 'one' ? 'Repetir una canción' : p.repeat === 'all' ? 'Repetir toda la cola' : 'Repetir desactivado'} className={small} style={chip(p.repeat !== 'off')}>{p.repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}</button>
        <button onClick={() => p.startRadio?.(t)} disabled={!t?.videoId || p.radioBusy} aria-label="Mezcla inteligente: similares" title={t?.videoId ? 'Agregar canciones similares' : 'Solo con canciones de YouTube'} className={`${small} disabled:opacity-40`} style={chip(false)}><Radio size={16} /></button>
      </div>
      <p className="text-[12px] text-white/55 mb-3">{p.shuffle ? 'Mezcla activada · ' : ''}{upcoming.length} por sonar{total ? ` · ${fmtTime(total)}` : ''}{p.radioBusy ? ' · buscando similares…' : ''}</p>

      {recent.length > 0 && (
        <section aria-label="Reproducidas recientemente" className="mb-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-white/55 mb-1">Reproducidas recientemente</p>
          {recent.map((x, i) => (
            <button key={`${x.id}-r${i}`} data-nohide="1" onClick={() => (recentFromQueue ? p.playAt(i) : p.play(x))}
              className="w-full flex items-center gap-3 py-1.5 text-left active:scale-[.99] transition opacity-70 hover:opacity-100" style={{ minHeight: ROW_H }}>
              <Cover src={x.art} alt="" className="w-11 h-11 rounded-md" iconSize={16} />
              <span className="min-w-0 flex-1"><Marquee className="text-[15px] font-semibold">{x.title}</Marquee><Marquee className="text-[13px] text-white/60">{x.artist}</Marquee></span>
            </button>
          ))}
        </section>
      )}

      {t && (
        <section aria-label="Reproduciendo" className="mb-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-white/55 mb-1">Reproduciendo</p>
          <div className="flex items-center gap-3 p-2 -mx-2 rounded-2xl" style={{ background: 'rgba(255,255,255,.16)', minHeight: ROW_H }} data-nohide="1" aria-current="true">
            <Cover src={t.art} alt="" className="w-11 h-11 rounded-md" iconSize={16} />
            <span className="min-w-0 flex-1"><Marquee className="text-[15px] font-bold">{t.title}</Marquee><Marquee className="text-[13px] text-white/70">{t.artist}</Marquee></span>
            <EqBars playing={p.playing} />
          </div>
        </section>
      )}

      <section aria-label="Siguiente en la cola">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-white/55 truncate mb-2">A continuación{ctx.title ? ` de: ${ctx.title}` : ''}</p>
        <div className="flex flex-wrap gap-1.5 mb-1">
          <button onClick={() => { setAdding((v) => !v); setFilter(''); }} aria-pressed={adding} className="px-3 h-8 rounded-full text-[12px] font-semibold inline-flex items-center gap-1" style={chip(adding)}><Plus size={13} /> Añadir</button>
          {upcoming.length > 1 && <button onClick={() => p.dedupeQueue?.()} className="px-3 h-8 rounded-full text-[12px] font-semibold inline-flex items-center gap-1" style={chip(false)} aria-label="Quitar duplicados"><Trash2 size={12} /> Duplicados</button>}
          {(upcoming.length > 0 || recentFromQueue) && <button onClick={askClear} className="px-3 h-8 rounded-full text-[12px] font-semibold" style={chip(false)}>Limpiar</button>}
        </div>

        {confirm && (
          <div role="alertdialog" aria-label="Confirmar limpiar la cola" data-nohide="1" className="my-2 rounded-2xl p-3 flex items-center gap-3" style={{ background: 'rgba(0,0,0,.35)' }}>
            <p className="flex-1 text-[13px]">¿Limpiar la cola? La canción que suena se queda.</p>
            <button onClick={() => setConfirm(false)} className="px-3 h-9 rounded-full text-[13px] font-semibold" style={chip(false)}>Cancelar</button>
            <button onClick={doClear} className="px-3 h-9 rounded-full text-[13px] font-semibold" style={chip(true)}>Limpiar</button>
          </div>
        )}

        {adding && (
          <div data-nohide="1" className="my-2 rounded-2xl p-3" style={{ background: 'rgba(0,0,0,.3)' }}>
            <label className="flex items-center gap-2 rounded-full px-3 h-10 mb-2" style={{ background: 'rgba(255,255,255,.14)' }}>
              <Search size={15} className="text-white/60" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar en favoritos e historial" aria-label="Buscar canciones para añadir" className="flex-1 bg-transparent outline-none text-[14px] placeholder:text-white/45 min-w-0" />
            </label>
            {!pool.length && <p className="text-[13px] text-white/60 py-2">{filter ? 'Nada coincide.' : 'Aún no tienes favoritos ni historial. Busca música en Hermes y tócala para que aparezca aquí.'}</p>}
            {pool.map((x) => (
              <div key={x.id} className="flex items-center gap-2 py-1">
                <Cover src={x.art} alt="" className="w-10 h-10 rounded-md" iconSize={14} />
                <span className="min-w-0 flex-1"><Marquee className="text-[14px] font-semibold">{x.title}</Marquee><Marquee className="text-[12px] text-white/60">{x.artist}</Marquee></span>
                {x.inQ ? <span className="text-[11px] text-white/55 inline-flex items-center gap-1"><Check size={12} /> En cola</span> : (
                  <>
                    <button onClick={() => p.addNext(x)} className="px-2.5 h-8 rounded-full text-[11px] font-semibold" style={chip(false)}>Siguiente</button>
                    <button onClick={() => p.addToEnd(x)} className="px-2.5 h-8 rounded-full text-[11px] font-semibold" style={chip(false)}>Al final</button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {!upcoming.length && !adding && <p className="text-[14px] text-white/60 py-4">No hay más canciones en la cola. {t?.videoId ? 'La radio automática seguirá con similares.' : 'Añade canciones con «Añadir».'}</p>}
        {upcoming.map((x, i) => {
          const dragging = drag?.from === i;
          return (
            <div key={`${x.id}-${i}`} ref={(el) => { rows.current[i] = el; }}
              className="flex items-center gap-2 rounded-xl" data-nohide="1"
              style={{ minHeight: ROW_H, transform: dragging ? `translateY(${drag.dy}px) scale(1.02)` : `translateY(${shift(i)}px)`, transition: dragging ? 'none' : 'transform .18s ease', position: 'relative', zIndex: dragging ? 5 : 0, background: dragging ? 'rgba(60,60,66,.92)' : 'transparent', boxShadow: dragging ? '0 12px 30px rgba(0,0,0,.45)' : 'none' }}>
              <button onPointerDown={(e) => startDrag(e, i)} aria-label={`Reordenar ${x.title}`} title="Arrastra para reordenar" className="w-8 h-11 grid place-items-center text-white/50 touch-none cursor-grab active:cursor-grabbing"><GripVertical size={18} /></button>
              <button onClick={() => p.playAt(idx + 1 + i)} className="flex-1 min-w-0 flex items-center gap-3 py-1.5 text-left" aria-label={`Reproducir ${x.title}`}>
                <Cover src={x.art} alt="" className="w-11 h-11 rounded-md" iconSize={16} />
                <span className="min-w-0 flex-1"><Marquee className="text-[15px] font-semibold">{x.title}</Marquee><Marquee className="text-[13px] text-white/60">{x.artist}</Marquee></span>
              </button>
              <button onClick={() => p.removeAt(idx + 1 + i)} aria-label={`Quitar ${x.title} de la cola`} className="w-10 h-10 grid place-items-center text-white/60 active:scale-90 transition"><X size={17} /></button>
            </div>
          );
        })}
      </section>
    </div>
  );
}
