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

-- Development-friendly option:
-- Require Supabase Auth so profile access is tied to the signed-in user.
alter table public.team_profiles enable row level security;

drop policy if exists "team_profiles_select_all" on public.team_profiles;
drop policy if exists "team_profiles_insert_all" on public.team_profiles;
drop policy if exists "team_profiles_update_all" on public.team_profiles;
drop policy if exists "team_profiles_delete_all" on public.team_profiles;

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
