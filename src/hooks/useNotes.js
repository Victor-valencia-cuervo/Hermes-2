import { useEffect, useMemo } from 'react';
import { BellRing } from 'lucide-react';
import useStore from './useStore';

const NOTES_KEY = 'h_notes_v1';
const LABELS_KEY = 'h_note_labels_v1';
const TRASH_DAYS = 30;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function blankNote(partial = {}) {
  const now = Date.now();
  return {
    id: uid(),
    title: '',
    type: 'text', // 'text' | 'list'
    text: '',
    items: [], // [{id, text, done}]
    color: 'default',
    pinned: false,
    archived: false,
    trashed: false,
    trashedAt: null,
    labels: [],
    images: [],
    reminderAt: null,
    reminderDone: false,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function isEmptyNote(n) {
  const hasTitle = (n.title || '').trim().length > 0;
  const hasText = (n.text || '').trim().length > 0;
  const hasItems = (n.items || []).some((i) => (i.text || '').trim().length > 0);
  const hasImg = (n.images || []).length > 0;
  return !(hasTitle || hasText || hasItems || hasImg);
}

export default function useNotes(toast) {
  const [notes, setNotes] = useStore(NOTES_KEY, []);
  const [labels, setLabels] = useStore(LABELS_KEY, []);

  // Purga automática papelera > 30 días (al montar y cada minuto)
  useEffect(() => {
    const purge = () => {
      const limit = Date.now() - TRASH_DAYS * 24 * 60 * 60 * 1000;
      setNotes((prev) => {
        if (!Array.isArray(prev) || !prev.some((n) => n.trashed && n.trashedAt && n.trashedAt < limit)) return prev;
        return prev.filter((n) => !(n.trashed && n.trashedAt && n.trashedAt < limit));
      });
    };
    purge();
    const i = setInterval(purge, 60000);
    return () => clearInterval(i);
  }, [setNotes]);

  // Recordatorios de notas: reutiliza toast + Notification como Recordatorios
  useEffect(() => {
    const i = setInterval(() => {
      const t = Date.now();
      const due = notes.filter((n) => n.reminderAt && !n.reminderDone && !n.trashed && new Date(n.reminderAt).getTime() <= t);
      if (!due.length) return;
      setNotes((prev) =>
        prev.map((n) => {
          if (!due.some((d) => d.id === n.id)) return n;
          const label = n.title?.trim() || (n.text || '').slice(0, 80) || 'Nota';
          try { toast?.(label, BellRing); } catch { /* noop */ }
          try { window.dispatchEvent(new CustomEvent('hermes:reminder', { detail: { text: label, from: 'notes' } })); } catch { /* noop */ }
          try {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Hermes · Notas', { body: label });
            }
          } catch { /* noop */ }
          return { ...n, reminderDone: true, updatedAt: Date.now() };
        }),
      );
    }, 15000);
    return () => clearInterval(i);
  }, [notes, setNotes, toast]);

  const api = useMemo(() => ({
    notes: Array.isArray(notes) ? notes : [],
    labels: Array.isArray(labels) ? labels : [],
    blankNote,
    isEmptyNote,

    addNote(partial) {
      const n = blankNote(partial);
      if (isEmptyNote(n)) return null;
      setNotes((prev) => [n, ...(Array.isArray(prev) ? prev : [])]);
      return n;
    },
    updateNote(id, patch) {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)));
    },
    togglePin(id) {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n)));
    },
    toggleArchive(id) {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, archived: !n.archived, pinned: false, updatedAt: Date.now() } : n)));
    },
    moveToTrash(id) {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, trashed: true, trashedAt: Date.now(), pinned: false, updatedAt: Date.now() } : n)));
    },
    restore(id) {
      setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, trashed: false, trashedAt: null, updatedAt: Date.now() } : n)));
    },
    deleteForever(id) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    },
    emptyTrash() {
      setNotes((prev) => prev.filter((n) => !n.trashed));
    },
    duplicate(id) {
      let copy = null;
      setNotes((prev) => {
        const src = prev.find((n) => n.id === id);
        if (!src) return prev;
        copy = { ...src, id: uid(), title: src.title ? `${src.title} (copia)` : '', pinned: false, trashed: false, trashedAt: null, createdAt: Date.now(), updatedAt: Date.now() };
        return [copy, ...prev];
      });
      return copy;
    },
    addLabel(name) {
      const clean = (name || '').trim().slice(0, 30);
      if (!clean) return null;
      let existing = labels.find((l) => l.name.toLowerCase() === clean.toLowerCase());
      if (existing) return existing;
      const l = { id: uid(), name: clean };
      setLabels((prev) => [...(Array.isArray(prev) ? prev : []), l]);
      return l;
    },
    renameLabel(id, name) {
      const clean = (name || '').trim().slice(0, 30);
      if (!clean) return;
      setLabels((prev) => prev.map((l) => (l.id === id ? { ...l, name: clean } : l)));
    },
    deleteLabel(id) {
      setLabels((prev) => prev.filter((l) => l.id !== id));
      setNotes((prev) => prev.map((n) => ({ ...n, labels: (n.labels || []).filter((x) => x !== id) })));
    },
    toggleNoteLabel(noteId, labelId) {
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== noteId) return n;
          const has = (n.labels || []).includes(labelId);
          return { ...n, labels: has ? n.labels.filter((x) => x !== labelId) : [...(n.labels || []), labelId], updatedAt: Date.now() };
        }),
      );
    },
  }), [notes, labels, setNotes, setLabels]);

  return api;
}
