-- Remove Cypress-generated rows from the live/shared dataset.
-- Run this once in Supabase to clean test content leaked into the site.

begin;

delete from public.posts
where data::text ilike '%cypress%';

delete from public.goals
where data::text ilike '%cypress%';

delete from public.ideas
where data::text ilike '%cypress%';

delete from public.calendar_events
where data::text ilike '%cypress%';

delete from public.history_events
where data::text ilike '%cypress%';

delete from public.story_logs
where data::text ilike '%cypress%';

delete from public.shared_state
where value::text ilike '%cypress%';

commit;
