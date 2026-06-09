-- Great Organico
-- Non-destructive restore from backup.* tables back to public.* tables.
-- Does not overwrite existing rows.

begin;

insert into public.team_profiles
select * from backup.team_profiles
on conflict (id) do nothing;

insert into public.goals
select * from backup.goals
on conflict (id) do nothing;

insert into public.ideas
select * from backup.ideas
on conflict (id) do nothing;

insert into public.calendar_events
select * from backup.calendar_events
on conflict (id) do nothing;

insert into public.history_events
select * from backup.history_events
on conflict (id) do nothing;

insert into public.story_logs
select * from backup.story_logs
on conflict (id) do nothing;

insert into public.posts
select * from backup.posts
on conflict (id) do nothing;

insert into public.shared_state
select * from backup.shared_state
on conflict (key) do nothing;

insert into public.app_preferences
select * from backup.app_preferences
on conflict (user_id, key) do nothing;

commit;
