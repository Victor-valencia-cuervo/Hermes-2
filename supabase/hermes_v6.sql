-- HERMES v6: carátula en mensajes + presencia + playlists públicas + borrado compartido.
-- Ejecutar una vez en Supabase > SQL Editor. Todo es idempotente (puede correrse de nuevo).

-- 1. Carátula de la canción compartida en el chat
alter table public.messages add column if not exists song_art text default '';

-- 2. Presencia: lo que suena ahora + switch de privacidad
alter table public.users add column if not exists now_playing jsonb;
alter table public.users add column if not exists now_playing_at bigint default 0;
alter table public.users add column if not exists show_nowplaying boolean default true;

-- 3. Perfiles legibles por todos (la app ya los lee para Comunidad)
alter table public.users enable row level security;
drop policy if exists "users_read_all_v6" on public.users;
create policy "users_read_all_v6" on public.users for select using (true);
drop policy if exists "users_update_own_v6" on public.users;
create policy "users_update_own_v6" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 4. Playlists publicadas legibles por todos (ver y clonar desde el perfil ajeno)
alter table public.playlists enable row level security;
drop policy if exists "playlists_read_public_v6" on public.playlists;
create policy "playlists_read_public_v6" on public.playlists
  for select using (is_public = true);

-- 5. En salas y directos los dos pueden quitar canciones (agregar ya se podía)
drop policy if exists "room_tracks_delete_shared_v6" on public.room_tracks;
create policy "room_tracks_delete_shared_v6" on public.room_tracks
  for delete using (true);
