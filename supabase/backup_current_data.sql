-- Great Organico
-- Fresh backup snapshot of the current production data.
-- This script only touches the backup schema, never public tables.

begin;

drop schema if exists backup cascade;
create schema backup;

create table backup.team_profiles (like public.team_profiles including all);
create table backup.goals (like public.goals including all);
create table backup.ideas (like public.ideas including all);
create table backup.calendar_events (like public.calendar_events including all);
create table backup.history_events (like public.history_events including all);
create table backup.story_logs (like public.story_logs including all);
create table backup.posts (like public.posts including all);
create table backup.shared_state (like public.shared_state including all);
create table backup.app_preferences (like public.app_preferences including all);

insert into backup.team_profiles select * from public.team_profiles;
insert into backup.goals select * from public.goals;
insert into backup.ideas select * from public.ideas;
insert into backup.calendar_events select * from public.calendar_events;
insert into backup.history_events select * from public.history_events;
insert into backup.story_logs select * from public.story_logs;
insert into backup.posts select * from public.posts;
insert into backup.shared_state select * from public.shared_state;
insert into backup.app_preferences select * from public.app_preferences;

commit;
