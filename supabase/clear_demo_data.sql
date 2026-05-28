-- Clears demo data so the platform starts clean.
-- Keeps team_profiles so login continues working.

truncate table public.goals;
truncate table public.ideas;
truncate table public.calendar_events;
truncate table public.history_events;
truncate table public.story_logs;
truncate table public.posts;
truncate table public.shared_state;

update public.team_profiles
set
  stats = '{}'::jsonb,
  radar = '[]'::jsonb,
  monthly_posts = '[]'::jsonb,
  avatar_url = '',
  bio = '';
