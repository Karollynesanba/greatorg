alter table public.shared_state add column if not exists user_id uuid;
alter table public.shared_state add column if not exists created_at timestamptz not null default now();
alter table public.shared_state add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'shared_state'
      and constraint_type = 'PRIMARY KEY'
      and constraint_name = 'shared_state_pkey'
  ) then
    alter table public.shared_state drop constraint shared_state_pkey;
  end if;
exception
  when undefined_object then
    null;
end $$;

alter table public.shared_state
  alter column user_id set not null;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'shared_state'
      and constraint_name = 'shared_state_pkey'
  ) then
    alter table public.shared_state add constraint shared_state_pkey primary key (user_id, key);
  end if;
end $$;

create index if not exists shared_state_user_id_idx on public.shared_state (user_id);

alter table public.shared_state enable row level security;

drop policy if exists "shared_state_select_all" on public.shared_state;
drop policy if exists "shared_state_insert_all" on public.shared_state;
drop policy if exists "shared_state_update_all" on public.shared_state;
drop policy if exists "shared_state_delete_all" on public.shared_state;
drop policy if exists "shared_state_select_own" on public.shared_state;
drop policy if exists "shared_state_insert_own" on public.shared_state;
drop policy if exists "shared_state_update_own" on public.shared_state;
drop policy if exists "shared_state_delete_own" on public.shared_state;

create policy "shared_state_select_own"
on public.shared_state
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "shared_state_insert_own"
on public.shared_state
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "shared_state_update_own"
on public.shared_state
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "shared_state_delete_own"
on public.shared_state
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

grant select, insert, update, delete on public.shared_state to authenticated;
