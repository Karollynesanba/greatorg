-- Great Organico
-- Corrige a persistencia global dos dados de relatorios/depoimentos
-- para todos os dispositivos, usuarios e deploys que apontam para este Supabase.
--
-- O objetivo aqui e:
-- 1. garantir que public.shared_state tenha chave unica global por `key`
-- 2. permitir select/insert/update/delete para todos os clientes autenticados
-- 3. habilitar realtime sem erro de replica identity
-- 4. preservar os dados mais recentes ja existentes
-- 5. garantir que as chaves dos relatorios existam e nao "sumam"

begin;

create table if not exists public.shared_state (
  key text not null,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.shared_state
  add column if not exists updated_at timestamptz not null default now();

alter table public.shared_state
  alter column key set not null;

alter table public.shared_state
  alter column value set not null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists shared_state_touch_updated_at on public.shared_state;
create trigger shared_state_touch_updated_at
before insert or update on public.shared_state
for each row
execute function public.touch_updated_at();

create table if not exists backup.shared_state_reports_fix (like public.shared_state including all);
insert into backup.shared_state_reports_fix
select *
from public.shared_state;

create temp table tmp_shared_state_dedup as
select distinct on (key)
  key,
  value,
  coalesce(updated_at, now()) as updated_at
from public.shared_state
where key is not null
order by key, coalesce(updated_at, now()) desc;

delete from public.shared_state;

insert into public.shared_state (key, value, updated_at)
select key, value, updated_at
from tmp_shared_state_dedup;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'shared_state'
      and constraint_type = 'PRIMARY KEY'
      and constraint_name <> 'shared_state_pkey'
  ) then
    execute (
      select 'alter table public.shared_state drop constraint ' || quote_ident(constraint_name)
      from information_schema.table_constraints
      where table_schema = 'public'
        and table_name = 'shared_state'
        and constraint_type = 'PRIMARY KEY'
        and constraint_name <> 'shared_state_pkey'
      limit 1
    );
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'shared_state'
      and constraint_name = 'shared_state_pkey'
      and constraint_type = 'PRIMARY KEY'
  ) then
    alter table public.shared_state
      add constraint shared_state_pkey primary key (key);
  end if;
end
$$;

create unique index if not exists shared_state_key_unique_idx
  on public.shared_state (key);

alter table public.shared_state replica identity full;
alter table public.shared_state enable row level security;

drop policy if exists "shared_state_select_all" on public.shared_state;
drop policy if exists "shared_state_insert_all" on public.shared_state;
drop policy if exists "shared_state_update_all" on public.shared_state;
drop policy if exists "shared_state_delete_all" on public.shared_state;
drop policy if exists "shared_state_authenticated_select" on public.shared_state;
drop policy if exists "shared_state_authenticated_insert" on public.shared_state;
drop policy if exists "shared_state_authenticated_update" on public.shared_state;
drop policy if exists "shared_state_authenticated_delete" on public.shared_state;
drop policy if exists "shared_state_select_own" on public.shared_state;
drop policy if exists "shared_state_insert_own" on public.shared_state;
drop policy if exists "shared_state_update_own" on public.shared_state;
drop policy if exists "shared_state_delete_own" on public.shared_state;

create policy "shared_state_select_all"
on public.shared_state
for select
using (auth.role() in ('authenticated', 'anon'));

create policy "shared_state_insert_all"
on public.shared_state
for insert
with check (auth.role() in ('authenticated', 'anon'));

create policy "shared_state_update_all"
on public.shared_state
for update
using (auth.role() in ('authenticated', 'anon'))
with check (auth.role() in ('authenticated', 'anon'));

create policy "shared_state_delete_all"
on public.shared_state
for delete
using (auth.role() in ('authenticated', 'anon'));

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.shared_state to anon, authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication p
    join pg_publication_tables pt on pt.pubid = p.oid
    join pg_class c on c.oid = pt.relid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'shared_state'
  ) then
    alter publication supabase_realtime add table public.shared_state;
  end if;
end
$$;

insert into public.shared_state (key, value)
values
  (
    'great-organico-reports-history',
    '[]'::jsonb
  ),
  (
    'great-organico-reports-overview',
    '{
      "badge":"Visao geral",
      "title":"Resumo executivo",
      "description":"O perfil mantem saude alta, acelera o crescimento de alcance e encontra mais eficiencia quando combina pecas de autoridade, prova social e materiais prontos para publicacao.",
      "note":"Pre-visualizacao local"
    }'::jsonb
  ),
  (
    'great-organico-reports-rows',
    '[
      {
        "title":"Capas em destaque",
        "description":"Visual forte para escalar o clique no feed e nos destaques.",
        "action":"Ver todas",
        "items":[]
      },
      {
        "title":"20 depoimentos",
        "description":"Prova social com rostos, frases curtas e leitura rapida.",
        "action":"Ver todas",
        "items":[]
      },
      {
        "title":"10 entregas de material",
        "description":"Pecas finais, capas, cortes e materiais prontos para publicacao.",
        "action":"Ver todas",
        "items":[]
      }
    ]'::jsonb
  )
on conflict (key) do nothing;

commit;
