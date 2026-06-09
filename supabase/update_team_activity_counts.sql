-- Great Organico
-- Update current-month activity counts for the team without overwriting other stats fields.
-- Brenda uses the current month's story volume.
-- Hannah and Thiago receive 9 completed activities for the current month.
-- The front reads these values from public.team_profiles, so a reload or "Atualizar dados" will reflect them.

begin;

update public.team_profiles
set stats = jsonb_set(
  coalesce(stats, '{}'::jsonb),
  '{postsCreated}',
  to_jsonb(
    coalesce(
      (
        select sum((data->>'quantity')::int)
        from public.story_logs
        where ((data->>'madeById')::int = 1 or (data->>'postedById')::int = 1)
          and to_date(data->>'date', 'YYYY-MM-DD') >= date_trunc('month', current_date)::date
          and to_date(data->>'date', 'YYYY-MM-DD') < (date_trunc('month', current_date) + interval '1 month')::date
      ),
      0
    )
  ),
  true
)
where id = 1;

update public.team_profiles
set stats = jsonb_set(
  coalesce(stats, '{}'::jsonb),
  '{goalsCompleted}',
  to_jsonb(9),
  true
)
where id = 2;

update public.team_profiles
set stats = jsonb_set(
  coalesce(stats, '{}'::jsonb),
  '{goalsCompleted}',
  to_jsonb(9),
  true
)
where id = 3;

commit;
