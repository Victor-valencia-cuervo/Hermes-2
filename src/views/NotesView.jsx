import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, Archive, Trash2, Pin, Palette, Tag, ImagePlus, ListChecks, Type,
  Copy, RotateCcw, X, Search, LayoutGrid, List, Plus, Check, BellRing, Pencil,
} from 'lucide-react';
import Title from '../components/Title';
import { NOTE_COLORS, noteStyle, noteMutedColor } from '../lib/noteColors';

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Comprime imagen para que quepa en localStorage (máx ~800px, jpeg .72)
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

function fmtDate(iso) {
  try { return new Date(iso).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

export default function NotesView({ api, toast }) {
  const { notes, labels } = api;
  const [tab, setTab] = useState('notes'); // notes | reminders | archive | trash
  const [activeLabel, setActiveLabel] = useState(null);
  const [q, setQ] = useState('');
  const [grid, setGrid] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [managingLabels, setManagingLabels] = useState(false);

  // ---------- filtros ----------
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = [...notes];
    if (tab === 'notes') list = list.filter((n) => !n.archived && !n.trashed);
    if (tab === 'reminders') list = list.filter((n) => n.reminderAt && !n.trashed);
    if (tab === 'archive') list = list.filter((n) => n.archived && !n.trashed);
    if (tab === 'trash') list = list.filter((n) => n.trashed);
    if (activeLabel) list = list.filter((n) => (n.labels || []).includes(activeLabel));
    if (query) {
      list = list.filter((n) => {
        const itemsTxt = (n.items || []).map((i) => i.text).join(' ');
        const labelNames = (n.labels || []).map((id) => labels.find((l) => l.id === id)?.name || '').join(' ');
        return `${n.title || ''} ${n.text || ''} ${itemsTxt} ${labelNames}`.toLowerCase().includes(query);
      });
    }
    list.sort((a, b) => {
      if ((b.pinned ? 1 : 0) !== (a.pinned ? 1 : 0)) return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    return list;
  }, [notes, tab, activeLabel, q, labels]);

  const pinned = filtered.filter((n) => n.pinned && tab === 'notes' && !activeLabel && !q);
  const others = tab === 'notes' && !activeLabel && !q ? filtered.filter((n) => !n.pinned) : filtered;
  const trashCount = notes.filter((n) => n.trashed).length;
  const archiveCount = notes.filter((n) => n.archived && !n.trashed).length;
  const reminderCount = notes.filter((n) => n.reminderAt && !n.trashed).length;

  const editing = editingId ? notes.find((n) => n.id === editingId) : null;

  const labelName = (id) => labels.find((l) => l.id === id)?.name || '';

  const clearFilters = () => { setActiveLabel(null); setQ(''); };

  return (
    <>
      {/* Título estilo Hermes: primera letra N con color del tema */}
      <Title>
        <span style={{ color: 'var(--a)', fontWeight: 600 }}>N</span>otas
      </Title>
      <div className="flex flex-col lg:flex-row gap-4 items-start">
        {/* Mini panel izquierdo estilo Keep (dentro de la vista) */}
        <div className="w-full lg:w-52 shrink-0 card !p-2 grid grid-cols-2 gap-2 lg:flex lg:flex-col lg:gap-1">
          {[
            { id: 'notes', label: 'Notas', count: 0, I: ListChecks },
            { id: 'reminders', label: 'Recordatorios', count: reminderCount, I: Bell },
            { id: 'archive', label: 'Archivo', count: archiveCount, I: Archive },
            { id: 'trash', label: 'Papelera', count: trashCount, I: Trash2 },
          ].map(({ id, label, count, I }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setActiveLabel(null); }}
              className={`flex items-center gap-2.5 px-3 py-3 lg:py-2.5 lg:px-4 rounded-2xl text-sm min-h-[44px] min-w-0 text-left transition ${tab === id && !activeLabel ? 'acc-soft' : 'hover:bg-[var(--s2)]'}`}
            >
              <I size={17} strokeWidth={1.8} className="shrink-0" />
              <span className="truncate flex-1">{label}</span>
              {!!count && (
                <span className="text-[11px] px-1.5 py-0.5 rounded-full tabular-nums shrink-0" style={{ background: 'var(--s2)', color: 'var(--m)' }}>{count}</span>
              )}
            </button>
          ))}
          <div className="hidden lg:block h-px my-1" style={{ background: 'var(--bd)' }} />
          <div className="hidden lg:flex items-center justify-between px-4 pt-1">
            <span className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--m)' }}>Etiquetas</span>
            <button className="ico-btn" onClick={() => setManagingLabels(true)} aria-label="Gestionar etiquetas"><Pencil size={13} /></button>
          </div>
          <div className="hidden lg:flex flex-col gap-1 pb-1">
            {labels.length === 0 && <span className="px-4 text-xs" style={{ color: 'var(--m)' }}>Sin etiquetas</span>}
            {labels.map((l) => (
              <button
                key={l.id}
                onClick={() => { setActiveLabel(l.id); setTab('notes'); }}
                className={`flex items-center gap-3 px-4 py-2 rounded-2xl text-sm text-left transition ${activeLabel === l.id ? 'acc-soft' : 'hover:bg-[var(--s2)]'}`}
              >
                <Tag size={15} /> <span className="truncate">{l.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Columna principal */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Buscador + vista */}
          <div className="card flex items-center gap-2 !py-2.5">
            <Search size={17} style={{ color: 'var(--m)' }} />
            <input
              className="flex-1 bg-transparent outline-none text-sm"
              placeholder="Buscar notas, listas, etiquetas..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && <button className="ico-btn" onClick={() => setQ('')} aria-label="Limpiar búsqueda"><X size={15} /></button>}
            <button className="ico-btn" onClick={() => setGrid(!grid)} aria-label="Cambiar vista" title={grid ? 'Vista de lista' : 'Vista de cuadrícula'}>
              {grid ? <List size={17} /> : <LayoutGrid size={17} />}
            </button>
          </div>

          {/* Etiquetas en móvil + gestor rápido */}
          <div className="flex gap-2 sm:gap-2.5 flex-wrap items-center pb-0.5 -mx-0.5 px-0.5">
            <button onClick={() => setManagingLabels(true)} className="btn btn-o !py-1.5 !px-3 !text-xs"><Tag size={13} /> Etiquetas</button>
            {activeLabel && (
              <button onClick={clearFilters} className="btn !py-1.5 !px-3 !text-xs">
                #{labelName(activeLabel)} <X size={13} />
              </button>
            )}
            {labels.filter((l) => l.id !== activeLabel).slice(0, 6).map((l) => (
              <button key={l.id} onClick={() => setActiveLabel(l.id)} className="btn btn-o !py-1.5 !px-3 !text-xs">#{l.name}</button>
            ))}
          </div>

          {/* Creador rápido */}
          {tab !== 'trash' && <Composer api={api} toast={toast} />}

          {/* Acciones papelera */}
          {tab === 'trash' && trashCount > 0 && (
            <div className="card flex items-center justify-between gap-2">
              <span className="text-xs" style={{ color: 'var(--m)' }}>Se borran solas a los 30 días.</span>
              <button className="btn btn-o !py-2" onClick={() => { api.emptyTrash(); toast?.('Papelera vaciada', Trash2); }}>Vaciar papelera</button>
            </div>
          )}

          {/* Listados */}
          {tab === 'notes' && !activeLabel && !q && pinned.length > 0 && (
            <>
              <SectionLabel>Fijadas</SectionLabel>
              <NotesGrid notes={pinned} grid={grid} api={api} toast={toast} onEdit={setEditingId} />
              <SectionLabel>Otras</SectionLabel>
            </>
          )}
          {others.length === 0 ? (
            <EmptyState tab={tab} hasQuery={!!q} />
          ) : (
            <NotesGrid notes={others} grid={grid} api={api} toast={toast} onEdit={setEditingId} />
          )}
        </div>
      </div>

      {/* Editor modal */}
      {editing && (
        <NoteEditor
          note={editing}
          api={api}
          labels={labels}
          toast={toast}
          onClose={() => setEditingId(null)}
        />
      )}

      {/* Gestor etiquetas */}
      {managingLabels && <LabelsModal api={api} onClose={() => setManagingLabels(false)} />}
    </>
  );
}

function SectionLabel({ children }) {
  return <h3 className="text-[11px] font-semibold uppercase tracking-widest ml-1" style={{ color: 'var(--m)' }}>{children}</h3>;
}

function EmptyState({ tab, hasQuery }) {
  return (
    <div className="card flex flex-col items-center justify-center py-14 text-center fin">
      <ListChecks size={40} style={{ color: 'var(--m)' }} className="opacity-60 mb-3" />
      <p className="text-sm">
        {hasQuery ? 'Sin resultados para tu búsqueda.' : tab === 'trash' ? 'Papelera vacía.' : tab === 'archive' ? 'Nada archivado.' : tab === 'reminders' ? 'Sin recordatorios en notas.' : 'Sin notas. Crea la primera arriba.'}
      </p>
    </div>
  );
}

/* ================= Creador rápido estilo Keep ================= */
function Composer({ api, toast }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [mode, setMode] = useState('text'); // text | list
  const [items, setItems] = useState([]);
  const [itemDraft, setItemDraft] = useState('');
  const [color, setColor] = useState('default');
  const boxRef = useRef(null);

  useEffectClose(boxRef, () => { if (open) save(); });

  const reset = () => {
    setTitle(''); setText(''); setItems([]); setItemDraft(''); setColor('default'); setMode('text'); setOpen(false);
  };

  const save = () => {
    const payload = { title: title.trim(), text: text.trim(), type: mode, items: items.filter((i) => i.text.trim()), color };
    if (!payload.title && !payload.text && !payload.items.length) { reset(); return; }
    try {
      api.addNote(payload);
    } catch {
      toast?.('No se pudo guardar (almacenamiento lleno)', Trash2);
    }
    reset();
  };

  const addItem = () => {
    if (!itemDraft.trim()) return;
    setItems((p) => [...p, { id: uid(), text: itemDraft.trim(), done: false }]);
    setItemDraft('');
  };

  return (
    <div ref={boxRef} className="card !p-0 overflow-hidden fin" style={color !== 'default' ? noteStyle(color) : {}}>
      {open && (
        <input
          className="w-full px-5 pt-4 pb-1 text-sm font-medium bg-transparent outline-none placeholder:opacity-60"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />
      )}
      <div className="flex items-center">
        {mode === 'text' ? (
          <textarea
            placeholder={open ? 'Escribe una nota...' : 'Añadir una nota...'}
            value={text}
            onClick={() => setOpen(true)}
            onChange={(e) => { setText(e.target.value); setOpen(true); }}
            rows={open ? 3 : 1}
            className="w-full px-5 py-3 text-sm bg-transparent outline-none resize-none placeholder:opacity-60"
          />
        ) : (
          <div className="w-full px-5 py-3" onClick={() => setOpen(true)}>
            {!open && <p className="text-sm opacity-60">Añadir una lista...</p>}
            {open && (
              <>
                {items.map((it) => (
                  <label key={it.id} className="flex items-center gap-2 py-1 text-sm">
                    <input type="checkbox" checked={it.done} onChange={() => setItems((p) => p.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))} />
                    <span className={it.done ? 'line-through opacity-60' : ''}>{it.text}</span>
                    <button className="ico-btn ml-auto" onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))} aria-label="Quitar ítem"><X size={13} /></button>
                  </label>
                ))}
                <div className="flex gap-2 mt-1">
                  <input
                    className="flex-1 bg-transparent outline-none text-sm border-b pb-1"
                    style={{ borderColor: 'var(--bd)' }}
                    placeholder="Añadir elemento + Enter"
                    value={itemDraft}
                    onChange={(e) => setItemDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
                  />
                  <button className="ico-btn" onClick={addItem} aria-label="Añadir"><Plus size={15} /></button>
                </div>
              </>
            )}
          </div>
        )}
        {!open && (
          <div className="flex pr-2">
            <button className="ico-btn" title="Lista" onClick={() => { setMode('list'); setOpen(true); }}><ListChecks size={18} /></button>
          </div>
        )}
      </div>
      {open && (
        <div className="flex items-center justify-between px-3 py-2 border-t" style={{ borderColor: 'var(--bd)' }}>
          <div className="flex items-center">
            <button className="ico-btn" title={mode === 'text' ? 'Cambiar a lista' : 'Cambiar a texto'} onClick={() => setMode(mode === 'text' ? 'list' : 'text')}>
              {mode === 'text' ? <ListChecks size={16} /> : <Type size={16} />}
            </button>
            <ColorDotPicker value={color} onChange={setColor} small />
          </div>
          <button className="btn !py-1.5 !px-5 !text-xs" onClick={save}>Cerrar</button>
        </div>
      )}
    </div>
  );
}

function useEffectClose(ref, onOutside) {
  const fnRef = useRef(onOutside);
  fnRef.current = onOutside;
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) fnRef.current(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ref]);
}

/* ================= Grid ================= */
function NotesGrid({ notes, grid, api, toast, onEdit }) {
  if (!grid) {
    return (
      <div className="space-y-3">
        {notes.map((n) => <NoteCard key={n.id} note={n} api={api} toast={toast} onEdit={onEdit} list />)}
      </div>
    );
  }
  return (
    <div className="columns-1 sm:columns-2 xl:columns-3 gap-4 [column-fill:_balance]">
      {notes.map((n) => (
        <div key={n.id} className="break-inside-avoid mb-4">
          <NoteCard note={n} api={api} toast={toast} onEdit={onEdit} />
        </div>
      ))}
    </div>
  );
}

/* ================= Tarjeta ================= */
function NoteCard({ note, api, toast, onEdit, list }) {
  const [showColors, setShowColors] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const fileRef = useRef(null);
  const isTrash = note.trashed;
  const st = noteStyle(note.color);
  const muted = noteMutedColor(note.color);

  const askNotif = async () => {
    if (!('Notification' in window)) return toast?.('Tu navegador no soporta avisos', Bell);
    if (Notification.permission !== 'granted') await Notification.requestPermission();
  };

  const onPickImage = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) { toast?.('Imagen muy pesada (máx 4MB)', Trash2); return; }
    try {
      const url = await fileToDataUrl(f);
      api.updateNote(note.id, { images: [...(note.images || []).slice(0, 3), url] });
    } catch { toast?.('No se pudo leer la imagen', Trash2); }
  };

  const setReminder = async (hours) => {
    await askNotif();
    const d = new Date(Date.now() + hours * 3600 * 1000);
    // datetime-local friendly ISO slice
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    api.updateNote(note.id, { reminderAt: iso, reminderDone: false });
    toast?.('Recordatorio en nota creado', BellRing);
  };

  return (
    <article
      className={`card !p-0 overflow-hidden group transition hover:shadow-lg ${list ? '' : ''}`}
      style={note.color !== 'default' ? st : {}}
    >
      {(note.images || []).length > 0 && (
        <div className="grid grid-cols-2 gap-px">
          {note.images.map((src, i) => (
            <img key={i} src={src} alt="" className="w-full h-28 object-cover" loading="lazy" />
          ))}
        </div>
      )}
      <div className="p-4 cursor-pointer" onClick={() => !isTrash && onEdit(note.id)}>
        <div className="flex items-start gap-2">
          {note.title ? <h4 className="font-medium text-[15px] leading-snug flex-1">{note.title}</h4> : <span className="flex-1" />}
          {!isTrash && (
            <button
              className={`ico-btn !p-1.5 rounded-full ${note.pinned ? '' : 'lg:opacity-0 lg:group-hover:opacity-100'}`}
              style={note.pinned ? { color: 'inherit' } : { color: muted }}
              onClick={(e) => { e.stopPropagation(); api.togglePin(note.id); }}
              aria-label="Fijar"
              title="Fijar"
            >
              <Pin size={15} fill={note.pinned ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
        {note.type === 'list' ? (
          <ul className="mt-2 space-y-1 text-sm">
            {(note.items || []).slice(0, 6).map((it) => (
              <li key={it.id} className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    api.updateNote(note.id, { items: note.items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)) });
                  }}
                  className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                  style={{ borderColor: muted }}
                  aria-label="Tachar"
                >
                  {it.done && <Check size={12} />}
                </button>
                <span className={it.done ? 'line-through opacity-60' : ''}>{it.text}</span>
              </li>
            ))}
            {(note.items || []).length > 6 && <li className="text-xs" style={{ color: muted }}>+{(note.items || []).length - 6} más</li>}
          </ul>
        ) : (
          note.text && <p className="text-sm whitespace-pre-wrap leading-relaxed mt-1">{note.text}</p>
        )}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {(note.labels || []).map((id) => <LabelChip key={id} api={api} noteId={note.id} labelId={id} muted={muted} />)}
          {note.reminderAt && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border flex items-center gap-1" style={{ borderColor: muted, color: muted }}>
              <Bell size={11} /> {fmtDate(note.reminderAt)}
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-2 pb-2 flex items-center gap-0.5 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition">
        {isTrash ? (
          <>
            <button className="ico-btn" title="Restaurar" onClick={() => api.restore(note.id)}><RotateCcw size={15} /></button>
            <button className="ico-btn" title="Eliminar definitivo" onClick={() => { api.deleteForever(note.id); toast?.('Nota eliminada', Trash2); }}><X size={15} /></button>
          </>
        ) : (
          <>
            <button className="ico-btn" title="Recordarme: mañana 8am" onClick={() => setReminder(24 - new Date().getHours() + 8)}><Bell size={15} /></button>
            <div className="relative">
              <button className="ico-btn" title="Color" onClick={() => { setShowColors(!showColors); setShowLabels(false); }}><Palette size={15} /></button>
              {showColors && (
                <div className="absolute bottom-full left-0 mb-2 p-2 rounded-2xl shadow-xl border flex gap-1.5 z-20 w-max" style={{ background: 'var(--s)', borderColor: 'var(--bd)' }}>
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c.id}
                      title={c.name}
                      onClick={() => { api.updateNote(note.id, { color: c.id }); setShowColors(false); }}
                      className={`w-6 h-6 rounded-full border hover:scale-110 transition ${note.color === c.id ? 'ring-2 ring-offset-1' : ''}`}
                      style={{ background: c.id === 'default' ? 'var(--s2)' : c.bg, borderColor: c.border }}
                    />
                  ))}
                </div>
              )}
            </div>
            <button className="ico-btn" title="Imagen" onClick={() => fileRef.current?.click()}><ImagePlus size={15} /></button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
            <div className="relative">
              <button className="ico-btn" title="Etiqueta" onClick={() => { setShowLabels(!showLabels); setShowColors(false); }}><Tag size={15} /></button>
              {showLabels && <LabelPicker api={api} note={note} onClose={() => setShowLabels(false)} />}
            </div>
            <button className="ico-btn" title={note.archived ? 'Desarchivar' : 'Archivar'} onClick={() => api.toggleArchive(note.id)}><Archive size={15} /></button>
            <button className="ico-btn" title="Duplicar" onClick={() => { api.duplicate(note.id); toast?.('Nota duplicada', Copy); }}><Copy size={15} /></button>
            <button className="ico-btn" title="Papelera" onClick={() => { api.moveToTrash(note.id); toast?.('Movida a papelera', Trash2); }}><Trash2 size={15} /></button>
          </>
        )}
      </div>
    </article>
  );
}

function LabelChip({ api, noteId, labelId, muted }) {
  const l = api.labels.find((x) => x.id === labelId);
  if (!l) return null;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); api.toggleNoteLabel(noteId, labelId); }}
      className="text-[11px] px-2 py-0.5 rounded-full border hover:opacity-80"
      style={{ borderColor: muted, color: muted }}
      title="Quitar etiqueta"
    >
      #{l.name}
    </button>
  );
}

function LabelPicker({ api, note, onClose }) {
  const [draft, setDraft] = useState('');
  return (
    <div className="absolute bottom-full left-0 mb-2 p-2 rounded-2xl shadow-xl border z-20 w-52" style={{ background: 'var(--s)', borderColor: 'var(--bd)' }}>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {api.labels.map((l) => (
          <label key={l.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-xl hover:bg-[var(--s2)] cursor-pointer">
            <input
              type="checkbox"
              checked={(note.labels || []).includes(l.id)}
              onChange={() => api.toggleNoteLabel(note.id, l.id)}
            />
            <span className="truncate">{l.name}</span>
          </label>
        ))}
        {api.labels.length === 0 && <p className="text-xs px-2 py-1" style={{ color: 'var(--m)' }}>Sin etiquetas aún.</p>}
      </div>
      <div className="flex gap-1 mt-2">
        <input
          className="inp !py-1.5 !text-xs"
          placeholder="Nueva etiqueta..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) {
              const l = api.addLabel(draft.trim());
              if (l) api.toggleNoteLabel(note.id, l.id);
              setDraft('');
            }
          }}
        />
        <button
          className="ico-btn shrink-0"
          onClick={() => {
            if (!draft.trim()) return onClose();
            const l = api.addLabel(draft.trim());
            if (l) api.toggleNoteLabel(note.id, l.id);
            setDraft('');
          }}
          aria-label="Crear etiqueta"
        >
          <Plus size={15} />
        </button>
      </div>
    </div>
  );
}

/* ================= Editor modal ================= */
function NoteEditor({ note, api, labels, toast, onClose }) {
  const [title, setTitle] = useState(note.title || '');
  const [text, setText] = useState(note.text || '');
  const [items, setItems] = useState(note.items || []);
  const [draft, setDraft] = useState('');
  const [color, setColor] = useState(note.color || 'default');
  const [reminderAt, setReminderAt] = useState(note.reminderAt || '');
  const fileRef = useRef(null);

  const save = (close = true) => {
    api.updateNote(note.id, {
      title: title.trim(), text: text.trim(), type: items.length ? 'list' : 'text',
      items: items.filter((i) => i.text.trim()), color, reminderAt: reminderAt || null,
      reminderDone: reminderAt && reminderAt !== note.reminderAt ? false : note.reminderDone,
    });
    if (close) onClose();
  };

  // Guardar con Escape / click fuera lo maneja el overlay
  const addItem = () => {
    if (!draft.trim()) return;
    setItems((p) => [...p, { id: uid(), text: draft.trim(), done: false }]);
    setDraft('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-sm" onClick={() => save(true)}>
      <div
        className="glass w-full sm:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl sheet"
        style={color !== 'default' ? { ...noteStyle(color), backdropFilter: 'none' } : {}}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Editar nota"
      >
        {(note.images || []).length > 0 && (
          <div className="grid grid-cols-2 gap-1 p-3 pb-0">
            {note.images.map((src, i) => (
              <div key={i} className="relative group/img">
                <img src={src} alt="" className="w-full h-40 object-cover rounded-2xl" />
                <button
                  className="absolute top-2 right-2 ico-btn !bg-black/50 !text-white rounded-full opacity-0 group-hover/img:opacity-100"
                  onClick={() => api.updateNote(note.id, { images: note.images.filter((_, x) => x !== i) })}
                  aria-label="Quitar imagen"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        <input
          className="w-full px-5 pt-4 text-base font-medium bg-transparent outline-none placeholder:opacity-60"
          placeholder="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="w-full px-5 py-2 text-sm bg-transparent outline-none resize-none min-h-[120px] placeholder:opacity-60"
          placeholder="Escribe una nota..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {/* Checklist editable */}
        <div className="px-5 pb-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 py-1 text-sm">
              <input type="checkbox" checked={it.done} onChange={() => setItems((p) => p.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))} />
              <input
                className="flex-1 bg-transparent outline-none"
                value={it.text}
                onChange={(e) => setItems((p) => p.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))}
              />
              <button className="ico-btn" onClick={() => setItems((p) => p.filter((x) => x.id !== it.id))} aria-label="Quitar"><X size={13} /></button>
            </div>
          ))}
          <div className="flex gap-2 mt-1">
            <input
              className="flex-1 bg-transparent outline-none text-sm border-b pb-1"
              style={{ borderColor: 'var(--bd)' }}
              placeholder="Añadir elemento + Enter"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
            />
            <button className="ico-btn" onClick={addItem} aria-label="Añadir"><Plus size={15} /></button>
          </div>
        </div>

        {/* Recordatorio */}
        <div className="px-5 py-2 flex items-center gap-2 flex-wrap">
          <Bell size={14} style={{ color: 'var(--m)' }} />
          <input
            type="datetime-local"
            className="inp !w-auto !py-1.5 !text-xs"
            value={reminderAt}
            onChange={(e) => setReminderAt(e.target.value)}
          />
          {reminderAt && <button className="ico-btn" onClick={() => setReminderAt('')} aria-label="Quitar recordatorio"><X size={13} /></button>}
        </div>

        {/* Etiquetas */}
        <div className="px-5 pb-2 flex flex-wrap gap-1.5">
          {labels.map((l) => {
            const on = (note.labels || []).includes(l.id);
            return (
              <button
                key={l.id}
                onClick={() => api.toggleNoteLabel(note.id, l.id)}
                className={`text-[11px] px-2.5 py-1 rounded-full border ${on ? 'acc-soft !border-transparent' : ''}`}
              >
                #{l.name} {on && <Check size={11} className="inline" />}
              </button>
            );
          })}
        </div>

        {/* Barra inferior */}
        <div className="flex items-center justify-between px-3 py-3 border-t sticky bottom-0" style={{ borderColor: 'var(--bd)', background: color !== 'default' ? 'rgba(255,255,255,.6)' : 'var(--s)' }}>
          <div className="flex">
            <ColorDotPicker value={color} onChange={setColor} small />
            <button className="ico-btn" onClick={() => fileRef.current?.click()} title="Añadir imagen"><ImagePlus size={16} /></button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]; e.target.value = '';
              if (!f) return;
              const url = await fileToDataUrl(f);
              api.updateNote(note.id, { images: [...(note.images || []).slice(0, 3), url] });
            }} />
            <button className="ico-btn" title={note.pinned ? 'Desfijar' : 'Fijar'} onClick={() => api.togglePin(note.id)}><Pin size={16} fill={note.pinned ? 'currentColor' : 'none'} /></button>
            <button className="ico-btn" title={note.archived ? 'Desarchivar' : 'Archivar'} onClick={() => { api.toggleArchive(note.id); onClose(); }}><Archive size={16} /></button>
            <button className="ico-btn" title="Papelera" onClick={() => { api.moveToTrash(note.id); onClose(); toast?.('Movida a papelera', Trash2); }}><Trash2 size={16} /></button>
          </div>
          <button className="btn !py-2" onClick={() => save(true)}>Guardar</button>
        </div>
      </div>
    </div>
  );
}

function ColorDotPicker({ value, onChange, small }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button className="ico-btn" onClick={() => setOpen(!open)} title="Color" aria-label="Color">
        <Palette size={small ? 15 : 16} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 mb-2 p-2 rounded-2xl shadow-xl border flex gap-1.5 z-20 w-max" style={{ background: 'var(--s)', borderColor: 'var(--bd)' }}>
            {NOTE_COLORS.map((c) => (
              <button
                key={c.id}
                title={c.name}
                onClick={() => { onChange(c.id); setOpen(false); }}
                className={`w-6 h-6 rounded-full border hover:scale-110 transition ${value === c.id ? 'ring-2 ring-offset-1' : ''}`}
                style={{ background: c.id === 'default' ? 'var(--s2)' : c.bg, borderColor: c.border }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function LabelsModal({ api, onClose }) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-6" onClick={onClose}>
      <div className="glass w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Etiquetas">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Etiquetas</h3>
          <button className="ico-btn" onClick={onClose} aria-label="Cerrar"><X size={17} /></button>
        </div>
        <div className="flex gap-2 mb-3">
          <input className="inp" placeholder="Nueva etiqueta..." value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { api.addLabel(draft); setDraft(''); } }} />
          <button className="btn shrink-0" onClick={() => { if (draft.trim()) { api.addLabel(draft); setDraft(''); } }}><Plus size={16} /></button>
        </div>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {api.labels.map((l) => (
            <div key={l.id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-[var(--s2)]">
              <Tag size={14} style={{ color: 'var(--m)' }} />
              {editingId === l.id ? (
                <>
                  <input className="inp !py-1 !text-xs" value={editName} onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { api.renameLabel(l.id, editName); setEditingId(null); } }} autoFocus />
                  <button className="ico-btn" onClick={() => { api.renameLabel(l.id, editName); setEditingId(null); }} aria-label="Guardar"><Check size={14} /></button>
                </>
              ) : (
                <>
                  <span className="text-sm flex-1 truncate">{l.name}</span>
                  <button className="ico-btn" onClick={() => { setEditingId(l.id); setEditName(l.name); }} aria-label="Renombrar"><Pencil size={14} /></button>
                  <button className="ico-btn" onClick={() => api.deleteLabel(l.id)} aria-label="Eliminar"><Trash2 size={14} /></button>
                </>
              )}
            </div>
          ))}
          {api.labels.length === 0 && <p className="text-xs" style={{ color: 'var(--m)' }}>Crea tu primera etiqueta para organizar como en Keep.</p>}
        </div>
      </div>
    </div>
  );
}
