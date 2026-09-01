-- Shared report state for every authenticated user and application server.
create table if not exists public.report_global_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.report_global_state enable row level security;

drop policy if exists "report_global_state_select_authenticated" on public.report_global_state;
drop policy if exists "report_global_state_insert_authenticated" on public.report_global_state;
drop policy if exists "report_global_state_update_authenticated" on public.report_global_state;

create policy "report_global_state_select_authenticated"
on public.report_global_state
for select
to authenticated
using (auth.role() = 'authenticated');

create policy "report_global_state_insert_authenticated"
on public.report_global_state
for insert
to authenticated
with check (auth.role() = 'authenticated');

create policy "report_global_state_update_authenticated"
on public.report_global_state
for update
to authenticated
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

grant select, insert, update on public.report_global_state to authenticated;

-- Migrate the newest existing user-scoped report values without overwriting
-- a value that may already have been created in the shared table.
with latest_reports as (
  select distinct on (report_kind, reference_month, external_key)
    report_kind,
    reference_month,
    external_key,
    payload,
    updated_at
  from public.reports
  where report_kind in (
    'saved_report_history',
    'overview',
    'layout',
    'stories_team',
    'executive_hero_metrics'
  )
  order by report_kind, reference_month, external_key, updated_at desc
), mapped_reports as (
  select
    case
      when report_kind = 'saved_report_history'
        then 'great-organico-reports-history'
      when report_kind = 'overview'
        then 'great-organico-reports-overview-' || to_char(reference_month, 'YYYY-MM')
      when report_kind = 'layout'
        then 'great-organico-reports-rows-' || to_char(reference_month, 'YYYY-MM')
      when report_kind = 'stories_team'
        then 'great-organico-reports-stories-team-' || to_char(reference_month, 'YYYY-MM')
      when report_kind = 'executive_hero_metrics'
        then 'great-organico-reports-executive-hero-metrics-' || to_char(reference_month, 'YYYY-MM')
    end as key,
    payload as value,
    updated_at
  from latest_reports
)
insert into public.report_global_state (key, value, updated_at)
select key, value, coalesce(updated_at, now())
from mapped_reports
where key is not null
on conflict (key) do nothing;
