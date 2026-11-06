import { useEffect, useRef } from 'react';

/**
 * Barras de espectro. Usa el analyser real si hay (temas Audius),
 * si no una simulación suave (temas YouTube / contexto suspendido).
 */
export default function Visualizer({ analyserRef, playing, color = '#818cf8', bars = 40, height = 52 }) {
  const cvRef = useRef(null);
  const playRef = useRef(playing);
  playRef.current = playing;
  const colorRef = useRef(color);
  colorRef.current = color;

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return;
    const cx = cv.getContext('2d');
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const buf = new Uint8Array(128);
    let raf = 0;
    let amp = 0.12;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth, h = cv.clientHeight;
      cv.width = Math.max(1, Math.round(w * dpr));
      cv.height = Math.max(1, Math.round(h * dpr));
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = (now) => {
      raf = requestAnimationFrame(draw);
      // Pestaña oculta: no quemar CPU en 2º plano.
      if (document.hidden) return;
      const W = cv.clientWidth, H = cv.clientHeight;
      if (!W || !H) return;
      cx.clearRect(0, 0, W, H);
      const on = playRef.current && !reduced;
      let vals = null;
      if (on) {
        const an = analyserRef?.current;
        if (an) {
          try { an.getByteFrequencyData(buf); vals = buf; } catch { vals = null; }
        }
      }
      amp += ((on ? 1 : 0.12) - amp) * 0.08;
      const bw = W / bars;
      for (let i = 0; i < bars; i++) {
        let v;
        if (vals) {
          const bin = Math.min(vals.length - 1, Math.floor((i / bars) * 48) + 2);
          v = vals[bin] / 255;
        } else {
          // Simulado con pulso de beat para que siempre se vea vivo
          const t = now / 1000;
          const beat = 0.72 + 0.28 * Math.sin(t * 3.4);
          v = (0.12 + 0.88 * Math.abs(Math.sin(t * 1.9 + i * 0.5) * Math.sin(t * 0.8 + i * 0.23))) * beat;
        }
        const h = Math.max(2, v * amp * H);
        const x = i * bw + bw * 0.22;
        const w = Math.max(1.5, bw * 0.56);
        cx.fillStyle = colorRef.current;
        cx.globalAlpha = 0.3 + 0.7 * Math.min(1, h / H);
        const y = (H - h) / 2;
        if (cx.roundRect) { cx.beginPath(); cx.roundRect(x, y, w, h, w / 2); cx.fill(); }
        else cx.fillRect(x, y, w, h);
      }
      cx.globalAlpha = 1;
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [analyserRef, bars]);

  return <canvas ref={cvRef} style={{ width: '100%', height }} aria-hidden="true" />;
}
