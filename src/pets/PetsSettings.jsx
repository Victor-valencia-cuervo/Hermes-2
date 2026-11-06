import { useState } from 'react';
import { Check, Hand, PawPrint, Pencil, Plus, Shuffle, Sparkles, Vibrate } from 'lucide-react';
import { MAX_PETS } from './pets';
import { MAX_CUSTOM, isCustom, useCatalog } from './catalog';
import PetStudio from './PetStudio';
import { normalizePets } from './settings';
import { SHAKE_LABEL, fireShake, motionPermissionNeeded, requestMotionPermission } from '../hooks/useShake';

const Seg = ({ value, onChange, options, label }) => (
  <div role="group" aria-label={label} className="flex gap-1.5 flex-wrap">
    {options.map(([v, t]) => (
      <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
        className={`px-3.5 py-2 rounded-xl text-xs transition ${value === v ? 'acc-soft' : 'hover:bg-[var(--s2)]'}`}
        style={{ border: '1px solid var(--bd)' }}>{t}</button>
    ))}
  </div>
);

const Switch = ({ on, onChange, label }) => (
  <button onClick={() => onChange(!on)} role="switch" aria-checked={on} aria-label={label}
    className="w-12 h-7 rounded-full relative transition-colors shrink-0" style={{ background: on ? 'var(--a)' : 'var(--s2)', border: '1px solid var(--bd)' }}>
    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-0.5'}`} />
  </button>
);

// Miniatura: primer frame de la tira, escalada para que el cuerpo se vea grande y centrada en 64×52.
function Thumb({ p }) {
  const bodyH = p.cell[1] * (p.body[1] / p.disp[1]);
  const bodyW = p.cell[0] * (p.body[0] / p.disp[0]);
  const k = Math.min(42 / bodyH, 58 / bodyW);
  const w = p.cell[0] * k; const h = p.cell[1] * k;
  return (
    <span aria-hidden="true" style={{ position: 'relative', display: 'block', width: 64, height: 52, overflow: 'hidden' }}>
      <span style={{ position: 'absolute', left: '50%', bottom: 0, width: w, height: h, transform: 'translateX(-50%)', backgroundImage: `url(${p.url || `pets/${p.id}.webp?v=4`})`, backgroundSize: `${p.n * w}px ${h}px`, backgroundPosition: '0 0', clipPath: 'inset(0 1px 0 1px)' }} />
    </span>
  );
}

export default function PetsSettings({ pets, setPets, toast }) {
  const cfg = normalizePets(pets);
  const set = (patch) => setPets({ ...cfg, ...patch });
  const [motion, setMotion] = useState('idle');
  const PETS = useCatalog();
  const [studio, setStudio] = useState(null); // { type, id? }
  const nCustom = PETS.filter((p) => p.custom).length;
  const toggle = (id) => {
    if (cfg.sel.includes(id)) return set({ sel: cfg.sel.filter((x) => x !== id) });
    if (cfg.sel.length >= MAX_PETS) { toast?.(`Máximo ${MAX_PETS} mascotas a la vez`, PawPrint); return undefined; }
    return set({ sel: [...cfg.sel, id], on: true });
  };

  return (
    <div className="card space-y-5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-3 text-sm"><PawPrint size={18} />Mascotas flotantes</span>
        <Switch on={cfg.on} onChange={(on) => set({ on })} label="Activar mascotas" />
      </div>

      <div className={cfg.on ? '' : 'opacity-50 pointer-events-none'} aria-disabled={!cfg.on}>
        <p className="text-xs tracking-widest mb-3" style={{ color: 'var(--m)' }}>ELIGE HASTA {MAX_PETS} · {cfg.sel.length}/{MAX_PETS}</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {PETS.map((p) => {
            const i = cfg.sel.indexOf(p.id); const on = i >= 0;
            return (
              <div key={p.id} className="relative">
                <button type="button" onClick={() => toggle(p.id)} aria-pressed={on} aria-label={p.name}
                  className="relative w-full flex flex-col items-center justify-end gap-1 rounded-2xl pt-3 pb-2 transition active:scale-95"
                  style={{ background: on ? 'color-mix(in srgb, var(--a) 12%, transparent)' : 'var(--s2)', outline: on ? '2px solid var(--a)' : '1px solid var(--bd)', outlineOffset: -1 }}>
                  <span className="h-[52px] flex items-end"><Thumb p={p} /></span>
                  <span className="text-[11px] max-w-full truncate px-1" style={{ color: on ? 'var(--a)' : 'var(--m)' }}>{p.name}</span>
                  {on && <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: 'var(--a)' }}><Check size={12} strokeWidth={3} /></span>}
                </button>
                <button type="button" onClick={() => setStudio({ type: isCustom(p.id) ? 'custom' : 'builtin', id: p.id })} aria-label={`Editar ${p.name}`} title={isCustom(p.id) ? 'Editar / eliminar' : 'Añadir frases e imágenes'}
                  className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full grid place-items-center" style={{ background: 'rgba(0,0,0,.45)', color: '#fff' }}><Pencil size={10} /></button>
              </div>
            );
          })}
          <button type="button" onClick={() => (nCustom >= MAX_CUSTOM ? toast?.(`Máximo ${MAX_CUSTOM} mascotas propias`, PawPrint) : setStudio({ type: 'new' }))}
            className="flex flex-col items-center justify-center gap-1 rounded-2xl py-3 min-h-[92px] transition active:scale-95" style={{ border: '1px dashed var(--bd)', color: 'var(--a)' }}>
            <Plus size={22} /><span className="text-[11px]">Nueva mascota</span>
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mt-6">
          <div><p className="text-sm mb-2">Tamaño</p>
            <Seg label="Tamaño" value={cfg.size} onChange={(size) => set({ size })} options={[['s', 'Pequeño'], ['m', 'Normal'], ['l', 'Grande']]} /></div>
          <div><p className="text-sm mb-2">Movimiento</p>
            <Seg label="Movimiento" value={cfg.mode} onChange={(mode) => set({ mode })} options={[['walk', 'Caminar por el suelo'], ['float', 'Flotar libre']]} /></div>
          <div><p className="text-sm mb-2">Saludos y comentarios</p>
            <Seg label="Frecuencia" value={cfg.freq} onChange={(freq) => set({ freq })} options={[['low', 'Pocos'], ['normal', 'Normal'], ['high', 'Muchos']]} /></div>
          <div className="flex items-center justify-between gap-3"><span className="text-sm">Globos de texto</span>
            <Switch on={cfg.talk} onChange={(talk) => set({ talk })} label="Globos de texto" /></div>
        </div>

        <div className="flex gap-2 flex-wrap mt-5">
          <button type="button" className="btn btn-o" onClick={() => window.dispatchEvent(new Event('hermes:pet-greet'))}><Hand size={15} />Saludar ahora</button>
          <button type="button" className="btn btn-o" onClick={() => window.dispatchEvent(new Event('hermes:pet-gather'))}><Shuffle size={15} />Reunirlas de nuevo</button>
          <button type="button" className="btn btn-o" onClick={() => window.dispatchEvent(new Event('hermes:pet-special'))}><Sparkles size={15} />Probar sus trucos</button>
        </div>

        <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--bd)' }}>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-3 text-sm"><Vibrate size={18} />Sacudida por gravedad</span>
            <Switch on={!!cfg.shake} onChange={(shake) => set({ shake })} label="Activar sacudida por gravedad" />
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--m)' }}>
            Apagada por defecto. Al activarla, sacudir el celular lanza a las mascotas: vuelan, caen y rebotan.
          </p>
          {cfg.shake && (
            <div className="mt-4 space-y-4">
              <div><p className="text-sm mb-2">Sensibilidad</p>
                <Seg label="Sensibilidad de sacudida" value={cfg.shakeSens} onChange={(shakeSens) => set({ shakeSens })}
                  options={Object.entries(SHAKE_LABEL)} /></div>
              <div className="flex gap-2 flex-wrap">
                {motionPermissionNeeded() && (
                  <button type="button" className="btn btn-o" disabled={motion === 'granted'}
                    onClick={async () => {
                      const r = await requestMotionPermission();
                      setMotion(r);
                      toast?.(r === 'granted' ? 'Sensor activado, ¡sacude!' : 'Sin permiso no hay sacudida', Vibrate);
                    }}>
                    <Vibrate size={15} />{motion === 'granted' ? 'Sensor listo' : 'Permitir sensor'}
                  </button>
                )}
                <button type="button" className="btn btn-o" onClick={() => fireShake(0.7)}><Vibrate size={15} />Probar sacudida</button>
              </div>
            </div>
          )}
        </div>
        <p className="text-xs mt-4" style={{ color: 'var(--m)' }}>
          Arrástralas por la pantalla, tócalas para mimarlas. Cada una tiene un truco especial que hace de vez en cuando (el Conde se vuelve murciélago, Rick abre un portal, la Brujita invoca un rayo…). Reaccionan al clima, a la música y la radio, a tus recordatorios y se duermen si no estás.
        </p>
      </div>
      {studio && <PetStudio target={studio} toast={toast} onClose={() => setStudio(null)} onSaved={(id, created) => { if (created && cfg.sel.length < MAX_PETS) set({ sel: [...cfg.sel, id], on: true }); }} />}
    </div>
  );
}
