-- Great OrgÃ¢nico / Supabase schema
-- Apply this in the Supabase SQL editor.
-- The app already points to Supabase via VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.

create extension if not exists pgcrypto;

create table if not exists public.team_profiles (
  id bigint primary key,
  user_id uuid not null unique,
  name text not null,
  role text not null,
  avatar text not null default '',
  specialty text not null default '',
  color text not null default '#e50914',
  stats jsonb not null default '{}'::jsonb,
  radar jsonb not null default '[]'::jsonb,
  monthly_posts jsonb not null default '[]'::jsonb,
  email text not null unique,
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

create table if not exists public.app_preferences (
  user_id uuid not null,
  key text not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create or replace function public.bootstrap_demo_account(demo_email text, demo_password text)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  normalized_email text := lower(trim(demo_email));
  allowed_password text := 'Great2026!';
begin
  if normalized_email not in (
    'brendarayssa2706@gmail.com',
    'hannahleticia13@gmail.com',
    'thiagomarquesdev23@hotmail.com'
  ) then
    raise exception 'Demo account not allowed';
  end if;

  if demo_password <> allowed_password then
    raise exception 'Invalid demo password';
  end if;

  insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    case normalized_email
      when 'brendarayssa2706@gmail.com' then '4b8a4d0f-6f9e-4c3d-9a1d-2e1f4d58d101'
      when 'hannahleticia13@gmail.com' then '2c1b7d5f-88a4-4b7b-8cb5-7d8a6f5c2b02'
      else '7d8a2c11-0f4e-4e7b-b0a9-3f9d77a1c303'
    end,
    'authenticated',
    'authenticated',
    normalized_email,
    crypt(demo_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
  on conflict (email) do update
  set
    encrypted_password = excluded.encrypted_password,
    email_confirmed_at = now(),
    updated_at = now();

  return true;
end;
$$;

grant execute on function public.bootstrap_demo_account(text, text) to anon, authenticated;

alter table public.team_profiles enable row level security;
alter table public.goals enable row level security;
alter table public.ideas enable row level security;
alter table public.calendar_events enable row level security;
alter table public.history_events enable row level security;
alter table public.story_logs enable row level security;
alter table public.posts enable row level security;
alter table public.app_preferences enable row level security;

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

drop policy if exists "app_preferences_select_own" on public.app_preferences;
drop policy if exists "app_preferences_insert_own" on public.app_preferences;
drop policy if exists "app_preferences_update_own" on public.app_preferences;
drop policy if exists "app_preferences_delete_own" on public.app_preferences;

create policy "team_profiles_select_all"
on public.team_profiles
for select
using (auth.role() = 'authenticated');

create policy "team_profiles_insert_all"
on public.team_profiles
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "team_profiles_update_all"
on public.team_profiles
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "team_profiles_delete_all"
on public.team_profiles
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '4b8a4d0f-6f9e-4c3d-9a1d-2e1f4d58d101',
    'authenticated',
    'authenticated',
    'brendarayssa2706@gmail.com',
    crypt('Great2026!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Brenda"}'::jsonb,
    now(),
    now()
  ),
  (
    '2c1b7d5f-88a4-4b7b-8cb5-7d8a6f5c2b02',
    'authenticated',
    'authenticated',
    'hannahleticia13@gmail.com',
    crypt('Great2026!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Hannah"}'::jsonb,
    now(),
    now()
  ),
  (
    '7d8a2c11-0f4e-4e7b-b0a9-3f9d77a1c303',
    'authenticated',
    'authenticated',
    'thiagomarquesdev23@hotmail.com',
    crypt('Great2026!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Thiago"}'::jsonb,
    now(),
    now()
  )
on conflict (email) do update
set
  id = excluded.id,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = excluded.updated_at;

create policy "goals_select_all"
on public.goals
for select
using (auth.role() = 'authenticated');

create policy "goals_insert_all"
on public.goals
for insert
with check (auth.role() = 'authenticated');

create policy "goals_update_all"
on public.goals
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "goals_delete_all"
on public.goals
for delete
using (auth.role() = 'authenticated');

create policy "ideas_select_all"
on public.ideas
for select
using (auth.role() = 'authenticated');

create policy "ideas_insert_all"
on public.ideas
for insert
with check (auth.role() = 'authenticated');

create policy "ideas_update_all"
on public.ideas
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "ideas_delete_all"
on public.ideas
for delete
using (auth.role() = 'authenticated');

create policy "calendar_events_select_all"
on public.calendar_events
for select
using (auth.role() = 'authenticated');

create policy "calendar_events_insert_all"
on public.calendar_events
for insert
with check (auth.role() = 'authenticated');

create policy "calendar_events_update_all"
on public.calendar_events
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "calendar_events_delete_all"
on public.calendar_events
for delete
using (auth.role() = 'authenticated');

create policy "history_events_select_all"
on public.history_events
for select
using (auth.role() = 'authenticated');

create policy "history_events_insert_all"
on public.history_events
for insert
with check (auth.role() = 'authenticated');

create policy "history_events_update_all"
on public.history_events
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "history_events_delete_all"
on public.history_events
for delete
using (auth.role() = 'authenticated');

create policy "story_logs_select_all"
on public.story_logs
for select
using (auth.role() = 'authenticated');

create policy "story_logs_insert_all"
on public.story_logs
for insert
with check (auth.role() = 'authenticated');

create policy "story_logs_update_all"
on public.story_logs
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "story_logs_delete_all"
on public.story_logs
for delete
using (auth.role() = 'authenticated');

create policy "posts_select_all"
on public.posts
for select
using (auth.role() = 'authenticated');

create policy "posts_insert_all"
on public.posts
for insert
with check (auth.role() = 'authenticated');

create policy "posts_update_all"
on public.posts
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "posts_delete_all"
on public.posts
for delete
using (auth.role() = 'authenticated');

create policy "app_preferences_select_own"
on public.app_preferences
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "app_preferences_insert_own"
on public.app_preferences
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "app_preferences_update_own"
on public.app_preferences
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "app_preferences_delete_own"
on public.app_preferences
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

insert into public.team_profiles (
  id,
  user_id,
  name,
  role,
  avatar,
  specialty,
  color,
  stats,
  radar,
  monthly_posts,
  email,
  avatar_url,
  bio
)
values
  (
    1,
    '4b8a4d0f-6f9e-4c3d-9a1d-2e1f4d58d101',
    'Brenda',
    'VÃ­deo Maker',
    'B',
    'GravaÃ§Ã£o, ediÃ§Ã£o e reels',
    '#833AB4',
    '{"postsCreated":42,"avgEngagement":7.8,"goalsCompleted":5,"performance":91,"punctuality":94}'::jsonb,
    '[{"subject":"Criatividade","value":92},{"subject":"Pontualidade","value":94},{"subject":"Qualidade","value":90},{"subject":"Engajamento","value":88},{"subject":"Produtividade","value":86}]'::jsonb,
    '[{"month":"Jan","posts":8},{"month":"Fev","posts":9},{"month":"Mar","posts":11},{"month":"Abr","posts":14}]'::jsonb,
    'brendarayssa2706@gmail.com',
    '',
    'GravaÃ§Ã£o, ediÃ§Ã£o e reels'
  ),
  (
    2,
    '2c1b7d5f-88a4-4b7b-8cb5-7d8a6f5c2b02',
    'Hannah',
    'Designer de Social',
    'H',
    'Artes estÃ¡ticas e stories',
    '#E1306C',
    '{"postsCreated":38,"avgEngagement":6.9,"goalsCompleted":4,"performance":88,"punctuality":96}'::jsonb,
    '[{"subject":"Criatividade","value":89},{"subject":"Pontualidade","value":96},{"subject":"Qualidade","value":91},{"subject":"Engajamento","value":82},{"subject":"Produtividade","value":87}]'::jsonb,
    '[{"month":"Jan","posts":10},{"month":"Fev","posts":8},{"month":"Mar","posts":9},{"month":"Abr","posts":11}]'::jsonb,
    'hannahleticia13@gmail.com',
    '',
    'Artes estÃ¡ticas e stories'
  ),
  (
    3,
    '7d8a2c11-0f4e-4e7b-b0a9-3f9d77a1c303',
    'Thiago',
    'Designer Editorial',
    'T',
    'CarrossÃ©is e capas',
    '#FCAF45',
    '{"postsCreated":35,"avgEngagement":7.2,"goalsCompleted":4,"performance":86,"punctuality":89}'::jsonb,
    '[{"subject":"Criatividade","value":86},{"subject":"Pontualidade","value":89},{"subject":"Qualidade","value":92},{"subject":"Engajamento","value":84},{"subject":"Produtividade","value":83}]'::jsonb,
    '[{"month":"Jan","posts":7},{"month":"Fev","posts":8},{"month":"Mar","posts":9},{"month":"Abr","posts":11}]'::jsonb,
    'thiagomarquesdev23@hotmail.com',
    '',
    'CarrossÃ©is e capas'
  )
on conflict (id) do update
set
  user_id = excluded.user_id,
  name = excluded.name,
  role = excluded.role,
  avatar = excluded.avatar,
  specialty = excluded.specialty,
  color = excluded.color,
  stats = excluded.stats,
  radar = excluded.radar,
  monthly_posts = excluded.monthly_posts,
  email = excluded.email,
  avatar_url = excluded.avatar_url,
  bio = excluded.bio;


