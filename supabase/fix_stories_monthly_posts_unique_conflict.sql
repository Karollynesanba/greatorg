begin;

create unique index if not exists stories_monthly_posts_user_month_date_category_unique_idx
  on public.stories_monthly_posts (user_id, reference_month, metric_date, category);

delete from public.stories_monthly_posts target
using public.stories_monthly_posts duplicate
where target.id < duplicate.id
  and target.user_id = duplicate.user_id
  and target.reference_month = duplicate.reference_month
  and target.metric_date = duplicate.metric_date
  and target.category = duplicate.category;

drop index if exists public.stories_monthly_posts_user_month_date_category_unique_idx;

alter table public.stories_monthly_posts
  drop constraint if exists stories_monthly_posts_user_id_reference_month_metric_date_category_key;

alter table public.stories_monthly_posts
  add constraint stories_monthly_posts_user_id_reference_month_metric_date_category_key
  unique (user_id, reference_month, metric_date, category);

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
