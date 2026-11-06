import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getSessionUser,
  onAuthChange,
  signInWithGoogle,
  signOut,
  reassignOutboxOwner,
  flushOutbox,
} from '../services/supabase';
import { saveProfileCloud } from '../services/social';

/**
 * Sesion con Google (Supabase Auth).
 * - user: objeto de Supabase o null (modo local)
 * - Al entrar: adopta el uid real, migra la cola offline (RLS) y sube el perfil.
 * - Al salir: todo sigue funcionando en local.
 */
export default function useAuth(toast) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const prevUid = useRef(null);

  useEffect(() => {
    let dead = false;
    // Si Google/Supabase devolvio error en la URL (?error=...), mostrarlo
    // claro y limpiar la URL para no reintentar en bucle.
    try {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      if (err) {
        const raw = (params.get('error_description') || err).replace(/\+/g, ' ');
        let desc = raw;
        try {
          desc = decodeURIComponent(raw);
        } catch {
          /* queda crudo */
        }
        toast?.(`Login falló: ${desc.slice(0, 140)}`);
        params.delete('error');
        params.delete('error_code');
        params.delete('error_description');
        const clean =
          window.location.pathname + (params.toString() ? `?${params}` : '') + window.location.hash;
        window.history.replaceState(null, '', clean);
      }
    } catch {
      /* noop */
    }
    getSessionUser()
      .then((u) => {
        if (dead) return;
        setUser(u);
        prevUid.current = u?.id || null;
        if (u?.id) {
          try {
            localStorage.setItem('h_uid', u.id);
          } catch {
            /* noop */
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!dead) setLoading(false);
      });
    const off = onAuthChange((u) => {
      if (dead) return;
      const was = prevUid.current;
      setUser(u);
      setLoading(false);
      prevUid.current = u?.id || null;
      if (u?.id && u.id !== was) {
        try {
          localStorage.setItem('h_uid', u.id);
        } catch {
          /* noop */
        }
        reassignOutboxOwner(u.id);
        flushOutbox().catch(() => {});
        let name = '';
        try {
          name = JSON.parse(localStorage.getItem('h_name') || '""') || '';
        } catch {
          name = '';
        }
        saveProfileCloud({
          handle: name || u.email,
          name: name || u.user_metadata?.full_name || '',
        }).catch(() => {});
        toast?.(`Hola, ${name || u.user_metadata?.full_name || u.email}`);
      }
      if (!u?.id && was) toast?.('Sesión cerrada, sigues en local');
    });
    return () => {
      dead = true;
      off();
    };
  }, [toast]);

  const login = useCallback(async () => {
    const r = await signInWithGoogle().catch(() => ({ ok: false }));
    if (!r?.ok) toast?.('No se pudo abrir el login');
    return r;
  }, [toast]);

  const logout = useCallback(async () => {
    await signOut();
  }, []);

  return { user, loading, login, logout };
}
