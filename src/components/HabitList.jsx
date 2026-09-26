import { useState } from 'react'
import { today } from '../lib/dates'
import { crashTest } from '../lib/crashTest'

// Add form + list. Data and CRUD come from useHabits (passed in as `store`).
export default function HabitList({ store }) {
  crashTest('habits')
  const { habits, loading, error, reload, add, rename, toggleToday, remove } = store
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')

  async function addHabit(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setAdding(true)
    if (await add(name)) setNewName('')
    setAdding(false)
  }

  // Runs one action for one habit, disabling that row's controls meanwhile.
  async function busy(id, action) {
    setBusyId(id)
    const ok = await action()
    setBusyId(null)
    return ok
  }

  async function saveEdit(id) {
    const name = editName.trim()
    if (!name) return
    if (await busy(id, () => rename(id, name))) setEditingId(null)
  }

  function deleteHabit(habit) {
    if (!confirm(`Delete "${habit.name}" and all of its logs?`)) return
    busy(habit.id, () => remove(habit.id))
  }

  const date = today()

  return (
    <section>
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
          {error} <button className="link" onClick={reload}>Retry</button>
        </p>
      )}

      {loading ? (
        <p className="muted center">Loading habits…</p>
      ) : habits.length === 0 ? (
        <p className="muted center empty">No habits yet. Add your first one above.</p>
      ) : (
        <ul className="habits">
          {habits.map((h) => {
            const done = h.daily_logs.some((l) => l.log_date === date)
            const isBusy = busyId === h.id
            return (
              <li key={h.id} className={done ? 'done' : ''}>
                <input
                  type="checkbox"
                  checked={done}
                  disabled={isBusy}
                  onChange={() => busy(h.id, () => toggleToday(h))}
                  aria-label={`Mark "${h.name}" done today`}
                />
                {editingId === h.id ? (
                  <form className="row grow" onSubmit={(e) => (e.preventDefault(), saveEdit(h.id))}>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} maxLength={100} autoFocus />
                    <button type="submit" disabled={isBusy || !editName.trim()}>{isBusy ? 'Saving…' : 'Save'}</button>
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
                      disabled={isBusy}
                      onClick={() => (setEditingId(h.id), setEditName(h.name))}
                    >
                      Edit
                    </button>
                    <button className="danger" disabled={isBusy} onClick={() => deleteHabit(h)}>
                      {isBusy ? '…' : 'Delete'}
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
