import { useState } from 'react';
import { APP_NAME } from '../lib/format';

export default function NameModal({ onSave, onSkip }) {
  const [v, setV] = useState('');
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md">
      <form role="dialog" aria-modal="true" aria-label="Tu nombre" className="card w-full max-w-sm text-center space-y-4 shadow-2xl !p-8"
        onSubmit={(e) => { e.preventDefault(); if (v.trim()) onSave(v.trim()); }}>
        <p className="serif text-3xl tracking-[0.3em] uppercase pl-[0.3em]">{APP_NAME}</p>
        <p className="text-sm" style={{ color: 'var(--m)' }}>¿Cómo te llamo?</p>
        <input className="inp text-center" autoFocus value={v} onChange={(e) => setV(e.target.value)} placeholder="Tu nombre" maxLength={30} />
        <div className="flex gap-2">
          <button type="button" className="btn btn-o flex-1" onClick={onSkip}>Omitir</button>
          <button type="submit" className="btn flex-1">Continuar</button>
        </div>
      </form>
    </div>
  );
}
