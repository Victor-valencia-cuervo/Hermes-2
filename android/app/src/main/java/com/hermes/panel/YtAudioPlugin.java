package com.hermes.panel;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.schabi.newpipe.extractor.MediaFormat;
import org.schabi.newpipe.extractor.NewPipe;
import org.schabi.newpipe.extractor.ServiceList;
import org.schabi.newpipe.extractor.stream.AudioStream;
import org.schabi.newpipe.extractor.stream.DeliveryMethod;
import org.schabi.newpipe.extractor.stream.StreamInfo;

import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Plugin "YtAudio": dada la ID de un video de YouTube devuelve la URL directa de su AUDIO.
 * La web la reproduce en un <audio> normal, que Android deja sonar con la pantalla apagada
 * (junto con el servicio en primer plano y la Media Session). Así el segundo plano ya no
 * depende del iframe de YouTube, que se pausa al apagar la pantalla.
 */
@CapacitorPlugin(name = "YtAudio")
public class YtAudioPlugin extends Plugin {
    private static final ExecutorService POOL = Executors.newFixedThreadPool(3);
    private static boolean inited = false;

    private static synchronized void ensureInit() {
        if (!inited) {
            NewPipe.init(NpDownloader.get());
            inited = true;
        }
    }

    @PluginMethod
    public void resolve(final PluginCall call) {
        final String videoId = call.getString("videoId");
        if (videoId == null || !videoId.matches("[A-Za-z0-9_-]{11}")) {
            call.reject("videoId inválido");
            return;
        }
        POOL.execute(() -> {
            try {
                ensureInit();
                StreamInfo info = StreamInfo.getInfo(ServiceList.YouTube,
                    "https://www.youtube.com/watch?v=" + videoId);
                AudioStream best = pick(info.getAudioStreams());
                if (best == null) { call.reject("Sin audio disponible"); return; }
                JSObject out = new JSObject();
                out.put("url", best.getContent());
                out.put("mime", best.getFormat() != null ? best.getFormat().getMimeType() : "");
                out.put("bitrate", best.getAverageBitrate());
                out.put("duration", info.getDuration());
                call.resolve(out);
            } catch (Throwable e) {
                call.reject("No se pudo resolver: " + e.getClass().getSimpleName() + " " + e.getMessage());
            }
        });
    }

    /** Prefiere M4A/AAC (lo reproduce cualquier WebView) con la mejor tasa; si no, WebM/Opus. Solo HTTP progresivo. */
    private static AudioStream pick(List<AudioStream> list) {
        AudioStream best = null; int bestScore = -1;
        if (list == null) return null;
        for (AudioStream s : list) {
            if (s.getDeliveryMethod() != DeliveryMethod.PROGRESSIVE_HTTP) continue;
            if (s.getContent() == null || s.getContent().isEmpty()) continue;
            MediaFormat f = s.getFormat();
            int base = f == MediaFormat.M4A ? 100000 : f == MediaFormat.WEBMA_OPUS || f == MediaFormat.WEBMA ? 50000 : 0;
            int score = base + Math.min(s.getAverageBitrate(), 200);
            if (score > bestScore) { best = s; bestScore = score; }
        }
        return best;
    }
}
