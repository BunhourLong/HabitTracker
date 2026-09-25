import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// Local calendar date as YYYY-MM-DD (not UTC).
const today = () => new Date().toLocaleDateString('en-CA')

export default function Habits() {
  const { user } = useAuth()
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  // READ — every query is scoped to the signed-in user, on top of RLS.
  const loadHabits = useCallback(async () => {
    const { data, error } = await supabase
      .from('habits')
      .select('id, name, created_at, daily_logs(log_date)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (error) setError(`Could not load habits: ${error.message}`)
    else {
      setHabits(data)
      setError('')
    }
    setLoading(false)
  }, [user.id])

  useEffect(() => {
    loadHabits()
  }, [loadHabits])

  // CREATE
  async function addHabit(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    setError('')
    const { data, error } = await supabase
      .from('habits')
      .insert({ name, user_id: user.id })
      .select('id, name, created_at, daily_logs(log_date)')
      .single()
    setAdding(false)
    if (error) return setError(`Could not add habit: ${error.message}`)
    setHabits((hs) => [...hs, data])
    setNewName('')
  }

  // UPDATE — rename
  async function saveEdit(id) {
    const name = editName.trim()
    if (!name) return
    setBusyId(id)
    setError('')
    const { error } = await supabase.from('habits').update({ name }).eq('id', id).eq('user_id', user.id)
    setBusyId(null)
    if (error) return setError(`Could not rename habit: ${error.message}`)
    setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, name } : h)))
    setEditingId(null)
  }

  // UPDATE — toggle today's check-in (a row in daily_logs)
  async function toggleToday(habit) {
    const date = today()
    const done = habit.daily_logs.some((l) => l.log_date === date)
    setBusyId(habit.id)
    setError('')
    const { error } = done
      ? await supabase
          .from('daily_logs')
          .delete()
          .eq('habit_id', habit.id)
          .eq('log_date', date)
          .eq('user_id', user.id)
      : await supabase.from('daily_logs').insert({ habit_id: habit.id, user_id: user.id, log_date: date })
    setBusyId(null)
    if (error) return setError(`Could not update today's check-in: ${error.message}`)
    setHabits((hs) =>
      hs.map((h) =>
        h.id !== habit.id
          ? h
          : {
              ...h,
              daily_logs: done
                ? h.daily_logs.filter((l) => l.log_date !== date)
                : [...h.daily_logs, { log_date: date }],
            },
      ),
    )
  }

  // DELETE — its daily_logs go too (ON DELETE CASCADE)
  async function deleteHabit(habit) {
    if (!confirm(`Delete "${habit.name}" and all of its logs?`)) return
    setBusyId(habit.id)
    setError('')
    const { error } = await supabase.from('habits').delete().eq('id', habit.id).eq('user_id', user.id)
    setBusyId(null)
    if (error) return setError(`Could not delete habit: ${error.message}`)
    setHabits((hs) => hs.filter((h) => h.id !== habit.id))
  }

  const date = today()

  return (
    <main className="card">
      <header className="top">
        <div>
          <h1>My habits</h1>
          <p className="muted">{user.email}</p>
        </div>
        <button className="ghost" onClick={() => supabase.auth.signOut()}>
          Sign out
        </button>
      </header>

      <form className="row" onSubmit={addHabit}>
        <input
          placeholder="New habit, e.g. Meditate 10 min"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={100}
          aria-label="New habit name"
        />
        <button type="submit" disabled={adding || !newName.trim()}>
          {adding ? 'Adding…' : 'Add'}
        </button>
      </form>

      {error && (
        <p className="error" role="alert">
          {error} <button className="link" onClick={() => (setLoading(true), loadHabits())}>Retry</button>
        </p>
      )}

      {loading ? (
        <p className="muted center">Loading habits…</p>
      ) : habits.length === 0 ? (
        <p className="muted center empty">No habits yet — add your first one above.</p>
      ) : (
        <ul className="habits">
          {habits.map((h) => {
            const done = h.daily_logs.some((l) => l.log_date === date)
            const busy = busyId === h.id
            return (
              <li key={h.id} className={done ? 'done' : ''}>
                <input
                  type="checkbox"
                  checked={done}
                  disabled={busy}
                  onChange={() => toggleToday(h)}
                  aria-label={`Mark "${h.name}" done today`}
                />
                {editingId === h.id ? (
                  <form className="row grow" onSubmit={(e) => (e.preventDefault(), saveEdit(h.id))}>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} autoFocus />
                    <button type="submit" disabled={busy || !editName.trim()}>{busy ? 'Saving…' : 'Save'}</button>
                    <button type="button" className="ghost" onClick={() => setEditingId(null)}>Cancel</button>
                  </form>
                ) : (
                  <>
                    <span className="grow">
                      <span className="name">{h.name}</span>
                      <span className="muted small">
                        {h.daily_logs.length} day{h.daily_logs.length === 1 ? '' : 's'} logged
                      </span>
                    </span>
                    <button
                      className="ghost"
                      disabled={busy}
                      onClick={() => (setEditingId(h.id), setEditName(h.name))}
                    >
                      Edit
                    </button>
                    <button className="danger" disabled={busy} onClick={() => deleteHabit(h)}>
                      {busy ? '…' : 'Delete'}
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}
