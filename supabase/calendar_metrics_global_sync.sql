begin;

create schema if not exists backup;

create table if not exists backup.calendar_day_metrics (like public.calendar_day_metrics including all);

insert into backup.calendar_day_metrics
select * from public.calendar_day_metrics
on conflict do nothing;

create or replace function public.sync_calendar_day_metrics_globally()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    delete from public.calendar_day_metrics
    where metric_date = old.metric_date;

    return old;
  end if;

  insert into public.calendar_day_metrics (user_id, metric_date, views, reach)
  select
    users.id,
    new.metric_date,
    new.views,
    new.reach
  from auth.users as users
  on conflict (user_id, metric_date) do update
  set
    views = excluded.views,
    reach = excluded.reach,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists calendar_day_metrics_global_sync_trigger on public.calendar_day_metrics;

create trigger calendar_day_metrics_global_sync_trigger
after insert or update or delete on public.calendar_day_metrics
for each row
execute function public.sync_calendar_day_metrics_globally();

with canonical as (
  select distinct on (metric_date)
    metric_date,
    views,
    reach
  from public.calendar_day_metrics
  order by metric_date, updated_at desc nulls last, id desc
),
team as (
  select id as user_id
  from auth.users
),
desired as (
  select
    team.user_id,
    seeded.metric_date,
    seeded.views,
    seeded.reach
  from team
  cross join (
    values
      (date '2026-06-03', 16737, 0),
      (date '2026-06-04', 6964, 0),
      (date '2026-06-05', 21423, 0),
      (date '2026-06-06', 10132, 0),
      (date '2026-06-07', 12167, 0),
      (date '2026-06-08', 17323, 0),
      (date '2026-06-09', 17298, 0)
  ) as seeded(metric_date, views, reach)
),
merged as (
  select
    desired.user_id,
    desired.metric_date,
    desired.views,
    desired.reach
  from desired

  union all

  select
    team.user_id,
    canonical.metric_date,
    canonical.views,
    canonical.reach
  from team
  join canonical on canonical.metric_date not in (
    date '2026-06-03',
    date '2026-06-04',
    date '2026-06-05',
    date '2026-06-06',
    date '2026-06-07',
    date '2026-06-08',
    date '2026-06-09'
  )
)
insert into public.calendar_day_metrics (user_id, metric_date, views, reach)
select
  merged.user_id,
  merged.metric_date,
  merged.views,
  merged.reach
from merged
on conflict (user_id, metric_date) do update
set
  views = excluded.views,
  reach = excluded.reach,
  updated_at = now();

commit;
