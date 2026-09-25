import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function AuthForm({ mode }) {
  const isSignUp = mode === 'signup'
  const { session } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setMessage('')
    const { data, error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) return setError(error.message)
    if (isSignUp && !data.session) return setMessage('Check your email to confirm your account, then sign in.')
    navigate('/', { replace: true })
  }

  return (
    <main className="card auth">
      <h1>{isSignUp ? 'Create account' : 'Sign in'}</h1>
      <p className="muted">Habit Tracker</p>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Password
          <input
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button type="submit" disabled={busy}>
          {busy ? 'Please wait…' : isSignUp ? 'Sign up' : 'Sign in'}
        </button>
      </form>
      <p className="muted">
        {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
        <Link to={isSignUp ? '/login' : '/signup'}>{isSignUp ? 'Sign in' : 'Sign up'}</Link>
      </p>
    </main>
  )
}
