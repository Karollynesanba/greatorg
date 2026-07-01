begin;

-- Garantir colunas usadas pelo trigger e pelas policies.
alter table public.story_logs add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.story_logs add column if not exists reference_month date;
alter table public.story_logs add column if not exists metric_date date;
alter table public.story_logs add column if not exists category text;
alter table public.story_logs add column if not exists page_module text not null default 'stories';

-- Backfill defensivo para linhas antigas.
update public.story_logs
set
  reference_month = coalesce(reference_month, ((left(coalesce(data ->> 'date', current_date::text), 7) || '-01')::date)),
  metric_date = coalesce(metric_date, coalesce((data ->> 'date')::date, current_date)),
  category = coalesce(category, nullif(data ->> 'mediaType', ''), 'story')
where reference_month is null
   or metric_date is null
   or category is null;

-- Índices úteis.
create index if not exists story_logs_user_id_idx on public.story_logs (user_id);
create index if not exists stories_monthly_posts_lookup_idx
  on public.stories_monthly_posts (user_id, reference_month, metric_date);
create index if not exists stories_monthly_data_lookup_idx
  on public.stories_monthly_data (user_id, reference_month);

alter table public.story_logs enable row level security;
alter table public.stories_monthly_posts enable row level security;
alter table public.stories_monthly_data enable row level security;

-- Recria policies de CRUD para usuário autenticado.
drop policy if exists "story_logs_select_own" on public.story_logs;
drop policy if exists "story_logs_insert_own" on public.story_logs;
drop policy if exists "story_logs_update_own" on public.story_logs;
drop policy if exists "story_logs_delete_own" on public.story_logs;

create policy "story_logs_select_own"
on public.story_logs
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_logs_insert_own"
on public.story_logs
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_logs_update_own"
on public.story_logs
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_logs_delete_own"
on public.story_logs
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "stories_monthly_posts_select_own" on public.stories_monthly_posts;
drop policy if exists "stories_monthly_posts_insert_own" on public.stories_monthly_posts;
drop policy if exists "stories_monthly_posts_update_own" on public.stories_monthly_posts;
drop policy if exists "stories_monthly_posts_delete_own" on public.stories_monthly_posts;

create policy "stories_monthly_posts_select_own"
on public.stories_monthly_posts
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "stories_monthly_posts_insert_own"
on public.stories_monthly_posts
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "stories_monthly_posts_update_own"
on public.stories_monthly_posts
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "stories_monthly_posts_delete_own"
on public.stories_monthly_posts
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "stories_monthly_data_select_own" on public.stories_monthly_data;
drop policy if exists "stories_monthly_data_insert_own" on public.stories_monthly_data;
drop policy if exists "stories_monthly_data_update_own" on public.stories_monthly_data;
drop policy if exists "stories_monthly_data_delete_own" on public.stories_monthly_data;

create policy "stories_monthly_data_select_own"
on public.stories_monthly_data
for select
using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "stories_monthly_data_insert_own"
on public.stories_monthly_data
for insert
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "stories_monthly_data_update_own"
on public.stories_monthly_data
for update
using (auth.role() = 'authenticated' and auth.uid() = user_id)
with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "stories_monthly_data_delete_own"
on public.stories_monthly_data
for delete
using (auth.role() = 'authenticated' and auth.uid() = user_id);

grant select, insert, update, delete on public.story_logs to authenticated;
grant select, insert, update, delete on public.stories_monthly_posts to authenticated;
grant select, insert, update, delete on public.stories_monthly_data to authenticated;

-- Trigger como SECURITY DEFINER para não falhar na sincronização relacional.
create or replace function public.sync_story_log_to_monthly_posts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.stories_monthly_posts
    where user_id = old.user_id
      and source_story_log_id = old.id;
    return old;
  end if;

  insert into public.stories_monthly_posts (
    user_id,
    reference_month,
    metric_date,
    category,
    status,
    quantity,
    responsible_profile_id,
    published_by_profile_id,
    source_story_log_id,
    notes
  )
  values (
    new.user_id,
    coalesce(new.reference_month, public.month_start(new.metric_date)),
    coalesce(new.metric_date, current_date),
    coalesce(new.category, nullif(new.data ->> 'mediaType', ''), 'story'),
    nullif(new.data ->> 'status', ''),
    coalesce(nullif(new.data ->> 'quantity', '')::integer, 0),
    nullif(new.data ->> 'madeById', '')::bigint,
    nullif(new.data ->> 'postedById', '')::bigint,
    new.id,
    coalesce(new.data ->> 'notes', '')
  )
  on conflict (user_id, reference_month, metric_date, category) do update
  set
    status = excluded.status,
    quantity = excluded.quantity,
    responsible_profile_id = excluded.responsible_profile_id,
    published_by_profile_id = excluded.published_by_profile_id,
    source_story_log_id = excluded.source_story_log_id,
    notes = excluded.notes,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists story_logs_sync_relational on public.story_logs;
create trigger story_logs_sync_relational
after insert or update or delete on public.story_logs
for each row
execute function public.sync_story_log_to_monthly_posts();

commit;
