-- HERMES v5: iconos de sala + reacciones. Ejecutar una vez en Supabase > SQL Editor.
alter table public.rooms add column if not exists icon  text default '';
alter table public.rooms add column if not exists color text default '';

create table if not exists public.message_reactions (
  id         text primary key,            -- `${message_id}:${user_id}:${emoji}`
  room_id    text not null,
  message_id text not null,
  user_id    uuid not null default auth.uid(),
  emoji      text not null,
  created_at bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create index if not exists message_reactions_room_idx on public.message_reactions (room_id);

alter table public.message_reactions enable row level security;
drop policy if exists "reactions_read"   on public.message_reactions;
drop policy if exists "reactions_insert" on public.message_reactions;
drop policy if exists "reactions_delete" on public.message_reactions;
create policy "reactions_read"   on public.message_reactions for select using (true);
create policy "reactions_insert" on public.message_reactions for insert with check (user_id = auth.uid());
create policy "reactions_delete" on public.message_reactions for delete using (user_id = auth.uid());

alter publication supabase_realtime add table public.message_reactions;
