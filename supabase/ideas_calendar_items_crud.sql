begin;

create schema if not exists backup;

create table if not exists public.ideas (
  id bigint primary key,
  sort_order bigint not null default 0,
  data jsonb not null default '{}'::jsonb
);

alter table public.ideas add column if not exists title text;
alter table public.ideas add column if not exists description text;
alter table public.ideas add column if not exists status text;
alter table public.ideas add column if not exists category text;
alter table public.ideas add column if not exists type text;
alter table public.ideas add column if not exists date date;
alter table public.ideas add column if not exists created_at timestamptz not null default now();
alter table public.ideas add column if not exists updated_at timestamptz not null default now();
alter table public.ideas add column if not exists deleted_at timestamptz;

create table if not exists public.calendar_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reference_month date not null,
  metric_date date not null,
  category text not null default 'calendar_item',
  title text not null,
  description text not null default '',
  status text,
  content_type text,
  responsible_profile_id bigint,
  source_calendar_event_id bigint,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_calendar_event_id)
);

alter table public.calendar_items add column if not exists type text;
alter table public.calendar_items add column if not exists date date;
alter table public.calendar_items add column if not exists data jsonb not null default '{}'::jsonb;
alter table public.calendar_items add column if not exists deleted_at timestamptz;

create table if not exists backup.ideas (like public.ideas including all);
create table if not exists backup.calendar_items (like public.calendar_items including all);

insert into backup.ideas
select * from public.ideas
on conflict do nothing;

insert into backup.calendar_items
select * from public.calendar_items
on conflict do nothing;

update public.ideas
set
  title = coalesce(title, data->>'title', ''),
  description = coalesce(description, data->>'description', ''),
  status = coalesce(status, data->>'status', 'Ideia'),
  category = coalesce(category, data->>'category', 'Post'),
  type = coalesce(type, data->>'category', category, 'Post'),
  date = coalesce(date, nullif(data->>'date', '')::date),
  data = case
    when data = '{}'::jsonb or data is null then
      jsonb_build_object(
        'id', id,
        'title', coalesce(title, ''),
        'description', coalesce(description, ''),
        'status', coalesce(status, 'Ideia'),
        'category', coalesce(category, 'Post')
      )
    else data
  end,
  updated_at = coalesce(updated_at, now()),
  created_at = coalesce(created_at, now())
where
  title is null
  or description is null
  or status is null
  or category is null
  or type is null
  or data is null
  or data = '{}'::jsonb;

update public.calendar_items
set
  type = coalesce(type, content_type, data->>'type', 'Reels'),
  date = coalesce(date, metric_date),
  data = case
    when data = '{}'::jsonb or data is null then
      jsonb_build_object(
        'id', source_calendar_event_id,
        'title', title,
        'description', description,
        'type', coalesce(type, content_type, 'Reels'),
        'status', coalesce(status, 'Agendado'),
        'date', coalesce(date, metric_date),
        'time', coalesce(to_char(starts_at, 'HH24:MI'), '09:00'),
        'responsibleId', coalesce(responsible_profile_id, 1),
        'responsibleIds', jsonb_build_array(coalesce(responsible_profile_id, 1))
      )
    else data
  end,
  updated_at = coalesce(updated_at, now()),
  created_at = coalesce(created_at, now())
where
  type is null
  or date is null
  or data is null
  or data = '{}'::jsonb;

insert into public.calendar_items (
  user_id,
  reference_month,
  metric_date,
  category,
  title,
  description,
  status,
  content_type,
  responsible_profile_id,
  source_calendar_event_id,
  starts_at,
  ends_at,
  type,
  date,
  data
)
select
  users.id,
  (left(coalesce(ce.data->>'date', current_date::text), 7) || '-01')::date,
  coalesce((ce.data->>'date')::date, current_date),
  'calendar_item',
  coalesce(ce.data->>'title', ''),
  coalesce(ce.data->>'description', ''),
  ce.data->>'status',
  ce.data->>'type',
  nullif(ce.data->>'responsibleId', '')::bigint,
  ce.id,
  case
    when coalesce(ce.data->>'date', '') <> '' then
      ((ce.data->>'date') || 'T' || coalesce(ce.data->>'time', '09:00') || ':00')::timestamptz
    else null
  end,
  null,
  ce.data->>'type',
  coalesce((ce.data->>'date')::date, current_date),
  ce.data
from public.calendar_events ce
cross join auth.users users
where coalesce(ce.data->>'title', '') <> ''
on conflict (user_id, source_calendar_event_id) do update
set
  reference_month = excluded.reference_month,
  metric_date = excluded.metric_date,
  category = excluded.category,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  content_type = excluded.content_type,
  responsible_profile_id = excluded.responsible_profile_id,
  starts_at = excluded.starts_at,
  type = excluded.type,
  date = excluded.date,
  data = excluded.data,
  updated_at = now();

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

create or replace function public.sync_calendar_items_globally()
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
    delete from public.calendar_items
    where source_calendar_event_id = old.source_calendar_event_id;

    return old;
  end if;

  insert into public.calendar_items (
    user_id,
    reference_month,
    metric_date,
    category,
    title,
    description,
    status,
    content_type,
    responsible_profile_id,
    source_calendar_event_id,
    starts_at,
    ends_at,
    type,
    date,
    data,
    deleted_at
  )
  select
    users.id,
    new.reference_month,
    new.metric_date,
    new.category,
    new.title,
    new.description,
    new.status,
    new.content_type,
    new.responsible_profile_id,
    new.source_calendar_event_id,
    new.starts_at,
    new.ends_at,
    new.type,
    new.date,
    new.data,
    new.deleted_at
  from auth.users users
  on conflict (user_id, source_calendar_event_id) do update
  set
    reference_month = excluded.reference_month,
    metric_date = excluded.metric_date,
    category = excluded.category,
    title = excluded.title,
    description = excluded.description,
    status = excluded.status,
    content_type = excluded.content_type,
    responsible_profile_id = excluded.responsible_profile_id,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    type = excluded.type,
    date = excluded.date,
    data = excluded.data,
    deleted_at = excluded.deleted_at,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists calendar_items_global_sync_trigger on public.calendar_items;
create trigger calendar_items_global_sync_trigger
after insert or update or delete on public.calendar_items
for each row
execute function public.sync_calendar_items_globally();

alter table public.ideas enable row level security;
alter table public.calendar_items enable row level security;

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

drop policy if exists "calendar_items_select_own" on public.calendar_items;
drop policy if exists "calendar_items_insert_own" on public.calendar_items;
drop policy if exists "calendar_items_update_own" on public.calendar_items;
drop policy if exists "calendar_items_delete_own" on public.calendar_items;

create policy "calendar_items_select_own"
on public.calendar_items
for select
using (auth.uid() = user_id);

create policy "calendar_items_insert_own"
on public.calendar_items
for insert
with check (auth.uid() = user_id);

create policy "calendar_items_update_own"
on public.calendar_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "calendar_items_delete_own"
on public.calendar_items
for delete
using (auth.uid() = user_id);

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
