-- Limpa os dados falsos da plataforma
-- Mantém team_profiles para o login continuar funcionando.

truncate table public.goals;
truncate table public.ideas;
truncate table public.calendar_events;
truncate table public.history_events;
truncate table public.story_logs;
truncate table public.posts;

update public.team_profiles
set
  stats = '{}'::jsonb,
  radar = '[]'::jsonb,
  monthly_posts = '[]'::jsonb,
  avatar_url = '',
  bio = '';
