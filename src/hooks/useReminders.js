import { useEffect } from 'react';
import { BellRing } from 'lucide-react';
import useStore from './useStore';
import { APP_NAME } from '../lib/format';

export default function useReminders(toast) {
  const [reminders, setReminders] = useStore('h_rem', []);
  useEffect(() => {
    const i = setInterval(() => {
      const t = Date.now();
      if (!reminders.some((r) => !r.done && new Date(r.at).getTime() <= t)) return;
      setReminders(reminders.map((r) => {
        if (r.done || new Date(r.at).getTime() > t) return r;
        toast(r.text, BellRing);
        try { window.dispatchEvent(new CustomEvent('hermes:reminder', { detail: { text: r.text, from: 'reminders' } })); } catch { /* noop */ }
        if ('Notification' in window && Notification.permission === 'granted') new Notification(APP_NAME, { body: r.text });
        return { ...r, done: true };
      }));
    }, 15000);
    return () => clearInterval(i);
  }, [reminders, setReminders, toast]);
  return [reminders, setReminders];
}
