import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, ChevronUp, LayoutGrid, Plus, RotateCcw, SlidersHorizontal, Trash2, X } from 'lucide-react';
import useStore from '../hooks/useStore';
import { DEFAULT_WIDGETS, ORDER_CATALOG, SIZES, SIZE_KEYS, WIDGETS, makeWidget, normalizeWidgets, sizeLabel } from './registry';
import LedWidget from './LedWidgets';

/** Estado compartido de los widgets (misma clave en Inicio y en Ajustes: se sincronizan en vivo). */
export function useWidgets() {
  const [raw, setRaw] = useStore('h_widgets', DEFAULT_WIDGETS);
  const widgets = normalizeWidgets(raw);
  const set = (next) => setRaw(typeof next === 'function' ? next(widgets) : next);
  return {
    widgets, set,
    add: (type) => { const w = makeWidget(type); set((ws) => [...ws, w]); return w; },
    remove: (id) => set((ws) => ws.filter((w) => w.id !== id)),
    patch: (id, p) => set((ws) => ws.map((w) => (w.id === id ? { ...w, ...p, cfg: p.cfg ? { ...w.cfg, ...p.cfg } : w.cfg } : w))),
    move: (id, dir) => set((ws) => { const i = ws.findIndex((w) => w.id === id); const j = i + dir; if (i < 0 || j < 0 || j >= ws.length) return ws; const a = [...ws]; [a[i], a[j]] = [a[j], a[i]]; return a; }),
    resize: (id, dir) => set((ws) => ws.map((w) => { if (w.id !== id) return w; const i = SIZE_KEYS.indexOf(w.size) + dir; return i < 0 || i >= SIZE_KEYS.length ? w : { ...w, size: SIZE_KEYS[i] }; })),
    reset: () => set(DEFAULT_WIDGETS),
  };
}

export function Sheet({ title, onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm fin" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full sm:max-w-lg max-h-[88dvh] flex flex-col glass rounded-t-3xl sm:rounded-3xl sheet overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <p className="text-base font-semibold truncate">{title}</p>
          <button className="ico-btn" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] min-h-0">{children}</div>
      </div>
    </div>, document.body);
}

const same = (a, b) => String(a) === String(b);
function Seg({ options, value, onPick }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([val, label]) => (
        <button key={String(val)} onClick={() => onPick(val)} aria-pressed={same(value, val)} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${same(value, val) ? 'btn' : 'btn btn-o'}`} style={{ minHeight: 36 }}>{label}</button>
      ))}
    </div>
  );
}
function Field({ f, cfg, onChange }) {
  const v = cfg[f.key];
  const set = (x) => onChange({ [f.key]: x });
  if (f.type === 'toggle') {
    return (
      <button onClick={() => set(!v)} role="switch" aria-checked={!!v} className="w-full flex items-center justify-between gap-3 py-2 text-left">
        <span className="text-xs font-semibold">{f.label}</span>
        <span className="w-11 h-6 rounded-full relative shrink-0" style={{ background: v ? 'var(--a)' : 'var(--bd)' }}><span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: v ? 22 : 2 }} /></span>
      </button>
    );
  }
  return (
    <div className="py-2">
      <p className="text-xs font-semibold mb-1.5">{f.label}</p>
      {f.type === 'seg' && <Seg options={f.options} value={v} onPick={set} />}
      {f.type === 'select' && (
        <select className="inp" value={String(v)} onChange={(e) => set((f.options.find(([val]) => same(val, e.target.value)) || [])[0] ?? e.target.value)}>
          {f.options.map(([val, label]) => <option key={String(val)} value={String(val)}>{label}</option>)}
        </select>
      )}
      {f.type === 'text' && <input className="inp" value={v ?? ''} maxLength={f.max || 60} onChange={(e) => set(e.target.value.toUpperCase())} />}
      {f.type === 'range' && (
        <div className="flex items-center gap-3">
          <input type="range" className="flex-1" min={f.min} max={f.max} step={f.step || 1} value={v} onChange={(e) => set(+e.target.value)} style={{ accentColor: 'var(--a)' }} />
          <span className="text-xs tabular-nums w-8 text-right" style={{ color: 'var(--m)' }}>{v}</span>
        </div>
      )}
    </div>
  );
}

/** Editar un widget: tamaño (muy pequeño → muy grande) y sus opciones. Se aplica en vivo. */
export function WidgetConfig({ item, onChange, onClose, onRemove }) {
  const def = WIDGETS[item.type];
  const I = def.icon;
  return (
    <Sheet title="Editar widget" onClose={onClose}>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-11 h-11 rounded-2xl grid place-items-center shrink-0 acc-soft"><I size={22} /></span>
        <span className="min-w-0"><span className="block text-sm font-semibold">{def.name}</span><span className="block text-[11px] leading-snug" style={{ color: 'var(--m)' }}>{def.desc}</span></span>
      </div>
      {def.kind === 'led' && <div className="mb-3 max-w-[320px] mx-auto"><LedWidget item={{ ...item, size: 'm' }} ctx={{ playing: false, idle: 0, hour: 12 }} interactive={false} /></div>}
      <div className="rounded-2xl p-3 mb-2" style={{ background: 'var(--s2)' }}>
        <p className="text-xs font-semibold mb-1.5">Tamaño</p>
        <Seg options={SIZES} value={item.size} onPick={(v) => onChange({ size: v })} />
        <p className="text-[11px] mt-2" style={{ color: 'var(--m)' }}>En el celular, «Normal», «Grande» y «Muy grande» ocupan toda la fila.</p>
      </div>
      {def.settings.length > 0 && (
        <div className="rounded-2xl px-3 py-1 mb-2" style={{ background: 'var(--s2)' }}>
          {def.settings.filter((f) => !f.when || f.when(item.cfg)).map((f) => <Field key={f.key} f={f} cfg={item.cfg} onChange={(p) => onChange({ cfg: p })} />)}
        </div>
      )}
      <div className="flex gap-2 mt-3">
        {onRemove && <button className="btn btn-o flex-1" onClick={onRemove}><Trash2 size={15} /> Quitar</button>}
        <button className="btn flex-1" onClick={onClose}><Check size={15} /> Listo</button>
      </div>
    </Sheet>
  );
}

/** Catálogo para agregar widgets. Reloj, Zen y Pantalla LED admiten varias copias; el resto, una. */
export function WidgetCatalog({ widgets, onAdd, onClose }) {
  return (
    <Sheet title="Agregar widget" onClose={onClose}>
      <div className="grid gap-2 sm:grid-cols-2">
        {ORDER_CATALOG.map((type) => {
          const d = WIDGETS[type]; const I = d.icon; const n = widgets.filter((w) => w.type === type).length; const blocked = n > 0 && !d.multi;
          return (
            <button key={type} disabled={blocked} onClick={() => onAdd(type)} aria-label={`Agregar ${d.name}`}
              className="text-left flex flex-col gap-2 p-3.5 rounded-2xl transition active:scale-[.98] disabled:opacity-50" style={{ background: 'var(--s2)', border: '1px solid var(--bd)' }}>
              <span className="flex items-center justify-between">
                <span className="w-10 h-10 rounded-xl grid place-items-center acc-soft"><I size={20} /></span>
                <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={blocked ? { color: 'var(--m)' } : { background: 'var(--a)', color: '#fff' }}>
                  {blocked ? 'Ya agregado' : <><Plus size={11} className="inline -mt-0.5" /> Agregar{n ? ` (${n})` : ''}</>}
                </span>
              </span>
              <span className="text-sm font-semibold leading-tight">{d.name}{d.multi && <span className="ml-1.5 text-[10px] font-normal align-middle" style={{ color: 'var(--m)' }}>varios</span>}</span>
              <span className="text-[11px] leading-snug" style={{ color: 'var(--m)' }}>{d.desc}</span>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

/** Tarjeta de Ajustes: qué widgets hay en el inicio, en qué orden, de qué tamaño y cómo se ven. */
export function WidgetManager({ onEditHome }) {
  const api = useWidgets();
  const [adding, setAdding] = useState(false);
  const [cfgId, setCfgId] = useState(null);
  const cfgItem = api.widgets.find((w) => w.id === cfgId);
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 mb-1">
        <p className="text-sm font-semibold flex items-center gap-2"><LayoutGrid size={16} style={{ color: 'var(--a)' }} />Widgets del inicio</p>
        <span className="text-[11px] px-2 py-1 rounded-full" style={{ background: 'var(--s2)', color: 'var(--m)' }}>{api.widgets.length} activos</span>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--m)' }}>Agrega, quita, cambia el tamaño y el orden. Todos toman el color de la app. En el inicio, deja presionado 5 segundos para editar widget o pantalla.</p>
      <div className="space-y-1.5 mb-3">
        {api.widgets.map((w, i) => {
          const d = WIDGETS[w.type]; const I = d.icon;
          return (
            <div key={w.id} className="flex items-center gap-2 p-2 pr-1 rounded-2xl" style={{ background: 'var(--s2)' }}>
              <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0 acc-soft"><I size={19} /></span>
              <button className="min-w-0 flex-1 text-left" onClick={() => setCfgId(w.id)} aria-label={`Editar ${d.name}`}>
                <span className="block text-sm font-medium truncate">{d.name}</span>
                <span className="block text-[11px]" style={{ color: 'var(--m)' }}>{sizeLabel(w.size)}</span>
              </button>
              <button className="ico-btn" disabled={i === 0} onClick={() => api.move(w.id, -1)} aria-label={`Subir ${d.name}`}><ChevronUp size={18} /></button>
              <button className="ico-btn" disabled={i === api.widgets.length - 1} onClick={() => api.move(w.id, 1)} aria-label={`Bajar ${d.name}`}><ChevronDown size={18} /></button>
              <button className="ico-btn" onClick={() => setCfgId(w.id)} aria-label={`Editar ${d.name}`}><SlidersHorizontal size={17} /></button>
              <button className="ico-btn" onClick={() => api.remove(w.id)} aria-label={`Quitar ${d.name}`}><Trash2 size={17} /></button>
            </div>
          );
        })}
        {!api.widgets.length && <p className="text-xs py-3 text-center" style={{ color: 'var(--m)' }}>El inicio está vacío. Agrega un widget.</p>}
      </div>
      <div className="flex gap-2 flex-wrap">
        <button className="btn flex-1" onClick={() => setAdding(true)}><Plus size={15} /> Agregar widget</button>
        {onEditHome && <button className="btn btn-o flex-1" onClick={onEditHome}>Editar pantalla</button>}
        <button className="btn btn-o" onClick={api.reset} aria-label="Restaurar el inicio original" title="Restaurar el inicio original"><RotateCcw size={15} /></button>
      </div>
      {adding && <WidgetCatalog widgets={api.widgets} onClose={() => setAdding(false)} onAdd={(t) => { const w = api.add(t); setAdding(false); setCfgId(w.id); }} />}
      {cfgItem && <WidgetConfig item={cfgItem} onChange={(p) => api.patch(cfgItem.id, p)} onClose={() => setCfgId(null)} onRemove={() => { api.remove(cfgItem.id); setCfgId(null); }} />}
    </div>
  );
}
