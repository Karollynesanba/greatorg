begin;

create extension if not exists pgcrypto;

create schema if not exists backup;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.ideas (
  id bigint primary key,
  title text not null default '',
  description text not null default '',
  status text not null default 'Ideia',
  category text not null default 'Post',
  type text,
  date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.ideas add column if not exists title text;
alter table public.ideas add column if not exists description text;
alter table public.ideas add column if not exists status text;
alter table public.ideas add column if not exists category text;
alter table public.ideas add column if not exists type text;
alter table public.ideas add column if not exists date date;
alter table public.ideas add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.ideas add column if not exists created_at timestamptz not null default now();
alter table public.ideas add column if not exists updated_at timestamptz not null default now();
alter table public.ideas add column if not exists deleted_at timestamptz;

create table if not exists public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  source_calendar_event_id bigint,
  title text not null default '',
  description text not null default '',
  status text not null default 'Agendado',
  category text not null default 'calendar_item',
  type text,
  date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  reference_month date,
  metric_date date,
  content_type text,
  responsible_profile_id bigint,
  starts_at timestamptz,
  ends_at timestamptz
);

alter table public.calendar_items alter column user_id drop not null;
alter table public.calendar_items add column if not exists source_calendar_event_id bigint;
alter table public.calendar_items add column if not exists title text;
alter table public.calendar_items add column if not exists description text;
alter table public.calendar_items add column if not exists status text;
alter table public.calendar_items add column if not exists category text;
alter table public.calendar_items add column if not exists type text;
alter table public.calendar_items add column if not exists date date;
alter table public.calendar_items add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.calendar_items add column if not exists created_at timestamptz not null default now();
alter table public.calendar_items add column if not exists updated_at timestamptz not null default now();
alter table public.calendar_items add column if not exists deleted_at timestamptz;
alter table public.calendar_items add column if not exists reference_month date;
alter table public.calendar_items add column if not exists metric_date date;
alter table public.calendar_items add column if not exists content_type text;
alter table public.calendar_items add column if not exists responsible_profile_id bigint;
alter table public.calendar_items add column if not exists starts_at timestamptz;
alter table public.calendar_items add column if not exists ends_at timestamptz;

create table if not exists backup.ideas (like public.ideas including all);
create table if not exists backup.calendar_items (like public.calendar_items including all);

alter table backup.ideas add column if not exists title text;
alter table backup.ideas add column if not exists description text;
alter table backup.ideas add column if not exists status text;
alter table backup.ideas add column if not exists category text;
alter table backup.ideas add column if not exists type text;
alter table backup.ideas add column if not exists date date;
alter table backup.ideas add column if not exists data jsonb;
alter table backup.ideas add column if not exists created_at timestamptz;
alter table backup.ideas add column if not exists updated_at timestamptz;
alter table backup.ideas add column if not exists deleted_at timestamptz;

alter table backup.calendar_items add column if not exists id uuid;
alter table backup.calendar_items add column if not exists user_id uuid;
alter table backup.calendar_items add column if not exists source_calendar_event_id bigint;
alter table backup.calendar_items add column if not exists title text;
alter table backup.calendar_items add column if not exists description text;
alter table backup.calendar_items add column if not exists status text;
alter table backup.calendar_items add column if not exists category text;
alter table backup.calendar_items add column if not exists type text;
alter table backup.calendar_items add column if not exists date date;
alter table backup.calendar_items add column if not exists data jsonb;
alter table backup.calendar_items add column if not exists created_at timestamptz;
alter table backup.calendar_items add column if not exists updated_at timestamptz;
alter table backup.calendar_items add column if not exists deleted_at timestamptz;
alter table backup.calendar_items add column if not exists reference_month date;
alter table backup.calendar_items add column if not exists metric_date date;
alter table backup.calendar_items add column if not exists content_type text;
alter table backup.calendar_items add column if not exists responsible_profile_id bigint;
alter table backup.calendar_items add column if not exists starts_at timestamptz;
alter table backup.calendar_items add column if not exists ends_at timestamptz;

insert into backup.ideas (
  id,
  title,
  description,
  status,
  category,
  type,
  date,
  data,
  created_at,
  updated_at,
  deleted_at
)
select
  id,
  title,
  description,
  status,
  category,
  type,
  date,
  data,
  created_at,
  updated_at,
  deleted_at
from public.ideas
on conflict do nothing;

insert into backup.calendar_items (
  id,
  user_id,
  source_calendar_event_id,
  title,
  description,
  status,
  category,
  type,
  date,
  data,
  created_at,
  updated_at,
  deleted_at,
  reference_month,
  metric_date,
  content_type,
  responsible_profile_id,
  starts_at,
  ends_at
)
select
  id,
  user_id,
  source_calendar_event_id,
  title,
  description,
  status,
  category,
  type,
  date,
  data,
  created_at,
  updated_at,
  deleted_at,
  reference_month,
  metric_date,
  content_type,
  responsible_profile_id,
  starts_at,
  ends_at
from public.calendar_items
on conflict do nothing;

update public.ideas
set
  title = coalesce(nullif(title, ''), data->>'title', ''),
  description = coalesce(nullif(description, ''), data->>'description', ''),
  status = coalesce(nullif(status, ''), data->>'status', 'Ideia'),
  category = coalesce(nullif(category, ''), data->>'category', 'Post'),
  type = coalesce(nullif(type, ''), data->>'type', data->>'category', category, 'Post'),
  date = coalesce(date, nullif(data->>'date', '')::date),
  data = jsonb_strip_nulls(
    coalesce(data, '{}'::jsonb) ||
    jsonb_build_object(
      'id', id,
      'title', coalesce(nullif(title, ''), data->>'title', ''),
      'description', coalesce(nullif(description, ''), data->>'description', ''),
      'status', coalesce(nullif(status, ''), data->>'status', 'Ideia'),
      'category', coalesce(nullif(category, ''), data->>'category', 'Post')
    )
  ),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

update public.calendar_items
set
  source_calendar_event_id = coalesce(source_calendar_event_id, nullif(data->>'id', '')::bigint),
  title = coalesce(nullif(title, ''), data->>'title', ''),
  description = coalesce(nullif(description, ''), data->>'description', ''),
  status = coalesce(nullif(status, ''), data->>'status', 'Agendado'),
  category = coalesce(nullif(category, ''), 'calendar_item'),
  type = coalesce(nullif(type, ''), nullif(content_type, ''), data->>'type', data->>'category', 'Reels'),
  date = coalesce(date, metric_date, nullif(data->>'date', '')::date),
  reference_month = coalesce(reference_month, (left(coalesce(date::text, data->>'date', current_date::text), 7) || '-01')::date),
  metric_date = coalesce(metric_date, date, nullif(data->>'date', '')::date),
  content_type = coalesce(nullif(content_type, ''), type, data->>'type'),
  responsible_profile_id = coalesce(responsible_profile_id, nullif(data->>'responsibleId', '')::bigint),
  starts_at = coalesce(
    starts_at,
    case
      when coalesce(date::text, data->>'date', '') <> '' then
        ((coalesce(date::text, data->>'date')) || 'T' || coalesce(data->>'time', '09:00') || ':00')::timestamptz
      else null
    end
  ),
  data = jsonb_strip_nulls(
    coalesce(data, '{}'::jsonb) ||
    jsonb_build_object(
      'id', source_calendar_event_id,
      'title', coalesce(nullif(title, ''), data->>'title', ''),
      'description', coalesce(nullif(description, ''), data->>'description', ''),
      'type', coalesce(nullif(type, ''), nullif(content_type, ''), data->>'type', 'Reels'),
      'status', coalesce(nullif(status, ''), data->>'status', 'Agendado'),
      'date', coalesce(date::text, data->>'date', current_date::text),
      'time', coalesce(data->>'time', to_char(starts_at, 'HH24:MI'), '09:00'),
      'responsibleId', coalesce(responsible_profile_id, nullif(data->>'responsibleId', '')::bigint, 1)
    )
  ),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

with duplicates as (
  select
    id,
    row_number() over (
      partition by source_calendar_event_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as row_position
  from public.calendar_items
  where source_calendar_event_id is not null
    and deleted_at is null
)
update public.calendar_items items
set
  deleted_at = coalesce(items.deleted_at, now()),
  updated_at = now()
from duplicates
where items.id = duplicates.id
  and duplicates.row_position > 1;

drop trigger if exists calendar_items_global_sync_trigger on public.calendar_items;
drop trigger if exists calendar_items_touch_updated_at on public.calendar_items;
drop trigger if exists ideas_touch_updated_at on public.ideas;

create trigger ideas_touch_updated_at
before update on public.ideas
for each row
execute function public.touch_updated_at();

create trigger calendar_items_touch_updated_at
before update on public.calendar_items
for each row
execute function public.touch_updated_at();

create index if not exists ideas_deleted_at_idx on public.ideas (deleted_at);
create index if not exists ideas_updated_at_idx on public.ideas (updated_at desc);
create index if not exists calendar_items_deleted_at_idx on public.calendar_items (deleted_at);
create index if not exists calendar_items_updated_at_idx on public.calendar_items (updated_at desc);
create index if not exists calendar_items_date_idx on public.calendar_items (date);
create index if not exists calendar_items_source_event_idx on public.calendar_items (source_calendar_event_id);
create unique index if not exists calendar_items_source_event_active_uidx
on public.calendar_items (source_calendar_event_id)
where source_calendar_event_id is not null and deleted_at is null;

alter table public.ideas enable row level security;
alter table public.calendar_items enable row level security;

drop policy if exists "ideas_select_all" on public.ideas;
drop policy if exists "ideas_insert_all" on public.ideas;
drop policy if exists "ideas_update_all" on public.ideas;
drop policy if exists "ideas_delete_all" on public.ideas;
drop policy if exists "ideas_select_own" on public.ideas;
drop policy if exists "ideas_insert_own" on public.ideas;
drop policy if exists "ideas_update_own" on public.ideas;
drop policy if exists "ideas_delete_own" on public.ideas;
drop policy if exists "ideas_authenticated_select" on public.ideas;
drop policy if exists "ideas_authenticated_insert" on public.ideas;
drop policy if exists "ideas_authenticated_update" on public.ideas;
drop policy if exists "ideas_authenticated_delete" on public.ideas;

create policy "ideas_authenticated_select"
on public.ideas
for select
using (auth.role() = 'authenticated');

create policy "ideas_authenticated_insert"
on public.ideas
for insert
with check (auth.role() = 'authenticated');

create policy "ideas_authenticated_update"
on public.ideas
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "ideas_authenticated_delete"
on public.ideas
for delete
using (auth.role() = 'authenticated');

drop policy if exists "calendar_items_select_all" on public.calendar_items;
drop policy if exists "calendar_items_insert_all" on public.calendar_items;
drop policy if exists "calendar_items_update_all" on public.calendar_items;
drop policy if exists "calendar_items_delete_all" on public.calendar_items;
drop policy if exists "calendar_items_select_own" on public.calendar_items;
drop policy if exists "calendar_items_insert_own" on public.calendar_items;
drop policy if exists "calendar_items_update_own" on public.calendar_items;
drop policy if exists "calendar_items_delete_own" on public.calendar_items;

create policy "calendar_items_authenticated_select"
on public.calendar_items
for select
using (auth.role() = 'authenticated');

create policy "calendar_items_authenticated_insert"
on public.calendar_items
for insert
with check (auth.role() = 'authenticated');

create policy "calendar_items_authenticated_update"
on public.calendar_items
for update
using (auth.role() = 'authenticated')
with check (auth.role() = 'authenticated');

create policy "calendar_items_authenticated_delete"
on public.calendar_items
for delete
using (auth.role() = 'authenticated');

grant select, insert, update, delete on public.ideas to authenticated;
grant select, insert, update, delete on public.calendar_items to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'ideas'
    ) then
      alter publication supabase_realtime add table public.ideas;
    end if;

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'calendar_items'
    ) then
      alter publication supabase_realtime add table public.calendar_items;
    end if;
  end if;
end
$$;

commit;
