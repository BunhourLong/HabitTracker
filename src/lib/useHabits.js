import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { today } from './dates'

const COLUMNS = 'id, name, created_at, daily_logs(log_date)'

// Habit data + CRUD. Every query is scoped to the signed-in user, on top of RLS.
// Each action returns true on success; on failure it sets `error` and returns false.
export function useHabits(userId) {
  const [habits, setHabits] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // READ
  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('habits')
      .select(COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) setError(`Could not load habits: ${error.message}`)
    else {
      setHabits(data)
      setError('')
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  function reload() {
    setLoading(true)
    load()
  }

  // CREATE
  async function add(name) {
    setError('')
    const { data, error } = await supabase
      .from('habits')
      .insert({ name, user_id: userId })
      .select(COLUMNS)
      .single()
    if (error) {
      setError(`Could not add habit: ${error.message}`)
      return false
    }
    setHabits((hs) => [...hs, data])
    return true
  }

  // UPDATE — rename
  async function rename(id, name) {
    setError('')
    const { error } = await supabase.from('habits').update({ name }).eq('id', id).eq('user_id', userId)
    if (error) {
      setError(`Could not rename habit: ${error.message}`)
      return false
    }
    setHabits((hs) => hs.map((h) => (h.id === id ? { ...h, name } : h)))
    return true
  }

  // UPDATE — toggle today's check-in (a row in daily_logs)
  async function toggleToday(habit) {
    const date = today()
    const done = habit.daily_logs.some((l) => l.log_date === date)
    setError('')
    const { error } = done
      ? await supabase
          .from('daily_logs')
          .delete()
          .eq('habit_id', habit.id)
          .eq('log_date', date)
          .eq('user_id', userId)
      : await supabase.from('daily_logs').insert({ habit_id: habit.id, user_id: userId, log_date: date })
    if (error) {
      setError(`Could not update today's check-in: ${error.message}`)
      return false
    }
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
    return true
  }

  // DELETE — its daily_logs go too (ON DELETE CASCADE)
  async function remove(id) {
    setError('')
    const { error } = await supabase.from('habits').delete().eq('id', id).eq('user_id', userId)
    if (error) {
      setError(`Could not delete habit: ${error.message}`)
      return false
    }
    setHabits((hs) => hs.filter((h) => h.id !== id))
    return true
  }

  return { habits, loading, error, reload, add, rename, toggleToday, remove }
}
