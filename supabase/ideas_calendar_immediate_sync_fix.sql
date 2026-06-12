begin;

create extension if not exists pgcrypto;
create schema if not exists backup;

create table if not exists backup.ideas as
select * from public.ideas where false;

create table if not exists backup.calendar_items as
select * from public.calendar_items where false;

insert into backup.ideas
select *
from public.ideas
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  category = excluded.category,
  data = excluded.data,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  deleted_at = excluded.deleted_at;

insert into backup.calendar_items
select *
from public.calendar_items
on conflict (id) do update
set
  user_id = excluded.user_id,
  source_calendar_event_id = excluded.source_calendar_event_id,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  category = excluded.category,
  type = excluded.type,
  date = excluded.date,
  data = excluded.data,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  deleted_at = excluded.deleted_at;

alter table public.ideas add column if not exists title text;
alter table public.ideas add column if not exists description text;
alter table public.ideas add column if not exists status text;
alter table public.ideas add column if not exists category text;
alter table public.ideas add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.ideas add column if not exists created_at timestamptz not null default now();
alter table public.ideas add column if not exists updated_at timestamptz not null default now();
alter table public.ideas add column if not exists deleted_at timestamptz;

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

update public.ideas
set
  title = coalesce(nullif(title, ''), data->>'title', ''),
  description = coalesce(nullif(description, ''), data->>'description', ''),
  status = coalesce(nullif(status, ''), data->>'status', 'Ideia'),
  category = coalesce(nullif(category, ''), data->>'category', 'Post'),
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
  type = coalesce(nullif(type, ''), data->>'type', 'Reels'),
  date = coalesce(date, nullif(data->>'date', '')::date),
  data = jsonb_strip_nulls(
    coalesce(data, '{}'::jsonb) ||
    jsonb_build_object(
      'id', coalesce(source_calendar_event_id, nullif(data->>'id', '')::bigint),
      'title', coalesce(nullif(title, ''), data->>'title', ''),
      'description', coalesce(nullif(description, ''), data->>'description', ''),
      'type', coalesce(nullif(type, ''), data->>'type', 'Reels'),
      'status', coalesce(nullif(status, ''), data->>'status', 'Agendado'),
      'date', coalesce(date::text, data->>'date', current_date::text)
    )
  ),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now());

with ranked_calendar_items as (
  select
    id,
    row_number() over (
      partition by source_calendar_event_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as row_rank
  from public.calendar_items
  where source_calendar_event_id is not null
    and deleted_at is null
)
update public.calendar_items items
set
  deleted_at = coalesce(items.deleted_at, now()),
  updated_at = now()
from ranked_calendar_items ranked
where ranked.id = items.id
  and ranked.row_rank > 1;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ideas_touch_updated_at on public.ideas;
create trigger ideas_touch_updated_at
before update on public.ideas
for each row
execute function public.touch_updated_at();

drop trigger if exists calendar_items_touch_updated_at on public.calendar_items;
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
drop policy if exists "calendar_items_authenticated_select" on public.calendar_items;
drop policy if exists "calendar_items_authenticated_insert" on public.calendar_items;
drop policy if exists "calendar_items_authenticated_update" on public.calendar_items;
drop policy if exists "calendar_items_authenticated_delete" on public.calendar_items;

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
