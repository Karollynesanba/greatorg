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

alter table public.goals enable row level security;
alter table public.ideas enable row level security;
alter table public.calendar_events enable row level security;
alter table public.history_events enable row level security;
alter table public.story_logs enable row level security;

do $$ begin
  execute 'drop policy if exists "goals_select_all" on public.goals';
  execute 'drop policy if exists "goals_insert_all" on public.goals';
  execute 'drop policy if exists "goals_update_all" on public.goals';
  execute 'drop policy if exists "goals_delete_all" on public.goals';

  execute 'drop policy if exists "ideas_select_all" on public.ideas';
  execute 'drop policy if exists "ideas_insert_all" on public.ideas';
  execute 'drop policy if exists "ideas_update_all" on public.ideas';
  execute 'drop policy if exists "ideas_delete_all" on public.ideas';

  execute 'drop policy if exists "calendar_events_select_all" on public.calendar_events';
  execute 'drop policy if exists "calendar_events_insert_all" on public.calendar_events';
  execute 'drop policy if exists "calendar_events_update_all" on public.calendar_events';
  execute 'drop policy if exists "calendar_events_delete_all" on public.calendar_events';

  execute 'drop policy if exists "history_events_select_all" on public.history_events';
  execute 'drop policy if exists "history_events_insert_all" on public.history_events';
  execute 'drop policy if exists "history_events_update_all" on public.history_events';
  execute 'drop policy if exists "history_events_delete_all" on public.history_events';

  execute 'drop policy if exists "story_logs_select_all" on public.story_logs';
  execute 'drop policy if exists "story_logs_insert_all" on public.story_logs';
  execute 'drop policy if exists "story_logs_update_all" on public.story_logs';
  execute 'drop policy if exists "story_logs_delete_all" on public.story_logs';
end $$;

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
