-- Non-destructive monthly snapshot layer.
-- This function must never delete, truncate or reset operational data.
-- Changing month filters in the UI should only trigger SELECTs, not data mutation.

create table if not exists public.operation_monthly_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reference_month date not null,
  page_module text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reference_month, page_module)
);

create index if not exists operation_monthly_snapshots_user_month_idx
  on public.operation_monthly_snapshots (user_id, reference_month);

alter table public.operation_monthly_snapshots enable row level security;

drop policy if exists "operation_monthly_snapshots_select_own" on public.operation_monthly_snapshots;
drop policy if exists "operation_monthly_snapshots_insert_own" on public.operation_monthly_snapshots;
drop policy if exists "operation_monthly_snapshots_update_own" on public.operation_monthly_snapshots;
drop policy if exists "operation_monthly_snapshots_delete_own" on public.operation_monthly_snapshots;

create policy "operation_monthly_snapshots_select_own"
on public.operation_monthly_snapshots
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "operation_monthly_snapshots_insert_own"
on public.operation_monthly_snapshots
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "operation_monthly_snapshots_update_own"
on public.operation_monthly_snapshots
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "operation_monthly_snapshots_delete_own"
on public.operation_monthly_snapshots
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create or replace function public.archive_current_month_data(target_month_key text default null)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor uuid := auth.uid();
  resolved_month date := to_date(coalesce(nullif(trim(target_month_key), ''), to_char((now() at time zone 'America/Sao_Paulo'), 'YYYY-MM')) || '-01', 'YYYY-MM-DD');
begin
  if actor is null then
    raise exception 'Authenticated user required';
  end if;

  perform pg_advisory_xact_lock(hashtext('great-organico-monthly-cycle:' || actor::text));

  insert into public.operation_monthly_snapshots (user_id, reference_month, page_module, payload, updated_at)
  values
    (
      actor,
      resolved_month,
      'posts',
      jsonb_build_object(
        'items',
        coalesce((
          select jsonb_agg(to_jsonb(item) order by item.sort_order, item.id)
          from public.posts item
          where item.user_id = actor
            and coalesce(item.reference_month, date_trunc('month', coalesce(item.metric_date, current_date))::date) = resolved_month
        ), '[]'::jsonb)
      ),
      now()
    ),
    (
      actor,
      resolved_month,
      'goals',
      jsonb_build_object(
        'items',
        coalesce((
          select jsonb_agg(to_jsonb(item) order by item.sort_order, item.id)
          from public.goals item
          where item.user_id = actor
            and coalesce(item.reference_month, date_trunc('month', coalesce(item.metric_date, current_date))::date) = resolved_month
        ), '[]'::jsonb)
      ),
      now()
    ),
    (
      actor,
      resolved_month,
      'ideas',
      jsonb_build_object(
        'items',
        coalesce((
          select jsonb_agg(to_jsonb(item) order by item.sort_order, item.id)
          from public.ideas item
          where item.user_id = actor
            and coalesce(item.reference_month, date_trunc('month', coalesce(item.metric_date, current_date))::date) = resolved_month
        ), '[]'::jsonb)
      ),
      now()
    ),
    (
      actor,
      resolved_month,
      'calendar',
      jsonb_build_object(
        'items',
        coalesce((
          select jsonb_agg(to_jsonb(item) order by item.sort_order, item.id)
          from public.calendar_events item
          where item.user_id = actor
            and coalesce(item.reference_month, date_trunc('month', coalesce(item.metric_date, current_date))::date) = resolved_month
        ), '[]'::jsonb)
      ),
      now()
    ),
    (
      actor,
      resolved_month,
      'stories',
      jsonb_build_object(
        'items',
        coalesce((
          select jsonb_agg(to_jsonb(item) order by item.sort_order, item.id)
          from public.story_logs item
          where item.user_id = actor
            and coalesce(item.reference_month, date_trunc('month', coalesce(item.metric_date, current_date))::date) = resolved_month
        ), '[]'::jsonb)
      ),
      now()
    )
  on conflict (user_id, reference_month, page_module) do update
  set
    payload = excluded.payload,
    updated_at = excluded.updated_at;

  insert into public.shared_state (user_id, key, value, updated_at)
  values (
    actor,
    'great-organico-monthly-cycle-last-month',
    to_jsonb(to_char(resolved_month, 'YYYY-MM')),
    now()
  )
  on conflict (user_id, key) do update
  set
    value = excluded.value,
    updated_at = excluded.updated_at;

  return true;
end;
$$;

grant execute on function public.archive_current_month_data(text) to authenticated;

create or replace function public.cleanup_cypress_data()
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'Authenticated user required';
  end if;

  perform pg_advisory_xact_lock(hashtext('great-organico-cypress-cleanup:' || actor::text));

  update public.posts
  set deleted_at = now(), updated_at = now()
  where user_id = actor
    and data::text ilike '%cypress%';

  update public.goals
  set deleted_at = now(), updated_at = now()
  where user_id = actor
    and data::text ilike '%cypress%';

  update public.ideas
  set deleted_at = now(), updated_at = now()
  where user_id = actor
    and data::text ilike '%cypress%';

  update public.calendar_events
  set deleted_at = now(), updated_at = now()
  where user_id = actor
    and data::text ilike '%cypress%';

  update public.story_logs
  set deleted_at = now(), updated_at = now()
  where user_id = actor
    and data::text ilike '%cypress%';

  insert into public.shared_state (user_id, key, value, updated_at)
  values (
    actor,
    'great-organico-cypress-cleanup-done',
    to_jsonb('done'::text),
    now()
  )
  on conflict (user_id, key) do update
  set
    value = excluded.value,
    updated_at = excluded.updated_at;

  return true;
end;
$$;

grant execute on function public.cleanup_cypress_data() to authenticated;
