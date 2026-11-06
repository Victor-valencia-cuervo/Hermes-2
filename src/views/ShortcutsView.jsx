import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import Title from '../components/Title';
import Ico from '../components/Ico';

export default function ShortcutsView({ shortcuts, setShortcuts }) {
  const [f, setF] = useState({ label: '', url: '', kind: 'web' });
  const add = () => {
    if (!f.label.trim() || !f.url.trim()) return;
    setShortcuts([...shortcuts, { id: Date.now(), ...f, icon: f.kind === 'app' ? 'Smartphone' : 'Globe' }]); setF({ label: '', url: '', kind: 'web' });
  };
  return (
    <>
      <Title>Atajos</Title>
      {[['app', 'Aplicaciones'], ['web', 'Páginas web']].map(([k, l]) => (
        <div key={k}>
          <p className="text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--m)' }}>{l}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {shortcuts.filter((s) => s.kind === k).map((s) => (
              <div key={s.id} className="card relative text-center hover:-translate-y-0.5 transition">
                <a href={s.url} target={k === 'web' ? '_blank' : undefined} rel="noreferrer" className="flex flex-col items-center gap-2">
                  <Ico name={s.icon} size={26} strokeWidth={1.5} style={{ color: 'var(--a)' }} /><span className="text-xs tracking-wider">{s.label}</span>
                </a>
                <button className="ico-btn absolute top-1.5 right-1.5 !p-1" onClick={() => setShortcuts(shortcuts.filter((x) => x.id !== s.id))} aria-label={`Quitar ${s.label}`}><X size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="card space-y-2">
        <input className="inp" placeholder="Nombre" value={f.label} onChange={(e) => setF({ ...f, label: e.target.value })} />
        <input className="inp" placeholder="URL o esquema (https://… o whatsapp://)" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
        <div className="flex gap-2">
          <select className="inp" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="web">Web</option><option value="app">App</option></select>
          <button className="btn" onClick={add}><Plus size={16} />Añadir</button>
        </div>
      </div>
    </>
  );
}
