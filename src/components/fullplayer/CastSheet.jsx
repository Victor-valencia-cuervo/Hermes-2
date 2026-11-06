import { Airplay, Copy, ExternalLink, Share2, Speaker } from 'lucide-react';
import { Sheet } from './ui';
import { shareTrack } from './bits';

const Row = ({ icon: I, label, hint, onClick, disabled }) => (
  <button onClick={onClick} disabled={disabled} className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left active:scale-[.98] transition disabled:opacity-40" style={{ background: 'rgba(255,255,255,.08)' }}>
    <span className="w-10 h-10 rounded-xl grid place-items-center shrink-0" style={{ background: 'rgba(255,255,255,.14)' }}><I size={20} /></span>
    <span className="min-w-0"><span className="block text-[15px] font-semibold">{label}</span>{hint && <span className="block text-[12px]" style={{ color: 'rgba(255,255,255,.6)' }}>{hint}</span>}</span>
  </button>
);

/** «Enviar a otro dispositivo». Audius/Local: el audio sale por AirPlay/Chromecast o por la salida que elijas.
 *  YouTube: la web no deja enviar el audio del reproductor incrustado, así que se sigue en YouTube
 *  (en su app sí hay Chromecast/AirPlay) desde el mismo segundo, o se comparte el enlace. */
export default function CastSheet({ p, toast, onClose }) {
  const t = p.track; const yt = t?.source === 'YouTube';
  const el = p.audio?.current;
  const secs = Math.max(0, Math.floor(p.getCurrentTime?.() || p.time?.cur || 0));
  const link = t?.videoId ? `https://youtu.be/${t.videoId}?t=${secs}` : '';
  const canRemote = !yt && !!el?.remote && typeof el.remote.prompt === 'function';
  const canSink = !yt && !!el && typeof el.setSinkId === 'function' && !!navigator.mediaDevices?.selectAudioOutput;
  const pickSink = async () => {
    try { const d = await navigator.mediaDevices.selectAudioOutput(); await el.setSinkId(d.deviceId); toast?.(`Audio en: ${d.label || 'dispositivo elegido'}`, Speaker); onClose(); } catch { /* cancelado */ }
  };
  return (
    <Sheet title="Enviar a otro dispositivo" onClose={onClose}>
      <div className="space-y-2 pb-2">
        {yt ? (
          <>
            <Row icon={ExternalLink} label="Seguir en YouTube" hint="Se abre en este minuto; ahí puedes enviarlo a tu TV o bocina" disabled={!link}
              onClick={() => { p.pause?.(); window.open(link, '_blank', 'noopener'); onClose(); }} />
            <Row icon={Copy} label="Copiar enlace en este minuto" disabled={!link} onClick={async () => { try { await navigator.clipboard.writeText(link); toast?.('Enlace copiado', Copy); } catch { toast?.('No se pudo copiar'); } onClose(); }} />
            <Row icon={Share2} label="Compartir canción" onClick={() => { shareTrack(t, toast); onClose(); }} />
            <p className="text-[12px] px-1 pt-1" style={{ color: 'rgba(255,255,255,.55)' }}>YouTube no permite enviar el audio de su reproductor incrustado a otros dispositivos desde una app o web de terceros. Con canciones de Audius o locales sí se puede.</p>
          </>
        ) : (
          <>
            <Row icon={Airplay} label="AirPlay / Chromecast" hint={canRemote ? 'Elige un dispositivo cercano' : 'No disponible en este navegador'} disabled={!canRemote} onClick={() => { el.remote.prompt().catch(() => {}); onClose(); }} />
            <Row icon={Speaker} label="Elegir salida de audio" hint={canSink ? 'Bocinas, auriculares, bluetooth…' : 'No disponible en este navegador'} disabled={!canSink} onClick={pickSink} />
            {!canRemote && !canSink && <p className="text-[12px] px-1 pt-1" style={{ color: 'rgba(255,255,255,.55)' }}>En el celular, cambia la salida desde el panel de música del sistema (Bluetooth, Cast).</p>}
          </>
        )}
      </div>
    </Sheet>
  );
}
