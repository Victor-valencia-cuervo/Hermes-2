import { Radio } from 'lucide-react';
import FloatCard from './FloatCard';
import useArtColors from '../hooks/useArtColors';

/** Tarjeta flotante global de radios del mundo (estilo Spotify). */
export default function RadioPlayerBar({ r, p, toast, onOpenFull, min, onMinChange }) {
  const st = r.current;
  const colors = useArtColors(st?.art);
  if (!st) return null;

  const accent = colors?.main || '#f59e0b';

  return (
    <>
      <FloatCard
        accent={accent}
        kind="RADIO"
        kindPulse={r.playing}
        art={st.art}
        title={st.name}
        sub={['🎧 2º plano', st.country, st.language, (st.tags || []).slice(0, 2).join(' · ')].filter(Boolean).join(' · ')}
        statusText={r.loading ? 'Conectando…' : ''}
        playing={r.playing}
        loading={r.loading}
        onToggle={() => r.toggle()}
        onPrev={() => r.playRandom()}
        onNext={() => r.playRandom()}
        toggleLabel={r.playing ? 'Pausar radio' : 'Escuchar radio'}
        fav={r.isFav(st)}
        onFav={() => r.toggleFav(st)}
        volume={p.volume}
        muted={p.muted}
        onVolume={(v) => p.setVolume(v)}
        onMute={p.toggleMute}
        progress={null}
        liveRight={st.bitrate > 0 ? `${st.bitrate} kbps` : st.codec}
        posKey="h_radio_card_pos"
        defaultBottom="216px"
        minKey="h_radio_min"
        min={min} onMinChange={onMinChange}
        miniBottom="64px"
        resetKey={st.uuid}
        onClose={() => r.stop()}
        onArtClick={() => onOpenFull?.()}
      />
      {/* <audio> propio de radios: streams infinitos, sin cola ni seeks */}
      <audio ref={r.audio} preload="none"
        onPlay={() => r.setPlaying(true)}
        onPause={() => r.setPlaying(false)}
        onError={() => {
          toast?.('Esa radio falló, prueba otra', Radio);
          r.stop();
        }} />
    </>
  );
}
