import { Smartphone, Monitor, Battery, BatteryCharging, BatteryLow, Wifi, WifiOff, Signal, MemoryStick } from 'lucide-react';
import useDeviceStatus, { pingTone } from '../hooks/useDeviceStatus';

const TONE = { good: '#22c55e', warn: '#eab308', bad: '#ef4444' };

/** Barras de señal tipo videojuego: más barras = mejor ping. */
function Bars({ tone, n }) {
  return (
    <span className="inline-flex items-end gap-[2px]" aria-hidden="true" style={{ height: 14 }}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} style={{ width: 3, height: 3 + i * 2.7, borderRadius: 1, background: i <= n ? TONE[tone] : 'var(--bd)' }} />
      ))}
    </span>
  );
}
const Meter = ({ pct, tone }) => (
  <div style={{ height: 4, borderRadius: 4, background: 'var(--bd)', overflow: 'hidden', marginTop: 6 }}>
    <div style={{ width: `${Math.max(2, Math.min(100, pct))}%`, height: '100%', background: TONE[tone], transition: 'width .6s' }} />
  </div>
);
function Tile({ icon: I, tone, label, children, sub }) {
  return (
    <div className="rounded-2xl p-3 min-w-0" style={{ background: 'var(--s2)', border: `1px solid ${tone === 'bad' ? 'rgba(239,68,68,.5)' : 'transparent'}` }}>
      <div className="flex items-center gap-1.5 text-[10px] tracking-widest" style={{ color: 'var(--m)' }}>
        <I size={13} style={{ color: tone ? TONE[tone] : 'var(--a)' }} />{label}
      </div>
      <div className="mt-1 text-sm font-medium tabular-nums truncate">{children}</div>
      {sub}
    </div>
  );
}

export default function DeviceCard() {
  const d = useDeviceStatus();
  const tone = pingTone(d.ping, d.online);
  const bars = !d.online || d.ping == null ? 0 : d.ping < 50 ? 4 : d.ping < 90 ? 3 : d.ping < 180 ? 2 : 1;
  const b = d.battery;
  const bPct = b ? Math.round(b.level * 100) : null;
  const bTone = b ? (b.charging ? 'good' : bPct <= 15 ? 'bad' : bPct <= 30 ? 'warn' : 'good') : null;
  const memPct = d.mem ? (d.mem.used / d.mem.limit) * 100 : null;
  const mTone = memPct == null ? null : memPct > 80 ? 'bad' : memPct > 55 ? 'warn' : 'good';
  const netName = { wifi: 'WiFi', cellular: 'Datos', ethernet: 'Cable', '4g': '4G', '3g': '3G', '2g': '2G', 'slow-2g': '2G' }[d.net] || d.net || 'Red';
  return (
    <div className="card">
      <p className="text-xs tracking-widest mb-3" style={{ color: 'var(--m)' }}>ESTADO DEL DISPOSITIVO</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Tile icon={d.device === 'cel' ? Smartphone : Monitor} label="EQUIPO"
          sub={<p className="text-[11px] mt-1" style={{ color: 'var(--m)' }}>{[d.cores && `${d.cores} núcleos`, d.gb && `~${d.gb} GB`].filter(Boolean).join(' · ') || ' '}</p>}>
          {d.device === 'cel' ? 'Celular' : 'PC'}
        </Tile>
        <Tile icon={b ? (b.charging ? BatteryCharging : bPct <= 15 ? BatteryLow : Battery) : Battery} tone={bTone} label="BATERÍA"
          sub={b ? <Meter pct={bPct} tone={bTone} /> : <p className="text-[11px] mt-1" style={{ color: 'var(--m)' }}>no la da este navegador</p>}>
          {b ? `${bPct}%${b.charging ? ' ⚡' : ''}` : '—'}
        </Tile>
        <Tile icon={d.online ? Wifi : WifiOff} tone={tone} label={d.online ? netName.toUpperCase() : 'SIN RED'}
          sub={<p className="text-[11px] mt-1" style={{ color: 'var(--m)' }}>{d.online ? [d.down != null && `${d.down} Mbps`, d.rtt != null && `RTT ${d.rtt} ms`].filter(Boolean).join(' · ') || 'velocidad no disponible' : 'desconectado'}</p>}>
          <span className="inline-flex items-center gap-2" style={{ color: TONE[tone] }}>
            <Bars tone={tone} n={bars} />
            {d.online ? (d.ping != null ? `${d.ping} ms` : '…') : 'offline'}
          </span>
        </Tile>
        <Tile icon={d.mem ? MemoryStick : Signal} tone={mTone} label="RAM (ESTA APP)"
          sub={d.mem ? <Meter pct={memPct} tone={mTone} /> : <p className="text-[11px] mt-1" style={{ color: 'var(--m)' }}>no la da este navegador</p>}>
          {d.mem ? `${d.mem.used} / ${d.mem.limit} MB` : '—'}
        </Tile>
      </div>
    </div>
  );
}
