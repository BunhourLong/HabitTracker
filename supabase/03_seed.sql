-- 03_seed.sql — run AFTER signing up the first test account in the app.
-- The SQL editor runs as postgres (bypasses RLS), so user_id is set explicitly.

with u as (select id from auth.users where email = 'habit.tester1@example.com')
insert into public.habits (user_id, name)
select u.id, x.name from u,
  (values ('Drink 2L of water'), ('Read 20 pages'), ('Walk 30 minutes'), ('Code for 1 hour')) as x(name);

insert into public.daily_logs (habit_id, user_id, log_date)
select h.id, h.user_id, d::date
from public.habits h
cross join generate_series(current_date - 3, current_date - 1, interval '1 day') d
where h.user_id = (select id from auth.users where email = 'habit.tester1@example.com')
  and h.name in ('Drink 2L of water', 'Read 20 pages');
