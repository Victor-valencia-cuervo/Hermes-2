import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlarmClock, Check, GripVertical, LayoutGrid, Minus, Plus, Quote, SlidersHorizontal, Trash2 } from 'lucide-react';
import PixelFace from '../components/PixelFace';
import DeviceCard from '../components/DeviceCard';
import { APP_NAME } from '../lib/format';
import { SIZE_KEYS, WIDGETS, sizeLabel } from './registry';
import LedWidget from './LedWidgets';
import { Bubble, WeatherRow } from './CaritaParts';
import { WidgetCatalog, WidgetConfig, useWidgets } from './WidgetUI';

// ---------- Widgets nativos (lo que ya tenía el inicio) ----------
function Saludo({ now, greeting }) {
  return (
    <div className="text-center pt-2 pb-2 min-w-0">
      <h1 className="serif tracking-[0.3em] uppercase pl-[0.3em] whitespace-nowrap" style={{ fontSize: 'clamp(1.4rem, 11cqw, 3.75rem)' }}>{APP_NAME}</h1>
      <p className="text-xs mt-3 tracking-[0.25em] uppercase capitalize" style={{ color: 'var(--m)' }}>{now.toLocaleDateString('es-CO', { weekday: 'long' })}</p>
      <p className="text-sm mt-1 tabular-nums" style={{ color: 'var(--a)' }}>{now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</p>
      <p className="serif mt-4 italic text-xl" style={{ color: 'var(--m)' }}>“{greeting}”</p>
    </div>
  );
}
function Carita({ react, weather, onPoke, onOpenWeather }) {
  return (
    <div className="card h-full flex flex-col items-center gap-4">
      <PixelFace face={react.face} kind={react.kind} onClick={onPoke} />
      <Bubble>{react.say}</Bubble>
      <WeatherRow weather={weather} onClick={onOpenWeather} />
    </div>
  );
}
function Frase({ quote }) {
  return (
    <div className="card h-full flex flex-col justify-center">
      <Quote size={20} style={{ color: 'var(--a)' }} className="mb-3" />
      <p className="serif text-2xl leading-snug italic">{quote.t}</p>
      <p className="text-xs tracking-widest uppercase mt-3" style={{ color: 'var(--a)' }}>{quote.a}</p>
    </div>
  );
}
function Recordatorios({ reminders }) {
  const pending = reminders.filter((r) => !r.done).slice(0, 3);
  return (
    <div className="card h-full">
      <p className="text-xs tracking-widest mb-3" style={{ color: 'var(--m)' }}>PRÓXIMOS RECORDATORIOS</p>
      {pending.map((r) => (
        <p key={r.id} className="flex items-center gap-2 text-sm py-1"><AlarmClock size={15} style={{ color: 'var(--a)' }} />{r.text}
          <span className="text-xs" style={{ color: 'var(--m)' }}>{new Date(r.at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</span></p>
      ))}
      {!pending.length && <p className="text-sm" style={{ color: 'var(--m)' }}>Nada pendiente.</p>}
    </div>
  );
}

function Body({ w, p, interactive }) {
  switch (w.type) {
    case 'saludo': return <Saludo {...p} />;
    case 'carita': return <Carita {...p} />;
    case 'frase': return <Frase {...p} />;
    case 'dispositivo': return <DeviceCard />;
    case 'recordatorios': return <Recordatorios {...p} />;
    default: return <LedWidget item={w} ctx={p} interactive={interactive} />;
  }
}

const HOLD_MS = 5000; // pulsación larga para editar
const RING_AFTER = 450; // el anillo de progreso aparece pasado este tiempo (los toques normales no lo ven)
const MOVE_PX = 14;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// ---------- Inicio: rejilla de widgets ----------
// Normal: se usa como siempre. Dejar presionado 5 s → «Editar widget» / «Editar pantalla».
// Editar pantalla: arrastrar para ordenar, − / + para el tamaño, ajustes, quitar y agregar.
export default function HomeWidgets(props) {
  const api = useWidgets();
  const { widgets } = api;
  const loc = useLocation();
  const nav = useNavigate();
  const [edit, setEdit] = useState(false);
  const [adding, setAdding] = useState(false);
  const [cfgId, setCfgId] = useState(null);
  const [drag, setDrag] = useState(null);
  const [ring, setRing] = useState(null);
  const [menu, setMenu] = useState(null);
  const dragRef = useRef(null);
  const lastSwap = useRef(0);
  const press = useRef(null);
  const live = useRef({});
  live.current = { edit, menu };

  // «Editar pantalla» desde Ajustes llega con ?editar
  useEffect(() => {
    if (/(^|[?&])editar/.test(loc.search)) { setEdit(true); nav('/', { replace: true }); }
  }, [loc.search]); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Pulsación larga (5 s), también cuando el dedo está sobre una pantalla de puntos (iframe) -----
  const cancelPress = () => {
    const pr = press.current; if (!pr) return;
    clearTimeout(pr.timer); clearTimeout(pr.rt); press.current = null; setRing(null);
  };
  const startPress = (x, y, el) => {
    if (live.current.edit || live.current.menu) return;
    cancelPress();
    const wid = el?.closest?.('[data-wid]')?.dataset.wid || null;
    const pr = { x, y };
    pr.rt = setTimeout(() => setRing({ x, y }), RING_AFTER);
    pr.timer = setTimeout(() => {
      try { navigator.vibrate?.(25); } catch { /* sin vibración */ }
      press.current = null; setRing(null); setMenu({ x, y, wid });
    }, HOLD_MS);
    press.current = pr;
  };
  const movePress = (x, y) => { const pr = press.current; if (pr && Math.hypot(x - pr.x, y - pr.y) > MOVE_PX) cancelPress(); };
  useEffect(() => {
    const mv = (e) => movePress(e.clientX, e.clientY);
    const end = () => cancelPress();
    const fromFrame = (e) => {
      const { t, x, y, el } = e.detail || {};
      if (t === 'pointerdown') startPress(x, y, el); else if (t === 'pointermove') movePress(x, y); else end();
    };
    const noMenu = (e) => { if (press.current) e.preventDefault(); };
    window.addEventListener('pointermove', mv, { passive: true });
    window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
    window.addEventListener('hermes:wpress', fromFrame);
    window.addEventListener('contextmenu', noMenu);
    return () => {
      cancelPress();
      window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end);
      window.removeEventListener('hermes:wpress', fromFrame); window.removeEventListener('contextmenu', noMenu);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ----- Arrastrar para ordenar (modo editar) -----
  const startDrag = (e, w) => {
    e.preventDefault();
    const r = e.currentTarget.closest('[data-wid]').getBoundingClientRect();
    const d = { id: w.id, ox: Math.min(e.clientX - r.left, 200), oy: Math.min(e.clientY - r.top, 40), x: e.clientX, y: e.clientY, w: Math.min(r.width, 300) };
    dragRef.current = d; setDrag(d);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* sin captura */ }
  };
  const moveDrag = (e) => {
    const d = dragRef.current; if (!d) return;
    d.x = e.clientX; d.y = e.clientY; setDrag({ ...d });
    const hit = document.elementsFromPoint(e.clientX, e.clientY).map((n) => n.closest?.('[data-wid]')).find((n) => n && n.dataset.wid !== d.id);
    if (hit && performance.now() - lastSwap.current > 140) {
      lastSwap.current = performance.now();
      api.set((ws) => {
        const from = ws.findIndex((x) => x.id === d.id); const to = ws.findIndex((x) => x.id === hit.dataset.wid);
        if (from < 0 || to < 0 || from === to) return ws;
        const a = [...ws]; const [it] = a.splice(from, 1); a.splice(to, 0, it); return a;
      });
    }
  };
  const endDrag = () => { dragRef.current = null; setDrag(null); };
  useEffect(() => {
    if (!drag) return undefined;
    const iv = setInterval(() => {
      const d = dragRef.current; const sc = document.querySelector('main'); if (!d || !sc) return;
      if (d.y < 90) sc.scrollBy(0, -12); else if (d.y > window.innerHeight - 90) sc.scrollBy(0, 12);
    }, 16);
    return () => clearInterval(iv);
  }, [!!drag]); // eslint-disable-line react-hooks/exhaustive-deps

  const gripKeys = (e, w) => {
    const k = e.key;
    if (k === 'ArrowUp' || k === 'ArrowLeft') { e.preventDefault(); api.move(w.id, -1); }
    if (k === 'ArrowDown' || k === 'ArrowRight') { e.preventDefault(); api.move(w.id, 1); }
  };
  const cfgItem = widgets.find((w) => w.id === cfgId);
  const dragging = drag && widgets.find((w) => w.id === drag.id);
  const menuW = menu?.wid ? widgets.find((w) => w.id === menu.wid) : null;
  const tb = 'w-10 h-10 rounded-xl grid place-items-center active:scale-90 transition disabled:opacity-35';

  return (
    <div className="min-h-[70dvh] space-y-4" onPointerDown={(e) => { if (e.button > 0 || e.pointerType === 'mouse' && e.button !== 0) return; startPress(e.clientX, e.clientY, e.target); }}
      style={edit ? undefined : { WebkitTouchCallout: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      {edit && (
        <div className="sticky top-0 z-30 glass rounded-2xl p-2.5 pl-4 flex items-center gap-2 fin">
          <span className="w-9 h-9 rounded-xl grid place-items-center acc-soft shrink-0"><LayoutGrid size={18} /></span>
          <p className="min-w-0 flex-1 leading-tight">
            <span className="block text-sm font-semibold">Editar pantalla</span>
            <span className="block text-[11px]" style={{ color: 'var(--m)' }}>Arrastra <GripVertical size={11} className="inline -mt-0.5" /> para ordenar · <Minus size={11} className="inline -mt-0.5" /> <Plus size={11} className="inline -mt-0.5" /> cambian el tamaño</span>
          </p>
          <button className="btn btn-o !py-1.5 !px-3 !min-h-[40px]" onClick={() => setAdding(true)}><Plus size={15} /> Agregar</button>
          <button className="btn !py-1.5 !px-3 !min-h-[40px]" onClick={() => setEdit(false)}><Check size={15} /> Listo</button>
        </div>
      )}

      <div className="flex flex-wrap gap-4 items-stretch">
        {widgets.map((w) => {
          const def = WIDGETS[w.type]; const I = def.icon;
          const lifted = drag?.id === w.id;
          const si = SIZE_KEYS.indexOf(w.size);
          return (
            <div key={w.id} data-wid={w.id} className={`wg wg-${w.size} relative`} style={{ opacity: lifted ? 0.3 : 1, transition: 'opacity .15s' }}>
              <div className={edit ? 'h-full pointer-events-none select-none transition-transform scale-[.985]' : 'h-full'}>
                <Body w={w} p={props} interactive={!edit} />
              </div>
              {edit && (
                <div className="absolute inset-0 z-10 rounded-[1.6rem] grid place-items-center p-2 fin"
                  style={{ background: 'color-mix(in srgb, var(--bg) 52%, transparent)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', outline: '2px dashed color-mix(in srgb, var(--a) 65%, transparent)', outlineOffset: 3 }}>
                  <span className="absolute top-2 left-2 max-w-[calc(100%-1rem)] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold glass">
                    <I size={13} style={{ color: 'var(--a)' }} /><span className="truncate">{def.name}</span><span style={{ color: 'var(--m)' }}>· {sizeLabel(w.size)}</span>
                  </span>
                  <div className="flex flex-wrap items-center justify-center gap-1 p-1.5 rounded-2xl glass">
                    <button className={`${tb} touch-none cursor-grab active:cursor-grabbing`} aria-label={`Mover ${def.name}. Arrastra o usa las flechas`}
                      onPointerDown={(e) => startDrag(e, w)} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={(e) => gripKeys(e, w)}><GripVertical size={19} /></button>
                    <button className={tb} disabled={si <= 0} onClick={() => api.resize(w.id, -1)} aria-label={`Hacer más pequeño: ${def.name}`}><Minus size={19} /></button>
                    <button className={tb} disabled={si >= SIZE_KEYS.length - 1} onClick={() => api.resize(w.id, 1)} aria-label={`Hacer más grande: ${def.name}`}><Plus size={19} /></button>
                    <button className={tb} onClick={() => setCfgId(w.id)} aria-label={`Editar ${def.name}`}><SlidersHorizontal size={18} /></button>
                    <button className={tb} onClick={() => api.remove(w.id)} aria-label={`Quitar ${def.name}`} style={{ color: '#ef4444' }}><Trash2 size={18} /></button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!widgets.length && (
        <div className="card text-center py-10">
          <p className="text-sm mb-3" style={{ color: 'var(--m)' }}>Tu inicio está vacío.</p>
          <button className="btn" onClick={() => { setEdit(true); setAdding(true); }}><Plus size={16} /> Agregar un widget</button>
        </div>
      )}
      {edit && !!widgets.length && (
        <button onClick={() => setAdding(true)} className="w-full rounded-3xl py-6 text-sm flex items-center justify-center gap-2" style={{ border: '2px dashed var(--bd)', color: 'var(--m)' }}><Plus size={18} /> Agregar widget</button>
      )}

      {/* Anillo de progreso de la pulsación larga */}
      {ring && (
        <svg className="fixed z-[74] pointer-events-none" width="64" height="64" viewBox="0 0 64 64" style={{ left: ring.x - 32, top: ring.y - 32 }} aria-hidden="true">
          <circle cx="32" cy="32" r="26" fill="color-mix(in srgb, var(--a) 14%, transparent)" stroke="color-mix(in srgb, var(--a) 25%, transparent)" strokeWidth="5" />
          <circle className="hold-ring" cx="32" cy="32" r="26" fill="none" stroke="var(--a)" strokeWidth="5" strokeLinecap="round" transform="rotate(-90 32 32)" />
        </svg>
      )}

      {/* Opciones tras mantener presionado */}
      {menu && (
        <>
          <div className="fixed inset-0 z-[75]" onPointerDown={() => setMenu(null)} aria-hidden="true" />
          <div role="menu" aria-label="Editar inicio" className="fixed z-[76] glass rounded-2xl p-1.5 w-60 shadow-2xl modal-in"
            style={{ left: clamp(menu.x - 120, 8, window.innerWidth - 248), top: clamp(menu.y - 70, 8, window.innerHeight - 150) }}>
            <p className="px-3 pt-2 pb-1 text-[11px] tracking-widest uppercase truncate" style={{ color: 'var(--m)' }}>{menuW ? WIDGETS[menuW.type].name : 'Pantalla de inicio'}</p>
            {menuW && (
              <button role="menuitem" className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-left hover:bg-[var(--s2)] active:scale-[.98] transition" onClick={() => { setCfgId(menuW.id); setMenu(null); }}>
                <SlidersHorizontal size={18} style={{ color: 'var(--a)' }} />Editar widget
              </button>
            )}
            <button role="menuitem" className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-left hover:bg-[var(--s2)] active:scale-[.98] transition" onClick={() => { setEdit(true); setMenu(null); }}>
              <LayoutGrid size={18} style={{ color: 'var(--a)' }} />Editar pantalla
            </button>
          </div>
        </>
      )}

      {dragging && (
        <div className="fixed z-[80] pointer-events-none rounded-2xl glass px-4 py-3 flex items-center gap-3 shadow-2xl" style={{ left: drag.x - drag.ox, top: drag.y - drag.oy, width: drag.w, border: '2px solid var(--a)' }}>
          {(() => { const I = WIDGETS[dragging.type].icon; return <I size={20} style={{ color: 'var(--a)' }} />; })()}
          <span className="text-sm font-semibold truncate">{WIDGETS[dragging.type].name}</span>
        </div>
      )}
      {adding && <WidgetCatalog widgets={widgets} onClose={() => setAdding(false)} onAdd={(t) => { const w = api.add(t); setAdding(false); setCfgId(w.id); }} />}
      {cfgItem && <WidgetConfig item={cfgItem} onChange={(p) => api.patch(cfgItem.id, p)} onClose={() => setCfgId(null)} onRemove={() => { api.remove(cfgItem.id); setCfgId(null); }} />}
    </div>
  );
}
