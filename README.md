<div align="center">

<img src="public/icon/hermes-icon.png" alt="Hermes" width="120" />

#  Hermes

### Tu panel personal: música, radios, mascotas, clima y más

**Rápido · Privado · Offline-first · Instalable (PWA)**

[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-cloud-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![PWA](https://img.shields.io/badge/PWA-instalable-5A0FC8)](https://web.dev/progressive-web-apps/)

** Demo:** https://hermes06.pages.dev/

[Características](#-características) · [Instalación](#-instalación) · [Configuración](#️-configuración) · [Uso](#-uso) · [Despliegue](#-despliegue)

</div>

---

##  Características

### 🎵 Música
- **Reproductor local** — lee tus archivos de audio (MP3, etc.) con carátulas, metadatos y modo offline.
- **Playlists** — crea, edita, reordena y comparte playlists. Hero con colores extraídos del arte.
- **Fuentes online** — YouTube, Audius, charts por país, categorías (Pop, Rock, Salsa, Vallenato, Phonk…).
- **Spotify** — conexión por PKCE, panel dedicado y reproductor completo estilo Spotify.
- **Letras, artista y covers** automáticos + sugerencias y pre-carga.
- **4 reproductores full-screen**: Clásico, Onda, BitChord y Spotify.
- **Extras**: aleatorio, repetición, PiP, Wake Lock, agitar para siguiente ⏭️, estadísticas de escucha.

### 📻 Radios del mundo
- Catálogo de radios online, barra mini + vista completa, historial y favoritas.

###  Mascotas virtuales
- +40 mascotas (Rick, Morty, dragones, ninja, stitch…), estados de ánimo, frases, efectos, Pet Studio y modo celebración.

###  Clima +  Zen +  Vida diaria
- **Clima** con alertas, saludo según hora y fondo reactivo.
- **Zen** con videos relajantes, **Finanzas**, **Notas** con colores, **Recordatorios** con notificaciones, **Atajos** personalizables y **Herramientas**.

###  Comunidad
- Perfiles, salas de chat en tiempo real, playlists de sala y presencia (quién está en línea).
- Sincronización en la nube con **Supabase** (opcional: sin claves funciona 100% local).

###  PWA
- Instalable en Android / iOS / escritorio, icono propio, splash, service worker y modo offline.

---

##  Stack

| Capa | Tecnología |
|---|---|
| UI | React 18 + Vite 6 + Tailwind CSS 4 + Lucide + styled-components |
| Estado | Hooks propios (`usePlayer`, `usePlaylists`, `useLocalTracks`, `useStore`…) + IndexedDB |
| Nube | Supabase (auth + postgres + realtime) — ver `supabase/` |
| Fuentes | Audius API, YouTube/Piped, Spotify Web API (PKCE), Worker YTMix |
| PWA | `manifest.webmanifest` + `public/sw.js` |
| Deploy | Cloudflare Pages (`hermes06.pages.dev`) + Wrangler |

---

##  Instalación

```bash
npm install
npm run dev      # desarrollo → http://localhost:5173
npm run build    # producción → dist/
npm run preview  # vista previa del build
```

> Requiere **Node 18+**.

---

## ⚙️ Configuración

Copia el ejemplo y rellena solo lo que uses. **Todo es opcional**: sin claves la app funciona en local.

```bash
cp .env.example .env
```

| Variable | Para qué |
|---|---|
| `VITE_AUDIUS_APP_NAME` | Nombre de app registrado en Audius |
| `VITE_AUDIUS_API_KEY` | Clave pública de Audius (nunca el Bearer) |
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave `sb_publishable_…` (nunca la `service_role`) |
| `VITE_YTMIX_URL` | URL de tu Worker de mezcla YT (ej. `https://tu-worker.workers.dev`) |
| `VITE_SPOTIFY_CLIENT_ID` | Client ID de Spotify (PKCE, sin secret) |

### 🗄️ Supabase
Ejecuta en tu proyecto el SQL de `supabase/` en orden:
1. `hermes_v5.sql`
2. `hermes_v6.sql`

---

## 📖 Uso

| Vista | Ruta mental | Qué haces |
|---|---|---|
| 🏠 Inicio | `home` | Saludo, clima, accesos, mascota |
| 🎵 Música | `music` | Buscar, playlists, charts, Spotify, YouTube |
| 📻 Radios | `radios` | Escuchar radios del mundo |
| 🐾 Mascotas | Pet Layer | Elegir, animar y configurar tu compañero |
| 🌦️ Clima | `weather` | Pronóstico + alertas |
| 📝 Notas / ⏰ Recordatorios | `notes` / `reminders` | Organizar tu día |
| 👥 Comunidad / 💬 Chat | `community` / `chat` | Salas y mensajes en vivo |
| 🧘 Zen / 💰 Finanzas | `zen` / `finance` | Relajarte y llevar cuentas |

**Trucos:**
- `?seguro=1` al final de la URL → arranque limpio (ignora datos locales corruptos).
- Agita el móvil → siguiente canción.
- Todo se guarda local (IndexedDB + localStorage); la nube solo sincroniza si configuras Supabase.

---

##  Estructura

```
├── index.html              # SEO, OG, PWA, boot de emergencia
├── public/                 # iconos, caritas, pets, videos zen, sw.js, manifest
│   ├── caritas/ pets/ videos/ icon/
├── src/
│   ├── App.jsx             # shell + lazy views
│   ├── views/              # Home, Music, Radios, Weather, Notes, Zen…
│   ├── components/         # PlayerBar, FullPlayer*, TrackRow, Sidebar…
│   ├── hooks/              # usePlayer, useLocalTracks, useRadio, useAuth…
│   ├── services/           # youtube, audius, spotify, supabase, weather…
│   ├── pets/               # catálogo, motor y estudio de mascotas
│   └── lib/                # audio, artwork, notify, pip, format…
├── supabase/               # SQL v5, v6
└── assets-src/             # fuentes originales de mascotas
```

---

##  Despliegue

**Cloudflare Pages** (actual: `hermes06.pages.dev`):
```bash
npm run build          # genera dist/
npx wrangler pages deploy dist
```

Variables de entorno → configúralas en el panel de Pages (las mismas `VITE_*`).

---

## Privacidad

- Local-first: tu música y datos viven en tu dispositivo.
- Las claves `VITE_*` son públicas por diseño; **jamás** pongas secrets, Bearer Tokens ni `service_role` en el frontend.
- El `.env` real está en `.gitignore` y no se sube al repo.

---

##  Licencia

Proyecto privado — todos los derechos reservados. Si lo haces público, agrega aquí tu licencia (ej. MIT).

---

<div align="center">

Hecho con 💜 por **Víctor Valencia** · Hermes v4.1.0

⬆️ [Volver arriba](#-hermes)

</div>

---

##  Versión móvil (APK Android)

Hermes empaquetado con **Capacitor**. Mismo código web, sin login obligatorio (Supabase/Google es opcional).

- **Segundo plano:** servicio en primer plano (`mediaPlayback`) + Media Session (controles en pantalla de bloqueo/Bluetooth). Ver `src/lib/native-bg.js`.
- **Compilar APK:** en GitHub → *Actions → Build APK → Run workflow* y descarga `hermes-debug-apk`. O local: `npm run android:sync && npm run android:open` (Android Studio, JDK 21).
- **Límite:** YouTube embebido se pausa en segundo plano (sus términos). Para que siga sonando, Hermes usa el "gemelo" de Audius, tus archivos locales y las radios.
