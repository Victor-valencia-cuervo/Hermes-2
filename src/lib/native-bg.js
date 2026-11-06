// Segundo plano en el APK (Capacitor): mantiene vivo el proceso con un servicio en primer plano
// mientras suena algo, para que el audio siga con la pantalla apagada. En web normal no hace nada.
// Los controles de pantalla de bloqueo siguen saliendo de la Media Session API (usePlayer.js).
import { Capacitor } from '@capacitor/core';

const isNative = () => { try { return Capacitor.isNativePlatform(); } catch { return false; } };
let running = false;
let FS = null;

async function plugin() {
  if (!FS) ({ ForegroundService: FS } = await import('@capawesome-team/capacitor-android-foreground-service'));
  return FS;
}

export async function setNativePlayback(active, info = {}) {
  if (!isNative()) return;
  try {
    const fs = await plugin();
    if (active && !running) {
      await fs.requestPermissions().catch(() => {});
      await fs.startForegroundService({
        id: 4101,
        title: info.title || 'Hermes',
        body: info.artist || 'Reproduciendo música',
        smallIcon: 'ic_stat_hermes',
        serviceType: 2, // mediaPlayback
      });
      running = true;
    } else if (active && running) {
      await fs.updateForegroundService({ id: 4101, title: info.title || 'Hermes', body: info.artist || 'Reproduciendo música', smallIcon: 'ic_stat_hermes' });
    } else if (!active && running) {
      await fs.stopForegroundService();
      running = false;
    }
  } catch { /* sin permiso/plugin: sigue como web */ }
}
