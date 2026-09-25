-- 02_rls.sql — Row Level Security: every user sees and changes ONLY their own rows.
--
-- USING      = which existing rows the statement may see/touch (SELECT, UPDATE, DELETE)
-- WITH CHECK = what the new/changed row must look like (INSERT, UPDATE)
-- (select auth.uid()) is evaluated once per statement instead of once per row.
-- TO authenticated means the anon role gets no policy at all -> no rows.

alter table public.habits     enable row level security;
alter table public.daily_logs enable row level security;

-- habits -------------------------------------------------------------------
create policy "habits: select own" on public.habits
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "habits: insert own" on public.habits
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "habits: update own" on public.habits
  for update to authenticated
  using ((select auth.uid()) = user_id)         -- can only target your rows
  with check ((select auth.uid()) = user_id);   -- and can't hand them to someone else

create policy "habits: delete own" on public.habits
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- daily_logs ---------------------------------------------------------------
create policy "daily_logs: select own" on public.daily_logs
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- On write, the log must be yours AND point at a habit that is yours,
-- otherwise a user could attach logs to another user's habit id.
create policy "daily_logs: insert own" on public.daily_logs
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.habits h
                where h.id = habit_id and h.user_id = (select auth.uid()))
  );

create policy "daily_logs: update own" on public.daily_logs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.habits h
                where h.id = habit_id and h.user_id = (select auth.uid()))
  );

create policy "daily_logs: delete own" on public.daily_logs
  for delete to authenticated
  using ((select auth.uid()) = user_id);
