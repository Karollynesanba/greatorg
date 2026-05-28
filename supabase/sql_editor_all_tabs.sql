-- Great Organico: full shared sync schema for Supabase
-- Run once in the SQL editor of the single Supabase project used by all environments.
-- This script creates the shared tables, opens RLS, grants access, and enables realtime.

begin;

create table if not exists public.team_profiles (
  id bigint primary key,
  name text not null,
  role text not null,
  avatar text not null default '',
  specialty text not null default '',
  color text not null default '#e50914',
  stats jsonb not null default '{}'::jsonb,
  radar jsonb not null default '[]'::jsonb,
  monthly_posts jsonb not null default '[]'::jsonb,
  email text not null unique,
  password text not null,
  avatar_url text not null default '',
  bio text not null default ''
);

create table if not exists public.goals (
  id bigint primary key,
  sort_order bigint not null default 0,
  data jsonb not null
);

create table if not exists public.ideas (
  id bigint primary key,
  sort_order bigint not null default 0,
  data jsonb not null
);

create table if not exists public.calendar_events (
  id bigint primary key,
  sort_order bigint not null default 0,
  data jsonb not null
);

create table if not exists public.history_events (
  id bigint primary key,
  sort_order bigint not null default 0,
  data jsonb not null
);

create table if not exists public.story_logs (
  id bigint primary key,
  sort_order bigint not null default 0,
  data jsonb not null
);

create table if not exists public.posts (
  id bigint primary key,
  sort_order bigint not null default 0,
  data jsonb not null
);

create table if not exists public.shared_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.team_profiles enable row level security;
alter table public.goals enable row level security;
alter table public.ideas enable row level security;
alter table public.calendar_events enable row level security;
alter table public.history_events enable row level security;
alter table public.story_logs enable row level security;
alter table public.posts enable row level security;
alter table public.shared_state enable row level security;

drop policy if exists "team_profiles_select_all" on public.team_profiles;
drop policy if exists "team_profiles_insert_all" on public.team_profiles;
drop policy if exists "team_profiles_update_all" on public.team_profiles;
drop policy if exists "team_profiles_delete_all" on public.team_profiles;

drop policy if exists "goals_select_all" on public.goals;
drop policy if exists "goals_insert_all" on public.goals;
drop policy if exists "goals_update_all" on public.goals;
drop policy if exists "goals_delete_all" on public.goals;

drop policy if exists "ideas_select_all" on public.ideas;
drop policy if exists "ideas_insert_all" on public.ideas;
drop policy if exists "ideas_update_all" on public.ideas;
drop policy if exists "ideas_delete_all" on public.ideas;

drop policy if exists "calendar_events_select_all" on public.calendar_events;
drop policy if exists "calendar_events_insert_all" on public.calendar_events;
drop policy if exists "calendar_events_update_all" on public.calendar_events;
drop policy if exists "calendar_events_delete_all" on public.calendar_events;

drop policy if exists "history_events_select_all" on public.history_events;
drop policy if exists "history_events_insert_all" on public.history_events;
drop policy if exists "history_events_update_all" on public.history_events;
drop policy if exists "history_events_delete_all" on public.history_events;

drop policy if exists "story_logs_select_all" on public.story_logs;
drop policy if exists "story_logs_insert_all" on public.story_logs;
drop policy if exists "story_logs_update_all" on public.story_logs;
drop policy if exists "story_logs_delete_all" on public.story_logs;

drop policy if exists "posts_select_all" on public.posts;
drop policy if exists "posts_insert_all" on public.posts;
drop policy if exists "posts_update_all" on public.posts;
drop policy if exists "posts_delete_all" on public.posts;

drop policy if exists "shared_state_select_all" on public.shared_state;
drop policy if exists "shared_state_insert_all" on public.shared_state;
drop policy if exists "shared_state_update_all" on public.shared_state;
drop policy if exists "shared_state_delete_all" on public.shared_state;

create policy "team_profiles_select_all"
on public.team_profiles
for select
using (true);

create policy "team_profiles_insert_all"
on public.team_profiles
for insert
with check (true);

create policy "team_profiles_update_all"
on public.team_profiles
for update
using (true)
with check (true);

create policy "team_profiles_delete_all"
on public.team_profiles
for delete
using (true);

create policy "goals_select_all"
on public.goals
for select
using (true);

create policy "goals_insert_all"
on public.goals
for insert
with check (true);

create policy "goals_update_all"
on public.goals
for update
using (true)
with check (true);

create policy "goals_delete_all"
on public.goals
for delete
using (true);

create policy "ideas_select_all"
on public.ideas
for select
using (true);

create policy "ideas_insert_all"
on public.ideas
for insert
with check (true);

create policy "ideas_update_all"
on public.ideas
for update
using (true)
with check (true);

create policy "ideas_delete_all"
on public.ideas
for delete
using (true);

create policy "calendar_events_select_all"
on public.calendar_events
for select
using (true);

create policy "calendar_events_insert_all"
on public.calendar_events
for insert
with check (true);

create policy "calendar_events_update_all"
on public.calendar_events
for update
using (true)
with check (true);

create policy "calendar_events_delete_all"
on public.calendar_events
for delete
using (true);

create policy "history_events_select_all"
on public.history_events
for select
using (true);

create policy "history_events_insert_all"
on public.history_events
for insert
with check (true);

create policy "history_events_update_all"
on public.history_events
for update
using (true)
with check (true);

create policy "history_events_delete_all"
on public.history_events
for delete
using (true);

create policy "story_logs_select_all"
on public.story_logs
for select
using (true);

create policy "story_logs_insert_all"
on public.story_logs
for insert
with check (true);

create policy "story_logs_update_all"
on public.story_logs
for update
using (true)
with check (true);

create policy "story_logs_delete_all"
on public.story_logs
for delete
using (true);

create policy "posts_select_all"
on public.posts
for select
using (true);

create policy "posts_insert_all"
on public.posts
for insert
with check (true);

create policy "posts_update_all"
on public.posts
for update
using (true)
with check (true);

create policy "posts_delete_all"
on public.posts
for delete
using (true);

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
grant select, insert, update, delete on public.team_profiles to anon, authenticated;
grant select, insert, update, delete on public.goals to anon, authenticated;
grant select, insert, update, delete on public.ideas to anon, authenticated;
grant select, insert, update, delete on public.calendar_events to anon, authenticated;
grant select, insert, update, delete on public.history_events to anon, authenticated;
grant select, insert, update, delete on public.story_logs to anon, authenticated;
grant select, insert, update, delete on public.posts to anon, authenticated;
grant select, insert, update, delete on public.shared_state to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'team_profiles'
  ) then
    alter publication supabase_realtime add table public.team_profiles;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'goals'
  ) then
    alter publication supabase_realtime add table public.goals;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ideas'
  ) then
    alter publication supabase_realtime add table public.ideas;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'calendar_events'
  ) then
    alter publication supabase_realtime add table public.calendar_events;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'history_events'
  ) then
    alter publication supabase_realtime add table public.history_events;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'story_logs'
  ) then
    alter publication supabase_realtime add table public.story_logs;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'shared_state'
  ) then
    alter publication supabase_realtime add table public.shared_state;
  end if;
end
$$;

commit;
