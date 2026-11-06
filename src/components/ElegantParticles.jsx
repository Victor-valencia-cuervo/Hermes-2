import { useEffect, useRef } from 'react';

/**
 * Fondo elegante de partículas (port de la demo): deriva delicada,
 * se apartan al pasar mouse/dedo y vuelven suaves, con líneas tenues.
 * El color viene 100% automático de la carátula (prop `rgb`).
 */
export default function ElegantParticles({ rgb, enabled = true, density = 170, radius = 170, force = 5, showLines = true, maxOpacity = 0.55 }) {
  const cvRef = useRef(null);
  const cfg = useRef({ rgb, enabled, density, radius, force, showLines, maxOpacity });
  cfg.current = { rgb, enabled, density, radius, force, showLines, maxOpacity };

  useEffect(() => {
    const cv = cvRef.current;
    if (!cv) return undefined;
    const cx = cv.getContext('2d');
    if (!cx) return undefined;
    let W = 0, H = 0, raf = 0;
    let particles = [];

    const mouse = { x: -1000, y: -1000, tx: -1000, ty: -1000, active: false };

    const make = () => {
      const c = cfg.current;
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.55,
        vy: (Math.random() - 0.5) * 0.55,
        dx: 0, dy: 0, glow: 0,
        size: Math.random() * 2.1 + 1.1, // 1.1px a 3.2px: visibles sobre velo oscuro
        baseOpacity: Math.random() * (c.maxOpacity * 0.5) + (c.maxOpacity * 0.5),
        opacity: 0.1,
        pulseSpeed: Math.random() * 0.015 + 0.005,
        pulseAngle: Math.random() * Math.PI * 2,
      };
    };
    const rebuild = () => {
      const c = cfg.current;
      // Tope bajo en móvil: el O(n²) de líneas con 700 partículas colgaba la gama baja.
      const small = Math.min(W, H) < 520;
      const cap = small ? 130 : 260;
      const n = Math.max(24, Math.floor(((W * H) / 9000) * (c.density / 100)));
      particles = Array.from({ length: Math.min(n, cap) }, make);
    };
    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      W = cv.clientWidth; H = cv.clientHeight;
      if (!W || !H) return;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuild();
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!W || !H) { resize(); if (!W || !H) return; } // el diálogo pudo medir 0 al montar: reintenta
      frame();
    };

    const frame = () => {
      const c = cfg.current;
      const { r, g, b } = c.rgb;
      cx.clearRect(0, 0, W, H);
      mouse.x += (mouse.tx - mouse.x) * 0.2;
      mouse.y += (mouse.ty - mouse.y) * 0.2;

      // Radio menor + tope de partículas: menos pares por frame, mismo look.
      if (c.showLines) {
        const maxD = 80;
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const p1 = particles[i], p2 = particles[j];
            const ddx = p1.x - p2.x, ddy = p1.y - p2.y;
            const dist = Math.hypot(ddx, ddy);
            if (dist < maxD) {
              const a = (1 - dist / maxD) * 0.3 * (c.maxOpacity / 0.35);
              if (a > 0.005) {
                cx.beginPath();
                cx.moveTo(p1.x, p1.y);
                cx.lineTo(p2.x, p2.y);
                cx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${a})`;
                cx.lineWidth = 0.6;
                cx.stroke();
              }
            }
          }
        }
      }

      for (const pt of particles) {
        pt.x += pt.vx;
        pt.y += pt.vy;
        if (pt.x < 0) pt.x = W;
        if (pt.x > W) pt.x = 0;
        if (pt.y < 0) pt.y = H;
        if (pt.y > H) pt.y = 0;
        if (mouse.active) {
          const diffX = pt.x - mouse.x, diffY = pt.y - mouse.y;
          const dist = Math.hypot(diffX, diffY);
          if (dist < c.radius && dist > 0) {
            const f = Math.pow(1 - dist / c.radius, 2) * c.force * 1.8;
            const ang = Math.atan2(diffY, diffX);
            pt.dx += Math.cos(ang) * f;
            pt.dy += Math.sin(ang) * f;
            // Brillo al interactuar: se nota aunque el fondo sea claro
            pt.glow = Math.min(1, (1 - dist / c.radius) * 1.3);
          }
        }
        pt.glow = (pt.glow || 0) * 0.92;
        pt.x += pt.dx;
        pt.y += pt.dy;
        pt.dx *= 0.88;
        pt.dy *= 0.88;
        pt.pulseAngle += pt.pulseSpeed;
        pt.opacity = Math.max(0.12, Math.min(0.95,
          pt.baseOpacity + Math.sin(pt.pulseAngle) * 0.15 + (pt.glow || 0) * 0.4));
        // Si cambió la opacidad máxima desde el panel, re-encuadra la base
        if (pt.baseOpacity > c.maxOpacity) pt.baseOpacity = c.maxOpacity;
        cx.beginPath();
        cx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
        cx.fillStyle = `rgba(${r}, ${g}, ${b}, ${pt.opacity})`;
        cx.shadowColor = `rgba(${r}, ${g}, ${b}, ${Math.min(0.8, pt.opacity)})`;
        cx.shadowBlur = pt.glow > 0.05 ? 10 : 5;
        cx.fill();
        cx.shadowBlur = 0;
      }
    };

    const onMove = (e) => { mouse.tx = e.clientX; mouse.ty = e.clientY; mouse.active = true; };
    const onLeave = () => { mouse.active = false; };
    const onTouch = (e) => {
      if (e.touches.length) {
        mouse.tx = e.touches[0].clientX; mouse.ty = e.touches[0].clientY;
        mouse.x = mouse.tx; mouse.y = mouse.ty; mouse.active = true;
      }
    };

    // Reconstruye si cambian densidad u opacidad (el resto se lee en vivo por ref)
    let lastDensity = cfg.current.density;
    let lastOpacity = cfg.current.maxOpacity;
    const cfgWatch = setInterval(() => {
      if (cfg.current.density !== lastDensity || cfg.current.maxOpacity !== lastOpacity) {
        lastDensity = cfg.current.density;
        lastOpacity = cfg.current.maxOpacity;
        rebuild();
      }
    }, 300);

    resize();
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    raf = requestAnimationFrame(draw);
    window.addEventListener('mousemove', onMove);
    document.documentElement.addEventListener('mouseleave', onLeave);
    window.addEventListener('touchstart', onTouch, { passive: true });
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('touchend', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(cfgWatch);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('touchstart', onTouch);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('touchend', onLeave);
    };
  }, []);

  if (!enabled) return null;
  return (
    <canvas ref={cvRef} aria-hidden="true"
      className="absolute inset-0 z-0 pointer-events-none"
      style={{ width: '100%', height: '100%' }} />
  );
}
