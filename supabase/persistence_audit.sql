-- Great Orgânico - persistence, backup and audit layer
-- Run this in the Supabase SQL editor after the base schema.

begin;

create extension if not exists pgcrypto;

create table if not exists public.record_audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_key text not null,
  action text not null check (action in ('created', 'updated', 'deleted', 'restored', 'archived', 'unarchived')),
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users (id) on delete set null,
  old_data jsonb,
  new_data jsonb
);

create index if not exists record_audit_log_table_name_changed_at_idx
  on public.record_audit_log (table_name, changed_at desc);

create index if not exists record_audit_log_record_key_idx
  on public.record_audit_log (record_key);

create schema if not exists backup;

create table if not exists backup.snapshot_runs (
  id uuid primary key default gen_random_uuid(),
  label text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create table if not exists backup.snapshot_rows (
  run_id uuid not null references backup.snapshot_runs (id) on delete cascade,
  table_name text not null,
  row_key text not null,
  sort_order bigint,
  row_data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (run_id, table_name, row_key)
);

create index if not exists backup_snapshot_rows_run_table_idx
  on backup.snapshot_rows (run_id, table_name);

create index if not exists backup_snapshot_rows_table_idx
  on backup.snapshot_rows (table_name);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'team_profiles',
    'goals',
    'ideas',
    'calendar_events',
    'history_events',
    'story_logs',
    'posts',
    'shared_state',
    'app_preferences'
  ] loop
    execute format('alter table public.%I add column if not exists created_at timestamptz not null default now()', table_name);
    execute format('alter table public.%I add column if not exists updated_at timestamptz not null default now()', table_name);
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', table_name);
    execute format('alter table public.%I add column if not exists archived_at timestamptz', table_name);
    execute format('alter table public.%I add column if not exists created_by uuid references auth.users(id) on delete set null', table_name);
    execute format('alter table public.%I add column if not exists updated_by uuid references auth.users(id) on delete set null', table_name);
    execute format('alter table public.%I add column if not exists deleted_by uuid references auth.users(id) on delete set null', table_name);
    execute format('alter table public.%I add column if not exists archived_by uuid references auth.users(id) on delete set null', table_name);
  end loop;
end $$;

alter table public.team_profiles alter column user_id set not null;
alter table public.app_preferences alter column user_id set not null;

do $$
begin
  alter table public.team_profiles
    add constraint team_profiles_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.app_preferences
    add constraint app_preferences_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_audit_columns()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
    new.updated_at := coalesce(new.updated_at, now());
    new.created_by := coalesce(new.created_by, actor);
    new.updated_by := coalesce(new.updated_by, actor, new.created_by);
    new.deleted_by := coalesce(new.deleted_by, null);
    new.archived_by := coalesce(new.archived_by, null);
    return new;
  end if;

  new.created_at := coalesce(new.created_at, old.created_at, now());
  new.created_by := coalesce(new.created_by, old.created_by, actor);
  new.updated_at := now();
  new.updated_by := coalesce(actor, new.updated_by, old.updated_by, new.created_by);

  if old.deleted_at is null and new.deleted_at is not null then
    new.deleted_by := coalesce(actor, new.deleted_by, old.deleted_by);
  elsif old.deleted_at is not null and new.deleted_at is null then
    new.deleted_by := null;
  else
    new.deleted_by := coalesce(new.deleted_by, old.deleted_by);
  end if;

  if old.archived_at is null and new.archived_at is not null then
    new.archived_by := coalesce(actor, new.archived_by, old.archived_by);
  elsif old.archived_at is not null and new.archived_at is null then
    new.archived_by := null;
  else
    new.archived_by := coalesce(new.archived_by, old.archived_by);
  end if;

  return new;
end;
$$;

create or replace function public.log_audit_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  actor uuid := auth.uid();
  old_json jsonb := coalesce(to_jsonb(old), '{}'::jsonb);
  new_json jsonb := coalesce(to_jsonb(new), '{}'::jsonb);
  old_deleted text := nullif(old_json ->> 'deleted_at', '');
  new_deleted text := nullif(new_json ->> 'deleted_at', '');
  old_archived text := nullif(old_json ->> 'archived_at', '');
  new_archived text := nullif(new_json ->> 'archived_at', '');
  record_key text;
  action text;
begin
  record_key := coalesce(
    new_json ->> 'id',
    old_json ->> 'id',
    new_json ->> 'key',
    old_json ->> 'key',
    concat_ws(':', new_json ->> 'user_id', new_json ->> 'key'),
    concat_ws(':', old_json ->> 'user_id', old_json ->> 'key')
  );

  if tg_op = 'INSERT' then
    action := 'created';
  elsif tg_op = 'DELETE' then
    action := 'deleted';
  elsif old_deleted is null and new_deleted is not null then
    action := 'deleted';
  elsif old_deleted is not null and new_deleted is null then
    action := 'restored';
  elsif old_archived is null and new_archived is not null then
    action := 'archived';
  elsif old_archived is not null and new_archived is null then
    action := 'unarchived';
  else
    action := 'updated';
  end if;

  insert into public.record_audit_log (
    table_name,
    record_key,
    action,
    changed_by,
    old_data,
    new_data
  ) values (
    tg_table_name,
    record_key,
    action,
    actor,
    case when tg_op = 'INSERT' then null else old_json end,
    case when tg_op = 'DELETE' then null else new_json end
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'team_profiles',
    'goals',
    'ideas',
    'calendar_events',
    'history_events',
    'story_logs',
    'posts',
    'shared_state',
    'app_preferences'
  ] loop
    execute format('drop trigger if exists %I_set_audit_columns on public.%I', table_name, table_name);
    execute format('drop trigger if exists %I_log_audit_change on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_set_audit_columns before insert or update on public.%I for each row execute function public.set_audit_columns()',
      table_name,
      table_name
    );
    execute format(
      'create trigger %I_log_audit_change after insert or update or delete on public.%I for each row execute function public.log_audit_change()',
      table_name,
      table_name
    );
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'team_profiles',
    'goals',
    'ideas',
    'calendar_events',
    'history_events',
    'story_logs',
    'posts',
    'shared_state',
    'app_preferences',
    'record_audit_log'
  ] loop
    if not exists (
      select 1
      from pg_publication p
      join pg_publication_tables pt on pt.pubid = p.oid
      join pg_class c on c.oid = pt.relid
      join pg_namespace n on n.oid = c.relnamespace
      where p.pubname = 'supabase_realtime'
        and n.nspname = 'public'
        and c.relname = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

drop policy if exists "team_profiles_select_all" on public.team_profiles;
drop policy if exists "team_profiles_insert_all" on public.team_profiles;
drop policy if exists "team_profiles_update_all" on public.team_profiles;
drop policy if exists "team_profiles_delete_all" on public.team_profiles;

drop policy if exists "goals_select_all" on public.goals;
drop policy if exists "goals_insert_all" on public.goals;
drop policy if exists "goals_update_all" on public.goals;
drop policy if exists "goals_delete_all" on public.goals;

drop policy if exists "ideas_select_all" on public.ideas;
drop policy if exists "ideas_insert_all" on public.ideas;
drop policy if exists "ideas_update_all" on public.ideas;
drop policy if exists "ideas_delete_all" on public.ideas;

drop policy if exists "calendar_events_select_all" on public.calendar_events;
drop policy if exists "calendar_events_insert_all" on public.calendar_events;
drop policy if exists "calendar_events_update_all" on public.calendar_events;
drop policy if exists "calendar_events_delete_all" on public.calendar_events;

drop policy if exists "history_events_select_all" on public.history_events;
drop policy if exists "history_events_insert_all" on public.history_events;
drop policy if exists "history_events_update_all" on public.history_events;
drop policy if exists "history_events_delete_all" on public.history_events;

drop policy if exists "story_logs_select_all" on public.story_logs;
drop policy if exists "story_logs_insert_all" on public.story_logs;
drop policy if exists "story_logs_update_all" on public.story_logs;
drop policy if exists "story_logs_delete_all" on public.story_logs;

drop policy if exists "posts_select_all" on public.posts;
drop policy if exists "posts_insert_all" on public.posts;
drop policy if exists "posts_update_all" on public.posts;
drop policy if exists "posts_delete_all" on public.posts;

drop policy if exists "shared_state_select_all" on public.shared_state;
drop policy if exists "shared_state_insert_all" on public.shared_state;
drop policy if exists "shared_state_update_all" on public.shared_state;
drop policy if exists "shared_state_delete_all" on public.shared_state;

drop policy if exists "app_preferences_select_own" on public.app_preferences;
drop policy if exists "app_preferences_insert_own" on public.app_preferences;
drop policy if exists "app_preferences_update_own" on public.app_preferences;
drop policy if exists "app_preferences_delete_own" on public.app_preferences;

create policy "team_profiles_select_all"
on public.team_profiles
for select
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null);

create policy "team_profiles_insert_all"
on public.team_profiles
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "team_profiles_update_all"
on public.team_profiles
for update
using (auth.role() = 'authenticated' and user_id = auth.uid())
with check (auth.role() = 'authenticated' and user_id = auth.uid());

create policy "team_profiles_delete_all"
on public.team_profiles
for delete
using (auth.role() = 'authenticated' and user_id = auth.uid());

create policy "goals_select_all"
on public.goals
for select
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null);

create policy "goals_insert_all"
on public.goals
for insert
with check (auth.role() = 'authenticated');

create policy "goals_update_all"
on public.goals
for update
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null)
with check (auth.role() = 'authenticated');

create policy "goals_delete_all"
on public.goals
for delete
using (false);

create policy "ideas_select_all"
on public.ideas
for select
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null);

create policy "ideas_insert_all"
on public.ideas
for insert
with check (auth.role() = 'authenticated');

create policy "ideas_update_all"
on public.ideas
for update
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null)
with check (auth.role() = 'authenticated');

create policy "ideas_delete_all"
on public.ideas
for delete
using (false);

create policy "calendar_events_select_all"
on public.calendar_events
for select
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null);

create policy "calendar_events_insert_all"
on public.calendar_events
for insert
with check (auth.role() = 'authenticated');

create policy "calendar_events_update_all"
on public.calendar_events
for update
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null)
with check (auth.role() = 'authenticated');

create policy "calendar_events_delete_all"
on public.calendar_events
for delete
using (false);

create policy "history_events_select_all"
on public.history_events
for select
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null);

create policy "history_events_insert_all"
on public.history_events
for insert
with check (auth.role() = 'authenticated');

create policy "history_events_update_all"
on public.history_events
for update
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null)
with check (auth.role() = 'authenticated');

create policy "history_events_delete_all"
on public.history_events
for delete
using (false);

create policy "story_logs_select_all"
on public.story_logs
for select
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null);

create policy "story_logs_insert_all"
on public.story_logs
for insert
with check (auth.role() = 'authenticated');

create policy "story_logs_update_all"
on public.story_logs
for update
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null)
with check (auth.role() = 'authenticated');

create policy "story_logs_delete_all"
on public.story_logs
for delete
using (false);

create policy "posts_select_all"
on public.posts
for select
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null);

create policy "posts_insert_all"
on public.posts
for insert
with check (auth.role() = 'authenticated');

create policy "posts_update_all"
on public.posts
for update
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null)
with check (auth.role() = 'authenticated');

create policy "posts_delete_all"
on public.posts
for delete
using (false);

create policy "shared_state_select_all"
on public.shared_state
for select
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null);

create policy "shared_state_insert_all"
on public.shared_state
for insert
with check (auth.role() = 'authenticated');

create policy "shared_state_update_all"
on public.shared_state
for update
using (auth.role() = 'authenticated' and deleted_at is null and archived_at is null)
with check (auth.role() = 'authenticated');

create policy "shared_state_delete_all"
on public.shared_state
for delete
using (false);

create policy "app_preferences_select_own"
on public.app_preferences
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id and deleted_at is null and archived_at is null);

create policy "app_preferences_insert_own"
on public.app_preferences
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "app_preferences_update_own"
on public.app_preferences
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id and deleted_at is null and archived_at is null)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "app_preferences_delete_own"
on public.app_preferences
for delete
using (false);

grant select, insert, update on public.team_profiles to anon, authenticated;
grant select, insert, update on public.goals to anon, authenticated;
grant select, insert, update on public.ideas to anon, authenticated;
grant select, insert, update on public.calendar_events to anon, authenticated;
grant select, insert, update on public.history_events to anon, authenticated;
grant select, insert, update on public.story_logs to anon, authenticated;
grant select, insert, update on public.posts to anon, authenticated;
grant select, insert, update, delete on public.shared_state to anon, authenticated;
grant select, insert, update, delete on public.app_preferences to anon, authenticated;
grant select on public.record_audit_log to authenticated;

create or replace function public.create_full_backup(p_label text default null)
returns uuid
language plpgsql
security definer
set search_path = public, backup, auth, pg_temp
as $$
declare
  backup_id uuid;
begin
  insert into backup.snapshot_runs (label, created_by)
  values (coalesce(p_label, to_char(now(), 'YYYY-MM-DD HH24:MI:SS')), auth.uid())
  returning id into backup_id;

  insert into backup.snapshot_rows (run_id, table_name, row_key, sort_order, row_data)
  select backup_id, 'team_profiles', t.id::text, null, to_jsonb(t)
  from public.team_profiles t;

  insert into backup.snapshot_rows (run_id, table_name, row_key, sort_order, row_data)
  select backup_id, 'goals', g.id::text, g.sort_order, to_jsonb(g)
  from public.goals g;

  insert into backup.snapshot_rows (run_id, table_name, row_key, sort_order, row_data)
  select backup_id, 'ideas', i.id::text, i.sort_order, to_jsonb(i)
  from public.ideas i;

  insert into backup.snapshot_rows (run_id, table_name, row_key, sort_order, row_data)
  select backup_id, 'calendar_events', c.id::text, c.sort_order, to_jsonb(c)
  from public.calendar_events c;

  insert into backup.snapshot_rows (run_id, table_name, row_key, sort_order, row_data)
  select backup_id, 'history_events', h.id::text, h.sort_order, to_jsonb(h)
  from public.history_events h;

  insert into backup.snapshot_rows (run_id, table_name, row_key, sort_order, row_data)
  select backup_id, 'story_logs', s.id::text, s.sort_order, to_jsonb(s)
  from public.story_logs s;

  insert into backup.snapshot_rows (run_id, table_name, row_key, sort_order, row_data)
  select backup_id, 'posts', p.id::text, p.sort_order, to_jsonb(p)
  from public.posts p;

  insert into backup.snapshot_rows (run_id, table_name, row_key, sort_order, row_data)
  select backup_id, 'shared_state', sh.key, null, to_jsonb(sh)
  from public.shared_state sh;

  insert into backup.snapshot_rows (run_id, table_name, row_key, sort_order, row_data)
  select backup_id, 'app_preferences', concat(ap.user_id::text, ':', ap.key), null, to_jsonb(ap)
  from public.app_preferences ap;

  return backup_id;
end;
$$;

create or replace function public.restore_full_backup(p_backup_id uuid)
returns void
language plpgsql
security definer
set search_path = public, backup, auth, pg_temp
as $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'team_profiles',
    'goals',
    'ideas',
    'calendar_events',
    'history_events',
    'story_logs',
    'posts',
    'shared_state',
    'app_preferences'
  ] loop
    execute format('delete from public.%I', table_name);
    execute format(
      $sql$
        insert into public.%1$I
        select *
        from jsonb_populate_recordset(
          null::public.%1$I,
          coalesce(
            (
              select jsonb_agg(row_data order by coalesce(sort_order, 0), row_key)
              from backup.snapshot_rows
              where run_id = $1
                and table_name = $2
            ),
            '[]'::jsonb
          )
        )
      $sql$,
      table_name
    ) using p_backup_id, table_name;

    insert into public.record_audit_log (
      table_name,
      record_key,
      action,
      changed_by,
      old_data,
      new_data
    ) values (
      table_name,
      p_backup_id::text,
      'restored',
      auth.uid(),
      null,
      jsonb_build_object('backup_id', p_backup_id, 'table_name', table_name)
    );
  end loop;
end;
$$;

commit;
