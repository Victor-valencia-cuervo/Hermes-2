// Avisos con Sileo: reemplaza los toasts propios.
// Misma firma que antes — toast(msg, Icon) — para no tocar cada llamada:
// el Icon decide el tipo y el diccionario pone la frase casual.
// El tema claro/oscuro lo pone el <Toaster> en App según tu modo.
import { sileo } from 'sileo';
import { AlertTriangle, Check, Heart, BellRing, AlarmClock } from 'lucide-react';

function typeOf(I) {
  if (I === AlertTriangle) return 'error';
  if (I === Check || I === Heart || !I) return 'success';
  return 'info';
}

// Frases casuales: [patrón, título, descripción?, tipo?]
// Si el mensaje trae datos (nombres, minutos), van en la descripción.
const RULES = [
  // Descargas offline (título corto + detalle aparte, no todo en el título)
  { re: /buscando versión descargable/i, title: 'Buscando descarga', desc: 'Localizando versión sin wifi…', type: 'info' },
  { re: /no tiene gemelo descargable/i, title: 'Sin versión descargable', desc: 'Prueba con otro tema', type: 'warning' },
  { re: /no trae audio descargable/i, title: 'Sin audio descargable', type: 'warning' },
  { re: /^descargando/i, title: 'Descargando…', type: 'info' },
  { re: /bloqueó la descarga directa/i, title: 'Descarga bloqueada', desc: 'Suena con internet, no se puede guardar', type: 'warning' },
  { re: /no se pudo descargar \(red\)/i, title: 'Falló la descarga', desc: 'Revisa tu red', type: 'error' },
  { re: /descarga llegó vacía/i, title: 'Descarga vacía', desc: 'Intenta de nuevo', type: 'warning' },
  { re: /guardada en local/i, title: 'Guardada en Local', desc: 'Ya suena sin wifi', type: 'success' },
  { re: /ya estaba en local/i, title: 'Ya estaba en Local', type: 'info' },
  { re: /no se pudo guardar en local/i, title: 'No se pudo guardar', type: 'error' },
  { re: /^no se pudo descargar$/i, title: 'No se pudo descargar', type: 'error' },
  { re: /no se encontró versión descargable/i, title: 'Sin versión descargable', type: 'warning' },
  { re: /no se pudo descargar ese tema/i, title: 'No se pudo descargar', type: 'error' },
  { re: /copia guardada/i, title: 'Copia guardada', type: 'success' },
  // Segundo plano gratis
  { re: /ya suena en segundo plano/i, title: 'Ya va en 2º plano', type: 'info' },
  { re: /buscando versión gratis/i, title: 'Buscando 2º plano', desc: 'Versión gratis para fondo…', type: 'info' },
  { re: /sin versión de segundo plano/i, title: 'Sin 2º plano gratis', desc: 'YouTube exige pantalla encendida', type: 'warning' },
  { re: /segundo plano activado/i, title: '2º plano activado', type: 'success' },
  { re: /para seguir en .* plano/i, title: 'Un toque más', desc: 'Toca ▶ para seguir en 2º plano', type: 'info' },
  // Avisos del clima (título corto + frase colombiana aparte)
  { re: /tormenta eléctrica cerca/i, title: 'Tormenta cerca', desc: 'Mejor adentro, que eso está feo', type: 'warning' },
  { re: /lluvia \d+%/i, title: (t) => `${t.match(/(\d+)%/)?.[1] || ''}% de que llueva`, desc: 'Es muy probable que llueva hoy, lleva algo por si sales', type: 'info' },
  { re: /calor \d+°/i, title: (t) => `${t.match(/calor (\d+)°/)?.[1] || ''}°`, desc: 'El día está muy caliente, lo mejor es usar bloqueador', type: 'info' },
  { re: /uv \d+ por las nubes/i, title: 'UV por las nubes', desc: 'Ni se te ocurra salir sin bloqueador', type: 'warning' },
  { re: /frío de /i, title: 'Mañana fría', desc: 'Abrígate bien que está haciendo un frío bravo', type: 'warning' },
  { re: /avisos del clima activados/i, title: 'Avisos listos', desc: 'Te aviso de lluvia, calor, frío y más', type: 'success' },
  // Comunidad y chat
  { re: /no tiene temas reproducibles/i, title: 'Sin temas para sonar', type: 'warning' },
  { re: /ya no está disponible/i, title: 'Ya no disponible', type: 'warning' },
  { re: /abre comunidad para chatear/i, title: 'Ve a Comunidad', desc: 'Ahí está el chat', type: 'info' },
  { re: /toca de nuevo para borrar tus mensajes/i, title: '¿Borrar?', desc: 'Toca de nuevo para confirmar', type: 'warning' },
  { re: /tus mensajes fueron borrados/i, title: 'Mensajes borrados', type: 'info' },
  { re: /toca de nuevo para quitarlo/i, title: '¿Quitarlo?', desc: 'Toca de nuevo para confirmar', type: 'warning' },
  { re: /quitado de la playlist/i, title: 'Quitado', type: 'info' },
  { re: /se agregará al sincronizar/i, title: 'En cola', desc: 'Se agrega al sincronizar', type: 'info' },
  { re: /^no se pudo enviar$/i, title: 'No se envió', type: 'error' },
  { re: /entra con google para chatear/i, title: 'Entra para chatear', desc: 'Con Google en un toque', type: 'warning' },
  { re: /no se pudo abrir el directo/i, title: 'No se abrió', type: 'error' },
  { re: /entra con google para seguir/i, title: 'Entra para seguir', type: 'warning' },
  { re: /^siguiendo a /i, title: 'Siguiendo', type: 'success' },
  { re: /dejaste de seguir a/i, title: 'Dejaste de seguir', type: 'info' },
  { re: /no se pudo seguir/i, title: 'No se pudo seguir', type: 'error' },
  { re: /buscando versión reproducible/i, title: 'Buscando versión…', type: 'info' },
  { re: /no se pudo clonar/i, title: 'No se clonó', type: 'error' },
  { re: /clonada con \d+ temas/i, title: 'Playlist clonada', type: 'success' },
  { re: /sin temas reproducibles/i, title: 'Sin temas', type: 'warning' },
  // Boost de volumen
  { re: /volumen normal/i, title: 'Volumen normal', type: 'info' },
  { re: /volumen potenciado/i, title: 'Volumen potenciado', type: 'success' },
  { re: /boost no disponible/i, title: 'Boost no disponible', type: 'warning' },
  { re: /el boost solo vale/i, title: 'Solo en directos', desc: 'Audius o Local', type: 'warning' },
  // Local sonando fuera de su pestaña (favs, playlists, YouTube)
  { re: /tema local: suena/i, title: 'Local', desc: 'Esta canción es de Local, puedes escucharla en segundo plano', type: 'info' },
  { re: /ya no está en este dispositivo/i, title: 'Ya no está en Local', desc: 'Ese archivo se eliminó del dispositivo', type: 'warning' },
  // Local: aleatorio, vacío y eliminar con seguro
  { re: /modo aleatorio/i, title: 'Aleatorio', desc: 'Sonando sin orden', type: 'success' },
  { re: /vacío por aquí/i, title: 'Sin música local', desc: 'Toca Escanear canciones primero', type: 'warning' },
  { re: /toca de nuevo para eliminar de verdad/i, title: '¿Eliminar?', desc: 'Toca de nuevo para confirmar', type: 'warning' },
  // Carátulas reales con wifi
  { re: /necesitas wifi para buscar carátulas/i, title: 'Sin wifi', desc: 'Conéctate para buscar carátulas', type: 'warning' },
  { re: /buscando carátula/i, title: 'Buscando carátula…', type: 'info' },
  { re: /carátula real lista/i, title: 'Carátula real lista', type: 'success' },
  { re: /sin carátula real/i, title: 'Sin carátula real', desc: 'Queda la generada', type: 'warning' },
  { re: /todo con carátula real/i, title: 'Todo con carátula', type: 'success' },
  { re: /carátulas listas/i, title: 'Carátulas listas', type: 'success' },
  { re: /sin carátulas nuevas/i, title: 'Sin novedades', desc: 'No se encontró nada nuevo', type: 'info' },
  { re: /no se pudo completar/i, title: 'No se completó', type: 'error' },
  { re: /fallo youtube: reintentando/i, title: 'Uy, falló YouTube', desc: 'Reintentando, dame un seg…', type: 'error' },
  { re: /youtube falló/i, title: 'Uy, falló YouTube', desc: 'Intentemos de nuevo', type: 'error' },
  { re: /no permite reproducción externa/i, title: 'Ese video no se deja abrir', desc: 'Vamos con el siguiente', type: 'warning' },
  { re: /varios videos bloqueados/i, title: 'Uy, varios bloqueados seguidos', desc: 'Ábrelos en YouTube o dale siguiente', type: 'warning' },
  { re: /no se pudo reproducir$/i, title: 'Uy, no sonó', desc: 'Probemos con otro tema', type: 'error' },
  { re: /no se pudo abrir ese tema|no se encontró versión reproducible/i, title: 'Ese tema no apareció', desc: 'Probemos con otro', type: 'error' },
  { re: /no se pudo armar la radio|sin similares por ahora/i, title: 'La radio se quedó sin ideas', desc: 'Intenta con otro tema', type: 'warning' },
  { re: /la radio necesita un tema/i, title: 'La radio necesita un tema', type: 'warning' },
  { re: /youtube no responde|no responden/i, title: 'YouTube no contesta', desc: 'Espera un toque e intenta de nuevo', type: 'error' },
  { re: /verificación sin respuesta/i, title: 'Sin verificar, mostramos igual', type: 'warning' },
  { re: /se ocultaron \d+ no disponibles/i, title: 'Limpiamos la lista', type: 'info' },
  { re: /versión no oficial/i, title: 'Solo había versión no oficial', type: 'warning' },
  { re: /se reproducirá después/i, title: 'En cola', desc: 'Suena después de esta', type: 'success' },
  { re: /añadida a favoritos/i, title: 'Guardada en favoritos', type: 'success' },
  { re: /quitada de favoritos/i, title: 'Fuera de favoritos', type: 'info' },
  { re: /^radio: /i, title: null, type: 'info' },
  { re: /continuamos en/i, title: null, type: 'info' },
  { re: /listos \d+ de \d+/i, title: 'Álbum casi listo', type: 'info' },
  { re: /ese álbum no trajo|no se pudo abrir el álbum|no se pudo reproducir el álbum/i, title: 'Ese álbum no se dejó', desc: 'Prueba con otro', type: 'error' },
  { re: /esa categoría no trajo nada/i, title: 'Nada por aquí', desc: 'Intenta de nuevo', type: 'warning' },
  { re: /prueba con otro nombre/i, title: 'Sin resultados', type: 'info' },
  { re: /no se cargó el top/i, title: 'El top no cargó', desc: 'Intenta de nuevo', type: 'warning' },
  { re: /aún no tienes favoritos/i, title: 'Aún no hay favoritos', desc: 'Dale corazón a algo que te guste', type: 'info' },
  { re: /playlist vacía/i, title: 'Esa playlist está vacía', desc: 'Agrega temas primero', type: 'warning' },
  { re: /reintentando stream/i, title: 'Ese stream falló', desc: 'Reintentando…', type: 'warning' },
  { re: /ese stream falló, pasando/i, title: 'Ese stream no va', desc: 'Pasando al siguiente', type: 'warning' },
  { re: /esa radio no responde|esa radio falló|sin radios por ahora/i, title: 'Esa radio no contesta', desc: 'Prueba con otra', type: 'error' },
  { re: /radio quitada de favoritas/i, title: 'Fuera de favoritas', type: 'info' },
  { re: /radio en favoritas/i, title: 'Radio en favoritas', type: 'success' },
  { re: /recordatorio creado|recordatorio en nota creado/i, title: 'Anotado', type: 'success' },
  { re: /falta el texto o la fecha/i, title: 'Te faltó algo', desc: 'Ponle texto y fecha', type: 'warning' },
  { re: /notificaciones activadas/i, title: 'Listo, te avisamos', type: 'success' },
  { re: /permiso denegado/i, title: 'Sin permiso, sin avisos', type: 'warning' },
  { re: /no soporta notificaciones|no soporta avisos/i, title: 'Tu navegador no deja', type: 'warning' },
  { re: /no se pudo cargar el clima|no se pudo buscar lugares|no se pudo obtener tu ubicación/i, title: 'El clima se escondió', desc: 'Intenta de nuevo', type: 'warning' },
  { re: /^clima de /i, title: null, type: 'info' },
  { re: /sin gps/i, title: 'No hay GPS aquí', type: 'warning' },
  { re: /temporizador: .* en pausa|radio apagada/i, title: 'A mimir', desc: null, type: 'info' },
  { re: /apago en .* min/i, title: 'Temporizador puesto', type: 'info' },
  { re: /video activado|solo foto/i, title: null, type: 'info' },
  { re: /enlace copiado/i, title: 'Copiado', type: 'success' },
  { re: /no se pudo copiar/i, title: 'No se pudo copiar', type: 'error' },
  { re: /papelera vaciada/i, title: 'Papelera vaciada', type: 'success' },
  { re: /sin audio en esa carpeta/i, title: 'Nada que suene por aquí', desc: 'Esa carpeta no traía audio', type: 'warning' },
  { re: /se agregaron \d+ temas locales/i, title: 'Música local lista', type: 'success' },
  { re: /esos temas ya estaban/i, title: 'Esos ya estaban', type: 'info' },
  // Escaneo con acceso a carpeta: "Escaneo: 12 de 45 agregadas" -> tarjeta con conteo.
  { re: /escaneo: \d+ de \d+ agregadas/i, title: (t) => {
      const m = t.match(/(\d+) de (\d+)/);
      return m ? `Escaneo completo · ${m[1]} de ${m[2]}` : 'Escaneo completo';
    }, desc: (t) => {
      const m = t.match(/escaneo:\s*(\d+)\s*de\s*(\d+)/i);
      if (!m) return t;
      const added = +m[1]; const total = +m[2]; const rep = total - added;
      return added > 0 ? `${added} nuevas en tu Local${rep > 0 ? ` · ${rep} ya estaban` : ''}` : 'Todo ya estaba en tu Local';
    }, type: 'success' },
  { re: /primero escanea una carpeta/i, title: 'Sin carpeta aún', desc: 'Toca Escanear canciones primero', type: 'warning' },
  { re: /sin permiso, no se pudo re-escanear/i, title: 'Sin permiso', desc: 'Acepta el acceso para re-escanear', type: 'warning' },
  { re: /no se pudo (abrir la carpeta|re-escanear)/i, title: 'No se pudo escanear', desc: 'Intenta de nuevo', type: 'error' },
  { re: /tema local eliminado/i, title: 'Tema eliminado', type: 'info' },
  { re: /nota eliminada/i, title: 'Nota eliminada', type: 'info' },
  { re: /nota duplicada/i, title: 'Nota duplicada', type: 'success' },
  { re: /movida a papelera/i, title: 'A la papelera', type: 'info' },
  { re: /agregada a la playlist/i, title: 'Agregada', type: 'success' },
  { re: /ya estaba en la playlist/i, title: 'Esa ya estaba', type: 'info' },
  { re: /playlist ".*" creada/i, title: 'Playlist creada', type: 'success' },
  { re: /playlist eliminada/i, title: 'Playlist eliminada', type: 'info' },
  { re: /imagen muy pesada/i, title: 'Esa imagen pesa mucho', desc: 'Máx 4MB', type: 'warning' },
  { re: /meta ".*" creada/i, title: 'Meta creada', desc: 'Aporta poco a poco y la cumples', type: 'success' },
  { re: /aportaste .* a "/i, title: 'Aporte sumado', type: 'success' },
  { re: /¡meta ".*" completada/i, title: '¡Meta completada!', desc: 'Lo lograste, a celebrar', type: 'success' },
  { re: /meta eliminada/i, title: 'Meta eliminada', type: 'info' },
  { re: /ponle nombre y meta/i, title: 'Te faltó algo', desc: 'Ponle nombre y valor a la meta', type: 'warning' },
  { re: /no se pudo leer la imagen|no se pudo guardar/i, title: 'Uy, no se pudo', desc: 'Intenta de nuevo', type: 'error' },
];

const RULES_EXTRA = [
  { re: /youtube no carg[oó]/i, title: 'YouTube no cargó', desc: 'Revisa tu conexión o desactiva el bloqueador e intenta de nuevo', type: 'error' },
  { re: /conectando con youtube/i, title: 'Conectando con YouTube', desc: 'La primera vez tarda unos segundos', type: 'info' },
  { re: /tarda demasiado en arrancar/i, title: 'Tarda en arrancar', desc: 'Toca Reintentar o Siguiente', type: 'warning' },
  { re: /varios temas fallaron seguidos/i, title: 'Varios temas fallaron', desc: 'Se pausó la reproducción', type: 'warning' },
  { re: /audius no trajo nada/i, title: 'Audius sin resultados', desc: 'Prueba con indie o electrónica', type: 'warning' },
  { re: /audius no responde/i, title: 'Audius no contesta', desc: 'Espera un toque e intenta de nuevo', type: 'error' },
  { re: /spotify: no se pudo conectar/i, title: 'No se pudo conectar', desc: 'Spotify no respondió, intenta de nuevo', type: 'error' },
  { re: /no se pudo reproducir desde spotify/i, title: 'No sonó desde Spotify', desc: 'Prueba con otro tema', type: 'error' },
  { re: /sin versi[oó]n youtube para ese tema/i, title: 'Sin versión en YouTube', desc: 'Prueba con otro tema', type: 'warning' },
  { re: /no tiene link de youtube para descargar/i, title: 'Sin link para descargar', desc: 'Este tema no tiene link de YouTube', type: 'warning' },
  { re: /no se pudo abrir el login/i, title: 'No se abrió el login', desc: 'Intenta de nuevo en un momento', type: 'error' },
  { re: /ya hay un escaneo en curso/i, title: 'Escaneo en curso', desc: 'Espera a que termine', type: 'warning' },
  { re: /tu navegador pide elegir archivos/i, title: 'Elige los archivos', desc: 'Usa Agregar carpeta', type: 'warning' },
  { re: /esa carpeta se agreg[oó] manual/i, title: 'Carpeta manual', desc: 'Elige de nuevo la carpeta para actualizar', type: 'warning' },
  { re: /no se pudo quitar la carpeta/i, title: 'No se quitó la carpeta', desc: 'Intenta de nuevo', type: 'error' },
  { re: /no se pudo actualizar$/i, title: 'No se actualizó', desc: 'Intenta de nuevo', type: 'error' },
  { re: /entra con google para crear salas/i, title: 'Entra para crear salas', desc: 'Con Google en un toque', type: 'warning' },
];


const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
const GENERIC = { error: 'Uy, algo falló', warning: 'Ojo con esto', success: 'Listo', info: 'Aviso' };

/** Parte un mensaje suelto en título corto + descripción (nunca todo en el título). */
function compose(text, type) {
  const t = text.trim().replace(/\s+/g, ' ');
  if (!t) return { title: GENERIC[type] || 'Aviso' };
  // 1) Separadores naturales: "Título: detalle", "Título — detalle", "Título · detalle".
  const m = t.match(/^(.{3,42}?)(?:\s[—–-]\s|:\s|\s·\s|…\s|\.\s)(.{3,})$/);
  if (m) return { title: cap(m[1].replace(/[.:…]+$/, '')), description: cap(m[2].replace(/\.$/, '')) };
  // 2) Corto y sin más: va solo de título.
  if (t.length <= 36) return { title: t };
  // 2b) Largo con una coma: la primera parte es el título.
  const c = t.match(/^(.{6,36}?),\s(.{4,})$/);
  if (c) return { title: cap(c[1]), description: cap(c[2].replace(/\.$/, '')) };
  // 3) Largo sin separadores: título genérico del tipo + el mensaje completo de detalle.
  return { title: GENERIC[type] || 'Aviso', description: cap(t) };
}

/** Misma firma del toast anterior: notify(msg, Icon). Devuelve el id de sileo. */
export function notify(msg, I) {
  const text = String(msg ?? '');
  for (const r of [...RULES_EXTRA, ...RULES]) {
    if (r.re.test(text)) {
      // title/desc pueden ser función (títulos dinámicos como "85% de que llueva").
      const title = typeof r.title === 'function' ? r.title(text) : (r.title ?? text);
      const descRaw = typeof r.desc === 'function' ? r.desc(text) : r.desc;
      const desc = typeof descRaw === 'string' ? descRaw : (descRaw === null ? undefined : text);
      const opts = desc && desc !== title ? { title, description: desc } : { title };
      return sileo[r.type || typeOf(I)](opts);
    }
  }
  // Recordatorios que suenan: el texto del usuario va de descripción.
  if (I === BellRing || I === AlarmClock) {
    return sileo.info({ title: 'Oye, te recuerdo', description: text });
  }
  const kind = typeOf(I);
  return sileo[kind](compose(text, kind));
}

/** Flujo cargando → listo/fallo (ej. resolver un álbum). */
export function notifyJob(promise, { loading, ok, fail }) {
  return sileo.promise(promise, {
    loading,
    success: ok,
    error: fail,
  });
}
