import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { crashTest } from '../lib/crashTest'
import Avatar from './Avatar'

export default function Nav({ avatarUrl }) {
  crashTest('nav')
  const { user } = useAuth()
  return (
    <header className="top">
      <div className="row">
        <Avatar url={avatarUrl} email={user.email} size={44} />
        <div>
          <h1>My habits</h1>
          <p className="muted">{user.email}</p>
        </div>
      </div>
      <button className="ghost" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </header>
  )
}
