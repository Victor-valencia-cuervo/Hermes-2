// Trucos especiales de las mascotas. Cada truco es una función async que recibe `a` (la API
// que arma Pet.jsx): a.frame(), a.say(), a.wait(), a.moveTo(), a.hop(), a.fade(), a.teleport(),
// a.local() / a.screen() (crean elementos que se limpian solos), a.anim(), a.flash()…
// Si el usuario agarra / sacude / duerme a la mascota, el truco se cancela y se limpia todo.
//
// Para añadir uno: crea la función aquí y ponle `sp: { id: 'tuTruco', chance: 0.05 }` a la mascota
// en pets.js (los cuadros propios van en `sf`).

const css = (s) => { const d = document.createElement('div'); d.style.cssText = `position:absolute;pointer-events:none;${s}`; return d; };
const svg = (w, h, body, extra = '') => `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;overflow:visible;${extra}">${body}</svg>`;
const dot = (size, bg, extra = '') => css(`width:${size}px;height:${size}px;margin:${-size / 2}px 0 0 ${-size / 2}px;background:${bg};${extra}`);
const NOTE = (c) => svg(14, 18, `<ellipse cx="4.5" cy="14" rx="4" ry="3" fill="${c}"/><rect x="7.5" y="2" width="2" height="12" fill="${c}"/><path d="M9.5 2 Q14 4 12.5 9" stroke="${c}" stroke-width="2" fill="none"/>`);
const SPARK = (c, s = 12) => svg(s, s, `<path d="M${s / 2} 0 L${s * 0.62} ${s * 0.38} L${s} ${s / 2} L${s * 0.62} ${s * 0.62} L${s / 2} ${s} L${s * 0.38} ${s * 0.62} L0 ${s / 2} L${s * 0.38} ${s * 0.38} Z" fill="${c}"/>`);
const FLAKE = (c, s = 12) => svg(s, s, `<g stroke="${c}" stroke-width="1.6" stroke-linecap="round"><path d="M${s / 2} 0V${s}M0 ${s / 2}H${s}M${s * 0.15} ${s * 0.15}L${s * 0.85} ${s * 0.85}M${s * 0.85} ${s * 0.15}L${s * 0.15} ${s * 0.85}"/></g>`);
const HEART = (c, s = 12) => svg(s, s, `<path d="M${s / 2} ${s * 0.92} C${-s * 0.2} ${s * 0.45} ${s * 0.2} ${-s * 0.1} ${s / 2} ${s * 0.3} C${s * 0.8} ${-s * 0.1} ${s * 1.2} ${s * 0.45} ${s / 2} ${s * 0.92}Z" fill="${c}"/>`);

/** Humo / polvo: n bolitas que se expanden y se desvanecen. */
function puff(a, x, y, colors, n = 8, spread = 34, size = 14) {
  for (let i = 0; i < n; i++) {
    const c = colors[i % colors.length]; const ang = (i / n) * Math.PI * 2 + a.R(-0.3, 0.3); const d = a.R(spread * 0.4, spread);
    const e = dot(a.R(size * 0.6, size), c, 'border-radius:50%;opacity:.9;');
    a.screen(e, x, y);
    a.anim(e, [{ transform: 'translate(0,0) scale(.4)', opacity: 0.95 }, { transform: `translate(${Math.cos(ang) * d}px,${Math.sin(ang) * d * 0.7 - 6}px) scale(1.5)`, opacity: 0 }], { duration: a.R(450, 750), easing: 'ease-out' });
  }
}
/** Estrellitas / destellos que salen disparados. */
function sparks(a, x, y, html, n = 8, spread = 44, ms = 700) {
  for (let i = 0; i < n; i++) {
    const e = css('left:0;top:0;'); e.innerHTML = typeof html === 'function' ? html(i) : html; a.screen(e, x, y);
    const ang = (i / n) * Math.PI * 2 + a.R(-0.4, 0.4); const d = a.R(spread * 0.5, spread);
    a.anim(e, [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * d - 6}px,${Math.sin(ang) * d - 6}px) scale(1) rotate(${a.R(-90, 90)}deg)`, opacity: 0 }], { duration: ms, easing: 'ease-out' });
  }
}
/** Pantalla entera: color que aparece y se va. */
// z=1 (ambiente) va DETRÁS de las mascotas para no teñirlas; los destellos (z>1) van encima.
const veil = (a, bg, peak, inMs, outMs, z = 1) => {
  const v = css(`left:0;top:0;width:100%;height:100%;background:${bg};opacity:0;z-index:${z === 1 ? -1 : z};`);
  a.layer(v);
  return a.anim(v, [{ opacity: 0 }, { opacity: peak, offset: inMs / (inMs + outMs) }, { opacity: 0 }], { duration: inMs + outMs, easing: 'ease-out' });
};
const sideX = (a, far = true) => { const b = a.bounds(); return far ? (a.x < (b.minX + b.maxX) / 2 ? b.maxX : b.minX) : a.x; };

export const SPECIALS = {
  /* ─────────── Conde: se convierte en murciélago ─────────── */
  async bat(a) {
    const { f } = a;
    a.frame(f.pose, 1); a.say('Muajaja… ¡mírame!', 1600);
    await a.wait(1100);
    const cx = a.x; const cy = a.y - a.H * 0.45;
    puff(a, cx, cy, ['#2a1f40', '#4b3a6e', '#8f7ab5'], 10, 40, 16);
    a.fade(0, 90);
    const v = Math.floor(a.R(0, 6)); const cw = 38; const ch = 26;
    const bat = css(`width:${cw}px;height:${ch}px;margin:${-ch / 2}px 0 0 ${-cw / 2}px;background:url(pets/fx/bats.png?v=1) 0 ${-v * ch}px/${cw * 2}px ${ch * 6}px no-repeat;image-rendering:pixelated;filter:drop-shadow(0 3px 2px rgba(0,0,0,.35));z-index:3;`);
    a.screen(bat, cx, cy);
    bat.animate([{ backgroundPosition: `0px ${-v * ch}px` }, { backgroundPosition: `${-cw}px ${-v * ch}px` }], { duration: 230, iterations: Infinity, easing: 'steps(1,end)' });
    const b = a.bounds(); const tx = a.R(b.minX, b.maxX);
    const feet = a.mode === 'walk' ? a.floorY : a.R(b.minY, b.maxY);
    const yEnd = feet - a.H * 0.45; const arc = a.R(a.vh * 0.18, a.vh * 0.38);
    const kf = []; const N = 28;
    for (let i = 0; i <= N; i++) {
      const t = i / N; const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      kf.push({ transform: `translate(${(tx - cx) * e + Math.sin(t * 14) * 16}px,${(yEnd - cy) * e - Math.sin(Math.PI * t) * arc + Math.sin(t * 30) * 7}px)`, offset: t });
    }
    await a.anim(bat, kf, { duration: a.R(3200, 4200), easing: 'linear', fill: 'forwards' });
    puff(a, tx, yEnd, ['#2a1f40', '#4b3a6e', '#8f7ab5'], 10, 40, 16);
    bat.remove(); a.teleport(tx, feet); a.face(tx > cx ? 1 : -1);
    a.fade(1, 60); a.frame(f.pose, 1); a.say('¡Sorpresa! Soy yo otra vez.', 2000);
    await a.wait(1800);
  },

  /* ─────────── Rick: abre un portal, se va y reaparece ─────────── */
  async portal(a) {
    const { f } = a; const d0 = a.dir;
    const mk = () => {
      const w = css('width:34px;height:66px;margin:-33px 0 0 -17px;z-index:2;');
      w.innerHTML = `<div style="position:absolute;inset:-6px;border-radius:50%;background:radial-gradient(closest-side,rgba(120,255,90,.55),rgba(120,255,90,0) 100%);filter:blur(5px)"></div>
        <div style="position:absolute;inset:0;border-radius:50%;background:radial-gradient(ellipse at center,#eaffd8 0%,#9cff52 28%,#2ed83a 55%,#127a22 78%,#0c4d17 100%);box-shadow:0 0 12px 2px #6dff45,inset 0 0 8px #0b5a18;overflow:hidden"><div class="pt-sw" style="position:absolute;inset:-30%;background:conic-gradient(from 0deg,rgba(255,255,255,.55),transparent 18%,rgba(255,255,255,.4) 34%,transparent 52%,rgba(255,255,255,.55) 70%,transparent 88%);mix-blend-mode:screen"></div></div>`;
      return w;
    };
    const spin = (w) => w.querySelector('.pt-sw')?.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 900, iterations: Infinity, easing: 'linear' });
    const open = async (w, x, y) => { a.screen(w, x, y); spin(w); await a.anim(w, [{ transform: 'scale(0,.1)', opacity: 0.6 }, { transform: 'scale(1.1,1)', opacity: 1, offset: 0.6 }, { transform: 'scale(1,1)', opacity: 1 }], { duration: 420, easing: 'ease-out', fill: 'forwards' }); };
    const close = (w) => a.anim(w, [{ transform: 'scale(1,1)', opacity: 1 }, { transform: 'scale(0,.1)', opacity: 0 }], { duration: 380, easing: 'ease-in', fill: 'forwards' });

    a.say('Wubba lubba dub dub.', 1400);
    a.frame(f.gun, 1);
    await a.wait(500);
    const px = a.x + d0 * (a.W * 0.62 + 24); const py = a.y - a.H * 0.4;
    const p1 = mk(); await open(p1, px, py);
    await a.wait(300);
    a.frame([0, 1], 7); await a.moveTo(px - d0 * 12, 70);
    a.frame(f.enter, 1); a.fade(0, 360);
    await a.wait(420);
    await close(p1); p1.remove();
    await a.wait(900);
    // reaparece en otro lado
    const b = a.bounds(); const tx = a.R(b.minX, b.maxX);
    const feet = a.mode === 'walk' ? a.floorY : a.R(b.minY, b.maxY);
    a.teleport(tx, feet);
    const dr = tx < a.vw / 2 ? 1 : -1; a.face(-dr);
    const p2 = mk(); await open(p2, tx, feet - a.H * 0.4);
    a.frame(f.aura, 1); a.fade(1, 260);
    sparks(a, tx, feet - a.H * 0.4, (i) => SPARK(i % 2 ? '#9cff52' : '#e6ffd0', 10), 8, 46, 650);
    await a.wait(700);
    a.say('Wubba lubba… ¡*burp*! ¿Me extrañaste?', 2200);
    await close(p2); p2.remove();
    a.frame(f.shock, 1); await a.wait(500);
  },

  /* ─────────── Brujita: cae un rayo ─────────── */
  async lightning(a) {
    const { f } = a;
    a.frame(f.raise, 1); a.say('¡Por el poder del trueno!', 1700);
    const dim = veil(a, 'rgba(8,10,40,.55)', 1, 700, 1900, 1);
    await a.wait(900);
    const tx = a.x + a.dir * 56; const ty = a.y - 2;
    const pts = [[tx + a.R(-14, 14), 0]]; const steps = 7;
    for (let i = 1; i < steps; i++) pts.push([tx + a.R(-26, 26) * (1 - i / steps) + 0, (ty * i) / steps]);
    pts.push([tx, ty]);
    const path = pts.map((p) => p.join(',')).join(' ');
    const w = 90;
    const bolt = css('left:0;top:0;width:100%;height:100%;z-index:4;');
    bolt.innerHTML = `<svg width="100%" height="100%" style="position:absolute;inset:0;overflow:visible;filter:drop-shadow(0 0 8px #aee)"><polyline points="${path}" fill="none" stroke="#cfe9ff" stroke-width="7" stroke-linejoin="round" opacity=".5"/><polyline points="${path}" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;
    a.layer(bolt);
    veil(a, '#fff', 0.85, 60, 360, 5);
    a.anim(bolt, [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0 }], { duration: 420, easing: 'steps(4,end)' });
    sparks(a, tx, ty - 4, (i) => SPARK(i % 2 ? '#fff6a8' : '#bfe3ff', 10), 12, 54, 600);
    puff(a, tx, ty, ['#7a7a8a', '#b5b5c5'], 7, 30, 12);
    a.shakeSprite(500);
    a.say('¡Zas!', 1100);
    await a.wait(1500);
    await dim;
    a.frame(a.F.jump, 1); a.say('Uy… salió más fuerte de lo que pensé.', 2200);
    await a.wait(1400);
  },

  /* ─────────── Tripulante: saca un cuchillo ─────────── */
  async knife(a) {
    const { f } = a;
    a.frame(f.pose, 1); a.say('Sospechoso…', 1500);
    await a.wait(1100);
    const d = a.dir; const kx = a.x + d * (a.W * 0.32); const ky = a.y - a.H * 0.45;
    const K = css('width:34px;height:34px;margin:-17px 0 0 -4px;transform-origin:4px 17px;z-index:3;');
    K.innerHTML = svg(34, 34, `<g shape-rendering="crispEdges"><rect x="2" y="15" width="7" height="4" fill="#6b3b1f"/><rect x="9" y="13" width="3" height="8" fill="#9aa3ad"/><path d="M12 14 H31 L33 17 L31 20 H12Z" fill="#dfe6ee"/><path d="M12 14 H31 L33 17 H12Z" fill="#fff"/><rect x="12" y="19" width="19" height="1" fill="#8d97a3"/></g>`, d < 0 ? 'transform:scaleX(-1);transform-origin:17px 17px' : '');
    a.screen(K, kx, ky);
    await a.anim(K, [{ transform: 'rotate(-80deg) scale(.3)', opacity: 0 }, { transform: 'rotate(-30deg) scale(1)', opacity: 1 }], { duration: 300, easing: 'ease-out', fill: 'forwards' });
    a.say('¡Impostor!', 1300);
    a.frame(f.stab, 1);
    veil(a, 'radial-gradient(closest-side,transparent 55%,rgba(200,20,20,.55))', 0.8, 100, 700, 1);
    const tx = Math.max(a.bounds().minX, Math.min(a.bounds().maxX, a.x + d * 70));
    const run = a.moveTo(tx, 330);
    a.anim(K, [{ transform: 'rotate(-30deg)' }, { transform: `rotate(${d < 0 ? -80 : 70}deg)` }, { transform: 'rotate(-30deg)' }], { duration: 420, easing: 'ease-in-out' });
    await run;
    const slash = css(`width:46px;height:46px;margin:-23px;z-index:3;`);
    slash.innerHTML = svg(46, 46, `<path d="M6 36 Q22 6 42 8" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M10 38 Q26 12 44 12" stroke="#ff4b4b" stroke-width="2" fill="none"/>`, d < 0 ? 'transform:scaleX(-1)' : '');
    a.screen(slash, a.x + d * 26, a.y - a.H * 0.5);
    a.anim(slash, [{ opacity: 1, transform: 'scale(.6)' }, { opacity: 0, transform: 'scale(1.3)' }], { duration: 380, easing: 'ease-out' });
    await a.wait(800);
    await a.anim(K, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' });
    a.frame(f.pose, 1); a.say('Todo en orden. Creo.', 1700);
    await a.wait(1500);
  },

  /* ─────────── Dex: «Tonight's the night» ─────────── */
  async slash(a) {
    const { f } = a;
    const dim = veil(a, 'radial-gradient(closest-side,rgba(0,0,0,0) 40%,rgba(90,0,10,.7))', 1, 500, 2400, 1);
    a.frame(f.crouch, 1); a.say('Tonight\u2019s the night.', 2400);
    await a.wait(1400);
    a.frame(f.knife, 1);
    const d = a.dir; const x = a.x + d * 30; const y = a.y - a.H * 0.5;
    const arc = css('width:70px;height:70px;margin:-35px;z-index:3;');
    arc.innerHTML = svg(70, 70, `<path d="M8 58 Q30 8 64 10" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M12 60 Q34 16 66 16" stroke="#d11a2a" stroke-width="3" fill="none" stroke-linecap="round"/>`, d < 0 ? 'transform:scaleX(-1)' : '');
    a.screen(arc, x, y);
    a.anim(arc, [{ opacity: 0, transform: 'scale(.5) rotate(-20deg)' }, { opacity: 1, transform: 'scale(1) rotate(0)', offset: 0.35 }, { opacity: 0, transform: 'scale(1.25) rotate(8deg)' }], { duration: 520, easing: 'ease-out' });
    veil(a, 'rgba(255,255,255,.9)', 0.5, 40, 200, 4);
    a.shakeSprite(300);
    await a.wait(900);
    a.frame(f.rage, 1); a.say('No blood, no foul.', 1800);
    await a.wait(1300);
    await dim;
    a.frame(f.shock, 1); a.say('…Era broma. Más o menos.', 1700);
    await a.wait(1200);
  },

  /* ─────────── Asesino del hielo: congela todo ─────────── */
  async freeze(a) {
    const { f } = a;
    a.frame(f.hand, 1); a.say('Hola, hermano.', 1600);
    await a.wait(1200);
    a.frame(f.ice, 1);
    const cx = a.x; const cy = a.y - a.H * 0.5;
    const frost = veil(a, 'radial-gradient(closest-side,rgba(180,230,255,0) 42%,rgba(150,215,255,.62) 100%)', 1, 600, 2800, 1);
    sparks(a, cx, cy, (i) => svg(14, 14, `<path d="M7 0 L11 7 L7 14 L3 7Z" fill="${i % 2 ? '#d6f3ff' : '#8fd3ff'}" stroke="#fff" stroke-width=".8"/>`), 14, 70, 1100);
    sparks(a, cx, cy, () => FLAKE('#e8f8ff', 11), 8, 56, 1300);
    // cristales que se quedan un rato en el suelo
    for (let i = 0; i < 6; i++) {
      const gx = cx + a.R(-70, 70); const gh = a.R(12, 26);
      const c = css(`width:10px;height:${gh}px;margin:${-gh}px 0 0 -5px;background:linear-gradient(135deg,#f2fbff,#8fd3ff 60%,#4ba6e8);clip-path:polygon(50% 0,100% 100%,0 100%);opacity:.95;filter:drop-shadow(0 0 4px #9fdcff)`);
      a.screen(c, gx, a.y + 2);
      a.anim(c, [{ transform: 'scaleY(0)', transformOrigin: '50% 100%' }, { transform: 'scaleY(1)', transformOrigin: '50% 100%', offset: 0.25 }, { transform: 'scaleY(1)', transformOrigin: '50% 100%', opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 2800, easing: 'ease-out' });
    }
    a.shakeSprite(300);
    await a.wait(1400);
    a.say('Qué fresquito, ¿no?', 1800);
    await a.wait(1600);
    await frost;
    a.frame(f.crouch, 1); await a.wait(600);
  },

  /* ─────────── Morty: pánico ─────────── */
  async panic(a) {
    const { f } = a;
    a.frame(f.sweat, 1); a.say('¡Aw, caray, Rick!', 1500);
    await a.wait(900);
    a.frame(f.shake, 1); a.shakeSprite(900);
    a.say('¡Algo viene! ¡Algo viene!', 1700);
    await a.wait(1100);
    const b = a.bounds(); const tx = a.x < (b.minX + b.maxX) / 2 ? b.maxX : b.minX;
    a.frame(f.run, 12);
    const timer = setInterval(() => { if (a.alive()) puff(a, a.x - a.dir * 14, a.y - 5, ['rgba(255,255,255,.65)'], 2, 14, 8); }, 110);
    try { await a.moveTo(tx, 440); } finally { clearInterval(timer); }
    a.frame(f.cry, 1); a.say('Quiero irme a casa…', 1900);
    await a.wait(1700);
    a.frame(f.laugh, 1); a.say('…Ay, era el viento. Jeje.', 1800);
    await a.wait(1500);
  },

  /* ─────────── Dragón de hielo: aliento helado ─────────── */
  async icebreath(a) {
    const { f } = a; const d = a.dir;
    a.frame(f.breath, 1); a.say('Frrrrr…', 1200);
    await a.wait(500);
    const mx = a.x + d * (a.W * 0.42); const my = a.y - a.H * 0.52;
    const t0 = performance.now();
    while (performance.now() - t0 < 1700) {
      for (let i = 0; i < 3; i++) {
        const sz = a.R(6, 14); const e = dot(sz, i % 2 ? 'radial-gradient(circle,#fff,#a8e2ff 60%,rgba(120,200,255,0))' : 'radial-gradient(circle,#e8f8ff,#58b8ff 70%,rgba(80,170,255,0))', 'border-radius:50%;');
        a.screen(e, mx, my);
        const L = a.R(60, 150); const sp = a.R(-26, 26);
        a.anim(e, [{ transform: 'translate(0,0) scale(.5)', opacity: 1 }, { transform: `translate(${d * L}px,${sp + 14}px) scale(2)`, opacity: 0 }], { duration: a.R(500, 900), easing: 'ease-out' });
      }
      if (Math.random() < 0.5) {
        const e = css('left:0;top:0;'); e.innerHTML = FLAKE('#eaf9ff', 10); a.screen(e, mx, my);
        a.anim(e, [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${d * a.R(60, 140)}px,${a.R(10, 40)}px) rotate(180deg)`, opacity: 0 }], { duration: 900, easing: 'ease-out' });
      }
      await a.wait(70);
    }
    const ix = a.x + d * 96; const sheet = css(`width:70px;height:10px;margin:-5px 0 0 -35px;border-radius:50%;background:radial-gradient(ellipse,#eaf9ff,#9bd8ff 60%,rgba(150,215,255,0));`);
    a.screen(sheet, ix, a.y + 1);
    a.anim(sheet, [{ opacity: 0, transform: 'scaleX(.2)' }, { opacity: 1, transform: 'scaleX(1)', offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: 2600 });
    a.say('¡Hielito listo!', 1600);
    await a.wait(1400);
    a.frame(f.lie, 1); await a.wait(1100);
  },

  /* ─────────── Dragón de nieve: ventisca ─────────── */
  async blizzard(a) {
    const { f } = a;
    a.frame(f.snow, 1); a.say('¡Viene la ventisca!', 1500);
    const v = veil(a, 'linear-gradient(to bottom,rgba(200,225,255,.28),rgba(200,225,255,0) 70%)', 1, 700, 3600, 1);
    const t0 = performance.now();
    while (performance.now() - t0 < 3600) {
      for (let i = 0; i < 4; i++) {
        const x = a.R(a.x - 150, a.x + 150); const e = css('left:0;top:0;'); const s = a.R(5, 11);
        e.innerHTML = Math.random() < 0.5 ? FLAKE('#fff', s) : `<div style="width:${s * 0.5}px;height:${s * 0.5}px;border-radius:50%;background:#fff;box-shadow:0 0 4px #cfe6ff"></div>`;
        a.screen(e, x, a.y - a.H - a.R(60, 140));
        const fall = a.H + a.R(120, 200);
        a.anim(e, [{ transform: 'translate(0,0) rotate(0)', opacity: 0 }, { opacity: 1, offset: 0.12 }, { transform: `translate(${a.R(-50, 50)}px,${fall}px) rotate(${a.R(-200, 200)}deg)`, opacity: 0.9 }], { duration: a.R(1500, 2400), easing: 'linear' });
      }
      await a.wait(110);
    }
    a.frame(f.cheer, 1); a.say('¡Qué nevada tan bonita!', 1800);
    await a.wait(1500);
    a.frame(f.wave, 1); await a.wait(900); await v;
  },

  /* ─────────── Loky: ilusiones y teletransporte ─────────── */
  async illusion(a) {
    const { f } = a;
    a.frame(f.magic, 1); a.say('Ilusiones, solo ilusiones…', 1700);
    await a.wait(1100);
    const clones = [];
    const hue = 'hue-rotate(40deg) saturate(1.7) brightness(1.2) drop-shadow(0 0 6px #5dff7a)';
    for (let i = 0; i < 3; i++) {
      const c = a.cloneSprite(); c.style.cssText += `;position:absolute;left:0;top:0;width:${a.W}px;height:${a.H}px;opacity:0;filter:${hue};z-index:${i ? 0 : 1};`;
      a.local(c, 0, 0, true); clones.push(c);
      const off = (i - 1) * a.R(44, 70) || a.R(40, 60);
      a.anim(c, [{ opacity: 0, transform: 'translateX(0)' }, { opacity: 0.55, transform: `translateX(${off}px)` }], { duration: 650, easing: 'ease-out', fill: 'forwards' });
    }
    sparks(a, a.x, a.y - a.H * 0.5, (i) => SPARK(i % 2 ? '#7dff9a' : '#d5ffe0', 10), 10, 50, 800);
    await a.wait(1300);
    const cx = a.x; const cy = a.y - a.H * 0.5;
    puff(a, cx, cy, ['#3fe06a', '#9affb4', '#1fa84a'], 12, 44, 14);
    a.fade(0, 140); clones.forEach((c) => c.animate([{ opacity: 0.55 }, { opacity: 0 }], { duration: 300, fill: 'forwards' }));
    await a.wait(900);
    const b = a.bounds(); const tx = a.R(b.minX, b.maxX);
    const feet = a.mode === 'walk' ? a.floorY : a.R(b.minY, b.maxY);
    // los falsos Loki aparecen en otros sitios mientras el real está oculto
    for (let i = 0; i < 2; i++) {
      const gx = a.R(b.minX, b.maxX); const g = a.cloneSprite();
      g.style.cssText += `;position:absolute;left:0;top:0;width:${a.W}px;height:${a.H}px;filter:${hue};opacity:0;`;
      const holder = css(`left:${gx - a.W / 2}px;top:${feet - a.H}px;width:${a.W}px;height:${a.H}px;z-index:1;`);
      holder.appendChild(g); a.layer(holder);
      a.anim(g, [{ opacity: 0 }, { opacity: 0.6, offset: 0.2 }, { opacity: 0.6, offset: 0.7 }, { opacity: 0 }], { duration: 1500 });
      puff(a, gx, feet - a.H * 0.5, ['#3fe06a', '#9affb4'], 6, 30, 11);
    }
    await a.wait(700);
    a.teleport(tx, feet); a.face(tx < a.vw / 2 ? 1 : -1);
    puff(a, tx, feet - a.H * 0.5, ['#3fe06a', '#9affb4', '#1fa84a'], 12, 44, 14);
    a.fade(1, 100); a.frame(f.think, 1); a.say('¿Cuál era el verdadero? Nunca lo sabrás.', 2400);
    await a.wait(2000);
  },

  /* ─────────── Capi: spa con yuzu ─────────── */
  async spa(a) {
    const { f } = a;
    a.frame(f.calm, 1); a.say('Hora del spa…', 1500);
    const tx = a.x; const hy = a.y - a.H * 0.8;
    const yuzu = css('width:16px;height:16px;margin:-16px 0 0 -8px;z-index:2;');
    yuzu.innerHTML = svg(16, 16, `<circle cx="8" cy="9" r="7" fill="#ffb21a" stroke="#c97700" stroke-width="1"/><path d="M8 2 Q12 0 14 3 Q10 4 8 2Z" fill="#3fa34d"/><circle cx="6" cy="7" r="1.6" fill="#ffe29a"/>`);
    a.screen(yuzu, tx, hy - 90);
    await a.anim(yuzu, [{ transform: 'translateY(0)' }, { transform: 'translateY(90px)', offset: 0.7 }, { transform: 'translateY(84px)', offset: 0.82 }, { transform: 'translateY(90px)' }], { duration: 800, easing: 'ease-in', fill: 'forwards' });
    a.say('Ahhh… qué relax.', 2400);
    yuzu.animate([{ transform: 'translateY(90px)' }, { transform: 'translateY(86px)' }, { transform: 'translateY(90px)' }], { duration: 2200, iterations: Infinity, easing: 'ease-in-out' });
    const t0 = performance.now();
    while (performance.now() - t0 < 4200) {
      const e = dot(a.R(10, 18), 'radial-gradient(circle,rgba(255,255,255,.85),rgba(255,255,255,0) 70%)', 'border-radius:50%;');
      a.screen(e, tx + a.R(-24, 24), hy + 10);
      a.anim(e, [{ transform: 'translate(0,0) scale(.6)', opacity: 0 }, { opacity: 0.9, offset: 0.25 }, { transform: `translate(${a.R(-14, 14)}px,-48px) scale(1.7)`, opacity: 0 }], { duration: 1900, easing: 'ease-out' });
      await a.wait(260);
    }
    a.say('Ya, ya… a seguir.', 1400);
    yuzu.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' });
    await a.wait(1200);
  },

  /* ─────────── Diva: concierto ─────────── */
  async sing(a) {
    const { f } = a;
    a.frame(f.sing, 1); a.say('¡Hoy hay concierto!', 1500);
    const cone = css(`left:${a.x - 70}px;top:0;width:140px;height:${a.y}px;background:linear-gradient(to bottom,rgba(255,244,190,.55),rgba(255,244,190,.12));clip-path:polygon(35% 0,65% 0,100% 100%,0 100%);z-index:-1;opacity:0;`);
    a.layer(cone);
    const lights = a.anim(cone, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.9 }, { opacity: 0 }], { duration: 5200 });
    const cols = ['#ff6fa8', '#6fc8ff', '#ffd45e', '#9d7bff', '#6fe3a2'];
    const t0 = performance.now();
    while (performance.now() - t0 < 4600) {
      const e = css('left:0;top:0;'); e.innerHTML = NOTE(cols[Math.floor(Math.random() * cols.length)]);
      a.screen(e, a.x + a.R(-26, 26), a.y - a.H * 0.7);
      a.anim(e, [{ transform: 'translate(0,0) rotate(0) scale(.7)', opacity: 0 }, { opacity: 1, offset: 0.15 }, { transform: `translate(${a.R(-70, 70)}px,${-a.R(70, 130)}px) rotate(${a.R(-30, 30)}deg) scale(1.1)`, opacity: 0 }], { duration: a.R(1400, 2000), easing: 'ease-out' });
      if (Math.random() < 0.3) sparks(a, a.x + a.R(-40, 40), a.y - a.H * 0.8, SPARK('#fff2a8', 9), 1, 20, 700);
      await a.wait(200);
    }
    a.say('¡Gracias, gracias! Sin aplausos, por favor.', 2200);
    a.frame(a.F.wave, 1);
    await lights;
  },

  /* ─────────── Dino: cactus ─────────── */
  async cactus(a) {
    const { f } = a;
    const d = a.dir; a.say('¡Cactus a la vista!', 1400);
    const sx = Math.max(a.bounds().minX - 30, Math.min(a.vw + 20, a.x + d * 200));
    const makeCactus = (h) => { const c = css(`width:20px;height:${h}px;margin:${-h}px 0 0 -10px;z-index:2;`); c.innerHTML = svg(20, h, `<g fill="#3d7a3a" stroke="#265224" stroke-width="1"><rect x="7" y="0" width="7" height="${h}" rx="3"/><rect x="0" y="${h * 0.35}" width="5" height="${h * 0.3}" rx="2"/><rect x="0" y="${h * 0.55}" width="9" height="4" rx="2"/><rect x="15" y="${h * 0.2}" width="5" height="${h * 0.3}" rx="2"/><rect x="12" y="${h * 0.45}" width="8" height="4" rx="2"/></g>`); return c; };
    for (let k = 0; k < 2; k++) {
      const h = k ? 34 : 26; const c = makeCactus(h);
      a.screen(c, sx - d * k * 6, a.y + 1); const gap = 130;
      const dist = (sx - a.x) * d - 0; const travel = dist + 130;
      const anim = a.anim(c, [{ transform: 'translateX(0)' }, { transform: `translateX(${-d * travel}px)` }], { duration: 2400, easing: 'linear', fill: 'forwards' });
      // salta justo antes de que llegue
      const tHop = (2400 * (dist - 46)) / travel;
      await a.wait(Math.max(0, tHop - (k ? 0 : 0)));
      a.frame(f.hop, 1); await a.hop(a.H * 0.7, 640); a.frame(a.F.idle, 2);
      await anim; c.remove();
      if (!k) { a.say('¡Sigue otro!', 1100); await a.wait(200); const s2 = sx; void s2; }
    }
    a.say('¡Salté los dos!', 1800); a.frame(f.hop, 1); await a.hop(a.H * 0.5, 450);
    await a.wait(900);
  },

  /* ─────────── Pingüi: se desliza en la panza ─────────── */
  async slide(a) {
    const { f } = a;
    a.say('¡Wiiiii!', 1600); a.frame(f.belly, 1);
    const b = a.bounds(); const tx = a.x < (b.minX + b.maxX) / 2 ? b.maxX : b.minX;
    const timer = setInterval(() => { if (a.alive()) puff(a, a.x - a.dir * 20, a.y - 4, ['rgba(255,255,255,.9)', 'rgba(205,230,255,.9)'], 3, 16, 9); }, 60);
    try { await a.moveTo(tx, 470); } finally { clearInterval(timer); }
    puff(a, a.x, a.y - 6, ['#fff', '#cfe6ff'], 10, 30, 12);
    await a.wait(700);
    a.frame(a.F.wave, 1); a.say('Otra vez, otra vez.', 1700);
    await a.wait(1300);
  },

  /* ─────────── Capitán: sirena ─────────── */
  async siren(a) {
    const { f } = a;
    a.frame(f.point, 1); a.say('¡Alto ahí! Esto es un control.', 2200);
    const x = a.x; const y = a.y - a.H * 0.9;
    const L = css(`left:${x}px;top:${y}px;width:0;height:0;`);
    L.innerHTML = `<div style="position:absolute;left:-90px;top:-90px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(255,40,40,.7),rgba(255,40,40,0) 68%);animation:sirenA .5s steps(1,end) infinite"></div><div style="position:absolute;left:-90px;top:-90px;width:180px;height:180px;border-radius:50%;background:radial-gradient(circle,rgba(50,110,255,.7),rgba(50,110,255,0) 68%);animation:sirenB .5s steps(1,end) infinite"></div>`;
    a.layer(L);
    a.anim(L, [{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.92 }, { opacity: 0 }], { duration: 3600 });
    veil(a, 'radial-gradient(closest-side,transparent 60%,rgba(40,70,200,.25))', 1, 400, 3000, 1);
    await a.wait(2400);
    a.frame(a.F.wave, 1); a.say('Todo en orden. Circule.', 1700);
    await a.wait(1600);
  },

  /* ─────────── Deportivo: derrape ─────────── */
  async drift(a) {
    const { f } = a;
    a.say('¡Brrrm brrrm!', 1500); a.frame(a.F.music, 1);
    for (let i = 0; i < 4; i++) { puff(a, a.x - a.dir * 40, a.y - 8, ['#555', '#888'], 3, 18, 10); a.shakeSprite(120); await a.wait(210); }
    a.frame(f.boom, 8);
    const b = a.bounds(); const tx = a.x < (b.minX + b.maxX) / 2 ? b.maxX : b.minX;
    const timer = setInterval(() => { if (a.alive()) { puff(a, a.x - a.dir * 52, a.y - 6, ['rgba(220,220,220,.8)', 'rgba(150,150,150,.8)'], 3, 20, 12); const l = css('width:26px;height:2px;background:rgba(255,255,255,.7);'); a.screen(l, a.x - a.dir * 60, a.y - a.R(10, 36)); a.anim(l, [{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${-a.dir * 40}px)` }], { duration: 300 }); } }, 55);
    try { await a.moveTo(tx, 620); } finally { clearInterval(timer); }
    puff(a, a.x, a.y - 8, ['#ddd', '#999', '#bbb'], 14, 54, 18);
    a.frame(a.F.idle, 1); a.say('Derrape perfecto.', 1700);
    await a.wait(1400);
  },

  /* ─────────── Roquita: temblor ─────────── */
  async quake(a) {
    const { f } = a;
    a.frame(f.shake, 1); a.say('¡Hora del temblor!', 1500);
    a.shakeSprite(2200, 3);
    const t0 = performance.now();
    while (performance.now() - t0 < 2200) {
      puff(a, a.x + a.R(-30, 30), a.y - 2, ['#9b8f80', '#c4b8a6'], 2, 18, 9);
      if (Math.random() < 0.5) {
        const p = dot(a.R(5, 9), '#8c8c96', 'border-radius:30%;border:1px solid #5a5a64;'); a.screen(p, a.x + a.R(-24, 24), a.y - a.H * 0.5);
        const dx = a.R(-60, 60);
        a.anim(p, [{ transform: 'translate(0,0)' }, { transform: `translate(${dx * 0.5}px,-30px)`, offset: 0.35 }, { transform: `translate(${dx}px,0)`, offset: 0.7 }, { transform: `translate(${dx * 1.2}px,-8px)`, offset: 0.85 }, { transform: `translate(${dx * 1.3}px,0)`, opacity: 1 }], { duration: 1100, easing: 'ease-in', fill: 'forwards' });
        setTimeout(() => p.remove(), 1200);
      }
      await a.wait(140);
    }
    puff(a, a.x, a.y - 4, ['#9b8f80', '#c4b8a6', '#7c7064'], 12, 50, 16);
    a.frame(a.F.idle, 1); a.say('…Sigo siendo una roca.', 1700);
    await a.wait(1400);
  },

  /* ─────────── Gato: ovillo de lana ─────────── */
  async yarn(a) {
    const { f } = a; const d = a.dir;
    a.say('¿Eso es… lana?', 1300);
    const b = a.bounds();
    const sx = d > 0 ? b.maxX : b.minX; const ex = d > 0 ? b.minX : b.maxX;
    const ball = css('width:20px;height:20px;margin:-20px 0 0 -10px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#ff8a8a,#d63a4a 60%,#9c1f33);box-shadow:inset 0 0 0 1px rgba(0,0,0,.2);z-index:2;');
    ball.innerHTML = `<div style="position:absolute;inset:0;border-radius:50%;background:repeating-linear-gradient(40deg,transparent 0 3px,rgba(255,255,255,.25) 3px 4px)"></div>`;
    a.screen(ball, sx, a.y + 1);
    const total = Math.abs(ex - sx);
    const roll = a.anim(ball, [{ transform: 'translateX(0) rotate(0)' }, { transform: `translateX(${ex - sx}px) rotate(${(ex - sx) * 2}deg)` }], { duration: Math.max(2200, total * 4.2), easing: 'ease-out', fill: 'forwards' });
    a.face(Math.sign(ex - sx) * -1 || 1); a.frame(a.F.idle, 2);
    await a.wait(Math.max(900, total * 1.5));
    a.frame(f.swat, 1); a.say('¡Mío!', 1000);
    await a.wait(500);
    a.frame(f.pounce, 8);
    await a.moveTo(ex < a.x ? Math.max(b.minX, ex + 30) : Math.min(b.maxX, ex - 30), 260);
    await roll;
    a.frame(f.pounce, 1); await a.hop(a.H * 0.45, 420);
    ball.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    a.frame(a.F.love, 2); a.say('Prrrr… lo atrapé.', 1900);
    sparks(a, a.x, a.y - a.H * 0.7, (i) => HEART(i % 2 ? '#ff6b8a' : '#ff9ab0', 11), 5, 34, 900);
    await a.wait(1700);
  },

  /* ─────────── Perro: hueso ─────────── */
  async bone(a) {
    const { f } = a; const d = a.dir;
    const bx = Math.max(a.bounds().minX, Math.min(a.bounds().maxX, a.x + d * a.R(110, 190)));
    const bone = css('width:26px;height:12px;margin:-12px 0 0 -13px;z-index:2;');
    bone.innerHTML = svg(26, 12, `<g fill="#f6f1e4" stroke="#bfb393" stroke-width="1"><rect x="5" y="4" width="16" height="4"/><circle cx="4" cy="3.5" r="3"/><circle cx="4" cy="8.5" r="3"/><circle cx="22" cy="3.5" r="3"/><circle cx="22" cy="8.5" r="3"/></g>`);
    a.screen(bone, bx, 0);
    a.say('¿Eso cayó del cielo?', 1400);
    await a.anim(bone, [{ transform: `translateY(0) rotate(0)` }, { transform: `translateY(${a.y + 1}px) rotate(540deg)`, offset: 0.7 }, { transform: `translateY(${a.y - 26}px) rotate(600deg)`, offset: 0.82 }, { transform: `translateY(${a.y + 1}px) rotate(680deg)` }], { duration: 1300, easing: 'ease-in', fill: 'forwards' });
    puff(a, bx, a.y, ['#c9b78a', '#e3d6b0'], 5, 20, 8);
    a.frame(f.jump, 8); await a.moveTo(bx - Math.sign(bx - a.x) * 18, 240);
    a.frame(f.jump, 1); await a.hop(a.H * 0.5, 480);
    bone.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
    a.frame(a.F.love, 2); a.say('¡Mi hueso! ¡Mi hueso!', 1900);
    sparks(a, a.x, a.y - a.H * 0.7, (i) => HEART(i % 2 ? '#ff6b8a' : '#ff9ab0', 11), 6, 38, 900);
    await a.wait(1700);
  },

  /* ─────────── Caballo: galope arcoíris ─────────── */
  async rainbow(a) {
    const { f } = a;
    a.say('¡A galopar!', 1300); a.frame(a.F.wave, 1); await a.wait(600);
    const b = a.bounds(); const tx = a.x < (b.minX + b.maxX) / 2 ? b.maxX : b.minX;
    a.frame(f.gallop, 8);
    const cols = ['#ff4d4d', '#ff9f43', '#ffe14d', '#4cd964', '#4da3ff', '#a06bff'];
    const timer = setInterval(() => {
      if (!a.alive()) return;
      cols.forEach((c, i) => { const e = css(`width:14px;height:4px;background:${c};border-radius:2px;`); a.screen(e, a.x - a.dir * 38, a.y - a.H * 0.2 - i * 4); a.anim(e, [{ opacity: 1, transform: 'scaleX(1)' }, { opacity: 0, transform: 'scaleX(1.6)' }], { duration: 650, easing: 'ease-out' }); });
      if (Math.random() < 0.4) sparks(a, a.x - a.dir * 30, a.y - a.H * 0.3, SPARK('#fff7b0', 9), 1, 26, 600);
    }, 45);
    try { await a.moveTo(tx, 420); } finally { clearInterval(timer); }
    a.frame(a.F.wave, 1); a.say('¡Iiiihhh! ¡Brillé!', 1700);
    sparks(a, a.x, a.y - a.H * 0.6, (i) => SPARK(cols[i % cols.length], 10), 8, 46, 800);
    await a.wait(1500);
  },

  /* ─────────── Dragón: llamarada ─────────── */
  async fire(a) {
    const { f } = a; const d = a.dir;
    a.frame(f.breath, 1); a.say('¡Llamarada!', 1300);
    await a.wait(450);
    const mx = a.x + d * (a.W * 0.4); const my = a.y - a.H * 0.45;
    const t0 = performance.now();
    while (performance.now() - t0 < 1500) {
      for (let i = 0; i < 3; i++) {
        const sz = a.R(7, 15); const hot = i % 3 === 0;
        const e = dot(sz, hot ? 'radial-gradient(circle,#fff6b0,#ffb020 60%,rgba(255,120,0,0))' : 'radial-gradient(circle,#ffd060,#ff6a1a 65%,rgba(220,40,0,0))', 'border-radius:50%;mix-blend-mode:screen;');
        a.screen(e, mx, my);
        a.anim(e, [{ transform: 'translate(0,0) scale(.5)', opacity: 1 }, { transform: `translate(${d * a.R(70, 170)}px,${a.R(-22, 18)}px) scale(2.2)`, opacity: 0 }], { duration: a.R(450, 800), easing: 'ease-out' });
      }
      await a.wait(60);
    }
    puff(a, mx + d * 90, my, ['rgba(90,90,90,.7)', 'rgba(150,150,150,.6)'], 6, 30, 14);
    a.say('Cuidado, que quemo.', 1700);
    await a.wait(1300);
  },

  /* ─────────── Verdecito (creeper): ¡boom! ─────────── */
  async boom(a) {
    const { f } = a;
    a.frame(f.hiss, 1); a.say('Ssssssss…', 1800);
    const sp = a.spriteEl();
    sp.animate([{ filter: 'brightness(1)', transform: 'scale(1)' }, { filter: 'brightness(2.6)', transform: 'scale(1.1)' }, { filter: 'brightness(1)', transform: 'scale(1)' }], { duration: 380, iterations: 5, easing: 'steps(1,end)' });
    await a.wait(1900);
    const cx = a.x; const cy = a.y - a.H * 0.45;
    veil(a, '#fff', 0.8, 40, 400, 5);
    a.fade(0, 0);
    const ring = dot(20, 'radial-gradient(circle,rgba(255,255,255,.95),rgba(255,190,80,.8) 45%,rgba(255,90,0,0) 70%)', 'border-radius:50%;'); a.screen(ring, cx, cy);
    a.anim(ring, [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(7)', opacity: 0 }], { duration: 650, easing: 'ease-out' });
    for (let i = 0; i < 18; i++) {
      const pxl = dot(a.R(4, 8), ['#4caf50', '#2e7d32', '#81c784', '#1b5e20'][i % 4]); a.screen(pxl, cx, cy);
      const ang = a.R(0, Math.PI * 2); const dd = a.R(40, 110);
      a.anim(pxl, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: `translate(${Math.cos(ang) * dd}px,${Math.sin(ang) * dd - 20}px)`, opacity: 1, offset: 0.6 }, { transform: `translate(${Math.cos(ang) * dd * 1.1}px,${Math.sin(ang) * dd + 30}px)`, opacity: 0 }], { duration: 900, easing: 'ease-out' });
    }
    puff(a, cx, cy, ['#555', '#888', '#bbb'], 12, 56, 20);
    await a.wait(2200);
    const b = a.bounds(); const tx = a.R(b.minX, b.maxX);
    const feet = a.mode === 'walk' ? a.floorY : a.R(b.minY, b.maxY);
    a.teleport(tx, feet); a.fade(1, 200); a.frame(a.F.idle, 2);
    a.say('Prometo no explotar… otra vez.', 2200);
    await a.wait(1800);
  },

  /* ─────────── Chispa: descarga eléctrica ─────────── */
  async zap(a) {
    const { f } = a;
    a.frame(f.power, 1); a.say('¡Chis chis… chispaaazo!', 1700);
    const cx = a.x; const cy = a.y - a.H * 0.5;
    const t0 = performance.now();
    while (performance.now() - t0 < 2200) {
      const arc = css('left:0;top:0;z-index:3;');
      const n = 3 + Math.floor(Math.random() * 3);
      let html = '';
      for (let k = 0; k < n; k++) {
        const ang = a.R(0, Math.PI * 2); let x = 0; let y = 0; let p = 'M0 0';
        for (let s = 0; s < 5; s++) { x += Math.cos(ang) * 12 + a.R(-6, 6); y += Math.sin(ang) * 12 + a.R(-6, 6); p += ` L${x.toFixed(1)} ${y.toFixed(1)}`; }
        html += `<path d="${p}" stroke="#fff6a0" stroke-width="2.4" fill="none" stroke-linejoin="round"/><path d="${p}" stroke="#ffd400" stroke-width="5" fill="none" opacity=".35"/>`;
      }
      arc.innerHTML = `<svg width="2" height="2" style="overflow:visible;filter:drop-shadow(0 0 5px #ffd400)">${html}</svg>`;
      a.screen(arc, cx, cy);
      a.anim(arc, [{ opacity: 1 }, { opacity: 0 }], { duration: 180 });
      if (Math.random() < 0.25) veil(a, 'rgba(255,230,80,.35)', 1, 30, 120, 1);
      await a.wait(150);
    }
    a.say('¡Carga completa!', 1500); a.frame(a.F.wave, 1);
    await a.wait(1300);
  },

  /* ─────────── Fantasma: atraviesa la pantalla ─────────── */
  async ghost(a) {
    const { f } = a;
    a.frame(f.boo, 1); a.say('¡Buuuu!', 1200);
    await a.wait(700);
    a.fade(0.22, 500);
    const b = a.bounds(); const tx = a.x < (b.minX + b.maxX) / 2 ? b.maxX : b.minX;
    const wob = setInterval(() => { /* ondulación vertical suave */ }, 1000);
    const mv = a.moveTo(tx, 110);
    const t0 = performance.now();
    const trail = setInterval(() => { if (a.alive()) puff(a, a.x, a.y - a.H * 0.5, ['rgba(255,255,255,.35)'], 1, 8, 12); }, 180);
    try { await mv; } finally { clearInterval(trail); clearInterval(wob); }
    void t0;
    await a.wait(600);
    const nx = a.R(b.minX, b.maxX); a.teleport(nx, a.mode === 'walk' ? a.floorY : a.R(b.minY, b.maxY));
    a.fade(1, 120); a.frame(f.boo, 1);
    sparks(a, nx, a.y - a.H * 0.5, (i) => SPARK('#ffffff', 9), 8, 44, 700);
    a.say('¡Te asusté! ¿Verdad?', 1900);
    await a.wait(1600);
  },
};

/* Mascotas propias: una sola imagen de "poder" que sale volando (sin código de poder específico). */
SPECIALS.power = async function power(a) {
  const url = a.def.powerUrl; if (!url) return;
  a.frame(a.F.wave, 1);
  a.say(a.pick(a.def.powerPhrases || ['¡Mi poder!']), 2200);
  await a.wait(700);
  const d = a.dir; const x = a.x + d * 30; const y = a.y - a.H * 0.55;
  const e = css('width:58px;height:58px;margin:-29px;z-index:3;');
  e.innerHTML = `<img src="${url}" alt="" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 0 10px rgba(255,255,255,.8))"/>`;
  a.screen(e, x, y);
  sparks(a, x, y, (i) => SPARK(['#fff6a8', '#bfe3ff', '#ffc2e8'][i % 3], 10), 8, 40, 700);
  await a.anim(e, [{ transform: 'scale(.2) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1.25) rotate(0)', opacity: 1, offset: 0.25 }, { transform: `translate(${d * 150}px,-10px) scale(1) rotate(${d * 25}deg)`, opacity: 1, offset: 0.8 }, { transform: `translate(${d * 190}px,-14px) scale(.6)`, opacity: 0 }], { duration: 1600, easing: 'ease-out' });
  await a.wait(500);
};
SPECIALS.power.__custom = true;

/* ═══════════════ Mascotas nuevas: trucos propios ═══════════════ */
const DROP = '<svg width="9" height="12" viewBox="0 0 9 12" style="display:block"><path d="M4.5 0C9 6 9 12 4.5 12S0 6 4.5 0Z" fill="#6cc7ff"/></svg>';
const STAR = (c, s = 14) => svg(s, s, `<path d="M${s / 2} 0L${s * 0.62} ${s * 0.38}L${s} ${s / 2}L${s * 0.62} ${s * 0.62}L${s / 2} ${s}L${s * 0.38} ${s * 0.62}L0 ${s / 2}L${s * 0.38} ${s * 0.38}Z" fill="${c}" stroke="#222" stroke-width=".8"/>`);
const BUDDY = { w: 120, h: 237 };
const run = (p) => p.then(() => {}, () => {});
/** Lanza un proyectil horizontal desde la mascota. */
const shot = (a, el, dx, dy, ms, y0) => { a.screen(el, a.x + a.dir * a.W * 0.35, y0 ?? a.y - a.H * 0.5); return run(a.anim(el, [{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(${dx > 0 ? 720 : -720}deg)`, opacity: 0.9 }], { duration: ms, easing: 'linear' })); };
/** Lluvia de elementos por toda la pantalla. */
const shower = (a, html, n, ms) => {
  for (let i = 0; i < n; i++) {
    const e = css('left:0;top:0;z-index:3;'); e.innerHTML = typeof html === 'function' ? html(i) : html;
    const x = a.R(10, a.vw - 10); a.screen(e, x, -20);
    run(a.anim(e, [{ transform: 'translate(0,0) rotate(0)', opacity: 0 }, { opacity: 1, offset: 0.12 }, { transform: `translate(${a.R(-40, 40)}px,${a.vh * 0.9}px) rotate(${a.R(-180, 180)}deg)`, opacity: 0.85 }], { duration: ms + a.R(0, 900), delay: a.R(0, 900), easing: 'ease-in', fill: 'both' }));
  }
};
const far = (a) => { const b = a.bounds(); return a.x < (b.minX + b.maxX) / 2 ? b.maxX : b.minX; };

Object.assign(SPECIALS, {
  /* Tralalero Tralalá: canta, salpica y salta */
  async tralala(a) {
    const { f } = a;
    a.frame(f.power, 1); a.say('¡Tralalero Tralalá!', 1900);
    for (let k = 0; k < 3; k++) {
      sparks(a, a.x, a.y - a.H * 0.55, (i) => (i % 3 ? DROP : NOTE('#2b7bd6')), 9, 56, 800);
      a.shakeSprite(300, 2);
      await a.hop(a.H * 0.32, 420); await a.wait(120);
    }
    a.say('Un tiburón con tenis… ¿quién lo diría?', 2000); await a.wait(1500);
  },
  /* Ninja: lluvia de shurikens y desaparece en una nube de humo */
  async ninja(a) {
    const { f } = a;
    a.say('Shhh… no me viste.', 1500); a.frame(f.throw, 5); await a.wait(350);
    for (let i = 0; i < 3; i++) {
      const e = css('z-index:3;'); e.innerHTML = STAR('#aeb7c4', 16);
      shot(a, e, a.dir * 280, (i - 1) * 16, 650); await a.wait(260);
    }
    await a.wait(400);
    puff(a, a.x, a.y - a.H * 0.4, ['#8b8f98', '#c9ccd2', '#6b6f78'], 12, 44, 18);
    a.frame(f.smoke, 8); await a.wait(220); a.fade(0, 120); await a.wait(1100);
    const b = a.bounds(); const tx = a.R(b.minX, b.maxX);
    a.teleport(tx, a.mode === 'walk' ? a.floorY : a.R(b.minY, b.maxY));
    puff(a, tx, a.y - a.H * 0.4, ['#8b8f98', '#c9ccd2'], 10, 40, 16); a.fade(1, 80);
    a.say('Misión cumplida.', 1600); await a.wait(1500);
  },
  /* Batman: señal en el cielo, batarang y planeo */
  async batman(a) {
    const { f } = a;
    veil(a, '#04050b', 0.5, 600, 1800);
    const sig = css('left:0;top:0;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;background:radial-gradient(circle,#fffbd0 0%,#ffe27a 55%,rgba(255,226,122,0) 72%);z-index:-1;opacity:0;');
    sig.innerHTML = svg(120, 120, '<path d="M60 44L52 30L48 44L38 50L48 56L60 86L72 56L82 50L72 44L68 30Z" fill="#101018"/>');
    a.screen(sig, a.vw / 2, 90); run(a.anim(sig, [{ opacity: 0 }, { opacity: 1, offset: 0.25 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 3200 }));
    a.say('Yo soy la noche.', 1700); a.frame(f.arang, 1); await a.wait(700);
    const e = css('z-index:3;'); e.innerHTML = svg(20, 10, '<path d="M0 5Q4 0 10 5Q16 0 20 5Q14 4 10 10Q6 4 0 5Z" fill="#14151c" stroke="#555" stroke-width=".6"/>');
    shot(a, e, a.dir * 300, 0, 600); await a.wait(500);
    a.frame(f.glide, 1); a.say('¡Justicia!', 1100);
    await a.moveTo(far(a), 230);
    a.frame(f.punch, 1); await a.wait(700);
  },
  /* Doakes: «te estoy vigilando» */
  async watch(a) {
    const { f } = a;
    veil(a, '#0a0f1a', 0.28, 500, 2400);
    a.frame(f.watch, 2); a.say('Te estoy vigilando…', 1900); await a.wait(1900);
    a.frame(f.point, 3); a.say('Sé lo que eres.', 1700);
    const r = dot(14, 'rgba(220,40,40,.0)', 'border-radius:50%;border:2px solid #e23b3b;');
    a.screen(r, a.x + a.dir * (a.W * 0.6), a.y - a.H * 0.6);
    run(a.anim(r, [{ transform: 'scale(.4)', opacity: 1 }, { transform: 'scale(5)', opacity: 0 }], { duration: 900, iterations: 2 }));
    await a.wait(1800);
    a.frame(f.flex, 1); a.say('Cuidado, Dexter.', 1800); await a.wait(1700);
  },
  /* Batista: llamada al jefe y «¡LA PASIÓN!» */
  async llamada(a) {
    const { f } = a;
    a.frame(f.phone, 1); a.say('¿Aló? Sí, jefe… ¿otro caso?', 2100); await a.wait(2100);
    a.say('¡LA PASIÓN!', 1700);
    sparks(a, a.x, a.y - a.H * 0.6, (i) => (i % 2 ? HEART('#ff4d6d', 14) : '<span style="font-size:15px">🔥</span>'), 12, 70, 1000);
    await a.hop(a.H * 0.3, 380); await a.hop(a.H * 0.3, 380);
    a.say('Y sin café no hay pasión.', 1700); await a.wait(1500);
  },
  /* Jesús: aparece el «Buddy» gigante con halo dorado */
  async buddy(a) {
    const { f } = a;
    a.frame(f.glow, 1);
    veil(a, 'radial-gradient(circle at 50% 38%,#fff3b0,#ffe27a 38%,rgba(255,226,122,0) 75%)', 0.5, 500, 2600);
    a.say('¡Buenas vibras para todos!', 2300);
    const h = Math.min(190, a.vh * 0.3); const w = h * BUDDY.w / BUDDY.h;
    const im = css(`width:${w}px;height:${h}px;margin:${-h}px 0 0 ${-w / 2}px;background:url(pets/fx_buddy.png) center/contain no-repeat;filter:drop-shadow(0 0 14px #ffd86b);z-index:3;`);
    a.screen(im, a.x, a.y - a.H - 10);
    run(a.anim(im, [{ transform: 'scale(.2) translateY(30px)', opacity: 0 }, { transform: 'scale(1.1)', opacity: 1, offset: 0.2 }, { transform: 'scale(1)', opacity: 1, offset: 0.85 }, { transform: 'scale(1)', opacity: 0 }], { duration: 2900, easing: 'ease-out' }));
    sparks(a, a.x, a.y - a.H * 0.9, () => STAR('#ffd86b', 12), 14, 90, 1400);
    await a.wait(2400);
    a.frame(f.dove, 1); a.say('Paz y buena música.', 1800); await a.wait(1700);
  },
  /* Caballero: carga con el escudo */
  async carga(a) {
    const { f } = a;
    a.say('¡Por el reino!', 1500); a.frame(f.run, 9);
    await a.moveTo(far(a), 250);
    sparks(a, a.x + a.dir * a.W * 0.4, a.y - a.H * 0.5, () => STAR('#ffe27a', 12), 10, 50, 600);
    a.shakeSprite(400, 3); a.say('¡Clang! Mi escudo es inquebrantable.', 2000); await a.wait(1700);
  },
  /* Stewie: rayo láser */
  async laser(a) {
    const { f } = a;
    a.frame(f.gold, 6); a.say('¡La victoria será mía!', 2000); await a.wait(1100);
    const L = 420; const d = a.dir;
    const beam = css(`width:${L}px;height:6px;margin:-3px 0 0 ${d > 0 ? 0 : -L}px;background:linear-gradient(${d > 0 ? 90 : 270}deg,#fff,#ff3d3d 25%,rgba(255,61,61,0));box-shadow:0 0 10px #ff3d3d;border-radius:3px;z-index:3;`);
    a.screen(beam, a.x + d * a.W * 0.4, a.y - a.H * 0.45);
    run(a.anim(beam, [{ opacity: 0, transform: 'scaleX(.2)', transformOrigin: d > 0 ? 'left' : 'right' }, { opacity: 1, transform: 'scaleX(1)', offset: 0.2 }, { opacity: 0 }], { duration: 800 }));
    a.shakeSprite(500, 2); await a.wait(900);
    a.say('¡Maldición! Otra vez falló.', 1800); await a.wait(1600);
  },
  /* Caine: presentación del Increíble Circo Digital */
  async show(a) {
    const { f } = a;
    a.frame(f.cane, 1); a.say('¡Bienvenidos al Increíble Circo Digital!', 2600);
    const cols = ['#ff3d7f', '#ffd23d', '#3dd6ff', '#7dff6b', '#c07bff'];
    for (let k = 0; k < 3; k++) { sparks(a, a.x, a.y - a.H * 0.9, (i) => `<span style="display:block;width:7px;height:7px;background:${cols[i % 5]}"></span>`, 16, 100, 1100); await a.wait(600); }
    for (let k = 0; k < 4; k++) { a.fade(0.15, 50); await a.wait(80); a.fade(1, 50); await a.wait(120); }
    a.frame(f.fall, 3); a.say('Un pequeño fallo de programación…', 2000); await a.wait(1900);
  },
  /* Snoopy: el Barón Rojo en su casita voladora */
  async baron(a) {
    const { f } = a;
    a.frame(f.baron, 2); a.say('¡Contacto! Voy por el Barón Rojo…', 2200); a.shakeSprite(700, 2);
    await a.wait(1200);
    const fx = far(a);
    await a.moveTo(fx, 170);
    puff(a, fx, a.y - a.H * 1.2, ['#e8e8e8', '#ff8a3d', '#555'], 10, 36, 14);
    a.say('¡Lo derribé! ¡Woodstock, vamos por pizza!', 2200); await a.wait(1800);
  },
  /* Brian: martini y escritor frustrado */
  async martini(a) {
    const { f } = a;
    a.frame(f.martini, 2); a.say('Un martini. Seco, por favor.', 2000); await a.wait(2300);
    a.frame(f.news, 2); a.say('Mi novela será un éxito… algún día.', 2200); await a.wait(2400);
    a.frame(f.sit, 1); a.say('Voy a descansar la vista un ratito.', 1800); await a.wait(1700);
  },
  /* Peter: su risa y el tropezón */
  async risa(a) {
    const { f } = a;
    a.frame(f.laugh, 8); a.say('¡Je je je je je je!', 2000); a.shakeSprite(1400, 2); await a.wait(1500);
    a.frame(f.trip, 2); puff(a, a.x, a.y - 8, ['#cfc7b8', '#e9e3d6'], 8, 36, 12);
    a.say('¡Ay! ¡Mi rodilla! Pero fue gracioso.', 2100); await a.wait(2000);
  },
  /* Jake: estirón */
  async estirar(a) {
    const { f } = a;
    a.say('¡Mira, hermano! ¡Puedo estirarme!', 1900); a.frame(f.stretch, 1);
    sparks(a, a.x, a.y - a.H * 0.6, () => STAR('#ffd23d', 12), 10, 60, 800);
    await a.hop(a.H * 0.4, 500); await a.wait(900);
    a.frame(f.angry, 4); a.say('¡Todo está bien, tío!', 1700); await a.wait(1500);
  },
  /* Finn: ¡hora de aventura! */
  async aventura(a) {
    const { f } = a;
    a.frame(f.stretch, 6); a.say('¡Es hora de aventura!', 1800);
    sparks(a, a.x, a.y - a.H * 0.7, () => STAR('#6cc7ff', 12), 12, 70, 900);
    await a.hop(a.H * 0.35, 450); await a.wait(700);
    a.say('¡Algebraico!', 1500); await a.hop(a.H * 0.35, 450); await a.wait(900);
  },
  /* Stitch: surf */
  async surf(a) {
    const { f } = a;
    a.say('Ohana significa familia…', 2000); a.frame(f.surf, 7); await a.wait(1100);
    const tick = setInterval(() => { if (a.alive?.()) sparks(a, a.x - a.dir * a.W * 0.3, a.y - 6, DROP, 3, 26, 500); }, 160);
    try { await a.moveTo(far(a), 260); } finally { clearInterval(tick); }
    a.say('…y nadie se queda atrás ni se olvida.', 2300); await a.wait(1900);
  },
  /* Rey Helado: invierno de golpe */
  async invierno(a) {
    const { f } = a;
    a.frame(f.power, 3); a.say('¡Que sea invierno!', 1900);
    veil(a, '#bfe4ff', 0.34, 600, 2600);
    shower(a, (i) => FLAKE(i % 2 ? '#ffffff' : '#9fd8ff', a.R(10, 18) | 0), 26, 2200);
    await a.wait(2300);
    a.say('Pingüino… ¿dónde está mi pingüino?', 2100); await a.wait(1900);
  },
});

/* ═══════════════ Ronda 3: poderes nuevos y ajustados ═══════════════ */
/** Elemento con los cuadros de la tira de la mascota (anclado a los pies, centrado). */
const cellEl = (a, cells, o = {}) => {
  const { fps = 8, scale = 1, flip = 1, z = 3 } = o; const d = a.def; const [dw, dh] = d.disp; const w = dw * scale, h = dh * scale;
  const list = Array.isArray(cells) ? cells : [cells];
  const src = a.def.url || `pets/${d.id}.webp`;
  const e = css(`width:${w}px;height:${h}px;margin:${-h}px 0 0 ${-w / 2}px;background:url(${src}) no-repeat;background-size:${w * d.n}px ${h}px;background-position:${-list[0] * w}px 0;z-index:${z};${flip < 0 ? 'transform:scaleX(-1);' : ''}`);
  if (list.length > 1) e.animate([...list.map((c, i) => ({ backgroundPosition: `${-c * w}px 0`, offset: i / list.length, easing: 'steps(1,end)' })), { backgroundPosition: `${-list[0] * w}px 0`, offset: 1 }], { duration: 1000 * list.length / fps, iterations: Infinity });
  return e;
};
/** Globito de texto suelto (para personajes que no son la mascota). */
const tip = (a, x, y, text, ms = 2200) => {
  const e = css('transform:translate(-50%,-100%);background:#fff;color:#111;border:2px solid #222;border-radius:10px;padding:3px 8px;font:700 12px/1.2 system-ui,sans-serif;white-space:nowrap;z-index:6;');
  e.textContent = text; a.screen(e, x, y);
  run(a.anim(e, [{ opacity: 0, transform: 'translate(-50%,-90%)' }, { opacity: 1, transform: 'translate(-50%,-100%)', offset: 0.12 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: ms }));
  return e;
};
const MEESEEKS = svg(36, 64, '<ellipse cx="18" cy="14" rx="11" ry="13" fill="#3db9f2" stroke="#1a6f9b" stroke-width="1.5"/><ellipse cx="14" cy="12" rx="2.4" ry="3" fill="#111"/><ellipse cx="22" cy="12" rx="2.4" ry="3" fill="#111"/><path d="M10 19Q18 29 26 19Q18 22 10 19Z" fill="#fff" stroke="#1a6f9b" stroke-width="1"/><rect x="11" y="26" width="14" height="20" rx="6" fill="#3db9f2" stroke="#1a6f9b" stroke-width="1.5"/><path d="M11 30L2 20M25 30L34 20" stroke="#3db9f2" stroke-width="4" stroke-linecap="round"/><rect x="12" y="38" width="12" height="8" fill="#f1ece0"/><path d="M14 46V60M22 46V60" stroke="#3db9f2" stroke-width="4" stroke-linecap="round"/>');
const MBOX = svg(36, 34, '<rect x="2" y="8" width="32" height="24" fill="#6cc7ff" stroke="#1d4e7a" stroke-width="2"/><rect x="2" y="8" width="32" height="7" fill="#4aa8e8" stroke="#1d4e7a" stroke-width="2"/><circle cx="18" cy="23" r="5" fill="#e23b3b" stroke="#600" stroke-width="1.5"/>');
const PICKLE = svg(36, 74, '<path d="M18 6C29 6 32 22 32 40C32 60 28 70 18 70C8 70 4 60 4 40C4 22 7 6 18 6Z" fill="#7cb82f" stroke="#3d6b12" stroke-width="2"/><g fill="#5d9420"><circle cx="10" cy="26" r="1.8"/><circle cx="26" cy="34" r="1.8"/><circle cx="12" cy="50" r="1.8"/><circle cx="25" cy="56" r="1.8"/><circle cx="18" cy="62" r="1.6"/></g><path d="M8 8L5 -3L12 4L17 -6L21 4L28 -3L27 8Z" fill="#9fd8ff" stroke="#2b6a8a" stroke-width="1.2"/><circle cx="12.5" cy="24" r="4.6" fill="#fff" stroke="#222" stroke-width="1"/><circle cx="23.5" cy="24" r="4.6" fill="#fff" stroke="#222" stroke-width="1"/><circle cx="13.5" cy="25" r="1.8" fill="#111"/><circle cx="22.5" cy="25" r="1.8" fill="#111"/><path d="M8 18L16 20M28 18L20 20" stroke="#2b3d10" stroke-width="1.6"/><path d="M10 38Q18 46 26 38" fill="#fff" stroke="#222" stroke-width="1.4"/><path d="M13 70L12 74M23 70L24 74" stroke="#3d6b12" stroke-width="2.5" stroke-linecap="round"/>');
const TUBE = svg(50, 118, '<rect x="6" y="12" width="38" height="96" rx="12" fill="rgba(120,255,170,.38)" stroke="#bfe9d0" stroke-width="2.5"/><rect x="2" y="2" width="46" height="14" rx="4" fill="#5a606c" stroke="#222" stroke-width="1.5"/><rect x="2" y="104" width="46" height="12" rx="4" fill="#5a606c" stroke="#222" stroke-width="1.5"/><path d="M12 24V100" stroke="rgba(255,255,255,.55)" stroke-width="3" stroke-linecap="round"/><text x="25" y="13" text-anchor="middle" font-size="7" font-weight="700" fill="#ffd23d" font-family="sans-serif">FÉNIX</text>');

Object.assign(SPECIALS, {
  /* Vampiro: se vuelve murciélago, vuela, y se deshace en ceniza antes de reformarse */
  async murcielago(a) {
    const { f } = a;
    veil(a, '#1a0612', 0.45, 500, 6200);
    a.frame(f.cast, 5); a.say('Mírame a los ojos…', 1800); await a.wait(1600);
    a.frame(f.trans, 5); puff(a, a.x, a.y - a.H * 0.4, ['#2a1f40', '#4b3a6e', '#8f7ab5'], 12, 44, 18); await a.wait(1300);
    const sx = a.x, sy = a.y; a.fade(0, 100);
    const tx = far(a); const dir = tx > sx ? 1 : -1; const dx = tx - sx;
    const wrap = css('z-index:3;'); wrap.appendChild(cellEl(a, f.bat, { fps: 9, flip: dir }));
    a.screen(wrap, sx, sy - a.H * 0.3);
    a.say('¡Hora de volar!', 1400);
    await run(a.anim(wrap, [{ transform: 'translate(0,0)' }, { transform: `translate(${dx * 0.3}px,-${a.H * 1.1}px)`, offset: 0.3 }, { transform: `translate(${dx * 0.6}px,-${a.H * 0.5}px)`, offset: 0.6 }, { transform: `translate(${dx * 0.85}px,-${a.H * 1.2}px)`, offset: 0.85 }, { transform: `translate(${dx}px,0)` }], { duration: 4200, easing: 'ease-in-out', fill: 'forwards' }));
    wrap.remove();
    a.teleport(tx, a.mode === 'walk' ? a.floorY : sy); a.face(dir);
    puff(a, tx, a.y - a.H * 0.3, ['#2a1f40', '#8f7ab5'], 10, 36, 14); a.fade(1, 80);
    a.frame(f.hand, 2); a.say('Uf… esto de volar cansa…', 1600); await a.wait(1500);
    // ceniza
    a.say('Ya me siento… polvoriento…', 1500);
    for (const c of f.ash) { a.frame(c, 1); puff(a, a.x, a.y - 8, ['#9a9aa5', '#c8c8d0', '#5a5a64'], 3, 22, 9); await a.wait(260); }
    await a.wait(1300);
    a.say('¡Ni la ceniza me detiene!', 1800);
    for (const c of [...f.ash].reverse()) { a.frame(c, 1); await a.wait(200); }
    a.frame(f.cast, 4); sparks(a, a.x, a.y - a.H * 0.6, () => STAR('#c0152f', 12), 8, 50, 700); await a.wait(1200);
  },
  /* Impostor: sale el retrato gigante, y luego se va volando culpando a Víctor */
  async impostor(a) {
    const { f } = a;
    veil(a, '#05060c', 0.55, 300, 6500);
    for (let k = 0; k < 3; k++) { veil(a, '#ff1d1d', 0.3, 120, 300); await a.wait(420); }
    a.say('¡Hay un impostor entre nosotros!', 2300);
    const h = Math.min(a.vh * 0.5, 320); const w = h * 0.75;
    const im = css(`width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;background:url(pets/fx_impostor.png) center/contain no-repeat;filter:drop-shadow(0 0 18px #ff2d2d);z-index:4;`);
    a.screen(im, a.vw / 2, a.vh * 0.42);
    run(a.anim(im, [{ transform: 'scale(.1) rotate(-25deg)', opacity: 0 }, { transform: 'scale(1.15) rotate(4deg)', opacity: 1, offset: 0.22 }, { transform: 'scale(1) rotate(0)', opacity: 1, offset: 0.85 }, { transform: 'scale(1)', opacity: 0 }], { duration: 3000, easing: 'ease-out' }));
    const t = css('transform:translate(-50%,0);font:900 30px/1 system-ui,sans-serif;letter-spacing:6px;color:#ff2d2d;text-shadow:0 0 12px #000,2px 2px 0 #000;z-index:5;'); t.textContent = 'IMPOSTOR';
    a.screen(t, a.vw / 2, a.vh * 0.42 + h / 2 + 8);
    run(a.anim(t, [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: 3000 }));
    await a.wait(3100);
    const guilty = Math.random() < 0.5;
    a.frame(f.fly, 6); await a.wait(400);
    const hh = Math.max(50, Math.min(a.H * 2.6, a.y - a.H - 20));
    const up = a.hop(hh, 5200); const mv = a.moveTo(far(a), 95);
    await a.wait(900);
    a.say(guilty ? '¡Víctor sí era un impostor!' : '¡Víctor no era el impostor!', 2600);
    await Promise.all([up, mv]);
    a.frame(f.body, 1); a.say(guilty ? 'Lo sabía… y yo estaba en eléctrica.' : 'Qué raro… entonces… ¿quién fue?', 2200); await a.wait(2200);
  },
  /* Finn y Jake: se vuelven gigantes */
  async gigante(a) {
    const { f } = a; const finn = a.def.id === 'finn';
    a.frame(finn ? f.pose : f.flex, 6); a.say(finn ? '¡Jake, hazme grande!' : '¡Mira, hermano! ¡Voy a ser gigante!', 2100); await a.wait(1000);
    sparks(a, a.x, a.y - a.H * 0.5, () => STAR('#ffd23d', 14), 14, 70, 800);
    await a.grow(2.5, 900);
    a.shakeSprite(800, 3); puff(a, a.x, a.y, ['#cfc7b8', '#e9e3d6', '#a79f90'], 14, 70, 26);
    a.frame(finn ? f.stomp : f.flex, 6); a.say(finn ? '¡ALGEBRAICO! ¡Soy enorme!' : '¡Cuidado, que piso fuerte!', 2300);
    for (let k = 0; k < 3; k++) { a.shakeSprite(350, 4); puff(a, a.x + a.R(-20, 20), a.y, ['#cfc7b8', '#e9e3d6'], 8, 50, 20); await a.wait(750); }
    await a.grow(1, 600, 2.5);
    a.frame(finn ? f.stretch : f.stretch, 3); a.say('Uf, ya me cansé de ser grande.', 1700); await a.wait(1600);
  },
  /* Snoopy: vuela de verdad en su casita roja (no se desliza) */
  async vuelo(a) {
    const { f } = a;
    a.frame(f.house, 3); puff(a, a.x, a.y - a.H * 0.3, ['#ffffff', '#ff6b6b'], 8, 30, 14);
    a.say('¡Contacto! ¡A volar, Barón Rojo!', 2300); await a.wait(1500);
    const hh = Math.max(60, Math.min(a.H * 2.2, a.y - a.H - 20));
    const up = a.hop(hh, 7000); const mv = a.moveTo(far(a), 70);
    await a.wait(1800); a.say('¡Woodstock, ve por mis lentes!', 2200);
    await Promise.all([up, mv]);
    a.say('¡Aterrizaje perfecto!', 1700); await a.wait(1500);
  },
  /* Snoopy B/N: se queda mirando hacia arriba e imagina que vuela entre nubes */
  async imagina(a) {
    const { f } = a;
    a.frame(f.look, 1); a.say('Mmm… estoy imaginando algo…', 1900); await a.wait(1100);
    const bx = a.x, by = Math.max(a.y - a.H - 26, 140);
    [[0, 36, 5], [8, 24, 8], [16, 8, 11]].forEach(([ox, oy, r], i) => { const d = dot(r * 2, '#fff', 'border:2px solid #222;border-radius:50%;z-index:4;'); a.screen(d, bx + ox, by + oy); run(a.anim(d, [{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 300, delay: i * 220, fill: 'both' })); });
    await a.wait(800);
    const W = 168, H = 100;
    const bub = css(`width:${W}px;height:${H}px;margin:${-H}px 0 0 ${-W / 2 + 22}px;border-radius:50%;border:3px solid #fff;background:linear-gradient(#4f9dff,#bfe3ff);overflow:hidden;box-shadow:0 0 0 2px #222,0 6px 14px rgba(0,0,0,.35);z-index:4;`);
    const cloud = (l, t, s, dur) => { const c = css(`left:${l}px;top:${t}px;width:${34 * s}px;height:${12 * s}px;border-radius:12px;background:#fff;box-shadow:${8 * s}px -${6 * s}px 0 ${3 * s}px #fff,-${8 * s}px -${3 * s}px 0 ${2 * s}px #fff;`); bub.appendChild(c); run(a.anim(c, [{ transform: 'translateX(0)' }, { transform: 'translateX(-190px)' }], { duration: dur, iterations: Infinity, easing: 'linear' })); };
    cloud(150, 18, 1, 6000); cloud(210, 62, 0.8, 8000); cloud(300, 36, 1.2, 10000);
    const sun = css('right:10px;top:8px;width:16px;height:16px;border-radius:50%;background:#ffd23d;box-shadow:0 0 10px #ffe27a;'); bub.appendChild(sun);
    const pl = cellEl(a, f.plane, { scale: 0.55, flip: 1 }); pl.style.left = '40px'; pl.style.top = `${H - 8}px`; bub.appendChild(pl);
    run(a.anim(pl, [{ transform: 'translate(-30px,6px) rotate(-6deg)' }, { transform: 'translate(40px,-14px) rotate(6deg)', offset: 0.5 }, { transform: 'translate(110px,4px) rotate(-4deg)' }], { duration: 3600, iterations: 2, direction: 'alternate', easing: 'ease-in-out' }));
    a.screen(bub, bx + 20, by);
    run(a.anim(bub, [{ opacity: 0, transform: 'scale(.2)' }, { opacity: 1, transform: 'scale(1)', offset: 0.15 }, { opacity: 1, offset: 0.9 }, { opacity: 0, transform: 'scale(.6)' }], { duration: 6200, transformOrigin: '0 100%' }));
    a.say('¡Contacto! ¡Barón Rojo, aquí voy!', 2600); await a.wait(3300);
    a.say('Algún día volaré de verdad…', 2200); await a.wait(2800);
  },
  /* Batista: llamada y, ahora sí, el baile */
  async llamada(a) {
    const { f } = a;
    a.frame(f.phone, 1); a.say('¿Aló? Sí, jefe… ¿otro caso?', 2100); await a.wait(2100);
    a.say('¡LA PASIÓN!', 1700);
    sparks(a, a.x, a.y - a.H * 0.6, (i) => (i % 2 ? HEART('#ff4d6d', 14) : '<span style="font-size:15px">🔥</span>'), 12, 70, 1000);
    await a.hop(a.H * 0.3, 380); await a.wait(300);
    a.frame(f.dance, 6); a.say('¡Y a bailar se ha dicho!', 2000);
    for (let k = 0; k < 4; k++) { sparks(a, a.x, a.y - a.H * 0.8, () => NOTE('#7a4bd6'), 3, 40, 900); await a.wait(700); }
    a.say('Y sin café no hay pasión.', 1700); await a.wait(1500);
  },
  /* Peter: risa, tropezón y se hunde en el piso */
  async risa(a) {
    const { f } = a;
    a.frame(f.laugh, 8); a.say('¡Je je je je je je!', 2000); a.shakeSprite(1400, 2); await a.wait(1500);
    a.frame(f.trip, 3); puff(a, a.x, a.y - 8, ['#cfc7b8', '#e9e3d6'], 8, 36, 12);
    a.say('¡Ay! ¡Mi rodilla! Pero fue gracioso.', 2100); await a.wait(2000);
    a.say('Espera… ¿el piso es de gelatina?', 1700);
    for (const c of f.hole) { a.frame(c, 1); await a.wait(240); }
    await a.wait(900);
    for (const c of [...f.hole].reverse()) { a.frame(c, 1); await a.wait(200); }
    a.say('¡Eso estuvo genial, je je!', 1500); await a.wait(1300);
  },
  /* Rick: elige al azar entre el portal de siempre y los trucos nuevos */
  async rickmix(a) {
    const k = Math.floor(Math.random() * 4);
    if (k === 0) return SPECIALS.portal(a);
    if (k === 1) return SPECIALS.rickMeeseeks(a);
    if (k === 2) return SPECIALS.rickFenix(a);
    return SPECIALS.rickPepinillo(a);
  },
  async rickMeeseeks(a) {
    const d = a.dir; const bx = a.x + d * 56, by = a.y;
    a.say('Mira, Morty: la caja de Mr. Meeseeks.', 2200);
    const box = css('margin:-34px 0 0 -18px;z-index:2;'); box.innerHTML = MBOX; a.screen(box, bx, by);
    run(a.anim(box, [{ transform: 'translateY(-90px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 450, easing: 'cubic-bezier(.3,1.6,.5,1)' }));
    await a.wait(2200);
    a.say('Solo aprieto el botón…', 1500); a.shakeSprite(400, 1); await a.wait(1400);
    run(a.anim(box, [{ transform: 'translateX(-2px)' }, { transform: 'translateX(2px)' }], { duration: 70, iterations: 10, direction: 'alternate' })); await a.wait(700);
    puff(a, bx, by - 22, ['#6cc7ff', '#bfe9ff', '#ffffff'], 14, 40, 16);
    const m = css('margin:-64px 0 0 -18px;z-index:3;'); m.innerHTML = MEESEEKS; a.screen(m, bx, by);
    run(a.anim(m, [{ transform: 'scale(.1)', transformOrigin: '50% 100%' }, { transform: 'scale(1.2)', transformOrigin: '50% 100%', offset: 0.5 }, { transform: 'scale(1)', transformOrigin: '50% 100%' }], { duration: 500, easing: 'ease-out', fill: 'forwards' }));
    box.remove();
    await a.wait(600); tip(a, bx, by - 76, '¡Soy el Señor Meeseeks, mírame!', 2400); await a.wait(2300);
    a.say('Hazme un sándwich.', 1400); await a.wait(1400);
    tip(a, bx, by - 76, '¡Existir es sufrir!', 1800); run(a.anim(m, [{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)' }, { transform: 'translateY(0)' }], { duration: 500, iterations: 3 })); await a.wait(1900);
    puff(a, bx, by - 30, ['#6cc7ff', '#ffffff'], 14, 40, 16); m.remove(); a.say('Listo. Qué asco de existencia.', 1700); await a.wait(1500);
  },
  async rickFenix(a) {
    a.say('Proyecto Fénix… ¿qué podría salir mal?', 2200); await a.wait(1500);
    const w = 50, h = 118; const tube = css(`width:${w}px;height:${h}px;margin:${-h}px 0 0 ${-w / 2}px;z-index:2;`); tube.innerHTML = TUBE;
    const r = cellEl(a, a.def.frames.sleep[0], { scale: 0.85 }); r.style.left = `${w / 2}px`; r.style.top = `${h - 14}px`; tube.appendChild(r);
    for (let i = 0; i < 9; i++) { const b = dot(4 + (i % 3) * 2, 'rgba(255,255,255,.7)', 'border-radius:50%;'); b.style.left = `${12 + (i * 7) % 28}px`; b.style.top = `${h - 18}px`; tube.appendChild(b); run(a.anim(b, [{ transform: 'translateY(0)', opacity: 0.9 }, { transform: `translateY(-${70 + (i % 4) * 8}px)`, opacity: 0 }], { duration: 1500 + i * 120, iterations: Infinity, delay: i * 180 })); }
    a.fade(0, 120); a.screen(tube, a.x, a.y + 6);
    run(a.anim(tube, [{ transform: 'translateY(-40px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 500, easing: 'ease-out' }));
    run(a.anim(r, [{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }], { duration: 1200, iterations: Infinity, direction: 'alternate', easing: 'ease-in-out' }));
    await a.wait(3800);
    veil(a, '#9dffb5', 0.4, 200, 600); a.say('¡Estoy… renaciendo, Morty!', 1900); await a.wait(1700);
    run(a.anim(tube, [{ opacity: 1 }, { opacity: 0, transform: 'scale(1.15)' }], { duration: 450, fill: 'forwards' })); await a.wait(400);
    puff(a, a.x, a.y - a.H * 0.4, ['#9dffb5', '#ffffff', '#53d97a'], 14, 44, 16); a.fade(1, 150);
    a.say('¡Wubba lubba dub dub!', 1700); await a.wait(1500);
  },
  async rickPepinillo(a) {
    a.say('¡Me convertí en un pepinillo, Morty!', 2300);
    puff(a, a.x, a.y - a.H * 0.4, ['#7cb82f', '#bfe36a', '#3d6b12'], 14, 44, 16); a.fade(0, 100);
    const p = css('margin:-74px 0 0 -18px;z-index:3;transform-origin:50% 100%;'); p.innerHTML = PICKLE; a.screen(p, a.x, a.y);
    run(a.anim(p, [{ transform: 'scale(.1)' }, { transform: 'scale(1.15)', offset: 0.5 }, { transform: 'scale(1)' }], { duration: 500, fill: 'forwards' }));
    await a.wait(900);
    run(a.anim(p, [{ transform: 'rotate(-10deg) translateY(0)' }, { transform: 'rotate(10deg) translateY(-22px)', offset: 0.5 }, { transform: 'rotate(-10deg) translateY(0)' }], { duration: 650, iterations: 5 }));
    await a.wait(1400); a.say('¡Soy Pickle Rick! ¡El mejor pepinillo!', 2400); await a.wait(2400);
    a.say('Es… muy gracioso, ¿no, Morty?', 1900); await a.wait(1900);
    puff(a, a.x, a.y - 30, ['#7cb82f', '#bfe36a'], 12, 40, 14); p.remove(); a.fade(1, 100);
    a.say('Bah, volví a ser persona. Qué bajón.', 1900); await a.wait(1700);
  },
  /* Marine sangriento: espada sierra, ráfaga de bólter o alas sangrientas (al azar) */
  async marine(a) {
    const { f } = a;
    const tipX = (dy, fw) => [a.x + a.dir * a.W * fw, a.y - a.H * dy];
    const r = Math.random();
    if (r < 0.38) {
      // Espada sierra: combo de tajos con chispas rojas
      a.say('¡Por Sanguinius!', 1500);
      a.frame(f.sword[0], 4); await a.wait(450);
      veil(a, 'rgba(140,10,10,.4)', 0.8, 250, 1100, 2);
      for (const c of f.sword) {
        a.frame(c, 1);
        const [bx, by] = tipX(0.5, 0.5);
        sparks(a, bx, by, SPARK(a.R(0, 1) < 0.5 ? '#ff2d2d' : '#ffb3b3', 11), 4, 40, 450);
        await a.wait(200);
      }
      a.frame(f.victory, 3); a.say('¡Limpio!', 1300); await a.wait(1100);
    } else if (r < 0.72) {
      // Bólter: se arrodilla y vacía el cargador
      a.say('¡Fuego de bólter!', 1500);
      a.frame(f.kneel, 5); await a.wait(550);
      for (const c of f.shoot) {
        a.frame(c, 1);
        const [mx, my] = tipX(0.55, 0.6);
        sparks(a, mx, my, SPARK('#ffd23d', 10), 5, 40, 400);
        puff(a, mx, my, ['#5a5a64', '#9a9aa5'], 3, 22, 10);
        await a.wait(170);
      }
      a.frame(f.victory, 3); await a.wait(900);
    } else {
      // Alas sangrientas: asciende envuelto en luz azul
      a.say('¡Siente mis alas!', 1700);
      for (const c of f.wings) { a.frame(c, 2); await a.wait(230); }
      veil(a, 'rgba(40,120,255,.35)', 0.8, 500, 1600, 2);
      sparks(a, a.x, a.y - a.H * 0.6, SPARK('#7cc4ff', 12), 12, 60, 800);
      await a.hop(a.H * 0.55, 650);
      a.frame(f.energy[1], 4);
      sparks(a, a.x, a.y - a.H * 0.5, SPARK('#bfe4ff', 12), 10, 55, 700);
      await a.wait(900);
      a.frame(f.victory, 3); a.say('La furia me protege.', 1600); await a.wait(1200);
    }
  },
});

export const SPECIAL_IDS = Object.keys(SPECIALS);
