// Datos estáticos de la pantalla de música (categorías, momentos y búsquedas de descubrimiento).
export const CATEGORIES = [
  ['Pop', 'top pop hits 2026', 'linear-gradient(135deg,#7c3aed,#4c1d95)', 'pop hits'],
  ['Electrónica', 'electronic dance music hits', 'linear-gradient(135deg,#2563eb,#1e3a8a)', 'electronic dance music'],
  ['Hip-Hop', 'hip hop hits 2026', 'linear-gradient(135deg,#ea580c,#7c2d12)', 'hip hop hits'],
  ['Clásica', 'classical music best', 'linear-gradient(135deg,#4b5563,#111827)', 'classical music'],
  ['Rock', 'rock hits clasicos y nuevos', 'linear-gradient(135deg,#dc2626,#450a0a)', 'rock hits'],
  ['Salsa', 'salsa clasica y nueva', 'linear-gradient(135deg,#f59e0b,#78350f)', 'salsa'],
  ['Reguetón', 'reggaeton hits 2026', 'linear-gradient(135deg,#db2777,#500f28)', 'reggaeton'],
  ['Urbano', 'musica urbana latina hits', 'linear-gradient(135deg,#059669,#022c22)', 'musica urbana latina'],
  ['Vallenato', 'vallenato clasicos y nuevos', 'linear-gradient(135deg,#eab308,#422006)', 'vallenato'],
  ['Phonk', 'phonk drift music', 'linear-gradient(135deg,#6d28d9,#0f0f0f)', 'phonk'],
];

// [etiqueta, búsqueda por género (corta, la que sí responde), degradado]
export const MOODS = [
  ['Para entrenar', 'phonk workout', 'linear-gradient(135deg,#ef4444,#7f1d1d)'],
  ['Para relajar', 'acoustic chill', 'linear-gradient(135deg,#06b6d4,#164e63)'],
  ['Para estudiar', 'lofi study', 'linear-gradient(135deg,#8b5cf6,#2e1065)'],
  ['De fiesta', 'reggaeton fiesta', 'linear-gradient(135deg,#ec4899,#831843)'],
  ['Románticas', 'bachata romantica', 'linear-gradient(135deg,#f43f5e,#4c0519)'],
  ['Para el carro', 'pop road trip', 'linear-gradient(135deg,#f59e0b,#78350f)'],
];

// Pool de "Descubrimiento rápido": queries variadas que sí devuelven música real.
export const RANDOM_POOL = [
  'top pop hits 2026',
  'reggaeton hits 2026',
  'rock clasicos en español',
  'salsa clasica hits',
  'musica electronica hits',
  'baladas romanticas en español',
  'hip hop hits 2026',
  'vallenato clasicos',
  'musica urbana latina hits',
  'phonk drift music',
];
