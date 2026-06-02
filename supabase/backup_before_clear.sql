-- Backup snapshot for the shared data tables before clearing demo content.
-- Run this first if you want a copy of the current rows before reset.

begin;

create table if not exists public.backup_goals (like public.goals including defaults including constraints including indexes);
create table if not exists public.backup_ideas (like public.ideas including defaults including constraints including indexes);
create table if not exists public.backup_calendar_events (like public.calendar_events including defaults including constraints including indexes);
create table if not exists public.backup_history_events (like public.history_events including defaults including constraints including indexes);
create table if not exists public.backup_story_logs (like public.story_logs including defaults including constraints including indexes);
create table if not exists public.backup_posts (like public.posts including defaults including constraints including indexes);
create table if not exists public.backup_shared_state (like public.shared_state including defaults including constraints including indexes);
create table if not exists public.backup_team_profiles (like public.team_profiles including defaults including constraints including indexes);

delete from public.backup_goals;
delete from public.backup_ideas;
delete from public.backup_calendar_events;
delete from public.backup_history_events;
delete from public.backup_story_logs;
delete from public.backup_posts;
delete from public.backup_shared_state;
delete from public.backup_team_profiles;

insert into public.backup_goals select * from public.goals;
insert into public.backup_ideas select * from public.ideas;
insert into public.backup_calendar_events select * from public.calendar_events;
insert into public.backup_history_events select * from public.history_events;
insert into public.backup_story_logs select * from public.story_logs;
insert into public.backup_posts select * from public.posts;
insert into public.backup_shared_state select * from public.shared_state;
insert into public.backup_team_profiles select * from public.team_profiles;

commit;
