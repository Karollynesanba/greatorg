alter table public.story_logs add column if not exists user_id uuid;
alter table public.history_events add column if not exists user_id uuid;
alter table public.calendar_events add column if not exists user_id uuid;
alter table public.goals add column if not exists user_id uuid;
alter table public.ideas add column if not exists user_id uuid;
alter table public.posts add column if not exists user_id uuid;

create index if not exists story_logs_user_id_idx on public.story_logs (user_id);
create index if not exists history_events_user_id_idx on public.history_events (user_id);
create index if not exists calendar_events_user_id_idx on public.calendar_events (user_id);
create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists ideas_user_id_idx on public.ideas (user_id);
create index if not exists posts_user_id_idx on public.posts (user_id);

create table if not exists public.story_goal_metrics (
  user_id uuid not null,
  month_key text not null,
  category text not null check (category in ('total', 'video', 'photo')),
  current_value integer not null default 0,
  goal_value integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month_key, category)
);

create table if not exists public.story_metrics (
  user_id uuid not null,
  month_key text not null,
  metric text not null check (metric in ('views', 'reach')),
  value integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month_key, metric)
);

alter table public.story_logs enable row level security;
alter table public.history_events enable row level security;
alter table public.calendar_events enable row level security;
alter table public.goals enable row level security;
alter table public.ideas enable row level security;
alter table public.posts enable row level security;
alter table public.story_goal_metrics enable row level security;
alter table public.story_metrics enable row level security;

drop policy if exists "story_logs_select_all" on public.story_logs;
drop policy if exists "story_logs_insert_all" on public.story_logs;
drop policy if exists "story_logs_update_all" on public.story_logs;
drop policy if exists "story_logs_delete_all" on public.story_logs;
drop policy if exists "history_events_select_all" on public.history_events;
drop policy if exists "history_events_insert_all" on public.history_events;
drop policy if exists "history_events_update_all" on public.history_events;
drop policy if exists "history_events_delete_all" on public.history_events;
drop policy if exists "calendar_events_select_all" on public.calendar_events;
drop policy if exists "calendar_events_insert_all" on public.calendar_events;
drop policy if exists "calendar_events_update_all" on public.calendar_events;
drop policy if exists "calendar_events_delete_all" on public.calendar_events;
drop policy if exists "goals_select_all" on public.goals;
drop policy if exists "goals_insert_all" on public.goals;
drop policy if exists "goals_update_all" on public.goals;
drop policy if exists "goals_delete_all" on public.goals;
drop policy if exists "ideas_select_all" on public.ideas;
drop policy if exists "ideas_insert_all" on public.ideas;
drop policy if exists "ideas_update_all" on public.ideas;
drop policy if exists "ideas_delete_all" on public.ideas;
drop policy if exists "posts_select_all" on public.posts;
drop policy if exists "posts_insert_all" on public.posts;
drop policy if exists "posts_update_all" on public.posts;
drop policy if exists "posts_delete_all" on public.posts;

drop policy if exists "story_goal_metrics_select_own" on public.story_goal_metrics;
drop policy if exists "story_goal_metrics_insert_own" on public.story_goal_metrics;
drop policy if exists "story_goal_metrics_update_own" on public.story_goal_metrics;
drop policy if exists "story_goal_metrics_delete_own" on public.story_goal_metrics;
drop policy if exists "story_metrics_select_own" on public.story_metrics;
drop policy if exists "story_metrics_insert_own" on public.story_metrics;
drop policy if exists "story_metrics_update_own" on public.story_metrics;
drop policy if exists "story_metrics_delete_own" on public.story_metrics;

create policy "story_logs_select_own"
on public.story_logs
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_logs_insert_own"
on public.story_logs
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_logs_update_own"
on public.story_logs
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_logs_delete_own"
on public.story_logs
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "history_events_select_own"
on public.history_events
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "history_events_insert_own"
on public.history_events
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "history_events_update_own"
on public.history_events
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "history_events_delete_own"
on public.history_events
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "calendar_events_select_own"
on public.calendar_events
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "calendar_events_insert_own"
on public.calendar_events
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "calendar_events_update_own"
on public.calendar_events
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "calendar_events_delete_own"
on public.calendar_events
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "goals_select_own"
on public.goals
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "goals_insert_own"
on public.goals
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "goals_update_own"
on public.goals
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "goals_delete_own"
on public.goals
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "ideas_select_own"
on public.ideas
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "ideas_insert_own"
on public.ideas
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "ideas_update_own"
on public.ideas
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "ideas_delete_own"
on public.ideas
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "posts_select_own"
on public.posts
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "posts_insert_own"
on public.posts
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "posts_update_own"
on public.posts
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "posts_delete_own"
on public.posts
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_goal_metrics_select_own"
on public.story_goal_metrics
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_goal_metrics_insert_own"
on public.story_goal_metrics
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_goal_metrics_update_own"
on public.story_goal_metrics
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_goal_metrics_delete_own"
on public.story_goal_metrics
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_metrics_select_own"
on public.story_metrics
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_metrics_insert_own"
on public.story_metrics
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_metrics_update_own"
on public.story_metrics
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_metrics_delete_own"
on public.story_metrics
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

grant select, insert, update, delete on public.story_goal_metrics to authenticated;
grant select, insert, update, delete on public.story_metrics to authenticated;
