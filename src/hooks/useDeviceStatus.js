import { useEffect, useRef, useState } from 'react';

// Estado del dispositivo, estilo HUD de videojuego. Todo sale de APIs del navegador, así que
// hay límites reales: batería y red detallada solo existen en Chrome/Edge/Android (no en
// Safari/iPhone ni Firefox) y la RAM es la de ESTA pestaña, no la total del equipo.
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

export function pingTone(ms, online = true) {
  if (!online || ms == null) return 'bad';
  return ms < 90 ? 'good' : ms < 180 ? 'warn' : 'bad';
}

export default function useDeviceStatus({ every = 4000 } = {}) {
  const [s, setS] = useState(() => {
    const ua = navigator.userAgent || '';
    const touch = navigator.maxTouchPoints > 0 && window.matchMedia?.('(pointer: coarse)').matches;
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (touch && window.innerWidth < 1024);
    return {
      device: mobile ? 'cel' : 'pc', cores: navigator.hardwareConcurrency || null, gb: navigator.deviceMemory || null,
      battery: null, // { level 0-1, charging } | null si el navegador no lo da
      online: navigator.onLine, ping: null, down: null, net: '', rtt: null,
      mem: null, // { used MB, limit MB } | null
    };
  });
  const pings = useRef([]);

  // Batería (eventos, sin sondeo)
  useEffect(() => {
    let bat; let dead = false;
    const upd = () => { if (!dead && bat) setS((p) => ({ ...p, battery: { level: bat.level, charging: bat.charging } })); };
    navigator.getBattery?.().then((b) => {
      bat = b; upd();
      ['levelchange', 'chargingchange'].forEach((e) => b.addEventListener(e, upd));
    }).catch(() => {});
    return () => { dead = true; if (bat) ['levelchange', 'chargingchange'].forEach((e) => bat.removeEventListener(e, upd)); };
  }, []);

  // Red + ping real + memoria
  useEffect(() => {
    let dead = false; let timer;
    const measure = async () => {
      if (document.hidden) return;
      const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      let ms = null;
      if (navigator.onLine) {
        const t0 = performance.now();
        try {
          const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 4000);
          await fetch(`${location.origin}/manifest.webmanifest?p=${Date.now()}`, { method: 'HEAD', cache: 'no-store', signal: ctl.signal });
          clearTimeout(to);
          ms = Math.round(performance.now() - t0);
        } catch { ms = null; }
      }
      if (ms != null) { pings.current = [...pings.current.slice(-4), ms]; }
      const pm = performance.memory;
      if (dead) return;
      setS((p) => ({
        ...p, online: navigator.onLine,
        ping: ms != null ? median(pings.current) : null,
        down: c?.downlink ?? null, net: c?.type && c.type !== 'unknown' ? c.type : (c?.effectiveType || ''), rtt: c?.rtt ?? null,
        mem: pm ? { used: Math.round(pm.usedJSHeapSize / 1048576), limit: Math.round(pm.jsHeapSizeLimit / 1048576) } : null,
      }));
    };
    const loop = async () => { await measure(); if (!dead) timer = setTimeout(loop, every); };
    loop();
    const on = () => measure();
    window.addEventListener('online', on); window.addEventListener('offline', on);
    return () => { dead = true; clearTimeout(timer); window.removeEventListener('online', on); window.removeEventListener('offline', on); };
  }, [every]);

  return s;
}
