import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle, ListMusic, X, Trash2, Headphones, Shuffle, Repeat, Repeat1 } from 'lucide-react';
import ModeBadge from './ModeBadge';
import { playMode } from '../lib/playMode';
import { fmtTime } from '../lib/format';
import Cover from './Cover';
import Marquee from './Marquee';
import BlockedBar from './BlockedBar';
import FloatCard from './FloatCard';
import MiniBarSpotify from './MiniBarSpotify';
import MiniBarLight from './MiniBarLight';
import ClipLayer from './ClipLayer';
import useArtColors from '../hooks/useArtColors';
import useStore from '../hooks/useStore';
import { getAvailabilityLabel } from '../lib/music-state';

export default function PlayerBar({ p, toast, onOpenFull, min, onMinChange }) {
  const { track: t } = p;
  const [buffering, setBuffering] = useState(false);
  const hiddenRef = useRef(null);
  const retriedRef = useRef(null); // id con reintento en curso (sin mutar el track)
  const colors = useArtColors(t?.art);
  const [miniTheme] = useStore('h_mini_theme', 'float');
  const [clips] = useStore('h_clips', true); // clips de video de la canción (Ajustes)
  if (!t) return null;

  const cur0 = p.time?.cur || 0;
  const dur0 = p.time?.dur;
  const dur = (isFinite(dur0) && dur0 > 0 ? dur0 : t.duration) || 0;
  const busy = buffering || p.resolving;
  const accent = colors?.main || 'var(--a)';
  const availabilityText = t.availabilityLabel || getAvailabilityLabel(t.availability);
  const onError = () => {
    setBuffering(false);
    if (t.source === 'YouTube' && !t.native && retriedRef.current !== t.id) {
      // Stream caducado o bloqueado: re-resolver una vez antes de saltar
      retriedRef.current = t.id;
      toast?.('Reintentando stream…', AlertTriangle);
      p.retryCurrent();
      setTimeout(() => { if (retriedRef.current === t.id) retriedRef.current = null; }, 15000);
      return;
    }
    // Centralizado: en frío se ignora (no salta solo al entrar), en caliente
    // revive la URL local o salta con cortacircuitos.
    if (typeof p.handleAudioError === 'function') { p.handleAudioError(); return; }
    toast?.('Ese stream falló, pasando al siguiente', AlertTriangle);
    p.next(true);
  };

  const queuePop = (
    <div role="menu" aria-label={`Cola, ${p.queue.length} temas`}>
      <div className="flex items-center justify-between gap-2 px-1 pb-1 min-w-0">
        <p className="text-[13px] font-semibold truncate">Cola ({p.queue.length}){p.queueDuration ? ` · ${fmtTime(p.queueDuration())}` : ''}{p.radioBusy ? ' · buscando…' : ''}</p>
        <span className="flex gap-1 shrink-0">
          <button className="ico-btn !min-w-[40px] !min-h-[40px]" onClick={() => p.toggleShuffle?.()} aria-label="Aleatorio" aria-pressed={p.shuffle ? 'true' : 'false'} title="Aleatorio (S)" style={p.shuffle ? { color: 'var(--a)' } : undefined}><Shuffle size={16} /></button>
          <button className="ico-btn !min-w-[40px] !min-h-[40px]" onClick={() => p.cycleRepeat?.()} aria-label="Repetir" aria-pressed={p.repeat && p.repeat !== 'off' ? 'true' : 'false'} title="Repetir (R)" style={p.repeat && p.repeat !== 'off' ? { color: 'var(--a)' } : undefined}>{p.repeat === 'one' ? <Repeat1 size={16} /> : <Repeat size={16} />}</button>
          <button className="ico-btn !min-w-[40px] !min-h-[40px]" onClick={() => p.dedupeQueue?.()} aria-label="Quitar duplicados" title="Quitar duplicados"><Trash2 size={16} /></button>
        </span>
      </div>
      <div className="flex items-center gap-2 px-1 pb-2 flex-wrap">
        <ModeBadge t={t} />
        {playMode(t) === 'fg'
          ? <button className="text-[12px] underline min-h-[32px] px-1" style={{ color: 'var(--a)' }} onClick={() => p.swapToBg(true)} title="Cambia gratis a la versión Audius para oír con pantalla apagada">Pasar a 2º plano gratis</button>
          : null}
        <label className="ml-auto flex items-center gap-1.5 text-[12px] cursor-pointer min-h-[32px]" style={{ color: 'var(--m)' }} title="Al apagar la pantalla pasa solo a la versión gratis que sí suena en fondo">
          <input type="checkbox" className="w-4 h-4" checked={p.bgPref} onChange={(e) => p.setBgPref(e.target.checked)} aria-label="Automático a segundo plano" />
          <Headphones size={13} /> Auto 2º plano
        </label>
      </div>
      {!p.queue.length && (
        <div className="text-center px-2 py-4">
          <p className="text-[13px] font-medium">Cola vacía</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--m)' }}>{p.radioBusy ? 'Buscando similares…' : 'La radio automática seguirá sonando.'}</p>
        </div>
      )}
      {p.queue.map((q, i) => {
        const active = q.id === t.id;
        return (
          <div key={`${q.id}-${i}`} className={`flex items-center gap-2 p-1.5 rounded-xl ${active ? 'acc-soft' : ''}`} aria-current={active ? 'true' : undefined}>
            <Cover src={q.art} className="w-10 h-10 !rounded-lg shrink-0" iconSize={14} alt={q.title} />
            <button onClick={() => p.playAt(i)} className="flex-1 min-w-0 text-left rounded-lg px-1 py-1.5" aria-label={`Reproducir ${q.title}`}>
              <p className="text-[13px] truncate">{i + 1}. {q.title}</p>
              <p className="text-[12px] truncate" style={{ color: 'var(--m)' }}>{q.artist}</p>
            </button>
            {active && p.playing
              ? <span className="flex items-center gap-[2px] shrink-0 px-1" aria-hidden="true"><span className="w-1 h-3 rounded-full animate-pulse" style={{ background: 'var(--a)' }} /><span className="w-1 h-4 rounded-full animate-pulse" style={{ background: 'var(--a)', animationDelay: '.15s' }} /><span className="w-1 h-2.5 rounded-full animate-pulse" style={{ background: 'var(--a)', animationDelay: '.3s' }} /></span>
              : null}
            <button className="ico-btn !min-w-[40px] !min-h-[40px] shrink-0" onClick={() => p.removeAt(i)} aria-label={`Quitar ${q.title}`}><X size={16} /></button>
          </div>
        );
      })}
      {/* Historial: lo último que sonó, con su carátula */}
      {(() => {
        const inQ = new Set(p.queue.map((q) => q.id));
        const seen = new Set(); const past = [];
        for (const h of p.history || []) {
          if (!h || h.id === t.id || inQ.has(h.id) || seen.has(h.id)) continue;
          seen.add(h.id); past.push(h);
          if (past.length >= 6) break;
        }
        if (!past.length) return null;
        return (
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--bd)' }} aria-label="Historial">
            <p className="text-[12px] font-semibold uppercase tracking-wide px-1 pb-1" style={{ color: 'var(--m)' }}>Historial</p>
            {past.map((h) => (
              <button key={`h-${h.id}`} onClick={() => p.play(h)} className="w-full flex items-center gap-2 p-1.5 rounded-xl text-left active:scale-[.99] transition" aria-label={`Reproducir ${h.title}`}>
                <Cover src={h.art} className="w-10 h-10 !rounded-lg shrink-0" iconSize={14} alt="" />
                <span className="flex-1 min-w-0"><Marquee className="text-[13px]">{h.title}</Marquee><Marquee className="text-[12px]" style={{ color: 'var(--m)' }}>{h.artist}</Marquee></span>
              </button>
            ))}
          </div>
        );
      })()}
    </div>
  );

  return (
    <>
      {/* Slot oculto: aquí vive el player cuando es solo audio */}
      <div ref={hiddenRef} aria-hidden="true" tabIndex={-1}
        style={{ position: 'fixed', width: 2, height: 2, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }} />
      {miniTheme === 'light' ? (
        min ? null : <MiniBarLight p={p} onOpenFull={() => onOpenFull?.()} onMin={() => onMinChange?.(true)} queuePop={queuePop} />
      ) : miniTheme === 'bar' ? (
        min ? null : <MiniBarSpotify p={p} onOpenFull={() => onOpenFull?.()} onMin={() => onMinChange?.(true)} queuePop={queuePop} />
      ) : (
      <FloatCard
        accent={accent}
        kind="MÚSICA"
        kindPulse={p.radioBusy}
        art={t.art}
        title={t.title}
        sub={t.artist}
        statusText={p.resolving ? 'Buscando audio…' : ''}
        mediaLayer={<ClipLayer track={t} playing={p.playing} getTime={() => p.getCurrentTime?.() || p.time?.cur || 0} enabled={clips} />}
        playing={p.playing}
        loading={busy}
        onToggle={p.toggle}
        onPrev={p.prev}
        onNext={() => p.next(false)}
        toggleLabel={p.playing ? 'Pausar (Espacio)' : 'Reproducir (Espacio)'}
        fav={p.isFav(t)}
        onFav={() => p.toggleFav(t)}
        volume={p.volume}
        muted={p.muted}
        onVolume={(v) => p.setVolume(v)}
        onMute={p.toggleMute}
        progress={{ cur: cur0, dur, curText: fmtTime(cur0), durText: fmtTime(dur) }}
        onSeek={(frac) => p.seek(frac * dur)}
        posKey="h_music_card_pos"
        defaultBottom="76px"
        minKey="h_music_min"
        min={min} onMinChange={onMinChange}
        miniBottom="12px"
        resetKey={t.id}
        onClose={() => p.pause()}
        onArtClick={() => onOpenFull?.()}
        queuePop={queuePop}
        QueueIcon={ListMusic}
        banner={p.blocked ? <BlockedBar p={p} /> : null}
      />
      )}
      {/* crossOrigin solo en Audius (verificado ACAO:*): permite el analizador
          de Fase 4. iTunes/YT sin él para no arriesgar el audio. */}
      <audio key={t.src || t.id} ref={p.audio} src={t.src || undefined} preload="auto" playsInline
        {...(t.source === 'Audius' ? { crossOrigin: 'anonymous' } : {})}
        onPlay={() => { p.setPlaying(true); setBuffering(false); }}
        onPause={() => p.setPlaying(false)}
        onEnded={() => p.handleEnded()}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => setBuffering(false)}
        onError={onError}
        onTimeUpdate={(e) => {
          const el = e.target;
          // Fundido directo (Local/Audius/Radio): evita corte seco
          try {
            const xf = Number(p.xfade) || 0;
            const base = p.muted ? 0 : (p.rawVolume ?? p.volume ?? 0.9);
            const cur = el.currentTime || 0;
            const dur = el.duration || p.time?.dur || 0;
            if (xf > 0 && dur > xf + 2) {
              let f = 1;
              if (dur - cur < xf) f = Math.max(0.05, (dur - cur) / xf);
              else if (cur < Math.min(xf, 3)) f = Math.max(0.15, cur / Math.min(xf, 3));
              el.volume = Math.min(1, Math.max(0, base * f));
            } else {
              el.volume = p.muted ? 0 : Math.min(1, Math.max(0, base));
            }
          } catch {}
          p.tick(el.currentTime, el.duration || dur);
        }}
        onLoadedMetadata={(e) => { try { e.target.playbackRate = Math.min(2, Math.max(0.5, Number(p.rate) || 1)); } catch {} p.setTime({ cur: 0, dur: e.target.duration || dur }); p.applyPendingSeek?.(); }} />
    </>
  );
}
