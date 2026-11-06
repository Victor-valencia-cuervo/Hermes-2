import { useCallback, useEffect, useState } from 'react';
import { flushOutbox, getLastSync, getOutbox, isCloudConfigured, isOnline } from '../services/supabase';

/**
 * Estado de sincronizacion con Supabase.
 * - pending: items en cola offline (h_outbox)
 * - syncNow(): intenta vaciar la cola ahora
 * - se auto-ejecuta al volver internet + cada 30s
 */
export default function useCloudSync(toast) {
  const [online, setOnline] = useState(() => isOnline());
  const [pending, setPending] = useState(() => getOutbox().length);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(() => getLastSync());
  const configured = isCloudConfigured();

  const refresh = useCallback(() => {
    setPending(getOutbox().length);
    setLastSync(getLastSync());
  }, []);

  const syncNow = useCallback(async () => {
    if (!isCloudConfigured()) return { ok: false, reason: 'no_config' };
    if (!isOnline()) return { ok: false, offline: true };
    setSyncing(true);
    try {
      const r = await flushOutbox();
      refresh();
      if (r.sent > 0) toast?.(`Sincronizados ${r.sent} cambios`);
      return r;
    } finally {
      setSyncing(false);
    }
  }, [refresh, toast]);

  useEffect(() => {
    const on = () => {
      setOnline(true);
      syncNow();
    };
    const off = () => setOnline(false);
    const onBox = (e) => setPending(e?.detail?.pending ?? getOutbox().length);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    window.addEventListener('hermes:outbox', onBox);
    window.addEventListener('storage', refresh);
    const i = setInterval(() => {
      if (isOnline()) syncNow();
      else refresh();
    }, 30000);
    refresh();
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
      window.removeEventListener('hermes:outbox', onBox);
      window.removeEventListener('storage', refresh);
      clearInterval(i);
    };
  }, [refresh, syncNow]);

  return { online, pending, syncing, lastSync, configured, syncNow, refresh };
}
