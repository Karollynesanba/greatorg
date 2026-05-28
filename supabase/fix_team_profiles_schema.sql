-- Great Organico: fix team_profiles columns for the current app schema
-- Run this in the Supabase SQL editor if the team_profiles table was created earlier without these columns.

alter table public.team_profiles
  add column if not exists password text not null default 'Great2026!';

alter table public.team_profiles
  add column if not exists avatar_url text not null default '';

alter table public.team_profiles
  add column if not exists bio text not null default '';

update public.team_profiles
set
  password = coalesce(password, 'Great2026!'),
  avatar_url = coalesce(avatar_url, ''),
  bio = coalesce(bio, '');

grant select, insert, update, delete on public.team_profiles to anon, authenticated;
