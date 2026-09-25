-- 01_schema.sql — run in the Supabase SQL editor

create table if not exists public.habits (
  id         bigint generated always as identity primary key,
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.daily_logs (
  id        bigint generated always as identity primary key,
  -- deleting a habit deletes all of its logs
  habit_id  bigint not null references public.habits (id) on delete cascade,
  user_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  log_date  date not null default current_date,
  unique (habit_id, log_date)
);

create index if not exists habits_user_id_idx     on public.habits (user_id);
create index if not exists daily_logs_user_id_idx on public.daily_logs (user_id);

-- Expose the tables to the Data API for signed-in users only (RLS still decides which rows).
grant select, insert, update, delete on public.habits     to authenticated;
grant select, insert, update, delete on public.daily_logs to authenticated;
