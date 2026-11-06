import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, ListPlus, ListMusic, ImageIcon, Download, Share2, User, Radio, Shuffle, Repeat, Repeat1, Timer, Gauge, Sliders, Headphones, Info, Plus, ChevronLeft, Layers, Check } from 'lucide-react';
import { Sheet } from './ui';
import { SLEEPS, RATES, shareTrack, useAudioOutput } from './bits';
import { fmtTime } from '../../lib/format';
import { EQ_PRESETS, setEQPreset } from '../../lib/analyser';
import { saveLocalCopy } from '../../lib/saveFile';
import { DL_TOOLS, videoUrlOf } from '../../lib/dltools';
import usePlaylists from '../../hooks/usePlaylists';
import useStore from '../../hooks/useStore';

const XFADES = [0, 1, 2, 3, 5, 8, 12];

const qualityText = (t) => (t?.source === 'Local'
  ? 'Archivo local: suena con la calidad original del archivo.'
  : t?.source === 'Audius'
    ? 'Streaming directo de Audius (audio MP3). No se puede elegir otra calidad desde la web.'
    : 'YouTube: la calidad la elige YouTube automáticamente según tu conexión; la web no deja fijarla.');

/** Menú ⋯: acciones de la canción + ajustes de reproducción, agrupados. Todo ejecuta acciones reales;
 *  lo que una fuente no permite aparece deshabilitado con su motivo. */
export default function MoreSheet({ p, toast, bits, theme, setTheme, onClose, onQueue, onCover, onCloseAll }) {
  const t = p.track;
  const nav = useNavigate();
  const pls = usePlaylists(toast);
  const [dlTool] = useStore('h_dl_tool', 'savefrom');
  const output = useAudioOutput();
  const [page, setPage] = useState('main'); // main | lists
  const [newName, setNewName] = useState('');
  const fav = p.isFav(t);
  const yt = t.source === 'YouTube';

  const chip = (on) => ({ background: on ? '#fff' : 'rgba(255,255,255,.14)', color: on ? '#111' : '#fff' });
  const row = 'w-full flex items-center gap-3.5 px-1 py-3 text-left active:opacity-70 disabled:opacity-40 min-h-[52px]';
  const Row = ({ icon: I, label, hint, onClick, disabled, right }) => (
    <button className={row} onClick={onClick} disabled={disabled}>
      <I size={20} className="shrink-0 text-white/85" />
      <span className="flex-1 min-w-0"><span className="block text-[16px] font-medium">{label}</span>{hint && <span className="block text-[12px] text-white/55">{hint}</span>}</span>
      {right}
    </button>
  );
  const Group = ({ icon: I, title, children, note }) => (
    <section className="py-3 border-t border-white/10">
      <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-white/55 mb-2"><I size={14} /> {title}</p>
      {children}
      {note && <p className="text-[11.5px] text-white/50 mt-2 leading-snug">{note}</p>}
    </section>
  );
  const Chips = ({ items, isOn, onPick, label }) => (
    <div className="flex gap-1.5 flex-wrap" role="group" aria-label={label}>
      {items.map(([k, text]) => <button key={String(k)} onClick={() => onPick(k)} aria-pressed={isOn(k)} className="px-3.5 min-h-[40px] rounded-full text-[13px] font-semibold" style={chip(isOn(k))}>{text}</button>)}
    </div>
  );

  const download = async () => {
    if (t.src) {
      try {
        toast?.('Descargando…', Download);
        const r = await saveLocalCopy(t);
        if (r?.ok) toast?.('Guardada en tu dispositivo', Check);
        else if (!r?.aborted) toast?.('No se pudo descargar esta canción', Download);
      } catch { toast?.('No se pudo descargar esta canción', Download); }
      return;
    }
    const url = videoUrlOf(t);
    if (!url) { toast?.('Este tema no tiene link de YouTube para descargar', Download); return; }
    const tool = DL_TOOLS[dlTool] || DL_TOOLS.savefrom;
    let copied = false;
    try { await navigator.clipboard.writeText(url); copied = true; } catch { copied = false; }
    try { window.open(tool.url, '_blank', 'noopener'); } catch { /* popup bloqueado */ }
    toast?.(copied ? `Link copiado: pégalo en ${tool.name}` : `Copia este link en ${tool.name}: ${url}`, Download);
  };
  const goArtist = () => {
    const a = String(t.artist || '').replace(/\s*-\s*topic\s*$/i, '').trim();
    if (!a) return;
    onCloseAll?.();
    nav(`/musica/resultados?q=${encodeURIComponent(a)}`);
  };
  const addToList = (pl) => { pls.addTrack(pl.id, t); setPage('main'); };
  const createList = (e) => {
    e.preventDefault();
    const pl = pls.create(newName);
    if (pl) { pls.addTrack(pl.id, t, true); toast?.(`Añadida a «${pl.name}»`, Check); setNewName(''); setPage('main'); }
  };

  if (page === 'lists') {
    return (
      <Sheet title="Añadir a una lista" onClose={onClose}>
        <button onClick={() => setPage('main')} className="flex items-center gap-1 text-[13px] text-white/70 mb-2 min-h-[40px]"><ChevronLeft size={16} /> Volver</button>
        <form onSubmit={createList} className="flex gap-2 mb-3">
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nueva lista" aria-label="Nombre de la nueva lista" maxLength={40} className="flex-1 rounded-xl px-3 h-11 text-[15px] outline-none bg-white/12 placeholder:text-white/40 min-w-0" />
          <button type="submit" disabled={!newName.trim()} className="px-4 h-11 rounded-xl text-[14px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-40" style={{ background: '#fff', color: '#111' }}><Plus size={15} /> Crear</button>
        </form>
        {!pls.playlists.length && <p className="text-[14px] text-white/60 py-4">Aún no tienes listas. Crea la primera arriba y la canción se añade sola.</p>}
        {pls.playlists.map((pl) => {
          const has = pls.inPlaylist?.(pl.id, t.id);
          return (
            <button key={pl.id} onClick={() => addToList(pl)} disabled={has} className={row}>
              <span className="w-11 h-11 rounded-lg grid place-items-center bg-white/12 shrink-0"><ListMusic size={18} /></span>
              <span className="flex-1 min-w-0"><span className="block text-[15px] font-semibold truncate">{pl.name}</span><span className="block text-[12px] text-white/55">{pl.tracks.length} canciones</span></span>
              {has && <span className="text-[12px] text-white/55 inline-flex items-center gap-1"><Check size={13} /> Ya está</span>}
            </button>
          );
        })}
      </Sheet>
    );
  }

  return (
    <Sheet title={t.title} onClose={onClose}>
      <div className="-mt-1 mb-1">
        <Row icon={Star} label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'} onClick={() => p.toggleFav(t)} right={fav ? <Check size={16} /> : null} />
        <Row icon={ListPlus} label="Añadir a una lista" onClick={() => setPage('lists')} />
        <Row icon={ListMusic} label="Gestionar la cola" hint={`${p.queue.length} en la cola`} onClick={() => { onClose(); onQueue(); }} />
        <Row icon={ImageIcon} label="Cambiar carátula" hint={t.artCustom ? 'Elegida por ti' : t.artOriginal ? 'Oficial (automática)' : undefined} onClick={() => { onClose(); onCover(); }} />
        <Row icon={Download} label="Descargar" hint={t.src ? 'Guarda el audio en tu dispositivo' : yt ? 'Con una herramienta web externa (copia el link)' : undefined} onClick={download} />
        <Row icon={Share2} label="Compartir" onClick={() => shareTrack(t, toast)} />
        <Row icon={User} label={`Ir al artista${t.artist ? `: ${t.artist}` : ''}`} onClick={goArtist} disabled={!t.artist} />
        <Row icon={Radio} label="Mezcla inteligente" hint={yt ? 'Agrega canciones similares a la cola' : 'Disponible con canciones de YouTube'} disabled={!t.videoId || p.radioBusy} onClick={() => { p.startRadio?.(t); onClose(); }} />
        {yt && <Row icon={Headphones} label="Seguir en segundo plano" onClick={() => { p.swapToBg?.(true); onCloseAll?.(); }} />}
      </div>

      <Group icon={Shuffle} title="Mezclar y repetir" note="Con la mezcla activa, la canción actual se queda y el resto se reordena sin repetir hasta que suenen todas. Al apagarla vuelve el orden original.">
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={p.toggleShuffle} role="switch" aria-checked={!!p.shuffle} className="px-4 min-h-[40px] rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5" style={chip(p.shuffle)}><Shuffle size={14} /> Mezclar: {p.shuffle ? 'activada' : 'desactivada'}</button>
          {p.shuffle && <button onClick={p.reshuffle} className="px-4 min-h-[40px] rounded-full text-[13px] font-semibold" style={chip(false)}>Mezclar de nuevo</button>}
          <button onClick={p.cycleRepeat} className="px-4 min-h-[40px] rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5" style={chip(p.repeat !== 'off')}>{p.repeat === 'one' ? <Repeat1 size={14} /> : <Repeat size={14} />} {p.repeat === 'one' ? 'Repite una' : p.repeat === 'all' ? 'Repite la cola' : 'Repetir: no'}</button>
        </div>
      </Group>

      <Group icon={Layers} title="Fundido entre canciones" note={`Al terminar una canción baja el volumen y la siguiente entra subiendo, sin cortes bruscos. Es un fundido de salida y entrada, no una superposición real de dos pistas: la web no permite sonar dos fuentes a la vez sin romper YouTube.`}>
        <Chips label="Duración del fundido" items={XFADES.map((n) => [n, n === 0 ? 'Apagado' : `${n} s`])} isOn={(k) => (p.xfade || 0) === k} onPick={(k) => p.setXfade?.(k)} />
      </Group>

      <Group icon={Timer} title="Temporizador de apagado" note={bits.sleepMin ? `Se pausa en ${fmtTime(bits.sleepLeft)}` : undefined}>
        <Chips label="Temporizador" items={SLEEPS.map((m) => [m, m === 0 ? 'Apagado' : `${m} min`])} isOn={(k) => bits.sleepMin === k} onPick={bits.setSleepMin} />
      </Group>

      <Group icon={Gauge} title="Velocidad">
        <Chips label="Velocidad" items={RATES.map((r) => [r, `${r}×`])} isOn={(k) => (p.rate || 1) === k} onPick={(k) => p.setRate?.(k)} />
      </Group>

      <Group icon={Sliders} title="Ecualizador" note={yt ? 'No aplica a YouTube: el audio lo reproduce YouTube.' : undefined}>
        <div className="flex gap-1.5 flex-wrap" style={yt ? { opacity: 0.45, pointerEvents: 'none' } : undefined}>
          {Object.keys(EQ_PRESETS).map((name) => (
            <button key={name} onClick={() => { p.applyEQ?.(name, EQ_PRESETS[name]); const el = p.audio?.current; if (el) setEQPreset(el, EQ_PRESETS[name]); }} aria-pressed={p.eqPreset === name}
              className="px-3.5 min-h-[40px] rounded-full text-[13px] font-semibold" style={chip(p.eqPreset === name)}>{name}</button>
          ))}
        </div>
      </Group>

      {bits.lines.length > 0 && (
        <Group icon={Gauge} title="Sincronía de la letra"
          note={bits.lrcIsManual ? 'Ajuste guardado para esta canción. Si la letra sale antes de tiempo, usa −.' : bits.lrcAuto ? `Ajuste automático de ${String(bits.lrcAuto).replace('.', ',')} s por la intro del video. Si la letra sale antes de tiempo, usa −.` : 'Si la letra sale antes de tiempo, usa −; si sale tarde, usa +. Se recuerda por canción.'}>
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <button className="px-3 min-h-[40px] rounded-full text-[13px] font-semibold" style={chip(false)} onClick={() => bits.setLrcOffset((o) => o - 2)}>−2 s</button>
            <button className="px-3 min-h-[40px] rounded-full text-[13px] font-semibold" style={chip(false)} onClick={() => bits.setLrcOffset((o) => o - 0.5)}>−0,5</button>
            <span className="tabular-nums w-16 text-center text-[14px]">{(bits.lrcOffset > 0 ? '+' : '') + String(bits.lrcOffset).replace('.', ',')} s</span>
            <button className="px-3 min-h-[40px] rounded-full text-[13px] font-semibold" style={chip(false)} onClick={() => bits.setLrcOffset((o) => o + 0.5)}>+0,5</button>
            <button className="px-3 min-h-[40px] rounded-full text-[13px] font-semibold" style={chip(false)} onClick={() => bits.setLrcOffset((o) => o + 2)}>+2 s</button>
          </div>
          {(bits.lrcIsManual || bits.lrcAuto !== 0) && (
            <div className="flex justify-center mt-2">
              <button className="px-4 min-h-[36px] rounded-full text-[12px] font-semibold" style={chip(false)} onClick={bits.lrcIsManual ? bits.resetLrcOffset : () => bits.setLrcOffset(0)}>{bits.lrcIsManual ? 'Volver al ajuste automático' : 'Quitar ajuste automático'}</button>
            </div>
          )}
        </Group>
      )}

      <Group icon={Info} title="Calidad y salida" note={qualityText(t)}>
        <p className="text-[14px] text-white/85">Fuente: {t.source || '—'} · Salida: {output}</p>
      </Group>

      <Group icon={Layers} title="Apariencia del reproductor">
        <Chips label="Tema" items={[['apple-1', 'Tema 1 · inmersivo'], ['apple-2', 'Tema 2 · en cuadro']]} isOn={(k) => theme === k} onPick={setTheme} />
      </Group>
    </Sheet>
  );
}
