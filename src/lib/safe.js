// Modo seguro de diagnóstico: abrir con ?seguro=1 arranca sin leer
// nada guardado (cola, tema, minuto). Si así abre, el problema eran
// los datos persistidos de ese dispositivo; si ni así, es el navegador.
export const SAFE = (() => {
  try {
    return new URLSearchParams(window.location.search).has('seguro');
  } catch {
    return false;
  }
})();
