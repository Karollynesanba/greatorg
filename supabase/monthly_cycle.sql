-- Archive the current operational month into shared_state and clear live working tables.
-- This keeps the previous month available for reports while the current month starts clean.

create or replace function public.archive_current_month_data(target_month_key text default null)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  resolved_month_key text := coalesce(nullif(trim(target_month_key), ''), to_char((now() at time zone 'America/Fortaleza'), 'YYYY-MM'));
  archive_snapshot jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('great-organico-monthly-cycle'));

  if exists (
    select 1
    from public.shared_state
    where key = 'great-organico-monthly-cycle-last-month'
      and value = to_jsonb(resolved_month_key)
  ) then
    return true;
  end if;

  archive_snapshot := jsonb_build_object(
    'monthKey', resolved_month_key,
    'generatedAt', now(),
    'posts', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.sort_order, item.id)
      from public.posts item
    ), '[]'::jsonb),
    'goals', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.sort_order, item.id)
      from public.goals item
    ), '[]'::jsonb),
    'ideas', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.sort_order, item.id)
      from public.ideas item
    ), '[]'::jsonb),
    'calendarEvents', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.sort_order, item.id)
      from public.calendar_events item
    ), '[]'::jsonb),
    'storyLogs', coalesce((
      select jsonb_agg(to_jsonb(item) order by item.sort_order, item.id)
      from public.story_logs item
    ), '[]'::jsonb)
  );

  insert into public.shared_state (key, value, updated_at)
  values (
    'great-organico-monthly-archive',
    archive_snapshot,
    now()
  )
  on conflict (key) do update
  set
    value = excluded.value,
    updated_at = excluded.updated_at;

  insert into public.shared_state (key, value, updated_at)
  values (
    'great-organico-monthly-cycle-last-month',
    to_jsonb(resolved_month_key),
    now()
  )
  on conflict (key) do update
  set
    value = excluded.value,
    updated_at = excluded.updated_at;

  delete from public.posts;
  delete from public.goals;
  delete from public.ideas;
  delete from public.calendar_events;
  delete from public.story_logs;

  return true;
end;
$$;

grant execute on function public.archive_current_month_data(text) to anon, authenticated;

create or replace function public.cleanup_cypress_data()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtext('great-organico-cypress-cleanup'));

  if exists (
    select 1
    from public.shared_state
    where key = 'great-organico-cypress-cleanup-done'
      and value = to_jsonb('done'::text)
  ) then
    return true;
  end if;

  delete from public.posts
  where data::text ilike '%cypress%';

  delete from public.goals
  where data::text ilike '%cypress%';

  delete from public.ideas
  where data::text ilike '%cypress%';

  delete from public.calendar_events
  where data::text ilike '%cypress%';

  delete from public.story_logs
  where data::text ilike '%cypress%';

  delete from public.shared_state
  where value::text ilike '%cypress%';

  delete from public.app_preferences
  where value::text ilike '%cypress%';

  insert into public.shared_state (key, value, updated_at)
  values (
    'great-organico-cypress-cleanup-done',
    to_jsonb('done'::text),
    now()
  )
  on conflict (key) do update
  set
    value = excluded.value,
    updated_at = excluded.updated_at;

  return true;
end;
$$;

grant execute on function public.cleanup_cypress_data() to anon, authenticated;
