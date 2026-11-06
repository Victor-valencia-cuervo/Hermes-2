// Mini-reproductor flotante (Picture-in-Picture de documento).
// El reproductor de YouTube vive en un iframe y su video no se puede mandar a PiP,
// asi que se abre una ventanita propia con carátula, título y controles.
// Solo existe en navegadores con Document PiP (Chrome/Edge de escritorio).
export const pipSupported = () => {
  if (typeof window === 'undefined') return false;
  const api = window.documentPictureInPicture;
  return !!(api && typeof api.requestWindow === 'function' && window.isSecureContext !== false);
};

export async function openMiniPlayer(getState, actions) {
  if (!pipSupported()) return false;
  try {
    const win = await window.documentPictureInPicture.requestWindow({ width: 320, height: 150 });
    const d = win.document;
    d.body.style.cssText = 'margin:0;background:#0b0b12;color:#fff;font:13px system-ui,sans-serif;overflow:hidden';
    d.body.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center;padding:12px;height:100%;box-sizing:border-box">
        <img id="a" style="width:84px;height:84px;border-radius:14px;object-fit:cover;background:#222" alt="">
        <div style="flex:1;min-width:0">
          <div id="t" style="font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"></div>
          <div id="r" style="opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:8px"></div>
          <div style="display:flex;gap:6px">
            <button id="p0">⏮</button><button id="pp">⏯</button><button id="n0">⏭</button>
          </div>
        </div>
      </div>`;
    d.querySelectorAll('button').forEach((b) => {
      b.style.cssText = 'flex:1;border:0;border-radius:10px;padding:8px 0;background:#ffffff22;color:#fff;font-size:16px;cursor:pointer';
    });
    const prevBtn = d.getElementById('p0');
    const playBtn = d.getElementById('pp');
    const nextBtn = d.getElementById('n0');
    if (prevBtn) prevBtn.onclick = () => actions.prev?.();
    if (playBtn) playBtn.onclick = () => actions.toggle?.();
    if (nextBtn) nextBtn.onclick = () => actions.next?.();
    const paint = () => {
      const s = getState?.() || {};
      const title = d.getElementById('t');
      const artist = d.getElementById('r');
      const img = d.getElementById('a');
      const play = d.getElementById('pp');
      if (title) title.textContent = s.title || 'Hermes';
      if (artist) artist.textContent = s.artist || '';
      if (img && s.art && img.getAttribute('src') !== s.art) img.src = s.art;
      if (play) play.textContent = s.playing ? '⏸' : '▶';
    };
    paint();
    const id = win.setInterval(paint, 700);
    win.addEventListener('pagehide', () => win.clearInterval(id));
    return true;
  } catch {
    return false;
  }
}
