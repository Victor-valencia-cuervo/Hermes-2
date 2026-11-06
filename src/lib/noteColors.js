// Paleta estilo Keep adaptada a Hermes (funciona en dark/light via color-mix).
// Cada color define fondo suave + borde. 'default' usa var(--s).
export const NOTE_COLORS = [
  { id: 'default', name: 'Predeterminado', bg: 'var(--s)', border: 'var(--bd)' },
  { id: 'red', name: 'Rojo', bg: '#f28b82', border: '#e57373' },
  { id: 'orange', name: 'Naranja', bg: '#fbbc04', border: '#f29900' },
  { id: 'yellow', name: 'Amarillo', bg: '#fff475', border: '#e6c602' },
  { id: 'green', name: 'Verde', bg: '#ccff90', border: '#aed581' },
  { id: 'teal', name: 'Verde azulado', bg: '#a7ffeb', border: '#64ffda' },
  { id: 'blue', name: 'Azul', bg: '#cbf0f8', border: '#84d7ec' },
  { id: 'cyan', name: 'Celeste', bg: '#aecbfa', border: '#7aaaf8' },
  { id: 'purple', name: 'Morado', bg: '#d7aefb', border: '#b984f5' },
  { id: 'pink', name: 'Rosa', bg: '#fdcfe8', border: '#f48fb1' },
  { id: 'brown', name: 'Marrón', bg: '#e6c9a8', border: '#d7a97e' },
  { id: 'gray', name: 'Gris', bg: '#e8eaed', border: '#dadce0' },
];

export function colorOf(id) {
  return NOTE_COLORS.find((c) => c.id === id) || NOTE_COLORS[0];
}

// Estilo inline para una nota: en 'default' usa .card de Hermes,
// en colores usa el color Keep con texto oscuro legible.
export function noteStyle(colorId) {
  const c = colorOf(colorId);
  if (c.id === 'default') return {};
  return { background: c.bg, borderColor: c.border, color: '#202124' };
}

export function noteTextColor(colorId) {
  return colorId && colorId !== 'default' ? '#202124' : 'var(--t)';
}

export function noteMutedColor(colorId) {
  return colorId && colorId !== 'default' ? 'rgba(32,33,36,.65)' : 'var(--m)';
}
