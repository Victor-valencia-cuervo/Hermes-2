import { useState } from 'react';
import { Paintbrush, X, RotateCcw } from 'lucide-react';
import useStore from '../hooks/useStore';

export const PARTICLE_DEF = {
  enabled: true, density: 170, radius: 170, force: 5, showLines: true, maxOpacity: 0.55,
};

export function useParticleCfg() {
  // v3: reacción más notoria al dedo/mouse (la v2 guardaba la tímida)
  return useStore('h_particle_cfg_v3', PARTICLE_DEF);
}

function Row({ label, val, children }) {
  return (
    <div>
      <div className="flex justify-between mb-1" style={{ color: 'var(--m)' }}>
        <span>{label}</span>
        <span className="font-mono" style={{ color: 'var(--t)' }}>{val}</span>
      </div>
      {children}
    </div>
  );
}

/** Engranaje + panel glass para personalizar el fondo (el color es automático). */
export default function ParticleSettings({ cfg, setCfg }) {
  const [open, setOpen] = useState(false);
  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const forceLabel = cfg.force < 3 ? 'Suave' : cfg.force < 7 ? 'Medio' : 'Intenso';
  const densityLabel = cfg.density < 80 ? 'Baja' : cfg.density < 180 ? 'Media' : 'Alta';

  return (
    <div className="relative">
      <button className="ico-btn !p-2" onClick={() => setOpen((o) => !o)}
        aria-label="Personalizar fondo" title="Personalizar fondo"
        style={open ? { color: 'var(--a)' } : undefined}>
        <Paintbrush size={18} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 w-72 rounded-2xl border p-4 glass text-xs"
          style={{ borderColor: 'var(--bd)' }} role="dialog" aria-label="Ajustes de partículas">
          <div className="flex items-center justify-between pb-3 mb-3 border-b" style={{ borderColor: 'var(--bd)' }}>
            <p className="font-medium text-sm">Fondo de partículas</p>
            <button className="ico-btn" onClick={() => setOpen(false)} aria-label="Cerrar ajustes"><X size={16} /></button>
          </div>
          <div className="space-y-4">
            <p className="-mt-1" style={{ color: 'var(--m)' }}>El color lo pone la carátula automáticamente.</p>
            <label className="flex items-center justify-between cursor-pointer rounded-xl px-3 py-2.5 border"
              onClick={(e) => { e.preventDefault(); set('enabled', !(cfg.enabled !== false)); }}
              style={{ borderColor: 'var(--a)', background: 'color-mix(in srgb, var(--a) 12%, transparent)' }}>
              <span className="font-medium text-sm" style={{ color: 'var(--t)' }}>
                Fondo {cfg.enabled !== false ? 'activado' : 'apagado'}
              </span>
              <span role="switch" aria-checked={cfg.enabled !== false} aria-label="Fondo de partículas"
                className="w-11 h-6 rounded-full relative shrink-0 transition cursor-pointer"
                style={{ background: cfg.enabled !== false ? 'var(--a)' : 'var(--s2)', border: '1px solid var(--bd)' }}>
                <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
                  style={{ left: cfg.enabled !== false ? '1.375rem' : '0.125rem' }} />
              </span>
            </label>
            <Row label="Cantidad" val={densityLabel}>
              <input type="range" min="50" max="300" step="10" value={cfg.density}
                onChange={(e) => set('density', +e.target.value)} className="w-full" aria-label="Cantidad" />
            </Row>
            <Row label="Radio del dedo/mouse" val={`${cfg.radius}px`}>
              <input type="range" min="60" max="300" step="10" value={cfg.radius}
                onChange={(e) => set('radius', +e.target.value)} className="w-full" aria-label="Sensibilidad" />
            </Row>
            <Row label="Fuerza de dispersión" val={forceLabel}>
              <input type="range" min="1" max="10" step="0.5" value={cfg.force}
                onChange={(e) => set('force', +e.target.value)} className="w-full" aria-label="Fuerza" />
            </Row>
            <label className="flex items-center justify-between cursor-pointer" style={{ color: 'var(--m)' }}>
              <span>Líneas de unión</span>
              <input type="checkbox" checked={!!cfg.showLines} onChange={(e) => set('showLines', e.target.checked)}
                className="w-4 h-4" style={{ accentColor: 'var(--a)' }} aria-label="Líneas de unión" />
            </label>
            <Row label="Opacidad máxima" val={Number(cfg.maxOpacity).toFixed(2)}>
              <input type="range" min="0.1" max="0.8" step="0.05" value={cfg.maxOpacity}
                onChange={(e) => set('maxOpacity', +e.target.value)} className="w-full" aria-label="Opacidad" />
            </Row>
            <button className="flex items-center gap-1.5" style={{ color: 'var(--m)' }}
              onClick={() => setCfg(PARTICLE_DEF)}>
              <RotateCcw size={13} /> Restablecer
            </button>
            <p className="text-right font-mono" style={{ color: 'var(--m)', opacity: 0.6 }}>fondo v3</p>
          </div>
        </div>
      )}
    </div>
  );
}
