import { useRef, useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, Target, ImagePlus, X, PiggyBank, PartyPopper } from 'lucide-react';
import Title from '../components/Title';
import { cop } from '../lib/format';
import useStore from '../hooks/useStore';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// "20000" -> "20.000" (es-CO, sin decimales)
export const formatMiles = (raw) => {
  const digits = String(raw ?? '').replace(/\D/g, '').slice(0, 15).replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  try {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(digits));
  } catch {
    return digits;
  }
};
export const parseMiles = (masked) => {
  const digits = String(masked ?? '').replace(/\D/g, '');
  const n = Number(digits);
  return Number.isFinite(n) ? n : 0;
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const max = 800;
          let { width: w, height: h } = img;
          const scale = Math.min(1, max / Math.max(w, h));
          w = Math.round(w * scale); h = Math.round(h * scale);
          const c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', 0.72));
        } catch (e) { resolve(reader.result); }
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function petSay(text) {
  try {
    window.dispatchEvent(new CustomEvent('hermes:reminder', { detail: { text } }));
  } catch { /* sin mascotas */ }
}

export default function FinanceView({ tx, setTx, toast }) {
  const [f, setF] = useState({ text: '', amount: '' });
  const [goals, setGoals] = useStore('h_goals', []);
  const [gForm, setGForm] = useState({ name: '', target: '', image: '' });
  const [fund, setFund] = useState(null); // { id, amount, source }
  const [creating, setCreating] = useState(false);
  const imgRef = useRef(null);

  const n = parseMiles(f.amount);
  const add = (type) => {
    if (!f.text.trim() || !n) return;
    setTx([{ id: Date.now(), text: f.text.trim(), amount: n, type }, ...tx]);
    setF({ text: '', amount: '' });
  };
  const inc = tx.filter((t) => t.type === 'in').reduce((a, t) => a + Number(t.amount || 0), 0);
  const exp = tx.filter((t) => t.type === 'out').reduce((a, t) => a + Number(t.amount || 0), 0);

  const createGoal = () => {
    const target = parseMiles(gForm.target);
    if (!gForm.name.trim() || !target) {
      toast?.('Ponle nombre y meta a tu objetivo', Target);
      return;
    }
    setGoals([{
      id: uid(), name: gForm.name.trim(), target, saved: 0,
      image: gForm.image || null, createdAt: Date.now(), celebratedAt: null,
    }, ...goals]);
    setGForm({ name: '', target: '', image: '' });
    setCreating(false);
    toast?.(`Meta "${gForm.name.trim()}" creada`, Target);
  };

  const addFunds = () => {
    if (!fund) return;
    const amount = parseMiles(fund.amount);
    if (!amount) return;
    let completedName = null;
    setGoals((gs) => gs.map((g) => {
      if (g.id !== fund.id) return g;
      const saved = (Number(g.saved) || 0) + amount;
      const justCompleted = saved >= g.target && !g.celebratedAt;
      if (justCompleted) completedName = g.name;
      return { ...g, saved, celebratedAt: justCompleted ? Date.now() : g.celebratedAt };
    }));
    setFund(null);
    if (completedName) {
      toast?.(`¡Meta "${completedName}" completada!`, PartyPopper);
      petSay(`¡Lo lograste! Meta "${completedName}" al 100%. ¡A celebrar!`);
    } else {
      const g = goals.find((x) => x.id === fund.id);
      toast?.(`Aportaste ${cop(amount)} a "${g?.name || 'tu meta'}"`, PiggyBank);
      if (amount >= 50000 || Math.random() < 0.35) {
        petSay(`¡Bien! "${g?.name || 'Tu meta'}" va creciendo. Sigue así.`);
      }
    }
  };

  const deleteGoal = (g) => {
    if ((Number(g.saved) || 0) > 0) {
      if (!window.confirm(`"${g.name}" ya tiene ${cop(g.saved)} de progreso. ¿Eliminarla de todos modos?`)) return;
    }
    setGoals(goals.filter((x) => x.id !== g.id));
    toast?.('Meta eliminada', Trash2);
  };

  const onPickGoalImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { toast?.('Imagen muy pesada (máx 4MB)', Trash2); return; }
    try {
      const url = await fileToDataUrl(file);
      setGForm((s) => ({ ...s, image: url }));
    } catch { toast?.('No se pudo leer la imagen', Trash2); }
  };

  return (
    <>
      <Title>Finanzas</Title>
      <div className="card">
        <p className="text-xs tracking-widest" style={{ color: 'var(--m)' }}>BALANCE</p>
        <p className="text-3xl font-light tabular-nums" style={{ color: 'var(--a)' }}>{cop(inc - exp)}</p>
        <div className="flex gap-6 mt-4 text-sm"><span className="flex items-center gap-1"><ArrowUp size={14} />{cop(inc)}</span><span className="flex items-center gap-1"><ArrowDown size={14} />{cop(exp)}</span></div>
      </div>
      <div className="flex gap-2">
        <input className="inp" placeholder="Concepto" value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} aria-label="Concepto" />
        <div className="w-36 sm:w-44 shrink-0">
          <input
            className="inp !w-full tabular-nums"
            type="text" inputMode="numeric" autoComplete="off"
            placeholder="20.000" value={f.amount}
            onChange={(e) => setF({ ...f, amount: formatMiles(e.target.value) })}
            aria-label="Monto"
          />
        </div>
      </div>
      {!!n && (
        <p className="text-xs -mt-2 tabular-nums" style={{ color: 'var(--m)' }}>{cop(n)}</p>
      )}
      <div className="flex gap-2">
        <button className="btn flex-1" onClick={() => add('in')}><Plus size={16} />Ingreso</button>
        <button className="btn btn-o flex-1" onClick={() => add('out')}>Gasto</button>
      </div>

      {/* ── Metas de compra ── */}
      <div className="card space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium flex items-center gap-2"><Target size={17} style={{ color: 'var(--a)' }} /> Metas de compra</p>
          <button className="btn btn-o !py-1.5 !px-3 !text-xs" onClick={() => setCreating((c) => !c)}>
            <Plus size={14} /> {creating ? 'Cerrar' : 'Nueva meta'}
          </button>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--m)' }}>
          Aparta dinero a una meta sin mover tu balance: lo de finanzas y lo de afuera solo suman a la meta.
        </p>

        {creating && (
          <div className="rounded-2xl border p-3 space-y-2 fin" style={{ borderColor: 'var(--bd)' }}>
            <input
              className="inp" placeholder="¿Qué quieres comprar? Ej. Portátil" maxLength={60}
              value={gForm.name} onChange={(e) => setGForm({ ...gForm, name: e.target.value })}
              aria-label="Nombre de la meta"
            />
            <div className="flex gap-2">
              <input
                className="inp tabular-nums" placeholder="Meta: 1.500.000"
                type="text" inputMode="numeric" autoComplete="off"
                value={gForm.target} onChange={(e) => setGForm({ ...gForm, target: formatMiles(e.target.value) })}
                aria-label="Valor objetivo"
              />
              <button className="btn btn-o shrink-0 !px-3" onClick={() => imgRef.current?.click()} title="Agregar imagen (opcional)" aria-label="Agregar imagen">
                <ImagePlus size={16} />
              </button>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={onPickGoalImage} />
            </div>
            {!!parseMiles(gForm.target) && (
              <p className="text-xs tabular-nums" style={{ color: 'var(--m)' }}>{cop(parseMiles(gForm.target))}</p>
            )}
            {gForm.image && (
              <div className="relative">
                <img src={gForm.image} alt="" className="w-full h-28 object-cover rounded-xl" />
                <button className="ico-btn absolute top-1.5 right-1.5 !bg-black/50 !text-white rounded-full" onClick={() => setGForm({ ...gForm, image: '' })} aria-label="Quitar imagen"><X size={14} /></button>
              </div>
            )}
            <button className="btn w-full" onClick={createGoal}><Target size={15} /> Crear meta</button>
          </div>
        )}

        {!goals.length && !creating && (
          <p className="text-xs py-2" style={{ color: 'var(--m)' }}>Sin metas todavía. Crea la primera para ver tu progreso aquí.</p>
        )}

        <div className="space-y-3">
          {goals.map((g) => {
            const pct = g.target ? Math.min(100, Math.round((Number(g.saved || 0) / g.target) * 100)) : 0;
            const done = pct >= 100;
            return (
              <div key={g.id} className={`rounded-2xl border overflow-hidden ${done ? 'goal-done' : ''}`} style={{ borderColor: 'var(--bd)' }}>
                {g.image && <img src={g.image} alt="" className="w-full h-28 object-cover" loading="lazy" />}
                <div className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-1.5">
                        {done && <PartyPopper size={15} style={{ color: 'var(--a)' }} />}
                        {g.name}
                      </p>
                      <p className="text-xs tabular-nums" style={{ color: 'var(--m)' }}>
                        {cop(Number(g.saved) || 0)} de {cop(g.target)} · {pct}%
                      </p>
                    </div>
                    <button className="ico-btn shrink-0" onClick={() => deleteGoal(g)} aria-label={`Eliminar ${g.name}`} title="Eliminar meta"><Trash2 size={15} /></button>
                  </div>
                  <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--s2)' }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso ${g.name}`}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'var(--a)' }} />
                  </div>
                  {!done ? (
                    <button className="btn w-full !py-2 !text-xs" onClick={() => setFund({ id: g.id, amount: '', source: 'finanzas' })}>
                      <PiggyBank size={14} /> Aportar a esta meta
                    </button>
                  ) : (
                    <p className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--a)' }}>
                      <PartyPopper size={14} /> ¡Completada! Ya puedes comprarlo.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {tx.map((t) => (
        <div key={t.id} className="card !p-4 flex items-center gap-3 text-sm">
          <span className="flex-1 truncate">{t.text}</span><span className="tabular-nums">{t.type === 'in' ? '+' : '−'}{cop(t.amount)}</span>
          <button className="ico-btn" onClick={() => setTx(tx.filter((x) => x.id !== t.id))} aria-label="Eliminar"><Trash2 size={15} /></button>
        </div>
      ))}

      {/* Modal aportar */}
      {fund && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={() => setFund(null)}>
          <div className="glass w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl p-5 sheet space-y-3" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Aportar a meta">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Aportar a “{goals.find((x) => x.id === fund.id)?.name}”</p>
              <button className="ico-btn" onClick={() => setFund(null)} aria-label="Cerrar"><X size={17} /></button>
            </div>
            <input
              className="inp tabular-nums text-lg" placeholder="50.000"
              type="text" inputMode="numeric" autoComplete="off" autoFocus
              value={fund.amount} onChange={(e) => setFund({ ...fund, amount: formatMiles(e.target.value) })}
              aria-label="Monto del aporte"
            />
            {!!parseMiles(fund.amount) && (
              <p className="text-xs tabular-nums" style={{ color: 'var(--m)' }}>{cop(parseMiles(fund.amount))} · no mueve tu balance</p>
            )}
            <div className="flex gap-2" role="group" aria-label="Origen del dinero">
              {['finanzas', 'exterior'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFund({ ...fund, source: s })}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs border capitalize ${fund.source === s ? 'acc-soft !border-transparent' : ''}`}
                  style={fund.source === s ? {} : { borderColor: 'var(--bd)' }}
                >
                  {s === 'finanzas' ? 'De mis finanzas' : 'De afuera'}
                </button>
              ))}
            </div>
            <button className="btn w-full" onClick={addFunds} disabled={!parseMiles(fund.amount)}>
              <PiggyBank size={15} /> Sumar a la meta
            </button>
          </div>
        </div>
      )}
    </>
  );
}
