begin;

create schema if not exists backup;

create table if not exists backup.goals (like public.goals including all);

insert into backup.goals
select *
from public.goals
on conflict do nothing;

create table if not exists public.goals (
  id bigint primary key,
  user_id uuid null references auth.users (id) on delete cascade,
  sort_order integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.goals
  add column if not exists user_id uuid null references auth.users (id) on delete cascade;

alter table public.goals
  add column if not exists sort_order integer not null default 0;

alter table public.goals
  add column if not exists data jsonb not null default '{}'::jsonb;

alter table public.goals
  add column if not exists created_at timestamptz not null default now();

alter table public.goals
  add column if not exists updated_at timestamptz not null default now();

create index if not exists goals_sort_order_idx on public.goals (sort_order);
create index if not exists goals_user_id_idx on public.goals (user_id);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists goals_touch_updated_at on public.goals;
create trigger goals_touch_updated_at
before insert or update on public.goals
for each row
execute function public.touch_updated_at();

alter table public.goals enable row level security;

drop policy if exists "goals_authenticated_select" on public.goals;
drop policy if exists "goals_authenticated_insert" on public.goals;
drop policy if exists "goals_authenticated_update" on public.goals;
drop policy if exists "goals_authenticated_delete" on public.goals;
drop policy if exists "goals_select_all" on public.goals;
drop policy if exists "goals_insert_all" on public.goals;
drop policy if exists "goals_update_all" on public.goals;
drop policy if exists "goals_delete_all" on public.goals;
drop policy if exists "goals_select_own" on public.goals;
drop policy if exists "goals_insert_own" on public.goals;
drop policy if exists "goals_update_own" on public.goals;
drop policy if exists "goals_delete_own" on public.goals;

create policy "goals_authenticated_select"
on public.goals
for select
to authenticated
using (true);

create policy "goals_authenticated_insert"
on public.goals
for insert
to authenticated
with check (true);

create policy "goals_authenticated_update"
on public.goals
for update
to authenticated
using (true)
with check (true);

create policy "goals_authenticated_delete"
on public.goals
for delete
to authenticated
using (true);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.goals to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'goals'
    ) then
      alter publication supabase_realtime add table public.goals;
    end if;
  end if;
end
$$;

commit;
