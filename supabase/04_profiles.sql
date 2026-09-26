-- 04_profiles.sql — one profile row per user, holding the avatar URL.

create table if not exists public.profiles (
  id         uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  avatar_url text,
  updated_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;

alter table public.profiles enable row level security;

-- The row's primary key IS the owner, so every policy compares against id.
create policy "profiles: select own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

-- The client saves with upsert, which needs INSERT (first time) and UPDATE (after).
create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
