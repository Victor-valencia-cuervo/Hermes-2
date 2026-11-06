import { useState } from 'react';
import { Plus, Bell, Trash2, AlarmClock, AlertTriangle, BellRing } from 'lucide-react';
import Title from '../components/Title';

export default function RemindersView({ reminders, setReminders, toast }) {
  const [text, setText] = useState(''); const [at, setAt] = useState('');
  const add = () => {
    if (!text.trim() || !at) return toast('Falta el texto o la fecha', AlertTriangle);
    setReminders([{ id: Date.now(), text: text.trim(), at, done: false }, ...reminders]); setText(''); setAt(''); toast('Recordatorio creado', AlarmClock);
  };
  const askNotif = async () => {
    if (!('Notification' in window)) return toast('Tu navegador no soporta notificaciones', AlertTriangle);
    const r = await Notification.requestPermission();
    toast(r === 'granted' ? 'Notificaciones activadas' : 'Permiso denegado', r === 'granted' ? BellRing : AlertTriangle);
  };
  return (
    <>
      <Title>Recordatorios</Title>
      <div className="card space-y-3">
        <input className="inp" placeholder="¿Qué te recuerdo?" value={text} onChange={(e) => setText(e.target.value)} />
        <input type="datetime-local" className="inp" value={at} onChange={(e) => setAt(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          <button className="btn flex-1" onClick={add}><Plus size={16} />Añadir</button>
          <button className="btn btn-o" onClick={askNotif}><Bell size={16} />Activar avisos</button>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--m)' }}>Avisa con la app abierta o instalada. Para la app cerrada se requiere Web Push con servidor.</p>
      </div>
      {reminders.map((r) => (
        <div key={r.id} className={`card flex items-center gap-3 ${r.done ? 'opacity-50' : ''}`}>
          <span className="flex-1 text-sm">{r.text}<br /><span className="text-xs" style={{ color: 'var(--m)' }}>{new Date(r.at).toLocaleString('es-CO')}</span></span>
          <button className="ico-btn" onClick={() => setReminders(reminders.filter((x) => x.id !== r.id))} aria-label="Eliminar"><Trash2 size={16} /></button>
        </div>
      ))}
    </>
  );
}
