// Guarda un archivo de TU biblioteca local donde tú elijas.
// Chrome/Edge: selector "Guardar como" (showSaveFilePicker). Resto: descarga normal.
const EXT = { 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/flac': 'flac', 'audio/ogg': 'ogg', 'audio/wav': 'wav', 'audio/webm': 'webm', 'audio/aac': 'aac' };
const clean = (s) => String(s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120);

export async function saveLocalCopy(track) {
  if (!track?.src) return { ok: false };
  const blob = await (await fetch(track.src)).blob();
  const ext = EXT[blob.type] || 'mp3';
  const name = `${clean(`${track.artist} - ${track.title}`) || 'cancion'}.${ext}`;
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'Audio', accept: { [blob.type || 'audio/mpeg']: [`.${ext}`] } }] });
      const w = await h.createWritable();
      await w.write(blob);
      await w.close();
      return { ok: true, picked: true };
    } catch (e) {
      if (e?.name === 'AbortError') return { ok: false, aborted: true };
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { ok: true, picked: false };
}
