-- Great Organico: shared sync setup for Supabase
-- Cole este SQL no editor do Supabase do projeto que todos os ambientes usam.
-- Ele nao apaga dados existentes.

begin;

create table if not exists public.shared_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.shared_state enable row level security;

drop policy if exists "shared_state_select_all" on public.shared_state;
drop policy if exists "shared_state_insert_all" on public.shared_state;
drop policy if exists "shared_state_update_all" on public.shared_state;
drop policy if exists "shared_state_delete_all" on public.shared_state;

create policy "shared_state_select_all"
on public.shared_state
for select
using (true);

create policy "shared_state_insert_all"
on public.shared_state
for insert
with check (true);

create policy "shared_state_update_all"
on public.shared_state
for update
using (true)
with check (true);

create policy "shared_state_delete_all"
on public.shared_state
for delete
using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.shared_state to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_tables pt on pt.pubid = p.oid
    join pg_class c on c.oid = pt.relid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'shared_state'
  ) then
    alter publication supabase_realtime add table public.shared_state;
  end if;

  if not exists (
    select 1
    from pg_publication p
    join pg_publication_tables pt on pt.pubid = p.oid
    join pg_class c on c.oid = pt.relid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'team_profiles'
  ) then
    alter publication supabase_realtime add table public.team_profiles;
  end if;

  if not exists (
    select 1
    from pg_publication p
    join pg_publication_tables pt on pt.pubid = p.oid
    join pg_class c on c.oid = pt.relid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'goals'
  ) then
    alter publication supabase_realtime add table public.goals;
  end if;

  if not exists (
    select 1
    from pg_publication p
    join pg_publication_tables pt on pt.pubid = p.oid
    join pg_class c on c.oid = pt.relid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'ideas'
  ) then
    alter publication supabase_realtime add table public.ideas;
  end if;

  if not exists (
    select 1
    from pg_publication p
    join pg_publication_tables pt on pt.pubid = p.oid
    join pg_class c on c.oid = pt.relid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'calendar_events'
  ) then
    alter publication supabase_realtime add table public.calendar_events;
  end if;

  if not exists (
    select 1
    from pg_publication p
    join pg_publication_tables pt on pt.pubid = p.oid
    join pg_class c on c.oid = pt.relid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'history_events'
  ) then
    alter publication supabase_realtime add table public.history_events;
  end if;

  if not exists (
    select 1
    from pg_publication p
    join pg_publication_tables pt on pt.pubid = p.oid
    join pg_class c on c.oid = pt.relid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'story_logs'
  ) then
    alter publication supabase_realtime add table public.story_logs;
  end if;

  if not exists (
    select 1
    from pg_publication p
    join pg_publication_tables pt on pt.pubid = p.oid
    join pg_class c on c.oid = pt.relid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end
$$;
commit;
