import { useEffect, useRef, useState } from 'react';
import { Plus, X, Trash2, Wand2, Upload } from 'lucide-react';
import { STATES, STATE_LABEL, MAX_IMGS, getMeta, getExtra, getImg, newImgKey, putImg, prepImage, saveCustom, saveExtra, resetExtra, removeCustom } from './catalog';
import { PET_BY_ID } from './pets';

/* Editor de mascotas.
   target = { type:'new' } | { type:'custom', id } | { type:'builtin', id }
   - nueva / propia: nombre, frases, frases con música, imágenes por acción (se elige una al azar) e imagen de poder.
   - de fábrica: solo frases y fotogramas extra (no se pueden borrar ni cambiar). */
const lines = (t) => t.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 40);

export default function PetStudio({ target, onClose, onSaved, toast }) {
  const builtin = target.type === 'builtin';
  const isNew = target.type === 'new';
  const base = builtin ? PET_BY_ID[target.id] : null;
  // items: { key, url, blob? } — blob = aún sin guardar
  const [name, setName] = useState('');
  const [phrases, setPhrases] = useState('');
  const [musicPhrases, setMusicPhrases] = useState('');
  const [actions, setActions] = useState({});
  const [power, setPower] = useState(null);
  const [powerPhrases, setPowerPhrases] = useState('');
  const [removeBg, setRemoveBg] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(isNew);
  const files = useRef({});

  useEffect(() => {
    if (isNew) return undefined;
    let dead = false;
    (async () => {
      const m = builtin ? getExtra(target.id) : getMeta(target.id);
      if (!m) { setReady(true); return; }
      setName(m.name || ''); setPhrases((m.phrases || []).join('\n')); setMusicPhrases((m.musicPhrases || []).join('\n'));
      const acts = {};
      for (const s of STATES) {
        acts[s] = [];
        for (const k of m.actions?.[s] || []) { const b = await getImg(k); if (b) acts[s].push({ key: k, url: URL.createObjectURL(b) }); }
      }
      if (m.power?.key) { const b = await getImg(m.power.key); if (b) setPower({ key: m.power.key, url: URL.createObjectURL(b) }); setPowerPhrases((m.power.phrases || []).join('\n')); }
      if (!dead) { setActions(acts); setReady(true); }
    })();
    return () => { dead = true; };
  }, [target.id, target.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = Object.values(actions).flat().length;
  const addFiles = async (state, fl) => {
    const room = MAX_IMGS - total;
    const picked = [...fl].filter((f) => f.type.startsWith('image/')).slice(0, Math.max(0, room));
    if (!picked.length) { toast?.(`Máximo ${MAX_IMGS} imágenes por mascota`); return; }
    const added = [];
    for (const f of picked) {
      try { const blob = await prepImage(f, { removeBg }); const key = newImgKey(target.id || 'n'); files.current[key] = blob; added.push({ key, url: URL.createObjectURL(blob) }); } catch { toast?.('No pude leer esa imagen'); }
    }
    setActions((a) => ({ ...a, [state]: [...(a[state] || []), ...added] }));
  };
  const rm = (state, key) => setActions((a) => ({ ...a, [state]: a[state].filter((x) => x.key !== key) }));
  const addPower = async (f) => {
    if (!f) return;
    const blob = await prepImage(f, { removeBg, max: 200 }); const key = newImgKey(target.id || 'n'); files.current[key] = blob;
    setPower({ key, url: URL.createObjectURL(blob) });
  };

  const canSave = builtin ? true : (name.trim() && (actions.idle || []).length > 0);
  const save = async () => {
    setBusy(true);
    try {
      // guarda en IndexedDB solo las imágenes nuevas que siguen en uso
      const used = [...Object.values(actions).flat(), power].filter(Boolean);
      await Promise.all(used.filter((i) => files.current[i.key]).map((i) => putImg(i.key, files.current[i.key])));
      const acts = Object.fromEntries(STATES.map((s) => [s, (actions[s] || []).map((i) => i.key)]));
      if (builtin) await saveExtra(target.id, { phrases: lines(phrases), musicPhrases: lines(musicPhrases), actions: acts });
      else {
        const id = await saveCustom({ id: target.type === 'custom' ? target.id : undefined, name, phrases: lines(phrases), musicPhrases: lines(musicPhrases), actions: acts, power: power ? { key: power.key, phrases: lines(powerPhrases) } : null });
        onSaved?.(id, isNew);
      }
      toast?.('Mascota guardada');
      onClose();
    } catch (e) { toast?.('No se pudo guardar (¿sin espacio?)'); console.warn(e); }
    setBusy(false);
  };
  const del = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`¿Eliminar a ${name || 'esta mascota'}? No se puede deshacer.`)) return;
    await removeCustom(target.id); toast?.('Mascota eliminada'); onClose();
  };
  const reset = async () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm('¿Quitar tus frases e imágenes extra de esta mascota?')) return;
    await resetExtra(target.id); toast?.('Extras quitados'); onClose();
  };

  const TA = 'w-full rounded-xl px-3 py-2 text-sm bg-transparent';
  const box = { border: '1px solid var(--bd)' };
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" style={{ background: 'rgba(0,0,0,.6)' }} onClick={onClose}>
      <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-5" style={{ background: 'var(--s)', border: '1px solid var(--bd)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="serif text-xl">{isNew ? 'Nueva mascota' : builtin ? `Personalizar: ${base?.name}` : `Editar: ${name}`}</h3>
          <button className="ico-btn" onClick={onClose} aria-label="Cerrar"><X size={18} /></button>
        </div>
        {!ready ? <p className="text-sm" style={{ color: 'var(--m)' }}>Cargando…</p> : (
          <>
            {builtin
              ? <p className="text-xs" style={{ color: 'var(--m)' }}>A las mascotas de fábrica solo se les pueden añadir frases e imágenes extra; las tuyas se mezclan con las que ya tienen.</p>
              : (
                <label className="block">
                  <span className="text-xs tracking-widest" style={{ color: 'var(--m)' }}>NOMBRE</span>
                  <input className={`${TA} mt-1`} style={box} maxLength={24} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Tiburón" />
                </label>
              )}

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs tracking-widest" style={{ color: 'var(--m)' }}>FRASES (UNA POR LÍNEA)</span>
                <textarea className={`${TA} mt-1`} style={box} rows={4} value={phrases} onChange={(e) => setPhrases(e.target.value)} placeholder={'¡Hola!\nTengo hambre…'} />
              </label>
              <label className="block">
                <span className="text-xs tracking-widest" style={{ color: 'var(--m)' }}>FRASES CUANDO SUENA MÚSICA</span>
                <textarea className={`${TA} mt-1`} style={box} rows={4} value={musicPhrases} onChange={(e) => setMusicPhrases(e.target.value)} placeholder={'¡Qué buen tema!\nSube el volumen.'} />
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs tracking-widest" style={{ color: 'var(--m)' }}>IMÁGENES POR ACCIÓN · {total}/{MAX_IMGS}</span>
                <label className="flex items-center gap-1.5 text-[11px] cursor-pointer" style={{ color: 'var(--m)' }} title="Borra el fondo de color liso (usa el color de la esquina)">
                  <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} /><Wand2 size={12} />Quitar fondo liso
                </label>
              </div>
              {!builtin && <p className="text-[11px] mb-2" style={{ color: 'var(--m)' }}>Una imagen por pose. En «Reposo» pon al menos una; si una acción tiene varias imágenes se muestra una al azar, y si no tiene ninguna usa las de Reposo.</p>}
              <div className="space-y-2">
                {STATES.map((s) => (
                  <div key={s} className="rounded-2xl p-2.5" style={{ background: 'var(--s2)' }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs w-36 shrink-0">{STATE_LABEL[s]}{!builtin && s === 'idle' ? ' *' : ''}</span>
                      <div className="flex gap-1.5 flex-wrap flex-1">
                        {(actions[s] || []).map((i) => (
                          <span key={i.key} className="relative w-12 h-12 rounded-lg overflow-hidden grid place-items-center" style={{ background: 'repeating-conic-gradient(#8884 0 25%, transparent 0 50%) 0 0/10px 10px' }}>
                            <img src={i.url} alt="" className="max-w-full max-h-full object-contain" />
                            <button className="absolute top-0 right-0 bg-black/70 text-white rounded-bl-lg p-0.5" onClick={() => rm(s, i.key)} aria-label="Quitar imagen"><X size={10} /></button>
                          </span>
                        ))}
                        <label className="w-12 h-12 rounded-lg grid place-items-center cursor-pointer hover:opacity-80" style={{ border: '1px dashed var(--bd)' }} title="Añadir imágenes">
                          <Plus size={16} style={{ color: 'var(--a)' }} />
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(s, e.target.files); e.target.value = ''; }} />
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!builtin && (
              <div className="rounded-2xl p-3 space-y-2" style={{ background: 'var(--s2)' }}>
                <p className="text-xs tracking-widest" style={{ color: 'var(--m)' }}>PODER (OPCIONAL)</p>
                <p className="text-[11px]" style={{ color: 'var(--m)' }}>Una imagen que sale volando de vez en cuando, con una frase. No hace falta más.</p>
                <div className="flex items-center gap-3">
                  {power ? (
                    <span className="relative w-14 h-14 rounded-lg overflow-hidden grid place-items-center" style={{ background: 'repeating-conic-gradient(#8884 0 25%, transparent 0 50%) 0 0/10px 10px' }}>
                      <img src={power.url} alt="" className="max-w-full max-h-full object-contain" />
                      <button className="absolute top-0 right-0 bg-black/70 text-white rounded-bl-lg p-0.5" onClick={() => setPower(null)} aria-label="Quitar poder"><X size={10} /></button>
                    </span>
                  ) : (
                    <label className="w-14 h-14 rounded-lg grid place-items-center cursor-pointer" style={{ border: '1px dashed var(--bd)' }}>
                      <Upload size={16} style={{ color: 'var(--a)' }} />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => { addPower(e.target.files[0]); e.target.value = ''; }} />
                    </label>
                  )}
                  <textarea className={`${TA} flex-1`} style={box} rows={2} value={powerPhrases} onChange={(e) => setPowerPhrases(e.target.value)} placeholder="Frases al usar el poder (una por línea)" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              {target.type === 'custom' && <button className="btn btn-o" onClick={del} style={{ color: '#ef4444' }}><Trash2 size={15} />Eliminar</button>}
              {builtin && getExtra(target.id) && <button className="btn btn-o" onClick={reset}><Trash2 size={15} />Quitar mis extras</button>}
              <button className="btn btn-o ml-auto" onClick={onClose}>Cancelar</button>
              <button className="btn" onClick={save} disabled={!canSave || busy} style={{ opacity: canSave && !busy ? 1 : 0.5 }}>{busy ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
