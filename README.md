# Habit Tracker — React + Supabase

A habit tracker with Supabase Auth, Postgres, and Row Level Security. Each user signs up, adds habits, ticks them off every day (ticks are stored as rows in `daily_logs`), and sees **only their own data**.

## Stack
- React 19 + Vite, React Router 7
- `@supabase/supabase-js` (Auth + Data API)
- Supabase Postgres with RLS

## Run locally
```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (publishable key)
npm run dev            # http://localhost:5173
```
Then run the SQL in `supabase/` in the Supabase SQL editor, in order:

| File | What it does |
|---|---|
| `supabase/01_schema.sql` | `habits` and `daily_logs` tables. `daily_logs.habit_id` references `habits(id)` **ON DELETE CASCADE** |
| `supabase/02_rls.sql` | Enables RLS on both tables and adds the SELECT/INSERT/UPDATE/DELETE policies (`auth.uid() = user_id`) |
| `supabase/03_seed.sql` | Seeds 4 habits and 6 logs for the first test account |

## How it works
- `src/lib/supabase.js`: the one Supabase client. It reads its URL and key from `.env` only.
- `src/lib/AuthContext.jsx`: restores the session with `getSession()` and keeps it current with `onAuthStateChange`.
- `src/components/ProtectedRoute.jsx`: sends signed-out visitors to `/login`.
- `src/pages/AuthForm.jsx`: sign-up and sign-in forms, with loading and error states.
- `src/pages/Habits.jsx`: full CRUD. List, add, rename (edit), toggle today's check-in (insert/delete a `daily_logs` row), and delete. Each action has its own loading state and error message. Every query adds `.eq('user_id', user.id)` on top of RLS.

## RLS policies (hand-written, `supabase/02_rls.sql`)
- `TO authenticated`: the `anon` role gets no policy, so it sees no rows.
- `USING ((select auth.uid()) = user_id)`: SELECT, UPDATE and DELETE only reach your own rows.
- `WITH CHECK ((select auth.uid()) = user_id)`: INSERT and UPDATE can't create a row for someone else, or hand an existing row to someone else.
- On `daily_logs`, INSERT and UPDATE also check that `habit_id` belongs to you. Without this, a user could attach logs to another user's habit.
- `(select auth.uid())` is evaluated once per query instead of once per row.

## Audit checklist
| Check | Result |
|---|---|
| `git status` shows no `.env` | ✅ `.env` is gitignored. Only `.env.example` is committed |
| Second test account sees an **empty** list, not an error | ✅ `docs/screenshots/05-second-account-empty-list.png` |
| Deleting a habit removes its logs | ✅ ON DELETE CASCADE: a habit with 2 logs → 0 logs after the delete |
| Refresh loses nothing | ✅ `docs/screenshots/04-after-refresh-nothing-lost.png` (session and data persist) |
| Cross-user attacks via the public API | ✅ `node --env-file=.env scripts/rls-audit.mjs <emailA> <emailB> <password>`. Output: `docs/rls-audit-output.txt` |

## Screenshots
| | |
|---|---|
| Signed-in habit list | ![](docs/screenshots/02-signed-in-habit-list.png) |
| Second account: empty list | ![](docs/screenshots/05-second-account-empty-list.png) |
| SQL editor: the policies on both tables | ![](docs/screenshots/06-sql-editor-rls-policies.png) |
| `/` redirects to `/login` when signed out | ![](docs/screenshots/01-login-page-protected-route-redirect.png) |
| Add / edit / toggle | ![](docs/screenshots/03-add-edit-toggle.png) |
| After refresh | ![](docs/screenshots/04-after-refresh-nothing-lost.png) |

## If RLS were disabled
The publishable key and project URL ship inside the deployed JavaScript bundle, so with RLS disabled anyone could take them from the browser and call the REST API directly to read, change, or delete every user's habits and logs, and insert rows for other users.
