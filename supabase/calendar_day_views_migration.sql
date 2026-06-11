begin;

create or replace function public.merge_calendar_day_views(current_value jsonb)
returns jsonb
language sql
immutable
as $$
  with additions as (
    select '{
      "2026-06-03": 16737,
      "2026-06-04": 6964,
      "2026-06-05": 21423,
      "2026-06-06": 10132,
      "2026-06-07": 12167,
      "2026-06-08": 17323,
      "2026-06-09": 17298
    }'::jsonb as delta
  )
  select coalesce(current_value, '{}'::jsonb) ||
    coalesce(
      (
        select jsonb_object_agg(
          key,
          to_jsonb(coalesce((current_value ->> key)::int, 0) + (delta ->> key)::int)
        )
        from additions, jsonb_object_keys(delta) as key
      ),
      '{}'::jsonb
    );
$$;

update public.shared_state
set value = public.merge_calendar_day_views(value),
    updated_at = now()
where key = 'calendar-day-views';

update public.app_preferences
set value = public.merge_calendar_day_views(value),
    updated_at = now()
where key = 'calendar-day-views';

commit;
