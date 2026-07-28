create extension if not exists pgcrypto;

create or replace function public.month_start(input_date date)
returns date
language sql
immutable
as $$
  select date_trunc('month', input_date)::date
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := coalesce(new.created_at, now());
  end if;

  new.updated_at := now();
  return new;
end;
$$;

alter table public.goals add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.goals add column if not exists created_at timestamptz not null default now();
alter table public.goals add column if not exists updated_at timestamptz not null default now();
alter table public.goals add column if not exists page_module text not null default 'goals';
alter table public.goals add column if not exists reference_month date;
alter table public.goals add column if not exists metric_date date;
alter table public.goals add column if not exists category text;
alter table public.goals add column if not exists goal_name text;
alter table public.goals add column if not exists current_value numeric(14,2);
alter table public.goals add column if not exists target_value numeric(14,2);

alter table public.ideas add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.ideas add column if not exists created_at timestamptz not null default now();
alter table public.ideas add column if not exists updated_at timestamptz not null default now();
alter table public.ideas add column if not exists page_module text not null default 'ideas';
alter table public.ideas add column if not exists reference_month date;
alter table public.ideas add column if not exists metric_date date;
alter table public.ideas add column if not exists category text;
alter table public.ideas add column if not exists idea_title text;
alter table public.ideas add column if not exists idea_status text;
alter table public.ideas add column if not exists responsible_profile_id bigint;

alter table public.calendar_events add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.calendar_events add column if not exists created_at timestamptz not null default now();
alter table public.calendar_events add column if not exists updated_at timestamptz not null default now();
alter table public.calendar_events add column if not exists page_module text not null default 'calendar';
alter table public.calendar_events add column if not exists reference_month date;
alter table public.calendar_events add column if not exists metric_date date;
alter table public.calendar_events add column if not exists category text;
alter table public.calendar_events add column if not exists item_title text;
alter table public.calendar_events add column if not exists item_status text;
alter table public.calendar_events add column if not exists content_type text;
alter table public.calendar_events add column if not exists responsible_profile_id bigint;

alter table public.history_events add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.history_events add column if not exists created_at timestamptz not null default now();
alter table public.history_events add column if not exists updated_at timestamptz not null default now();
alter table public.history_events add column if not exists page_module text not null default 'history';
alter table public.history_events add column if not exists reference_month date;
alter table public.history_events add column if not exists metric_date date;
alter table public.history_events add column if not exists category text;
alter table public.history_events add column if not exists event_title text;
alter table public.history_events add column if not exists event_type text;

alter table public.story_logs add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.story_logs add column if not exists created_at timestamptz not null default now();
alter table public.story_logs add column if not exists updated_at timestamptz not null default now();
alter table public.story_logs add column if not exists page_module text not null default 'stories';
alter table public.story_logs add column if not exists reference_month date;
alter table public.story_logs add column if not exists metric_date date;
alter table public.story_logs add column if not exists category text;

alter table public.posts add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.posts add column if not exists created_at timestamptz not null default now();
alter table public.posts add column if not exists updated_at timestamptz not null default now();
alter table public.posts add column if not exists page_module text not null default 'content';
alter table public.posts add column if not exists reference_month date;
alter table public.posts add column if not exists metric_date date;
alter table public.posts add column if not exists category text;
alter table public.posts add column if not exists content_title text;
alter table public.posts add column if not exists content_status text;
alter table public.posts add column if not exists author_profile_id bigint;
alter table public.posts add column if not exists reach_value numeric(14,2);
alter table public.posts add column if not exists engagement_value numeric(14,2);

alter table public.shared_state add column if not exists user_id uuid references auth.users (id) on delete cascade;
alter table public.shared_state add column if not exists created_at timestamptz not null default now();
alter table public.shared_state add column if not exists updated_at timestamptz not null default now();

alter table public.app_preferences add column if not exists created_at timestamptz not null default now();

create table if not exists public.story_goal_metrics (
  user_id uuid not null references auth.users (id) on delete cascade,
  month_key text not null,
  category text not null,
  current_value integer not null default 0,
  goal_value integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month_key, category)
);

create table if not exists public.story_metrics (
  user_id uuid not null references auth.users (id) on delete cascade,
  month_key text not null,
  metric text not null,
  value integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, month_key, metric)
);

create index if not exists goals_user_month_idx on public.goals (user_id, reference_month);
create index if not exists goals_user_metric_date_idx on public.goals (user_id, metric_date);
create index if not exists ideas_user_month_idx on public.ideas (user_id, reference_month);
create index if not exists ideas_user_metric_date_idx on public.ideas (user_id, metric_date);
create index if not exists calendar_events_user_month_idx on public.calendar_events (user_id, reference_month);
create index if not exists calendar_events_user_metric_date_idx on public.calendar_events (user_id, metric_date);
create index if not exists history_events_user_month_idx on public.history_events (user_id, reference_month);
create index if not exists history_events_user_metric_date_idx on public.history_events (user_id, metric_date);
create index if not exists story_logs_user_month_idx on public.story_logs (user_id, reference_month);
create index if not exists story_logs_user_metric_date_idx on public.story_logs (user_id, metric_date);
create index if not exists posts_user_month_idx on public.posts (user_id, reference_month);
create index if not exists posts_user_metric_date_idx on public.posts (user_id, metric_date);

create table if not exists public.stories_monthly_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  page_module text not null default 'stories',
  reference_month date not null,
  category text not null,
  current_value numeric(14,2) not null default 0,
  goal_value numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, page_module, reference_month, category)
);

create table if not exists public.stories_monthly_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reference_month date not null,
  metric_date date not null,
  category text not null,
  status text,
  quantity integer not null default 0,
  responsible_profile_id bigint,
  published_by_profile_id bigint,
  source_story_log_id bigint,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_story_log_id),
  unique (user_id, reference_month, metric_date, category, responsible_profile_id, published_by_profile_id, quantity)
);

create table if not exists public.daily_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  page_module text not null,
  reference_month date not null,
  category text not null,
  metric_date date not null,
  metric_value numeric(14,2) not null default 0,
  source_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, page_module, category, metric_date)
);

create table if not exists public.dashboard_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  page_module text not null,
  reference_month date not null,
  category text not null,
  current_value numeric(14,2) not null default 0,
  goal_value numeric(14,2) not null default 0,
  source_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, page_module, reference_month, category)
);

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

create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reference_month date not null,
  metric_date date not null,
  category text not null default 'content',
  title text not null,
  status text,
  author_profile_id bigint,
  reach_value numeric(14,2) not null default 0,
  engagement_value numeric(14,2) not null default 0,
  source_post_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, source_post_id)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  page_module text not null default 'reports',
  report_kind text not null,
  reference_month date not null,
  category text not null default 'general',
  metric_date date,
  external_key text,
  title text not null default '',
  period_start date,
  period_end date,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, page_module, report_kind, reference_month, external_key)
);

create index if not exists stories_monthly_data_lookup_idx on public.stories_monthly_data (user_id, reference_month, category);
create index if not exists stories_monthly_posts_lookup_idx on public.stories_monthly_posts (user_id, reference_month, metric_date);
create index if not exists daily_metrics_lookup_idx on public.daily_metrics (user_id, metric_date, category);
create index if not exists dashboard_goals_lookup_idx on public.dashboard_goals (user_id, reference_month, category);
create index if not exists calendar_items_lookup_idx on public.calendar_items (user_id, reference_month, metric_date);
create index if not exists contents_lookup_idx on public.contents (user_id, reference_month, metric_date);
create index if not exists reports_lookup_idx on public.reports (user_id, reference_month, report_kind);

alter table public.stories_monthly_data enable row level security;
alter table public.stories_monthly_posts enable row level security;
alter table public.daily_metrics enable row level security;
alter table public.dashboard_goals enable row level security;
alter table public.calendar_items enable row level security;
alter table public.contents enable row level security;
alter table public.reports enable row level security;
alter table public.story_goal_metrics enable row level security;
alter table public.story_metrics enable row level security;

drop policy if exists "goals_select_all" on public.goals;
drop policy if exists "goals_insert_all" on public.goals;
drop policy if exists "goals_update_all" on public.goals;
drop policy if exists "goals_delete_all" on public.goals;
drop policy if exists "goals_select_own" on public.goals;
drop policy if exists "goals_insert_own" on public.goals;
drop policy if exists "goals_update_own" on public.goals;
drop policy if exists "goals_delete_own" on public.goals;

drop policy if exists "ideas_select_all" on public.ideas;
drop policy if exists "ideas_insert_all" on public.ideas;
drop policy if exists "ideas_update_all" on public.ideas;
drop policy if exists "ideas_delete_all" on public.ideas;
drop policy if exists "ideas_select_own" on public.ideas;
drop policy if exists "ideas_insert_own" on public.ideas;
drop policy if exists "ideas_update_own" on public.ideas;
drop policy if exists "ideas_delete_own" on public.ideas;

drop policy if exists "calendar_events_select_all" on public.calendar_events;
drop policy if exists "calendar_events_insert_all" on public.calendar_events;
drop policy if exists "calendar_events_update_all" on public.calendar_events;
drop policy if exists "calendar_events_delete_all" on public.calendar_events;
drop policy if exists "calendar_events_select_own" on public.calendar_events;
drop policy if exists "calendar_events_insert_own" on public.calendar_events;
drop policy if exists "calendar_events_update_own" on public.calendar_events;
drop policy if exists "calendar_events_delete_own" on public.calendar_events;

drop policy if exists "history_events_select_all" on public.history_events;
drop policy if exists "history_events_insert_all" on public.history_events;
drop policy if exists "history_events_update_all" on public.history_events;
drop policy if exists "history_events_delete_all" on public.history_events;
drop policy if exists "history_events_select_own" on public.history_events;
drop policy if exists "history_events_insert_own" on public.history_events;
drop policy if exists "history_events_update_own" on public.history_events;
drop policy if exists "history_events_delete_own" on public.history_events;

drop policy if exists "story_logs_select_all" on public.story_logs;
drop policy if exists "story_logs_insert_all" on public.story_logs;
drop policy if exists "story_logs_update_all" on public.story_logs;
drop policy if exists "story_logs_delete_all" on public.story_logs;
drop policy if exists "story_logs_select_own" on public.story_logs;
drop policy if exists "story_logs_insert_own" on public.story_logs;
drop policy if exists "story_logs_update_own" on public.story_logs;
drop policy if exists "story_logs_delete_own" on public.story_logs;

drop policy if exists "posts_select_all" on public.posts;
drop policy if exists "posts_insert_all" on public.posts;
drop policy if exists "posts_update_all" on public.posts;
drop policy if exists "posts_delete_all" on public.posts;
drop policy if exists "posts_select_own" on public.posts;
drop policy if exists "posts_insert_own" on public.posts;
drop policy if exists "posts_update_own" on public.posts;
drop policy if exists "posts_delete_own" on public.posts;

drop policy if exists "stories_monthly_data_select_own" on public.stories_monthly_data;
drop policy if exists "stories_monthly_data_insert_own" on public.stories_monthly_data;
drop policy if exists "stories_monthly_data_update_own" on public.stories_monthly_data;
drop policy if exists "stories_monthly_data_delete_own" on public.stories_monthly_data;
drop policy if exists "stories_monthly_posts_select_own" on public.stories_monthly_posts;
drop policy if exists "stories_monthly_posts_insert_own" on public.stories_monthly_posts;
drop policy if exists "stories_monthly_posts_update_own" on public.stories_monthly_posts;
drop policy if exists "stories_monthly_posts_delete_own" on public.stories_monthly_posts;
drop policy if exists "daily_metrics_select_own" on public.daily_metrics;
drop policy if exists "daily_metrics_insert_own" on public.daily_metrics;
drop policy if exists "daily_metrics_update_own" on public.daily_metrics;
drop policy if exists "daily_metrics_delete_own" on public.daily_metrics;
drop policy if exists "dashboard_goals_select_own" on public.dashboard_goals;
drop policy if exists "dashboard_goals_insert_own" on public.dashboard_goals;
drop policy if exists "dashboard_goals_update_own" on public.dashboard_goals;
drop policy if exists "dashboard_goals_delete_own" on public.dashboard_goals;
drop policy if exists "calendar_items_select_own" on public.calendar_items;
drop policy if exists "calendar_items_insert_own" on public.calendar_items;
drop policy if exists "calendar_items_update_own" on public.calendar_items;
drop policy if exists "calendar_items_delete_own" on public.calendar_items;
drop policy if exists "contents_select_own" on public.contents;
drop policy if exists "contents_insert_own" on public.contents;
drop policy if exists "contents_update_own" on public.contents;
drop policy if exists "contents_delete_own" on public.contents;
drop policy if exists "reports_select_own" on public.reports;
drop policy if exists "reports_insert_own" on public.reports;
drop policy if exists "reports_update_own" on public.reports;
drop policy if exists "reports_delete_own" on public.reports;
drop policy if exists "story_goal_metrics_select_own" on public.story_goal_metrics;
drop policy if exists "story_goal_metrics_insert_own" on public.story_goal_metrics;
drop policy if exists "story_goal_metrics_update_own" on public.story_goal_metrics;
drop policy if exists "story_goal_metrics_delete_own" on public.story_goal_metrics;
drop policy if exists "story_metrics_select_own" on public.story_metrics;
drop policy if exists "story_metrics_insert_own" on public.story_metrics;
drop policy if exists "story_metrics_update_own" on public.story_metrics;
drop policy if exists "story_metrics_delete_own" on public.story_metrics;

create policy "goals_select_own" on public.goals for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "goals_insert_own" on public.goals for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "goals_update_own" on public.goals for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "goals_delete_own" on public.goals for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "ideas_select_own" on public.ideas for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "ideas_insert_own" on public.ideas for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "ideas_update_own" on public.ideas for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "ideas_delete_own" on public.ideas for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "calendar_events_select_own" on public.calendar_events for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "calendar_events_insert_own" on public.calendar_events for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "calendar_events_update_own" on public.calendar_events for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "calendar_events_delete_own" on public.calendar_events for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "history_events_select_own" on public.history_events for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "history_events_insert_own" on public.history_events for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "history_events_update_own" on public.history_events for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "history_events_delete_own" on public.history_events for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "story_logs_select_own" on public.story_logs for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "story_logs_insert_own" on public.story_logs for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "story_logs_update_own" on public.story_logs for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "story_logs_delete_own" on public.story_logs for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "posts_select_own" on public.posts for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "posts_insert_own" on public.posts for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "posts_update_own" on public.posts for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "posts_delete_own" on public.posts for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "stories_monthly_data_select_own" on public.stories_monthly_data for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "stories_monthly_data_insert_own" on public.stories_monthly_data for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "stories_monthly_data_update_own" on public.stories_monthly_data for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "stories_monthly_data_delete_own" on public.stories_monthly_data for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "stories_monthly_posts_select_own" on public.stories_monthly_posts for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "stories_monthly_posts_insert_own" on public.stories_monthly_posts for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "stories_monthly_posts_update_own" on public.stories_monthly_posts for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "stories_monthly_posts_delete_own" on public.stories_monthly_posts for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "daily_metrics_select_own" on public.daily_metrics for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "daily_metrics_insert_own" on public.daily_metrics for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "daily_metrics_update_own" on public.daily_metrics for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "daily_metrics_delete_own" on public.daily_metrics for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "dashboard_goals_select_own" on public.dashboard_goals for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "dashboard_goals_insert_own" on public.dashboard_goals for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "dashboard_goals_update_own" on public.dashboard_goals for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "dashboard_goals_delete_own" on public.dashboard_goals for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "calendar_items_select_own" on public.calendar_items for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "calendar_items_insert_own" on public.calendar_items for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "calendar_items_update_own" on public.calendar_items for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "calendar_items_delete_own" on public.calendar_items for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "contents_select_own" on public.contents for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "contents_insert_own" on public.contents for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "contents_update_own" on public.contents for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "contents_delete_own" on public.contents for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "reports_select_own" on public.reports for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "reports_insert_own" on public.reports for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "reports_update_own" on public.reports for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "reports_delete_own" on public.reports for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "story_goal_metrics_select_own" on public.story_goal_metrics for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "story_goal_metrics_insert_own" on public.story_goal_metrics for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "story_goal_metrics_update_own" on public.story_goal_metrics for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "story_goal_metrics_delete_own" on public.story_goal_metrics for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "story_metrics_select_own" on public.story_metrics for select using (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "story_metrics_insert_own" on public.story_metrics for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "story_metrics_update_own" on public.story_metrics for update using (auth.role() = 'authenticated' and auth.uid() = user_id) with check (auth.role() = 'authenticated' and auth.uid() = user_id);
create policy "story_metrics_delete_own" on public.story_metrics for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

create or replace function public.sync_goal_columns()
returns trigger
language plpgsql
as $$
declare
  deadline_date date;
begin
  deadline_date := nullif(new.data ->> 'deadline', '')::date;
  new.metric_date := coalesce(deadline_date, new.metric_date, current_date);
  new.reference_month := coalesce(public.month_start(new.metric_date), new.reference_month, public.month_start(current_date));
  new.category := coalesce(nullif(new.data ->> 'metric', ''), new.category, 'goal');
  new.goal_name := coalesce(nullif(new.data ->> 'name', ''), new.goal_name, 'Meta');
  new.current_value := coalesce(nullif(new.data ->> 'current', '')::numeric, new.current_value, 0);
  new.target_value := coalesce(nullif(new.data ->> 'target', '')::numeric, new.target_value, 0);
  return new;
end;
$$;

create or replace function public.sync_idea_columns()
returns trigger
language plpgsql
as $$
begin
  new.metric_date := coalesce(new.metric_date, current_date);
  new.reference_month := coalesce(new.reference_month, public.month_start(new.metric_date));
  new.category := coalesce(nullif(new.data ->> 'category', ''), new.category, 'idea');
  new.idea_title := coalesce(nullif(new.data ->> 'title', ''), new.idea_title, 'Ideia');
  new.idea_status := coalesce(nullif(new.data ->> 'status', ''), new.idea_status, 'Ideia');
  new.responsible_profile_id := coalesce(nullif(new.data ->> 'responsibleId', '')::bigint, new.responsible_profile_id);
  return new;
end;
$$;

create or replace function public.sync_calendar_columns()
returns trigger
language plpgsql
as $$
declare
  event_date date;
begin
  event_date := nullif(new.data ->> 'date', '')::date;
  new.metric_date := coalesce(event_date, new.metric_date, current_date);
  new.reference_month := coalesce(new.reference_month, public.month_start(new.metric_date));
  new.category := coalesce(nullif(new.data ->> 'type', ''), new.category, 'calendar_item');
  new.item_title := coalesce(nullif(new.data ->> 'title', ''), new.item_title, 'Item');
  new.item_status := coalesce(nullif(new.data ->> 'status', ''), new.item_status);
  new.content_type := coalesce(nullif(new.data ->> 'type', ''), new.content_type);
  new.responsible_profile_id := coalesce(nullif(new.data ->> 'responsibleId', '')::bigint, new.responsible_profile_id);
  return new;
end;
$$;

create or replace function public.sync_history_columns()
returns trigger
language plpgsql
as $$
declare
  event_date date;
begin
  event_date := nullif(new.data ->> 'date', '')::date;
  new.metric_date := coalesce(event_date, new.metric_date, current_date);
  new.reference_month := coalesce(new.reference_month, public.month_start(new.metric_date));
  new.category := coalesce(nullif(new.data ->> 'type', ''), new.category, 'history');
  new.event_title := coalesce(nullif(new.data ->> 'title', ''), new.event_title, 'Evento');
  new.event_type := coalesce(nullif(new.data ->> 'type', ''), new.event_type, 'history');
  return new;
end;
$$;

create or replace function public.sync_story_columns()
returns trigger
language plpgsql
as $$
declare
  event_date date;
begin
  event_date := nullif(new.data ->> 'date', '')::date;
  new.metric_date := coalesce(event_date, new.metric_date, current_date);
  new.reference_month := coalesce(new.reference_month, public.month_start(new.metric_date));
  new.category := coalesce(nullif(new.data ->> 'mediaType', ''), new.category, 'story');
  return new;
end;
$$;

create or replace function public.sync_post_columns()
returns trigger
language plpgsql
as $$
declare
  post_date date;
begin
  post_date := nullif(new.data ->> 'date', '')::date;
  new.metric_date := coalesce(post_date, new.metric_date, current_date);
  new.reference_month := coalesce(new.reference_month, public.month_start(new.metric_date));
  new.category := coalesce(nullif(new.data ->> 'type', ''), new.category, 'content');
  new.content_title := coalesce(nullif(new.data ->> 'title', ''), new.content_title, 'Conteudo');
  new.content_status := coalesce(nullif(new.data ->> 'status', ''), new.content_status);
  new.author_profile_id := coalesce(nullif(new.data ->> 'authorId', '')::bigint, new.author_profile_id);
  new.reach_value := coalesce(nullif(new.data ->> 'reach', '')::numeric, new.reach_value, 0);
  new.engagement_value := coalesce(nullif(new.data ->> 'engagement', '')::numeric, new.engagement_value, 0);
  return new;
end;
$$;

drop trigger if exists goals_touch_updated_at on public.goals;
drop trigger if exists ideas_touch_updated_at on public.ideas;
drop trigger if exists calendar_events_touch_updated_at on public.calendar_events;
drop trigger if exists history_events_touch_updated_at on public.history_events;
drop trigger if exists story_logs_touch_updated_at on public.story_logs;
drop trigger if exists posts_touch_updated_at on public.posts;
drop trigger if exists app_preferences_touch_updated_at on public.app_preferences;

drop trigger if exists goals_sync_columns on public.goals;
drop trigger if exists ideas_sync_columns on public.ideas;
drop trigger if exists calendar_events_sync_columns on public.calendar_events;
drop trigger if exists history_events_sync_columns on public.history_events;
drop trigger if exists story_logs_sync_columns on public.story_logs;
drop trigger if exists posts_sync_columns on public.posts;

create trigger goals_touch_updated_at before insert or update on public.goals for each row execute function public.touch_updated_at();
create trigger ideas_touch_updated_at before insert or update on public.ideas for each row execute function public.touch_updated_at();
create trigger calendar_events_touch_updated_at before insert or update on public.calendar_events for each row execute function public.touch_updated_at();
create trigger history_events_touch_updated_at before insert or update on public.history_events for each row execute function public.touch_updated_at();
create trigger story_logs_touch_updated_at before insert or update on public.story_logs for each row execute function public.touch_updated_at();
create trigger posts_touch_updated_at before insert or update on public.posts for each row execute function public.touch_updated_at();
create trigger app_preferences_touch_updated_at before insert or update on public.app_preferences for each row execute function public.touch_updated_at();

create trigger goals_sync_columns before insert or update on public.goals for each row execute function public.sync_goal_columns();
create trigger ideas_sync_columns before insert or update on public.ideas for each row execute function public.sync_idea_columns();
create trigger calendar_events_sync_columns before insert or update on public.calendar_events for each row execute function public.sync_calendar_columns();
create trigger history_events_sync_columns before insert or update on public.history_events for each row execute function public.sync_history_columns();
create trigger story_logs_sync_columns before insert or update on public.story_logs for each row execute function public.sync_story_columns();
create trigger posts_sync_columns before insert or update on public.posts for each row execute function public.sync_post_columns();

create or replace function public.sync_story_log_to_monthly_posts()
returns trigger
language plpgsql
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
    coalesce(new.category, 'story'),
    coalesce(new.data ->> 'status', null),
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

create or replace function public.sync_calendar_event_to_calendar_items()
returns trigger
language plpgsql
as $$
declare
  event_time text;
begin
  if tg_op = 'DELETE' then
    delete from public.calendar_items
    where user_id = old.user_id
      and source_calendar_event_id = old.id;
    return old;
  end if;

  event_time := nullif(new.data ->> 'time', '');

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
    starts_at
  )
  values (
    new.user_id,
    coalesce(new.reference_month, public.month_start(new.metric_date)),
    coalesce(new.metric_date, current_date),
    coalesce(new.category, 'calendar_item'),
    coalesce(new.item_title, 'Item'),
    coalesce(new.data ->> 'description', ''),
    new.item_status,
    new.content_type,
    new.responsible_profile_id,
    new.id,
    case
      when new.metric_date is not null and event_time is not null then (new.metric_date::text || ' ' || event_time)::timestamptz
      else null
    end
  )
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
    updated_at = now();

  return new;
end;
$$;

create or replace function public.sync_post_to_contents()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.contents
    where user_id = old.user_id
      and source_post_id = old.id;
    return old;
  end if;

  insert into public.contents (
    user_id,
    reference_month,
    metric_date,
    category,
    title,
    status,
    author_profile_id,
    reach_value,
    engagement_value,
    source_post_id
  )
  values (
    new.user_id,
    coalesce(new.reference_month, public.month_start(new.metric_date)),
    coalesce(new.metric_date, current_date),
    coalesce(new.category, 'content'),
    coalesce(new.content_title, 'Conteudo'),
    new.content_status,
    new.author_profile_id,
    coalesce(new.reach_value, 0),
    coalesce(new.engagement_value, 0),
    new.id
  )
  on conflict (user_id, source_post_id) do update
  set
    reference_month = excluded.reference_month,
    metric_date = excluded.metric_date,
    category = excluded.category,
    title = excluded.title,
    status = excluded.status,
    author_profile_id = excluded.author_profile_id,
    reach_value = excluded.reach_value,
    engagement_value = excluded.engagement_value,
    updated_at = now();

  return new;
end;
$$;

create or replace function public.sync_story_goal_metric_to_monthly_data()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.stories_monthly_data
    where user_id = old.user_id
      and page_module = 'stories'
      and reference_month = to_date(old.month_key || '-01', 'YYYY-MM-DD')
      and category = old.category;
    return old;
  end if;

  insert into public.stories_monthly_data (
    user_id,
    page_module,
    reference_month,
    category,
    current_value,
    goal_value
  )
  values (
    new.user_id,
    'stories',
    to_date(new.month_key || '-01', 'YYYY-MM-DD'),
    new.category,
    coalesce(new.current_value, 0),
    coalesce(new.goal_value, 0)
  )
  on conflict (user_id, page_module, reference_month, category) do update
  set
    current_value = excluded.current_value,
    goal_value = excluded.goal_value,
    updated_at = now();

  return new;
end;
$$;

create or replace function public.sync_story_metric_to_monthly_data()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.stories_monthly_data
    where user_id = old.user_id
      and page_module = 'stories'
      and reference_month = to_date(old.month_key || '-01', 'YYYY-MM-DD')
      and category = old.metric;
    return old;
  end if;

  insert into public.stories_monthly_data (
    user_id,
    page_module,
    reference_month,
    category,
    current_value,
    goal_value
  )
  values (
    new.user_id,
    'stories',
    to_date(new.month_key || '-01', 'YYYY-MM-DD'),
    new.metric,
    coalesce(new.value, 0),
    0
  )
  on conflict (user_id, page_module, reference_month, category) do update
  set
    current_value = excluded.current_value,
    updated_at = now();

  return new;
end;
$$;

create or replace function public.sync_shared_state_to_relational()
returns trigger
language plpgsql
as $$
declare
  pair record;
  report_item jsonb;
  month_key text;
  ref_month date;
begin
  if new.user_id is null then
    return new;
  end if;

  if new.key = 'calendar-day-views' then
    for pair in select key, value from jsonb_each_text(coalesce(new.value, '{}'::jsonb))
    loop
      insert into public.daily_metrics (user_id, page_module, reference_month, category, metric_date, metric_value, source_key)
      values (
        new.user_id,
        'calendar',
        public.month_start(pair.key::date),
        'views',
        pair.key::date,
        coalesce(pair.value::numeric, 0),
        new.key
      )
      on conflict (user_id, page_module, category, metric_date) do update
      set
        metric_value = excluded.metric_value,
        updated_at = now();
    end loop;
  elsif new.key = 'calendar-day-reach' then
    for pair in select key, value from jsonb_each_text(coalesce(new.value, '{}'::jsonb))
    loop
      insert into public.daily_metrics (user_id, page_module, reference_month, category, metric_date, metric_value, source_key)
      values (
        new.user_id,
        'calendar',
        public.month_start(pair.key::date),
        'reach',
        pair.key::date,
        coalesce(pair.value::numeric, 0),
        new.key
      )
      on conflict (user_id, page_module, category, metric_date) do update
      set
        metric_value = excluded.metric_value,
        updated_at = now();
    end loop;
  elsif new.key = 'dashboard-daily-followers' then
    for pair in select key, value from jsonb_each_text(coalesce(new.value, '{}'::jsonb))
    loop
      insert into public.daily_metrics (user_id, page_module, reference_month, category, metric_date, metric_value, source_key)
      values (
        new.user_id,
        'dashboard',
        public.month_start(pair.key::date),
        'followers',
        pair.key::date,
        coalesce(pair.value::numeric, 0),
        new.key
      )
      on conflict (user_id, page_module, category, metric_date) do update
      set
        metric_value = excluded.metric_value,
        updated_at = now();
    end loop;
  elsif new.key = 'calendar-monthly-views-goal' then
    insert into public.dashboard_goals (user_id, page_module, reference_month, category, goal_value, source_key)
    values (
      new.user_id,
      'calendar',
      public.month_start(current_date),
      'views',
      coalesce((new.value #>> '{}')::numeric, 0),
      new.key
    )
    on conflict (user_id, page_module, reference_month, category) do update
    set
      goal_value = excluded.goal_value,
      updated_at = now();
  elsif new.key = 'dashboard-metric-goals' then
    for pair in select key, value from jsonb_each_text(coalesce(new.value, '{}'::jsonb))
    loop
      insert into public.dashboard_goals (user_id, page_module, reference_month, category, goal_value, source_key)
      values (
        new.user_id,
        'dashboard',
        public.month_start(current_date),
        pair.key,
        coalesce(pair.value::numeric, 0),
        new.key
      )
      on conflict (user_id, page_module, reference_month, category) do update
      set
        goal_value = excluded.goal_value,
        updated_at = now();
    end loop;
  elsif new.key = 'great-organico-reports-history' then
    for report_item in select value from jsonb_array_elements(coalesce(new.value, '[]'::jsonb))
    loop
      month_key := coalesce(substring(report_item ->> 'startDate' from 1 for 7), to_char(current_date, 'YYYY-MM'));
      ref_month := to_date(month_key || '-01', 'YYYY-MM-DD');

      insert into public.reports (
        user_id,
        page_module,
        report_kind,
        reference_month,
        category,
        metric_date,
        external_key,
        title,
        period_start,
        period_end,
        payload
      )
      values (
        new.user_id,
        'reports',
        'saved_report',
        ref_month,
        coalesce(report_item ->> 'typeFilter', 'general'),
        nullif(report_item ->> 'generatedAt', '')::date,
        coalesce(report_item ->> 'id', gen_random_uuid()::text),
        coalesce(report_item ->> 'label', 'Relatorio'),
        nullif(report_item ->> 'startDate', '')::date,
        nullif(report_item ->> 'endDate', '')::date,
        report_item
      )
      on conflict (user_id, page_module, report_kind, reference_month, external_key) do update
      set
        title = excluded.title,
        period_start = excluded.period_start,
        period_end = excluded.period_end,
        payload = excluded.payload,
        updated_at = now();
    end loop;
  elsif new.key = 'great-organico-reports-overview' then
    insert into public.reports (
      user_id,
      page_module,
      report_kind,
      reference_month,
      category,
      external_key,
      title,
      payload
    )
    values (
      new.user_id,
      'reports',
      'overview',
      public.month_start(current_date),
      'overview',
      new.key,
      coalesce(new.value ->> 'title', 'Resumo executivo'),
      new.value
    )
    on conflict (user_id, page_module, report_kind, reference_month, external_key) do update
    set
      title = excluded.title,
      payload = excluded.payload,
      updated_at = now();
  elsif new.key = 'great-organico-reports-rows' then
    insert into public.reports (
      user_id,
      page_module,
      report_kind,
      reference_month,
      category,
      external_key,
      title,
      payload
    )
    values (
      new.user_id,
      'reports',
      'layout',
      public.month_start(current_date),
      'rows',
      new.key,
      'Layout do relatorio',
      new.value
    )
    on conflict (user_id, page_module, report_kind, reference_month, external_key) do update
    set
      payload = excluded.payload,
      updated_at = now();
  elsif new.key = 'great-organico-monthly-archive' then
    month_key := coalesce(new.value ->> 'monthKey', to_char(current_date, 'YYYY-MM'));
    ref_month := to_date(month_key || '-01', 'YYYY-MM-DD');

    insert into public.reports (
      user_id,
      page_module,
      report_kind,
      reference_month,
      category,
      external_key,
      title,
      payload
    )
    values (
      new.user_id,
      'reports',
      'monthly_archive',
      ref_month,
      'archive',
      month_key,
      'Arquivo mensal',
      new.value
    )
    on conflict (user_id, page_module, report_kind, reference_month, external_key) do update
    set
      payload = excluded.payload,
      updated_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists story_logs_sync_relational on public.story_logs;
drop trigger if exists calendar_events_sync_relational on public.calendar_events;
drop trigger if exists posts_sync_relational on public.posts;
drop trigger if exists story_goal_metrics_sync_relational on public.story_goal_metrics;
drop trigger if exists story_metrics_sync_relational on public.story_metrics;
drop trigger if exists shared_state_sync_relational on public.shared_state;

create trigger story_logs_sync_relational after insert or update or delete on public.story_logs for each row execute function public.sync_story_log_to_monthly_posts();
create trigger calendar_events_sync_relational after insert or update or delete on public.calendar_events for each row execute function public.sync_calendar_event_to_calendar_items();
create trigger posts_sync_relational after insert or update or delete on public.posts for each row execute function public.sync_post_to_contents();

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'story_goal_metrics'
  ) then
    execute 'create trigger story_goal_metrics_sync_relational after insert or update or delete on public.story_goal_metrics for each row execute function public.sync_story_goal_metric_to_monthly_data()';
  end if;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'story_metrics'
  ) then
    execute 'create trigger story_metrics_sync_relational after insert or update or delete on public.story_metrics for each row execute function public.sync_story_metric_to_monthly_data()';
  end if;
exception
  when duplicate_object then null;
end $$;

create trigger shared_state_sync_relational after insert or update on public.shared_state for each row execute function public.sync_shared_state_to_relational();

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
select
  s.user_id,
  coalesce(s.reference_month, public.month_start(s.metric_date)),
  coalesce(s.metric_date, current_date),
  coalesce(s.category, 'story'),
  s.data ->> 'status',
  coalesce(nullif(s.data ->> 'quantity', '')::integer, 0),
  nullif(s.data ->> 'madeById', '')::bigint,
  nullif(s.data ->> 'postedById', '')::bigint,
  s.id,
  coalesce(s.data ->> 'notes', '')
from public.story_logs s
where s.user_id is not null
on conflict (user_id, source_story_log_id) do update
set
  reference_month = excluded.reference_month,
  metric_date = excluded.metric_date,
  category = excluded.category,
  status = excluded.status,
  quantity = excluded.quantity,
  responsible_profile_id = excluded.responsible_profile_id,
  published_by_profile_id = excluded.published_by_profile_id,
  notes = excluded.notes,
  updated_at = now();

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
  source_calendar_event_id
)
select
  c.user_id,
  coalesce(c.reference_month, public.month_start(c.metric_date)),
  coalesce(c.metric_date, current_date),
  coalesce(c.category, 'calendar_item'),
  coalesce(c.item_title, 'Item'),
  coalesce(c.data ->> 'description', ''),
  c.item_status,
  c.content_type,
  c.responsible_profile_id,
  c.id
from public.calendar_events c
where c.user_id is not null
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
  updated_at = now();

insert into public.contents (
  user_id,
  reference_month,
  metric_date,
  category,
  title,
  status,
  author_profile_id,
  reach_value,
  engagement_value,
  source_post_id
)
select
  p.user_id,
  coalesce(p.reference_month, public.month_start(p.metric_date)),
  coalesce(p.metric_date, current_date),
  coalesce(p.category, 'content'),
  coalesce(p.content_title, 'Conteudo'),
  p.content_status,
  p.author_profile_id,
  coalesce(p.reach_value, 0),
  coalesce(p.engagement_value, 0),
  p.id
from public.posts p
where p.user_id is not null
on conflict (user_id, source_post_id) do update
set
  reference_month = excluded.reference_month,
  metric_date = excluded.metric_date,
  category = excluded.category,
  title = excluded.title,
  status = excluded.status,
  author_profile_id = excluded.author_profile_id,
  reach_value = excluded.reach_value,
  engagement_value = excluded.engagement_value,
  updated_at = now();
