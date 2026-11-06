/** Cargador singleton de la IFrame API oficial de YouTube (con timeout). */
let apiPromise = null;

export function loadYTAPI(timeoutMs = 15000) {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.YT?.Player) return Promise.resolve();
  if (!apiPromise) {
    apiPromise = new Promise((res, rej) => {
      const timer = setTimeout(() => {
        apiPromise = null;
        rej(new Error('YT API tardó demasiado (red/adblock)'));
      }, timeoutMs);
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timer);
        try { prev?.(); } catch {}
        res();
      };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.async = true;
      s.onerror = () => { clearTimeout(timer); apiPromise = null; rej(new Error('YT API no cargó')); };
      document.head.appendChild(s);
    });
  }
  return apiPromise;
}
