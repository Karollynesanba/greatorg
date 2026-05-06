-- Great Orgânico / Supabase schema
-- Apply this in the Supabase SQL editor.
-- The app already points to Supabase via VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.

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

alter table public.team_profiles enable row level security;
alter table public.goals enable row level security;
alter table public.ideas enable row level security;
alter table public.calendar_events enable row level security;
alter table public.history_events enable row level security;
alter table public.story_logs enable row level security;
alter table public.posts enable row level security;

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

insert into public.team_profiles (
  id,
  name,
  role,
  avatar,
  specialty,
  color,
  stats,
  radar,
  monthly_posts,
  email,
  password,
  avatar_url,
  bio
)
values
  (
    1,
    'Brenda',
    'Vídeo Maker',
    'B',
    'Gravação, edição e reels',
    '#833AB4',
    '{"postsCreated":42,"avgEngagement":7.8,"goalsCompleted":5,"performance":91,"punctuality":94}'::jsonb,
    '[{"subject":"Criatividade","value":92},{"subject":"Pontualidade","value":94},{"subject":"Qualidade","value":90},{"subject":"Engajamento","value":88},{"subject":"Produtividade","value":86}]'::jsonb,
    '[{"month":"Jan","posts":8},{"month":"Fev","posts":9},{"month":"Mar","posts":11},{"month":"Abr","posts":14}]'::jsonb,
    'brendarayssa2706@gmail.com',
    'Great2026!',
    '',
    'Gravação, edição e reels'
  ),
  (
    2,
    'Hannah',
    'Designer de Social',
    'H',
    'Artes estáticas e stories',
    '#E1306C',
    '{"postsCreated":38,"avgEngagement":6.9,"goalsCompleted":4,"performance":88,"punctuality":96}'::jsonb,
    '[{"subject":"Criatividade","value":89},{"subject":"Pontualidade","value":96},{"subject":"Qualidade","value":91},{"subject":"Engajamento","value":82},{"subject":"Produtividade","value":87}]'::jsonb,
    '[{"month":"Jan","posts":10},{"month":"Fev","posts":8},{"month":"Mar","posts":9},{"month":"Abr","posts":11}]'::jsonb,
    'thiagomarquesdev23@hotmail.com',
    'Great2026!',
    '',
    'Artes estáticas e stories'
  ),
  (
    3,
    'Thiago',
    'Designer Editorial',
    'T',
    'Carrosséis e capas',
    '#FCAF45',
    '{"postsCreated":35,"avgEngagement":7.2,"goalsCompleted":4,"performance":86,"punctuality":89}'::jsonb,
    '[{"subject":"Criatividade","value":86},{"subject":"Pontualidade","value":89},{"subject":"Qualidade","value":92},{"subject":"Engajamento","value":84},{"subject":"Produtividade","value":83}]'::jsonb,
    '[{"month":"Jan","posts":7},{"month":"Fev","posts":8},{"month":"Mar","posts":9},{"month":"Abr","posts":11}]'::jsonb,
    'hannahleticia13@gmail.com',
    'Great2026!',
    '',
    'Carrosséis e capas'
  )
on conflict (id) do update
set
  name = excluded.name,
  role = excluded.role,
  avatar = excluded.avatar,
  specialty = excluded.specialty,
  color = excluded.color,
  stats = excluded.stats,
  radar = excluded.radar,
  monthly_posts = excluded.monthly_posts,
  email = excluded.email,
  password = excluded.password,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio;
