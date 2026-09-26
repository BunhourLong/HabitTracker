import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { useHabits } from '../lib/useHabits'
import ErrorBoundary from '../components/ErrorBoundary'
import Nav from '../components/Nav'
import AvatarUpload from '../components/AvatarUpload'
import Stats from '../components/Stats'
import HabitList from '../components/HabitList'

// Each major section sits in its own ErrorBoundary, so a render crash in one of
// them shows that section's fallback while the others keep working.
export default function Habits() {
  const { user } = useAuth()
  const store = useHabits(user.id)
  const [avatarUrl, setAvatarUrl] = useState(null)

  // Render the saved avatar on mount (and on a fresh page load).
  useEffect(() => {
    supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('Could not load profile:', error.message)
        else setAvatarUrl(data?.avatar_url ?? null)
      })
  }, [user.id])

  return (
    <main className="card">
      <ErrorBoundary
        name="Navigation"
        fallback={({ reset }) => (
          // Keep a way out even when the nav itself is broken.
          <div className="boundary row spread" role="alert">
            <span>
              <strong>The header didn't load.</strong>
              <span className="muted small">You can still sign out.</span>
            </span>
            <span className="row">
              <button className="ghost" onClick={reset}>Try again</button>
              <button className="ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
            </span>
          </div>
        )}
      >
        <Nav avatarUrl={avatarUrl} />
      </ErrorBoundary>

      <ErrorBoundary
        name="Profile picture"
        fallback={({ reset }) => (
          <div className="boundary" role="alert">
            <strong>The avatar uploader crashed.</strong>
            <p className="muted small">Your current avatar is unchanged.</p>
            <button className="ghost" onClick={reset}>Try again</button>
          </div>
        )}
      >
        <AvatarUpload avatarUrl={avatarUrl} onUploaded={setAvatarUrl} />
      </ErrorBoundary>

      <ErrorBoundary
        name="Stats"
        fallback={({ reset }) => (
          <div className="boundary" role="alert">
            <strong>Stats are unavailable right now.</strong>
            <p className="muted small">Your habits below still work.</p>
            <button className="ghost" onClick={reset}>Try again</button>
          </div>
        )}
      >
        <Stats habits={store.habits} loading={store.loading} />
      </ErrorBoundary>

      <ErrorBoundary
        name="Habit list"
        fallback={({ reset }) => (
          <div className="boundary" role="alert">
            <strong>Your habit list couldn't be displayed.</strong>
            <p className="muted small">Nothing was lost. Your habits are saved in the database.</p>
            <button
              className="ghost"
              onClick={() => {
                store.reload()
                reset()
              }}
            >
              Try again
            </button>
          </div>
        )}
      >
        <HabitList store={store} />
      </ErrorBoundary>
    </main>
  )
}
