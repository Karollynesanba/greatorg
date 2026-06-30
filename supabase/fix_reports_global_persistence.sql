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
        "items":[
          {"title":"Dra. Alessandra","metric":"2,4k","accent":"#D10000","image":"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80"},
          {"title":"Dra. Raquel Castro","metric":"2,1k","accent":"#991B1B","image":"https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80"},
          {"title":"Dra. Camila Prado","metric":"1,8k","accent":"#7F1D1D","image":"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80"},
          {"title":"Dr. Felipe Souza","metric":"1,7k","accent":"#5B1414","image":"https://images.unsplash.com/photo-1516321497487-e288fb19713f?auto=format&fit=crop&w=900&q=80"},
          {"title":"Dr. Mauro Lima","metric":"1,6k","accent":"#8B1531","image":"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80"}
        ]
      },
      {
        "title":"20 depoimentos",
        "description":"Prova social com rostos, frases curtas e leitura rapida.",
        "action":"Ver todas",
        "items":[
          {"title":"Larissa M.","metric":"947","accent":"#D10000","image":"https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=900&q=80"},
          {"title":"Equipe Great","metric":"921","accent":"#991B1B","image":"https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80"},
          {"title":"Depoimento 03","metric":"867","accent":"#991B1B","image":"https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80"},
          {"title":"Depoimento 04","metric":"842","accent":"#5B1414","image":"https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?auto=format&fit=crop&w=900&q=80"},
          {"title":"Depoimento 05","metric":"764","accent":"#8B1531","image":"https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=80"},
          {"title":"Depoimento 06","metric":"721","accent":"#D10000","image":"https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=900&q=80"}
        ]
      },
      {
        "title":"10 entregas de material",
        "description":"Pecas finais, capas, cortes e materiais prontos para publicacao.",
        "action":"Ver todas",
        "items":[
          {"title":"Material 01","metric":"1,2k","accent":"#991B1B","image":"https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80"},
          {"title":"Material 02","metric":"1,0k","accent":"#7F1D1D","image":"https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=80"},
          {"title":"Material 03","metric":"987","accent":"#991B1B","image":"https://images.unsplash.com/photo-1554774853-719586f82d77?auto=format&fit=crop&w=900&q=80"},
          {"title":"Material 04","metric":"947","accent":"#5B1414","image":"https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=80"},
          {"title":"Material 05","metric":"912","accent":"#8B1531","image":"https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?auto=format&fit=crop&w=900&q=80"},
          {"title":"Material 06","metric":"876","accent":"#D10000","image":"https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80"}
        ]
      }
    ]'::jsonb
  )
on conflict (key) do nothing;

commit;
