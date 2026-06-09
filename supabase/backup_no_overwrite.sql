-- Great Organico
-- Non-destructive backup of current data into backup.* tables.
-- Does not drop, truncate, or overwrite existing rows.

begin;

create schema if not exists backup;

create table if not exists backup.team_profiles (like public.team_profiles including all);
create table if not exists backup.goals (like public.goals including all);
create table if not exists backup.ideas (like public.ideas including all);
create table if not exists backup.calendar_events (like public.calendar_events including all);
create table if not exists backup.history_events (like public.history_events including all);
create table if not exists backup.story_logs (like public.story_logs including all);
create table if not exists backup.posts (like public.posts including all);
create table if not exists backup.shared_state (like public.shared_state including all);
create table if not exists backup.app_preferences (like public.app_preferences including all);

insert into backup.team_profiles
select * from public.team_profiles
on conflict (id) do nothing;

insert into backup.goals
select * from public.goals
on conflict (id) do nothing;

insert into backup.ideas
select * from public.ideas
on conflict (id) do nothing;

insert into backup.calendar_events
select * from public.calendar_events
on conflict (id) do nothing;

insert into backup.history_events
select * from public.history_events
on conflict (id) do nothing;

insert into backup.story_logs
select * from public.story_logs
on conflict (id) do nothing;

insert into backup.posts
select * from public.posts
on conflict (id) do nothing;

insert into backup.shared_state
select * from public.shared_state
on conflict (key) do nothing;

insert into backup.app_preferences
select * from public.app_preferences
on conflict (user_id, key) do nothing;

commit;
