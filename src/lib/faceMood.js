import { IDLE_SLEEP, IDLE_SLEEP_LATE, isLate } from '../data/faces';

const toC = (t, sym) => (sym === '°F' ? ((t - 32) * 5) / 9 : t);
// La tanda rota cada 30 min: con semilla fija por sesión todo repetía lo mismo.
const slot = () => Math.floor(Date.now() / 1800000);
const pick = (list, seed, salt = 0) => list[Math.floor(((seed * 9301 + (salt + slot() * 57) * 49297) % 1 + 1) % 1 * list.length)];

/** Qué carita y qué frase toca según música, hora, inactividad y clima. */
export function reactTo({ weather, hour, playing, track, idle, seed, name }) {
  const late = isLate(hour);
  const sleeping = !playing && idle >= (late ? IDLE_SLEEP_LATE : IDLE_SLEEP);
  const n = name ? `, ${name}` : '';

  // 1) Dormido: muy tarde o inactivo (si suena música, no se duerme).
  if (sleeping) {
    return {
      face: 'dormido', kind: 'sleep',
      say: pick(late
        ? [`Zzz… ya es tarde${n}. Mañana seguimos.`, 'Shhh, es de madrugada. Yo también duermo.', `Hora de descansar${n}. Yo ya me dormí.`]
        : ['Zzz… me quedé dormido. Toca algo y despierto.', 'Shhh, descansando. Mueve el mouse y vuelvo.', 'Zzz… llevo rato sin verte por aquí.'], seed),
    };
  }

  // 2) Música sonando: audífonos puestos.
  if (playing) {
    const t = track?.title ? `«${track.title}»` : 'esta canción';
    return {
      face: 'musica', kind: 'music',
      say: pick([`Sonando ${t}. Buen gusto${n}.`, `Con audífonos y ${t}.`, `${t}… súbele que está buena.`, 'En modo música, no molesten.'], seed, 1),
    };
  }

  // 3) Sin clima todavía.
  if (!weather) return { face: 'pensando', kind: 'load', say: 'Despertando…' };

  // 4) Clima.
  const { code, isDay, temp, feels, sym } = weather;
  const c = toC(temp, sym);
  const cf = toC(feels ?? temp, sym);
  const feelTxt = Math.abs((feels ?? temp) - temp) >= 2 ? ` Se siente como ${feels}${sym}.` : '';
  const warm = c >= 26, hot = c >= 30, cold = c <= 14;
  const tip = hot ? 'Hidrátate bien.' : warm ? 'Día de ropa liviana.' : cold ? 'Abrígate, hace fresquito.' : '';
  const withTip = (s) => `${s}${feelTxt}${tip && seed > 0.4 ? ' ' + tip : ''}`.trim();

  let face = 'feliz', base;
  if (code === 0 || code === 1) {
    if (!isDay) { face = 'enamorado'; base = pick(['Noche despejada, mira esas estrellas.', 'Cielo limpio esta noche, una belleza.'], seed, 2); }
    else if (hot) { face = 'lentes'; base = pick(['Solazo con cielo limpio, modo gafas.', 'Sol a full. Protector y gafas.'], seed, 3); }
    else { face = warm || cf > 18 ? 'enamorado' : 'feliz'; base = pick(['Día despejado, aprovéchalo.', 'Cielo limpio, qué belleza de día.', 'Hoy el sol está de tu lado.'], seed, 4); }
  } else if (code === 2) {
    face = 'guino'; base = pick(['Nubecitas por aquí y por allá, todo bien.', 'Sol y nubes jugando a las escondidas.', 'Parcialmente nublado, buen plan para salir.'], seed, 5);
  } else if (code === 3) {
    face = 'neutral'; base = pick(['Cielo tapado, plan tranquilo.', 'Todo gris y calmado, ideal para un tinto.', 'Nublado total, el día pide pausa.'], seed, 6);
  } else if (code === 45 || code === 48) {
    face = 'pensando'; base = pick(['Neblina espesa, ve con cuidado.', 'Se ve todo borroso afuera, maneja con calma.'], seed, 7);
  } else if (code >= 51 && code <= 57) {
    face = 'llanto'; base = pick(['Llovizna suave, lleva algo por si acaso.', 'Cae una lluvia finita, chaqueta a la mano.'], seed, 8);
  } else if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) {
    face = 'llanto'; base = pick(['Está lloviendo, no olvides el paraguas.', 'Día de lluvia: paraguas y buena música.', 'Lluvia afuera, adentro se está mejor.'], seed, 9);
  } else if (code === 66 || code === 67) {
    face = 'sorpresa'; base = 'Lluvia helada, mejor quédate bajo techo.';
  } else if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    face = 'sorpresa'; base = 'Está nevando, abrígate bien.';
  } else if (code >= 95) {
    face = 'sorpresa'; base = pick(['Tormenta eléctrica cerca, mejor adentro.', 'Truenos por la zona, desconecta lo importante.'], seed, 10);
  } else {
    face = 'pensando'; base = 'El clima anda indeciso hoy.';
  }
  // Calor extremo: se pone travieso.
  if (c >= 33 && !['llanto', 'sorpresa'].includes(face)) { face = 'diablito'; base = pick(['Calor del infierno, busca sombra.', 'Está haciendo un calorcito sospechoso.'], seed, 11); }

  return { face, kind: 'weather', say: withTip(base) };
}
