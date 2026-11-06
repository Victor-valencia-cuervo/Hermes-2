package com.hermes.panel;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(YtAudioPlugin.class); // audio directo de YouTube para el segundo plano
        super.onCreate(savedInstanceState);
        // Permite que audio/video arranque sin gesto repetido (la cola sigue sola en segundo plano)
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
}
